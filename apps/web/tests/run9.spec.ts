import {test,expect} from '@playwright/test';
import {seed} from './coherence-fixture';

test('actual contributions stay separate from observed wealth and reversals retain history',async({page})=>{
 await seed(page);await page.goto('/app/goals/tracked/82');
 await expect(page.getByRole('region',{name:'Funding Wealth overview'})).toBeVisible();
 await page.getByRole('button',{name:'Record contribution',exact:true}).click();await page.getByRole('button',{name:'Record history only',exact:true}).click();
 await page.getByLabel('Actual amount in USD',{exact:true}).fill('125');
 await page.getByRole('button',{name:'Save history only',exact:true}).click();
 await expect(page.getByRole('region',{name:'Funding Wealth overview'})).toContainText('$125');
 await expect(page.getByRole('region',{name:'Goal timeline'})).toContainText('Contribution recorded');
 let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('zigoals:platform:v1')!));
 expect(saved.schemaVersion).toBe(3);expect(saved.contributions.filter((e:{goalScope:string})=>e.goalScope==='private')).toHaveLength(1);
 expect(saved.positions.find((p:{id:string})=>p.id==='b').quantity).toBe('263000000000');
 await page.getByRole('button',{name:'Reverse history entry',exact:true}).click();
 await expect(page.getByRole('region',{name:'Goal timeline'})).toContainText('Contribution reversed');
 saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('zigoals:platform:v1')!));expect(saved.contributions.filter((e:{goalScope:string})=>e.goalScope==='private')).toHaveLength(2);
 await page.reload();await expect(page.getByRole('region',{name:'Goal timeline'})).toContainText('Contribution reversed');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('Goal intelligence charts and Wealth fit desktop and narrow mobile',async({page})=>{
 await seed(page);
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:1000});
  for(const route of ['/app/goals/tracked/82','/app/wealth','/app','/app/activity']){
   await page.goto(route);await expect(page.locator('main h1').first()).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${route} at ${width}`).toBe(true);
   if(process.env.RUN9_CAPTURE==='1'&&width!==320)await page.screenshot({path:`../../docs/verification/run9/${route.split('/').pop()}-${width}.png`,fullPage:true,animations:'disabled',scale:'css'});
  }
 }
});

test('viewing migrated v1 never persists v2 until an explicit edit',async({page})=>{
 await page.goto('/app/goals');
 const raw=JSON.stringify({schemaVersion:1,kind:'zigoals-platform',positions:[{id:'cash',providerId:'Cash',sourceType:'MANUAL',network:'manual',account:'local',asset:'USD',denom:'USD',quantity:'10000',decimals:2,valuation:{value:'10000',decimals:2,currency:'USD',source:'MANUAL',observedAt:'2026-09-19T10:00:00Z'},liquidity:'LIQUID',verification:'MANUAL',sync:'MANUAL',observedAt:'2026-09-19T10:00:00Z',provenance:'Explicit manual cash',notes:'',risk:'',executionAuthority:'NONE'}],goals:[],allocations:[],snapshots:[]});
 await page.evaluate(raw=>localStorage.setItem('zigoals:platform:v1',raw),raw);
 await page.goto('/app/wealth');await expect(page.locator('.wealth-hero')).toContainText('$100');
 expect(await page.evaluate(()=>localStorage.getItem('zigoals:platform:v1'))).toBe(raw);
});

test('confirmed Local Demo Add Funds records exactly once and never at preview',async({page})=>{
 await seed(page);await page.goto('/app/goals/1');
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('zigoals:platform:v1')!).contributions.filter((e:{goalScope:string})=>e.goalScope==='local').length)).toBe(1);
 await page.locator('#local-simulation > summary').click();await page.getByLabel('Amount in ZIG').fill('25');
 await page.getByRole('button',{name:'Add funds',exact:true}).click();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('zigoals:platform:v1')!).contributions.filter((e:{goalScope:string})=>e.goalScope==='local').length)).toBe(1);
 await page.getByRole('button',{name:'Confirm simulation',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('zigoals:platform:v1')!).contributions.filter((e:{goalScope:string})=>e.goalScope==='local').length)).toBe(2);
 await page.reload();await expect(page.getByRole('heading',{name:'Kyoto in spring'})).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('zigoals:platform:v1')!).contributions.filter((e:{goalScope:string})=>e.goalScope==='local').length)).toBe(2);
});

test('automatic selection preserves exact identity, quotes privately, and keeps manual fallback',async({page})=>{
 const calls:unknown[]=[];let catalogCalls=0;
 await page.route('**/api/market-assets',route=>{catalogCalls++;return route.fulfill({json:{assets:[{ref:{provider:'coingecko',kind:'coin',id:'bitcoin'},name:'Bitcoin',symbol:'btc'},{ref:{provider:'coingecko',kind:'coin',id:'bitcoin-collision'},name:'Different Bitcoin',symbol:'btc'},{ref:{provider:'coingecko',kind:'rwa',id:'gold',assetType:'commodity'},name:'Gold',symbol:'GOLD'}],error:null}});});
 await page.route('**/api/market-quotes',route=>{const body=route.request().postDataJSON();calls.push(body);return route.fulfill({json:{quotes:body.requests.map((r:{marketRef:{id:string};currency:string})=>({base:{network:'coingecko',denom:r.marketRef.id,decimals:18},marketRef:r.marketRef,currency:r.currency,price:'65000',priceDecimals:0,source:'CoinGecko',providerAssetId:r.marketRef.id,observedAt:new Date().toISOString(),fetchedAt:new Date().toISOString(),verification:'VERIFIED'})),error:null}});});
 await page.goto('/app/goals/new');await page.getByLabel('Goal name',{exact:true}).fill('Automatic wealth');await page.getByRole('radio',{name:'Value',exact:true}).check();await page.getByLabel('Target amount',{exact:true}).fill('100000');await page.getByRole('button',{name:'Continue →',exact:true}).click();
 await page.getByRole('button',{name:'Crypto',exact:true}).click();
 const search=page.getByRole('searchbox');await search.fill('BTC');await expect(page.getByRole('list',{name:'Market assets'}).getByRole('button')).toHaveCount(2);
 await page.getByRole('list',{name:'Market assets'}).getByRole('button').filter({hasText:'CoinGecko ID bitcoin'}).filter({hasNotText:'collision'}).click();
 await page.getByLabel('Asset quantity',{exact:true}).fill('0.25');await page.getByRole('button',{name:'Save asset for this Goal',exact:true}).click();await expect(page.getByRole('button',{name:'Save asset for this Goal',exact:true})).toHaveCount(0);
 await page.goto('/app/wealth');await expect(page.locator('.wealth-hero')).toContainText('$16,250');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('zigoals:platform:v1')!));expect(saved.positions[0].marketRef.id).toBe('bitcoin');expect(saved.positions[0].quantity).toBe('250000000000000000');expect(saved.contributions).toHaveLength(0);
 expect(catalogCalls).toBe(1);expect(calls.length).toBeGreaterThan(0);for(const body of calls){expect(JSON.stringify(body)).not.toContain('250000');expect(JSON.stringify(body)).not.toContain('Automatic wealth');}
});

test('catalog failure leaves explicit manual valuation usable',async({page})=>{
 await page.route('**/api/market-assets',route=>route.fulfill({status:503,json:{error:'Market catalog unavailable.'}}));
 await page.goto('/app/wealth');await page.getByRole('button',{name:'+ Add asset',exact:true}).first().click();await page.getByRole('dialog').getByRole('button',{name:'Stablecoins',exact:true}).click();
 await expect(page.getByRole('alert').filter({hasText:'Automatic prices are unavailable'})).toContainText('Automatic prices are unavailable');
 await page.getByRole('button',{name:'Use manual entry',exact:true}).click();
 await page.getByLabel('Asset name',{exact:true}).fill('Manual reserve');await page.getByLabel('Symbol / ticker').fill('USDC');await page.getByLabel('Quantity',{exact:true}).fill('100');await page.getByLabel('Total holding value').fill('99.75');await page.getByRole('button',{name:'Save asset',exact:true}).click();await expect(page.getByRole('button',{name:'Save asset',exact:true})).toHaveCount(0);
 await page.goto('/app/wealth');await expect(page.locator('.wealth-hero')).toContainText('$99.75');
});
