import { test, expect } from "@playwright/test";
test("read-only diagnostics keep deployment disabled and display separate public endpoint evidence", async ({ page }) => {
  const errors:string[]=[]; const mutations:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://testnet-**.zigchain.com/**',async route=>{
    const request=route.request();const url=request.url();
    if(request.method()!=='GET'){mutations.push(url);return route.abort();}
    const body=url.endsWith('/status')?{result:{node_info:{network:'zig-test-2'},sync_info:{catching_up:false,latest_block_height:'77',latest_block_time:new Date().toISOString()}}}:url.includes('node_info')?{default_node_info:{network:'zig-test-2'},application_version:{version:'v5.0.0-patch-1'}}:url.includes('staking')?{params:{bond_denom:'azig'}}:{metadata:{base:'azig',display:'ZIG',denom_units:[{denom:'ZIG',exponent:18}]}};
    await route.fulfill({json:body});
  });
  await page.goto('/app/settings');
  const panel=page.getByRole('region',{name:'Connection diagnostics'});
  await expect(panel.getByText('LOCAL SIMULATION',{exact:true})).toBeVisible();
  await expect(panel.getByRole('button',{name:'Check connection'})).toBeEnabled();
  await panel.getByRole('button',{name:'Check connection'}).click();
  await expect(panel.getByText('Verified zig-test-2 · height 77')).toBeVisible();
  await expect(panel.getByText('Verified zig-test-2 · azig · 18 decimals · v5.0.0-patch-1')).toBeVisible();
  await expect(panel.getByText('NOT DEPLOYED',{exact:true})).toHaveCount(3);
  await expect(panel.locator('dt').filter({hasText:'Network verification time'}).locator('..').locator('dd')).toContainText(/^\d{4}-\d{2}-\d{2}T/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  expect(mutations).toEqual([]);expect(errors).toEqual([]);
});
