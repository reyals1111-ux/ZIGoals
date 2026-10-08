import {boundedJSON,response} from '../push-reminders/verify.mjs';
/**
 * The relay's budgets (Session V Part 17, ADR-014), in the market coordinator's style: a request is reserved before the
 * provider is called and settled after it. One SQLite Durable Object holds every count for the whole relay, so they are
 * serialized in one place:
 * - per account and UTC day: requests and tokens; for the whole relay and UTC day: tokens;
 * - tokens are reserved up front (the input estimate, four characters a token or one per non-ASCII character, plus the
 *   output cap) and reconciled from
 *   the usage the provider's stream reports; a reply that ends without usage keeps its reservation;
 * - a circuit breaker over provider failures (network, time-outs, 5xx, 429): open after `threshold` failures within
 *   `windowMs`, one probe after the cool-down, the cool-down doubling up to `maxCooldownMs` while probes fail.
 * It holds counts and account ids only: never a message, a reply, a model's words or an address.
 * @typedef {{accountRequests:number,accountTokens:number,globalTokens:number}} DailyPolicy
 * @typedef {{threshold:number,windowMs:number,cooldownMs:number,maxCooldownMs:number}} BreakerPolicy
 * @typedef {{phase:'closed'|'open'|'half-open',failures:number[],retryAt:number,trips:number,probe:boolean}} Breaker
 * @typedef {'ok'|'failure'|'neutral'} Outcome
 * @typedef {{ZIGI_DAILY_REQUESTS?:string,ZIGI_DAILY_TOKENS?:string,ZIGI_GLOBAL_DAILY_TOKENS?:string,ISOLATED_FIXTURE?:string}} BudgetEnv
 */
export const BREAKER=/** @type {BreakerPolicy} */({threshold:5,windowMs:60_000,cooldownMs:30_000,maxCooldownMs:600_000});
/** The UTC day a count belongs to. @param {number} now */
export const dayOf=now=>new Date(now).toISOString().slice(0,10);
/** Tokens to reserve: the input at four characters a token (rounded up) plus the output cap. @param {number} inputChars @param {number} maxOutput */
export const reserveFor=(inputChars,maxOutput)=>Math.ceil(inputChars/4)+maxOutput;
/** Input tokens estimated from the text sent: four characters a token, but at least one for every character outside ASCII
 *  (Chinese, Japanese or Korean text runs about a token a character or more, so a quarter would count it four times too
 *  low; Session X P2.7). ASCII text is estimated exactly as `reserveFor` does. @param {string} text */
export function inputEstimate(text){let wide=0;for(let i=0;i<text.length;i++)if(text.charCodeAt(i)>127)wide++;return Math.max(Math.ceil(text.length/4),wide);}
/** A positive whole number from a variable, or null. @param {string|undefined} value */
export function positive(value){const n=Number(value);return /^\d{1,12}$/.test(value??'')&&Number.isSafeInteger(n)&&n>0?n:null;}
/** @param {BudgetEnv} env @returns {DailyPolicy|null} */
export function dailyPolicy(env){
 const accountRequests=positive(env.ZIGI_DAILY_REQUESTS),accountTokens=positive(env.ZIGI_DAILY_TOKENS),globalTokens=positive(env.ZIGI_GLOBAL_DAILY_TOKENS);
 return accountRequests&&accountTokens&&globalTokens?{accountRequests,accountTokens,globalTokens}:null;
}
/**
 * Why a request may not start today, or null. @param {DailyPolicy} policy @param {{requests:number,tokens:number}} account
 * @param {{tokens:number}} total @param {number} cost
 */
export function admitDaily(policy,account,total,cost){
 if(account.requests+1>policy.accountRequests)return 'ACCOUNT_DAILY_REQUESTS';
 if(account.tokens+cost>policy.accountTokens)return 'ACCOUNT_DAILY_TOKENS';
 if(total.tokens+cost>policy.globalTokens)return 'GLOBAL_DAILY_TOKENS';
 return null;
}
/** What is left today for one account (the relay's own total can be the smaller). @param {DailyPolicy} policy @param {{requests:number,tokens:number}} account @param {{tokens:number}} total */
export const remainingFor=(policy,account,total)=>({requests:Math.max(0,policy.accountRequests-account.requests),tokens:Math.max(0,Math.min(policy.accountTokens-account.tokens,policy.globalTokens-total.tokens))});
/** @returns {Breaker} */
export const closedBreaker=()=>({phase:'closed',failures:[],retryAt:0,trips:0,probe:false});
/** Whether the provider may be called now; half open lets one probe through at a time. @param {Breaker} b @param {number} now */
export function breakerAdmit(b,now){
 if(b.phase==='open')return now<b.retryAt?{ok:false,breaker:b}:{ok:true,breaker:/** @type {Breaker} */({...b,phase:'half-open',probe:true})};
 if(b.phase==='half-open')return b.probe?{ok:false,breaker:b}:{ok:true,breaker:{...b,probe:true}};
 return {ok:true,breaker:b};
}
/** @param {Breaker} b @param {BreakerPolicy} p @param {number} now @returns {Breaker} */
function trip(b,p,now){const trips=b.trips+1;return {phase:'open',failures:[],retryAt:now+Math.min(p.cooldownMs*2**(trips-1),p.maxCooldownMs),trips,probe:false};}
/**
 * The breaker after a call: a success closes it; a failure counts in the window (or, as the probe, opens it again for a
 * longer cool-down); a neutral end (a request the provider refused as invalid, a reply the person stopped) only frees
 * the probe. @param {Breaker} b @param {BreakerPolicy} p @param {Outcome} outcome @param {number} now @returns {Breaker}
 */
export function breakerSettle(b,p,outcome,now){
 if(outcome==='ok')return b.phase==='closed'?{...b,failures:b.failures.filter(t=>t>now-p.windowMs)}:closedBreaker();
 if(outcome==='neutral')return b.phase==='half-open'?{...b,probe:false}:b;
 if(b.phase==='half-open')return trip(b,p,now);
 if(b.phase==='open')return b;
 const failures=[...b.failures.filter(t=>t>now-p.windowMs),now];
 return failures.length>=p.threshold?trip(b,p,now):{...b,failures};
}
const SCHEMA=[
 'CREATE TABLE IF NOT EXISTS accounts (day TEXT NOT NULL, account TEXT NOT NULL, requests INTEGER NOT NULL, tokens INTEGER NOT NULL, PRIMARY KEY (day, account))',
 'CREATE TABLE IF NOT EXISTS totals (day TEXT PRIMARY KEY, requests INTEGER NOT NULL, tokens INTEGER NOT NULL)',
 'CREATE TABLE IF NOT EXISTS reservations (id TEXT PRIMARY KEY, day TEXT NOT NULL, account TEXT NOT NULL, tokens INTEGER NOT NULL, at INTEGER NOT NULL)',
 'CREATE TABLE IF NOT EXISTS breaker (id INTEGER PRIMARY KEY CHECK (id = 1), state TEXT NOT NULL)',
];
const ID=/^[0-9a-f-]{36}$/;
/** @param {unknown} b @returns {b is Breaker} */
const validBreaker=b=>!!b&&typeof b==='object'&&['closed','open','half-open'].includes(/** @type {Breaker} */(b).phase)&&Array.isArray(/** @type {Breaker} */(b).failures);
export class RelayBudget{
 /** @param {DurableObjectState} state @param {BudgetEnv} env */
 constructor(state,env){
  this.state=state;this.env=env;this.sql=state.storage.sql;
  /** @type {number|null} */this.fixtureNow=null;
  for(const statement of SCHEMA)this.sql.exec(statement);
 }
 now(){return this.env.ISOLATED_FIXTURE==='true'&&this.fixtureNow!==null?this.fixtureNow:Date.now();}
 /** @returns {Breaker} */
 breaker(){const row=this.sql.exec('SELECT state FROM breaker WHERE id = 1').toArray()[0];try{const b=row?JSON.parse(String(row.state)):null;return validBreaker(b)?b:closedBreaker();}catch{return closedBreaker();}}
 /** @param {Breaker} b */
 saveBreaker(b){this.sql.exec('INSERT INTO breaker (id, state) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET state = excluded.state',JSON.stringify(b));}
 /** @param {string} day @param {string} account */
 account(day,account){const row=this.sql.exec('SELECT requests, tokens FROM accounts WHERE day = ? AND account = ?',day,account).toArray()[0];return {requests:Number(row?.requests??0),tokens:Number(row?.tokens??0)};}
 /** @param {string} day */
 total(day){const row=this.sql.exec('SELECT requests, tokens FROM totals WHERE day = ?',day).toArray()[0];return {requests:Number(row?.requests??0),tokens:Number(row?.tokens??0)};}
 /** @param {Request} request */
 async fetch(request){
  const path=new URL(request.url).pathname;
  let body;try{body=await boundedJSON(request,4096);}catch{return response({error:'INVALID_BUDGET_REQUEST'},400);}
  if(path==='/fixture'){if(this.env.ISOLATED_FIXTURE!=='true')return response({error:'NOT_FOUND'},404);this.fixtureNow=Number.isSafeInteger(body?.now)?body.now:null;return response({now:this.now(),breaker:this.breaker()});}
  const policy=dailyPolicy(this.env);if(!policy)return response({error:'HOSTED_CONFIGURATION_REQUIRED'},503);
  const account=typeof body?.account==='string'&&ID.test(body.account)?body.account.toLowerCase():null;
  switch(path){
   case '/reserve':return account&&typeof body.id==='string'&&ID.test(body.id)&&Number.isSafeInteger(body.tokens)&&body.tokens>0?this.reserve(policy,account,body.id,body.tokens):response({error:'INVALID_BUDGET_REQUEST'},400);
   case '/settle':return typeof body?.id==='string'&&ID.test(body.id)&&(body.used===null||Number.isSafeInteger(body.used)&&body.used>=0)&&['ok','failure','neutral'].includes(body.outcome)?this.settle(body.id,body.used,body.outcome):response({error:'INVALID_BUDGET_REQUEST'},400);
   case '/remaining':{if(!account)return response({error:'INVALID_BUDGET_REQUEST'},400);const day=dayOf(this.now());return response(remainingFor(policy,this.account(day,account),this.total(day)));}
   default:return response({error:'NOT_FOUND'},404);
  }
 }
 /** @param {DailyPolicy} policy @param {string} account @param {string} id @param {number} tokens */
 reserve(policy,account,id,tokens){
  const now=this.now(),day=dayOf(now);
  return this.state.storage.transactionSync(()=>{
   // Counts of earlier days are kept one day, then go.
   const yesterday=dayOf(now-86_400_000);
   this.sql.exec('DELETE FROM accounts WHERE day < ?',yesterday);this.sql.exec('DELETE FROM totals WHERE day < ?',yesterday);this.sql.exec('DELETE FROM reservations WHERE day < ?',yesterday);
   const gate=breakerAdmit(this.breaker(),now);
   if(!gate.ok)return response({error:'UPSTREAM_PAUSED',retryAfterSeconds:Math.max(1,Math.ceil((gate.breaker.retryAt-now)/1000))},503);
   const mine=this.account(day,account),all=this.total(day),reason=admitDaily(policy,mine,all,tokens);
   if(reason)return response({error:reason,remaining:remainingFor(policy,mine,all)},429);
   this.sql.exec('INSERT INTO accounts (day, account, requests, tokens) VALUES (?, ?, 1, ?) ON CONFLICT(day, account) DO UPDATE SET requests = requests + 1, tokens = tokens + excluded.tokens',day,account,tokens);
   this.sql.exec('INSERT INTO totals (day, requests, tokens) VALUES (?, 1, ?) ON CONFLICT(day) DO UPDATE SET requests = requests + 1, tokens = tokens + excluded.tokens',day,tokens);
   this.sql.exec('INSERT INTO reservations (id, day, account, tokens, at) VALUES (?, ?, ?, ?, ?)',id,day,account,tokens,now);
   this.saveBreaker(gate.breaker);
   return response({ok:true,remaining:remainingFor(policy,{requests:mine.requests+1,tokens:mine.tokens+tokens},{tokens:all.tokens+tokens})});
  });
 }
 /** @param {string} id @param {number|null} used @param {Outcome} outcome */
 settle(id,used,outcome){
  const now=this.now();
  return this.state.storage.transactionSync(()=>{
   const row=this.sql.exec('SELECT day, account, tokens FROM reservations WHERE id = ?',id).toArray()[0];
   if(!row)return response({error:'RESERVATION_UNKNOWN'},404);
   // The provider's own count replaces the reservation; with none reported, the reservation stands.
   const delta=used===null?0:used-Number(row.tokens);
   if(delta){
    this.sql.exec('UPDATE accounts SET tokens = MAX(0, tokens + ?) WHERE day = ? AND account = ?',delta,row.day,row.account);
    this.sql.exec('UPDATE totals SET tokens = MAX(0, tokens + ?) WHERE day = ?',delta,row.day);
   }
   this.sql.exec('DELETE FROM reservations WHERE id = ?',id);
   this.saveBreaker(breakerSettle(this.breaker(),BREAKER,outcome,now));
   return response({ok:true});
  });
 }
}
