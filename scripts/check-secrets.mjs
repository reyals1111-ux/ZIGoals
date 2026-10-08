import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { scanFiles } from "./lib/secret-scan.mjs";
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
// Session X Part 2: known test values in another lane, each pinned to its file, check and the exact value's hash.
const { entries } = JSON.parse(readFileSync(new URL("./secret-allowlist.json", import.meta.url), "utf8"));
const { hits, allowed, stale } = scanFiles(files, (file) => readFileSync(file, "utf8"), entries);
// A stale entry (its value already gone) only warns, so whichever lane merges second is not broken by it.
for (const { path, check } of stale) {
  const line = `Allowlist entry no longer needed: ${path} (${check}). Remove it from scripts/secret-allowlist.json.`;
  console.log(process.env.GITHUB_ACTIONS === "true" ? `::warning title=Stale secret allowlist entry::${line}` : `Warning: ${line}`);
}
if (hits.length) {
  console.error("Review potential credentials in files (values suppressed):\n" + hits.join("\n"));
  process.exit(1);
}
console.log(
  `Tracked-file credential pattern check passed (${allowed} allowlisted test value${allowed === 1 ? "" : "s"}). This is a limited pattern scan, not a complete secret audit.`,
);
