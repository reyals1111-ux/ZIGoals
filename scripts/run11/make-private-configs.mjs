#!/usr/bin/env node
// Stage 4: generate the six private Worker configs from the reviewed templates. Each copy keeps its
// template's classes, migrations, compatibility date/flags and nonpublic flags; only Worker names,
// service targets and non-secret vars change. It never handles secrets (use `wrangler secret put`
// after Stage 7 approval), refuses to overwrite, writes 0600 files that git must ignore, and prints
// only which names and var names changed, never values.
// `--recovery-admin` (ADR-007 option A, after Stage 4) adds the seventh, local-only recovery admin copy.
import {existsSync,readFileSync,writeFileSync,chmodSync,unlinkSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import JSON5 from 'json5';
import {CONFIGS,ADMIN_CONFIG,privatePath,privateFileProblems,validatePrivateCopies,validateAdminConfig,lifecycleTargetProblems} from './activation-check.mjs';

const FLAGS=['--auth-ref','--workers-subdomain','--app-origin','--name-prefix','--market-account-id','--market-policy-file'];
const USAGE='Usage: node scripts/run11/make-private-configs.mjs '+FLAGS.map(f=>f+' <value>').join(' ')+'\n   or: node scripts/run11/make-private-configs.mjs --recovery-admin   (after Stage 4: the seventh, local-only config)';
export function parseArgs(argv){
 if(argv.length===1&&argv[0]==='--recovery-admin')return {recoveryAdmin:true};
 const values={};
 for(let i=0;i<argv.length;i+=2){if(!FLAGS.includes(argv[i])||argv[i+1]===undefined||argv[i] in values)throw Error(USAGE);values[argv[i]]=argv[i+1];}
 if(FLAGS.some(f=>!(f in values)))throw Error(USAGE);
 return {authRef:values['--auth-ref'],workersSubdomain:values['--workers-subdomain'],appOrigin:values['--app-origin'],namePrefix:values['--name-prefix'],marketAccountId:values['--market-account-id'],marketPolicyFile:values['--market-policy-file']};
}
function checkInputs(input,policyText){
 const problems=[];
 if(!/^[a-z0-9]{8,40}$/.test(input.authRef))problems.push('--auth-ref must be the provider project reference (lowercase letters and digits).');
 if(!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(input.workersSubdomain))problems.push('--workers-subdomain must be the account workers.dev subdomain label.');
 let app;try{app=new URL(input.appOrigin);}catch{}
 if(!app||app.protocol!=='https:'||app.origin!==input.appOrigin||/^(localhost|127\.)/.test(app.hostname))problems.push('--app-origin must be an exact https origin, e.g. https://app.example.net.');
 if(!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(input.namePrefix)||input.namePrefix.length>30||/(^|-)(alpha|local)(-|$)/.test(input.namePrefix))problems.push('--name-prefix must be lowercase words joined by hyphens (at most 30 characters, no "alpha" or "local").');
 if(!/^[A-Za-z0-9_-]{1,64}$/.test(input.marketAccountId))problems.push('--market-account-id must be an opaque label (letters, digits, _ or -).');
 let policy;try{policy=JSON.parse(policyText);}catch{}
 if(!policy||typeof policy!=='object'||Array.isArray(policy))problems.push('--market-policy-file must contain a JSON object.');
 if(problems.length)throw Error(problems.join('\n'));
 return JSON.stringify(policy);
}
/** Pure transformation of the six templates into private copies. */
export function buildPrivateCopies(templates,input,policy){
 const rename=name=>input.namePrefix+'-'+name.slice('zigoals-'.length,-'-local'.length),names=Object.fromEntries(Object.entries(templates).map(([k,t])=>[k,rename(t.name)]));
 const authOrigin=`https://${input.authRef}.supabase.co`,syncOrigin=`https://${names.private}.${input.workersSubdomain}.workers.dev`;
 const vars={
  app:{ZIGOALS_AUTH_ORIGIN:authOrigin,ZIGOALS_SYNC_ORIGIN:syncOrigin},
  private:{AUTH_ORIGIN:authOrigin,APP_ORIGIN:input.appOrigin},
  lifecycle:{AUTH_ORIGIN:authOrigin},
  market:{MARKET_QUOTE_DISPATCH:'durable-v1',MARKET_ACCOUNT_ID:input.marketAccountId,MARKET_POLICY:policy},
 };
 const byTemplateName=Object.fromEntries(Object.entries(templates).map(([k,t])=>[t.name,names[k]]));
 return Object.fromEntries(Object.entries(templates).map(([kind,t])=>{
  const copy=structuredClone(t);copy.name=names[kind];
  if(copy.services)copy.services=copy.services.map(s=>({...s,service:byTemplateName[s.service]??s.service}));
  if(vars[kind])copy.vars={...(copy.vars??{}),...vars[kind]};
  return [kind,copy];
 }));
}
function summary(kind,template,copy){
 const services=(copy.services??[]).map(s=>`${s.binding}→${s.service}`).join(', '),setVars=Object.keys(copy.vars??{}).filter(k=>copy.vars[k]!==template.vars?.[k]);
 return `${privatePath(CONFIGS[kind])}: name ${template.name} → ${copy.name}${services?`; services ${services}`:''}${setVars.length?`; vars set: ${setVars.join(', ')} (values not printed)`:''}`;
}
/** Writes the six copies under root. Returns summary lines. Nothing is written unless every check passes. */
export function makePrivateConfigs(root,input){
 const policy=checkInputs(input,readFileSync(resolve(input.marketPolicyFile),'utf8'));
 const templates=Object.fromEntries(Object.entries(CONFIGS).map(([k,p])=>[k,JSON5.parse(readFileSync(resolve(root,p),'utf8'))]));
 const copies=buildPrivateCopies(templates,input,policy),errors=validatePrivateCopies(copies,templates);
 if(errors.length)throw Error(errors.join('\n'));
 const targets=Object.entries(CONFIGS).map(([k,p])=>[k,resolve(root,privatePath(p))]);
 const existing=targets.filter(([,t])=>existsSync(t)).map(([k])=>privatePath(CONFIGS[k]));
 if(existing.length)throw Error('Refusing to overwrite existing private configs:\n'+existing.join('\n'));
 const unignored=targets.filter(([,t])=>spawnSync('git',['check-ignore','-q',t],{cwd:root}).status!==0).map(([k])=>privatePath(CONFIGS[k]));
 if(unignored.length)throw Error('git would not ignore these paths; nothing written:\n'+unignored.join('\n'));
 const written=[];
 try{
  for(const [kind,target]of targets){writeFileSync(target,JSON.stringify(copies[kind],null,2)+'\n',{flag:'wx',mode:0o600});written.push(target);chmodSync(target,0o600);}
  const problems=Object.values(CONFIGS).flatMap(p=>privateFileProblems(root,privatePath(p)).map(x=>privatePath(p)+': '+x));
  if(problems.length)throw Error(problems.join('\n'));
 }catch(error){for(const target of written)try{unlinkSync(target);}catch{}throw error;}
 return Object.keys(CONFIGS).map(kind=>summary(kind,templates[kind],copies[kind]));
}
/** The seventh copy (ADR-007 option A): the local-only recovery admin config, bound to the private lifecycle Worker. */
export function buildAdminCopy(template,lifecycleName){
 const copy=structuredClone(template);copy.name=lifecycleName.replace(/-lifecycle$/,'')+'-recovery-admin-local-only';
 copy.services=template.services.map(s=>({...s,service:lifecycleName}));return copy;
}
/** Writes the recovery admin copy next to its template, from the existing Stage 4 lifecycle and private-sync copies. */
export function makeAdminConfig(root){
 const lifecycle=privatePath(CONFIGS.lifecycle),sync=privatePath(CONFIGS.private),path=privatePath(ADMIN_CONFIG),target=resolve(root,path);
 const problems=[lifecycle,sync].flatMap(p=>privateFileProblems(root,p).map(x=>p+': '+x));
 if(problems.length)throw Error('Generate the six Stage 4 private configs first; nothing written:\n'+problems.join('\n'));
 const read=p=>JSON5.parse(readFileSync(resolve(root,p),'utf8')),l=read(lifecycle),template=read(ADMIN_CONFIG),copy=buildAdminCopy(template,l.name);
 const errors=[...lifecycleTargetProblems(l),...validateAdminConfig(copy,template,l.name,{privateCopy:true})];
 if(!read(sync).services?.some(s=>s.binding==='LIFECYCLE'&&s.service===l.name&&s.entrypoint==='LifecycleService'))errors.push('recovery-admin: private sync must bind the same lifecycle Worker.');
 if(errors.length)throw Error(errors.join('\n'));
 if(existsSync(target))throw Error('Refusing to overwrite the existing recovery admin config: '+path);
 if(spawnSync('git',['check-ignore','-q',target],{cwd:root}).status!==0)throw Error('git would not ignore '+path+'; nothing written.');
 writeFileSync(target,JSON.stringify(copy,null,2)+'\n',{flag:'wx',mode:0o600});
 try{chmodSync(target,0o600);const left=privateFileProblems(root,path);if(left.length)throw Error(path+': '+left.join(', '));}catch(error){try{unlinkSync(target);}catch{}throw error;}
 return `${path}: name ${template.name} → ${copy.name}; services ADMIN→${l.name} (LifecycleRecoveryAdmin, remote)`;
}
function main(){
 const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),input=parseArgs(process.argv.slice(2));
 if(input.recoveryAdmin){console.log(['Wrote the recovery admin config (0600, ignored by git, never deployed):',makeAdminConfig(root),'Next: `node scripts/run11/activation-check.mjs --admin`, then docs/run11/OWNER_RECOVERY_ADMIN.md.'].join('\n'));return;}
 const lines=makePrivateConfigs(root,input);
 console.log(['Wrote six private configs (0600, ignored by git):',...lines,'Next: review them, then `node scripts/run11/activation-check.mjs --private`. Supply secrets only after Stage 7 approval.'].join('\n'));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))try{main();}catch(error){console.error(error.message);process.exitCode=1;}
