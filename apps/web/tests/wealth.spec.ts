import {test,expect,type Page} from '@playwright/test';
import {seed} from './coherence-fixture';
import {manualSourcePosition} from '../lib/manual-source';
import {emptyPlatform,privateGoalSchema} from '../lib/positions';
import {createAllocatedGoal} from '../lib/wealth';
test.beforeEach(async({page})=>{await page.route('**/api/market-assets',route=>route.fulfill({json:{assets:[]}}));});
async function shot(page:Page,name:string){
 if(process.env.WEALTH_CAPTURE!=='1')return;
 const path=`../../docs/verification/run8-1-wealth/screenshots/${name}.png`;
 if(name.startsWith('05')||name.startsWith('06'))await page.locator('.asset-picker').screenshot({path,animations:'disabled'});
 else if(name.startsWith('02'))await page.locator('.setup-next').screenshot({path,animations:'disabled'});
 else await page.screenshot({path,fullPage:!['03','07','08'].some(prefix=>name.startsWith(prefix)),animations:'disabled'});
}
async function mixed(page:Page){await seed(page);const positions=[
 manualSourcePosition({category:'Crypto',name:'Example crypto',symbol:'BTC',quantity:'0.25',currency:'USD',value:'25000'},'crypto'),
 manualSourcePosition({category:'Stablecoins',name:'Example stablecoin',symbol:'USDC',quantity:'40000',currency:'USD',value:'40000'},'stable'),
 manualSourcePosition({category:'Precious metals',name:'Example gold',quantity:'100',currency:'USD',value:'10000'},'gold'),
 manualSourcePosition({category:'Cash',name:'Example savings',quantity:'5000',currency:'USD'},'cash'),
 manualSourcePosition({category:'Stocks',name:'Example shares',symbol:'DEMO',quantity:'10',currency:'USD',value:'2000'},'stocks'),
 manualSourcePosition({category:'Property',name:'Example home',quantity:'',currency:'USD',value:'350000'},'home'),
 manualSourcePosition({category:'Custom asset',name:'Example collection',quantity:'1',currency:'USD',value:'1500'},'custom')];
 const goal=privateGoalSchema.parse({id:'91',name:'A brighter chapter',type:'VALUE',status:'active',asset:'USD',denom:'USD',decimals:2,target:'10000000',notes:'Fictional multi-asset example',createdAt:new Date().toISOString(),milestones:[]});const data=createAllocatedGoal({...emptyPlatform(),positions},goal,positions.slice(0,4).map(p=>({positionId:p.id,quantity:p.quantity})));await page.evaluate(data=>localStorage.setItem('zigoals:platform:v1',JSON.stringify(data)),data);await page.reload();}
test('manual sources stay selected and all allocations are created',async({page})=>{
 await seed(page);await page.goto('/app/goals/new');await page.getByLabel('Goal name',{exact:true}).fill('All my sources');await page.getByRole('radio',{name:'Value',exact:true}).check();await page.getByLabel('Target amount',{exact:true}).fill('100000');await page.getByRole('button',{name:'Continue'}).click();
 for(const [category,name,quantity,value,symbol] of [['Crypto','Example crypto','1','25000','BTC'],['Stablecoins','Example stablecoin','40000','40000','USDC'],['Precious metals','Example gold','100','10000',''],['Cash','Example cash','5000','','']]){
 await page.getByRole('button',{name:category!,exact:true}).click();if(category!=='Cash')await page.getByRole('button',{name:'Use manual entry',exact:true}).click();await page.getByLabel('Asset name',{exact:true}).fill(name!);if(symbol)await page.getByLabel('Symbol / ticker').fill(symbol);await page.getByLabel(category==='Cash'?'Cash amount':category==='Precious metals'?'Weight':'Quantity',{exact:true}).fill(quantity!);if(value)await page.getByLabel('Total holding value',{exact:true}).fill(value);if(category==='Stablecoins')await shot(page,'06-stablecoin-source');await page.getByRole('button',{name:'Save asset for this Goal',exact:true}).click();await expect(page.getByLabel('Wealth included in this Goal')).toContainText(name!);
 }
 await expect(page.getByLabel('Wealth included in this Goal').getByRole('textbox')).toHaveCount(4);await shot(page,'02-multiple-selected-sources');
 await page.getByRole('button',{name:'Property',exact:true}).click();await page.getByLabel('Asset name',{exact:true}).fill('Example home');await page.getByLabel('Quantity',{exact:true}).fill('1');await page.getByLabel('Total holding value',{exact:true}).fill('350000');await shot(page,'05-property-source');await page.getByRole('button',{name:'Save asset for this Goal',exact:true}).click();await page.getByRole('button',{name:'Remove Example home',exact:true}).click();
 await page.getByRole('button',{name:'Continue'}).click();await page.getByRole('button',{name:'Continue'}).click();await expect(page.locator('.wizard')).toContainText('80000 USD');await page.getByRole('button',{name:'Create goal',exact:true}).click();await expect(page.getByTestId('tracked-progress')).toContainText('$80,000');await expect(page.getByLabel('Asset mix')).toContainText('25.00%');await expect(page.locator('.goal-detail-progress .flow-ring')).toHaveCount(1);for(const share of ['25.00%','40.00%','10.00%','5.00%'])await expect(page.getByLabel('Asset mix')).toContainText(share);const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('zigoals:platform:v1')!));expect(saved.allocations.filter((a:{goalId:string})=>a.goalId===saved.goals.at(-1).id)).toHaveLength(4);
});
test('Wealth shows every category, preserves allocations and fits all viewports',async({page})=>{
 await mixed(page);await page.setViewportSize({width:1440,height:1100});await page.goto('/app/goals/tracked/91');await shot(page,'01-smooth-value-goal');await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow','80');await page.goto('/app/wealth');await expect(page.locator('.asset-class-summaries .class-summary')).toHaveCount(7);await expect(page.locator('.wealth-hero')).toContainText('$433,500');await expect(page.locator('.wealth-hero')).toContainText('$80,000');await shot(page,'03-wealth-desktop');await shot(page,'04-all-seven-categories');
 const health=await page.evaluate(()=>Object.entries(localStorage).filter(([k])=>k.includes('health')));
 for(const width of [1440,1024,768,390,320]){await page.setViewportSize({width,height:1000});for(const route of ['/app/wealth','/app/goals/tracked/91','/app/goals/new']){await page.goto(route);await expect(page.locator('main h1')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${route} at ${width}`).toBe(true);if(width===390&&route==='/app/wealth')await shot(page,'07-wealth-mobile');}}
 expect(await page.evaluate(()=>Object.entries(localStorage).filter(([k])=>k.includes('health')))).toEqual(health);await page.setViewportSize({width:1440,height:1100});await page.goto('/app/goals/positions');await page.locator('#manual-positions-title').scrollIntoViewIfNeeded();await shot(page,'08-readable-positions');expect(await page.locator('.fine').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(13);
});
