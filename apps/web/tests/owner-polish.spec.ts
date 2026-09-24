import {test,expect,type Page} from '@playwright/test';
import {applyLocal,initialLedger} from '../lib/local-ledger';
import {emptyPlatform,positionSchema,privateGoalSchema} from '../lib/positions';
import {nativeZigIdentity} from '../lib/market-quotes';
const quote=()=>({base:nativeZigIdentity,currency:'USD',price:'43',priceDecimals:3,source:'CoinGecko',providerAssetId:'zignaly',observedAt:new Date().toISOString(),verification:'VERIFIED'});
async function seed(page:Page){
 await page.route('**/api/market-quotes*',route=>route.fulfill({json:{quote:quote()}}));
 await page.goto('/app/goals');
 const now=new Date().toISOString();
 const data={...emptyPlatform(),positions:['a','b'].map(id=>positionSchema.parse({id,providerId:'native-zig',sourceType:'NATIVE_STAKING',network:'zigchain-1',account:'fictional-account',asset:'ZIG',denom:'uzig',decimals:6,quantity:'263000000000',verification:'VERIFIED_READ_ONLY',sync:'CURRENT',observedAt:now,liquidity:'BONDED',provenance:'Fictional acceptance fixture',validator:{address:`fictional-validator-${id}`,name:`Example validator ${id.toUpperCase()}`,status:'BONDED',commission:'0.05',votingTokens:'263000000000'}})),goals:[['81','ZIG destination','QUANTITY'],['82','Financial Freedom','VALUE'],['83','Learning journey','PROJECT']].map(([id,name,type])=>privateGoalSchema.parse({id,name,type,status:'active',asset:type==='VALUE'?'USD':'ZIG',denom:type==='VALUE'?'fiat:USD':'azig',decimals:type==='VALUE'?2:type==='PROJECT'?0:18,target:type==='VALUE'?'50000000':'300000000000000000000000',notes:'Fictional owner acceptance',createdAt:now,milestones:type==='PROJECT'?[{id:'read',title:'Read a book',done:false}]:[],plan:type==='VALUE'?{amount:'50000',asset:'USD',decimals:2,cadence:'monthly',nextDate:'2027-01-01',active:true}:undefined})),allocations:[{goalId:'81',positionId:'a',quantity:'263000000000'},{goalId:'82',positionId:'b',quantity:'263000000000'}],watchScope:{network:'zigchain-1',account:'fictional-account'},aprAssumptions:[{network:'zigchain-1',account:'fictional-account',percent:'6'}]};
 await page.evaluate(({data,q,ledger,metadata})=>{localStorage.setItem('zigoals:platform:v1',JSON.stringify(data));localStorage.setItem('zigoals:public-market-quotes:v1',JSON.stringify(q));localStorage.setItem('zigoals:local-ledger:v1',JSON.stringify(ledger));localStorage.setItem('zigoals:metadata:v1:local-simulation:local-demo-user',JSON.stringify(metadata));},{data,q:quote(),ledger:applyLocal(applyLocal(initialLedger(),{kind:'create'},'2026-09-17T00:00:00.000Z'),{kind:'deposit',id:'1',amount:'100000000000000000000'},'2026-09-17T00:00:00.000Z'),metadata:{schemaVersion:1,chainId:'local-simulation',walletAddress:'local-demo-user',goals:{'1':{name:'Kyoto in spring',category:'Travel',targetValue:'1200',currency:'ZIG',targetDate:'2027-09-18',startingAmount:'0',monthlyContribution:'100',riskPreference:'Conservative',liquidityPreference:'Anytime',deadlineFlexible:false,notes:''}}}});
 await page.reload();await page.emulateMedia({reducedMotion:'reduce'});
}
async function shot(page:Page,name:string){if(process.env.OWNER_CAPTURE==='1'){await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`../../docs/verification/run8-1-owner/screenshots/${name}.png`,fullPage:true,animations:'disabled'});}}
test('one circular family, Today active count and a chosen Goal share exact USD valuation',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await seed(page);await expect(page.locator('.unified-goal-card')).toHaveCount(4);await expect(page.locator('.unified-goal-card .goal-progress-ring')).toHaveCount(4);await expect(page.locator('.unified-goal-card progress')).toHaveCount(0);
 const value=page.locator('[data-goal-key="private:82"]');await expect(value).toContainText('$11,309');await expect(value).toContainText('$500,000');await expect(value.getByRole('progressbar',{name:'Financial Freedom progress'})).toHaveAttribute('aria-valuenow','2.26');await shot(page,'01-unified-goals');
 if(process.env.OWNER_CAPTURE==='1')for(const [key,name] of [['legacy:1','02-legacy-card'],['private:81','03-quantity-card'],['private:82','04-value-card']])await page.locator(`[data-goal-key="${key}"]`).screenshot({path:`../../docs/verification/run8-1-owner/screenshots/${name}.png`});
 const before=await page.evaluate(()=>localStorage.getItem('zigoals:platform:v1'));
 await page.goto('/app');await expect(page.getByRole('article',{name:'Your destinations',exact:true})).toContainText('4 active Goals');
 await page.getByRole('button',{name:'Customize Today',exact:true}).click();await page.getByRole('button',{name:'Add widget',exact:true}).click();
 const editor=page.getByRole('dialog',{name:'Add a widget'});await editor.getByRole('group',{name:'Widget categories'}).getByRole('button',{name:'Goals'}).click();await editor.locator('.widget-library-tile').filter({hasText:'A chosen Goal'}).click();await editor.getByRole('group',{name:'Choose a saved record'}).getByRole('button',{name:/Financial Freedom/}).click();await editor.getByRole('button',{name:'Save widget',exact:true}).click();await page.getByRole('button',{name:'Finish customizing',exact:true}).click();
 const todayValue=page.getByRole('article',{name:'Financial Freedom',exact:true});await expect(todayValue).toContainText('$11,309');await expect(todayValue).toContainText('$500,000');await expect(todayValue.getByRole('progressbar')).toHaveAttribute('aria-valuenow','2.26');await shot(page,'13-today-all-goals');await shot(page,'14-today-value');
 expect(await page.evaluate(()=>localStorage.getItem('zigoals:platform:v1'))).toBe(before);
 await page.goto('/app/goals/tracked/82');await expect(page.getByTestId('tracked-progress')).toContainText('11,309');await expect(page.getByTestId('tracked-progress').getByRole('progressbar')).toHaveAttribute('aria-valuenow','2.26');await expect(page.locator('#allocate')).not.toHaveAttribute('open','');await shot(page,'05-goal-overview');
 await page.locator('#allocate > summary').click();await expect(page.getByLabel('Allocation quantity')).toBeVisible();await shot(page,'06-wealth-expanded');await page.locator('#allocate > summary').click();
 await page.locator('#contribution-plan > summary').click();await expect(page.getByLabel('Planned amount',{exact:true})).toBeVisible();await shot(page,'07-contribution-expanded');await page.locator('#contribution-plan > summary').click();
 await page.locator('#valuation > summary').click();await expect(page.locator('#valuation')).toContainText('CoinGecko');await expect(page.locator('#valuation')).toContainText('0.043');await shot(page,'08-valuation-expanded');
});
test('responsive collection, detail and Positions retain access without document overflow',async({page})=>{
 await seed(page);
 for(const width of [1440,1024,768,390,320]){await page.setViewportSize({width,height:1000});for(const [route,name] of [['/app/goals','15-goals'],['/app/goals/tracked/82','16-detail'],['/app/goals/positions','17-positions']]){await page.goto(route!);await expect(page.locator('main h1')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${route} at ${width}`).toBe(true);if(width===390)await shot(page,`${name}-390`);}}
});
test('missing price is explicit and stale quote survives failed refresh and reload',async({page})=>{
 await seed(page);
 const card=page.locator('[data-goal-key="private:82"]');

 // Establish the seeded verified quote before changing routing/storage.
 await expect(card).toContainText('$11,309');

 // Remove the seed route explicitly so the failure fixture cannot race it.
 await page.unroute('**/api/market-quotes*');
 await page.route('**/api/market-quotes*',route=>route.fulfill({
  status:502,
  json:{error:'Fixture failure'},
 }));

 // Persist the already verified quote as stale. Support both the historical
 // single-quote cache shape and the current bounded quote-array shape.
 await page.evaluate(()=>{
  const key='zigoals:public-market-quotes:v1';
  const text=localStorage.getItem(key);
  if(!text)throw new Error('Seeded market quote missing');
  const raw=JSON.parse(text);
  const quote=Array.isArray(raw)?raw[0]:raw;
  if(!quote||typeof quote!=='object')throw new Error('Seeded market quote invalid');
  quote.observedAt=new Date(Date.now()-3600000).toISOString();
  localStorage.setItem(key,JSON.stringify(raw));
 });

 await page.reload();
 await expect(card).toContainText('$11,309');
 await expect(card).toContainText('needs refresh');

 await page.reload();
 await expect(card).toContainText('$11,309');

 await page.evaluate(()=>localStorage.removeItem('zigoals:public-market-quotes:v1'));
 await page.reload();
 await expect(card).toContainText('Valuation unavailable');
 await expect(card).toContainText('Needs review');
});

test('Today reports private-store recovery errors while preserving legacy destinations',async({page})=>{
 await seed(page);await page.evaluate(()=>localStorage.setItem('zigoals:platform:v1','broken'));await page.goto('/app');
 await expect(page.getByRole('alert').filter({hasText:'Private data could not be read'})).toBeVisible();
 await expect(page.locator('section[aria-label="Available local simulation Goals"] [data-goal-key="legacy:1"]')).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('zigoals:platform:v1'))).toBe('broken');
});


test('Positions utilities expose wallet reader and APR calculator below wealth',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await seed(page);await page.goto('/app/goals/positions');
 await expect(page.locator('.position-metrics')).toContainText('526000');
 await shot(page,'09-wealth-first');await shot(page,'10-positions-right-rail');
 await page.locator('.positions-wallet > summary').click();await expect(page.getByLabel('Public ZIG address')).toBeVisible();await shot(page,'11-track-wallet-open');
 await page.locator('.positions-wallet > summary').click();await page.locator('.positions-scenario > summary').click();await expect(page.getByLabel('Net APR assumption %',{exact:true})).toHaveValue('6');await shot(page,'12-apr-open');
});
