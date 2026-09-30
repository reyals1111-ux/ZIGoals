import {expect,test,type Page} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY,presetSettings} from '../lib/dashboard-settings';
import {createEmptyHealth,HEALTH_STORAGE_KEY} from '../lib/health';

// A durable private read (IndexedDB) that never finishes used to leave the page area blank forever: the Shell waits
// for Today settings before it shows any page. Now, after a while, the page says so and offers Retry. Throughout,
// nothing is rendered as if the store were empty, nothing is written, and the honesty banners stay.
const VAULT='zigoals-private-vault-v1';
const MARKER=JSON.stringify({schemaVersion:100,kind:'zigoals-indexeddb-pointer',database:VAULT,protocol:1});
const PANEL='.private-read-delay';
const DELAY_BUDGET=15_000; // PRIVATE_READ_SLOW_MS (8 s) plus page load
test.beforeEach(async({page})=>{await page.route('**/api/**',route=>route.fulfill({status:503,json:{error:'LOCAL_FIXTURE_ONLY'}}));});

type Hold='hang'|'hang-first'|'observe';
/** Seeds one durable store the way VaultDatabase stores it, from a same-origin page that runs no app code. */
async function seedDurable(page:Page,key:string,value:object,hold:Hold){
 await page.goto('/api/fixture-blank');
 await page.evaluate(async({key,value,marker,vault,hold})=>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open(vault,1);r.onupgradeneeded=()=>{for(const s of ['headers','records','outbox','receipts','recovery'])r.result.createObjectStore(s);};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  const tx=db.transaction(['headers','records'],'readwrite'),id=(...parts:string[])=>JSON.stringify(parts),fields:Record<string,unknown>={},arrays:Record<string,string[]>={};
  for(const [field,item] of Object.entries(value)){
   if(!Array.isArray(item)){fields[field]=item;continue;}
   arrays[field]=item.map((row,index)=>{const rowId=typeof row?.id==='string'?row.id:String(index);tx.objectStore('records').put(row,id('local',key,field,rowId));return rowId;});
  }
  tx.objectStore('headers').put({revision:1,fields,arrays},id('local',key));
  await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();
  localStorage.setItem(key,marker);localStorage.setItem('fixture:vault-open',hold);
 },{key,value,marker:MARKER,vault:VAULT,hold});
}
/** Holds the vault's open requests ("hang": all until released; "hang-first": only the first) and counts writes. */
async function instrument(page:Page){
 await page.addInitScript(vault=>{
  let hold=localStorage.getItem('fixture:vault-open');if(!hold)return;
  const open=IDBFactory.prototype.open,held:(()=>void)[]=[];
  const state={opens:0,readwrite:0,storeWrites:0,release(){hold='observe';for(const next of held.splice(0))next();}};
  Object.assign(window,{__vault:state});
  IDBFactory.prototype.open=function(name:string,version?:number){
   if(name!==vault)return open.call(this,name,version);
   state.opens++;
   if(hold!=='hang'&&!(hold==='hang-first'&&state.opens===1))return open.call(this,name,version);
   // An open request that fires no event until released, like a stalled browser request.
   const request:Record<string,unknown>={onsuccess:null,onerror:null,onblocked:null,onupgradeneeded:null,result:undefined,transaction:null,error:null};
   const fire=(type:string,event:Event)=>(request['on'+type] as ((e:Event)=>void)|null)?.(event);
   held.push(()=>{const real=open.call(indexedDB,name,version);
    real.onupgradeneeded=e=>{request.result=real.result;request.transaction=real.transaction;fire('upgradeneeded',e);};
    real.onsuccess=e=>{request.result=real.result;fire('success',e);};real.onerror=e=>{request.error=real.error;fire('error',e);};real.onblocked=e=>fire('blocked',e);});
   return request as unknown as IDBOpenDBRequest;
  };
  const transaction=IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction=function(this:IDBDatabase,...args:Parameters<IDBDatabase['transaction']>){if(this.name===vault&&args[1]==='readwrite')state.readwrite++;return transaction.apply(this,args);};
  const setItem=Storage.prototype.setItem;
  Storage.prototype.setItem=function(this:Storage,key:string,value:string){if(/^zigoals:(settings|habits|health|platform):v1$/.test(key))state.storeWrites++;return setItem.call(this,key,value);};
 },VAULT);
}
const counters=(page:Page)=>page.evaluate(()=>{const v=(window as unknown as {__vault:{opens:number;readwrite:number;storeWrites:number}}).__vault;return {opens:v.opens,readwrite:v.readwrite,storeWrites:v.storeWrites};});
async function storedHeader(page:Page,key:string){
 return page.evaluate(async({key,vault})=>{const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open(vault);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  const value=await new Promise(resolve=>{const r=db.transaction('headers','readonly').objectStore('headers').get(JSON.stringify(['local',key]));r.onsuccess=()=>resolve(r.result);});db.close();return JSON.stringify(value);},{key,vault:VAULT});
}
async function expectBanners(page:Page){
 await expect(page.locator('.app-topbar .network-banner')).toContainText('ZIGCHAIN TESTNET · PUBLIC ALPHA');
 await expect(page.locator('.mode-strip')).toBeVisible();
 await expect(page.locator('.mode-strip')).toContainText('LOCAL SIMULATION');
}

test('Today settings that never finish opening: an honest notice, no page, no writes, and the late read renders normally',async({page})=>{
 await instrument(page);await seedDurable(page,DASHBOARD_SETTINGS_KEY,presetSettings('balanced'),'hang');
 await page.goto('/app');
 await expectBanners(page);
 const panel=page.locator(PANEL);
 await expect(panel).toBeVisible({timeout:DELAY_BUDGET});
 await expect(panel).toContainText('Your private data is taking longer than usual to open.');
 await expect(panel).toContainText('Nothing has been changed');
 await expect(panel.getByRole('button',{name:'Retry'})).toBeVisible();
 await expect(panel).toContainText('Your backups are in Settings once your data opens.');
 // The page itself is not rendered from empty defaults while the read is unresolved.
 await expect(page.locator('main')).toBeHidden();
 await expect(page.locator('.workspace')).toHaveAttribute('aria-busy','true');
 await expectBanners(page);
 expect(await counters(page)).toMatchObject({readwrite:0,storeWrites:0});
 // The read resolves late: the page renders in place, without a reload.
 await page.evaluate(()=>{Object.assign(window,{__samePage:true});(window as unknown as {__vault:{release():void}}).__vault.release();});
 await expect(page.locator('main h1').first()).toBeVisible();
 await expect(panel).toBeHidden();
 expect(await page.evaluate(()=>(window as unknown as {__samePage?:boolean}).__samePage)).toBe(true);
 await expectBanners(page);
 expect(await counters(page)).toMatchObject({readwrite:0,storeWrites:0});
 expect(await page.evaluate(key=>localStorage.getItem(key),DASHBOARD_SETTINGS_KEY)).toBe(MARKER);
 expect(JSON.parse(await storedHeader(page,DASHBOARD_SETTINGS_KEY))).toMatchObject({revision:1});
});

test('Retry starts a new open for a stalled one and the page renders',async({page})=>{
 await instrument(page);await seedDurable(page,DASHBOARD_SETTINGS_KEY,presetSettings('balanced'),'hang-first');
 await page.goto('/app');
 const panel=page.locator(PANEL);
 await expect(panel).toBeVisible({timeout:DELAY_BUDGET});
 await expect(page.locator('main')).toBeHidden();
 const before=await counters(page);expect(before).toMatchObject({readwrite:0,storeWrites:0});
 await panel.getByRole('button',{name:'Retry'}).click();
 await expect(page.locator('main h1').first()).toBeVisible();
 await expect(panel).toBeHidden();
 expect((await counters(page)).opens).toBeGreaterThan(before.opens);
 await expectBanners(page);
 expect(await page.evaluate(key=>localStorage.getItem(key),DASHBOARD_SETTINGS_KEY)).toBe(MARKER);
});

test('a page store that stalls keeps its own loading state, with the notice and a Settings pointer above it',async({page})=>{
 await instrument(page);await seedDurable(page,HEALTH_STORAGE_KEY,createEmptyHealth(),'hang');
 const before=await storedHeader(page,HEALTH_STORAGE_KEY);
 await page.goto('/app/health');
 const panel=page.locator(PANEL);
 await expect(panel).toBeVisible({timeout:DELAY_BUDGET});
 await expect(panel.getByRole('link',{name:'Backups in Settings →'})).toHaveAttribute('href','/app/settings#privacy');
 await expect(page.getByText('Loading your private health journal…')).toBeVisible();
 await expectBanners(page);
 expect(await counters(page)).toMatchObject({readwrite:0,storeWrites:0});
 await page.evaluate(()=>(window as unknown as {__vault:{release():void}}).__vault.release());
 await expect(page.getByText('Loading your private health journal…')).toBeHidden();
 await expect(panel).toBeHidden();
 await expect(page.locator('main h1').first()).toBeVisible();
 expect(await counters(page)).toMatchObject({readwrite:0,storeWrites:0});
 expect(await storedHeader(page,HEALTH_STORAGE_KEY)).toBe(before);
});

test('another tab\'s blocked upgrade stalls the open; the page explains, keeps the banners, and recovers when it clears',async({page,context})=>{
 await instrument(page);await seedDurable(page,DASHBOARD_SETTINGS_KEY,presetSettings('balanced'),'observe');
 // Tab X: an old connection that ignores versionchange. Tab Y: an upgrade request that X blocks.
 const x=await context.newPage(),y=await context.newPage();
 for(const tab of [x,y])await tab.goto('/api/fixture-blank');
 await x.evaluate(vault=>new Promise<void>((resolve,reject)=>{const r=indexedDB.open(vault,1);r.onsuccess=()=>{Object.assign(window,{__old:r.result});resolve();};r.onerror=()=>reject(r.error);}),VAULT);
 await y.evaluate(vault=>new Promise<void>(resolve=>{
  const r=indexedDB.open(vault,2);
  // When X finally lets go, Y gives up its upgrade, so the database stays at version 1.
  r.onupgradeneeded=()=>r.transaction!.abort();r.onblocked=()=>{Object.assign(window,{__blocked:true});resolve();};r.onerror=()=>Object.assign(window,{__aborted:true});
 }),VAULT);
 await page.goto('/app');
 await expectBanners(page);
 const panel=page.locator(PANEL);
 await expect(panel).toBeVisible({timeout:DELAY_BUDGET});
 await expect(page.locator('main')).toBeHidden();
 expect(await counters(page)).toMatchObject({readwrite:0,storeWrites:0});
 await x.evaluate(()=>(window as unknown as {__old:IDBDatabase}).__old.close());
 await expect.poll(()=>y.evaluate(()=>(window as unknown as {__aborted?:boolean}).__aborted===true)).toBe(true);
 await expect(page.locator('main h1').first()).toBeVisible();
 await expect(panel).toBeHidden();
 await expectBanners(page);
 expect(await counters(page)).toMatchObject({readwrite:0,storeWrites:0});
 expect(await page.evaluate(key=>localStorage.getItem(key),DASHBOARD_SETTINGS_KEY)).toBe(MARKER);
});
