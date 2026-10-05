import {beforeEach,describe,expect,test} from 'vitest';
import {createVault,type VaultManifest} from './crypto';
import {PORTFOLIO_KEY,emptyPortfolioData,type PortfolioData} from '../portfolio/schema';
import {addTransaction,createPortfolio} from '../portfolio/store';
import {PLATFORM_KEY} from '../positions';
import {HABITS_KEY} from '../habits';
import {PORTFOLIO_BASE_KEY,PORTFOLIO_SEALED_MAX,PortfolioTooLarge,canonicalPortfolio,choosePortfolioSync,deletePortfolioCopy,openPortfolio,planPortfolioSync,portfolioCloudSchema,portfolioSyncChosen,readPortfolioBase,sealPortfolio,syncPortfolio,type PortfolioTransport} from './portfolio-sync';
// The Worker's own logic, run over an in-memory Durable Object storage: the client is tested against the real rules.
// @ts-expect-error -- a Worker module in plain JavaScript, type-checked by tsconfig.workers.json, not by this project.
import {PORTFOLIO_BYTES_MAX,portfolioRequest} from '../../../../workers/private-sync/portfolio.mjs';

// Session U Part 9 ([TIER 3] (sync), ADR-013): the opt-in encrypted copy of the Portfolio.
const HASH='a'.repeat(64);
function memoryStorage(){const m=new Map<string,string>();return {get length(){return m.size;},key:(i:number)=>[...m.keys()][i]??null,getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>{m.set(k,String(v));},removeItem:(k:string)=>{m.delete(k);},clear:()=>m.clear()} as Storage;}
const snapshot=(storage:Storage)=>Object.fromEntries(Array.from({length:storage.length},(_,i)=>storage.key(i)!).map(k=>[k,storage.getItem(k)]));
/** A vault object's storage: get/put/delete/list and a transaction over the same map. */
function vaultObject(manifest:VaultManifest){
 const map=new Map<string,unknown>([['manifest',manifest],[`session:${HASH}`,{active:true}]]);
 const store={
  async get(key:string|string[]){if(Array.isArray(key)){const out=new Map();for(const k of key)if(map.has(k))out.set(k,structuredClone(map.get(k)));return out;}return structuredClone(map.get(key));},
  async put(key:string|Record<string,unknown>,value?:unknown){if(typeof key==='string')map.set(key,structuredClone(value));else for(const [k,v] of Object.entries(key))map.set(k,structuredClone(v));},
  async delete(key:string|string[]){for(const k of Array.isArray(key)?key:[key])map.delete(k);},
  async list({prefix=''}:{prefix?:string}={}){return new Map([...map].filter(([k])=>k.startsWith(prefix)).sort(([a],[b])=>a.localeCompare(b)));},
 };
 return {map,state:{storage:{...store,transaction:async(work:(s:typeof store)=>unknown)=>work(store)}}};
}
const validEnvelope=(v:unknown)=>!!v&&typeof v==='object'&&(v as {version?:unknown}).version===2;
const readJSON=async(request:Request)=>JSON.parse(await request.text());
/** A device's transport to that vault object, through the Worker's portfolioRequest. `lose` drops the next write's answer. */
function transport(object:ReturnType<typeof vaultObject>){
 const t={lose:false,writes:0,async call(body?:unknown){const request=new Request('https://vault.internal/v1/portfolio',{method:body?'POST':'GET',headers:{'x-zigoals-token-hash':HASH,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
   const response=await portfolioRequest(request,object.state as never,readJSON,validEnvelope,HASH),data=await response.json();
   if(!response.ok)throw Object.assign(Error(data.error),{status:response.status});return data;}};
 const api:PortfolioTransport={read:()=>t.call(),write:async operation=>{t.writes++;const answer=await t.call(operation);if(t.lose){t.lose=false;throw Error('Network lost the answer.');}return answer;}};
 return Object.assign(t,api);
}
const at='2026-10-05T08:00:00.000Z';
const portfolio=(name='Long term',id='p1')=>createPortfolio(emptyPortfolioData(),{id,name,kind:'real',currency:'EUR',createdAt:at});
const bought=(data:PortfolioData,id:string,quantity='0.5')=>addTransaction(data,data.portfolios[0]!.id,{ref:{provider:'coingecko',kind:'coin',id:'bitcoin'},name:'Bitcoin',symbol:'BTC'},{id,kind:'buy',quantity,price:'60000',date:'2026-10-01',note:'',createdAt:at});
const device=(data?:PortfolioData)=>{const storage=memoryStorage();if(data)storage.setItem(PORTFOLIO_KEY,canonicalPortfolio(data));return storage;};
const portfolioOf=(storage:Storage)=>JSON.parse(storage.getItem(PORTFOLIO_KEY)??'null') as PortfolioData|null;
let vault:Awaited<ReturnType<typeof createVault>>;
beforeEach(async()=>{vault=await createVault();});
const run=(t:PortfolioTransport,storage:Storage,choice?:'keep-device'|'keep-cloud',manifest=vault.manifest,key=vault.key)=>syncPortfolio({transport:t,key,manifest,storage,fence:()=>{},choice});

describe('the plan: three-way on the whole Portfolio',()=>{
 const base=(revision:number,digest:string|null,generation=0,pending?:string)=>({version:1 as const,vault:crypto.randomUUID(),revision,generation,digest,...(pending?{pending}:{})});
 const d=(c:string)=>c.repeat(64);
 const E=d('e');
 test.each([
  ['nothing changed',base(3,d('a')),{digest:d('a'),empty:false},{revision:3,generation:0,digest:d('a'),empty:false,stale:false},'none'],
  ['this device changed',base(3,d('a')),{digest:d('b'),empty:false},{revision:3,generation:0,digest:d('a'),empty:false,stale:false},'push'],
  ['the cloud changed',base(3,d('a')),{digest:d('a'),empty:false},{revision:4,generation:0,digest:d('c'),empty:false,stale:false},'pull'],
  ['the cloud emptied it (every portfolio deleted elsewhere)',base(3,d('a')),{digest:d('a'),empty:false},{revision:4,generation:0,digest:E,empty:false,stale:false},'pull'],
  ['both changed the same way',base(3,d('a')),{digest:d('c'),empty:false},{revision:4,generation:0,digest:d('c'),empty:false,stale:false},'adopt'],
  ['both changed',base(3,d('a')),{digest:d('b'),empty:false},{revision:4,generation:0,digest:d('c'),empty:false,stale:false},'conflict'],
  ['deleted elsewhere',base(3,d('a')),{digest:d('a'),empty:false},{revision:4,generation:1,digest:E,empty:true,stale:false},'deleted'],
  ['a lost answer, then an edit here',base(3,d('a'),0,d('b')),{digest:d('f'),empty:false},{revision:4,generation:0,digest:d('b'),empty:false,stale:false},'push'],
  ['first sync, nothing anywhere',null,{digest:E,empty:true},{revision:0,generation:0,digest:E,empty:true,stale:false},'adopt'],
  ['after that, still nothing',base(0,E),{digest:E,empty:true},{revision:0,generation:0,digest:E,empty:true,stale:false},'none'],
  ['first sync, only here',null,{digest:d('a'),empty:false},{revision:0,generation:0,digest:E,empty:true,stale:false},'push'],
  ['first sync, only in the cloud',null,{digest:E,empty:true},{revision:2,generation:0,digest:d('a'),empty:false,stale:false},'pull'],
  ['first sync, different on both',null,{digest:d('b'),empty:false},{revision:2,generation:0,digest:d('a'),empty:false,stale:false},'conflict'],
  ['older vault key, a Portfolio here',base(3,d('a')),{digest:d('a'),empty:false},{revision:3,generation:0,digest:null,empty:false,stale:true},'push'],
  ['older vault key, none here',null,{digest:E,empty:true},{revision:3,generation:0,digest:null,empty:false,stale:true},'stale'],
  ['an older copy replayed',base(3,d('a')),{digest:d('a'),empty:false},{revision:2,generation:0,digest:d('z'),empty:false,stale:false},'refused'],
  ['an older deletion generation',base(3,d('a'),2),{digest:d('a'),empty:false},{revision:5,generation:1,digest:d('a'),empty:false,stale:false},'refused'],
  ['another copy at the same revision',base(3,d('a')),{digest:d('a'),empty:false},{revision:3,generation:0,digest:d('z'),empty:false,stale:false},'refused'],
 ] as const)('%s',(_,b,local,remote,plan)=>{expect(planPortfolioSync({base:b,local,remote})).toBe(plan);});
});

describe('two devices through the real Worker rules',()=>{
 test('the first device uploads; the second, empty, takes it; nothing else on either device is touched',async()=>{
  const object=vaultObject(vault.manifest),t=transport(object),a=device(bought(portfolio(),'t1')),b=device();
  for(const s of [a,b]){s.setItem(PLATFORM_KEY,'{"finance":"kept"}');s.setItem(HABITS_KEY,'{"habits":"kept"}');}
  // Nothing anywhere yet: the second device records that the cloud has no copy, and is not refused next time.
  expect(await run(t,b)).toEqual({state:'adopted'});expect(readPortfolioBase(b,vault.manifest.vault)?.revision).toBe(0);
  expect(await run(t,b)).toEqual({state:'unchanged'});
  expect(await run(t,a)).toEqual({state:'pushed'});
  expect([...object.map.keys()].filter(k=>k.startsWith('portfolio')).sort()).toEqual(['portfolio','portfolio-part:0',expect.stringMatching(/^portfolio-receipt:/)]);
  expect(JSON.stringify(object.map.get('portfolio-part:0'))).not.toContain('Long term');
  expect(await run(t,b)).toEqual({state:'pulled'});
  expect(portfolioOf(b)).toEqual(portfolioOf(a));
  expect(await run(t,a)).toEqual({state:'unchanged'});expect(await run(t,b)).toEqual({state:'unchanged'});
  for(const s of [a,b]){expect(s.getItem(PLATFORM_KEY)).toBe('{"finance":"kept"}');expect(s.getItem(HABITS_KEY)).toBe('{"habits":"kept"}');}
 });
 test('both changed: the person chooses; keeping the encrypted copy keeps this device\'s Portfolio as a recovery copy',async()=>{
  const object=vaultObject(vault.manifest),t=transport(object),a=device(portfolio()),b=device();
  await run(t,a);await run(t,b);
  a.setItem(PORTFOLIO_KEY,canonicalPortfolio(bought(portfolioOf(a)!,'from-a')));b.setItem(PORTFOLIO_KEY,canonicalPortfolio(bought(portfolioOf(b)!,'from-b','2')));
  expect(await run(t,a)).toEqual({state:'pushed'});
  const before=b.getItem(PORTFOLIO_KEY);
  expect(await run(t,b)).toEqual({state:'conflict'});expect(b.getItem(PORTFOLIO_KEY)).toBe(before);
  expect(await run(t,b,'keep-cloud')).toEqual({state:'pulled'});
  expect(portfolioOf(b)!.portfolios[0]!.transactions.map(x=>x.id)).toEqual(['from-a']);
  expect(Object.entries(snapshot(b)).filter(([k])=>k.startsWith(`${PORTFOLIO_KEY}:recovery:`)).map(([,v])=>v)).toEqual([before]);
  // The other way round: keeping this device's Portfolio replaces the encrypted copy.
  b.setItem(PORTFOLIO_KEY,canonicalPortfolio(bought(portfolioOf(b)!,'from-b-again')));a.setItem(PORTFOLIO_KEY,canonicalPortfolio(bought(portfolioOf(a)!,'from-a-again')));
  await run(t,a);expect(await run(t,b)).toEqual({state:'conflict'});
  expect(await run(t,b,'keep-device')).toEqual({state:'pushed'});
  // A changed nothing since its own upload, so it simply takes the copy B kept.
  expect(await run(t,a)).toEqual({state:'pulled'});expect(portfolioOf(a)).toEqual(portfolioOf(b));
 });
 test('an upload whose answer was lost is recognised by its digest, even after another edit here',async()=>{
  const object=vaultObject(vault.manifest),t=transport(object),a=device(portfolio());
  await run(t,a);a.setItem(PORTFOLIO_KEY,canonicalPortfolio(bought(portfolioOf(a)!,'t1')));
  t.lose=true;await expect(run(t,a)).rejects.toThrow('Network lost the answer.');
  expect(readPortfolioBase(a,vault.manifest.vault)?.pending).toBeTruthy();
  a.setItem(PORTFOLIO_KEY,canonicalPortfolio(bought(portfolioOf(a)!,'t2')));
  expect(await run(t,a)).toEqual({state:'pushed'});
  const b=device();expect(await run(t,b)).toEqual({state:'pulled'});
  expect(portfolioOf(b)!.portfolios[0]!.transactions.map(x=>x.id)).toEqual(['t1','t2']);
 });
 test('a deleted encrypted copy stops every device that synced it, and is never uploaded again without the person',async()=>{
  const object=vaultObject(vault.manifest),t=transport(object),a=device(portfolio()),b=device();
  choosePortfolioSync(b,true);await run(t,a);await run(t,b);
  await deletePortfolioCopy({transport:t,manifest:vault.manifest,storage:a,fence:()=>{}});
  expect([...object.map.keys()].filter(k=>k.startsWith('portfolio-part'))).toEqual([]);
  const writes=t.writes;expect(await run(t,b)).toEqual({state:'deleted'});expect(t.writes).toBe(writes);
  expect(readPortfolioBase(b,vault.manifest.vault)).toBeNull();expect(portfolioOf(b)).toEqual(portfolioOf(a));
  // Ticked again: this device's Portfolio is uploaded as the new copy.
  expect(await run(t,b)).toEqual({state:'pushed'});
  choosePortfolioSync(b,false);expect(portfolioSyncChosen(b)).toBe(false);expect(b.getItem(PORTFOLIO_BASE_KEY)).toBeNull();
 });
 test('after a key rotation the copy left at the old epoch is stale: a device with a Portfolio uploads it again',async()=>{
  const object=vaultObject(vault.manifest),t=transport(object),a=device(portfolio()),b=device();
  await run(t,a);
  const rotated=await createVault(vault.manifest.vault,vault.manifest.epoch+1);object.map.set('manifest',rotated.manifest);
  expect(await run(t,b,undefined,rotated.manifest,rotated.key)).toEqual({state:'stale'});
  expect(await run(t,a,undefined,rotated.manifest,rotated.key)).toEqual({state:'pushed'});
  expect(await run(t,b,undefined,rotated.manifest,rotated.key)).toEqual({state:'pulled'});
  expect(portfolioOf(b)).toEqual(portfolioOf(a));
 });
});

describe('what the parts guarantee',()=>{
 test('a dropped, reordered or replayed part is refused; a Portfolio over the limit is never uploaded',async()=>{
  const text=canonicalPortfolio({version:1,portfolios:[{...portfolio().portfolios[0]!,name:'x'.repeat(80),transactions:[]}]}),long=text+' '.repeat(100_000);
  const parts=await sealPortfolio(vault.key,vault.manifest,5,long);expect(parts).toHaveLength(3);
  const cloud=(p:unknown[],revision=5)=>portfolioCloudSchema.parse({protocol:1,revision,generation:0,epoch:vault.manifest.epoch,parts:p});
  await expect(openPortfolio(vault.key,vault.manifest,cloud(parts.slice(0,2)))).rejects.toThrow('incomplete');
  await expect(openPortfolio(vault.key,vault.manifest,cloud([parts[1],parts[0],parts[2]]))).rejects.toThrow();
  await expect(openPortfolio(vault.key,vault.manifest,cloud(parts,6))).rejects.toThrow();
  const exact=await sealPortfolio(vault.key,vault.manifest,5,text);expect(await openPortfolio(vault.key,vault.manifest,cloud(exact))).toBe(text);
  await expect(sealPortfolio(vault.key,vault.manifest,1,'x'.repeat(48_000*14+1))).rejects.toBeInstanceOf(PortfolioTooLarge);
 });
 test('the limit is the sealed size the Worker keeps: text that grows when sealed is refused here, before any upload',async()=>{
  // A part's text is escaped inside its sealed record and non-Latin letters take up to three bytes, so fewer than 14
  // parts can seal to more than the Worker's 1,000,000 bytes (it would answer 507) or the relay's one request.
  for(const text of ['"'.repeat(48_000*13),'漢'.repeat(48_000*6)])await expect(sealPortfolio(vault.key,vault.manifest,1,text)).rejects.toBeInstanceOf(PortfolioTooLarge);
  // Up to the limit a snapshot seals, and the Worker takes it whole.
  const object=vaultObject(vault.manifest),t=transport(object),sealed=await sealPortfolio(vault.key,vault.manifest,1,'"'.repeat(48_000*6));
  expect(PORTFOLIO_SEALED_MAX).toBe(PORTFOLIO_BYTES_MAX);expect(sealed.reduce((n,part)=>n+JSON.stringify(part).length,0)).toBeLessThanOrEqual(PORTFOLIO_BYTES_MAX);
  expect(await t.write({protocol:1,action:'put',vault:vault.manifest.vault,operation:crypto.randomUUID(),base:0,generation:0,epoch:vault.manifest.epoch,parts:sealed})).toEqual({revision:1,generation:0});
 });
 test('a letter cut in two at a part boundary comes back whole',async()=>{
  // Notes long enough to need two parts; one emoji placed so its two UTF-16 halves fall in different parts.
  let data=portfolio();for(let i=0;i<120;i++)data=bought(data,`t${String(i).padStart(3,'0')}`);
  const noted=(first:number)=>canonicalPortfolio({...data,portfolios:[{...data.portfolios[0]!,transactions:data.portfolios[0]!.transactions.map((t,i)=>({...t,note:'n'.repeat(i?400:first)}))}]});
  // Shorten the first note until the boundary falls inside a note, then put the emoji there.
  let text=noted(400);for(let first=399;text.slice(47_999,48_001)!=='nn';first--)text=noted(first);
  expect(text.length).toBeGreaterThan(48_100);
  text=text.slice(0,47_999)+'😀'+text.slice(48_000);
  expect(canonicalPortfolio(JSON.parse(text))).toBe(text);
  const parts=await sealPortfolio(vault.key,vault.manifest,3,text);expect(parts).toHaveLength(2);
  expect(await openPortfolio(vault.key,vault.manifest,portfolioCloudSchema.parse({protocol:1,revision:3,generation:0,epoch:vault.manifest.epoch,parts}))).toBe(text);
 });
});
