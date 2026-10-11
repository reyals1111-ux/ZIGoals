// Session X Part 2: the tracked-file scan as a pure function, so its allowlist rules are unit-tested
// (scripts/secret-patterns.test.mjs); scripts/check-secrets.mjs runs it over `git ls-files`.
import { createHash } from "node:crypto";
import { findSecretMatches } from "../secret-patterns.mjs";

// Pattern definitions and their own fixtures necessarily contain the shapes they detect.
export const EXEMPT = new Set(["scripts/check-secrets.mjs", "scripts/secret-patterns.mjs", "scripts/secret-patterns.test.mjs"]);
export const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const key = (path, check, hash) => `${path}\0${check}\0${hash}`;

/**
 * Scans each file. An allowlist entry hides exactly one value (its file, its check and the sha256 of the matched text);
 * an entry whose value no longer appears is returned as stale, which callers report as a warning only.
 * @returns {{hits: string[], allowed: number, stale: {path: string, check: string}[]}}
 */
export function scanFiles(files, read, entries = []) {
  const allowed = new Map(entries.map((entry) => [key(entry.path, entry.check, entry.sha256), entry]));
  const used = new Set();
  const hits = [];
  for (const file of files) {
    if (/(^|\/)\.env(\.|$)/.test(file) && !file.endsWith(".env.example")) hits.push(`${file} (environment file)`);
    if (EXEMPT.has(file)) continue;
    const found = [];
    for (const { name, match } of findSecretMatches(read(file))) {
      const id = key(file, name, sha256(match));
      if (allowed.has(id)) used.add(id);
      else found.push(name);
    }
    if (found.length) hits.push(`${file} (${[...new Set(found)].join(", ")})`);
  }
  const stale = [...allowed].filter(([id]) => !used.has(id)).map(([, { path, check }]) => ({ path, check }));
  return { hits: [...new Set(hits)], allowed: used.size, stale };
}
