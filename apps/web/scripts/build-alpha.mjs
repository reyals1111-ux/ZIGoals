import { sanitizeAlphaEnv } from './sanitize-alpha-env.mjs';
import { refuseEnvFiles, scanAlphaArtifact, describeFindings } from './hermetic-alpha.mjs';
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
// Hermetic (Session R1): no env file may be within the build's reach, so none can be compiled into the Worker.
try { refuseEnvFiles(process.cwd()); } catch (error) { console.error(error.message); process.exit(1); }
const run = (cmd, args, options={}) => execFileSync(cmd,args,{stdio:"inherit",...options});
const commit = run("git",["rev-parse","HEAD"],{encoding:"utf8",stdio:"pipe"}).trim();
if (!/^[a-f0-9]{40}$/.test(commit)) throw Error("Missing exact source commit");
const env = {...process.env,NEXT_PUBLIC_APP_ENVIRONMENT:"PUBLIC_ALPHA_UNDEPLOYED",WRANGLER_SEND_METRICS:"false"};
run("pnpm",["exec","opennextjs-cloudflare","build","--config","wrangler.alpha.jsonc"],{env});
sanitizeAlphaEnv('.open-next');
// The artifact is checked as well; a failing one is deleted so it cannot be deployed by mistake.
const findings = scanAlphaArtifact('.open-next');
if (findings.length) { rmSync('.open-next', {recursive:true,force:true}); console.error(describeFindings(findings)+"\nThe build output was deleted."); process.exit(1); }
// Next's local compilation cache can retain parsed .env values; it is not a deployable artifact.
rmSync('.next/cache', {recursive:true,force:true});
const { version } = JSON.parse(readFileSync("package.json","utf8"));
writeFileSync(".open-next/alpha-build.json", JSON.stringify({environment:env.NEXT_PUBLIC_APP_ENVIRONMENT,version,commit,dirty:!!run("git",["status","--porcelain","--untracked-files=normal"],{encoding:"utf8",stdio:"pipe"}).trim()},null,2)+"\n");
