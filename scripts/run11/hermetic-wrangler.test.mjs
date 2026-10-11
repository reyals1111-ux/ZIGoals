import {afterEach,expect,test} from 'vitest';
import {createRequire} from 'node:module';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import JSON5 from 'json5';
import {hermeticWorkerOptions} from './hermetic-wrangler.mjs';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url));
const {unstable_getMiniflareWorkerOptions}=require('wrangler');
const root=resolve(import.meta.dirname,'../..');
// Dummy developer files in a temporary directory only; a real .env.local is never read.
const PROBE='HERMETIC_PROBE_NOT_A_SECRET';
async function project(files){
 const dir=await mkdtemp(join(tmpdir(),'hermetic-wrangler-'));
 await writeFile(join(dir,'worker.js'),'export default {fetch(){return new Response("ok");}};');
 await writeFile(join(dir,'wrangler.jsonc'),JSON.stringify({name:'hermetic-probe',main:'worker.js',compatibility_date:'2026-09-13',vars:{PUBLIC_VALUE:'from-config'}}));
 for(const [name,content] of Object.entries(files))await writeFile(join(dir,name),content);
 return join(dir,'wrangler.jsonc');
}
const bindings=options=>options.workerOptions.bindings??{};
const saved=process.env.CLOUDFLARE_INCLUDE_PROCESS_ENV;
afterEach(()=>{delete process.env[PROBE];if(saved===undefined)delete process.env.CLOUDFLARE_INCLUDE_PROCESS_ENV;else process.env.CLOUDFLARE_INCLUDE_PROCESS_ENV=saved;});

for(const file of ['.env.local','.env','.dev.vars'])
test(`a developer ${file} beside the config reaches a plain load but not the hermetic one`,async()=>{
 const config=await project({[file]:`${PROBE}=dummy-value\n`});
 expect(bindings(unstable_getMiniflareWorkerOptions(config)),'wrangler loads it by default').toHaveProperty(PROBE);
 const hermetic=bindings(hermeticWorkerOptions(unstable_getMiniflareWorkerOptions,config));
 expect(hermetic).not.toHaveProperty(PROBE);expect(hermetic).toEqual({PUBLIC_VALUE:'from-config'});
});

test('a shell that sets CLOUDFLARE_INCLUDE_PROCESS_ENV does not leak process.env into the hermetic load',async()=>{
 const config=await project({});process.env[PROBE]='dummy-value';process.env.CLOUDFLARE_INCLUDE_PROCESS_ENV='true';
 expect(bindings(unstable_getMiniflareWorkerOptions(config))).toHaveProperty(PROBE);
 expect(bindings(hermeticWorkerOptions(unstable_getMiniflareWorkerOptions,config))).not.toHaveProperty(PROBE);
 expect(process.env.CLOUDFLARE_INCLUDE_PROCESS_ENV,'the caller environment is restored').toBe('true');
});

test('the run11 app template loads with exactly the vars it declares',async()=>{
 const config=resolve(root,'apps/web/wrangler.run11.local.jsonc'),declared=Object.keys(JSON5.parse(await readFile(config,'utf8')).vars??{});
 expect(Object.keys(bindings(hermeticWorkerOptions(unstable_getMiniflareWorkerOptions,config))).sort()).toEqual(declared.sort());
});

test('the Alpha preview used by the Workers security gate loads only the empty env file',async()=>{
 const script=JSON.parse(await readFile(resolve(root,'apps/web/package.json'),'utf8')).scripts['preview:alpha'],files=[...script.matchAll(/--env-file (\S+)/g)].map(m=>resolve(root,'apps/web',m[1]));
 expect(files).toEqual([resolve(root,'scripts/run11/fixtures/no-local-secrets.env')]);
});
