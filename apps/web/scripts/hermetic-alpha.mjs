import {existsSync,readdirSync,readFileSync,statSync} from 'node:fs';
import {dirname,join,relative,resolve} from 'node:path';
/** Owner builds are hermetic (Session R1, Part 2). OpenNext compiles `.env`, `.env.<mode>`, `.env.local` and
 * `.env.<mode>.local` from the app directory and from the monorepo root into `.open-next/cloudflare/next-env.mjs`,
 * and `next build` reads the app's env files as well. Stage 7 baked a private `apps/web/.env.local` into an owner
 * build that way. So `build:alpha` refuses to start while any env file is within the build's reach, and checks
 * the artifact afterwards. Nothing here prints a value. */
const LOCKFILES=['bun.lockb','bun.lock','package-lock.json','yarn.lock','pnpm-lock.yaml'];
const ENV_FILE=/^\.env(\..+)?$/;
/** The directories whose env files reach the build: the app, and the monorepo root found as OpenNext finds it (the
 * nearest directory, from the app upwards, that holds a lockfile). */
export function envScopes(appDir){
 const app=resolve(appDir);let current=app;
 for(;;){
  if(LOCKFILES.some(file=>existsSync(join(current,file))))break;
  const parent=dirname(current);if(parent===current){current=app;break;}current=parent;
 }
 return [...new Set([app,current])];
}
/** Every env file a build could read. `.env.example` is never read by either tool; any other `.env` or `.env.*`
 * file (or link to one) counts, whatever its mode suffix. */
export function envFilesInScope(appDir){
 const found=[];
 for(const dir of envScopes(appDir))for(const entry of readdirSync(dir,{withFileTypes:true})){
  if(!ENV_FILE.test(entry.name)||entry.name==='.env.example')continue;
  const path=join(dir,entry.name);let file;try{file=statSync(path).isFile();}catch{file=entry.isSymbolicLink();}
  if(file)found.push(path);
 }
 return found.sort();
}
/** Throws, naming the files (never their contents), when any env file is within the build's reach. */
export function refuseEnvFiles(appDir){
 const files=envFilesInScope(appDir);
 if(!files.length)return;
 throw Error([
  'build:alpha refuses to run: OpenNext would compile these env files into the Worker.',
  ...files.map(file=>'  '+relative(process.cwd(),file)),
  'Move each one outside the repository (for example ~/.config/zigoals/<name>.env, mode 600) and pass it',
  'explicitly to the commands that need it (node --env-file=<path> ...). Nothing was built.',
 ].join('\n'));
}
const NAME='(?:ZIGOALS|AUTH|SUPABASE|RESEND|COINGECKO|CLOUDFLARE)_[A-Z0-9_]+';
/** Configuration that must never be compiled into the artifact. A name alone is expected (code reads
 * `env.ZIGOALS_MARKET_QUOTES_MODE`); a name given a value, as a dotenv line or as a key with a string value, is not. */
const RULES=[
 {rule:'dotenv line',pattern:new RegExp(`^[ \\t]*(?:export[ \\t]+)?(${NAME})[ \\t]*=`,'gm')},
 {rule:'name with a configured value',pattern:new RegExp(`(?<![A-Za-z0-9_$])["']?(${NAME})["']?[ \\t]*:[ \\t]*["'\`](?=[^"'\`])`,'g')},
 {rule:'secret marker',pattern:/sb_secret_|service_role/g},
];
function* files(directory){
 for(const entry of readdirSync(directory,{withFileTypes:true})){
  const path=join(directory,entry.name);
  if(entry.isDirectory())yield* files(path);else if(entry.isFile())yield path;
 }
}
/** Reads a private env file's values for `--values-from`: only values of 12 characters or more are compared, so
 * enum-like settings (`durable-v1`, `true`) that the code itself contains are not reported. */
export function readEnvValues(path){
 const values=new Map();
 for(const line of readFileSync(path,'utf8').split(/\r?\n/)){
  const match=/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);if(!match)continue;
  let value=match[2].trim();
  const quoted=/^(["'])(.*)\1$/.exec(value);value=quoted?quoted[2]:value.replace(/\s+#.*$/,'');
  if(value.length>=12)values.set(match[1],value);
 }
 return values;
}
/** Checks a built `.open-next` directory. Findings name a file, a rule and at most a key name, never a value. */
export function scanAlphaArtifact(outputDir,{values}={}){
 const findings=[],root=resolve(outputDir),at=file=>relative(root,file)||'.';
 const envModule=join(root,'cloudflare/next-env.mjs');
 if(!existsSync(envModule))findings.push({file:'cloudflare/next-env.mjs',rule:'compiled environment missing'});
 else{
  const lines=readFileSync(envModule,'utf8').trim().split('\n'),modes=new Set();
  for(const line of lines){
   const match=/^export const (production|development|test) = (\{.*\});$/.exec(line);let parsed;
   try{parsed=match&&JSON.parse(match[2]);}catch{parsed=null;}
   if(!match||!parsed||typeof parsed!=='object'||modes.has(match[1])){findings.push({file:'cloudflare/next-env.mjs',rule:'unexpected compiled environment format'});continue;}
   modes.add(match[1]);for(const name of Object.keys(parsed))findings.push({file:'cloudflare/next-env.mjs',rule:`compiled environment (${match[1]}) is not empty`,name});
  }
  if(modes.size!==3&&!findings.length)findings.push({file:'cloudflare/next-env.mjs',rule:'unexpected compiled environment format'});
 }
 const secrets=[...(values??new Map())].map(([name,value])=>({name,bytes:Buffer.from(value)}));
 for(const file of files(root)){
  const name=file.slice(dirname(file).length+1);
  if(ENV_FILE.test(name))findings.push({file:at(file),rule:'env file copied into the artifact'});
  const bytes=readFileSync(file),text=bytes.toString('latin1');
  for(const {rule,pattern} of RULES){pattern.lastIndex=0;const seen=new Set();for(const match of text.matchAll(pattern)){const key=match[1]??'';if(seen.has(key))continue;seen.add(key);findings.push({file:at(file),rule,...(match[1]?{name:match[1]}:{})});}}
  for(const secret of secrets)if(bytes.includes(secret.bytes))findings.push({file:at(file),rule:'value from the given env file',name:secret.name});
 }
 return findings;
}
export function describeFindings(findings){
 return ['Alpha artifact check failed (values suppressed):',...findings.map(f=>`  ${f.file}: ${f.rule}${f.name?` (${f.name})`:''}`)].join('\n');
}
