import 'server-only';
/**
 * The session cookie as `private-account.ts` reads it, for the push route (ADR-010): hosted https origins use the
 * `__Host-` names, plain http (local development and fixtures) the unprefixed ones; two cookies with one name mean
 * something else set a cookie for this origin, so neither is trusted; the value must look like a token. The account
 * route keeps its own inline reader; `session-cookie.test.ts` proves both read the same token from the same request.
 */
export const SESSION_TOKEN=/^[A-Za-z0-9._-]{1,4096}$/;
export function sessionCookieNames(origin:string){const secure=origin.startsWith('https:');return {secure,session:secure?'__Host-zigoals_session':'zigoals_session',refresh:secure?'__Host-zigoals_refresh':'zigoals_refresh'};}
export function readSessionCookie(request:Request):{token:string|null;duplicate:boolean}{
 const {session,refresh}=sessionCookieNames(new URL(request.url).origin);
 const pairs=(request.headers.get('cookie')??'').split(';').map(v=>v.trim()).filter(Boolean).map(v=>{const at=v.indexOf('=');return at<0?[v,'']:[v.slice(0,at),v.slice(at+1)];});
 const named=(name:string)=>pairs.filter(([key])=>key===name).map(([,value])=>value);
 if(named(session).length>1||named(refresh).length>1)return {token:null,duplicate:true};
 const value=named(session)[0];
 return {token:value&&SESSION_TOKEN.test(value)?value:null,duplicate:false};
}
