import {test,expect} from '@playwright/test';
const product={barcode:'0034000470693',name:'Fictional cereal',brand:'Fixture',basis:'unverified-100g-or-100ml',nutrients:{kcal:100,proteinMg:2000,carbsMg:10000,fatMg:null},source:'Open Food Facts',apiVersion:'3.4',observedAt:'2026-09-23T12:00:00.000Z'};
test('manual leading-zero lookup previews unknown values and logs only a confirmed private snapshot',async({page})=>{
 let calls=0;await page.route('**/api/food-lookup?*',async route=>{calls++;expect(route.request().url()).toContain('0034000470693');await route.fulfill({json:product});});
 await page.goto('/app/health');await page.getByText('Scan or look up a food barcode',{exact:true}).click();const area=page.getByRole('region',{name:'Barcode food lookup'});
 await area.getByLabel('Product barcode',{exact:true}).fill('034000470693');await area.getByRole('button',{name:'Look up barcode',exact:true}).click();await expect(area.getByRole('heading',{name:'Fictional cereal'})).toBeVisible();
 await expect(area.getByLabel('Fat (g)',{exact:true})).toHaveValue('');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('zigoals:health:v1')??'{"diary":[]}').diary.length)).toBe(0);
 await expect(area.getByRole('button',{name:'Confirm and log food'})).toBeDisabled();await area.getByLabel('I checked the package:',{exact:false}).check();await area.getByLabel('Fat (g)',{exact:true}).fill('3');await area.getByLabel('Grams eaten').fill('50');await area.getByRole('button',{name:'Confirm and log food'}).click();await expect(area).toContainText('Added to your private diary');
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('zigoals:health:v1')!));expect(stored.diary[0].snapshot.servingGrams).toBe(100);expect(stored.diary[0].quantityMilli).toBe(500);expect(stored.diary[0].snapshot.provenance.provider).toBe('Open Food Facts');expect(calls).toBe(1);
});
test('unsupported camera, not found and cooldown preserve manual workflows',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(window,'BarcodeDetector',{value:undefined,configurable:true});});
 await page.route('**/api/food-lookup?*',route=>route.fulfill({status:404,json:{error:'NOT_FOUND'}}));await page.goto('/app/health');await page.getByText('Scan or look up a food barcode',{exact:true}).click();const area=page.getByRole('region',{name:'Barcode food lookup'});
 await area.getByRole('button',{name:'Scan barcode',exact:true}).click();await expect(area).toContainText('unavailable in this browser');await area.getByLabel('Product barcode',{exact:true}).fill('00001234');await area.getByRole('button',{name:'Look up barcode',exact:true}).click();await expect(area).toContainText('Product not found');
 await page.route('**/api/food-lookup?*',route=>route.fulfill({status:429,json:{error:'TRY_LATER'}}));await area.getByRole('button',{name:'Look up barcode',exact:true}).click();await expect(area).toContainText('cooling down');await expect(page.getByRole('button',{name:'Foods & recipes',exact:true})).toBeEnabled();
});
test('camera is explicit and stops all tracks on cancel and navigation',async({page})=>{
 await page.addInitScript(()=>{
  const state={requests:0,stops:0};Object.defineProperty(window,'barcodeTestState',{value:state});
  class Detector{static async getSupportedFormats(){return ['ean_13'];}async detect(){return [];}}
  Object.defineProperty(window,'BarcodeDetector',{value:Detector,configurable:true});
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{state.requests++;const stream=new MediaStream();Object.defineProperty(stream,'getTracks',{value:()=>[{stop:()=>{state.stops++;}}]});return stream;}});
  HTMLMediaElement.prototype.play=async()=>{};
 });
 await page.goto('/app/health');await page.getByText('Scan or look up a food barcode',{exact:true}).click();const area=page.getByRole('region',{name:'Barcode food lookup'});
 expect(await page.evaluate(()=>(window as unknown as {barcodeTestState:{requests:number}}).barcodeTestState.requests)).toBe(0);
 await area.getByRole('button',{name:'Scan barcode',exact:true}).click();await expect(area.getByRole('button',{name:'Stop camera'})).toBeVisible();await area.getByRole('button',{name:'Stop camera'}).click();
 expect(await page.evaluate(()=>(window as unknown as {barcodeTestState:{stops:number}}).barcodeTestState.stops)).toBe(1);
 await area.getByRole('button',{name:'Scan barcode',exact:true}).click();await expect(area.getByRole('button',{name:'Stop camera'})).toBeVisible();await page.getByRole('button',{name:'Weight',exact:true}).click();
 expect(await page.evaluate(()=>(window as unknown as {barcodeTestState:{stops:number}}).barcodeTestState.stops)).toBe(2);
});
