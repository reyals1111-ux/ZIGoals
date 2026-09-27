import {test,expect} from '@playwright/test';
for(const route of ['/app','/app/health','/app/wealth'])test(`initial workspace keeps its layout on ${route}`,async({page})=>{
 await page.addInitScript(()=>{const entries:number[]=[];Object.assign(window,{run11LayoutShifts:entries});new PerformanceObserver(list=>{for(const entry of list.getEntries())if(!(entry as PerformanceEntry&{hadRecentInput:boolean}).hadRecentInput)entries.push((entry as PerformanceEntry&{value:number}).value);}).observe({type:'layout-shift',buffered:true});});
 await page.goto(route);await expect(page.locator('main h1').first()).toBeVisible();await page.waitForTimeout(500);
 const shift=await page.evaluate(()=>(window as unknown as {run11LayoutShifts:number[]}).run11LayoutShifts.reduce((a,b)=>a+b,0));expect(shift).toBeLessThan(0.1);await expect(page.locator('.workspace')).toHaveAttribute('aria-busy','false');
 await expect(page.locator('.app-topbar')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
