import {test,expect} from '@playwright/test';
test('Health storage upgrade keeps records, accepts further writes and reloads',async({page})=>{
 await page.goto('/app/health');await page.getByRole('button',{name:'Add 250 mL',exact:true}).click();
 await expect(page.getByRole('region',{name:'Water journal'})).toContainText('250 mL recorded');
 await page.goto('/app/settings');await page.getByText('Transactional local storage',{exact:true}).click();
 await page.getByRole('button',{name:'Upgrade selected module storage'}).click();await expect(page.getByText('Using transactional local storage.')).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('zigoals:health:v1')!).kind)).toBe('zigoals-indexeddb-pointer');
 await page.goto('/app/health');await expect(page.getByRole('region',{name:'Water journal'})).toContainText('250 mL recorded');
 await page.getByRole('button',{name:'Add 250 mL',exact:true}).click();await expect(page.getByRole('region',{name:'Water journal'})).toContainText('500 mL recorded');await page.reload();await expect(page.getByRole('region',{name:'Water journal'})).toContainText('500 mL recorded');
});
test('encrypted backup requires recovery acknowledgement and unknown hosted config fails safely',async({page})=>{
 await page.goto('/app/settings');await page.getByRole('button',{name:'Prepare encrypted backup'}).click();
 const download=page.getByRole('button',{name:'Download encrypted backup'});await expect(download).toBeDisabled();
 await expect(page.getByLabel('Recovery secret',{exact:true})).toHaveValue(/^[A-Za-z0-9_-]{43}$/);
 await page.getByLabel('I saved the recovery secret.').check();const event=page.waitForEvent('download');await download.click();expect((await event).suggestedFilename()).toBe('zigoals-encrypted-backup-v1.json');
 await expect(page.getByLabel('Recovery secret',{exact:true})).toHaveCount(0);
 const res=await page.request.get('/api/private-account');expect(res.status()).toBe(503);expect((await res.json()).error).toBe('HOSTED_CONFIGURATION_REQUIRED');
});
test('durable edits notify another already-open tab without losing either write',async({page,context})=>{
 await page.goto('/app/settings');await page.getByText('Transactional local storage',{exact:true}).click();await page.getByRole('button',{name:'Upgrade selected module storage'}).click();await expect(page.getByText('Using transactional local storage.')).toBeVisible();
 await page.goto('/app/health');const second=await context.newPage();await second.goto('/app/health');
 await page.getByRole('button',{name:'Add 250 mL',exact:true}).click();await expect(second.getByRole('region',{name:'Water journal'})).toContainText('250 mL recorded');
 await second.getByRole('button',{name:'Add 250 mL',exact:true}).click();await expect(page.getByRole('region',{name:'Water journal'})).toContainText('500 mL recorded');await second.close();
});
test('durable Health accepts and exports a real domain backup above the old 2 MB ceiling',async({page})=>{
 await page.goto('/app/settings');await page.getByText('Transactional local storage',{exact:true}).click();await page.getByRole('button',{name:'Upgrade selected module storage'}).click();await expect(page.getByText('Using transactional local storage.')).toBeVisible();
 const at='2026-09-23T12:00:00.000Z',fid='health_00000000-0000-4000-8000-000000000000';
 const food={id:fid,name:'Fictional long history fixture',brand:'Fixture',servingGrams:100,nutrients:{kcal:100,proteinMg:2000,carbsMg:10000,fatMg:3000},createdAt:at,updatedAt:at};
 const data={schemaVersion:1,kind:'zigoals-health',targets:{kcal:null,proteinMg:null,carbsMg:null,fatMg:null,weightGrams:null,steps:null},foods:[food],recipes:[],weights:[],activity:[],diary:Array.from({length:6000},(_,i)=>({id:'health_00000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),sourceId:fid,sourceKind:'food',snapshot:{name:food.name,servingGrams:100,nutrients:food.nutrients},date:'2026-09-23',meal:'Snacks',quantityMilli:1000,createdAt:at,updatedAt:at}))};
 const raw=JSON.stringify(data);expect(Buffer.byteLength(raw)).toBeGreaterThan(2_000_000);const panel=page.getByRole('region',{name:'Health backup',exact:true});
 await panel.getByText('Restore Health from a file',{exact:true}).click();await panel.getByLabel('Choose Health backup').setInputFiles({name:'fictional-health.json',mimeType:'application/json',buffer:Buffer.from(raw)});await expect(panel).toContainText('6000 meals');await panel.getByLabel('Replace my health with this backup.').check();await panel.getByRole('button',{name:'Restore Health',exact:true}).click();await expect(panel).toContainText('Health restored.');
 const event=page.waitForEvent('download');await panel.getByRole('button',{name:'Export Health',exact:true}).click();const downloaded=await event;const stream=await downloaded.createReadStream();const chunks:Buffer[]=[];for await(const chunk of stream!)chunks.push(Buffer.from(chunk));expect(JSON.parse(Buffer.concat(chunks).toString())).toEqual(data);
});
