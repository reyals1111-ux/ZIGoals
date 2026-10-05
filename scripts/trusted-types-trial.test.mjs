import { expect, test } from "vitest";
import { reduceReport, summarise } from "./trusted-types-trial.mjs";

// Session U Part 6 (FIX_PLAN D4): the trial collector keeps closed fields only.
const report = (fields) => ({ "csp-report": { "document-uri": "http://127.0.0.1:3101/app/settings?secret=x", referrer: "http://127.0.0.1:3101/app?private=1", "original-policy": "require-trusted-types-for 'script'; trusted-types default; report-uri http://127.0.0.1:9311/", disposition: "report", "status-code": 200, ...fields } });
test("a sink report keeps the directive, the sink sample, and paths without queries; nothing else", () => {
  const reduced = reduceReport(report({ "effective-directive": "require-trusted-types-for", "blocked-uri": "trusted-types-sink", "script-sample": "HTMLScriptElement src|https://attacker.invalid/a-very-long-tail", "source-file": "http://127.0.0.1:3101/_next/static/chunks/main.js?v=1", "line-number": 3, "column-number": 14 }));
  expect(reduced).toEqual({ directive: "require-trusted-types-for", blocked: "trusted-types-sink", sample: "HTMLScriptElement src|https://attacker.i", document: "/app/settings", source: "/_next/static/chunks/main.js", line: 3, column: 14 });
  expect(JSON.stringify(reduced)).not.toMatch(/secret|private|original|referrer|report-uri/);
});
test("a policy-name report is kept; anything that is not a Trusted Types report is dropped", () => {
  expect(reduceReport(report({ "violated-directive": "trusted-types", "blocked-uri": "trusted-types-policy", "script-sample": "nextjs#bundler", "source-file": "https://cdn.invalid/x.js" }))).toMatchObject({ directive: "trusted-types", blocked: "trusted-types-policy", sample: "nextjs#bundler", source: "external", line: 0, column: 0 });
  for (const body of [null, {}, { "csp-report": null }, report({ "effective-directive": "script-src-elem", "blocked-uri": "inline" })])
    expect(reduceReport(body)).toBeNull();
  expect(reduceReport(report({ "effective-directive": "require-trusted-types-for", "blocked-uri": "https://attacker.invalid/x" }))?.blocked).toBe("other");
});
test("the summary groups by what was refused and where, most frequent first", () => {
  const sink = { directive: "require-trusted-types-for", blocked: "trusted-types-sink", sample: "HTMLScriptElement src|/x.js", source: "/a.js", line: 1, column: 2 };
  const groups = summarise([{ ...sink, document: "/app" }, { ...sink, document: "/app/health" }, { ...sink, document: "/app" }, { directive: "trusted-types", blocked: "trusted-types-policy", sample: "nextjs#bundler", document: "/app", source: "/b.js", line: 0, column: 0 }]);
  expect(groups).toEqual([
    { key: "require-trusted-types-for | trusted-types-sink | HTMLScriptElement src | /a.js:1:2", count: 3, documents: ["/app", "/app/health"] },
    { key: "trusted-types | trusted-types-policy | nextjs#bundler | /b.js:0:0", count: 1, documents: ["/app"] },
  ]);
});
