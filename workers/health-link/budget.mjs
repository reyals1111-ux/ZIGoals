import {boundedJSON,response} from '../push-reminders/verify.mjs';
import {BREAKER,breakerAdmit,breakerSettle,closedBreaker,dayOf,positive} from '../zigi-relay/budget.mjs';
/**
 * The health-link Worker's budgets (Session W Part 8), in the relay's style: one SQLite Durable Object holds every count,
 * so they are serialized in one place. Per account, provider and UTC day: requests; per provider and UTC day: requests;
 * and one circuit breaker per provider over its failures (network, time-outs, 5xx, 429), with the relay's policy. The
 * providers' own limits are per application (Strava: 200 requests in 15 minutes for the whole app), so the global count
 * protects every person's links at once. It holds counts and account ids only: never a token or a record.
 * @typedef {{HEALTH_LINK_DAILY_REQUESTS?:string,HEALTH_LINK_GLOBAL_DAILY_REQUESTS?:string,ISOLATED_FIXTURE?:string}} BudgetEnv
 * @typedef {import('../zigi-relay/budget.mjs').Breaker} Breaker
 */
/** @param {BudgetEnv} env */
export function linkPolicy(env){const account=positive(env.HEALTH_LINK_DAILY_REQUESTS),global=positive(env.HEALTH_LINK_GLOBAL_DAILY_REQUESTS);return account&&global&&account<=global?{account,global}:null;}
const SCHEMA=[
 'CREATE TABLE IF NOT EXISTS accounts (day TEXT NOT NULL, account TEXT NOT NULL, provider TEXT NOT NULL, requests INTEGER NOT NULL, PRIMARY KEY (day, account, provider))',
 'CREATE TABLE IF NOT EXISTS totals (day TEXT NOT NULL, provider TEXT NOT NULL, requests INTEGER NOT NULL, PRIMARY KEY (day, provider))',
 'CREATE TABLE IF NOT EXISTS breakers (provider TEXT PRIMARY KEY, state TEXT NOT NULL)',
];
const ID=/^[0-9a-f-]{36}$/,PROVIDER=/^(oura|withings|polar|strava)$/;
/** @param {unknown} b @returns {b is Breaker} */
const validBreaker=b=>!!b&&typeof b==='object'&&['closed','open','half-open'].includes(/** @type {Breaker} */(b).phase)&&Array.isArray(/** @type {Breaker} */(b).failures);
export class LinkBudget{
 /** @param {DurableObjectState} state @param {BudgetEnv} env */
 constructor(state,env){this.state=state;this.env=env;this.sql=state.storage.sql;/** @type {number|null} */this.fixtureNow=null;for(const s of SCHEMA)this.sql.exec(s);}
 now(){return this.env.ISOLATED_FIXTURE==='true'&&this.fixtureNow!==null?this.fixtureNow:Date.now();}
 /** @param {string} provider @returns {Breaker} */
 breaker(provider){const row=this.sql.exec('SELECT state FROM breakers WHERE provider = ?',provider).toArray()[0];try{const b=row?JSON.parse(String(row.state)):null;return validBreaker(b)?b:closedBreaker();}catch{return closedBreaker();}}
 /** @param {string} provider @param {Breaker} b */
 save(provider,b){this.sql.exec('INSERT INTO breakers (provider, state) VALUES (?, ?) ON CONFLICT(provider) DO UPDATE SET state = excluded.state',provider,JSON.stringify(b));}
 /** @param {Request} request */
 async fetch(request){
  const path=new URL(request.url).pathname;
  let body;try{body=await boundedJSON(request,1024);}catch{return response({error:'INVALID_BUDGET_REQUEST'},400);}
  if(path==='/fixture'){if(this.env.ISOLATED_FIXTURE!=='true')return response({error:'NOT_FOUND'},404);this.fixtureNow=Number.isSafeInteger(body?.now)?body.now:null;return response({now:this.now()});}
  const policy=linkPolicy(this.env);if(!policy)return response({error:'HEALTH_LINK_CONFIGURATION_REQUIRED'},503);
  const provider=typeof body?.provider==='string'&&PROVIDER.test(body.provider)?body.provider:null;
  if(!provider)return response({error:'INVALID_BUDGET_REQUEST'},400);
  if(path==='/reserve'){const account=typeof body.account==='string'&&ID.test(body.account)?body.account.toLowerCase():null;return account?this.reserve(policy,account,provider):response({error:'INVALID_BUDGET_REQUEST'},400);}
  if(path==='/settle'&&['ok','failure','neutral'].includes(body.outcome)){const now=this.now();this.state.storage.transactionSync(()=>this.save(provider,breakerSettle(this.breaker(provider),BREAKER,body.outcome,now)));return response({ok:true});}
  return response({error:'NOT_FOUND'},404);
 }
 /** @param {{account:number,global:number}} policy @param {string} account @param {string} provider */
 reserve(policy,account,provider){
  const now=this.now(),day=dayOf(now),yesterday=dayOf(now-86_400_000);
  return this.state.storage.transactionSync(()=>{
   this.sql.exec('DELETE FROM accounts WHERE day < ?',yesterday);this.sql.exec('DELETE FROM totals WHERE day < ?',yesterday);
   const gate=breakerAdmit(this.breaker(provider),now);
   if(!gate.ok)return response({error:'PROVIDER_PAUSED',retryAfterSeconds:Math.max(1,Math.ceil((gate.breaker.retryAt-now)/1000))},503);
   const mine=Number(this.sql.exec('SELECT requests FROM accounts WHERE day = ? AND account = ? AND provider = ?',day,account,provider).toArray()[0]?.requests??0);
   const all=Number(this.sql.exec('SELECT requests FROM totals WHERE day = ? AND provider = ?',day,provider).toArray()[0]?.requests??0);
   if(mine+1>policy.account)return response({error:'ACCOUNT_DAILY_REQUESTS'},429);
   if(all+1>policy.global)return response({error:'GLOBAL_DAILY_REQUESTS'},429);
   this.sql.exec('INSERT INTO accounts (day, account, provider, requests) VALUES (?, ?, ?, 1) ON CONFLICT(day, account, provider) DO UPDATE SET requests = requests + 1',day,account,provider);
   this.sql.exec('INSERT INTO totals (day, provider, requests) VALUES (?, ?, 1) ON CONFLICT(day, provider) DO UPDATE SET requests = requests + 1',day,provider);
   this.save(provider,gate.breaker);
   return response({ok:true,remaining:policy.account-mine-1});
  });
 }
}
