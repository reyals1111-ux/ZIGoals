import {CACHE_PATH,COORDINATE,HTTP_DATE,MET_FORECAST,USER_AGENT,WEATHER_LIMITS as L} from './limits.mjs';
/**
 * The weather proxy (docs/run11/WEATHER_PROXY_ACTIVATION.md; OFF until the owner deploys it). The app asks this Worker
 * for a forecast instead of asking MET Norway itself, so MET never sees the person's address, browser headers or cookies:
 * it sees one Cloudflare address, this Worker's own User-Agent and a point rounded to 2 decimals (about 1 km).
 * - One route: GET /v1/forecast?lat=<-90..90>&lon=<-180..180> (and its CORS preflight). Other parameters are ignored.
 * - Origin: a request with an Origin header must come from APP_ORIGIN exactly; only APP_ORIGIN gets CORS headers.
 * - Cache: one entry per rounded point in the Workers Cache (caches.default), served until MET's Expires; after it, one
 *   conditional request (If-Modified-Since: MET's Last-Modified); a 304 extends the entry. While MET is unavailable (429,
 *   5xx, a timeout, an oversized or broken answer) an entry less than 2 h past its Expires is served marked stale.
 * - Body: MET's JSON exactly as received (at most 1 MB); a 203 (MET's deprecation notice) keeps its status.
 * - Per client: 60 requests per clock minute per client group, counted in memory by one Durable Object (WeatherLimit)
 *   under an HMAC key made for that minute. cf-connecting-ip is read only to count; nothing is stored, logged or forwarded.
 * @typedef {{WEATHER_LIMIT:DurableObjectNamespace,APP_ORIGIN?:string,MET_USER_AGENT?:string,ISOLATED_FIXTURE?:string,LOCAL_TEST_NOW?:string,LOCAL_TIMEOUT_MS?:string}} WeatherEnv
 * @typedef {{lat:string,lon:string}} Point
 * @typedef {{body:ArrayBuffer,status:200|203,expires:number,lastModified:string|null}} Entry
 */
/** The fixture clock and timeout apply only in an isolated local fixture. @param {WeatherEnv} env */
const fixture=env=>env.ISOLATED_FIXTURE==='true';
/** @param {WeatherEnv} env */
const nowOf=env=>fixture(env)&&/^\d{1,16}$/.test(env.LOCAL_TEST_NOW??'')?Number(env.LOCAL_TEST_NOW):Date.now();
/** @param {WeatherEnv} env */
const timeoutOf=env=>fixture(env)&&/^\d{1,6}$/.test(env.LOCAL_TIMEOUT_MS??'')?Number(env.LOCAL_TIMEOUT_MS):L.timeoutMs;
/** @param {WeatherEnv} env */
const configured=env=>/^https:\/\/[^\s/]+$/.test(env.APP_ORIGIN??'')||/^http:\/\/127\.0\.0\.1:\d+$/.test(env.APP_ORIGIN??'');
/** @param {unknown} body @param {number} status @param {Record<string,string>} [headers] */
const reply=(body,status,headers={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',Vary:'Origin',...headers}});
const EXPOSED='x-weather-cache, x-weather-upstream-status, x-weather-stale';

/** One coordinate, checked and rounded to 2 decimals before anything else reads it. @param {URLSearchParams} params @param {string} name @param {number} max */
function coordinate(params,name,max){
 const all=params.getAll(name);if(all.length!==1||!COORDINATE.test(/** @type {string} */(all[0])))return null;
 const value=Number(all[0]);if(!Number.isFinite(value)||value<-max||value>max)return null;
 const rounded=Math.round(value*100)/100;
 return String(rounded===0?0:rounded);
}
/** @param {URLSearchParams} params @returns {Point|null} */
function pointOf(params){const lat=coordinate(params,'lat',90),lon=coordinate(params,'lon',180);return lat===null||lon===null?null:{lat,lon};}

/** The client group used only for counting: an IPv4 address, or the /48 of an IPv6 address; 'unknown' otherwise (one shared group). @param {string|null} ip */
function clientGroup(ip){
 if(!ip)return 'unknown';
 const v4=/^(?:::ffff:)?((?:\d{1,3}\.){3}\d{1,3})$/i.exec(ip);if(v4)return 'v4:'+v4[1];
 if(!/^[0-9a-f:]{2,39}$/i.test(ip))return 'unknown';
 const halves=ip.toLowerCase().split('::');if(halves.length>2)return 'unknown';
 const head=halves[0]?halves[0].split(':'):[],tail=halves[1]?halves[1].split(':'):[];
 const gap=8-head.length-tail.length;if(halves.length===2?gap<1:gap!==0)return 'unknown';
 const parts=[...head,...Array(halves.length===2?gap:0).fill('0'),...tail];
 if(!parts.every(p=>/^[0-9a-f]{1,4}$/.test(p)))return 'unknown';
 return 'v6:'+parts.slice(0,3).map(p=>p.padStart(4,'0')).join(':')+'::/48';
}

/** MET's Expires as an instant, clamped to [now + 1 min, now + 1 day]. @param {string|null} header @param {number} now */
function freshUntil(header,now){const at=header?Date.parse(header):NaN;return Number.isFinite(at)?Math.min(Math.max(at,now+L.minFreshMs),now+L.maxFreshMs):now+L.minFreshMs;}
/** @param {string|null} header */
const lastModifiedOf=header=>header!==null&&HTTP_DATE.test(header)?header:null;

/** A JSON body of at most `limit` bytes, strict UTF-8, returned byte for byte; throws otherwise. @param {Response} res @param {number} limit */
async function readCapped(res,limit){
 const declared=Number(res.headers.get('content-length'));if(Number.isFinite(declared)&&declared>limit){await res.body?.cancel();throw Error('size');}
 const reader=res.body?.getReader();if(!reader)throw Error('empty');
 /** @type {Uint8Array[]} */const chunks=[];let size=0;
 try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>limit)throw Error('size');chunks.push(part.value);}}catch(e){await reader.cancel();throw e;}
 const bytes=new Uint8Array(size);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.byteLength;}
 // Checked, never rewritten: the bytes the app receives are MET's.
 const parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true,ignoreBOM:false}).decode(bytes));if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error('shape');
 return bytes.buffer;
}

/**
 * One MET call. Only the point, this Worker's User-Agent, Accept and (when revalidating) If-Modified-Since are sent.
 * Null for anything MET did not answer usably (429, 5xx, other statuses, redirects, timeouts, oversized or broken bodies).
 * @param {WeatherEnv} env @param {Point} point @param {string|null} since @param {number} now
 * @returns {Promise<{kind:'fresh',entry:Entry}|{kind:'not-modified',expires:number,lastModified:string|null}|null>}
 */
async function askMet(env,point,since,now){
 /** @type {Record<string,string>} */const headers={'User-Agent':/** @type {string} checked by the caller */(env.MET_USER_AGENT),Accept:'application/json'};
 if(since)headers['If-Modified-Since']=since;
 let res;try{res=await fetch(MET_FORECAST+'?'+new URLSearchParams({lat:point.lat,lon:point.lon}),{headers,redirect:'manual',signal:AbortSignal.timeout(timeoutOf(env))});}catch{return null;}
 const expires=freshUntil(res.headers.get('expires'),now),lastModified=lastModifiedOf(res.headers.get('last-modified'));
 if(res.status===304&&since){await res.body?.cancel();return {kind:'not-modified',expires,lastModified};}
 if(res.status!==200&&res.status!==203){await res.body?.cancel();return null;}
 if(!/^application\/(?:[\w.+-]+\+)?json(?:;|$)/i.test(res.headers.get('content-type')??'')){await res.body?.cancel();return null;}
 try{return {kind:'fresh',entry:{body:await readCapped(res,L.bodyBytes),status:res.status,expires,lastModified}};}catch{return null;}
}

/** The kept entry for a point, or null when there is none or it is not one this version wrote. @param {Response|undefined} res @returns {Promise<Entry|null>} */
async function readEntry(res){
 if(!res)return null;
 const status=Number(res.headers.get('x-weather-status')),expires=Number(res.headers.get('x-weather-expires'));
 if((status!==200&&status!==203)||!Number.isSafeInteger(expires)){await res.body?.cancel();return null;}
 return {body:await res.arrayBuffer(),status,expires,lastModified:lastModifiedOf(res.headers.get('x-weather-last-modified'))};
}
/** Keeps an entry until its Expires plus the stale window, so it can still be revalidated or served stale. @param {Request} key @param {Entry} entry @param {number} now */
async function keep(key,entry,now){
 /** @type {Record<string,string>} */
 const headers={'Content-Type':'application/json','Cache-Control':'public, max-age='+Math.max(1,Math.ceil((entry.expires+L.staleMs-now)/1000)),'x-weather-status':String(entry.status),'x-weather-expires':String(entry.expires)};
 if(entry.lastModified)headers['x-weather-last-modified']=entry.lastModified;
 await caches.default.put(key,new Response(entry.body,{status:200,headers}));
}
/** @param {Entry} entry @param {'hit'|'miss'|'revalidated'|'stale'} state @param {number} now @param {Record<string,string>} cors */
function serve(entry,state,now,cors){
 /** @type {Record<string,string>} */
 const headers={'Content-Type':'application/json','Cache-Control':'public, max-age='+Math.max(0,Math.floor((entry.expires-now)/1000)),'X-Content-Type-Options':'nosniff',Vary:'Origin','x-weather-cache':state,...cors};
 if(entry.status===203)headers['x-weather-upstream-status']='203';
 if(state==='stale')headers['x-weather-stale']='1';
 return new Response(entry.body,{status:entry.status,headers});
}

/** @type {ExportedHandler<WeatherEnv>} */
const weatherWorker={async fetch(request,env){
 const url=new URL(request.url);
 if(url.pathname!=='/v1/forecast')return reply({error:'NOT_FOUND'},404);
 if(!configured(env))return reply({error:'HOSTED_CONFIGURATION_REQUIRED'},503);
 const origin=request.headers.get('origin');
 if(origin!==null&&origin!==env.APP_ORIGIN)return reply({error:'ORIGIN_DENIED'},403);
 /** @type {Record<string,string>} */const cors=origin===null?{}:{'Access-Control-Allow-Origin':origin,'Access-Control-Expose-Headers':EXPOSED};
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...cors,...(origin===null?{}:{'Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Max-Age':'86400'}),Allow:'GET, OPTIONS','Cache-Control':'no-store',Vary:'Origin'}});
 if(request.method!=='GET')return reply({error:'METHOD_NOT_ALLOWED'},405,{...cors,Allow:'GET, OPTIONS'});
 const point=pointOf(url.searchParams);if(!point)return reply({error:'INVALID_COORDINATES'},400,cors);
 if(!USER_AGENT.test(env.MET_USER_AGENT??''))return reply({error:'PROVIDER_SETUP_REQUIRED'},503,cors);
 const now=nowOf(env);
 // Counting only: the group goes to the limiter object and nowhere else.
 const limiter=env.WEATHER_LIMIT.get(env.WEATHER_LIMIT.idFromName('weather-limit-v1'));
 /** @type {Record<string,string>} */const count={'x-weather-client':clientGroup(request.headers.get('cf-connecting-ip'))};
 if(fixture(env))count['x-weather-now']=String(now);
 const verdict=await limiter.fetch('https://limit.internal/count',{method:'POST',headers:count});
 if(verdict.status!==200){
  const body=/** @type {{retryAfter?:unknown}} */(await verdict.json().catch(()=>({}))),retry=typeof body.retryAfter==='number'?body.retryAfter:60;
  return reply({error:'TRY_LATER',retryAfter:retry},429,{...cors,'Retry-After':String(retry)});
 }
 await verdict.body?.cancel();
 const key=new Request(url.origin+CACHE_PATH+point.lat+'/'+point.lon);
 const kept=await readEntry(await caches.default.match(key));
 if(kept&&now<kept.expires)return serve(kept,'hit',now,cors);
 // The global MET budget (security delta, Medium): one count per upstream call, across every client, per minute.
 /** @type {Record<string,string>} */const spend={};if(fixture(env))spend['x-weather-now']=String(now);
 const budget=await limiter.fetch('https://limit.internal/upstream',{method:'POST',headers:spend});
 const allowed=budget.status===200;await budget.body?.cancel();
 if(!allowed){
  if(kept&&now<kept.expires+L.staleMs)return serve(kept,'stale',now,cors);
  return reply({error:'UPSTREAM_UNAVAILABLE'},503,{...cors,'Retry-After':'60'});
 }
 const answer=await askMet(env,point,kept?.lastModified??null,now);
 if(answer?.kind==='not-modified'&&kept){
  const entry={...kept,expires:answer.expires,lastModified:answer.lastModified??kept.lastModified};
  await keep(key,entry,now);return serve(entry,'revalidated',now,cors);
 }
 if(answer?.kind==='fresh'){await keep(key,answer.entry,now);return serve(answer.entry,'miss',now,cors);}
 if(kept&&now<kept.expires+L.staleMs)return serve(kept,'stale',now,cors);
 return reply({error:'UPSTREAM_UNAVAILABLE'},503,{...cors,'Retry-After':'60'});
}};
export default weatherWorker;

/**
 * One per deployment: per client group, the requests of the current clock minute, in memory only. A group is counted
 * under an HMAC key made for that minute and dropped with it, so nothing links a count to an address once the minute
 * ends, and nothing is written to storage (no row per request; an evicted object simply starts a fresh minute).
 */
export class WeatherLimit{
 /** @param {DurableObjectState} state @param {WeatherEnv} env */
 constructor(state,env){this.state=state;this.env=env;this.minute=-1;this.upstream=0;/** @type {Map<string,number>} */this.counts=new Map();/** @type {Promise<CryptoKey>|null} */this.key=null;}
 /** @param {Request} request */
 async fetch(request){
  const stated=this.env.ISOLATED_FIXTURE==='true'?Number(request.headers.get('x-weather-now')):NaN;
  const now=Number.isSafeInteger(stated)?stated:Date.now(),minute=Math.floor(now/60000);
  if(minute!==this.minute||!this.key){this.minute=minute;this.counts=new Map();this.upstream=0;this.key=/** @type {Promise<CryptoKey>} */(crypto.subtle.generateKey({name:'HMAC',hash:'SHA-256'},false,['sign']));}
  if(new URL(request.url).pathname==='/upstream'){
   // Every client's MET calls this minute, together (security delta, Medium).
   if(this.upstream>=L.upstreamPerMinute)return Response.json({retryAfter:Math.max(1,Math.ceil(((minute+1)*60000-now)/1000))},{status:429});
   this.upstream++;return Response.json({ok:true});
  }
  const counts=this.counts,mac=new Uint8Array(await crypto.subtle.sign('HMAC',await this.key,new TextEncoder().encode(request.headers.get('x-weather-client')??'unknown')));
  const bucket=[...mac.slice(0,8)].map(b=>b.toString(16).padStart(2,'0')).join(''),n=counts.get(bucket)??0;
  if(n>=L.perMinute)return Response.json({retryAfter:Math.max(1,Math.ceil(((minute+1)*60000-now)/1000))},{status:429});
  counts.set(bucket,n+1);return Response.json({ok:true});
 }
}
