#!/usr/bin/env node
// Owner recovery administration (ADR-007 option A; runbook: docs/run11/OWNER_RECOVERY_ADMIN.md).
// Every command except `verify` first checks the ignored owner configs: the recovery admin copy must be a
// local-only config whose one remote ADMIN binding names the private lifecycle Worker that private sync uses.
// export/dry-run/reconcile then start the local admin Worker with `wrangler dev` on 127.0.0.1 for this one
// command (the owner's own Cloudflare login opens the remote binding), send the request with a random
// per-run session token, and stop it. Nothing is deployed. Output names digests, counts and paths only:
// never checkpoint contents, the account UUID or wrangler's own output (it can include the login email).
import {createHash,randomBytes} from 'node:crypto';
import {chmodSync,existsSync,lstatSync,mkdirSync,mkdtempSync,readFileSync,realpathSync,rmSync,statSync,unlinkSync,writeFileSync} from 'node:fs';
import {createServer} from 'node:net';
import {request as httpRequest} from 'node:http';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline/promises';
import {fileURLToPath} from 'node:url';
import JSON5 from 'json5';
import {ADMIN_CONFIG,CONFIGS,checkAdmin,privatePath} from './activation-check.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
export const USAGE=`Usage: node scripts/run11/recovery-admin.mjs <command>
  status
  export    --account <uuid> --out <new file outside this checkout>
  verify    --file <checkpoint file> --digest <sha256>
  dry-run   --account <uuid> --file <checkpoint file> --digest <sha256>
  reconcile --account <uuid> --file <checkpoint file> --digest <sha256>
  erase     --account <uuid> --out <new file outside this checkout>`;
const COMMANDS={status:[],export:['--account','--out'],verify:['--file','--digest'],'dry-run':['--account','--file','--digest'],reconcile:['--account','--file','--digest'],erase:['--account','--out']};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,DIGEST=/^[0-9a-f]{64}$/;
// The lifecycle authority's own import limit.
const MAX_CHECKPOINT=16*1024*1024;

/** Values are checked, never echoed: a bad account or digest is named by its flag only. */
export function parseArgs(argv){
 const [command,...rest]=argv,flags=COMMANDS[command];if(!flags)throw Error(USAGE);
 const values={};
 for(let i=0;i<rest.length;i+=2){const flag=rest[i],value=rest[i+1];if(!flags.includes(flag)||value===undefined||value.startsWith('--')||flag in values)throw Error(USAGE);values[flag]=value;}
 if(flags.some(flag=>!(flag in values)))throw Error(USAGE);
 if('--account' in values&&!UUID.test(values['--account']))throw Error('--account must be the lowercase account UUID.');
 if('--digest' in values&&!DIGEST.test(values['--digest']))throw Error('--digest must be the 64-character lowercase SHA-256 digest.');
 return {command,account:values['--account'],out:values['--out'],file:values['--file'],digest:values['--digest']};
}

/** The lifecycle authority's canonical JSON (sorted object keys) and SHA-256, as in workers/private-sync/lifecycle.mjs. */
export const canonical=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
export const checkpointDigest=checkpoint=>createHash('sha256').update(canonical(checkpoint)).digest('hex');
const isEnvelope=value=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join()==='checkpoint,digest'&&DIGEST.test(value.digest)&&value.checkpoint&&typeof value.checkpoint==='object'&&value.checkpoint.version===1&&UUID.test(value.checkpoint.account??'')&&Array.isArray(value.checkpoint.receipts);

/** Reads an exported envelope: a regular 0600 file, at most 16 MiB, whose checkpoint still matches its recorded digest. */
export function readCheckpointFile(path){
 let info;try{info=lstatSync(path);}catch{throw Error('Checkpoint file not found.');}
 if(!info.isFile())throw Error('The checkpoint must be a regular file (not a link or folder).');
 if(info.mode&0o077)throw Error('The checkpoint file is readable or writable by others (not mode 0600). Run chmod 600 on it after checking that nobody changed it.');
 if(info.size>MAX_CHECKPOINT)throw Error('The checkpoint file is larger than 16 MiB.');
 let envelope;try{envelope=JSON.parse(readFileSync(path,'utf8'));}catch{throw Error('The checkpoint file is not readable JSON.');}
 if(!isEnvelope(envelope))throw Error('The file is not a lifecycle checkpoint export ({checkpoint, digest}).');
 if(checkpointDigest(envelope.checkpoint)!==envelope.digest)throw Error('The checkpoint does not match the digest recorded in its own file: it changed after export. Do not use it.');
 return {...envelope,bytes:info.size};
}

/** Writes a new 0600 file outside the checkout; refuses an existing file, and removes it again if the file system did not keep 0600. */
function checkOutPath(root,out){
 const target=resolve(out),base=realpathSync(root);
 let parent;try{parent=realpathSync(dirname(target));}catch{throw Error('The output folder does not exist.');}
 if(parent===base||parent.startsWith(base+'/'))throw Error('Write the checkpoint outside this checkout (for example your home folder), never into the repository.');
 if(existsSync(target))throw Error('The output file already exists; choose a new name. Nothing was overwritten.');
 return target;
}
export function writeCheckpointFile(root,out,text,fs={writeFileSync,chmodSync,statSync,unlinkSync}){
 const target=checkOutPath(root,out);
 fs.writeFileSync(target,text,{flag:'wx',mode:0o600});
 try{fs.chmodSync(target,0o600);const info=fs.statSync(target);if(!info.isFile()||info.mode&0o077)throw Error('not 0600');}
 catch{try{fs.unlinkSync(target);}catch{}throw Error('This location did not keep the file private (mode 0600), so the file was removed. Choose a folder on your own disk.');}
 return target;
}

/** The private lifecycle Worker the ignored owner configs name, after the full Stage 5 config check (activation-check --admin). */
export function checkTarget(root){
 checkAdmin(root);
 const lifecycle=JSON5.parse(readFileSync(resolve(root,privatePath(CONFIGS.lifecycle)),'utf8')),vars=lifecycle.vars??{};
 const adminDir=dirname(resolve(root,ADMIN_CONFIG));
 // A .dev.vars or .env beside the admin config would replace the per-run session variable.
 if(['.dev.vars','.env'].some(name=>existsSync(join(adminDir,name))))throw Error('Remove .dev.vars/.env from workers/recovery-admin/: the admin Worker takes no local variables.');
 return {adminConfig:resolve(root,privatePath(ADMIN_CONFIG)),lifecycleName:lifecycle.name,mode:vars.RECOVERY_MODE,anchorAccount:vars.RECOVERY_ACCOUNT_ID,anchorDigest:vars.RECOVERY_CHECKPOINT_SHA256};
}
function requireReconcile(target,account,digest){
 if(target.mode!=='reconcile')throw Error('Refused: the private lifecycle config is not in RECOVERY_MODE=reconcile. Dry-run and reconcile run only in reconcile mode. Nothing was sent.');
 if(target.anchorAccount!==undefined&&target.anchorAccount!==account||target.anchorDigest!==undefined&&target.anchorDigest!==digest)throw Error('Refused: the recovery anchor in the private lifecycle config names another account or digest. Nothing was sent.');
}

const freePort=()=>new Promise((done,fail)=>{const server=createServer();server.unref();server.on('error',fail);server.listen(0,'127.0.0.1',()=>{const {port}=/** @type {import('node:net').AddressInfo} */(server.address());server.close(()=>done(port));});});
/** Loopback HTTP without any proxy. */
export function adminCall(url,token,path,{account,body}={}){
 return new Promise((done,fail)=>{
  const target=new URL(path,url);if(target.hostname!=='127.0.0.1')throw Error('The admin Worker must listen on 127.0.0.1.');
  const headers={'x-admin-session':token,...(account?{'x-verified-account':account}:{}),...(body!==undefined?{'content-type':'application/json'}:{})};
  const req=httpRequest(target,{method:body!==undefined?'POST':'GET',headers,timeout:120000},response=>{const chunks=[];let length=0;response.on('data',chunk=>{length+=chunk.length;if(length>2*MAX_CHECKPOINT){req.destroy(Error('Response too large.'));return;}chunks.push(chunk);});response.on('end',()=>{let json=null;try{json=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{}done({status:response.statusCode??0,json});});});
  req.on('timeout',()=>req.destroy(Error('The admin Worker did not answer in time.')));req.on('error',fail);
  if(body!==undefined)req.write(body);req.end();
 });
}
/** The `wrangler dev` arguments for one run: the checked admin config, 127.0.0.1 only, this run's own state.
 * Every flag must be one the pinned Wrangler lists (scripts/wrangler-cli-surface.test.mjs checks them offline):
 * 4.144.0 rejected the former `--disable-dev-registry` and the tool could not start (Stage 7 rehearsal). */
export function wranglerDevArgs({adminConfig,port,inspector,envFile,dir}){
 return ['dev','--config',adminConfig,'--ip','127.0.0.1','--port',String(port),'--inspector-ip','127.0.0.1','--inspector-port',String(inspector),'--env-file',envFile,'--show-interactive-dev-session=false','--persist-to',join(dir,'state'),'--log-level','error'];
}
/** The child's environment. Wrangler's dev registry lives at WRANGLER_REGISTRY_PATH (default: its global config
 * folder); a fresh, private folder inside this run's directory, deleted by stop(), keeps the admin Worker
 * from seeing or being seen by any other local wrangler session, as the dropped flag did. */
export function wranglerDevEnv({dir,base=process.env}){
 return {...base,WRANGLER_SEND_METRICS:'false',WRANGLER_SEND_ERROR_REPORTS:'false',CLOUDFLARE_INCLUDE_PROCESS_ENV:'false',WRANGLER_REGISTRY_PATH:join(dir,'registry')};
}
/** Starts `wrangler dev` on exactly the checked admin config, on 127.0.0.1 only, and waits until it answers. */
export async function launchWrangler({root,adminConfig,token}){
 const dir=mkdtempSync(join(tmpdir(),'zigoals-recovery-admin-')),envFile=join(dir,'admin.env');
 writeFileSync(envFile,`ADMIN_SESSION_TOKEN=${token}\n`,{flag:'wx',mode:0o600});mkdirSync(join(dir,'registry'),{mode:0o700});
 const port=await freePort(),inspector=await freePort(),url=`http://127.0.0.1:${port}`;
 const child=spawn(resolve(root,'apps/web/node_modules/.bin/wrangler'),wranglerDevArgs({adminConfig,port,inspector,envFile,dir}),
  {cwd:root,stdio:['ignore','pipe','pipe'],env:wranglerDevEnv({dir})});
 // Drained, never printed.
 child.stdout.resume();child.stderr.resume();let exited=false;child.on('exit',()=>{exited=true;});
 const stop=async()=>{if(!exited){child.kill('SIGTERM');await Promise.race([new Promise(done=>child.once('exit',done)),new Promise(done=>setTimeout(done,10000))]);if(!exited)child.kill('SIGKILL');}rmSync(dir,{recursive:true,force:true});};
 for(const deadline=Date.now()+120000;;){
  if(exited||Date.now()>deadline){await stop();throw Error('wrangler dev did not start the recovery admin Worker. Its output is not printed (it can include account details). Check `wrangler whoami` and the runbook, docs/run11/OWNER_RECOVERY_ADMIN.md.');}
  try{const {status,json}=await adminCall(url,token,'/status');if(status===200&&json?.ok===true)return {url,stop};}catch{}
  await new Promise(done=>setTimeout(done,500));
 }
}
/** Reads one line from the owner's terminal; never from a pipe. */
async function ttyPrompt(question){
 if(!process.stdin.isTTY)return undefined;
 const rl=createInterface({input:process.stdin,output:process.stdout});try{return await rl.question(question);}finally{rl.close();}
}

const REFUSALS={
 EXTERNAL_CHECKPOINT_REQUIRED:'Refused by the lifecycle Worker: it is not in RECOVERY_MODE=reconcile with RECOVERY_ACCOUNT_ID and RECOVERY_CHECKPOINT_SHA256 set for this account. Nothing was changed.',
 CHECKPOINT_ANCHOR_MISMATCH:'Refused by the lifecycle Worker: this checkpoint is not the anchor configured on the Worker (RECOVERY_CHECKPOINT_SHA256). Nothing was changed.',
 RECOVERY_DISABLED:'Refused by the lifecycle Worker: RECOVERY_MODE is neither serve nor reconcile. Nothing was changed.',
 INVALID_CHECKPOINT:'Refused by the lifecycle Worker: the checkpoint is invalid for this account. Nothing was changed.',
 CHECKPOINT_CONFLICT:'Refused by the lifecycle Worker: the checkpoint conflicts with the stored history. Nothing was changed; keep both copies and review.',
 INCOMPLETE_CHECKPOINT:'Refused by the lifecycle Worker: a receipt history is incomplete. Nothing was changed.',
 RECOVERY_CAPACITY:'Refused by the lifecycle Worker: recovery capacity reached (16 MiB, 50,000 receipts or 128 reconciliations). Nothing was changed.',
 ADMIN_SESSION_REQUIRED:'Refused: the local admin Worker did not accept this session.',
 CHECKPOINT_CHANGED:'Refused by the lifecycle Worker: the account changed after the export, so the export in custody is not its latest state. Nothing was erased; run erase again.',
 INVALID_ERASE:'Refused by the lifecycle Worker: the erase request is invalid. Nothing was erased.',
};
const refusal=response=>Error(REFUSALS[response.json?.error]??`Refused: the admin Worker answered HTTP ${response.status}. Nothing is known to have changed; run status and the runbook checks.`);
async function exportEnvelope(admin,token,account){
 const response=await adminCall(admin.url,token,'/admin/export',{account});if(response.status!==200)throw refusal(response);
 const envelope=response.json;if(!isEnvelope(envelope)||envelope.checkpoint.account!==account||checkpointDigest(envelope.checkpoint)!==envelope.digest)throw Error('The exported checkpoint does not match its digest or account; nothing was written.');
 return envelope;
}
async function dryRun(admin,token,account,checkpoint){
 const response=await adminCall(admin.url,token,'/admin/dry-run',{account,body:JSON.stringify(checkpoint)});
 if(response.status!==200||!DIGEST.test(response.json?.resultDigest??''))throw refusal(response);
 return response.json;
}
function checkedFile(input){
 const file=readCheckpointFile(input.file);
 if(file.digest!==input.digest)throw Error('The checkpoint file does not match --digest. Nothing was sent.');
 if(file.checkpoint.account!==input.account)throw Error('The checkpoint belongs to another account than --account. Nothing was sent.');
 return file;
}

/** Owner erase (Session S, FIX_PLAN H1; runbook "Erase an account"): export into custody first, then the account UUID
 * and that export's digest typed at the terminal, then the lifecycle Worker's /admin/erase, which applies only while the
 * account's checkpoint still has that digest. A second export (beside the first, "-after-erase") goes into custody too.
 * Session U Part 5 (item 7): then private sync's PrivateVaultRecoveryAdmin removes the account's encrypted vault rows,
 * only while the lifecycle Worker serves; in reconcile mode the command says so, and running it again after the serve
 * switch removes them (the deletion is already recorded, so the second run only reports it). */
async function erase(admin,token,input,root,{prompt,print}){
 const before=await exportEnvelope(admin,token,input.account),text=JSON.stringify(before,null,1)+'\n',path=writeCheckpointFile(root,input.out,text);
 print([`Exported the current state to ${path} (mode 0600).`,`SHA-256 digest: ${before.digest}`,before.checkpoint.lifecycle.deleted?'The account is already deleted; erase only requests the sign-in identity deletion if it is still retained.':'The account is not deleted yet.','Erasing records the deletion: sync refuses the account for good, its sign-in identity is deleted once the lifecycle Worker serves, and its encrypted vault rows are removed while the lifecycle Worker serves (in reconcile mode: run erase again after the serve switch; docs/run11/OWNER_RECOVERY_ADMIN.md, "Erase an account").'].join('\n'));
 const typedAccount=(await prompt('Type the account UUID to confirm erase: '))?.trim(),typedDigest=(await prompt('Type the digest of the export just written: '))?.trim();
 if(!typedAccount||!typedDigest)throw Error('Refused: erase needs both confirmations typed in an interactive terminal. Nothing was erased; the export stays in custody.');
 if(typedAccount!==input.account||typedDigest!==before.digest)throw Error('Refused: the typed confirmation does not match --account and the export digest. Nothing was erased.');
 const response=await adminCall(admin.url,token,'/admin/erase',{account:input.account,body:JSON.stringify({confirm:'ERASE ACCOUNT',expectedDigest:before.digest})});
 if(response.status!==200||response.json?.erased!==true)throw refusal(response);
 const after=await exportEnvelope(admin,token,input.account),afterText=JSON.stringify(after,null,1)+'\n',afterPath=writeCheckpointFile(root,input.out.replace(/(\.json)?$/,'-after-erase.json'),afterText);
 if(after.checkpoint.lifecycle.deleted!==true)throw Error(`The re-export (${afterPath}) does not show the account deleted. Keep both files and follow the runbook's failure steps.`);
 // Session U Part 5 (item 7): the vault rows go too, through private sync's own erase, now that the deletion is recorded.
 const vault=await adminCall(admin.url,token,'/admin/erase-vault',{account:input.account,body:JSON.stringify({confirm:'ERASE VAULT'})});
 const rows=vault.status===200&&vault.json?.vaultErased===true?'Encrypted vault rows: REMOVED (private sync keeps only the marker that refuses the account).'
  :vault.json?.error==='LIFECYCLE_NOT_SERVING'?'Encrypted vault rows: NOT REMOVED YET: the lifecycle Worker is in reconcile mode. After the switch to serve, run erase again for this account (with a new --out file); it removes them then.'
  :`Encrypted vault rows: NOT REMOVED (${vault.json?.error==='ACCOUNT_NOT_DELETED'?'the lifecycle Worker does not report the account deleted':vault.json?.error==='VAULT_ADMIN_BINDING_MISSING'?'the recovery admin copy has no VAULT_ADMIN binding: regenerate it with make-private-configs.mjs --recovery-admin':`private sync answered HTTP ${vault.status}`}). Run erase again; the runbook has the checks.`;
 print([`${response.json.alreadyDeleted?'ALREADY DELETED':'ERASED'}: identity deletion ${response.json.provider==='deleted'?'already done':'pending (runs when the lifecycle Worker serves)'}.`,rows,`Re-exported to ${afterPath} (mode 0600).`,`SHA-256 digest: ${after.digest}`,'Put both files and their digests into custody as separate items.'].join('\n'));
}
/** Runs one command. Returns nothing; throws an Error whose message is safe to print. */
export async function run(argv,{root=ROOT,launch=launchWrangler,prompt=ttyPrompt,print=console.log}={}){
 const input=parseArgs(argv);
 if(input.command==='verify'){
  const file=readCheckpointFile(input.file);
  if(file.digest!==input.digest)throw Error('MISMATCH: the checkpoint file does not match the expected digest. Do not use it.');
  print(`MATCH: the checkpoint file matches the expected digest (${file.checkpoint.receipts.length} receipts, ${file.bytes} bytes). Nothing was contacted.`);return;
 }
 const target=checkTarget(root);
 if(input.command==='status'){
  let wrangler='not installed';try{wrangler=JSON.parse(readFileSync(resolve(root,'apps/web/node_modules/wrangler/package.json'),'utf8')).version;}catch{}
  print(['PASS: the ignored owner configs name one private lifecycle Worker; the recovery admin config is local only.',`Target lifecycle Worker: ${target.lifecycleName}`,`RECOVERY_MODE in the private lifecycle config: ${target.mode??'missing'}`,`Recovery anchor in the private lifecycle config: ${target.anchorAccount||target.anchorDigest?'set':'not set'} (values not printed)`,`wrangler: ${wrangler}`,'Nothing was contacted.'].join('\n'));return;
 }
 if(input.command==='export'||input.command==='erase'){
  checkOutPath(root,input.out); // before anything starts; checked again when writing
 }
 let file;if(!['export','erase'].includes(input.command)){file=checkedFile(input);requireReconcile(target,input.account,input.digest);}
 const token=randomBytes(32).toString('base64url'),admin=await launch({root,adminConfig:target.adminConfig,token});
 try{
  if(input.command==='export'){
   const envelope=await exportEnvelope(admin,token,input.account),text=JSON.stringify(envelope,null,1)+'\n',path=writeCheckpointFile(root,input.out,text);
   print([`Exported to ${path} (mode 0600).`,`SHA-256 digest: ${envelope.digest}`,`Receipts: ${envelope.checkpoint.receipts.length} · bytes: ${Buffer.byteLength(text)}`,'Store the file and the digest as separate Bitwarden items, then the offline copy (docs/run11/OWNER_RECOVERY_ADMIN.md).'].join('\n'));return;
  }
  if(input.command==='erase'){await erase(admin,token,input,root,{prompt,print});return;}
  const dry=await dryRun(admin,token,input.account,file.checkpoint);
  if(dry.replay){print(`ALREADY RECONCILED: this checkpoint was applied before (result digest ${dry.resultDigest}). Nothing was changed.`);return;}
  print(`DRY RUN OK: the Worker would apply this checkpoint. Result digest: ${dry.resultDigest}. Nothing was changed.`);
  if(input.command==='dry-run')return;
  const typedAccount=(await prompt('Type the account UUID to confirm reconcile: '))?.trim(),typedDigest=(await prompt('Type the expected checkpoint digest: '))?.trim();
  if(!typedAccount||!typedDigest)throw Error('Refused: reconcile needs both confirmations typed in an interactive terminal. Nothing was changed.');
  if(typedAccount!==input.account||typedDigest!==input.digest)throw Error('Refused: the typed confirmation does not match --account and --digest. Nothing was changed.');
  const response=await adminCall(admin.url,token,'/admin/reconcile',{account:input.account,body:JSON.stringify(file.checkpoint)});
  if(response.status!==200||response.json?.applied!==true)throw refusal(response);
  const after=await exportEnvelope(admin,token,input.account);
  if(after.digest!==response.json.resultDigest||after.digest!==dry.resultDigest)throw Error(`RECONCILED, but the re-export digest ${after.digest} differs from the reconcile result. Keep recovery paused and follow the runbook's failure steps.`);
  print([`RECONCILED${response.json.replay?' (replayed receipt)':''}: result digest ${response.json.resultDigest}.`,'Re-export digest matches the dry-run and reconcile result. Export again into custody before any return to serve.'].join('\n'));
 }finally{await admin.stop();}
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))run(process.argv.slice(2)).catch(error=>{console.error(error.message);process.exitCode=1;});
