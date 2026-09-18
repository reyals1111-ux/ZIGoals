import {test,expect} from '@playwright/test';
import {emptyPlatform,positionSchema,privateGoalSchema} from '../lib/positions';
const fixture=()=>({...emptyPlatform(),positions:['a','b'].map((id,i)=>positionSchema.parse({id,providerId:'native-zig',sourceType:'NATIVE_STAKING',network:'zigchain-1',account:'fictional-preview-account',asset:'ZIG',denom:'uzig',decimals:6,quantity:i?'63559957014':'200000000000',verification:'VERIFIED_READ_ONLY',sync:'CURRENT',observedAt:new Date().toISOString(),liquidity:'BONDED',provenance:'Fictional owner-preview fixture; no live chain data',validator:{address:`fictional-validator-${id}`,name:`Example validator ${id.toUpperCase()}`,status:'BONDED',commission:'0.05',votingTokens:'1000000000000'}})),goals:[privateGoalSchema.parse({id:'81',name:'300K GOAL',network:'zigchain-1',type:'QUANTITY',status:'active',asset:'ZIG',denom:'azig',decimals:18,target:'300000000000000000000000',notes:'Fictional preview data',createdAt:new Date().toISOString(),milestones:[]})]});
test('owner setup: stake allocation, contribution plan and supporting Habit stay private',async({page},info)=>{
 await page.goto('/app/goals/tracked');await page.evaluate(s=>localStorage.setItem('zigoals:platform:v1',JSON.stringify(s)),fixture());await page.reload();
 await page.getByRole('link',{name:'Open Goal →'}).click();
 await expect(page.getByRole('navigation',{name:'Goal setup'})).toBeVisible();
 const financial:string[]=[];page.on('request',r=>{if(r.method()==='POST'||/rpc|api\/positions/.test(r.url()))financial.push(r.url());});
 await page.evaluate(()=>{Object.defineProperty(window,'keplr',{get(){throw Error('No wallet authority permitted');}});});
 await page.getByRole('button',{name:'Allocate available stake up to Goal target'}).click();
 await expect(page.getByTestId('tracked-progress')).toContainText('87.85%');
 if(process.env.RUN81_CAPTURE==='1')await page.screenshot({path:info.outputPath('goal-detail-allocation.png'),fullPage:true,animations:'disabled',scale:'css'});
 await page.getByRole('link',{name:'Next: set your contribution plan →'}).click();
 await page.getByLabel('Planned amount',{exact:true}).fill('500');await page.getByLabel('Contribution asset',{exact:true}).fill('USD');
 await page.getByLabel('Price per Goal unit in contribution currency (if different)').fill('0.05');
 await page.getByRole('button',{name:'Save contribution plan',exact:true}).click();
 if(process.env.RUN81_CAPTURE==='1')await page.locator('#contribution-plan').screenshot({path:info.outputPath('contribution-plan-habit-cta.png'),animations:'disabled',scale:'css'});
 await page.getByRole('link',{name:'Create supporting Habit →'}).click();await page.getByRole('button',{name:'Create supporting Habit →',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Buy ZIG',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Complete Buy ZIG',exact:true}).click();
 await expect(page.getByTestId('tracked-progress')).toContainText('87.85%');
 const s=await page.evaluate(()=>({p:JSON.parse(localStorage.getItem('zigoals:platform:v1')!),h:JSON.parse(localStorage.getItem('zigoals:habits:v1')!)}));
 expect(s.h.habits[0].rules[0]).toMatchObject({measurement:{kind:'quantity',unit:'USD'},target:500,schedule:{kind:'frequency',times:1,period:'month'}});
 expect(s.p.positions).toEqual(fixture().positions.map((p,i)=>({...p,observedAt:s.p.positions[i].observedAt})));
 expect(financial).toEqual([]);expect(await page.evaluate(()=>localStorage.getItem('zigoals:health:v1'))).toBeNull();
});
test('APR persistence, account isolation, rail order and navigation',async({page})=>{
 await page.goto('/app');const card=page.getByRole('region',{name:'Staked ZIG overview'});await expect(card).toContainText('Not set');
 await page.evaluate(s=>localStorage.setItem('zigoals:platform:v1',JSON.stringify(s)),fixture());await page.reload();
 await card.getByRole('link',{name:'View stake / positions →'}).click();
 await expect(page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Stake / Positions',exact:true})).toHaveAttribute('aria-current','page');
 await expect(page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Goals',exact:true})).not.toHaveAttribute('aria-current');
 await page.getByLabel('Net APR assumption %',{exact:true}).fill('7.25');await page.getByRole('button',{name:'Save APR assumption'}).click();await expect(page.getByRole('status').filter({hasText:'Net APR assumption saved'})).toBeVisible();await page.reload();await expect(page.getByLabel('Net APR assumption %',{exact:true})).toHaveValue('7.25');
 await page.getByLabel('Read-only network').selectOption('TESTNET_READ_ONLY');await expect(page.getByLabel('Net APR assumption %',{exact:true})).toHaveValue('');
 await page.goto('/app');await expect(card).toContainText('7.25%');await expect(card).toContainText('263559.957014');
 expect(await page.locator('.today-rail > section').evaluateAll(nodes=>nodes.slice(0,3).map(n=>n.className))).toEqual(['account-panel','staking-card','destination-panel']);
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('zigoals:platform:v1')!);s.positions=s.positions.map((p:object)=>({...p,account:'other-account'}));localStorage.setItem('zigoals:platform:v1',JSON.stringify(s));});await page.reload();await expect(card).toContainText('Not set');
});
test('responsive owner preview captures',async({page},info)=>{
 test.setTimeout(120000);await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/app');await page.evaluate(s=>localStorage.setItem('zigoals:platform:v1',JSON.stringify({...s,allocations:s.positions.map(p=>({goalId:'81',positionId:p.id,quantity:p.quantity}))})),fixture());
 for(const width of info.project.name==='desktop'?[1440,768]:[390,320]){
  await page.setViewportSize({width,height:1000});
  for(const [name,route] of [['today','/app'],['tracked-goals','/app/goals/tracked'],['positions','/app/goals/positions'],['goal-detail','/app/goals/tracked/81']]){
   await page.goto(route!);await expect(page.locator('main h1')).toBeVisible();await expect(page.getByRole('link',{name:'Stake / Positions',exact:true})).toBeVisible();
   await page.locator('.platform-workspace,.staking-card').first().waitFor();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name} ${width}`).toBe(true);
   if(name==='goal-detail')expect(await page.locator('.goal-setup').evaluate(el=>el.getBoundingClientRect().top<document.querySelector('#tracked-progress')!.getBoundingClientRect().top)).toBe(true);
   if(name==='tracked-goals')expect(await page.getByRole('navigation',{name:'Goal views'}).evaluate(el=>el.getBoundingClientRect().top<document.querySelector('.goal-grid')!.getBoundingClientRect().top)).toBe(true);
   if(process.env.RUN81_CAPTURE==='1'){await page.screenshot({path:info.outputPath(`${name}-${width}.png`),fullPage:true,animations:'disabled',scale:'css'});if(name==='today')await page.locator('.staking-card').screenshot({path:info.outputPath(`staking-card-${width}.png`),animations:'disabled',scale:'css'});}
  }
 }
});
test('shared navigation keeps Health accessible without writing its store',async({page})=>{
 await page.goto('/app');await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Health',exact:true}).click();
 await expect(page).toHaveURL(/\/app\/health$/);await expect(page.locator('main h1')).toBeVisible();
 for(const width of [768,390,320]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 expect(await page.evaluate(()=>localStorage.getItem('zigoals:health:v1'))).toBeNull();
});
