import {test,expect} from '@playwright/test';
import {emptyPlatform,positionSchema} from '../lib/positions';

test('wealth leads collapsed read-only utilities and APR stays account-scoped',async({page},info)=>{
 const position=positionSchema.parse({id:'layout-stake',providerId:'native-zig',sourceType:'NATIVE_STAKING',network:'zigchain-1',account:'fictional-layout-account',asset:'ZIG',denom:'uzig',decimals:6,quantity:'263000000000',verification:'VERIFIED_READ_ONLY',sync:'CURRENT',observedAt:new Date().toISOString(),liquidity:'BONDED',provenance:'Fictional layout fixture'});
 await page.goto('/app/goals/positions');
 await page.evaluate(s=>localStorage.setItem('zigoals:platform:v1',JSON.stringify(s)),{...emptyPlatform(),positions:[position]});await page.reload();
 const wallet=page.locator('.positions-wallet'),scenario=page.locator('.positions-scenario');
 await expect(wallet).not.toHaveAttribute('open','');await expect(scenario).not.toHaveAttribute('open','');
 await expect(page.getByLabel('Public ZIG address')).toBeHidden();await expect(page.getByLabel('Net APR assumption %',{exact:true})).toBeHidden();
 expect(await page.locator('.position-metrics').evaluate(el=>Boolean(el.compareDocumentPosition(document.querySelector('.positions-wallet')!)&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
 await wallet.locator('summary').click();await expect(page.getByLabel('Public ZIG address')).toBeVisible();await expect(wallet).toContainText('no signer');
 await scenario.locator('summary').click();await page.getByLabel('Net APR assumption %',{exact:true}).fill('6');await page.getByRole('button',{name:'Save APR assumption'}).click();await expect(page.getByRole('status').filter({hasText:'Net APR assumption saved'})).toContainText('Net APR assumption saved');
 await page.reload();await expect(scenario.locator('summary')).toContainText('6%');
 await scenario.locator('summary').click();await expect(page.getByLabel('Net APR assumption %',{exact:true})).toHaveValue('6');
 await wallet.locator('summary').click();await page.getByLabel('Read-only network').selectOption('TESTNET_READ_ONLY');await expect(page.getByLabel('Net APR assumption %',{exact:true})).toHaveValue('');
 await page.getByLabel('Read-only network').selectOption('MAINNET_READ_ONLY');await expect(page.getByLabel('Net APR assumption %',{exact:true})).toHaveValue('6');
 for(const width of [1440,1024,768,390,320]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`positions ${width}`).toBe(true);}
 if(process.env.RUN81_CAPTURE==='1'){
  for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.screenshot({path:info.outputPath(`positions-utilities-open-${width}.png`),fullPage:true,animations:'disabled'});}
  await wallet.locator('summary').click();await scenario.locator('summary').click();
  for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.screenshot({path:info.outputPath(`positions-overview-${width}.png`),fullPage:true,animations:'disabled'});}
 }
});
