import { scanAlphaArtifact, readEnvValues, describeFindings } from './hermetic-alpha.mjs';
// Owner check after build:alpha (Session R1): `pnpm --filter @zigoals/web check:alpha-artifact [--values-from <private env file>]`.
// With --values-from, it also reports which of that file's key names have a value inside the artifact. Values are never printed.
const args = process.argv.slice(2);
let valuesFrom;
for (let i = 0; i < args.length; i++) {
 if (args[i] === '--values-from' && args[i + 1]) { valuesFrom = args[++i]; continue; }
 console.error('Usage: check:alpha-artifact [--values-from <private env file outside the repository>]'); process.exit(2);
}
const findings = scanAlphaArtifact('.open-next', valuesFrom ? {values: readEnvValues(valuesFrom)} : {});
if (findings.length) { console.error(describeFindings(findings)); process.exit(1); }
console.log(`Alpha artifact check passed: empty compiled environment, no env file copies, no secret markers, no configured names${valuesFrom ? ', no value from the given env file' : ''}.`);
