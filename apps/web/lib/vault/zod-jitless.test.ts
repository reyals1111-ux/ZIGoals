import {afterAll,expect,test,vi} from 'vitest';
import {z} from 'zod';
import {powerUserRecords} from './power-user-fixture';

// QA-25: zod probes `new Function` when the first object schema is built; the app's CSP blocks it, which reports a
// CSP violation on every page. zod-jitless.ts sets `jitless` before any schema exists. That only changes which object
// parser runs: the compiled fast path (JIT, used where eval is allowed: Node and `next dev`) or the interpreted one
// (used in production browsers already, since the CSP makes the probe fail). This compares the two on the same inputs,
// using two separately built copies of every stored-data schema, like Session C's version comparison.
type Schemas=Record<string,z.ZodType>;
async function load():Promise<Schemas>{
 const [{modules},{localSimulationSchema},crypto,{syncStateSchema,rowSchema,confirmationSchema},shared,{financialEventSchema},{deviceRecordSchema},{aiSettingsSchema},{chatSchema},{sealedKeySchema}]=await Promise.all([import('./account-data'),import('./local-simulation-backup'),import('./crypto'),import('./cloud-sync'),import('@zigoals/shared-types'),import('../financial-events'),import('./device-unlock'),import('../ai/settings'),import('../ai/chats'),import('../ai/keys')]);
 // Session W: every new device record's schema and the sealed sign-in tokens.
 const [{W_DEVICE_RECORDS},links]=await Promise.all([import('../w-device-records'),import('../links/token-store')]);
 const w=Object.fromEntries(W_DEVICE_RECORDS.map(r=>[`w:${r.key}`,r.schema as z.ZodType]));
 return {finance:modules.finance.schema,habits:modules.habits.schema,health:modules.health.schema,settings:modules.settings.schema,localSimulation:localSimulationSchema,manifest:crypto.manifestSchema,envelope:crypto.envelopeSchema,recordContext:crypto.recordContextSchema,syncState:syncStateSchema,syncRow:rowSchema,syncConfirmation:confirmationSchema,goalBackup:shared.backupSchema,goalMetadata:shared.metadataSchema,financialEvent:financialEventSchema,deviceRecord:deviceRecordSchema,sealedRoot:crypto.sealedRootSchema,aiSettings:aiSettingsSchema,aiChat:chatSchema,aiSealedKey:sealedKeySchema,...w,linkSealedTokens:links.sealedTokensSchema,linkTokens:links.linkTokensSchema};
}
const realFunction=globalThis.Function;let compiled=0;
const counting=new Proxy(realFunction,{construct(target,args,newTarget){compiled++;return Reflect.construct(target,args,newTarget);}});
afterAll(()=>{globalThis.Function=realFunction;z.config({jitless:false});});
// Issues as a user or caller sees them; `input` is never reported (no reportInput).
// A refinement that throws (rather than reporting an issue) is an outcome too and must match.
const outcome=(schema:z.ZodType,value:unknown)=>{let r;try{r=schema.safeParse(value);}catch(error){return {ok:false,threw:String(error)};}return r.success?{ok:true,data:r.data}:{ok:false,issues:r.error.issues.map(i=>({code:i.code,path:i.path,message:i.message}))};};

function* paths(value:unknown,path:(string|number)[]=[],budget={left:1000}):Generator<(string|number)[]>{
 if(budget.left--<=0)return;yield path;
 if(Array.isArray(value))for(const [i,item] of value.slice(0,3).entries())yield* paths(item,[...path,i],budget);
 else if(value&&typeof value==='object')for(const [k,item] of Object.entries(value))yield* paths(item,[...path,k],budget);
}
const at=(doc:unknown,path:(string|number)[])=>path.reduce<unknown>((v,k)=>(v as Record<string|number,unknown>)?.[k],doc);
function replace(doc:unknown,path:(string|number)[],next:unknown){
 if(!path.length)return next;const copy=structuredClone(doc) as Record<string|number,unknown>,parent=at(copy,path.slice(0,-1)) as Record<string|number,unknown>,key=path.at(-1)!;
 if(next===DELETE){if(Array.isArray(parent))parent.splice(key as number,1);else delete parent[key];}else parent[key]=next;return copy;
}
const DELETE=Symbol('delete');
/** The document itself, then each reachable node removed or replaced by values of other types, plus an unknown key on each object. */
function* cases(doc:unknown):Generator<unknown>{
 yield doc;
 for(const path of paths(doc)){
  const value=at(doc,path);
  for(const next of [DELETE,null,'',0,-1,1.5,2**53,true,'not-a-date','x'.repeat(3000),[],{},typeof value==='string'?value+'x':typeof value==='number'?value*1000:'X'])if(path.length||next!==DELETE)yield replace(doc,path,next);
  if(value&&typeof value==='object'&&!Array.isArray(value))yield replace(doc,path,{...value,unexpectedField:1});
 }
}
/** Arrays trimmed to three items keep each mutated document small; the full documents are parsed unchanged too. */
const trimmed=(value:unknown):unknown=>Array.isArray(value)?value.slice(0,3).map(trimmed):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,trimmed(v)])):value;

test('JIT-compiled and jitless parsers agree on every stored-data schema: acceptance, output and issues',async()=>{
 const jit=await load();
 z.config({jitless:true});vi.resetModules();const jitless=await load();z.config({jitless:false});
 const {buildShowcase}=await import('../showcase-data'),{financeV4,habitsV3,healthV2,settingsV2,financeV5,healthV4,settingsV3,ACCOUNT}=await import('./format-fixtures'),{createVault,sealRecord,createDeviceKey,unlockVaultForDevice,manifestDigest}=await import('./crypto'),{modules}=await import('./account-data');
 const showcase=buildShowcase('2026-10-01').records,power=powerUserRecords().records,vault=await createVault(crypto.randomUUID());
 const context={vault:vault.manifest.vault,domain:'habits' as const,object:crypto.randomUUID(),revision:1,epoch:1};
 // Session M (ADR-008): the remembered-device record, without its CryptoKey (checked separately).
 const account='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',{sealed}=await unlockVaultForDevice(vault.manifest,vault.recovery,account,await createDeviceKey());
 const device={version:1,account,vault:vault.manifest.vault,epoch:1,manifest:await manifestDigest(vault.manifest),session:crypto.randomUUID(),health:true,createdAt:'2026-10-02T20:00:00.000Z',sealed};
 const plans={schemaVersion:1,chainId:'local-simulation',walletAddress:'local-demo-user',goals:{'1':{name:'Trip',category:'Travel',targetValue:'1200',currency:'ZIG',targetDate:'2027-09-15',startingAmount:'0',monthlyContribution:'50',riskPreference:'Conservative',liquidityPreference:'Anytime',deadlineFlexible:false,notes:''}}};
 const seeds:Record<string,unknown[]>={
  // Session P: the fourth seed of each module is the version read ahead of its writer (finance v4, habits v3, health v2, settings v2).
  finance:[modules.finance.empty(),JSON.parse(showcase['zigoals:platform:v1']!),JSON.parse(power['zigoals:platform:v1']!),financeV4(),financeV5()],
  habits:[modules.habits.empty(),JSON.parse(showcase['zigoals:habits:v1']!),JSON.parse(power['zigoals:habits:v1']!),habitsV3()],
  health:[modules.health.empty(),JSON.parse(showcase['zigoals:health:v1']!),JSON.parse(power['zigoals:health:v1']!),healthV2(),healthV4()],
  // Session W: each module's newest version (finance v5 read only; Health v4 and settings v3 written lazily).
  settings:[modules.settings.empty(),settingsV2(),settingsV3()],
  localSimulation:[{schemaVersion:1,kind:'zigoals-local-simulation',ledger:null,plans:JSON.stringify(plans)},{schemaVersion:1,kind:'zigoals-local-simulation',omitted:'damaged'}],
  manifest:[vault.manifest],envelope:[await sealRecord(vault.key,context,{fixture:'jitless'}),vault.manifest.wrapped],recordContext:[context],
  syncState:[{version:1,base:{},revision:0,headRevision:0,headDigest:null,pending:null}],
  syncRow:[{id:crypto.randomUUID(),domain:'habits',revision:1,epoch:1,envelope:vault.manifest.wrapped,deleted:false}],
  syncConfirmation:[{version:1,operation:crypto.randomUUID(),headRevision:1,headDigest:'a'.repeat(64),base:{finance:'b'.repeat(64),settings:'c'.repeat(64)}}],
  goalBackup:[plans],goalMetadata:[plans.goals['1']],
  financialEvent:[{id:'valuation',portfolioId:'statement',occurredAt:'2026-01-01T00:00:00Z',recordedAt:'2026-09-23T10:00:00Z',source:'MANUAL',sourceLabel:'Fictional complete statement',note:'',kind:'valuation',amount:{value:'10000',decimals:2,currency:'USD'},role:'boundary'},
   {id:'deposit',portfolioId:'statement',occurredAt:'2026-02-01T00:00:00Z',recordedAt:'2026-09-23T10:00:00Z',source:'MANUAL',sourceLabel:'Fictional complete statement',note:'',kind:'external_flow',direction:'IN',amount:{value:'5000',decimals:2,currency:'USD'}}],
  deviceRecord:[device],sealedRoot:[sealed],
  // Session T (ADR-012): ZIGi's device key, a conversation and a sealed provider key (the fake key is never stored: only its ciphertext shape).
  aiSettings:[{version:1,enabled:false,mode:null,provider:null,model:null,localServer:null,baseUrl:null,subscriptionApp:null,rememberKey:false,pageShare:{today:true,goals:true,habits:true,health:false,wealth:true,help:true},includeHealth:false,customInstructions:'',contextBudgetTokens:6000,maxOutputTokens:1024,launcherHidden:false,voice:{transcription:'off',transcriptionModel:null,language:null,readAloud:false}},
   {version:1,enabled:true,mode:'local',provider:'local',model:'mock-llama:8b',localServer:'ollama',baseUrl:'http://127.0.0.1:11434',subscriptionApp:null,rememberKey:true,pageShare:{today:true,goals:false,habits:true,health:true,wealth:true,help:true},includeHealth:true,customInstructions:'Be brief.',contextBudgetTokens:8000,maxOutputTokens:512,launcherHidden:true,voice:{transcription:'browser',transcriptionModel:null,language:'en-GB',readAloud:true},connectedOn:'2026-10-04'}],
  aiChat:[{version:1,id:'c1',scope:'local',title:'Water today',provider:'openai',model:'mock-chat-1',createdAt:'2026-10-04T10:00:00.000Z',updatedAt:'2026-10-04T10:01:00.000Z',turns:[{id:'t1',role:'user',text:'How much water today?',at:'2026-10-04T10:00:00.000Z'},{id:'t2',role:'assistant',text:'MOCK answer',at:'2026-10-04T10:01:00.000Z',provider:'openai',model:'mock-chat-1',usage:{input:10,output:2},stopped:'output cap'}]}],
  aiSealedKey:[{version:1,scope:'local',provider:'openai',iv:'A'.repeat(16),ciphertext:'B'.repeat(44),createdAt:'2026-10-04T10:00:00.000Z'}],
  // Session W's device records (fictional values) and a sealed sign-in (only its ciphertext shape; no real token anywhere).
  'w:zigoals:accounts:v1':[{version:1,items:[ACCOUNT,{id:'1f2e3d4c-5b6a-4978-8a1b-2c3d4e5f6a7b',kind:'loan',name:'Car loan',currency:'EUR',ratePercent:'4.25',snapshots:[{id:'2a3b4c5d-6e7f-4a8b-9c0d-1e2f3a4b5c6d',date:'2026-09-01',value:'800000',decimals:2}],payments:[{id:'3b4c5d6e-7f8a-4b9c-8d0e-1f2a3b4c5d6e',date:'2026-09-15',value:'25000',decimals:2,note:'September'}],createdAt:'2026-09-01T10:00:00.000Z',updatedAt:'2026-09-15T10:00:00.000Z'}]}],
  'w:zigoals:milestone-dates:v1':[{version:1,dates:{'1':{m1:'2026-12-01',m2:'2027-03-01'}}}],
  'w:zigoals:import-batches:v1':[{version:1,batches:[{id:'4c5d6e7f-8a9b-4c0d-9e1f-2a3b4c5d6e7f',format:'apple-health',label:'Apple Health export',at:'2026-10-05T09:00:00.000Z',counts:{sleep:1,vitals:2},summarised:['Heart rate: one summary per day'],refs:{health:{sleep:['health_sleep-apple-health-0a1b2c3d'],vitals:['health_vital-apple-health-2026-10-01']},habits:{habitIds:[],entries:[]}}}]}],
  'w:zigoals:w-reminders:v1':[{version:1,windDown:{time:'22:00'},meditation:{time:'07:30'},chained:{'5d6e7f8a-9b0c-4d1e-8f2a-3b4c5d6e7f8a':true},contributions:{'1':{time:'09:00'}},dismissed:{'wind-down':'2026-10-01'}}],
  'w:zigoals:chess-cache:v1':[{version:1,snapshots:[{site:'lichess',control:'blitz',rating:1500,at:'2026-10-05T09:00:00.000Z'}],games:[{site:'lichess',id:'abcd1234',url:'https://lichess.org/abcd1234',endedAt:'2026-10-04T20:00:00.000Z',control:'blitz',color:'white',result:'win',opponentRating:1480,opening:'Italian Game',timeControl:'180+2',rated:true}],etags:{'https://lichess.org/api/user/fixture_player':{etag:'"fixture"',at:'2026-10-05T09:00:00.000Z'}},fetchedAt:{lichess:'2026-10-05T09:00:00.000Z'}}],
  'w:zigoals:celebrations:v1':[{version:1,seen:{'milestone:1:m1':'2026-10-01'}}],
  'w:zigoals:meditation-run:v1':[{version:1,run:{startedAt:'2026-10-05T07:00:00.000Z',plannedSec:600,pausedMs:0,kind:'breathing',pattern:'box',moodBefore:3}},{version:1,run:null}],
  'w:zigoals:music:v1':[{version:1,source:'ambient',mini:true,volume:40,ambient:{sound:'rain',timerMin:30,stopOnHide:true}}],
  'w:zigoals:pages-view:v1':[{version:1,hidden:['chess','music'],start:'health'}],
  linkSealedTokens:[{version:1,scope:'local',service:'spotify',iv:'A'.repeat(16),ciphertext:'B'.repeat(44),createdAt:'2026-10-05T09:00:00.000Z'}],
  linkTokens:[{accessToken:'FAKE-ACCESS',refreshToken:'FAKE-REFRESH',expiresAt:'2026-10-05T10:00:00.000Z',scope:'user-read-playback-state'}],
 };
 const counts:Record<string,{cases:number;accepted:number;threw:number}>={};let total=0;
 globalThis.Function=counting;
 try{
  for(const [name,docs] of Object.entries(seeds)){
   counts[name]={cases:0,accepted:0,threw:0};
   for(const [index,doc] of docs.entries()){
    const inputs=index===2?[doc]:[...cases(trimmed(doc)),...(index?[doc]:[])];
    for(const input of inputs){
     const a=outcome(jit[name]!,input),b=outcome(jitless[name]!,input);
     expect(b,`${name} #${counts[name].cases}`).toEqual(a);
     counts[name].cases++;counts[name].accepted+=a.ok?1:0;counts[name].threw+='threw' in a?1:0;total++;
    }
   }
  }
  // The JIT copies compiled parsers; the jitless copies never construct a Function.
  const before=compiled;for(const name of Object.keys(seeds))for(const doc of seeds[name]!)jitless[name]!.safeParse(doc);expect(compiled).toBe(before);
  expect(before).toBeGreaterThan(0);
 }finally{globalThis.Function=realFunction;}
 expect(total).toBeGreaterThan(5000);
 // Both outcomes are well represented: valid documents and refusals.
 for(const name of Object.keys(seeds))expect(counts[name]!.accepted,name).toBeGreaterThan(0);
 console.log('zod jitless equivalence',total,JSON.stringify(counts));
},120000);

test('the client init turns the JIT off and runs first: instrumentation-client imports it before anything else',async()=>{
 const {readFileSync}=await import('node:fs');
 const lines=readFileSync(new URL('../../instrumentation-client.ts',import.meta.url),'utf8').split('\n').filter(line=>line.trim()&&!line.trim().startsWith('//'));
 expect(lines[0]).toBe('import "./lib/vault/zod-jitless";');
 z.config({jitless:false});await import('./zod-jitless');expect(z.config().jitless).toBe(true);z.config({jitless:false});
});
