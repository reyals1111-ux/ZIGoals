import {createRequire} from 'node:module';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url));
const {build}=require('esbuild');
const root=new URL('../../',import.meta.url).pathname;
// Exercise the installed production AsyncLocalStorage wrapper and loader, together
// with real route modules. Only build-time constants and Next's generated env file
// are fixtures; the binding/runtime implementation is the installed OpenNext source.
export async function marketRuntimeBundles(){
 const productionInit=root+'apps/web/node_modules/@opennextjs/cloudflare/dist/cli/templates/init.js';
 const app=await build({stdin:{contents:`import {runWithCloudflareRequestContext} from ${JSON.stringify(productionInit)};import * as cancel from './apps/web/app/api/market-quotes/cancel/route.ts';import * as quotes from './apps/web/app/api/market-quotes/route.ts';import * as catalog from './apps/web/app/api/market-assets/route.ts';import * as history from './apps/web/app/api/market-history/route.ts';import * as insights from './apps/web/app/api/market-insights/route.ts';const routes={'/api/market-quotes/cancel':cancel,'/api/market-quotes':quotes,'/api/market-assets':catalog,'/api/market-history':history,'/api/market-insights':insights};export default {fetch(request,env,ctx){return runWithCloudflareRequestContext(request,env,ctx,()=>routes[new URL(request.url).pathname][request.method](request));}}`,resolveDir:root},bundle:true,write:false,format:'esm',platform:'node',target:'es2022',external:['node:*'],alias:{'server-only':root+'apps/web/node_modules/next/dist/compiled/server-only/empty.js','@opennextjs/cloudflare':root+'apps/web/node_modules/@opennextjs/cloudflare/dist/api/cloudflare-context.js'},define:{__BUILD_TIMESTAMP_MS__:'0',__NEXT_BASE_PATH__:'""',__ASSETS_RUN_WORKER_FIRST__:'false',__TRAILING_SLASH__:'false',__DEPLOYMENT_ID__:'"fixture"','process.env.NODE_ENV':'"production"'},plugins:[{name:'generated-env-fixture',setup(build){build.onResolve({filter:/next-env\.mjs$/},()=>({path:'next-env',namespace:'fixture'}));build.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const production={};',loader:'js'}));}}]});
 const market=await build({entryPoints:[root+'workers/market-coordinator/worker.ts'],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',external:['cloudflare:workers']});
 const client=await build({entryPoints:[root+'apps/web/lib/market-quote-client.ts'],bundle:true,write:false,format:'iife',globalName:'MarketClient',platform:'browser',target:'es2022'});
 return {client:client.outputFiles[0].text,app:app.outputFiles[0].text,market:market.outputFiles[0].text};
}
