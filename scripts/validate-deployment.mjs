// Structural validation only. The app separately checks the actual chain code.
import { readFileSync, statSync } from "node:fs";
import { deploymentSchema } from "../packages/shared-types/src/deployment.ts";
try {
  const args = process.argv.slice(2);
  if (args.length !== 1 || args[0].startsWith("--"))
    throw Error(
      "Usage: node scripts/validate-deployment.mjs <public-manifest.json>",
    );
  if (statSync(args[0]).size > 65536) throw Error("Manifest exceeds 64 KB.");
  const parsed = deploymentSchema.safeParse(
    JSON.parse(readFileSync(args[0], "utf8")),
  );
  if (!parsed.success)
    throw Error(
      "Manifest invalid: missing, unsupported or unsafe fields. No action enabled.",
    );
  console.log(
    JSON.stringify(
      {
        schemaVersion: 2,
        status: parsed.data.status,
        structurallyValid: true,
        chainVerified: false,
        transactionSent: false,
      },
      null,
      2,
    ),
  );
} catch (e) {
  console.error(
    e instanceof SyntaxError
      ? "Manifest is not valid JSON."
      : e instanceof Error
        ? e.message
        : "Manifest validation failed.",
  );
  process.exitCode = 1;
}
