import {test,expect,type Page} from '@playwright/test';
// Session U Part 3: Health's camera works when Health is opened from another app page. Chrome grants the camera only to
// a document loaded as /app/health (Permissions-Policy camera=(self) there, camera=() elsewhere), so every same-tab
// link into Health is a full page load (lib/health-navigation.ts). The camera and the decoder are stand-ins; the
// document's permissions policy is the browser's own.
const stubCamera=()=>{
 class Detector{static async getSupportedFormats(){return ['ean_13','ean_8','upc_a'];}async detect(){return [];}}
 Object.defineProperty(window,'BarcodeDetector',{value:Detector,configurable:true});
 Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{const stream=new MediaStream();Object.defineProperty(stream,'getTracks',{value:()=>[{stop:()=>{}}]});return stream;}});
 HTMLMediaElement.prototype.play=async()=>{};
};
const mark=(page:Page)=>page.evaluate(()=>{(window as unknown as {sameDocument:boolean}).sameDocument=true;});
const sameDocument=(page:Page)=>page.evaluate(()=>(window as unknown as {sameDocument?:boolean}).sameDocument===true);
const cameraPolicy=(page:Page)=>page.evaluate(()=>(document as Document&{featurePolicy?:{allowsFeature:(f:string)=>boolean}}).featurePolicy?.allowsFeature('camera')??null);
async function scan(page:Page){
 await page.getByText('Scan or look up a food barcode',{exact:true}).click();
 const area=page.getByRole('region',{name:'Barcode food lookup'});
 await area.getByRole('button',{name:'Scan barcode',exact:true}).click();
 await expect(area.getByRole('button',{name:'Stop camera'})).toBeVisible();
 await expect(area.getByRole('link',{name:'Reload Health for camera access'})).toHaveCount(0);
}

test('from Today, the Health link loads a fresh Health page whose camera starts with no reload link',async({page})=>{
 await page.addInitScript(stubCamera);
 await page.goto('/app');
 expect(await cameraPolicy(page)).toBe(false);
 await mark(page);
 await page.locator('a[href="/app/health"]:visible').first().click();
 await page.waitForURL('**/app/health');
 await expect.poll(()=>sameDocument(page)).toBe(false);
 expect(await cameraPolicy(page)).toBe(true);
 await scan(page);
});

test('a document loaded as Health keeps soft navigation: away and back into Health stays the same page',async({page})=>{
 await page.addInitScript(stubCamera);
 await page.goto('/app/health');
 await mark(page);
 await page.locator('a[href="/app"]:visible').first().click();
 await page.waitForURL(url=>url.pathname==='/app');
 await page.locator('a[href="/app/health"]:visible').first().click();
 await page.waitForURL('**/app/health');
 expect(await sameDocument(page)).toBe(true);
 expect(await cameraPolicy(page)).toBe(true);
 await scan(page);
});
