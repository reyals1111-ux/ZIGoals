// Session U Part 4: Durable Object access for Miniflare tests through a probe Worker on its own loopback socket, instead of
// Miniflare's object proxies (mf.getDurableObjectNamespace). The proxies free remote stubs from a FinalizationRegistry
// with a request whose response is never read, and a dispose() that overlaps it raised an unhandled undici "terminated"
// depending on GC timing (Session S Part 10; scripts/run11/recovery-admin-erase.test.mjs was the first rewrite).
//
// Use: add `doProbeWorker({className, scriptName})` to the Miniflare workers, then `await doProbe(mf)` in place of
// `await mf.getDurableObjectNamespace(...)`. It answers `idFromName(name)` and `get(id).fetch(url, init)` exactly as the
// tests used the proxy; the probe removes its own header before the object sees the request.
export const DO_PROBE='do-probe';
export function doProbeWorker({className,scriptName,name=DO_PROBE,compatibilityDate='2026-09-13'}){
 return {name,modules:true,compatibilityDate,
  script:"export default {fetch(request,env){const headers=new Headers(request.headers),name=headers.get('x-do-probe-name');headers.delete('x-do-probe-name');if(name===null)return new Response(null,{status:400});return env.OBJECTS.get(env.OBJECTS.idFromName(name)).fetch(new Request(request,{headers}));}}",
  durableObjects:{OBJECTS:{className,scriptName}},unsafeDirectSockets:[{host:'127.0.0.1',port:0}]};
}
export async function doProbe(mf,name=DO_PROBE){
 const base=await mf.unsafeGetDirectURL(name);
 return {
  idFromName:value=>({name:String(value)}),
  get:id=>({fetch:async(input,init={})=>{
   // A string, a URL or a Request, with init, as a stub's fetch takes it. A Request may come from Miniflare's own undici
   // (a custom service binding's argument), which this realm's Request constructor does not accept: read it by its
   // fields. The body is read once and sent as bytes.
   const source=typeof input==='string'||input instanceof URL?null:input,url=new URL(source?source.url:String(input));
   const method=(init.method??source?.method??'GET').toUpperCase(),headers=new Headers(init.headers??source?.headers);
   headers.set('x-do-probe-name',id.name);
   const body=['GET','HEAD'].includes(method)?undefined:init.body!==undefined?init.body:source?await source.arrayBuffer():undefined;
   return fetch(new URL(url.pathname+url.search,base),{method,headers,body,redirect:'manual',signal:init.signal});
  }}),
 };
}
