#!/usr/bin/env node
// Stage 6: turn the owner's confirmed CoinGecko plan figures into the strict MARKET_POLICY value that
// the market coordinator accepts (apps/web/lib/server/durable-market-account.ts configSchema, plus the
// budget rule in market-budget-policy.ts). It reads a filled copy of market-policy.template.json that
// must be inside the checkout, mode 0600 and ignored by git, and writes the policy to another ignored
// 0600 file for `make-private-configs.mjs --market-policy-file`. It refuses to overwrite, rejects
// missing, inconsistent or synthetic figures, and prints only field names, never values.
import {existsSync,readFileSync,writeFileSync,chmodSync,unlinkSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {privateFileProblems} from './activation-check.mjs';

export const OWNER_SCHEMA='zigoals-market-policy-owner/1';
const OPERATIONS=['catalog','history','insights','token','rwa'];
const DAY=86400000;
// Provider limit pairs used only by repository test fixtures; a real plan never matches them exactly.
export const FIXTURE_LIMITS=[[10,100],[20,100],[100,1000],[3,80]];
const FIXTURE_KEYS=/^(LOCAL_TEST_NOW|ISOLATED_FIXTURE|status|unresolved_do_not_default|activation_prerequisites|proposed_policy)$/;
const USAGE='Usage: node scripts/run11/market-policy.mjs --owner-file <filled template> --out <policy file>';

export function parseArgs(argv){
 const values={};
 for(let i=0;i<argv.length;i+=2){if(!['--owner-file','--out'].includes(argv[i])||argv[i+1]===undefined||argv[i] in values)throw Error(USAGE);values[argv[i]]=argv[i+1];}
 if(!values['--owner-file']||!values['--out'])throw Error(USAGE);
 return {ownerFile:values['--owner-file'],out:values['--out']};
}
const isInt=(n,min=1)=>Number.isSafeInteger(n)&&n>=min;
function keys(value,found=[]){if(value&&typeof value==='object')for(const [k,v]of Object.entries(value)){found.push(k);keys(v,found);}return found;}

/** Returns {errors} or {errors:[],policy,enabled,disabled}. Messages name fields only, never figures. */
export function validateOwnerPolicy(owner,{now=Date.now()}={}){
 const errors=[],need=(ok,message)=>{if(!ok)errors.push(message);return ok;};
 if(!owner||typeof owner!=='object'||Array.isArray(owner)||owner.schema!==OWNER_SCHEMA)return {errors:[`The owner file must be a filled copy of scripts/run11/market-policy.template.json (schema ${OWNER_SCHEMA}).`]};
 if(keys(owner).some(k=>FIXTURE_KEYS.test(k)))errors.push('The owner file contains fixture or proposal fields; start again from market-policy.template.json.');
 const p=owner.provider??{},o=owner.operating??{},c=owner.coordinator??{};
 // Provider figures, as confirmed in the provider dashboard.
 const checked=typeof p.checkedOn==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(p.checkedOn)?Date.parse(p.checkedOn+'T00:00:00Z'):NaN;
 need(Number.isFinite(checked)&&checked<=now&&now-checked<8*DAY,'provider.checkedOn must be the date (YYYY-MM-DD, UTC) you read these figures, within the last 7 days.');
 need(isInt(p.perMinuteLimit),'provider.perMinuteLimit must be a positive integer.');
 need(isInt(p.monthlyCredits),'provider.monthlyCredits must be a positive integer.');
 need(isInt(p.creditsUsedThisPeriod,0)&&(!isInt(p.monthlyCredits)||p.creditsUsedThisPeriod<p.monthlyCredits),'provider.creditsUsedThisPeriod must be an integer from 0 up to, but not including, provider.monthlyCredits.');
 need(p.exclusiveAccountUse===true,'provider.exclusiveAccountUse must be true: only this coordinator may spend this plan\'s credits.');
 if(FIXTURE_LIMITS.some(([m,n])=>p.perMinuteLimit===m&&p.monthlyCredits===n))errors.push('provider.perMinuteLimit and provider.monthlyCredits match a repository test fixture; use the figures from the provider dashboard.');
 // Accounting period: exactly one confirmed source.
 const r=p.reset??{};let period;
 if(r.kind==='utc-calendar-month'){if(need([r.windowId,r.windowStart,r.windowEnd].every(v=>v===null||v===undefined),'provider.reset window fields must be null for utc-calendar-month.'))period={calendar:{timeZone:'UTC',confirmed:true}};}
 else if(r.kind==='exact-window'){
  const start=typeof r.windowStart==='string'&&r.windowStart.endsWith('Z')?Date.parse(r.windowStart):NaN,end=typeof r.windowEnd==='string'&&r.windowEnd.endsWith('Z')?Date.parse(r.windowEnd):NaN;
  need(typeof r.windowId==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(r.windowId)&&!/fixture|synthetic|test|queue/i.test(r.windowId),'provider.reset.windowId must be a short label (letters, digits, _ or -) naming the real period.');
  if(need(Number.isFinite(start)&&Number.isFinite(end),'provider.reset.windowStart and windowEnd must be UTC ISO timestamps ending in Z.')&&need(end-start>=27*DAY&&end-start<=32*DAY,'provider.reset window must be one billing month (27 to 32 days).')&&need(start<=now&&now<end,'provider.reset window must contain the current time; generate a new policy for the next period.'))period={month:{id:r.windowId,start,end}};
 }else errors.push('provider.reset.kind must be utc-calendar-month or exact-window.');
 // Endpoint costs: quote is required; every other read is a cost or explicitly "disabled" (fails closed).
 const costs=p.endpointCosts??{},operationCosts={},enabled=['quote'],disabled=[];
 need(isInt(costs.quote),'provider.endpointCosts.quote must be a positive integer.');
 for(const op of OPERATIONS){const v=costs[op];if(v==='disabled')disabled.push(op);else if(need(isInt(v),`provider.endpointCosts.${op} must be a positive integer or "disabled".`)){operationCosts[op]=v;enabled.push(op);}}
 if(Object.keys(costs).some(k=>k!=='quote'&&!OPERATIONS.includes(k)))errors.push('provider.endpointCosts has an unknown operation.');
 // Operating choices, checked with the coordinator's budget rule and against the credits left.
 const capacity=(name,min=0)=>need(isInt(o[name]?.minute,min)&&isInt(o[name]?.monthly,min)&&Object.keys(o[name]).length===2,`operating.${name} must be {minute, monthly} integers.`);
 const caps=['operating','monitoringReserve','monitoringMaximum','optionalCeiling'].map((n,i)=>capacity(n,i?0:1)).every(Boolean);
 for(const n of ['concurrent','queueLimit','reservationMs','ownershipMs'])need(isInt(o[n]),`operating.${n} must be a positive integer.`);
 if(caps&&isInt(p.perMinuteLimit)&&isInt(p.monthlyCredits))for(const [k,limit]of [['minute',p.perMinuteLimit],['monthly',p.monthlyCredits]]){
  const ceiling=o.operating[k],reserve=o.monitoringReserve[k],max=o.monitoringMaximum[k],optional=o.optionalCeiling[k];
  need(ceiling<=limit,`operating.operating.${k} must not exceed the provider ${k} limit.`);
  need(reserve<=max,`operating.monitoringReserve.${k} must not exceed operating.monitoringMaximum.${k}.`);
  need(max<ceiling,`operating.monitoringMaximum.${k} must be below operating.operating.${k}.`);
  need(optional<=ceiling-reserve,`operating.optionalCeiling.${k} must not exceed operating.operating.${k} minus operating.monitoringReserve.${k}.`);
 }
 if(caps&&isInt(p.monthlyCredits)&&isInt(p.creditsUsedThisPeriod,0))need(o.operating.monthly<=p.monthlyCredits-p.creditsUsedThisPeriod,'operating.operating.monthly exceeds the credits left this period (provider.monthlyCredits minus provider.creditsUsedThisPeriod).');
 // Coordinator bounds, as the schema enforces them.
 need(isInt(c.leaseMs)&&c.leaseMs<=60000,'coordinator.leaseMs must be 1 to 60000.');
 need(isInt(c.maxAttempts)&&c.maxAttempts<=128,'coordinator.maxAttempts must be 1 to 128.');
 need(isInt(c.maxWorks)&&c.maxWorks<=64,'coordinator.maxWorks must be 1 to 64.');
 need(isInt(c.maxCacheBytes)&&c.maxCacheBytes<=32*1024*1024,'coordinator.maxCacheBytes must be 1 to 33554432.');
 need(isInt(c.retryRetentionMs)&&c.retryRetentionMs>=60000&&c.retryRetentionMs<=DAY,'coordinator.retryRetentionMs must be 60000 to 86400000.');
 const b=c.breaker??{};
 need(isInt(b.threshold)&&b.threshold<=100&&isInt(b.windowMs)&&b.windowMs<=3600000&&isInt(b.cooldownMs)&&isInt(b.maxCooldownMs)&&b.maxCooldownMs>=b.cooldownMs&&isInt(b.halfOpenProbes)&&b.halfOpenProbes<=8&&Object.keys(b).length===5,'coordinator.breaker must hold threshold (≤100), windowMs (≤3600000), cooldownMs, maxCooldownMs (≥cooldownMs) and halfOpenProbes (≤8).');
 const t=c.accountThrottle??{};
 need(isInt(t.distinctEndpoints,2)&&t.distinctEndpoints<=8&&isInt(t.windowMs)&&t.windowMs<=60000&&Object.keys(t).length===2,'coordinator.accountThrottle must hold distinctEndpoints (2 to 8) and windowMs (≤60000).');
 if(errors.length)return {errors};
 const pick=(n)=>({minute:o[n].minute,monthly:o[n].monthly});
 const policy={policy:{providerMinuteLimit:p.perMinuteLimit,providerMonthlyLimit:p.monthlyCredits,operating:pick('operating'),monitoringReserve:pick('monitoringReserve'),monitoringMaximum:pick('monitoringMaximum'),optionalCeiling:pick('optionalCeiling'),concurrent:o.concurrent,queueLimit:o.queueLimit,reservationMs:o.reservationMs,ownershipMs:o.ownershipMs},...period,quoteCost:costs.quote,...(Object.keys(operationCosts).length?{operationCosts}:{}),leaseMs:c.leaseMs,maxAttempts:c.maxAttempts,maxWorks:c.maxWorks,maxCacheBytes:c.maxCacheBytes,retryRetentionMs:c.retryRetentionMs,breaker:{threshold:b.threshold,windowMs:b.windowMs,cooldownMs:b.cooldownMs,maxCooldownMs:b.maxCooldownMs,halfOpenProbes:b.halfOpenProbes},accountThrottle:{distinctEndpoints:t.distinctEndpoints,windowMs:t.windowMs}};
 return {errors:[],policy,enabled,disabled};
}

/** Validates the owner file and writes the policy. Returns summary lines without figures. */
export function writeMarketPolicy(root,{ownerFile,out},{now=Date.now()}={}){
 const ownerProblems=privateFileProblems(root,ownerFile);
 if(ownerProblems.length)throw Error(`${ownerFile}: ${ownerProblems.join(', ')}. Keep the filled owner file inside the checkout, mode 0600 and ignored by git (name it *.market-policy.owner.json).`);
 let owner;try{owner=JSON.parse(readFileSync(resolve(root,ownerFile),'utf8'));}catch{throw Error(`${ownerFile} is not valid JSON.`);}
 const result=validateOwnerPolicy(owner,{now});
 if(result.errors.length)throw Error(['Owner policy rejected; nothing written:',...result.errors.map(e=>'- '+e)].join('\n'));
 const target=resolve(root,out);
 if(existsSync(target))throw Error(`Refusing to overwrite ${out}.`);
 if(!target.startsWith(resolve(root)+'/')||spawnSync('git',['check-ignore','-q',target],{cwd:root}).status!==0)throw Error(`${out} must be inside the checkout and ignored by git (name it *.market-policy.private.json); nothing written.`);
 writeFileSync(target,JSON.stringify(result.policy)+'\n',{flag:'wx',mode:0o600});chmodSync(target,0o600);
 const problems=privateFileProblems(root,out);
 if(problems.length){unlinkSync(target);throw Error(`${out}: ${problems.join(', ')}; removed.`);}
 return [`Wrote MARKET_POLICY to ${out} (0600, ignored by git; values not printed).`,`Accounting period: ${result.policy.calendar?'confirmed UTC calendar month':'exact window '+result.policy.month.id+' (generate a new policy before it ends; the coordinator fails closed after it)'}.`,`Enabled operations: ${result.enabled.join(', ')}.`,...(result.disabled.length?[`Disabled, fail closed: ${result.disabled.join(', ')}.`]:[]),`Next: node scripts/run11/make-private-configs.mjs … --market-policy-file ${out}`];
}
function main(){
 const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
 console.log(writeMarketPolicy(root,parseArgs(process.argv.slice(2))).join('\n'));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))try{main();}catch(error){console.error(error.message);process.exitCode=1;}
