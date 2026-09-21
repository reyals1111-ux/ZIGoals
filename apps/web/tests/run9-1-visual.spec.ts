import {test,expect} from '@playwright/test';
import {setup,catalog,goal} from './run9-1-fixture';
import {emptyPlatform,privateGoalSchema,type Platform} from '../lib/positions';
import {automaticSourcePosition} from '../components/platform/asset-search';
import {manualSourcePosition} from '../lib/manual-source';
import {captureValuations} from '../lib/goal-intelligence';
import {saveAsset,addFavourite} from '../lib/asset-management';
import {fundGoal} from '../lib/contribution-funding';
import {createHabit,emptyHabitData,logHabitCount,HABITS_KEY} from '../lib/habits';
import {createEmptyHealth,saveFood,logHealthItem,HEALTH_STORAGE_KEY} from '../lib/health';
import {localDate} from '../lib/local-date';
test.skip(process.env.RUN91_CAPTURE!=='1','Opt-in visual evidence, isolated fixtures');
for(const width of [1440,1024,390,320])test(`visual product audit ${width}`,async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width,height:1000});
 const now=Date.now(),at=new Date(now).toISOString(),today=localDate();
 const btc=automaticSourcePosition({asset:catalog[0]!,assetClass:'Crypto',quantity:'0.32',currency:'USD'},'bitcoin'),eth=automaticSourcePosition({asset:catalog[1]!,assetClass:'Crypto',quantity:'2.4',currency:'USD'},'ethereum'),gold=automaticSourcePosition({asset:catalog[3]!,assetClass:'Precious Metals',quantity:'1.2',currency:'USD'},'gold'),stock=automaticSourcePosition({asset:catalog[2]!,assetClass:'Stocks',quantity:'12',currency:'USD'},'nvidia'),cash=manualSourcePosition({category:'Cash',name:'Rainy day reserve',quantity:'6400',currency:'USD'},'cash');
 const home=privateGoalSchema.parse({...goal(),id:'92',name:'A place to call home',target:'5000000',createdAt:new Date(now-60*86400000).toISOString(),targetDate:'2027-12-31',plan:{amount:'50000',asset:'USD',decimals:2,cadence:'monthly',nextDate:'2026-09-01',active:true},pinned:true});
 let data:Platform={...emptyPlatform(),goals:[home,goal(),privateGoalSchema.parse({...goal(),id:'93',name:'Discover Japan',target:'600000'})]};for(const p of [btc,eth,gold,stock,cash])data=saveAsset(data,{...p,trackingStartedAt:new Date(now-3*86400000).toISOString()});data={...data,allocations:[{goalId:'92',positionId:btc.id,quantity:'200000000000000000'},{goalId:'92',positionId:cash.id,quantity:'5000000000000000000000'},{goalId:'93',positionId:eth.id,quantity:'500000000000000000'}]};for(const a of catalog)data=addFavourite(data,a);
 data=fundGoal(data,{id:'visual-funding',goalId:'91',newPosition:manualSourcePosition({category:'Cash',name:'Phone fund',quantity:'154',currency:'USD'},'phone'),quantity:'154000000000000000000',occurredAt:at},[],now);
 const quote=(p:typeof btc,t:number)=>({base:{network:'coingecko',denom:p.marketRef!.id,decimals:18},marketRef:p.marketRef!,currency:'USD' as const,price:p.id==='bitcoin'?String(63000+t*500):p.id==='ethereum'?'3000':p.id==='gold'?'4000':'180',priceDecimals:0,source:'CoinGecko' as const,providerAssetId:p.marketRef!.id,observedAt:new Date(now-(3-t)*86400000).toISOString(),fetchedAt:new Date(now-(3-t)*86400000).toISOString(),verification:'VERIFIED' as const});
 data={...data,valuationSnapshots:[],goalHistory:[],historyCaptureDays:{}};for(let t=0;t<4;t++)data=captureValuations(data,[btc,eth,gold,stock].map(p=>quote(p,t)),now-(3-t)*86400000);
 await setup(page,data);
 let habits=emptyHabitData();for(const title of ['Read a few pages','Move for 30 minutes','Save for my next chapter']){habits=createHabit(habits,{title,category:'Personal',description:'',notes:'',schedule:{kind:'daily'},target:1});}habits=logHabitCount(habits,habits.habits[0]!.id,today,1);
 let health=createEmptyHealth();health={...health,targets:{kcal:2200,proteinMg:120000,carbsMg:250000,fatMg:70000,weightGrams:null,steps:8000}};health=saveFood(health,{id:'health_breakfast01',name:'Oats, berries & yogurt',brand:'',servingGrams:350,nutrients:{kcal:480,proteinMg:26000,carbsMg:61000,fatMg:12000},createdAt:at,updatedAt:at});health=logHealthItem(health,{id:'health_diarybreakfast',sourceId:'health_breakfast01',sourceKind:'food',date:today,meal:'Breakfast',quantityMilli:1000},at);
 await page.evaluate(({habits,health,hkey,healthKey})=>{localStorage.setItem(hkey,JSON.stringify(habits));localStorage.setItem(healthKey,JSON.stringify(health));},{habits,health,hkey:HABITS_KEY,healthKey:HEALTH_STORAGE_KEY});
 const folder='../../docs/verification/run9-1';
 for(const [name,route,selector] of [['today','/app',''],['landing','/app','.today-hero'],['wealth','/app/wealth',''],['asset-detail','/app/wealth/asset/bitcoin',''],['goal-detail','/app/goals/tracked/92',''],['funding-wealth','/app/goals/tracked/92','[aria-label="Funding Wealth overview"]'],['activity','/app/activity',''],['health','/app/health',''],['goals','/app/goals',''],['positions','/app/goals/positions','']]){
  await page.goto(route!);await expect(page.locator('main h1').first()).toBeVisible();if(name==='asset-detail')await expect(page.locator('.price-chart [data-observation]')).toHaveCount(31);await page.evaluate(()=>document.fonts.ready);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name}: ${width}`).toBe(true);
  if(name==='today'){const box=await page.locator('.today-goal-pulse>.flow-ring').boundingBox();expect(box).not.toBeNull();expect(Math.abs(box!.width-box!.height)).toBeLessThan(2);}
  if(selector)await page.locator(selector).screenshot({path:`${folder}/${name}-${width}.png`,animations:'disabled'});else await page.screenshot({path:`${folder}/${name}-${width}.png`,fullPage:true,animations:'disabled'});
 }
 await page.goto('/app/wealth');await page.getByRole('button',{name:'+ Add asset',exact:true}).first().click();await page.getByRole('dialog').getByRole('searchbox').fill('Bitcoin');await expect(page.getByRole('list',{name:'Market assets'}).getByRole('button')).toHaveCount(1);await page.screenshot({path:`${folder}/asset-add-${width}.png`,animations:'disabled'});
});
