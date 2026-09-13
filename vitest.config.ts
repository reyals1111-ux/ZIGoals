import { defineConfig } from "vitest/config";
export default defineConfig({
  // Next preserves JSX for its own compiler; component tests need a JSX transform.
  oxc: { jsx: { runtime: "automatic" } },
  test: { include: ["packages/**/*.test.ts", "apps/web/lib/**/*.test.ts", "scripts/**/*.test.mjs"] },
});
