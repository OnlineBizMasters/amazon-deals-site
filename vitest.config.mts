import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Each suite opens its own in-memory database, so a shared file is never touched.
    env: { DATABASE_PATH: ":memory:", DEALSCOUT_AUTO_SEED: "0" },
  },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
});
