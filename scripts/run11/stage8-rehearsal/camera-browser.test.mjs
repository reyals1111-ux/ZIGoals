// Stage 8 rows C1 and C2 in the browser (Session L rehearsal), against the production app in real Chrome:
// C1, a refused camera permission shows its plain message and manual barcode entry still logs a food;
// C2, cancelling a scan ("Stop camera") stops the camera and leaves the saved Health log byte for byte unchanged.
// The camera and the food lookup are stand-ins (no frames, no provider). A real permission prompt, a physical
// camera and a real product stay with Stage 8.
import {test,expect} from 'vitest';
import {BROWSER,launchChrome,reviewOrigin} from './harness.mjs';

const product={barcode:'0034000470693',name:'Fictional rehearsal cereal',brand:'Fixture',basis:'unverified-100g-or-100ml',nutrients:{kcal:100,proteinMg:2000,carbsMg:10000,fatMg:null},source:'Open Food Facts',apiVersion:'3.4',observedAt:'2026-10-02T09:00:00.000Z'};
const DENIED='Camera permission was denied. Manual barcode entry remains available.';

async function healthPage(browser,camera){
 const context=await browser.newContext(),page=await context.newPage(),lookups=[];
 await context.route('**/api/food-lookup?*',async route=>{lookups.push(route.request().url());await route.fulfill({json:product});});
 await context.addInitScript(camera);
 await page.goto(reviewOrigin()+'/app/health');
 await page.getByText('Scan or look up a food barcode',{exact:true}).click();
 return {context,page,lookups,area:page.getByRole('region',{name:'Barcode food lookup'})};
}
const healthBytes=page=>page.evaluate(()=>localStorage.getItem('zigoals:health:v1'));

test.runIf(BROWSER)('C1: a refused camera permission is explained and manual entry still logs a food',async()=>{
 const browser=await launchChrome();
 try{
  const {context,page,area,lookups}=await healthPage(browser,()=>{
   Object.defineProperty(window,'BarcodeDetector',{value:class{static async getSupportedFormats(){return ['ean_13','ean_8','upc_a'];}async detect(){return [];}},configurable:true});
   Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{throw new DOMException('Permission denied','NotAllowedError');}});
  });
  await area.getByRole('button',{name:'Scan barcode',exact:true}).click();
  await area.getByText(DENIED,{exact:true}).waitFor();
  expect(await area.getByRole('button',{name:'Stop camera'}).count()).toBe(0);
  // Manual entry: look up the typed barcode, check the package values, log it.
  await area.getByLabel('Product barcode',{exact:true}).fill('034000470693');
  await area.getByRole('button',{name:'Look up barcode',exact:true}).click();
  await area.getByRole('heading',{name:product.name}).waitFor();
  await area.getByLabel('I checked the package:',{exact:false}).check();
  await area.getByLabel('Fat (g)',{exact:true}).fill('3');await area.getByLabel('Grams eaten').fill('50');
  await area.getByRole('button',{name:'Confirm and log food'}).click();
  await area.getByText('Added to your private diary',{exact:false}).waitFor();
  const stored=JSON.parse(await healthBytes(page));
  expect(stored.diary).toHaveLength(1);expect(stored.diary[0].snapshot.provenance.provider).toBe('Open Food Facts');
  expect(lookups).toHaveLength(1);
  await context.close();
 }finally{await browser.close();}
},60000);

test.runIf(BROWSER)('C2: cancelling a scan stops the camera and leaves the saved Health log unchanged',async()=>{
 const browser=await launchChrome();
 try{
  const {context,page,area,lookups}=await healthPage(browser,()=>{
   const state={requests:0,stops:0};Object.defineProperty(window,'cameraRehearsal',{value:state});
   Object.defineProperty(window,'BarcodeDetector',{value:class{static async getSupportedFormats(){return ['ean_13','ean_8','upc_a'];}async detect(){return [];}},configurable:true});
   Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{state.requests++;const stream=new MediaStream();Object.defineProperty(stream,'getTracks',{value:()=>[{stop:()=>{state.stops++;}}]});return stream;}});
   HTMLMediaElement.prototype.play=async()=>{};
  });
  // Something already in the log first, so "unchanged" compares real bytes.
  await page.getByRole('button',{name:'Add 250 mL',exact:true}).click();
  await page.getByRole('region',{name:'Water journal'}).getByText('250 mL recorded',{exact:false}).waitFor();
  const before=await healthBytes(page);expect(before).not.toBeNull();
  await area.getByRole('button',{name:'Scan barcode',exact:true}).click();
  await area.getByRole('button',{name:'Stop camera'}).waitFor();
  await area.getByRole('button',{name:'Stop camera'}).click();
  await area.getByRole('button',{name:'Scan barcode',exact:true}).waitFor();
  expect(await page.evaluate(()=>window.cameraRehearsal)).toEqual({requests:1,stops:1});
  expect(await healthBytes(page)).toBe(before);
  expect(lookups).toEqual([]);
  await page.reload();await page.getByRole('region',{name:'Water journal'}).getByText('250 mL recorded',{exact:false}).waitFor();
  expect(await healthBytes(page)).toBe(before);
  await context.close();
 }finally{await browser.close();}
},60000);
