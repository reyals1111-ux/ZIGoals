import { test, expect } from '@playwright/test';
test('private position allocation and plans survive reload without financial or Health side effects',async({page})=>{
 const external:string[]=[];page.on('request',r=>{if(new URL(r.url()).hostname!=='127.0.0.1')external.push(r.url());});
 await page.goto('/app/goals/positions');
 await page.getByLabel('Position name').fill('Example reserve');
 await page.getByLabel('Position quantity').fill('100');
 await page.getByRole('button',{name:'Save manual position',exact:true}).click();
 await expect(page.getByText('Example reserve',{exact:true})).toBeVisible();
 await page.goto('/app/goals/tracked');
 await page.getByLabel('Goal name',{exact:true}).fill('Example destination');
 await page.getByLabel('Target amount',{exact:true}).fill('200');
 await page.getByRole('button',{name:'Create tracked goal',exact:true}).click();
 await expect(page).toHaveURL(/\/app\/goals\/tracked\/\d+$/);
 await page.getByLabel('Allocation quantity').fill('80');
 await page.getByRole('button',{name:'Save allocation',exact:true}).click();
 await expect(page.getByTestId('tracked-progress')).toContainText('40.00%');
 await page.reload();
 await expect(page.getByTestId('tracked-progress')).toContainText('40.00%');
 await page.getByLabel('Planned amount').fill('10');
 await page.getByRole('button',{name:'Save contribution plan',exact:true}).click();
 await expect(page.getByTestId('tracked-progress')).toContainText('40.00%');
 expect(await page.evaluate(()=>localStorage.getItem('zigoals:health:v1'))).toBeNull();
 expect(external).toEqual([]);
 await page.setViewportSize({width:320,height:760});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('watch-only invalid input never calls a wallet or chain endpoint',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(window,'keplr',{get(){throw Error('Signer boundary touched');}});});
 const external:string[]=[];page.on('request',r=>{if(new URL(r.url()).hostname!=='127.0.0.1')external.push(r.url());});
 await page.goto('/app/goals/positions');
 await expect(page.getByText('Mainnet Read-Only / Watch-Only',{exact:true}).first()).toBeVisible();
 await page.getByLabel('Public ZIG address').fill('invalid');
 await page.getByRole('button',{name:'Read public positions',exact:true}).click();
 await expect(page.getByRole('alert').filter({hasText:'Could not verify public positions'})).toBeVisible();expect(external).toEqual([]);
});
test('mainnet watch-only displays exact six-decimal observations without wallet authority',async({page})=>{
 const {toBech32}=await import('@cosmjs/encoding');const account=toBech32('zig',new Uint8Array(20).fill(7));
 await page.addInitScript(()=>{Object.defineProperty(window,'keplr',{get(){throw Error('Wallet access forbidden');}});});
 const calls:string[]=[];let fail=false;
 await page.route('**/api/positions?**',async route=>{
  const r=route.request();calls.push(r.method());expect(r.method()).toBe('GET');expect(r.postData()).toBeNull();expect(r.url()).not.toContain('PRIVATE');
  expect(new URL(r.url()).searchParams.get('address')).toBe(account);
  if(fail){await route.fulfill({status:502,json:{error:'Public evidence unavailable'}});return;}
  await route.fulfill({json:{positions:[{id:`zigchain-1:${account}:liquid`,providerId:'native-zig',sourceType:'WALLET_LIQUID',network:'zigchain-1',account,asset:'ZIG',denom:'uzig',decimals:6,quantity:'123456789',verification:'VERIFIED_READ_ONLY',sync:'CURRENT',observedAt:new Date().toISOString(),liquidity:'LIQUID',provenance:'https://api.zigchain.com · block 123',executionAuthority:'NONE',notes:'',risk:''}]}});
 });
 await page.goto('/app/goals/positions');await page.getByLabel('Public ZIG address').fill(account);await page.getByRole('button',{name:'Read public positions',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'Public snapshot saved'})).toBeVisible();
 await expect(page.getByRole('region',{name:'zigchain-1 observed totals'})).toContainText('123.456789 ZIG');
 expect(calls).toHaveLength(1);
 await page.reload();await expect(page.getByRole('region',{name:'zigchain-1 observed totals'})).toContainText('123.456789 ZIG');expect(calls).toHaveLength(1);
 fail=true;await page.getByLabel('Public ZIG address').fill(account);await page.getByRole('button',{name:'Read public positions',exact:true}).click();
 await expect(page.getByRole('alert').filter({hasText:'Could not verify public positions'})).toBeVisible();
 await expect(page.getByText('Refresh failed · previous snapshot',{exact:false})).toBeVisible();
 const cached=await page.evaluate(()=>JSON.parse(localStorage.getItem('zigoals:platform:v1')!));expect(cached.positions[0]).toMatchObject({quantity:'123456789',sync:'ERROR'});
});

test('editing an imported manual Position preserves its asset identity, allocations and historical scale',async({page})=>{
 await page.goto('/app/goals/positions');
 await page.evaluate(()=>localStorage.setItem('zigoals:platform:v1',JSON.stringify({schemaVersion:1,kind:'zigoals-platform',positions:[{id:'manual-six',providerId:'Imported reserve',sourceType:'MANUAL',network:'manual',account:'local',asset:'ZIG',denom:'uzig',decimals:6,quantity:'1234567',verification:'MANUAL',sync:'MANUAL',liquidity:'UNKNOWN',observedAt:'2026-09-17T00:00:00Z',provenance:'Manual import',notes:'',risk:'',executionAuthority:'NONE'}],goals:[],allocations:[],snapshots:[{positionId:'manual-six',quantity:'1000000',observedAt:'2026-09-16T00:00:00Z'}]})));
 await page.reload();await page.getByRole('button',{name:'Edit Imported reserve'}).click();
 await expect(page.getByLabel('Position asset',{exact:true})).toHaveAttribute('readonly','');
 await page.getByLabel('Position quantity').fill('2.345678');await page.getByRole('button',{name:'Save manual position',exact:true}).click();
 await expect(page.getByRole('status').filter({hasText:'Manual position saved'})).toBeVisible();
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('zigoals:platform:v1')!));
 expect(stored.positions[0]).toMatchObject({asset:'ZIG',denom:'uzig',decimals:6,quantity:'2345678'});expect(stored.snapshots[0].quantity).toBe('1000000');
});
