/** URL helpers used by the import engine, redirect route and public UI. */

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Parses a URL and accepts it only when it is an absolute http(s) address.
 * Everything else (javascript:, data:, relative paths, garbage) is rejected so
 * imported data can never introduce an unsafe outbound link.
 */
export function parseHttpUrl(raw: string | null | undefined): URL | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    return null;
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) return null;
  if (!url.hostname.includes(".")) return null;

  return url;
}

export function isSafeHttpUrl(raw: string | null | undefined): boolean {
  return parseHttpUrl(raw) !== null;
}

/**
 * Canonical form used for storage and duplicate detection: lowercase host,
 * no default port, no trailing slash on the path, no fragment.
 */
export function normalizeUrl(raw: string | null | undefined): string | null {
  const url = parseHttpUrl(raw);
  if (!url) return null;

  url.hostname = url.hostname.toLowerCase();
  url.hash = "";
  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  return url.toString();
}

/**
 * Stricter key for duplicate detection: drops the query string and protocol so
 * `https://shop.com/sale?utm_source=x` and `http://shop.com/sale` collapse.
 */
export function urlDedupeKey(raw: string | null | undefined): string | null {
  const url = parseHttpUrl(raw);
  if (!url) return null;

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const path = url.pathname.replace(/\/+$/, "");
  return `${host}${path}`;
}

export function hostname(raw: string | null | undefined): string | null {
  const url = parseHttpUrl(raw);
  if (!url) return null;
  return url.hostname.replace(/^www\./, "");
}

/** Reads only the hostname from a referrer header; never stores full URLs. */
export function referrerHost(referrer: string | null | undefined): string | null {
  const host = hostname(referrer);
  if (!host) return null;
  return host.slice(0, 120);
}
