import {test,expect,beforeAll} from 'vitest';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {hermeticWorkerOptions} from './hermetic-wrangler.mjs';
import {probeAlphaMarket} from '../lib/alpha-market-probe.mjs';
import {marketPairEnvelope} from '../../apps/web/lib/server/market-pair-result';
import {parseCoinQuotes} from '../../apps/web/lib/market-quotes';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url));
const {Miniflare,convertV4MiniflareOptions}=require('miniflare'),{unstable_getMiniflareWorkerOptions}=require('wrangler');
const root=new URL('../../',import.meta.url).pathname;
// Session S Part 8: the generated public-Alpha artifact (build:alpha, then the dry run of wrangler.alpha.jsonc with
// --outdir) with the reviewed config's own bindings and var, and a local stand-in for the coordinator's QuoteService.
// - a coordinator with a fresh BTC/USD quote: the price probe reads VERIFIED;
// - unbound, throwing or failing: a well-formed UNAVAILABLE (HTTP 503), never a crash.
// Requires the generated build; never deploys, loads credentials or reaches a network (outbound requests throw).
//   pnpm --filter @zigoals/web build:alpha
//   pnpm --filter @zigoals/web exec wrangler deploy --config wrangler.alpha.jsonc --dry-run --outdir /tmp/zigoals-alpha-dry
//   ALPHA_PACKAGED=1 pnpm exec vitest run scripts/run11/alpha-packaged-prices.test.mjs
const enabled=process.env.ALPHA_PACKAGED==='1';
const btc={marketRef:{provider:'coingecko',kind:'coin',id:'bitcoin'},currency:'USD'};
let script,app;
beforeAll(async()=>{
 if(!enabled)return;
 script=await readFile(process.env.ALPHA_PACKAGE_BUNDLE??'/tmp/zigoals-alpha-dry/worker.js','utf8');
 app=hermeticWorkerOptions(unstable_getMiniflareWorkerOptions,resolve(root,'apps/web/wrangler.alpha.jsonc')).workerOptions;
},60000);
const coordinator=body=>`import {WorkerEntrypoint} from 'cloudflare:workers';export class QuoteService extends WorkerEntrypoint{async fetch(request){${body}}};export default {fetch(){return new Response(null,{status:404});}};`;
async function alpha(stub){
 const services={WORKER_SELF_REFERENCE:{name:'zigoals-alpha'},...(stub?{MARKET_QUOTES:{name:'zigoals-acctest-market-coordinator',entrypoint:'QuoteService'}}:{})};
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[
  {name:'zigoals-alpha',modules:true,script,compatibilityDate:app.compatibilityDate,compatibilityFlags:app.compatibilityFlags,assets:app.assets,bindings:app.bindings,serviceBindings:services,outboundService:request=>{throw Error('Outbound fixture refused '+new URL(request.url).origin);}},
  ...(stub?[{name:'zigoals-acctest-market-coordinator',modules:true,script:coordinator(stub),compatibilityDate:'2026-09-13',outboundService:()=>{throw Error('The stand-in coordinator has no network');}}]:[]),
 ]}));
 const fetcher=(url,init)=>mf.dispatchFetch(url,{...init,headers:{...init.headers,'cf-connecting-ip':'192.0.2.44'}});
 return {mf,fetcher};
}

test.runIf(enabled)('the generated Alpha artifact carries exactly the reviewed market binding and mode',()=>{
 expect(app.bindings).toEqual({ZIGOALS_MARKET_QUOTES_MODE:'durable-v1'});
 expect(Object.keys(app.serviceBindings??{}).sort()).toEqual(['MARKET_QUOTES','WORKER_SELF_REFERENCE']);
});

test.runIf(enabled)('a coordinator with a fresh BTC/USD quote gives VERIFIED through the packaged Alpha',async()=>{
 const now=Date.now(),quote=parseCoinQuotes(`{"bitcoin":{"usd":62500.12,"last_updated_at":${Math.floor(now/1000)}}}`,[btc],now)[0];
 const wire=JSON.stringify(marketPairEnvelope([btc],[quote],[],now));
 const {mf,fetcher}=await alpha(`const body=await request.json();if(request.headers.get('x-market-client')!=='v4:192.0.2.44'||JSON.stringify(body)!==${JSON.stringify(JSON.stringify({version:1,requests:[btc]}))})return new Response(null,{status:400});return new Response(${JSON.stringify(wire)},{headers:{'content-type':'application/json'}});`);
 try{expect(await probeAlphaMarket({origin:'https://alpha.zigoals.app',fetcher})).toEqual({wellFormed:true,result:'VERIFIED',httpStatus:200,pair:'VERIFIED_FRESH',failure:null,reason:null});}
 finally{await mf.dispose();}
},60000);

test.runIf(enabled).each([
 ['unbound (the service binding is missing)',null],
 ['a coordinator that throws',"throw new Error('Coordinator unavailable.');"],
 ['a coordinator answering 500',"return new Response('internal',{status:500});"],
 ['a coordinator answering setup required',"return Response.json({error:'MARKET_SETUP_REQUIRED'},{status:503});"],
])('%s gives a well-formed UNAVAILABLE through the packaged Alpha',async(_label,stub)=>{
 const {mf,fetcher}=await alpha(stub);
 try{
  const probe=await probeAlphaMarket({origin:'https://alpha.zigoals.app',fetcher});
  expect(probe).toMatchObject({wellFormed:true,result:'UNAVAILABLE',httpStatus:503});
  // The application pages still render.
  const page=await fetcher('https://alpha.zigoals.app/app/markets',{headers:{}});expect(page.status).toBe(200);await page.text();
 }finally{await mf.dispose();}
},60000);
