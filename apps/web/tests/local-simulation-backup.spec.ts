import {test,expect} from '@playwright/test';
import {seed} from './coherence-fixture';

// Legacy "Local simulation" Goals (simulated ledger + their saved plans) must survive
// Settings → encrypted backup → wipe the browser → restore, exactly like the four modules.
const LEDGER='zigoals:local-ledger:v1',PLANS='zigoals:metadata:v1:local-simulation:local-demo-user';
test('Local simulation Goals survive export, wipe and import through Settings',async({page})=>{
 test.setTimeout(90000);
 await seed(page);await page.goto('/app/goals');await expect(page.getByText('Kyoto in spring').first()).toBeVisible();
 const read=()=>page.evaluate(keys=>keys.map(k=>localStorage.getItem(k)),[LEDGER,PLANS,'zigoals:platform:v1']);
 const before=await read();expect(before.every(v=>v!==null)).toBe(true);
 await page.goto('/app/settings');await page.getByRole('button',{name:'Prepare encrypted backup',exact:true}).click();
 const secret=await page.getByLabel('Recovery secret',{exact:true}).inputValue();await page.getByLabel('I saved the recovery secret.',{exact:true}).check();
 const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Download encrypted backup',exact:true}).click();
 const stream=await(await downloaded).createReadStream();let file='';for await(const chunk of stream)file+=chunk.toString();
 expect(file).not.toContain('Kyoto');
 await page.evaluate(async()=>{localStorage.clear();sessionStorage.clear();for(const db of await indexedDB.databases())if(db.name)await new Promise(resolve=>{const r=indexedDB.deleteDatabase(db.name!);r.onsuccess=r.onerror=r.onblocked=()=>resolve(null);});});
 await page.reload();expect(await read()).toEqual([null,null,null]);
 // Restore every module the validated backup offers, one at a time, as a user would.
 await page.getByText('Restore an encrypted backup',{exact:true}).click();
 const unlock=async()=>{await page.getByLabel('Encrypted backup file',{exact:true}).setInputFiles({name:'zigoals-encrypted-backup-v1.json',mimeType:'application/json',buffer:Buffer.from(file)});await page.getByLabel('Backup recovery secret',{exact:true}).fill(secret);await page.getByRole('button',{name:'Unlock and preview',exact:true}).click();};
 await unlock();const offered=await page.getByLabel(/^Module to restore/).locator('option').evaluateAll(options=>options.map(o=>(o as HTMLOptionElement).value));
 for(const [index,module] of offered.entries()){
  if(index>0)await unlock();
  await page.getByLabel(/^Module to restore/).selectOption(module);await page.getByLabel('Replace the selected module with this validated backup.',{exact:true}).check();
  await page.getByRole('button',{name:'Restore selected module',exact:true}).click();await page.getByText('Selected module restored; prior local bytes retained.',{exact:true}).waitFor();
 }
 const after=await read();expect(after.slice(0,2),'Local simulation ledger and plans are restored byte for byte').toEqual(before.slice(0,2));expect(JSON.parse(after[2]!)).toEqual(JSON.parse(before[2]!));
 await page.goto('/app/goals');await expect(page.getByText('Kyoto in spring').first()).toBeVisible();
 await page.reload();expect(await read()).toEqual(after);
});
