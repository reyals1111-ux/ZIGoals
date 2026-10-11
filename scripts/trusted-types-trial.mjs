#!/usr/bin/env node
// Session U Part 6 (FIX_PLAN D4, FINDINGS Q-WEB-04): the Trusted Types trial's local report collector. It listens on
// 127.0.0.1 only, keeps a few closed fields of each CSP report (never the policy text, a referrer or a query string) and
// summarises them. The procedure is in docs/security/TRUSTED_TYPES.md; reports stay on this machine and are never committed.
//
//   node scripts/trusted-types-trial.mjs collect <out.jsonl> [port]   (default port 9311; Ctrl-C ends it)
//   node scripts/trusted-types-trial.mjs summary <out.jsonl>
import { appendFileSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

const MAX_BODY = 64 * 1024;
const pathOf = value => { try { const url = new URL(String(value)); return ["127.0.0.1", "localhost"].includes(url.hostname) ? url.pathname : "external"; } catch { return "unknown"; } };
/** One CSP report (report-uri form) reduced to closed fields, or null when it is not a Trusted Types report. */
export function reduceReport(body) {
  const report = body && typeof body === "object" ? body["csp-report"] : null;
  if (!report || typeof report !== "object") return null;
  const directive = String(report["effective-directive"] ?? report["violated-directive"] ?? "");
  if (!["require-trusted-types-for", "trusted-types"].includes(directive)) return null;
  const blocked = ["trusted-types-sink", "trusted-types-policy"].includes(report["blocked-uri"]) ? report["blocked-uri"] : "other";
  const line = Number.isSafeInteger(report["line-number"]) ? report["line-number"] : 0, column = Number.isSafeInteger(report["column-number"]) ? report["column-number"] : 0;
  return { directive, blocked, sample: String(report["script-sample"] ?? "").slice(0, 40), document: pathOf(report["document-uri"]), source: pathOf(report["source-file"]), line, column };
}
/** Reports grouped by what was refused and where, most frequent first. */
export function summarise(reduced) {
  const groups = new Map();
  for (const r of reduced) {
    const key = `${r.directive} | ${r.blocked} | ${r.sample.split("|")[0]} | ${r.source}:${r.line}:${r.column}`;
    const group = groups.get(key) ?? { key, count: 0, documents: new Set() };
    group.count++; group.documents.add(r.document); groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)).map(g => ({ key: g.key, count: g.count, documents: [...g.documents].sort() }));
}
function collect(out, port) {
  const server = createServer((request, response) => {
    if (request.method !== "POST") { response.writeHead(405).end(); return; }
    const chunks = []; let size = 0;
    request.on("data", chunk => { size += chunk.length; if (size <= MAX_BODY) chunks.push(chunk); });
    request.on("end", () => {
      try { const reduced = size <= MAX_BODY ? reduceReport(JSON.parse(Buffer.concat(chunks).toString("utf8"))) : null; if (reduced) appendFileSync(out, JSON.stringify(reduced) + "\n"); } catch { /* not a report */ }
      response.writeHead(204).end();
    });
  });
  server.listen(port, "127.0.0.1", () => console.log(`Collecting Trusted Types reports on http://127.0.0.1:${port}/ into ${out}. Ctrl-C ends it.`));
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit(0)));
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [command, file, port = "9311"] = process.argv.slice(2);
  if (!file || !["collect", "summary"].includes(command) || !/^\d{2,5}$/.test(port)) {
    console.error("Usage: trusted-types-trial.mjs collect <out.jsonl> [port] | summary <out.jsonl>"); process.exit(64);
  }
  if (command === "collect") collect(file, Number(port));
  else {
    const reduced = readFileSync(file, "utf8").split("\n").filter(Boolean).map(line => JSON.parse(line));
    const groups = summarise(reduced);
    console.log(`${reduced.length} report(s), ${groups.length} distinct violation(s).`);
    for (const g of groups) console.log(`${String(g.count).padStart(6)}  ${g.key}  (${g.documents.length} page(s): ${g.documents.slice(0, 5).join(", ")}${g.documents.length > 5 ? ", …" : ""})`);
  }
}
