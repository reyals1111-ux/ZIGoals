import {boundedJSON,response} from '../push-reminders/verify.mjs';
import {micros} from './pricing.mjs';
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
 *
 * Session Z-Cloud Part 6 (ADR-019 C40): on top, per account, messages per UTC month and money per UTC day and month, and
 * money per UTC day for the whole relay, each only when its variable is set (ZIGI_MONTHLY_REQUESTS, ZIGI_DAILY_USD,
 * ZIGI_MONTHLY_USD, ZIGI_GLOBAL_DAILY_USD). Money is counted in micro-dollars: reserved as the dearest the reply could
 * be (the prompt estimate at the cache-write price plus the output cap) and settled from the reply's own usage counts,
 * cache writes and reads included, priced with the app's table (pricing.mjs).
 * @typedef {{accountRequests:number,accountTokens:number,globalTokens:number,accountMonthlyRequests?:number|null,accountDailyMicros?:number|null,accountMonthlyMicros?:number|null,globalDailyMicros?:number|null}} DailyPolicy
 * @typedef {{threshold:number,windowMs:number,cooldownMs:number,maxCooldownMs:number}} BreakerPolicy
 * @typedef {{phase:'closed'|'open'|'half-open',failures:number[],retryAt:number,trips:number,probe:boolean}} Breaker
 * @typedef {'ok'|'failure'|'neutral'} Outcome
 * @typedef {{ZIGI_DAILY_REQUESTS?:string,ZIGI_DAILY_TOKENS?:string,ZIGI_GLOBAL_DAILY_TOKENS?:string,ZIGI_MONTHLY_REQUESTS?:string,ZIGI_DAILY_USD?:string,ZIGI_MONTHLY_USD?:string,ZIGI_GLOBAL_DAILY_USD?:string,ISOLATED_FIXTURE?:string}} BudgetEnv
 */
export const BREAKER=/** @type {BreakerPolicy} */({threshold:5,windowMs:60_000,cooldownMs:30_000,maxCooldownMs:600_000});
/** The UTC day a count belongs to. @param {number} now */
export const dayOf=now=>new Date(now).toISOString().slice(0,10);
/** The UTC month a count belongs to. @param {number} now */
export const monthOf=now=>new Date(now).toISOString().slice(0,7);
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
 if(!accountRequests||!accountTokens||!globalTokens)return null;
 /** @type {DailyPolicy} */const policy={accountRequests,accountTokens,globalTokens};
 // Session Z-Cloud Part 6: the optional budgets, only when set (relay.mjs `configured` refuses a value that is not one).
 const extra=/** @type {const} */([['accountMonthlyRequests',positive(env.ZIGI_MONTHLY_REQUESTS)],['accountDailyMicros',micros(env.ZIGI_DAILY_USD)],['accountMonthlyMicros',micros(env.ZIGI_MONTHLY_USD)],['globalDailyMicros',micros(env.ZIGI_GLOBAL_DAILY_USD)]]);
 for(const [key,value]of extra)if(value)policy[key]=value;
 return policy;
}
/**
 * Why a request may not start today, or null. @param {DailyPolicy} policy @param {{requests:number,tokens:number,micros?:number}} account
 * @param {{tokens:number,micros?:number}} total @param {number} cost @param {number} [money] micro-dollars reserved
 * @param {{requests:number,micros:number}} [month] this account's month so far
 */
export function admitDaily(policy,account,total,cost,money=0,month={requests:0,micros:0}){
 if(account.requests+1>policy.accountRequests)return 'ACCOUNT_DAILY_REQUESTS';
 if(policy.accountMonthlyRequests&&month.requests+1>policy.accountMonthlyRequests)return 'ACCOUNT_MONTHLY_REQUESTS';
 if(account.tokens+cost>policy.accountTokens)return 'ACCOUNT_DAILY_TOKENS';
 if(policy.accountDailyMicros&&(account.micros??0)+money>policy.accountDailyMicros)return 'ACCOUNT_DAILY_USD';
 if(policy.accountMonthlyMicros&&month.micros+money>policy.accountMonthlyMicros)return 'ACCOUNT_MONTHLY_USD';
 if(total.tokens+cost>policy.globalTokens)return 'GLOBAL_DAILY_TOKENS';
 if(policy.globalDailyMicros&&(total.micros??0)+money>policy.globalDailyMicros)return 'GLOBAL_DAILY_USD';
 return null;
}
const usd=(/** @type {number} */n)=>Math.max(0,n)/1e6;
/**
 * What is left for one account (the relay's own total can be the smaller): today's messages and tokens as before, and,
 * where those budgets are set, today's and this month's money (USD) and this month's messages.
 * @param {DailyPolicy} policy @param {{requests:number,tokens:number,micros?:number}} account @param {{tokens:number,micros?:number}} total
 * @param {{requests:number,micros:number}} [month]
 */
export function remainingFor(policy,account,total,month={requests:0,micros:0}){
 /** @type {Record<string,unknown>} */const left={requests:Math.max(0,policy.accountRequests-account.requests),tokens:Math.max(0,Math.min(policy.accountTokens-account.tokens,policy.globalTokens-total.tokens))};
 if(policy.accountDailyMicros||policy.globalDailyMicros)left.usd=usd(Math.min(policy.accountDailyMicros?policy.accountDailyMicros-(account.micros??0):Infinity,policy.globalDailyMicros?policy.globalDailyMicros-(total.micros??0):Infinity));
 if(policy.accountMonthlyRequests||policy.accountMonthlyMicros)left.month={...(policy.accountMonthlyRequests?{requests:Math.max(0,policy.accountMonthlyRequests-month.requests)}:{}),...(policy.accountMonthlyMicros?{usd:usd(policy.accountMonthlyMicros-month.micros)}:{})};
 return left;
}
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
 // Session Z-Cloud Part 6: this month's messages and money per account.
 'CREATE TABLE IF NOT EXISTS months (month TEXT NOT NULL, account TEXT NOT NULL, requests INTEGER NOT NULL, micros INTEGER NOT NULL, PRIMARY KEY (month, account))',
];
// Session Z-Cloud Part 6: money columns added to the tables an earlier relay made (each added once, defaulting to zero).
const COLUMNS=/** @type {const} */([['accounts','micros','INTEGER NOT NULL DEFAULT 0'],['totals','micros','INTEGER NOT NULL DEFAULT 0'],['reservations','micros','INTEGER NOT NULL DEFAULT 0'],['reservations','month',"TEXT NOT NULL DEFAULT ''"]]);
const ID=/^[0-9a-f-]{36}$/;
/** @param {unknown} b @returns {b is Breaker} */
const validBreaker=b=>!!b&&typeof b==='object'&&['closed','open','half-open'].includes(/** @type {Breaker} */(b).phase)&&Array.isArray(/** @type {Breaker} */(b).failures);
export class RelayBudget{
 /** @param {DurableObjectState} state @param {BudgetEnv} env */
 constructor(state,env){
  this.state=state;this.env=env;this.sql=state.storage.sql;
  /** @type {number|null} */this.fixtureNow=null;
  for(const statement of SCHEMA)this.sql.exec(statement);
  for(const [table,column,type]of COLUMNS)if(!this.sql.exec(`SELECT name FROM pragma_table_info('${table}') WHERE name = ?`,column).toArray().length)this.sql.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
 }
 now(){return this.env.ISOLATED_FIXTURE==='true'&&this.fixtureNow!==null?this.fixtureNow:Date.now();}
 /** @returns {Breaker} */
 breaker(){const row=this.sql.exec('SELECT state FROM breaker WHERE id = 1').toArray()[0];try{const b=row?JSON.parse(String(row.state)):null;return validBreaker(b)?b:closedBreaker();}catch{return closedBreaker();}}
 /** @param {Breaker} b */
 saveBreaker(b){this.sql.exec('INSERT INTO breaker (id, state) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET state = excluded.state',JSON.stringify(b));}
 /** @param {string} day @param {string} account */
 account(day,account){const row=this.sql.exec('SELECT requests, tokens, micros FROM accounts WHERE day = ? AND account = ?',day,account).toArray()[0];return {requests:Number(row?.requests??0),tokens:Number(row?.tokens??0),micros:Number(row?.micros??0)};}
 /** @param {string} day */
 total(day){const row=this.sql.exec('SELECT requests, tokens, micros FROM totals WHERE day = ?',day).toArray()[0];return {requests:Number(row?.requests??0),tokens:Number(row?.tokens??0),micros:Number(row?.micros??0)};}
 /** @param {string} month @param {string} account */
 month(month,account){const row=this.sql.exec('SELECT requests, micros FROM months WHERE month = ? AND account = ?',month,account).toArray()[0];return {requests:Number(row?.requests??0),micros:Number(row?.micros??0)};}
 /** @param {Request} request */
 async fetch(request){
  const path=new URL(request.url).pathname;
  let body;try{body=await boundedJSON(request,4096);}catch{return response({error:'INVALID_BUDGET_REQUEST'},400);}
  if(path==='/fixture'){if(this.env.ISOLATED_FIXTURE!=='true')return response({error:'NOT_FOUND'},404);this.fixtureNow=Number.isSafeInteger(body?.now)?body.now:null;return response({now:this.now(),breaker:this.breaker()});}
  const policy=dailyPolicy(this.env);if(!policy)return response({error:'HOSTED_CONFIGURATION_REQUIRED'},503);
  const account=typeof body?.account==='string'&&ID.test(body.account)?body.account.toLowerCase():null;
  switch(path){
   case '/reserve':return account&&typeof body.id==='string'&&ID.test(body.id)&&Number.isSafeInteger(body.tokens)&&body.tokens>0&&(body.micros===undefined||Number.isSafeInteger(body.micros)&&body.micros>=0)?this.reserve(policy,account,body.id,body.tokens,body.micros??0):response({error:'INVALID_BUDGET_REQUEST'},400);
   case '/settle':return typeof body?.id==='string'&&ID.test(body.id)&&(body.used===null||Number.isSafeInteger(body.used)&&body.used>=0)&&(body.micros===undefined||body.micros===null||Number.isSafeInteger(body.micros)&&body.micros>=0)&&['ok','failure','neutral'].includes(body.outcome)?this.settle(body.id,body.used,body.outcome,body.micros??null):response({error:'INVALID_BUDGET_REQUEST'},400);
   case '/remaining':{if(!account)return response({error:'INVALID_BUDGET_REQUEST'},400);const now=this.now(),day=dayOf(now);return response(remainingFor(policy,this.account(day,account),this.total(day),this.month(monthOf(now),account)));}
   default:return response({error:'NOT_FOUND'},404);
  }
 }
 /** @param {DailyPolicy} policy @param {string} account @param {string} id @param {number} tokens @param {number} [money] micro-dollars */
 reserve(policy,account,id,tokens,money=0){
  const now=this.now(),day=dayOf(now),month=monthOf(now);
  return this.state.storage.transactionSync(()=>{
   // Counts of earlier days are kept one day, then go.
   const yesterday=dayOf(now-86_400_000);
   this.sql.exec('DELETE FROM accounts WHERE day < ?',yesterday);this.sql.exec('DELETE FROM totals WHERE day < ?',yesterday);this.sql.exec('DELETE FROM reservations WHERE day < ?',yesterday);
   // Months: this one and the one before (a reply that began on the last day settles into the month it began in).
   this.sql.exec('DELETE FROM months WHERE month < ?',monthOf(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7))-2,1)));
   const gate=breakerAdmit(this.breaker(),now);
   if(!gate.ok)return response({error:'UPSTREAM_PAUSED',retryAfterSeconds:Math.max(1,Math.ceil((gate.breaker.retryAt-now)/1000))},503);
   const mine=this.account(day,account),all=this.total(day),thisMonth=this.month(month,account),reason=admitDaily(policy,mine,all,tokens,money,thisMonth);
   if(reason)return response({error:reason,remaining:remainingFor(policy,mine,all,thisMonth)},429);
   this.sql.exec('INSERT INTO accounts (day, account, requests, tokens, micros) VALUES (?, ?, 1, ?, ?) ON CONFLICT(day, account) DO UPDATE SET requests = requests + 1, tokens = tokens + excluded.tokens, micros = micros + excluded.micros',day,account,tokens,money);
   this.sql.exec('INSERT INTO totals (day, requests, tokens, micros) VALUES (?, 1, ?, ?) ON CONFLICT(day) DO UPDATE SET requests = requests + 1, tokens = tokens + excluded.tokens, micros = micros + excluded.micros',day,tokens,money);
   this.sql.exec('INSERT INTO months (month, account, requests, micros) VALUES (?, ?, 1, ?) ON CONFLICT(month, account) DO UPDATE SET requests = requests + 1, micros = micros + excluded.micros',month,account,money);
   this.sql.exec('INSERT INTO reservations (id, day, account, tokens, at, micros, month) VALUES (?, ?, ?, ?, ?, ?, ?)',id,day,account,tokens,now,money,month);
   this.saveBreaker(gate.breaker);
   return response({ok:true,remaining:remainingFor(policy,{requests:mine.requests+1,tokens:mine.tokens+tokens,micros:mine.micros+money},{tokens:all.tokens+tokens,micros:all.micros+money},{requests:thisMonth.requests+1,micros:thisMonth.micros+money})});
  });
 }
 /** @param {string} id @param {number|null} used @param {Outcome} outcome @param {number|null} [cost] the reply's micro-dollars, when known */
 settle(id,used,outcome,cost=null){
  const now=this.now();
  return this.state.storage.transactionSync(()=>{
   const row=this.sql.exec('SELECT day, account, tokens, micros, month FROM reservations WHERE id = ?',id).toArray()[0];
   if(!row)return response({error:'RESERVATION_UNKNOWN'},404);
   // The provider's own count replaces the reservation; with none reported, the reservation stands.
   const delta=used===null?0:used-Number(row.tokens);
   if(delta){
    this.sql.exec('UPDATE accounts SET tokens = MAX(0, tokens + ?) WHERE day = ? AND account = ?',delta,row.day,row.account);
    this.sql.exec('UPDATE totals SET tokens = MAX(0, tokens + ?) WHERE day = ?',delta,row.day);
   }
   // Session Z-Cloud Part 6: the reply's own cost replaces the money reserved; with none reported, the reservation stands.
   const money=cost===null?0:cost-Number(row.micros??0);
   if(money){
    this.sql.exec('UPDATE accounts SET micros = MAX(0, micros + ?) WHERE day = ? AND account = ?',money,row.day,row.account);
    this.sql.exec('UPDATE totals SET micros = MAX(0, micros + ?) WHERE day = ?',money,row.day);
    if(row.month)this.sql.exec('UPDATE months SET micros = MAX(0, micros + ?) WHERE month = ? AND account = ?',money,row.month,row.account);
   }
   this.sql.exec('DELETE FROM reservations WHERE id = ?',id);
   this.saveBreaker(breakerSettle(this.breaker(),BREAKER,outcome,now));
   return response({ok:true});
  });
 }
}
