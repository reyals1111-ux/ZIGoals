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
test('camera denial, not found and cooldown preserve manual workflows',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(window,'BarcodeDetector',{value:undefined,configurable:true});});
 await page.route('**/api/food-lookup?*',route=>route.fulfill({status:404,json:{error:'NOT_FOUND'}}));await page.goto('/app/health');await page.getByText('Scan or look up a food barcode',{exact:true}).click();const area=page.getByRole('region',{name:'Barcode food lookup'});
 await area.getByRole('button',{name:'Scan barcode',exact:true}).click();await expect(area).toContainText('Camera permission was denied');await area.getByLabel('Product barcode',{exact:true}).fill('00001234');await area.getByRole('button',{name:'Look up barcode',exact:true}).click();await expect(area).toContainText('Product not found');
 await page.route('**/api/food-lookup?*',route=>route.fulfill({status:429,json:{error:'TRY_LATER'}}));await area.getByRole('button',{name:'Look up barcode',exact:true}).click();await expect(area).toContainText('cooling down');await expect(page.getByRole('button',{name:'Foods & recipes',exact:true})).toBeEnabled();
});
test('unavailable camera API leaves typed barcode entry usable',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(navigator,'mediaDevices',{value:undefined,configurable:true});});
 await page.goto('/app/health');await page.getByText('Scan or look up a food barcode',{exact:true}).click();const area=page.getByRole('region',{name:'Barcode food lookup'});
 await area.getByRole('button',{name:'Scan barcode',exact:true}).click();await expect(area).toContainText('unavailable in this browser');
 await area.getByLabel('Product barcode',{exact:true}).fill('00000000');await expect(area.getByRole('button',{name:'Look up barcode',exact:true})).toBeEnabled();
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
test('closing the barcode panel stops its camera track',async({page})=>{
 await page.addInitScript(()=>{
  const state={stops:0};Object.defineProperty(window,'barcodeTestState',{value:state});
  class Detector{static async getSupportedFormats(){return ['ean_13'];}async detect(){return [];}}
  Object.defineProperty(window,'BarcodeDetector',{value:Detector,configurable:true});
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{const stream=new MediaStream();Object.defineProperty(stream,'getTracks',{value:()=>[{stop:()=>{state.stops++;}}]});return stream;}});
  HTMLMediaElement.prototype.play=async()=>{};
 });
 await page.goto('/app/health');const toggle=page.getByText('Scan or look up a food barcode',{exact:true});await toggle.click();const area=page.getByRole('region',{name:'Barcode food lookup'});
 await area.getByRole('button',{name:'Scan barcode',exact:true}).click();await expect(area.getByRole('button',{name:'Stop camera'})).toBeVisible();
 await toggle.click();await expect.poll(()=>page.evaluate(()=>(window as unknown as {barcodeTestState:{stops:number}}).barcodeTestState.stops)).toBe(1);
});
test('one unconfirmed camera reading does not fill the barcode',async({page})=>{
 await page.addInitScript(()=>{
  const state={calls:0,repeat:false};Object.defineProperty(window,'barcodeTestState',{value:state});
  class Detector{static async getSupportedFormats(){return ['ean_13'];}async detect(){state.calls++;return state.calls===1||state.repeat?[{rawValue:'0034000470693'}]:[];}}
  Object.defineProperty(window,'BarcodeDetector',{value:Detector,configurable:true});
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{const stream=new MediaStream();Object.defineProperty(stream,'getTracks',{value:()=>[{stop:()=>{}}]});return stream;}});
  HTMLMediaElement.prototype.play=async()=>{};
 });
 await page.goto('/app/health');await page.getByText('Scan or look up a food barcode',{exact:true}).click();const area=page.getByRole('region',{name:'Barcode food lookup'});
 await area.getByRole('button',{name:'Scan barcode',exact:true}).click();await expect.poll(()=>page.evaluate(()=>(window as unknown as {barcodeTestState:{calls:number}}).barcodeTestState.calls)).toBeGreaterThanOrEqual(2);
 await expect(area.getByLabel('Product barcode',{exact:true})).toHaveValue('');
 await page.evaluate(()=>(window as unknown as {barcodeTestState:{repeat:boolean}}).barcodeTestState.repeat=true);
 await expect(area.getByLabel('Product barcode',{exact:true})).toHaveValue('0034000470693');
});
test('account selection change stops active barcode capture',async({page})=>{
 await page.addInitScript(()=>{
  const state={stops:0};Object.defineProperty(window,'barcodeTestState',{value:state});
  class Detector{static async getSupportedFormats(){return ['ean_13'];}async detect(){return [];}}
  Object.defineProperty(window,'BarcodeDetector',{value:Detector,configurable:true});
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{const stream=new MediaStream();Object.defineProperty(stream,'getTracks',{value:()=>[{stop:()=>{state.stops++;}}]});return stream;}});
  HTMLMediaElement.prototype.play=async()=>{};
 });
 await page.goto('/app/health');await page.getByText('Scan or look up a food barcode',{exact:true}).click();const area=page.getByRole('region',{name:'Barcode food lookup'});
 await area.getByRole('button',{name:'Scan barcode',exact:true}).click();await expect(area.getByRole('button',{name:'Stop camera'})).toBeVisible();
 await page.evaluate(()=>window.dispatchEvent(new Event('zigoals:account-change')));
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {barcodeTestState:{stops:number}}).barcodeTestState.stops)).toBe(1);
 await expect(area.getByRole('button',{name:'Stop camera'})).toBeHidden();
});
test('a browser without native decoding can still start a local camera scan',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(window,'BarcodeDetector',{value:undefined,configurable:true});
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;canvas.getContext('2d')!.fillRect(0,0,640,480);return canvas.captureStream(1);}});
 });
 await page.goto('/app/health');await page.getByText('Scan or look up a food barcode',{exact:true}).click();const area=page.getByRole('region',{name:'Barcode food lookup'});
 await area.getByRole('button',{name:'Scan barcode',exact:true}).click();await expect(area.getByRole('button',{name:'Stop camera'})).toBeVisible();
 await area.getByRole('button',{name:'Stop camera'}).click();await expect(area.getByRole('button',{name:'Stop camera'})).toBeHidden();
});
test('the local decoder reads an EAN-8 label with leading zeros without uploading frames',async({page})=>{
 let requests=0;await page.route('**/api/food-lookup?*',route=>{requests++;return route.abort();});
 await page.addInitScript(()=>{
  Object.defineProperty(window,'BarcodeDetector',{value:undefined,configurable:true});
  Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{
   const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;const context=canvas.getContext('2d')!;context.fillStyle='white';context.fillRect(0,0,640,480);
   const bits='101'+'0001101'.repeat(4)+'01010'+'1110010'.repeat(4)+'101';context.fillStyle='black';for(let i=0;i<bits.length;i++)if(bits[i]==='1')context.fillRect(119+i*6,120,6,220);
   return canvas.captureStream(10);
  }});
 });
 await page.goto('/app/health');await page.getByText('Scan or look up a food barcode',{exact:true}).click();const area=page.getByRole('region',{name:'Barcode food lookup'});
 await area.getByRole('button',{name:'Scan barcode',exact:true}).click();await expect(area.getByLabel('Product barcode',{exact:true})).toHaveValue('00000000',{timeout:15000});
 await expect(area.getByRole('button',{name:'Stop camera'})).toBeHidden();expect(requests).toBe(0);
});
