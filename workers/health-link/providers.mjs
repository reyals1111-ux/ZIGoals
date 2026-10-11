/**
 * The four providers the health-link Worker can reach (Session W Part 8; docs/run11/HEALTH_LINK_ACTIVATION.md), from
 * their official documentation (read 2026-10-07): how a code and a refresh token are exchanged (each needs the client
 * secret, held only here), the named requests the app may make (never an arbitrary path), and how access is revoked
 * where the provider offers it. A provider is on only when its client id (a var) and secret (a secret) are both set.
 * @typedef {{OURA_CLIENT_ID?:string,OURA_CLIENT_SECRET?:string,WITHINGS_CLIENT_ID?:string,WITHINGS_CLIENT_SECRET?:string,POLAR_CLIENT_ID?:string,POLAR_CLIENT_SECRET?:string,STRAVA_CLIENT_ID?:string,STRAVA_CLIENT_SECRET?:string,APP_ORIGIN?:string}} ProviderEnv
 * @typedef {'oura'|'withings'|'polar'|'strava'} Provider
 * @typedef {{method:'GET'|'POST'|'DELETE',url:string,headers:Record<string,string>,body?:string}} Upstream
 * @typedef {{accessToken:string,refreshToken?:string,expiresAt?:string,scope?:string,userId?:string}} Tokens
 */
export const PROVIDERS=/** @type {const} */(['oura','withings','polar','strava']);
/** @param {unknown} v @returns {v is Provider} */
export const isProvider=v=>typeof v==='string'&&/** @type {readonly string[]} */(PROVIDERS).includes(v);
const IDS=/** @type {Record<Provider,[keyof ProviderEnv,keyof ProviderEnv]>} */({oura:['OURA_CLIENT_ID','OURA_CLIENT_SECRET'],withings:['WITHINGS_CLIENT_ID','WITHINGS_CLIENT_SECRET'],polar:['POLAR_CLIENT_ID','POLAR_CLIENT_SECRET'],strava:['STRAVA_CLIENT_ID','STRAVA_CLIENT_SECRET']});
const CLIENT_ID=/^[A-Za-z0-9._-]{1,200}$/;
/** @param {ProviderEnv} env @param {Provider} p */
export const clientId=(env,p)=>{const v=env[IDS[p][0]];return typeof v==='string'&&CLIENT_ID.test(v)?v:null;};
/** @param {ProviderEnv} env @param {Provider} p */
const secret=(env,p)=>{const v=env[IDS[p][1]];return typeof v==='string'&&v.length>=8&&v.length<=500?v:null;};
/** @param {ProviderEnv} env @param {Provider} p */
export const enabled=(env,p)=>!!clientId(env,p)&&!!secret(env,p);
/** The one redirect address, from the Worker's own APP_ORIGIN (never from a request). @param {ProviderEnv} env */
export const redirectUri=env=>`${env.APP_ORIGIN}/app/health`;
/** What the app needs to send a person to a provider: public values only. @param {ProviderEnv} env */
export function publicConfig(env){
 return {redirectUri:redirectUri(env),providers:PROVIDERS.filter(p=>enabled(env,p)).map(p=>({id:p,clientId:clientId(env,p)}))};
}
const form=(/** @type {Record<string,string>} */values)=>new URLSearchParams(values).toString();
const FORM={'content-type':'application/x-www-form-urlencoded',accept:'application/json'};
const basic=(/** @type {string} */id,/** @type {string} */key)=>`Basic ${btoa(`${id}:${key}`)}`;
/**
 * The token exchange for a code (with Oura's PKCE verifier when one was used) or a refresh token.
 * @param {ProviderEnv} env @param {Provider} p @param {{code:string,verifier?:string}|{refreshToken:string}} grant @returns {Upstream}
 */
export function tokenRequest(env,p,grant){
 const id=/** @type {string} */(clientId(env,p)),key=/** @type {string} */(secret(env,p)),uri=redirectUri(env);
 /** @type {Record<string,string>} */
 const g='code' in grant?{grant_type:'authorization_code',code:grant.code,redirect_uri:uri}:{grant_type:'refresh_token',refresh_token:grant.refreshToken};
 switch(p){
  case 'oura':return {method:'POST',url:'https://api.ouraring.com/oauth/token',headers:FORM,body:form({...g,client_id:id,client_secret:key,...('code' in grant&&grant.verifier?{code_verifier:grant.verifier}:{})})};
  case 'withings':return {method:'POST',url:'https://wbsapi.withings.net/v2/oauth2',headers:FORM,body:form({action:'requesttoken',client_id:id,client_secret:key,...g})};
  case 'polar':return {method:'POST',url:'https://polarremote.com/v2/oauth2/token',headers:{...FORM,authorization:basic(id,key)},body:form(g)};
  case 'strava':return {method:'POST',url:'https://www.strava.com/oauth/token',headers:FORM,body:form({...g,client_id:id,client_secret:key})};
 }
}
/** The provider's token answer in one shape; null when it holds no access token. @param {Provider} p @param {any} json @param {number} now @returns {Tokens|null} */
export function tokensFrom(p,json,now){
 const body=p==='withings'?(json?.status===0?json.body:null):json;
 if(!body||typeof body.access_token!=='string'||!body.access_token)return null;
 const expiresAt=typeof body.expires_at==='number'?new Date(body.expires_at*1000).toISOString():typeof body.expires_in==='number'?new Date(now+body.expires_in*1000).toISOString():undefined;
 const userId=body.x_user_id??body.userid??body.athlete?.id;
 return {accessToken:body.access_token,...(typeof body.refresh_token==='string'&&body.refresh_token?{refreshToken:body.refresh_token}:{}),...(expiresAt?{expiresAt}:{}),...(typeof body.scope==='string'?{scope:body.scope.slice(0,1000)}:{}),...(userId!==undefined&&userId!==null?{userId:String(userId).slice(0,64)}:{})};
}
const DAY=/^\d{4}-\d{2}-\d{2}$/,EPOCH=/^\d{1,10}$/,TOKEN=/^[A-Za-z0-9._~+/=-]{1,512}$/,PAGE=/^([1-9]|[1-4]\d|50)$/,OFFSET=/^\d{1,7}$/;
/** @typedef {{provider:Provider,params:Record<string,RegExp>,build:(params:Record<string,string>,token:string)=>Upstream}} NamedRequest */
const bearer=(/** @type {string} */t)=>({authorization:`Bearer ${t}`,accept:'application/json'});
const oura=(/** @type {string} */collection)=>/** @type {NamedRequest} */({provider:'oura',params:{start_date:DAY,end_date:DAY,next_token:TOKEN},build:(q,t)=>({method:'GET',url:`https://api.ouraring.com/v2/usercollection/${collection}?${new URLSearchParams(q)}`,headers:bearer(t)})});
const withings=(/** @type {string} */path,/** @type {Record<string,string>} */fixed,/** @type {Record<string,RegExp>} */params)=>/** @type {NamedRequest} */({provider:'withings',params,build:(q,t)=>({method:'POST',url:`https://wbsapi.withings.net${path}`,headers:{...bearer(t),'content-type':'application/x-www-form-urlencoded'},body:form({...fixed,...q})})});
/** The only requests the app may ask for, by name; parameters are checked against these patterns, all optional. */
export const NAMED=/** @type {Record<string,NamedRequest>} */({
 'oura.sleep':oura('sleep'),'oura.daily_activity':oura('daily_activity'),'oura.session':oura('session'),'oura.workout':oura('workout'),
 'withings.sleep':withings('/v2/sleep',{action:'getsummary',data_fields:'total_sleep_time,asleepduration,deepsleepduration,lightsleepduration,remsleepduration,wakeupduration,sleep_latency'},{startdateymd:DAY,enddateymd:DAY}),
 'withings.weight':withings('/measure',{action:'getmeas',meastypes:'1',category:'1'},{startdate:EPOCH,enddate:EPOCH,offset:OFFSET}),
 'withings.activity':withings('/v2/measure',{action:'getactivity',data_fields:'steps,calories,totalcalories'},{startdateymd:DAY,enddateymd:DAY,offset:OFFSET}),
 'withings.workouts':withings('/v2/measure',{action:'getworkouts'},{startdateymd:DAY,enddateymd:DAY,offset:OFFSET}),
 'polar.sleep':{provider:'polar',params:{},build:(_q,t)=>({method:'GET',url:'https://www.polaraccesslink.com/v3/users/sleep',headers:bearer(t)})},
 'polar.activities':{provider:'polar',params:{from:DAY,to:DAY},build:(q,t)=>({method:'GET',url:`https://www.polaraccesslink.com/v3/users/activities?${new URLSearchParams({...q,steps:'true'})}`,headers:bearer(t)})},
 'polar.exercises':{provider:'polar',params:{},build:(_q,t)=>({method:'GET',url:'https://www.polaraccesslink.com/v3/exercises',headers:bearer(t)})},
 'strava.activities':{provider:'strava',params:{after:EPOCH,before:EPOCH,page:PAGE},build:(q,t)=>({method:'GET',url:`https://www.strava.com/api/v3/athlete/activities?${new URLSearchParams(q)}`,headers:bearer(t)})},
});
/** A named request with checked parameters, or null. @param {string} name @param {Provider} provider @param {unknown} params @param {string} token */
export function namedRequest(name,provider,params,token){
 const spec=Object.hasOwn(NAMED,name)?NAMED[name]:null;
 if(!spec||spec.provider!==provider||!TOKEN_LIKE.test(token))return null;
 const q=/** @type {Record<string,string>} */({});
 if(params!==undefined){if(!params||typeof params!=='object'||Array.isArray(params))return null;
  for(const [k,v] of Object.entries(params)){const pattern=Object.hasOwn(spec.params,k)?spec.params[k]:null;if(!pattern||typeof v!=='string'||!pattern.test(v))return null;q[k]=v;}}
 return spec.build(q,token);
}
const TOKEN_LIKE=/^[A-Za-z0-9._~+/=-]{8,4000}$/;
/** Polar needs the person registered with ZIGoals' client before any data (POST /v3/users). @param {string} token @param {string} memberId @returns {Upstream} */
export const polarRegistration=(token,memberId)=>({method:'POST',url:'https://www.polaraccesslink.com/v3/users',headers:{...bearer(token),'content-type':'application/json'},body:JSON.stringify({'member-id':memberId})});
/**
 * Revoking access where the provider documents it: Oura's revoke address (its method is not stated; GET, the form of the
 * documented URL), Polar's user deletion (DELETE /v3/users/{id}), Strava's /oauth/revoke (Basic client credentials; the
 * older /oauth/deauthorize ends on 1 June 2027). Withings needs two signed calls: withingsRevoke below.
 * @param {ProviderEnv} env @param {Provider} p @param {string} token @param {string|undefined} userId @returns {Upstream|null}
 */
export function revokeRequest(env,p,token,userId){
 if(!TOKEN_LIKE.test(token))return null;
 switch(p){
  case 'oura':return {method:'GET',url:`https://api.ouraring.com/oauth/revoke?${new URLSearchParams({access_token:token})}`,headers:{accept:'application/json'}};
  case 'polar':return userId&&/^\d{1,20}$/.test(userId)?{method:'DELETE',url:`https://www.polaraccesslink.com/v3/users/${userId}`,headers:bearer(token)}:null;
  case 'strava':return {method:'POST',url:'https://www.strava.com/oauth/revoke',headers:{...FORM,authorization:basic(/** @type {string} */(clientId(env,p)),/** @type {string} */(secret(env,p)))},body:form({token,token_type_hint:'access_token'})};
  default:return null;
 }
}
/** HMAC-SHA256 of a text, keyed with the client secret, in hex (Withings' "Signature hash protocol"). @param {string} key @param {string} text */
export async function hmacHex(key,text){
 const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return [...new Uint8Array(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(text)))].map(b=>b.toString(16).padStart(2,'0')).join('');
}
/**
 * Withings' revoke: a nonce (action=getnonce, signed over "getnonce,<client_id>,<timestamp>"; single use, 30 minutes),
 * then action=revoke with the user id, signed over "revoke,<client_id>,<nonce>". The two requests, built here.
 * @param {ProviderEnv} env @param {number} now
 */
export async function withingsNonceRequest(env,now){
 const id=/** @type {string} */(clientId(env,'withings')),timestamp=String(Math.floor(now/1000));
 return /** @type {Upstream} */({method:'POST',url:'https://wbsapi.withings.net/v2/signature',headers:FORM,body:form({action:'getnonce',client_id:id,timestamp,signature:await hmacHex(/** @type {string} */(secret(env,'withings')),`getnonce,${id},${timestamp}`)})});
}
/** @param {ProviderEnv} env @param {string} nonce @param {string} userId */
export async function withingsRevokeRequest(env,nonce,userId){
 const id=/** @type {string} */(clientId(env,'withings'));
 return /** @type {Upstream} */({method:'POST',url:'https://wbsapi.withings.net/v2/oauth2',headers:FORM,body:form({action:'revoke',client_id:id,nonce,signature:await hmacHex(/** @type {string} */(secret(env,'withings')),`revoke,${id},${nonce}`),userid:userId})});
}
