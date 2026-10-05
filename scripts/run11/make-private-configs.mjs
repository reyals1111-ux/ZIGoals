#!/usr/bin/env node
// Stage 4: generate the six private Worker configs from the reviewed templates. Each copy keeps its
// template's classes, migrations, compatibility date/flags and nonpublic flags; only Worker names,
// service targets and non-secret vars change. It never handles secrets (use `wrangler secret put`
// after Stage 7 approval), refuses to overwrite, writes 0600 files that git must ignore, and prints
// only which names and var names changed, never values.
// `--recovery-admin` (ADR-007 option A, after Stage 4) adds the seventh, local-only recovery admin copy.
// `--set-market-policy` and `--set-food-user-agent` (Stage 6) change one var in one existing private copy and
// leave every other byte, comments and order included, as it was.
import {existsSync,readFileSync,writeFileSync,chmodSync,unlinkSync,renameSync,realpathSync,openSync,fsyncSync,closeSync} from 'node:fs';
import {resolve,dirname,relative,basename,join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import JSON5 from 'json5';
import {CONFIGS,ADMIN_CONFIG,privatePath,privateFileProblems,validatePrivateCopies,validateAdminConfig,lifecycleTargetProblems,syncTargetProblems} from './activation-check.mjs';

const FLAGS=['--auth-ref','--workers-subdomain','--app-origin','--name-prefix','--market-account-id','--market-policy-file'];
const USAGE='Usage: node scripts/run11/make-private-configs.mjs '+FLAGS.map(f=>f+' <value>').join(' ')+'\n   or: node scripts/run11/make-private-configs.mjs --recovery-admin   (after Stage 4: the seventh, local-only config)'+'\n   or: node scripts/run11/make-private-configs.mjs --set-market-policy <policy file>   (Stage 6: MARKET_POLICY only)'+'\n   or: node scripts/run11/make-private-configs.mjs --set-food-user-agent "ZIGoals/<version> (<contact email>)"   (Stage 6: FOOD_USER_AGENT only)';
/** The Stage 6 update modes: each sets one var in one existing private copy. */
const UPDATES={'--set-market-policy':{kind:'market',name:'MARKET_POLICY'},'--set-food-user-agent':{kind:'food',name:'FOOD_USER_AGENT'}};
export function parseArgs(argv){
 if(argv.length===1&&argv[0]==='--recovery-admin')return {recoveryAdmin:true};
 if(argv.length===2&&Object.hasOwn(UPDATES,argv[0]))return {update:argv[0],value:argv[1]};
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
 const policy=policyValue(policyText);
 if(policy===null)problems.push('--market-policy-file must contain a JSON object.');
 if(problems.length)throw Error(problems.join('\n'));
 return policy;
}
/** MARKET_POLICY as creation stores it: the file's JSON object, re-serialised on one line; null if it is not one. */
function policyValue(text){
 let policy;try{policy=JSON.parse(text);}catch{}
 return !policy||typeof policy!=='object'||Array.isArray(policy)?null:JSON.stringify(policy);
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
/** The seventh copy (ADR-007 option A): the local-only recovery admin config, bound to the private lifecycle Worker and
 * (Session U Part 5, item 7) to the private sync Worker, whose PrivateVaultRecoveryAdmin entrypoint erase uses. */
export function buildAdminCopy(template,lifecycleName,syncName){
 const copy=structuredClone(template);copy.name=lifecycleName.replace(/-lifecycle$/,'')+'-recovery-admin-local-only';
 copy.services=template.services.map(s=>({...s,service:s.binding==='VAULT_ADMIN'?syncName:lifecycleName}));return copy;
}
/** Writes the recovery admin copy next to its template, from the existing Stage 4 lifecycle and private-sync copies. */
export function makeAdminConfig(root){
 const lifecycle=privatePath(CONFIGS.lifecycle),sync=privatePath(CONFIGS.private),path=privatePath(ADMIN_CONFIG),target=resolve(root,path);
 const problems=[lifecycle,sync].flatMap(p=>privateFileProblems(root,p).map(x=>p+': '+x));
 if(problems.length)throw Error('Generate the six Stage 4 private configs first; nothing written:\n'+problems.join('\n'));
 const read=p=>JSON5.parse(readFileSync(resolve(root,p),'utf8')),l=read(lifecycle),s=read(sync),template=read(ADMIN_CONFIG),copy=buildAdminCopy(template,l.name,s.name);
 const errors=[...lifecycleTargetProblems(l),...syncTargetProblems(s,l.name),...validateAdminConfig(copy,template,l.name,{privateCopy:true,syncName:s.name})];
 if(errors.length)throw Error(errors.join('\n'));
 if(existsSync(target))throw Error('Refusing to overwrite the existing recovery admin config: '+path+'. A copy made before Session U has one binding: move it out of the checkout first, then run this again (docs/run11/OWNER_RECOVERY_ADMIN.md).');
 if(spawnSync('git',['check-ignore','-q',target],{cwd:root}).status!==0)throw Error('git would not ignore '+path+'; nothing written.');
 writeFileSync(target,JSON.stringify(copy,null,2)+'\n',{flag:'wx',mode:0o600});
 try{chmodSync(target,0o600);const left=privateFileProblems(root,path);if(left.length)throw Error(path+': '+left.join(', '));}catch(error){try{unlinkSync(target);}catch{}throw error;}
 return `${path}: name ${template.name} → ${copy.name}; services ADMIN→${l.name} (LifecycleRecoveryAdmin, remote), VAULT_ADMIN→${s.name} (PrivateVaultRecoveryAdmin, remote)`;
}
// ---- Stage 6 update modes ----
// A JSONC reader that only locates members: double-quoted keys and strings, // and /* */ comments, trailing
// commas. It never re-serialises, so the bytes it does not replace stay exactly as they were.
function jsoncSkip(text,i){
 for(;;){
  while(i<text.length&&/\s/.test(text[i]))i++;
  if(text.startsWith('//',i)){const end=text.indexOf('\n',i);i=end<0?text.length:end+1;continue;}
  if(text.startsWith('/*',i)){const end=text.indexOf('*/',i+2);if(end<0)throw Error('unterminated comment');i=end+2;continue;}
  return i;
 }
}
function jsoncString(text,i){
 for(let j=i+1;j<text.length;j++){if(text[j]==='\\'){j++;continue;}if(text[j]==='"')return j+1;if(text[j]==='\n')break;}
 throw Error('unterminated string');
}
function jsoncValue(text,i){
 if(text[i]==='{')return jsoncObject(text,i).end;
 if(text[i]==='"')return jsoncString(text,i);
 if(text[i]==='['){
  i=jsoncSkip(text,i+1);
  while(text[i]!==']'){i=jsoncSkip(text,jsoncValue(text,i));if(text[i]===',')i=jsoncSkip(text,i+1);else if(text[i]!==']')throw Error('unexpected array syntax');}
  return i+1;
 }
 const match=/^(?:true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(i,i+64));
 if(!match)throw Error('unsupported value syntax');
 return i+match[0].length;
}
function jsoncObject(text,open){
 if(text[open]!=='{')throw Error('object expected');
 const members=[];let i=jsoncSkip(text,open+1);
 while(text[i]!=='}'){
  if(text[i]!=='"')throw Error('only double-quoted keys are supported');
  const keyAt=i,keyEnd=jsoncString(text,i),key=JSON.parse(text.slice(i,keyEnd));
  if(members.some(m=>m.key===key))throw Error('duplicate key '+key);
  i=jsoncSkip(text,keyEnd);if(text[i]!==':')throw Error('colon expected');
  const valueStart=jsoncSkip(text,i+1),valueEnd=jsoncValue(text,valueStart),member={key,keyAt,valueStart,valueEnd,comma:null};
  members.push(member);i=jsoncSkip(text,valueEnd);
  if(text[i]===','){member.comma=i;i=jsoncSkip(text,i+1);}else if(text[i]!=='}')throw Error('comma or } expected');
 }
 return {open,members,end:i+1};
}
const lineIndent=(text,at)=>/^[ \t]*/.exec(text.slice(text.lastIndexOf('\n',at-1)+1))[0];
// Inserts `"name": value` as the last member of an object, on its own line just before the closing brace (after any
// comment that ends the last line), plus a comma after the previous last value when it has none. Only bytes are
// added; none are changed or removed.
function insertMember(text,object,name,value){
 const last=object.members.at(-1),entry=JSON.stringify(name)+': '+value;
 if(!last){const indent=lineIndent(text,object.open);return text.slice(0,object.open+1)+'\n'+indent+'  '+entry+'\n'+indent+text.slice(object.open+1);}
 let at=object.end-1;while(at>last.valueEnd&&/[ \t\r\n]/.test(text[at-1]))at--;
 const indent=lineIndent(text,last.keyAt),line='\n'+indent+entry+(last.comma!==null?',':'');
 if(last.comma!==null)return text.slice(0,at)+line+text.slice(at);
 return text.slice(0,last.valueEnd)+','+text.slice(last.valueEnd,at)+line+text.slice(at);
}
/** The JSONC text with only `vars[name]` set to the JSON string `value`: replaced in place if it exists, otherwise
 * inserted (with a `vars` object when the config has none). Throws if the structure cannot be located safely. */
export function setJsoncVar(text,name,value){
 const json=JSON.stringify(value),start=jsoncSkip(text,text.startsWith('\uFEFF')?1:0),root=jsoncObject(text,start);
 if(jsoncSkip(text,root.end)!==text.length)throw Error('unexpected text after the config object');
 const vars=root.members.find(m=>m.key==='vars');
 if(!vars)return insertMember(text,root,'vars','{\n'+lineIndent(text,root.members.at(-1)?.keyAt??root.open)+'  '+JSON.stringify(name)+': '+json+'\n'+lineIndent(text,root.members.at(-1)?.keyAt??root.open)+'}');
 if(text[vars.valueStart]!=='{')throw Error('vars is not an object');
 const object=jsoncObject(text,vars.valueStart),member=object.members.find(m=>m.key===name);
 return member?text.slice(0,member.valueStart)+json+text.slice(member.valueEnd):insertMember(text,object,name,json);
}
/** FOOD_READINESS.md's template, `ZIGoals/<version> (<contact email>)`; printable ASCII, no placeholder. Problems name no value. */
export function foodUserAgentProblems(value){
 const problems=[];
 if(typeof value!=='string'||!/^[\x20-\x7e]+$/.test(value)||!/^ZIGoals\/[0-9A-Za-z][0-9A-Za-z.+-]{0,31} \([^\s()<>@]{1,64}@[^\s()<>@]{1,64}\.[A-Za-z]{2,24}\)$/.test(value))problems.push('--set-food-user-agent must be "ZIGoals/<version> (<contact email>)" in printable ASCII, with no line breaks or control characters (FOOD_READINESS.md).');
 if(typeof value==='string'&&(value.length>168||/unconfigured|127\.0\.0\.1|localhost|example\.(com|org|invalid)/i.test(value)))problems.push('--set-food-user-agent must be the real owner contact, at most 160 characters after "ZIGoals/", not a template or example value.');
 return problems;
}
function writeAtomically(target,text){
 const temp=join(dirname(target),'.set-'+randomBytes(6).toString('hex')+'.acctest.owner.jsonc');
 try{
  writeFileSync(temp,text,{flag:'wx',mode:0o600});chmodSync(temp,0o600);
  const fd=openSync(temp,'r');try{fsyncSync(fd);}finally{closeSync(fd);}
  renameSync(temp,target);
 }catch(error){try{unlinkSync(temp);}catch{}throw error;}
}
/** Sets one var in one existing private copy. Refuses unless the copy is inside the checkout, 0600 and ignored;
 * checks that the parsed result differs only in that var; writes atomically with mode 0600. */
export function setPrivateVar(root,kind,name,value){
 const path=privatePath(CONFIGS[kind]),problems=privateFileProblems(root,path);
 if(problems.length)throw Error(`${path}: ${problems.join(', ')}. Create the Stage 4 private configs first (inside the checkout, mode 0600, ignored by git); nothing written.`);
 const target=realpathSync(resolve(root,path)),before=readFileSync(target,'utf8');
 let after;try{after=setJsoncVar(before,name,value);}catch(error){throw Error(`${path}: ${name} could not be located safely (${error.message}); nothing written.`);}
 const old=JSON5.parse(before),expected={...old,vars:{...(old.vars??{}),[name]:value}};
 if(JSON.stringify(JSON5.parse(after))!==JSON.stringify(expected))throw Error(`${path}: the edit would change more than ${name}; nothing written.`);
 if(after===before)return `${path}: ${name} already has this value; nothing written.`;
 writeAtomically(target,after);
 if(readFileSync(target,'utf8')!==after||privateFileProblems(root,path).length){writeAtomically(target,before);throw Error(`${path}: the write could not be verified; the previous file was restored.`);}
 return `${path}: ${name} set (value not printed); every other byte is unchanged.`;
}
/** activation-check --private, reported as text instead of thrown. Messages name files and vars, never values. */
export function privateCheckStatus(root){
 const read=p=>JSON5.parse(readFileSync(resolve(root,p),'utf8'));
 const problems=Object.values(CONFIGS).flatMap(p=>privateFileProblems(root,privatePath(p)).map(x=>privatePath(p)+': '+x));
 const errors=problems.length?problems:validatePrivateCopies(Object.fromEntries(Object.entries(CONFIGS).map(([k,p])=>[k,read(privatePath(p))])),Object.fromEntries(Object.entries(CONFIGS).map(([k,p])=>[k,read(p)])));
 return errors.length?'activation-check --private still reports:\n'+errors.map(e=>'  '+e).join('\n'):'activation-check --private: PASS (values not printed).';
}
/** Stage 6: MARKET_POLICY from a policy file that is inside the checkout, 0600 and ignored, validated as at creation. */
export function setMarketPolicy(root,file){
 const path=relative(realpathSync(root),resolve(file)),problems=privateFileProblems(root,path);
 if(problems.length)throw Error(`${basename(file)}: ${problems.join(', ')}. Keep the policy file inside the checkout, mode 0600 and ignored by git (*.market-policy.private.json); nothing written.`);
 const policy=policyValue(readFileSync(resolve(root,path),'utf8'));
 if(policy===null)throw Error('--market-policy-file must contain a JSON object.');
 return [setPrivateVar(root,'market','MARKET_POLICY',policy),privateCheckStatus(root)];
}
/** Stage 6: FOOD_USER_AGENT in the existing private food copy. */
export function setFoodUserAgent(root,value){
 const problems=foodUserAgentProblems(value);
 if(problems.length)throw Error(problems.join('\n'));
 return [setPrivateVar(root,'food','FOOD_USER_AGENT',value),privateCheckStatus(root)];
}
function main(){
 const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),input=parseArgs(process.argv.slice(2));
 if(input.update==='--set-market-policy'){console.log(setMarketPolicy(root,input.value).join('\n'));return;}
 if(input.update==='--set-food-user-agent'){console.log(setFoodUserAgent(root,input.value).join('\n'));return;}
 if(input.recoveryAdmin){console.log(['Wrote the recovery admin config (0600, ignored by git, never deployed):',makeAdminConfig(root),'Next: `node scripts/run11/activation-check.mjs --admin`, then docs/run11/OWNER_RECOVERY_ADMIN.md.'].join('\n'));return;}
 const lines=makePrivateConfigs(root,input);
 console.log(['Wrote six private configs (0600, ignored by git):',...lines,'Next: review them, then `node scripts/run11/activation-check.mjs --private`. Supply secrets only after Stage 7 approval.'].join('\n'));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))try{main();}catch(error){console.error(error.message);process.exitCode=1;}
