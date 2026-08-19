/**
 * Admin authentication.
 *
 * A single shared admin password, read from the environment, exchanged for an
 * HMAC-signed session cookie. No password or secret is ever stored in the
 * repository or sent to the browser — the cookie carries only an expiry and a
 * signature. Web Crypto is used so the same verification runs in `proxy.ts`.
 */

export const ADMIN_COOKIE = "ds_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;
const DEV_FALLBACK_PASSWORD = "dealscout-dev";

export interface AdminAuthConfig {
  configured: boolean;
  /** True when the insecure development fallback password is in use. */
  usingDevFallback: boolean;
  reason: string | null;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function adminAuthConfig(): AdminAuthConfig {
  const password = process.env.ADMIN_PASSWORD?.trim();

  if (password) {
    return { configured: true, usingDevFallback: false, reason: null };
  }

  if (isProduction()) {
    return {
      configured: false,
      usingDevFallback: false,
      reason:
        "ADMIN_PASSWORD is not set. The admin dashboard is disabled in production until it is configured.",
    };
  }

  return {
    configured: true,
    usingDevFallback: true,
    reason: `ADMIN_PASSWORD is not set, so the development password "${DEV_FALLBACK_PASSWORD}" is accepted. Set ADMIN_PASSWORD before deploying.`,
  };
}

function expectedPassword(): string | null {
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (password) return password;
  return isProduction() ? null : DEV_FALLBACK_PASSWORD;
}

function sessionSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.ADMIN_PASSWORD?.trim() ||
    `dealscout-dev-secret:${DEV_FALLBACK_PASSWORD}`
  );
}

async function hmac(payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Buffer.from(signature).toString("base64url");
}

/** Constant-time-ish comparison to avoid leaking timing information. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function verifyPassword(candidate: string): Promise<boolean> {
  const expected = expectedPassword();
  if (!expected) return false;
  return safeEqual(candidate, expected);
}

export interface SessionCookie {
  value: string;
  maxAge: number;
}

export async function createSessionCookie(): Promise<SessionCookie> {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `admin.${expiresAt}`;
  const signature = await hmac(payload);
  return { value: `${payload}.${signature}`, maxAge: SESSION_TTL_SECONDS };
}

export async function verifySessionCookie(value: string | undefined | null): Promise<boolean> {
  if (!value) return false;

  const parts = value.split(".");
  if (parts.length !== 3) return false;

  const [subject, expiresRaw, signature] = parts;
  if (subject !== "admin") return false;

  const expiresAt = Number.parseInt(expiresRaw, 10);
  if (!Number.isFinite(expiresAt) || expiresAt * 1000 < Date.now()) return false;

  const expected = await hmac(`${subject}.${expiresRaw}`);
  return safeEqual(signature, expected);
}
