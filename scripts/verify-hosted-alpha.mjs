// Explicit manual public smoke. Never part of CI, never connects a wallet.
// Fresh ephemeral context; fictional browser-local data only; no mocks.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const require = createRequire(new URL('../apps/web/package.json', import.meta.url));
const { chromium, expect } = require('@playwright/test');
const output = process.argv[2];
if (!output) throw Error('Provide a new evidence output directory.');
await mkdir(output);
const alpha = 'https://alpha.zigoals.app';
const fallback = 'https://zigoals-alpha.reyals1111.workers.dev';
const apex = 'https://zigoals.app';
const report = { observedAt: new Date().toISOString(), evidenceSource: 'INDEPENDENT_HOSTED_SMOKE', sourceScript: fileURLToPath(import.meta.url), mocks: false, walletInteraction: false, freshEphemeralContext: true, responses: [], requestRecords: [], pageErrors: [], consoleErrors: [], failedRequests: [], httpErrors: [], layouts: [], stages: [], limits: ['Single client and small request sample; not load testing or Core Web Vitals.', 'This automated smoke does not inspect Cloudflare CPU/account metrics or private email settings.', 'No real wallet extension test; owner evidence remains separate.'] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', permissions: [] });
const page = await context.newPage();
const captures = [];
page.on('request', request => captures.push(request.allHeaders().then(headers => ({ url: request.url(), method: request.method(), headers, body: request.postData() })).catch(error => ({ captureError: String(error) }))));
page.on('pageerror', e => report.pageErrors.push(e.message));
page.on('console', m => { if (m.type() === 'error') report.consoleErrors.push({message:m.text(),location:m.location(),pageUrl:page.url()}); });
page.on('requestfailed', r => report.failedRequests.push({ url: r.url(), failure: r.failure() }));
page.on('response', r => { if (r.status() >= 400) report.httpErrors.push({url:r.url(), status:r.status()}); });
async function layout(label) {
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({width, height:900});
    const actual = await page.evaluate(() => ({viewport:innerWidth, scrollWidth:document.documentElement.scrollWidth}));
    report.layouts.push({label,...actual, pass:actual.scrollWidth <= actual.viewport});
  }
}
async function stage(name, action) { await action(); report.stages.push({name, status:'PASS'}); }
try {
  for (const [origin, path, count] of [[alpha,'/app',3],[fallback,'/app',2],[apex,'/',2]]) {
    for (let sample=1; sample<=count; sample++) {
      const start=performance.now(); const response=await context.request.get(origin+path, {timeout:20000});
      const body=await response.body(); const headers=response.headers();
      report.responses.push({url:response.url(), sample, status:response.status(), elapsedMs:Math.round(performance.now()-start), decodedBodyBytes:body.length, headers});
      assert.equal(response.status(),200); assert(response.url().startsWith('https://'));
      if (path === '/app') {
        const csp=headers['content-security-policy'];
        assert.match(csp,/script-src 'self' 'nonce-[A-Za-z0-9+/]+=*' 'strict-dynamic'/);
        assert.doesNotMatch(csp.split(';').find(s=>s.includes('script-src')),/unsafe-inline|unsafe-eval/);
        assert.deepEqual(csp.split(';').map(s=>s.trim()).find(s=>s.startsWith('connect-src ')).split(/\s+/).slice(1).sort(), ["'self'", "https://testnet-rpc.zigchain.com", "https://testnet-api.zigchain.com"].sort());
        for (const d of ['object-src','frame-src','frame-ancestors','base-uri']) assert(csp.includes(`${d} 'none'`));
        assert(csp.includes("form-action 'self'"));
        assert.match(headers['strict-transport-security'],/max-age=31536000/);
        assert.match(headers['cache-control'],/no-store/); assert.match(headers['x-robots-tag'],/noindex/);
        assert.equal(headers['x-frame-options'],'DENY'); assert.equal(headers['x-content-type-options'],'nosniff'); assert.equal(headers['referrer-policy'],'no-referrer');
      }
    }
  }
  const nonces=report.responses.filter(r=>r.headers['content-security-policy']).map(r=>r.headers['content-security-policy'].match(/'nonce-([^']+)'/)[1]);
  assert.equal(new Set(nonces).size,nonces.length); report.freshNonceSamples=nonces.length;
  await stage('Live Alpha identity, initial resources and navigation', async()=>{
    await page.goto(alpha+'/app'); await page.waitForLoadState('networkidle');
    await expect(page.locator('footer')).toContainText('PUBLIC_ALPHA_UNDEPLOYED');
    await expect(page.locator('.network-banner')).toContainText('No blockchain transactions or financial signatures');
    report.initialPerformance=await page.evaluate(()=>({navigation:performance.getEntriesByType('navigation').map(x=>x.toJSON()),resources:performance.getEntriesByType('resource').map(x=>x.toJSON())}));
    await layout('alpha-dashboard');
  });
  const sentinels=['M5_FICTIONAL_GOAL_81f3c7','7319.2468','7319246800000000000000','2033-11-27','M5_FICTIONAL_NOTE_29a6f4'];
  await stage('Fictional local create, deposit and withdraw', async()=>{
    await page.getByRole('link',{name:'+ Create a goal',exact:true}).click();
    await page.getByRole('button',{name:'Travel',exact:true}).click(); await page.getByRole('button',{name:'Continue →',exact:true}).click();
    await page.getByLabel('Private goal name').fill(sentinels[0]); await page.getByLabel('Target amount').fill(sentinels[1]);
    for(let n=0;n<3;n++) await page.getByRole('button',{name:'Continue →',exact:true}).click();
    await page.getByRole('button',{name:'Create goal',exact:true}).click(); await page.getByRole('button',{name:'Confirm simulation',exact:true}).click();
    await expect(page.getByRole('heading',{name:sentinels[0],exact:true})).toBeVisible();
    await layout('alpha-goal');
    for(const name of ['Add funds','Withdraw']) { await page.getByLabel('Amount in ZIG').fill('10'); await page.getByRole('button',{name,exact:true}).click(); await page.getByRole('button',{name:'Confirm simulation',exact:true}).click(); }
  });
  await stage('Local backup export/import and live read-only diagnostics', async()=>{
    await page.getByRole('link',{name:'Settings',exact:true}).click();
    const download=page.waitForEvent('download'); await page.getByRole('button',{name:'Export Goal Data',exact:true}).click(); const file=await download;
    const backup=JSON.parse(await readFile(await file.path(),'utf8')); assert.equal(backup.goals['1'].name,sentinels[0]);
    backup.goals['1'].notes=sentinels[4]; backup.goals['1'].targetDate=sentinels[3];
    await page.getByLabel('Or paste backup JSON').fill(JSON.stringify(backup)); await page.getByRole('button',{name:'Import backup',exact:true}).click();
    await expect.poll(async()=>page.evaluate(()=>JSON.parse(localStorage.getItem('zigoals:metadata:v1:local-simulation:local-demo-user')).goals['1'].notes)).toBe(sentinels[4]);
    const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('zigoals:metadata:v1:local-simulation:local-demo-user')));
    assert.equal(stored.goals['1'].notes,sentinels[4]); assert.equal(stored.goals['1'].targetDate,sentinels[3]);
    await page.getByRole('button',{name:'Check connection',exact:true}).click();
    await expect(page.getByRole('region',{name:'Connection diagnostics'})).toContainText('Verified zig-test-2 · azig · 18 decimals · v5.0.0-patch-1',{timeout:20000});
    const panel=page.getByRole('region',{name:'Connection diagnostics'}); report.diagnostics=await panel.innerText();
    assert.match(report.diagnostics,/3645b489e4bc2a31ef16d39bdc27f7c00e2ecd72/); assert.equal(await panel.getByText('NOT DEPLOYED',{exact:true}).count(),3);
    await page.getByRole('button',{name:'Copy safe diagnostics',exact:true}).click();
    await expect(page.getByRole('region',{name:'Connection diagnostics'})).toContainText(/Safe diagnostic summary copied\.|Clipboard unavailable\./);
    const safe=page.getByLabel('Safe diagnostic summary');
    if(await safe.isVisible()) report.safeDiagnostics=await safe.inputValue();
    else { await expect(page.getByText('Safe diagnostic summary copied.',{exact:true})).toBeVisible(); report.safeDiagnostics='Clipboard write succeeded; clipboard contents not read.'; }
    for(const value of sentinels) assert(!report.safeDiagnostics.includes(value));
    await layout('alpha-settings');
  });
  await stage('Reload retention, close empty goal and navigation', async()=>{
    await page.goto(alpha+'/app/goals/1'); await expect(page.getByRole('heading',{name:sentinels[0],exact:true})).toBeVisible();
    await page.reload(); await expect(page.locator('.mode-strip')).toContainText('LOCAL SIMULATION');
    await expect(page.getByRole('heading',{name:sentinels[0],exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Close empty goal',exact:true}).click(); await page.getByRole('button',{name:'Confirm simulation',exact:true}).click();
    await expect(page.getByText(/Travel · closed/i)).toBeVisible();
    await page.getByRole('link',{name:'Activity',exact:true}).click(); await expect(page.getByRole('heading',{name:'Activity.',exact:true})).toBeVisible();
    await page.waitForLoadState('networkidle');
  });
  const alphaCaptureCount=captures.length;
  await stage('Live landing CTA, safety copy, social links and responsiveness', async()=>{
    await page.goto(apex); await page.waitForLoadState('networkidle');
    const cta=page.getByRole('link',{name:'Explore the Alpha →',exact:true});
    assert.equal(await cta.getAttribute('href'),alpha+'/app'); assert.equal(await cta.getAttribute('target'),'_blank');
    assert.match(await cta.getAttribute('rel'),/noopener/); assert.match(await cta.getAttribute('rel'),/noreferrer/);
    await expect(page.getByText('Public Alpha · Simulation + wallet connection only.',{exact:false})).toBeVisible();
    await expect(page.getByText('Goal Manager is not deployed. No blockchain transaction will be sent.',{exact:false})).toBeVisible();
    report.landingLinks=await page.locator('a').evaluateAll(nodes=>nodes.map(a=>({text:a.textContent.trim(),href:a.href,target:a.target,rel:a.rel})));
    for(const url of ['https://x.com/ZIGoals','https://x.com/ZIGFluencer','https://github.com/reyals1111-ux/ZIGoals']) assert(report.landingLinks.some(a=>a.href===url));
    await layout('landing'); await page.screenshot({path:output+'/landing.png',fullPage:true});
  });
  await page.waitForLoadState('networkidle');
  let drained=0; while(drained<captures.length) {const batch=captures.slice(drained); drained+=batch.length; report.requestRecords.push(...await Promise.all(batch));}
  assert(!report.requestRecords.some(r=>r.captureError));
  const egress=JSON.stringify(report.requestRecords);
  report.privacy={sentinels, requestsInspected:report.requestRecords.length, completeHeaderCapture:'request.allHeaders()',matches:sentinels.filter(value=>egress.includes(value))};
  assert.deepEqual(report.privacy.matches,[]);
  report.requestOrigins=[...new Set(report.requestRecords.map(r=>new URL(r.url).origin))];
  report.alphaRequestOrigins=[...new Set(report.requestRecords.slice(0,alphaCaptureCount).map(r=>new URL(r.url).origin))];
  assert(report.alphaRequestOrigins.every(o=>[alpha,'https://testnet-rpc.zigchain.com','https://testnet-api.zigchain.com'].includes(o)));
  // Existing apex HTML explicitly loads Space Grotesk from Google Fonts; Alpha fonts are local.
  report.landingExternalResources=report.requestRecords.filter(r=>['https://fonts.googleapis.com','https://fonts.gstatic.com'].includes(new URL(r.url).origin)).map(r=>r.url);
  assert(report.requestOrigins.every(o=>[alpha,apex,'https://testnet-rpc.zigchain.com','https://testnet-api.zigchain.com','https://fonts.googleapis.com','https://fonts.gstatic.com'].includes(o)));
  assert(report.requestRecords.every(r=>r.method==='GET'));
  assert.deepEqual(report.pageErrors,[]); assert.deepEqual(report.httpErrors,[]);
  report.status=report.consoleErrors.length || report.failedRequests.length || report.layouts.some(x=>!x.pass) ? 'COMPLETED_WITH_FINDINGS' : 'PASS';
  if (report.status !== 'PASS') process.exitCode=2;
} catch(error) { report.status='FAIL'; report.failure=String(error); report.failureStack=error.stack; report.failurePage=await page.locator('body').innerText().catch(()=> 'unavailable'); await page.screenshot({path:output+'/failure.png',fullPage:true}).catch(()=>{}); process.exitCode=1; }
finally { report.completedAt=new Date().toISOString(); await writeFile(output+'/HOSTED_SMOKE.json',JSON.stringify(report,null,2)+'\n'); await context.close(); await browser.close(); }
console.log(JSON.stringify({status:report.status, stages:report.stages, failure:report.failure, output}));
