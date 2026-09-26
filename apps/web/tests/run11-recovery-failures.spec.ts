import {test,expect,type Page} from '@playwright/test';
import {encryptBackup} from '../lib/vault/backup';
import {createEmptyHealth} from '../lib/health';
import {emptyPlatform,privateGoalSchema} from '../lib/positions';
async function bytes(page:Page){return page.evaluate(async()=>{
 const local=Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]));
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('zigoals-private-vault-v1');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 const names=[...db.objectStoreNames],stores:Record<string,unknown>={};if(names.length){const tx=db.transaction(names,'readonly');for(const name of names){const s=tx.objectStore(name);const read=(r:IDBRequest)=>new Promise(resolve=>{r.onsuccess=()=>resolve(r.result);});stores[name]={keys:await read(s.getAllKeys()),values:await read(s.getAll())};}}db.close();return {local,stores};
 });}
async function upgrade(page:Page){await page.goto('/app/settings');await page.getByText('Transactional local storage',{exact:true}).click();await page.getByRole('button',{name:'Upgrade selected module storage',exact:true}).click();await expect(page.getByText('Using transactional local storage.',{exact:true})).toBeVisible();}
test('protected backup wrong secret, damaged ciphertext and future domain schema each fail without changing the existing profile',async({page})=>{
 await page.route('**/api/**',r=>r.fulfill({status:503,json:{error:'Offline fictional fixture'}}));
 await page.goto('/app/health');await page.getByRole('button',{name:'Add 250 mL',exact:true}).click();await expect(page.getByRole('region',{name:'Water journal'})).toContainText('250 mL recorded');await upgrade(page);
 const panel=page.locator('#private-vault');await panel.getByText('Restore an encrypted backup',{exact:true}).click();const before=await bytes(page),valid=await encryptBackup({health:JSON.stringify(createEmptyHealth())}),wrong=await encryptBackup({health:'{}'}),damaged=JSON.parse(valid.file);damaged.chunks[0].envelope.ciphertext=(damaged.chunks[0].envelope.ciphertext[0]==='A'?'B':'A')+damaged.chunks[0].envelope.ciphertext.slice(1);
 const future=await encryptBackup({health:JSON.stringify({...createEmptyHealth(),schemaVersion:999})});
 for(const fixture of [{name:'wrong-secret',file:valid.file,recovery:wrong.recovery,error:/Unlock or integrity check failed/},{name:'damaged-ciphertext',file:JSON.stringify(damaged),recovery:valid.recovery,error:/Unlock or integrity check failed/},{name:'future-domain',...future,error:/schemaVersion/}]){
  await panel.getByLabel('Encrypted backup file',{exact:true}).setInputFiles({name:fixture.name+'.json',mimeType:'application/json',buffer:Buffer.from(fixture.file)});await panel.getByLabel('Backup recovery secret',{exact:true}).fill(fixture.recovery);await panel.getByRole('button',{name:'Unlock and preview',exact:true}).click();await expect(panel.getByRole('alert')).toContainText(fixture.error);await expect(panel.getByRole('button',{name:'Restore selected module',exact:true})).toHaveCount(0);await expect(panel.getByRole('status')).toHaveCount(0);expect(await bytes(page),fixture.name).toEqual(before);
 }
 await page.reload();expect(await bytes(page)).toEqual(before);await page.goto('/app/health');await expect(page.getByRole('region',{name:'Water journal'})).toContainText('250 mL recorded');await page.getByRole('button',{name:'Add 250 mL',exact:true}).click();await expect(page.getByRole('region',{name:'Water journal'})).toContainText('500 mL recorded');
});
for(const durable of [false,true])test(`failed ${durable?'transactional':'legacy'} append has no success, preserves prior bytes/history and leaves independent Habit logging usable`,async({page})=>{
 await page.route('**/api/**',r=>r.fulfill({status:503,json:{error:'Offline fictional fixture'}}));
 await page.goto('/app/health');await page.getByRole('button',{name:'Add 250 mL',exact:true}).click();await expect(page.getByRole('region',{name:'Water journal'})).toContainText('250 mL recorded');
 const goal=privateGoalSchema.parse({id:'811',name:'Fictional retained reserve',type:'VALUE',status:'active',asset:'USD',denom:'USD',decimals:2,target:'100000',notes:'',createdAt:'2025-01-01T00:00:00Z',milestones:[]});
 const finance={...emptyPlatform(),goals:[goal],contributions:Array.from({length:35},(_,i)=>({id:'retained-'+i,goalId:goal.id,goalScope:'private',direction:'IN',quantity:String(100+i),asset:'USD',decimals:2,occurredAt:new Date(Date.UTC(2026,0,1+i)).toISOString(),provenance:'MANUAL_ATTRIBUTION',note:'Fictional receipt '+i}))};
 await page.evaluate(finance=>localStorage.setItem('zigoals:platform:v1',JSON.stringify(finance)),finance);
 if(durable)await upgrade(page);await page.goto('/app/health');const before=await bytes(page);
 await page.evaluate(durable=>{
  if(durable){const original=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(this.transaction.db.name==='zigoals-private-vault-v1'&&this.transaction.mode==='readwrite'){this.transaction.abort();throw new DOMException('Fictional full storage','QuotaExceededError');}return original.apply(this,args);};}
  else{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='zigoals:health:v1')throw new DOMException('Fictional full storage','QuotaExceededError');return original.call(this,k,v);};}
 },durable);
 await page.getByRole('button',{name:'Add 250 mL',exact:true}).click();await expect(page.locator('.health-error[role=alert]')).toContainText('Could not save this change');await expect(page.locator('.health-feedback')).toHaveText('');await expect(page.getByRole('region',{name:'Water journal'})).toContainText('250 mL recorded');expect(await bytes(page)).toEqual(before);
 // Client navigation keeps the injected Health storage failure active; Habits remain legacy.
 await page.getByRole('link',{name:'Habits',exact:true}).first().click();await page.getByRole('button',{name:'+ New habit',exact:true}).click();await page.getByLabel('Start from template').selectOption('read');await page.getByLabel('Habit title',{exact:true}).fill('Independent local logging works');await page.getByRole('button',{name:'Create habit',exact:true}).click();await expect(page.getByRole('article',{name:'Independent local logging works',exact:true})).toBeVisible();
 await page.reload();await expect(page.getByRole('article',{name:'Independent local logging works',exact:true})).toBeVisible();await page.goto('/app/health');await expect(page.getByRole('region',{name:'Water journal'})).toContainText('250 mL recorded');await page.getByRole('button',{name:'Add 250 mL',exact:true}).click();await expect(page.getByRole('region',{name:'Water journal'})).toContainText('500 mL recorded');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('zigoals:platform:v1')!))).toEqual(finance);
 await page.goto('/app/goals/tracked/811');const timeline=page.getByRole('region',{name:'Goal timeline',exact:true});await timeline.getByLabel('Event type',{exact:true}).selectOption('contribution');await expect(timeline.getByRole('status')).toHaveText('Page 1 of 3 · 35 retained events');
});
