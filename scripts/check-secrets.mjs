import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { findSecrets } from "./secret-patterns.mjs";
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
// Pattern definitions and their own fixtures necessarily contain the shapes they detect.
const exempt = new Set(["scripts/check-secrets.mjs", "scripts/secret-patterns.mjs", "scripts/secret-patterns.test.mjs"]);
const hits = [];
for (const file of files) {
  if (/(^|\/)\.env(\.|$)/.test(file) && !file.endsWith(".env.example"))
    hits.push(`${file} (environment file)`);
  if (exempt.has(file)) continue;
  const data = readFileSync(file, "utf8");
  const found = findSecrets(data);
  if (found.length) hits.push(`${file} (${found.join(", ")})`);
}
if (hits.length) {
  console.error(
    "Review potential credentials in files (values suppressed):\n" +
      [...new Set(hits)].join("\n"),
  );
  process.exit(1);
}
console.log(
  "Tracked-file credential pattern check passed. This is a limited pattern scan, not a complete secret audit.",
);
