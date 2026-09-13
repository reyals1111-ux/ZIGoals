#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { collectDoctor } from "./lib/doctor.mjs";
const args = process.argv.slice(2);
if (args.some(arg => arg !== "--json") || args.length > 1) {
  console.error("Usage: node scripts/doctor.mjs [--json]"); process.exitCode = 2;
} else {
  const report = collectDoctor(fileURLToPath(new URL("../", import.meta.url)));
  if (args.includes("--json")) console.log(JSON.stringify(report, null, 2));
  else {
    console.log("ZIGoals doctor — read-only; no installs, configuration changes or live network queries");
    for (const check of report.checks) console.log(`${check.level}: ${check.detail}`);
    console.log(report.exitCode ? "Resolve ERROR items before running the app. Optional contract tools are warnings." : "Web prerequisites are ready. Review warnings for the work you plan to do.");
  }
  process.exitCode = report.exitCode;
}
