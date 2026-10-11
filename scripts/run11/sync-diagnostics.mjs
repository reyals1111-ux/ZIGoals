// Test-only request log for the sync browser harnesses. It records opaque metadata only: method,
// path, the request's `action`, status, the response `error` code, timing and whether the harness
// held the request. Never bodies, keys, tokens, ciphertext or identifiers: anything shaped like a
// UUID or a long token is cut to a 4-character prefix.
const UUID=/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,LONG=/[A-Za-z0-9_+/=-]{24,}/g;
export const redact=text=>String(text).replace(UUID,m=>m.slice(0,4)+'…').replace(LONG,m=>m.slice(0,4)+'…');
const action=raw=>{try{const value=JSON.parse(raw??'null')?.action;return typeof value==='string'&&/^[a-z_-]{1,32}$/i.test(value)?value:'-';}catch{return '-';}};
const path=url=>{try{return redact(new URL(url).pathname);}catch{return '?';}};
async function errorCode(response){try{const data=await response.clone().json();return typeof data?.error==='string'?redact(data.error).slice(0,80):'-';}catch{return 'non-json';}}
export function createRequestLog(label){
 const start=Date.now(),rows=[],at=()=>Date.now()-start;
 const print=line=>console.log(`[sync-diag ${label}] ${line}`);
 const timeline=()=>{print(`last ${Math.min(rows.length,14)} of ${rows.length} requests:`);for(const row of rows.slice(-14))print(`  ${row}`);};
 return {
  /** A browser request answered by the app route (privateAccountRequest). */
  async app(method,url,postData,response,ms){
   const code=response.ok?'-':await errorCode(response),row=`+${at()}ms app ${method} ${path(url)} action=${action(postData)} -> ${response.status} error=${code} (${ms} ms)`;rows.push(row);
   if(!response.ok){print(`NOT OK ${row}`);timeline();}
  },
  /** The app route's upstream call to the Worker (Miniflare). */
  async worker(method,url,response,ms,held){
   const code=response.ok?'-':await errorCode(response),row=`+${at()}ms   worker ${method} ${path(url)} -> ${response.status} error=${code} (${ms} ms${held?', held by harness':''})`;rows.push(row);
   if(!response.ok)print(`NOT OK ${row}`);
  },
  /** An upstream call that threw instead of answering (abort, timeout, disconnect). */
  failed(method,url,error,ms,held){
   const row=`+${at()}ms   worker ${method} ${path(url)} threw ${redact(error?.name??'Error')}: ${redact(error?.message??error).slice(0,160)} (${ms} ms${held?', held by harness':''})`;rows.push(row);print(`THREW ${row}`);
  },
 };
}
