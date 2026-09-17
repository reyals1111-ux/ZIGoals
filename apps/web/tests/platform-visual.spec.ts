import {test,expect} from '@playwright/test';
import {emptyPlatform,positionSchema,privateGoalSchema} from '../lib/positions';
test('Run 8 additions preserve responsive V2.1 layout and reduced motion',async({page},info)=>{
 test.setTimeout(120000);await page.emulateMedia({reducedMotion:'reduce'});
 const p=positionSchema.parse({id:'fixture-manual',providerId:'Example reserve · fictional fixture',sourceType:'MANUAL',network:'manual',account:'local',asset:'ZIG',denom:'azig',quantity:'150000000000000000000',decimals:18,verification:'MANUAL',liquidity:'LIQUID',observedAt:new Date().toISOString(),provenance:'Fictional browser test fixture, no real financial data'});
 const g=privateGoalSchema.parse({id:'88',name:'Example learning fund',type:'QUANTITY',status:'active',asset:'ZIG',denom:'azig',decimals:18,target:'300000000000000000000',notes:'Fictional screenshot data',createdAt:new Date().toISOString(),milestones:[{id:'m1',title:'First milestone',done:false}],plan:{amount:'10000000000000000000',asset:'ZIG',decimals:18,cadence:'monthly',active:true,nextDate:'2027-01-15'}});
 await page.addInitScript(s=>localStorage.setItem('zigoals:platform:v1',JSON.stringify(s)),{...emptyPlatform(),positions:[p],goals:[g],allocations:[{goalId:g.id,positionId:p.id,quantity:'100000000000000000000'}]});
 for(const width of info.project.name==='desktop'?[1440,768]:[390,320]){
  await page.setViewportSize({width,height:900});
  for(const [name,route] of [['tracked-goals','/app/goals/tracked'],['positions','/app/goals/positions'],['tracked-detail','/app/goals/tracked/88']]){
   await page.goto(route!);await expect(page.locator('main h1')).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name} at ${width}`).toBe(true);
   if(process.env.RUN8_CAPTURE==='1')await page.screenshot({path:info.outputPath(`${name}-${width}.png`),fullPage:true,animations:'disabled',scale:'css'});
  }
 }
});
