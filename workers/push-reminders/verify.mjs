/**
 * The private-sync preamble, repeated for the push Worker (ADR-010): the bearer is verified at the provider, the
 * claims must carry the session, and the account header must match the verified identity. The origin check and the
 * routing stay in worker.mjs.
 * @typedef {{AUTH_ORIGIN?:string,AUTH_PUBLIC_KEY?:string,APP_ORIGIN?:string}} VerifyEnv
 */
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** @param {unknown} value @param {number} [status] */
export const response=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
/** @param {Request|Response} source @param {number} [max] */
export async function boundedJSON(source,max=8192){
 const reader=source.body?.getReader();if(!reader)throw Error('body');const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max)throw Error('size');chunks.push(value);}}catch(error){await reader.cancel().catch(()=>{});throw error;}
 const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}
 return JSON.parse(new TextDecoder('utf-8',{fatal:true,ignoreBOM:false}).decode(data));
}
/** @param {VerifyEnv} env */
export function providerConfigured(env){return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(env.AUTH_ORIGIN??'')&&!!env.AUTH_PUBLIC_KEY&&!!env.APP_ORIGIN;}
/**
 * @param {Request} request @param {VerifyEnv} env
 * @returns {Promise<{response:Response}|{account:string,family:string}>}
 */
export async function verifySession(request,env){
 const token=request.headers.get('authorization');if(!token||!/^Bearer [A-Za-z0-9._-]{1,4096}$/.test(token))return {response:response({error:'SIGN_IN_REQUIRED'},401)};
 let user;
 try{const auth=await fetch(`${env.AUTH_ORIGIN}/auth/v1/user`,{headers:{authorization:token,apikey:/** @type {string} */(env.AUTH_PUBLIC_KEY)},redirect:'manual',signal:AbortSignal.timeout(8000)});if(!auth.ok)return {response:response({error:'SIGN_IN_REQUIRED'},401)};user=await boundedJSON(auth,32768);}catch{return {response:response({error:'SIGN_IN_REQUIRED'},401)};}
 if(!UUID.test(user?.id))return {response:response({error:'SIGN_IN_REQUIRED'},401)};
 let family;
 try{const claims=JSON.parse(atob(/** @type {string} a malformed token throws inside this try */(token.slice(7).split('.')[1]).replace(/-/g,'+').replace(/_/g,'/')));if(claims.sub!==user.id||!UUID.test(claims.session_id??''))throw Error();family=claims.session_id;}catch{return {response:response({error:'VERIFIED_SESSION_REQUIRED'},401)};}
 if(request.headers.get('x-zigoals-account')?.toLowerCase()!==user.id.toLowerCase())return {response:response({error:'ACCOUNT_CHANGED'},409)};
 return {account:user.id,family};
}
