import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {existsSync,realpathSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
/**
 * Session AP Part 3 ("service rows replayed honestly"): the topology behind the carried "Needs a service" rows, with the
 * repo's own server code and recorded-shape upstream answers (./fixtures). Nothing reaches a live provider or Cloudflare.
 *
 *   app Worker   esbuild bundle of the real route modules (app/api/market-*, food-lookup, chain/*, positions) inside the
 *                installed OpenNext request context (the market-runtime-fixture.mjs pattern); its own outbound answers
 *                only the CoinGecko logo hosts (lib/server/market-logo.ts) and the two ZIGChain LCDs.
 *   market       workers/market-coordinator/worker.ts (QuoteService + MarketAccount, SQLite), bound as MARKET_QUOTES;
 *                outbound answers only api.coingecko.com.
 *   food         workers/food-lookup/worker.mjs (FoodBudget, SQLite), bound as FOOD_LOOKUP; outbound answers only
 *                world.openfoodfacts.org (no FDC key, so FoodData Central is never asked).
 *
 * Every other host, and every path of an allowed host that has no recording, is REFUSED: the request throws inside
 * workerd and is listed in `refused`. `calls` lists every answered upstream request as {worker, host, path}.
 *
 * `start()` returns an HTTP origin on 127.0.0.1 that serves the app's /api/* routes. App pages are NOT served from
 * source: they need the OpenNext bundle (`pnpm build:alpha`-style output, then the Wrangler dry-run worker.js) that the
 * packaged tests use. Pass `bundle` (or set RUN11_PACKAGE_BUNDLE) to run that bundle as the app Worker instead, with
 * apps/web/wrangler.run11.local.jsonc's assets and vars and the same market and food Workers; without it, a browser
 * replay serves pages from a normal app server and forwards `/api/**` to this origin with Playwright's page.route.
 *
 * Time: workerd runs on the real clock, so freshness (15 minutes for quotes and insights) is judged against real time.
 * The fixtures are recorded relative to their `recordedAt`; each answer is re-based so that recordedAt is `clock()` at
 * the moment of the request. The default clock is Date.now: an upstream whose last update is always as old as recorded
 * (bitcoin 30 s, cardano 40 min, …). A fixed clock freezes those ages instead.
 */
// No import.meta: Playwright compiles this file as CommonJS when a spec imports it (apps/web/tests/ap/service-rows.spec.ts),
// so the repository is found from the working directory (the repo root for vitest and node, apps/web for Playwright).
function repoRoot(){let dir=process.cwd();for(;;){if(existsSync(join(dir,'pnpm-workspace.yaml'))&&existsSync(join(dir,'scripts/run11/service-rows/harness.mjs')))return dir+'/';const up=dirname(dir);if(up===dir)throw Error('service-rows harness: run it from inside the ZIGoals checkout.');dir=up;}}
const root=repoRoot();
// realpath: pnpm links wrangler, and plain `node` (unlike vitest) resolves its esbuild/miniflare next to the real path.
const requireTool=createRequire(realpathSync(root+'apps/web/node_modules/wrangler/package.json'));
const {build}=requireTool('esbuild'),{Miniflare,convertV4MiniflareOptions}=requireTool('miniflare');
const fixture=async name=>JSON.parse(await readFile(root+'scripts/run11/service-rows/fixtures/'+name,'utf8'));
export async function loadFixtures(){
 const names={priceV1:'coingecko-simple-price.v1.json',priceV2:'coingecko-simple-price.v2.json',markets:'coingecko-coins-markets.json',rwas:'coingecko-rwas-markets.json',coinsList:'coingecko-coins-list.json',rwasList:'coingecko-rwas-list.json',chart:'coingecko-market-chart.json',logo:'coingecko-logo.json',food:'openfoodfacts-3017620422003.json',lcd:'zigchain-lcd.json'};
 return Object.fromEntries(await Promise.all(Object.entries(names).map(async([key,name])=>[key,await fixture(name)])));
}
/** The real route modules this harness serves, by path. */
export const ROUTES={
 '/api/market-quotes/cancel':'market-quotes/cancel','/api/market-quotes':'market-quotes','/api/market-assets':'market-assets','/api/market-history':'market-history','/api/market-insights':'market-insights','/api/market-detail':'market-detail','/api/market-logo':'market-logo','/api/market-status':'market-status',
 '/api/food-lookup':'food-lookup','/api/chain/validators':'chain/validators','/api/chain/proposals':'chain/proposals','/api/chain/proposal':'chain/proposal','/api/chain/vote':'chain/vote','/api/positions':'positions',
};
let bundled;
export async function serviceRowBundles(){
 if(bundled)return bundled;
 const productionInit=root+'apps/web/node_modules/@opennextjs/cloudflare/dist/cli/templates/init.js';
 const entries=Object.entries(ROUTES),imports=entries.map(([,dir],i)=>`import * as r${i} from './apps/web/app/api/${dir}/route.ts';`).join('');
 const table=entries.map(([path],i)=>`${JSON.stringify(path)}:r${i}`).join(',');
 const app=await build({stdin:{contents:`import {runWithCloudflareRequestContext} from ${JSON.stringify(productionInit)};${imports}const routes={${table}};export default {fetch(request,env,ctx){const route=routes[new URL(request.url).pathname];if(!route||typeof route[request.method]!=='function')return new Response('Not served by the service-rows harness.',{status:404,headers:{'cache-control':'no-store'}});return runWithCloudflareRequestContext(request,env,ctx,()=>route[request.method](request));}}`,resolveDir:root},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',external:['node:*'],alias:{'server-only':root+'apps/web/node_modules/next/dist/compiled/server-only/empty.js','@opennextjs/cloudflare':root+'apps/web/node_modules/@opennextjs/cloudflare/dist/api/cloudflare-context.js'},define:{__BUILD_TIMESTAMP_MS__:'0',__NEXT_BASE_PATH__:'""',__ASSETS_RUN_WORKER_FIRST__:'false',__TRAILING_SLASH__:'false',__DEPLOYMENT_ID__:'"fixture"','process.env.NODE_ENV':'"production"'},plugins:[{name:'generated-env-fixture',setup(b){b.onResolve({filter:/next-env\.mjs$/},()=>({path:'next-env',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const production={};',loader:'js'}));}}]});
 const worker=path=>build({entryPoints:[root+path],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',external:['cloudflare:workers']}).then(r=>r.outputFiles[0].text);
 const [market,food]=await Promise.all([worker('workers/market-coordinator/worker.ts'),worker('workers/food-lookup/worker.mjs')]);
 bundled={app:app.outputFiles[0].text,market,food};return bundled;
}
// ---------------------------------------------------------------- re-basing recorded time
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
/** Every ISO time (except the chain's "never" values) and every CoinGecko `last_updated_at` moved by `delta` ms. */
export function rebase(value,delta,key=''){
 if(typeof value==='string')return ISO.test(value)&&!value.startsWith('1970-01-01')&&!value.startsWith('0001-01-01')?new Date(Date.parse(value)+delta).toISOString():value;
 if(typeof value==='number')return key==='last_updated_at'?value+Math.round(delta/1000):value;
 if(Array.isArray(value))return value.map(v=>rebase(v,delta));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,rebase(v,delta,k)]));
 return value;
}
const json=(body,init={})=>new Response(typeof body==='string'?body:JSON.stringify(body),{...init,headers:{'content-type':'application/json; charset=utf-8',...init.headers}});
const DAY=86400000;
// ---------------------------------------------------------------- upstream stubs
function upstreams(fx,state,clock){
 const calls=[],refused=[];
 const refuse=(worker,url,why)=>{refused.push({worker,host:url.host,path:url.pathname+url.search,why});throw new Error(`service-rows harness refused ${url.origin}${url.pathname}: ${why}`);};
 const seen=(worker,url)=>calls.push({worker,host:url.host,path:url.pathname+url.search});
 const delta=recordedAt=>clock()-Date.parse(recordedAt);
 const logoPaths=new Set([...fx.markets.usd,...fx.rwas.body].map(row=>new URL(row.image).pathname));
 const png=Buffer.from(fx.logo.base64,'base64');
 function coingecko(request){
  const url=new URL(request.url),q=url.searchParams,p=url.pathname,ids=(q.get('ids')??'').split(',').filter(Boolean);
  if(url.origin!=='https://api.coingecko.com')return refuse('market',url,'host not recorded');
  if(request.headers.get('cookie')||request.headers.get('authorization'))return refuse('market',url,'credentials sent');
  if(p==='/api/v3/simple/price'){
   const price=state.variant===2?fx.priceV2:fx.priceV1,currencies=(q.get('vs_currencies')??'').split(',').filter(Boolean),body={};
   for(const id of ids){const row=price.body[id];if(!row)continue;body[id]={...Object.fromEntries(currencies.filter(c=>c in row).map(c=>[c,row[c]])),...(q.get('include_last_updated_at')==='true'?{last_updated_at:row.last_updated_at}:{})};}
   seen('market',url);return json(rebase(body,delta(price.recordedAt)));
  }
  if(p==='/api/v3/coins/markets'){
   const rows=fx.markets[q.get('vs_currency')??''];if(!rows)return refuse('market',url,'currency not recorded');
   const changes=(q.get('price_change_percentage')??'').split(',').filter(Boolean);
   const body=rows.filter(r=>ids.includes(r.id)).map(r=>Object.fromEntries(Object.entries(r).filter(([k])=>k==='sparkline_in_7d'?q.get('sparkline')==='true':/_in_currency$/.test(k)?changes.some(c=>k===`price_change_percentage_${c}_in_currency`):true)));
   seen('market',url);return json(rebase(body,delta(fx.markets.recordedAt)));
  }
  if(p==='/api/v3/rwas/markets'){
   const body=fx.rwas.body.filter(r=>ids.includes(r.id)).map(r=>q.get('sparkline')==='true'?r:{...r,tokenized_market_data:Object.fromEntries(Object.entries(r.tokenized_market_data).filter(([k])=>k!=='sparkline_in_7d'))});
   seen('market',url);return json(rebase(body,delta(fx.rwas.recordedAt)));
  }
  if(p==='/api/v3/coins/list'){if(q.get('include_platform')!=='true')return refuse('market',url,'only include_platform=true is recorded');seen('market',url);return json(fx.coinsList.body);}
  if(p==='/api/v3/rwas/list'){seen('market',url);return json(fx.rwasList.body);}
  const chart=/^\/api\/v3\/coins\/([a-z0-9_-]+)\/market_chart$/.exec(p);
  if(chart){
   const recorded=fx.chart.series[chart[1]],days=Number(q.get('days'));
   if(!recorded||q.get('vs_currency')!=='usd'||!Number.isInteger(days)||days<1)return refuse('market',url,'history not recorded for this coin/currency');
   const points=days<=90&&recorded.hourly?recorded.hourly:recorded.daily,end=points[points.length-1][0],d=delta(fx.chart.recordedAt);
   seen('market',url);return json({prices:points.filter(([at])=>at>=end-days*DAY).map(([at,price])=>[at+d,price])});
  }
  return refuse('market',url,'path not recorded');
 }
 function app(request){
  const url=new URL(request.url);
  if(url.protocol==='https:'&&['coin-images.coingecko.com','assets.coingecko.com'].includes(url.host)){
   seen('app',url);
   return logoPaths.has(url.pathname)?new Response(png,{headers:{'content-type':fx.logo.contentType,'content-length':String(png.byteLength)}}):new Response('Not Found',{status:404,headers:{'content-type':'text/plain'}});
  }
  const chain={'api.zigchain.com':'zigchain-1','testnet-api.zigchain.com':'zig-test-2'}[url.host];
  if(url.protocol==='https:'&&chain){
   if(request.method!=='GET')return refuse('app',url,'LCD reads are GET only');
   const recorded=fx.lcd.routes[url.pathname+url.search];if(!recorded)return refuse('app',url,'LCD path not recorded');
   const asked=request.headers.get('x-cosmos-block-height');if(asked!==null&&asked!==fx.lcd.height)return refuse('app',url,'asked for another block height');
   const {__status:status=200,...body}=recorded;
   seen('app',url);return json(rebase(JSON.parse(JSON.stringify(body).replaceAll('{chain}',chain)),delta(fx.lcd.recordedAt)),{status,headers:{'x-cosmos-block-height':fx.lcd.height}});
  }
  return refuse('app',url,'host not recorded');
 }
 function food(request){
  const url=new URL(request.url),code=/^\/api\/v3\.4\/product\/(\d{8,14})$/.exec(url.pathname)?.[1];
  if(url.origin!=='https://world.openfoodfacts.org'||!code)return refuse('food',url,'host or path not recorded');
  if(!/^ZIGoals\//.test(request.headers.get('user-agent')??''))return refuse('food',url,'no ZIGoals User-Agent');
  seen('food',url);
  return code===fx.food.body.code?json(fx.food.body):json({code,errors:[{message:{id:'not_found',name:'Not found'},field:{id:'code',value:code}}],result:{id:'product_not_found',name:'Product not found'},status:'failure'},{status:404});
 }
 return {calls,refused,coingecko,app,food};
}
// ---------------------------------------------------------------- topology
// The existing run11 fixture policy scaled up 100x for the monthly figures and 10x per minute: one replay client (one
// cf-connecting-ip) loads quotes, insights, details, history and the catalog within a minute, and the coordinator's fair
// per-client shares (lib/server/market-client-limits.ts: a quarter of the minute, a 31st of the month per day) must not
// refuse it. The limits themselves are covered by scripts/run11/market-*-policy tests, not here.
const POLICY={policy:{providerMinuteLimit:1000,providerMonthlyLimit:100000,operating:{minute:900,monthly:90000},monitoringReserve:{minute:20,monthly:2000},monitoringMaximum:{minute:30,monthly:3000},optionalCeiling:{minute:800,monthly:80000},concurrent:2,queueLimit:16,reservationMs:20000,ownershipMs:10000},calendar:{timeZone:'UTC',confirmed:true},quoteCost:3,operationCosts:{catalog:2,history:4,insights:5,token:6,rwa:7},leaseMs:20000,maxAttempts:128,maxWorks:64};
async function packagedApp(bundlePath){
 // Loaded only for a bundle (it uses import.meta, which a Playwright-compiled import cannot).
 const {unstable_getMiniflareWorkerOptions}=requireTool('wrangler'),{hermeticWorkerOptions}=await import('../hermetic-wrangler.mjs');
 const config=hermeticWorkerOptions(unstable_getMiniflareWorkerOptions,resolve(root,'apps/web/wrangler.run11.local.jsonc')).workerOptions;
 return {script:await readFile(bundlePath,'utf8'),name:'zigoals-run11-local',compatibilityDate:config.compatibilityDate,compatibilityFlags:config.compatibilityFlags,assets:config.assets,bindings:config.bindings};
}
/**
 * Starts the topology and its HTTP origin.
 * @param {{clock?:()=>number,port?:number,bundle?:string|null,clientIp?:string}} [options]
 *  clock: re-bases fixture time (see above); port: 0 picks a free one; bundle: an OpenNext worker.js to serve app pages
 *  too (default process.env.RUN11_PACKAGE_BUNDLE; null: never); clientIp: the cf-connecting-ip every request carries.
 */
export async function start({clock=Date.now,port=0,bundle=process.env.RUN11_PACKAGE_BUNDLE,clientIp='192.0.2.10'}={}){
 const [code,fx]=await Promise.all([serviceRowBundles(),loadFixtures()]);
 const state={variant:1},stub=upstreams(fx,state,clock),packaged=bundle?await packagedApp(bundle):null;
 const appName=packaged?packaged.name:'app';
 const options=()=>convertV4MiniflareOptions({workers:[
  packaged?{...packaged,modules:true,serviceBindings:{WORKER_SELF_REFERENCE:{name:appName},MARKET_QUOTES:{name:'market',entrypoint:'QuoteService'},FOOD_LOOKUP:{name:'food'}},outboundService:stub.app}
   :{name:appName,modules:true,script:code.app,compatibilityDate:'2026-09-13',compatibilityFlags:['nodejs_compat'],bindings:{ZIGOALS_MARKET_QUOTES_MODE:'durable-v1'},serviceBindings:{MARKET_QUOTES:{name:'market',entrypoint:'QuoteService'},FOOD_LOOKUP:{name:'food'}},outboundService:stub.app},
  {name:'market',modules:true,script:code.market,compatibilityDate:'2026-09-13',durableObjects:{MARKETS:{className:'MarketAccount',useSQLite:true}},bindings:{MARKET_ACCOUNT_ID:'service-rows',MARKET_QUOTE_DISPATCH:'durable-v1',MARKET_POLICY:JSON.stringify(POLICY),COINGECKO_DEMO_API_KEY:'fixture-key'},outboundService:stub.coingecko},
  {name:'food',modules:true,script:code.food,compatibilityDate:'2026-09-13',durableObjects:{FOOD_BUDGET:{className:'FoodBudget',useSQLite:true}},bindings:{FOOD_USER_AGENT:'ZIGoals/service-rows-fixture (fixture@example.invalid)'},outboundService:stub.food},
 ]});
 let mf=new Miniflare(options());await mf.ready;
 const server=createServer(async(req,res)=>{
  try{
   const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);
   const headers=Object.fromEntries(Object.entries(req.headers).filter(([k])=>!['host','connection','content-length','cf-connecting-ip'].includes(k)));
   const response=await mf.dispatchFetch('https://zigoals.test'+req.url,{method:req.method,headers:{...headers,'cf-connecting-ip':clientIp},...(body.length?{body}:{}),redirect:'manual'});
   res.statusCode=response.status;for(const [name,value] of response.headers)if(!['content-length','transfer-encoding','content-encoding','set-cookie'].includes(name))res.setHeader(name,value);
   const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('set-cookie',cookies);
   res.end(Buffer.from(await response.arrayBuffer()));
  }catch(error){res.statusCode=502;res.end(String(error?.message??error));}
 });
 await new Promise(ok=>server.listen(port,'127.0.0.1',ok));
 const origin=`http://127.0.0.1:${server.address().port}`;
 return {
  origin,fixtures:fx,calls:stub.calls,refused:stub.refused,servesPages:!!packaged,
  /** Upstream hosts answered so far, per Worker. */
  hosts:()=>Object.fromEntries(['app','market','food'].map(w=>[w,[...new Set(stub.calls.filter(c=>c.worker===w).map(c=>c.host))].sort()])),
  /**
   * Switch the recorded /simple/price answer (1 or 2) for the drift rows. The coordinator keeps a verified quote until
   * its observation is 15 minutes old, so the Workers restart with empty state (as when that cached quote expires):
   * the next load reads the provider again. The origin URL stays the same.
   */
  async setQuoteVariant(n){if(![1,2].includes(n))throw Error('Recorded variants are 1 and 2.');state.variant=n;const old=mf;mf=new Miniflare(options());await mf.ready;await old.dispose();},
  async stop(){await new Promise(ok=>server.close(()=>ok()));await mf.dispose();},
 };
}
// `node scripts/run11/service-rows/harness.mjs [port]` keeps the origin up for a manual or browser replay.
// No top-level await: Playwright specs import this module too (apps/web/tests/ap/service-rows.spec.ts).
if(/[\\/]service-rows[\\/]harness\.mjs$/.test(process.argv[1]??'')){
 void start({port:Number(process.argv[2]??3190)}).then(h=>{
  console.log(`service-rows harness: ${h.origin}/api/* (pages: ${h.servesPages?'served from the OpenNext bundle':'not served; forward /api/** here with page.route'})`);
  process.on('SIGINT',()=>{console.log('upstream calls:',h.calls.length,'refused:',h.refused.length);void h.stop().then(()=>process.exit(0));});
 });
}
