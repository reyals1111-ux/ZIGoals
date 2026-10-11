import {afterEach,expect,it} from 'vitest';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,symlinkSync,existsSync,copyFileSync,chmodSync,cpSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {envScopes,envFilesInScope,refuseEnvFiles,scanAlphaArtifact,readEnvValues,describeFindings} from '../apps/web/scripts/hermetic-alpha.mjs';
// Session R1 Part 2: owner builds are hermetic. Synthetic files in temporary directories only; no real env file is read.
const scripts=fileURLToPath(new URL('../apps/web/scripts/',import.meta.url)),roots=[];
afterEach(()=>{for(const root of roots.splice(0))rmSync(root,{recursive:true,force:true});});
const temp=()=>{const root=mkdtempSync(join(tmpdir(),'zigoals-hermetic-'));roots.push(root);return root;};
function tree(){const root=temp();writeFileSync(join(root,'pnpm-lock.yaml'),'');const app=join(root,'apps/web');mkdirSync(app,{recursive:true});return {root,app};}
const refusal=app=>{try{refuseEnvFiles(app);return '';}catch(error){return error.message;}};
const SECRET='private-value-never-printed';

it('finds the monorepo root as OpenNext does and refuses every env file either directory holds, naming it without its value',()=>{
 const {root,app}=tree();expect(envScopes(app)).toEqual([app,root]);expect(envFilesInScope(app)).toEqual([]);
 // Never read by Next or OpenNext: the tracked example, a directory called .env and direnv's .envrc.
 writeFileSync(join(root,'.env.example'),'COINGECKO_DEMO_API_KEY=\n');mkdirSync(join(app,'.env'));writeFileSync(join(app,'.envrc'),'');
 expect(envFilesInScope(app)).toEqual([]);expect(refusal(app)).toBe('');rmSync(join(app,'.env'),{recursive:true});
 for(const [dir,name] of [[app,'.env'],[app,'.env.local'],[app,'.env.production'],[app,'.env.production.local'],[app,'.env.development'],[root,'.env'],[root,'.env.local'],[root,'.env.acctest']]){
  writeFileSync(join(dir,name),`ZIGOALS_EXAMPLE=${SECRET}\n`);
  expect(envFilesInScope(app)).toEqual([join(dir,name)]);
  const message=refusal(app);expect(message).toContain(name);expect(message).toContain('Nothing was built');expect(message).not.toContain(SECRET);
  rmSync(join(dir,name));
 }
 // A link to a private file elsewhere is read through, so it is refused too, even when its target is gone.
 const outside=join(temp(),'private.env');writeFileSync(outside,`ZIGOALS_EXAMPLE=${SECRET}\n`);symlinkSync(outside,join(app,'.env.local'));
 expect(envFilesInScope(app)).toEqual([join(app,'.env.local')]);rmSync(outside);expect(envFilesInScope(app)).toEqual([join(app,'.env.local')]);
});

function stubs(root){
 // Any git or pnpm call leaves a marker; the refusal must come before both.
 const bin=join(root,'bin');mkdirSync(bin);
 for(const tool of ['git','pnpm']){writeFileSync(join(bin,tool),`#!/bin/sh\ntouch "${join(root,'called-'+tool)}"\nexit 1\n`);chmodSync(join(bin,tool),0o755);}
 return {...process.env,PATH:`${bin}:${process.env.PATH}`};
}
function buildTree(){const {root,app}=tree();mkdirSync(join(app,'scripts'));for(const file of ['build-alpha.mjs','hermetic-alpha.mjs','sanitize-alpha-env.mjs'])copyFileSync(join(scripts,file),join(app,'scripts',file));return {root,app,env:stubs(root)};}

it('build:alpha stops before git, pnpm or any output while an env file is within reach',()=>{
 const {root,app,env}=buildTree();writeFileSync(join(root,'.env.local'),`COINGECKO_DEMO_API_KEY=${SECRET}\n`);
 const result=spawnSync(process.execPath,['scripts/build-alpha.mjs'],{cwd:app,env,encoding:'utf8'});
 expect(result.status).toBe(1);expect(result.stderr).toContain('.env.local');expect(result.stdout+result.stderr).not.toContain(SECRET);
 for(const marker of ['called-git','called-pnpm'])expect(existsSync(join(root,marker))).toBe(false);expect(existsSync(join(app,'.open-next'))).toBe(false);
});

it('build:alpha goes on to the source check when no env file is within reach (the tracked example is allowed)',()=>{
 const {root,app,env}=buildTree();writeFileSync(join(root,'.env.example'),'COINGECKO_DEMO_API_KEY=\n');
 const result=spawnSync(process.execPath,['scripts/build-alpha.mjs'],{cwd:app,env,encoding:'utf8'});
 // The stubbed git fails the exact-source step, which proves the refusal let the build start.
 expect(result.status).not.toBe(0);expect(existsSync(join(root,'called-git'))).toBe(true);expect(result.stderr).not.toContain('refuses to run');
});

function artifact(files={},compiled={}){
 const dir=temp();mkdirSync(join(dir,'cloudflare'));
 writeFileSync(join(dir,'cloudflare/next-env.mjs'),['production','development','test'].map(mode=>`export const ${mode} = ${JSON.stringify(compiled[mode]??{})};`).join('\n')+'\n');
 for(const [path,text] of Object.entries(files)){mkdirSync(dirname(join(dir,path)),{recursive:true});writeFileSync(join(dir,path),text);}
 return dir;
}

it('passes an artifact that only reads configuration by name, as the real Alpha bundle does',()=>{
 const dir=artifact({
  'worker.js':'const a="durable-v1"===i.ZIGOALS_MARKET_QUOTES_MODE;const c={ZIGOALS_AUTH_ORIGIN:r2,ZIGOALS_AUTH_PUBLIC_KEY:i};const s=z.object({ZIGOALS_SYNC_ORIGIN:z.string()});\nconst m={error:"AUTH_ADMISSION_REQUIRED"},t=429===s?"TRY_LATER":"AUTH_FAILED";const k=process.env.COINGECKO_DEMO_API_KEY?.trim();const OAUTH_TOKEN="not ours";',
  'server-functions/default/handler.mjs':'// we invoke wrangler with `CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV`=`"false"`.\nconst note="Set ZIGOALS_AUTH_ORIGIN: see ACTIVATION";',
  'assets/logo.png':Buffer.from([0x89,0x50,0x4e,0x47,0,1,2,3]),
 });
 expect(scanAlphaArtifact(dir)).toEqual([]);
});

it('reports compiled configuration, copied env files and secret markers by file, rule and name, never by value',()=>{
 const dir=artifact({
  'worker.js':`const c={"ZIGOALS_AUTH_ORIGIN":"https://${SECRET}.example.invalid",COINGECKO_DEMO_API_KEY:'${SECRET}'};`,
  'server-functions/default/.env.production':`RESEND_API_KEY=${SECRET}\n`,
  'chunk.js':`const a="sb_secret_${SECRET}",b={role:"service_role"};`,
 },{production:{SUPABASE_URL:`https://${SECRET}.example.invalid`}});
 const findings=scanAlphaArtifact(dir);
 expect(findings).toEqual(expect.arrayContaining([
  {file:'cloudflare/next-env.mjs',rule:'compiled environment (production) is not empty',name:'SUPABASE_URL'},
  {file:'cloudflare/next-env.mjs',rule:'name with a configured value',name:'SUPABASE_URL'},
  {file:'worker.js',rule:'name with a configured value',name:'ZIGOALS_AUTH_ORIGIN'},
  {file:'worker.js',rule:'name with a configured value',name:'COINGECKO_DEMO_API_KEY'},
  {file:'server-functions/default/.env.production',rule:'env file copied into the artifact'},
  {file:'server-functions/default/.env.production',rule:'dotenv line',name:'RESEND_API_KEY'},
  {file:'chunk.js',rule:'secret marker'},
 ]));
 expect(findings).toHaveLength(7);expect(findings.filter(f=>f.file==='chunk.js')).toHaveLength(1);
 expect(JSON.stringify(findings)+describeFindings(findings)).not.toContain(SECRET);
 // A missing or malformed compiled environment fails closed.
 const broken=artifact();writeFileSync(join(broken,'cloudflare/next-env.mjs'),'export const production = process.env;\n');
 expect(scanAlphaArtifact(broken).map(f=>f.rule)).toEqual(['unexpected compiled environment format']);
 rmSync(join(broken,'cloudflare/next-env.mjs'));expect(scanAlphaArtifact(broken).map(f=>f.rule)).toEqual(['compiled environment missing']);
});

it('check:alpha-artifact --values-from names the keys whose values are inside the artifact and never prints a value',()=>{
 const app=temp(),dir=artifact({'worker.js':`fetch("https://sync-${SECRET}.example.invalid/api");const mode="durable-v1";`});
 // The CLI checks ./.open-next, as `pnpm --filter @zigoals/web check:alpha-artifact` runs it in apps/web.
 cpSync(dir,join(app,'.open-next'),{recursive:true});
 const file=join(temp(),'private.env');
 writeFileSync(file,`# comment\nZIGOALS_SYNC_ORIGIN=https://sync-${SECRET}.example.invalid\nZIGOALS_MARKET_QUOTES_MODE=durable-v1\nexport ZIGOALS_AUTH_PUBLIC_KEY="unused-long-public-key-value"\nEMPTY=\n`);
 // Values under 12 characters (enum-like settings the code itself contains) are not compared.
 expect([...readEnvValues(file).keys()]).toEqual(['ZIGOALS_SYNC_ORIGIN','ZIGOALS_AUTH_PUBLIC_KEY']);
 const cli=args=>spawnSync(process.execPath,[join(scripts,'check-alpha-artifact.mjs'),...args],{cwd:app,encoding:'utf8'});
 const found=cli(['--values-from',file]);
 expect(found.status).toBe(1);expect(found.stderr).toContain('worker.js: value from the given env file (ZIGOALS_SYNC_ORIGIN)');expect(found.stdout+found.stderr).not.toContain(SECRET);expect(found.stderr).not.toContain('ZIGOALS_MARKET_QUOTES_MODE');
 const clean=cli([]);expect(clean.status).toBe(0);expect(clean.stdout).toContain('passed');
 expect(cli(['--values-from']).status).toBe(2);expect(cli(['--unknown']).status).toBe(2);
});
