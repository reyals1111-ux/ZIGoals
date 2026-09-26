import {test,expect,type Page} from '@playwright/test';
import {platformSchema,privateGoalSchema} from '../lib/positions';
import {habitDataSchema} from '../lib/habits';
import {createEmptyHealth,healthSchema} from '../lib/health';
const at='2026-09-23T12:00:00.000Z';
const fixtures={
 finance:{schemaVersion:1,kind:'zigoals-platform',positions:[],goals:[privateGoalSchema.parse({id:'77',name:'Legacy migration reserve',type:'VALUE',status:'active',asset:'USD',denom:'USD',decimals:2,target:'200000',notes:'Fictional preserved plan',createdAt:at,milestones:[]})],allocations:[],snapshots:[]},
 habits:{schemaVersion:1,kind:'zigoals-habits',habits:[{id:'59a35604-3696-4a78-b455-4015acb66885',title:'Legacy migration reading',category:'Personal',description:'',notes:'Fictional retained journal',startDate:'2026-09-23',createdAt:at,updatedAt:at,rules:[{from:'2026-09-23',schedule:{kind:'daily'},target:1,state:'active'}],entries:[{date:'2026-09-23',count:1,note:'Keep this evidence',updatedAt:at}]}]},
 health:{...createEmptyHealth(),weights:[{id:'health_59a35604-3696-4a78-b455-4015acb66885',date:'2026-09-23',grams:70000,createdAt:at,updatedAt:at}]},
};
const schemas={finance:platformSchema,habits:habitDataSchema,health:healthSchema};
async function state(page:Page,key:string){return page.evaluate(async key=>{
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('zigoals-private-vault-v1',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 const tx=db.transaction(['headers','records','outbox','receipts','recovery'],'readonly');
 const read=(store:string,key?:IDBValidKey)=>new Promise<unknown>((resolve,reject)=>{const s=tx.objectStore(store),r=key===undefined?s.getAll():s.get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 const header=await read('headers',JSON.stringify(['local',key])) as {fields:Record<string,unknown>;arrays:Record<string,string[]>;revision:number}|undefined;
 const data=header?{...header.fields}:null;
 if(header&&data)await Promise.all(Object.entries(header.arrays).map(async([field,ids])=>{data[field]=await Promise.all(ids.map(id=>read('records',JSON.stringify(['local',key,field,id]))));}));
 const [outbox,recovery,receipts]=await Promise.all(['outbox','recovery','receipts'].map(s=>read(s))) as [Array<{domain:string}>,Array<{domain:string;raw:string}>,Array<{domain:string}>];
 db.close();return {data,revision:header?.revision??0,outbox:outbox.filter(v=>v.domain===key),recovery:recovery.filter(v=>v.domain===key),receipts:receipts.filter(v=>v.domain===key),raw:localStorage.getItem(key)};
 },key);}
for(const domain of ['finance','habits','health'] as const)for(const boundary of ['transaction-abort','pointer-publication'] as const)test(`${domain} v1 migration recovers ${boundary} from an already-open second tab`,async({page,context})=>{
 await context.route('**/api/**',r=>r.fulfill({status:503,json:{error:'Offline fictional fixture'}}));
 const key=`zigoals:${domain==='finance'?'platform':domain}:v1`,raw=' '+JSON.stringify(fixtures[domain])+'\n';
 await page.goto('/app/settings');await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key,raw});await page.reload();
 const other=await context.newPage();await other.goto('/app/settings');
 for(const tab of [page,other]){await tab.getByText('Transactional local storage',{exact:true}).click();await tab.getByRole('combobox',{name:/^Module/}).selectOption(domain);}
 await page.evaluate(({key,boundary})=>{
  if(boundary==='pointer-publication'){const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key&&v.includes('zigoals-indexeddb-pointer')){Storage.prototype.setItem=original;throw Error('Fixture pointer publication interrupted');}return original.call(this,k,v);};}
  else{const original=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(this.name==='recovery'){IDBObjectStore.prototype.put=original;this.transaction.abort();throw Error('Fixture migration transaction interrupted');}return original.apply(this,args);};}
 },{key,boundary});
 await page.getByRole('button',{name:'Upgrade selected module storage',exact:true}).click();await expect(page.locator('#private-vault').getByRole('alert')).toContainText(/interrupted|transaction failed/);
 const interrupted=await state(page,key);expect(interrupted.raw).toBe(raw);expect(await other.evaluate(key=>localStorage.getItem(key),key)).toBe(raw);
 expect(interrupted.revision).toBe(boundary==='transaction-abort'?0:1);expect(interrupted.outbox).toHaveLength(boundary==='transaction-abort'?0:1);expect(interrupted.recovery.map(r=>r.raw)).toEqual(boundary==='transaction-abort'?[]:[raw]);
 // Retry from the tab that was already open before failure; it must reuse a staged commit.
 await other.getByRole('button',{name:'Upgrade selected module storage',exact:true}).click();await expect(other.getByText('Using transactional local storage.',{exact:true})).toBeVisible();
 await page.reload();const recovered=await state(page,key);expect(JSON.parse(recovered.raw!).kind).toBe('zigoals-indexeddb-pointer');expect(recovered.data).toEqual(schemas[domain].parse(fixtures[domain]));expect(recovered.revision).toBe(1);expect(recovered.outbox).toHaveLength(1);expect(recovered.receipts).toHaveLength(1);expect(recovered.recovery.map(r=>r.raw)).toEqual([raw]);
 await other.reload();expect(await state(other,key)).toEqual(recovered);await other.close();
});
