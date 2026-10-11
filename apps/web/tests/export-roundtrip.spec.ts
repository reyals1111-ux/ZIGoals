import {test,expect} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {presetSettings,DASHBOARD_SETTINGS_KEY} from '../lib/dashboard-settings';
import {PLATFORM_KEY} from '../lib/positions';
import {HABITS_KEY} from '../lib/habits';
import {HEALTH_STORAGE_KEY} from '../lib/health';

// Local Demo (no Showcase, no account): Settings → encrypted backup → wipe the browser → restore
// every module through the same UI. Each module's stored data must come back identical.
const KEYS={finance:PLATFORM_KEY,habits:HABITS_KEY,health:HEALTH_STORAGE_KEY,settings:DASHBOARD_SETTINGS_KEY} as const;
test('Local Demo export, wipe and import restores all four modules identically',async({page})=>{
 test.setTimeout(90000);
 const {records}=buildShowcase('2026-09-20');
 const seeded:Record<string,string>={...records,[DASHBOARD_SETTINGS_KEY]:JSON.stringify({...presetSettings('habits-health'),onboarded:true})};
 await page.goto('/app/settings');await page.evaluate(values=>{localStorage.clear();for(const [k,v]of Object.entries(values))localStorage.setItem(k,v);},seeded);await page.reload();
 const read=()=>page.evaluate(keys=>Object.fromEntries(Object.entries(keys).map(([d,k])=>[d,localStorage.getItem(k)])),KEYS);
 const before=await read();for(const d of Object.keys(KEYS))expect(before[d],d).toBe(seeded[KEYS[d as keyof typeof KEYS]]);
 await page.getByLabel('Include my Health records in this encrypted download.',{exact:true}).check();
 await page.getByRole('button',{name:'Prepare encrypted backup',exact:true}).click();
 const secret=await page.getByLabel('Recovery secret',{exact:true}).inputValue();await page.getByLabel('I saved the recovery secret.',{exact:true}).check();
 const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Download encrypted backup',exact:true}).click();
 const stream=await(await downloaded).createReadStream();let file='';for await(const chunk of stream)file+=chunk.toString();
 for(const marker of ['Emergency fund','Showcase kitchen','Meditate'])expect(file).not.toContain(marker);
 // Wipe: localStorage, sessionStorage and every IndexedDB database of this origin.
 await page.evaluate(async()=>{localStorage.clear();sessionStorage.clear();for(const db of await indexedDB.databases())if(db.name)await new Promise(resolve=>{const r=indexedDB.deleteDatabase(db.name!);r.onsuccess=r.onerror=r.onblocked=()=>resolve(null);});});
 await page.reload();expect(Object.values(await read()).every(v=>v===null)).toBe(true);
 await page.getByText('Restore an encrypted backup',{exact:true}).click();
 for(const domain of Object.keys(KEYS)){
  await page.getByLabel('Encrypted backup file',{exact:true}).setInputFiles({name:'zigoals-encrypted-backup-v1.json',mimeType:'application/json',buffer:Buffer.from(file)});
  await page.getByLabel('Backup recovery secret',{exact:true}).fill(secret);await page.getByRole('button',{name:'Unlock and preview',exact:true}).click();
  await page.getByLabel(/^Module to restore/).selectOption(domain);await page.getByLabel('Replace the selected module with this validated backup.',{exact:true}).check();
  await page.getByRole('button',{name:'Restore selected module',exact:true}).click();await page.getByText('Selected module restored; prior local bytes retained.',{exact:true}).waitFor();
 }
 const after=await read();
 for(const d of Object.keys(KEYS))expect(JSON.parse(after[d]!),d).toEqual(JSON.parse(before[d]!));
 await page.reload();expect(await read()).toEqual(after);
});
