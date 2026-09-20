import { sanitizeAlphaEnv } from './sanitize-alpha-env.mjs';
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
const run = (cmd, args, options={}) => execFileSync(cmd,args,{stdio:"inherit",...options});
const commit = run("git",["rev-parse","HEAD"],{encoding:"utf8",stdio:"pipe"}).trim();
if (!/^[a-f0-9]{40}$/.test(commit)) throw Error("Missing exact source commit");
const env = {...process.env,NEXT_PUBLIC_APP_ENVIRONMENT:"PUBLIC_ALPHA_UNDEPLOYED",WRANGLER_SEND_METRICS:"false"};
run("pnpm",["exec","opennextjs-cloudflare","build","--config","wrangler.alpha.jsonc"],{env});
sanitizeAlphaEnv('.open-next');
// Next's local compilation cache can retain parsed .env values; it is not a deployable artifact.
rmSync('.next/cache', {recursive:true,force:true});
const { version } = JSON.parse(readFileSync("package.json","utf8"));
writeFileSync(".open-next/alpha-build.json", JSON.stringify({environment:env.NEXT_PUBLIC_APP_ENVIRONMENT,version,commit,dirty:!!run("git",["status","--porcelain","--untracked-files=normal"],{encoding:"utf8",stdio:"pipe"}).trim()},null,2)+"\n");
