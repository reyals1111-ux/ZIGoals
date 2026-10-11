import {fileURLToPath} from 'node:url';
import { defineConfig } from "vitest/config";
export default defineConfig({
  // Server unit tests intentionally run outside Next's RSC compiler. Next itself
  // poisons client imports; server-boundary regression checks the client graph.
  resolve: { alias: {
    'server-only': fileURLToPath(new URL('./apps/web/node_modules/next/dist/compiled/server-only/empty.js', import.meta.url)),
    // A Worker module imported directly in Node (scripts/run10/sync-delete-race.test.mjs) needs the runtime's base class;
    // Miniflare and the packaged tests always load the real one (Session U Part 5).
    'cloudflare:workers': fileURLToPath(new URL('./scripts/run11/fixtures/cloudflare-workers.mjs', import.meta.url)),
  } },
  // Next preserves JSX for its own compiler; component tests need a JSX transform.
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    include: [
      "packages/**/*.test.ts",
      "apps/web/lib/**/*.test.ts",
      "scripts/**/*.test.{mjs,ts}",
    ],
  },
});
