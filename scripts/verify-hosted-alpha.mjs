// Explicit manual public smoke. Never part of CI, never connects a wallet. Optional: EXPECTED_COMMIT=<40-hex SHA> (Session W).
// Status: PASS (exit 0), FAIL (1), COMPLETED_WITH_FINDINGS (2) or NEEDS_OWNER_REVIEW (3): an answer it could not check, or
// live prices that are not VERIFIED. The live price check runs first and never stops the rest (Session U Part 2b).
// Fresh ephemeral context; fictional browser-local data only; no mocks.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { probeAlphaMarket } from './lib/alpha-market-probe.mjs';
import { appNonceFindings, priceFinding, reviewReason, hostedStatus } from './lib/hosted-alpha-review.mjs';
import { readPolicyWindow, policyWindowNote } from './lib/market-policy-window.mjs';
import { GOAL_SENTINELS, LOCAL_SIMULATION_METADATA_KEY, createFictionalGoal, depositAndWithdraw, openDiagnostics, previewSafeDiagnostics, closeFictionalGoal } from './lib/hosted-alpha-goal-stage.mjs';
const require = createRequire(new URL('../apps/web/package.json', import.meta.url));
const { chromium, expect } = require('@playwright/test');
const output = process.argv[2];
if (!output) throw Error('Provide a new evidence output directory.');
await mkdir(output);
// Session T (ADR-012): the reviewed connect-src comes from the app's own data file, never a copy.
const egressPolicy = JSON.parse(await readFile(new URL('../apps/web/lib/egress-policy.json', import.meta.url), 'utf8'));
const alpha = 'https://alpha.zigoals.app';
const fallback = 'https://zigoals-alpha.reyals1111.workers.dev';
const apex = 'https://zigoals.app';
// Session W Part 1d: with EXPECTED_COMMIT set to a full SHA, every /app answer must name that build (x-zigoals-build).
const expectedBuild = /^[a-f0-9]{40}$/.test(process.env.EXPECTED_COMMIT ?? '') ? process.env.EXPECTED_COMMIT : null;
const report = { observedAt: new Date().toISOString(), evidenceSource: 'INDEPENDENT_HOSTED_SMOKE', expectedBuild, builds: [], review: [], sourceScript: fileURLToPath(import.meta.url), mocks: false, walletInteraction: false, freshEphemeralContext: true, responses: [], requestRecords: [], pageErrors: [], consoleErrors: [], failedRequests: [], httpErrors: [], layouts: [], stages: [], limits: ['Single client and small request sample; not load testing or Core Web Vitals.', 'This automated smoke does not inspect Cloudflare CPU/account metrics or private email settings.', 'No real wallet extension test; owner evidence remains separate.'] };
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
  // Session S: live prices. Unlike the Manual Alpha workflow's smoke, this owner check requires a fresh verified BTC/USD
  // price. Only closed-vocabulary fields are recorded. On UNAVAILABLE, follow docs/run11/ALPHA_PRICES_ROLLOUT.md.
  report.marketProbe=await probeAlphaMarket({origin:alpha});
  const price=priceFinding(report.marketProbe); if (price) report.review.push(price);
  report.stages.push({name:'Live BTC/USD price through the market coordinator', status:price?'NEEDS_OWNER_REVIEW':'PASS'});
  // Session U Part 2d: when the market policy period ends. Information only, never a review reason.
  const policyRead=await readPolicyWindow({origin:alpha}); report.policyWindow={...policyRead,...policyWindowNote(policyRead.policyWindowEnd,Date.now(),policyRead.nextPolicyWindowEnd)};
  for (const [origin, path, count] of [[alpha,'/app',3],[fallback,'/app',2],[apex,'/',2]]) {
    for (let sample=1; sample<=count; sample++) {
      // Session U: a sample that cannot be fetched or checked is a review reason, not the end of the run.
      try {
      const start=performance.now(); const response=await context.request.get(origin+path, {timeout:20000});
      const body=await response.body(); const headers=response.headers();
      report.responses.push({url:response.url(), sample, status:response.status(), elapsedMs:Math.round(performance.now()-start), decodedBodyBytes:body.length, headers});
      assert.equal(response.status(),200); assert(response.url().startsWith('https://'));
      if (path === '/app') {
        // Session W Part 1d: which build answered, recorded always; another build than the expected one is for review.
        const build=headers['x-zigoals-build']??null; report.builds.push({url:origin+path, sample, build});
        if (expectedBuild && build!==expectedBuild) throw Error(`This answer came from ${build?`build ${build}`:'a build that names none'}, not the expected ${expectedBuild}`);
        const csp=headers['content-security-policy'];
        assert.match(csp,/script-src 'self' 'nonce-[A-Za-z0-9+/]+=*' 'strict-dynamic'/);
        assert.doesNotMatch(csp.split(';').find(s=>s.includes('script-src')),/unsafe-inline|unsafe-eval/);
        assert.deepEqual(csp.split(';').map(s=>s.trim()).find(s=>s.startsWith('connect-src ')).split(/\s+/).slice(1).sort(), ["'self'", ...egressPolicy.chainOrigins, ...Object.values(egressPolicy.aiProviderOrigins), ...egressPolicy.localModelSources].sort());
        for (const d of ['object-src','frame-src','frame-ancestors','base-uri']) assert(csp.includes(`${d} 'none'`));
        assert(csp.includes("form-action 'self'"));
        // Session V Part 19 (docs/security/TRUSTED_TYPES.md): Trusted Types enforced, with the default policy only.
        assert(csp.split(';').map(s=>s.trim()).includes("require-trusted-types-for 'script'"),'Trusted Types must be enforced');
        assert.deepEqual(csp.split(';').map(s=>s.trim()).filter(s=>s.startsWith('trusted-types')),['trusted-types default'],'Trusted Types must allow the default policy only');
        assert.match(headers['strict-transport-security'],/max-age=31536000/);
        assert.match(headers['cache-control'],/no-store/); assert.match(headers['x-robots-tag'],/noindex/);
        assert.equal(headers['x-frame-options'],'DENY'); assert.equal(headers['x-content-type-options'],'nosniff'); assert.equal(headers['referrer-policy'],'no-referrer');
        // Session U Part 6 (FIX_PLAN D1): a page this app opens, or that opens it, gets no handle on it.
        assert.equal(headers['cross-origin-opener-policy'],'same-origin');
      }
      } catch (error) { report.review.push(reviewReason(`${origin}${path} sample ${sample}`, error)); }
    }
  }
  // Nonces of the Alpha's /app samples only: the apex landing's static CSP has none (the old line crashed on it).
  const nonceSample=appNonceFindings(report.responses); report.review.push(...nonceSample.findings); report.freshNonceSamples=nonceSample.nonces.length;
  await stage('Live Alpha identity, initial resources and navigation', async()=>{
    await page.goto(alpha+'/app'); await page.waitForLoadState('networkidle');
    await expect(page.locator('footer')).toContainText('PUBLIC_ALPHA_UNDEPLOYED');
    await expect(page.locator('.network-banner')).toContainText('No blockchain transactions or financial signatures');
    report.initialPerformance=await page.evaluate(()=>({navigation:performance.getEntriesByType('navigation').map(x=>x.toJSON()),resources:performance.getEntriesByType('resource').map(x=>x.toJSON())}));
    await layout('alpha-dashboard');
  });
  // Session V Part 1a: the goal steps live in lib/hosted-alpha-goal-stage.mjs, which a browser spec runs against a local
  // production build on every PR (apps/web/tests/hosted-alpha-goal-stage.spec.ts), so these selectors cannot go stale.
  const sentinels=[GOAL_SENTINELS.name,GOAL_SENTINELS.target,GOAL_SENTINELS.targetUnits,GOAL_SENTINELS.date,GOAL_SENTINELS.note];
  await stage('Fictional local create, deposit and withdraw', async()=>{
    await createFictionalGoal(page, expect);
    await layout('alpha-goal');
    await depositAndWithdraw(page);
  });
  await stage('Local backup export/import and live read-only diagnostics', async()=>{
    await page.getByRole('link',{name:'Settings',exact:true}).click();
    const download=page.waitForEvent('download'); await page.getByRole('button',{name:'Export Goal Data',exact:true}).click(); const file=await download;
    const backup=JSON.parse(await readFile(await file.path(),'utf8')); assert.equal(backup.goals['1'].name,sentinels[0]);
    backup.goals['1'].notes=sentinels[4]; backup.goals['1'].targetDate=sentinels[3];
    await page.getByLabel('Or paste backup JSON').fill(JSON.stringify(backup)); await page.getByRole('button',{name:'Import backup',exact:true}).click();
    await expect.poll(async()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)).goals['1'].notes,LOCAL_SIMULATION_METADATA_KEY)).toBe(sentinels[4]);
    const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),LOCAL_SIMULATION_METADATA_KEY);
    assert.equal(stored.goals['1'].notes,sentinels[4]); assert.equal(stored.goals['1'].targetDate,sentinels[3]);
    // Session V Part 1a: "Check connection" sits inside the folded Advanced Diagnostics, and the safe summary is previewed
    // before it is copied ("Preview safe diagnostics", then "Copy reviewed diagnostics").
    const panel=await openDiagnostics(page);
    await page.getByRole('button',{name:'Check connection',exact:true}).click();
    await expect(panel).toContainText('Verified zig-test-2 · azig · 18 decimals · v5.0.0-patch-1',{timeout:20000});
    report.diagnostics=await panel.innerText();
    assert.match(report.diagnostics,/3645b489e4bc2a31ef16d39bdc27f7c00e2ecd72/); assert.equal(await panel.getByText('NOT DEPLOYED',{exact:true}).count(),3);
    report.safeDiagnostics=await previewSafeDiagnostics(page, expect);
    for(const value of sentinels) assert(!report.safeDiagnostics.includes(value));
    await layout('alpha-settings');
  });
  await stage('Reload retention, close empty goal and navigation', async()=>{
    await page.goto(alpha+'/app/goals/1'); await expect(page.getByRole('heading',{name:sentinels[0],exact:true})).toBeVisible();
    await page.reload(); await expect(page.locator('.mode-strip')).toContainText('LOCAL SIMULATION');
    await expect(page.getByRole('heading',{name:sentinels[0],exact:true})).toBeVisible();
    await closeFictionalGoal(page, expect);
    await page.getByRole('link',{name:'Activity',exact:true}).click(); await expect(page.getByRole('heading',{name:'Activity.',exact:true})).toBeVisible();
    await page.waitForLoadState('networkidle');
  });
  const alphaCaptureCount=captures.length;
  await stage('Live landing CTA, safety copy, social links and responsiveness', async()=>{
    await page.goto(apex); await page.waitForLoadState('networkidle');
    const cta=page.getByRole('link',{name:'Launch Alpha',exact:false}).first();
    assert.equal(await cta.getAttribute('href'),alpha+'/app'); assert.equal(await cta.getAttribute('target'),'_blank');
    assert.match(await cta.getAttribute('rel'),/noopener/); assert.match(await cta.getAttribute('rel'),/noreferrer/);
    await expect(page.locator('.alpha-status')).toHaveText('Public Alpha / Financial execution disabled');
    await expect(page.getByText('Financial signing and broadcasting are disabled, and the Goal Manager contract is not deployed.',{exact:false})).toBeVisible();
    await expect(page.getByText('Independent project · Not affiliated with ZIGChain · Financial execution disabled',{exact:false})).toBeVisible();
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
  report.status=hostedStatus(report);
  if (report.status !== 'PASS') process.exitCode=report.status==='NEEDS_OWNER_REVIEW'?3:2;
} catch(error) { report.status='FAIL'; report.failure=String(error); report.failureStack=error.stack; report.failurePage=await page.locator('body').innerText().catch(()=> 'unavailable'); await page.screenshot({path:output+'/failure.png',fullPage:true}).catch(()=>{}); process.exitCode=1; }
finally { report.completedAt=new Date().toISOString(); await writeFile(output+'/HOSTED_SMOKE.json',JSON.stringify(report,null,2)+'\n'); await context.close(); await browser.close(); }
console.log(JSON.stringify({status:report.status, stages:report.stages, review:report.review, policyWindow:report.policyWindow?.text, failure:report.failure, output}));
