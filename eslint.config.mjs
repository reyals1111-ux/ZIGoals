import next from "eslint-config-next/core-web-vitals";
import ts from "eslint-config-next/typescript";
const config = [
  ...next,
  ...ts,
  {
    ignores: [
      "**/.next/**",
      "**/node_modules/**",
      "**/*.generated.ts",
      "target/**",
      ".toolchain/**",
      ".superpowers/**",
      "landing/**",
    ],
  },
  {
    settings: { next: { rootDir: "apps/web/" } },
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
    },
  },
  {
    files: ["contracts/goal-manager/scripts/generate-types.mjs"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { varsIgnorePattern: "^\\$schema$|^nested$" },
      ],
    },
  },
];
export default config;
