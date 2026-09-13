import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /gh[pousr]_[A-Za-z0-9]{30,}/,
  /github_pat_[A-Za-z0-9_]{40,}/,
  /\b(?:mnemonic|private_key|seed_phrase)\s*[:=]\s*["'][A-Za-z0-9+/ ]{20,}["']/i,
];
const hits = [];
for (const file of files) {
  if (/(^|\/)\.env(\.|$)/.test(file) && !file.endsWith(".env.example"))
    hits.push(file);
  if (file === "scripts/check-secrets.mjs") continue;
  const data = readFileSync(file, "utf8");
  if (patterns.some((p) => p.test(data))) hits.push(file);
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
