// Session AE (Part 0b, ADR-027): the stages of the owner's scripts/verify-hosted-alpha.mjs, one function per stage in the
// order the verifier runs them (VERIFIER_STAGES). The owner's run on Alpha #43 (2026-10-17) failed at stage 3: since
// Session AC (c9273d6b) stage 2 ends on /app/settings, and the goal steps begin with Today's "+ Quick add". Every stage
// that uses the browser now opens the page it needs first, and apps/web/tests/hosted-verifier-order.spec.ts runs stages
// 2 → 6 through this very list on one page against the local build on every pull request, so a stage that leaves the
// page where the next cannot start fails CI instead of the owner's live check.
//
// Each stage is `run(page, ctx)`; ctx holds the base origin the app checks use (the live Alpha, or ZIGOALS_VERIFY_BASE),
// whether this is the live run, the live origins, the expected commit, Playwright's `expect` and the report object the
// stages fill (HOSTED_SMOKE.json). No import.meta and no top-level await: the browser spec loads this file too.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {connectSources, frameSources} from '../../apps/web/lib/csp-compose.mjs';
import {probeAlphaMarket} from './alpha-market-probe.mjs';
import {appNonceFindings, priceFinding, readLiveBaseFee, reviewReason, reviewedRestPattern} from './hosted-alpha-review.mjs';
import {BASE_FEE_REST_PATH, TESTNET, checkVersion, formatGazig, parseBaseFee} from '../../packages/chain-config/src/index.ts';
import {readPolicyWindow, policyWindowNote} from './market-policy-window.mjs';
import {CHECKLIST_SENTINELS, CHECKLIST_STAGE} from './hosted-alpha-checklist.mjs';
import {AK_STAGE} from './hosted-alpha-ak.mjs';
import {EARN_STAGE} from './hosted-alpha-earn.mjs';
import {GOAL_SENTINELS, LOCAL_SIMULATION_METADATA_KEY, createFictionalGoal, depositAndWithdraw, openDiagnostics, previewSafeDiagnostics, closeFictionalGoal, todayQuickAdd} from './hosted-alpha-goal-stage.mjs';

export const LIVE_ORIGINS = Object.freeze({alpha: 'https://alpha.zigoals.app', fallback: 'https://zigoals-alpha.reyals1111.workers.dev', apex: 'https://zigoals.app'});
/** The fictional values no request may carry (the privacy check) and no safe diagnostic summary may show. */
// Session AF (ADR-028 H57): the Checklist stage's fictional habit title joins the privacy sentinels.
export const SENTINELS = Object.freeze([GOAL_SENTINELS.name, GOAL_SENTINELS.target, GOAL_SENTINELS.targetUnits, GOAL_SENTINELS.date, GOAL_SENTINELS.note, CHECKLIST_SENTINELS.habit]);

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]']);
/**
 * ZIGOALS_VERIFY_BASE: unset or empty is the live run on the live Alpha. Otherwise only an https:// origin or an http://
 * loopback origin (127.0.0.1, localhost, [::1]), with no path, query, fragment or credentials; anything else throws.
 */
export function verifyBase(raw) {
  if (raw === undefined || raw === '') return {base: LIVE_ORIGINS.alpha, live: true};
  const refuse = why => Error(`ZIGOALS_VERIFY_BASE=${JSON.stringify(raw)} is refused: ${why}. Use an origin such as http://127.0.0.1:3101 (an http:// loopback origin: 127.0.0.1, localhost or [::1]) or https://…, or unset it for the live Alpha.`);
  let url;
  try { url = new URL(raw); } catch { throw refuse('not a URL'); }
  if (url.username || url.password || url.pathname !== '/' || /[?#]/.test(raw)) throw refuse('only an origin is accepted (no path, query, fragment or credentials)');
  if (url.protocol === 'https:' || (url.protocol === 'http:' && LOOPBACK.has(url.hostname))) return {base: url.origin, live: false};
  throw refuse(url.protocol === 'http:' ? 'plain http is accepted only for a loopback host' : `${url.protocol} is not https: or http:`);
}

/** The four widths of the sideways-scroll check, recorded in report.layouts; it ends at 1280 × 900. */
export async function recordLayouts(page, report, label) {
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({width, height: 900});
    const actual = await page.evaluate(() => ({viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth}));
    report.layouts.push({label, ...actual, pass: actual.scrollWidth <= actual.viewport});
  }
}

/** Waits until the app's shell has hydrated (`<html data-app-hydrated>`, Session AB-Design), so a click is not lost. */
async function hydrated(page) {
  await page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 20000});
}

const PRICE = 'Live BTC/USD price through the market coordinator';
const LANDING = 'Live landing CTA, safety copy, social links and responsiveness';

/** Stage 1: the live price, then the header samples (no page; the context's request client). */
async function priceAndHeaders(page, {base, live, origins, expectedCommit, report, egressPolicy}) {
  if (live) {
    // Session S: live prices. Unlike the Manual Alpha workflow's smoke, this owner check requires a fresh verified BTC/USD
    // price. Only closed-vocabulary fields are recorded. On UNAVAILABLE, follow docs/run11/ALPHA_PRICES_ROLLOUT.md.
    report.marketProbe = await probeAlphaMarket({origin: base});
    const price = priceFinding(report.marketProbe); if (price) report.review.push(price);
    report.stages.push({name: PRICE, status: price ? 'NEEDS_OWNER_REVIEW' : 'PASS'});
    // Session U Part 2d: when the market policy period ends. Information only, never a review reason.
    const policyRead = await readPolicyWindow({origin: base}); report.policyWindow = {...policyRead, ...policyWindowNote(policyRead.policyWindowEnd, Date.now(), policyRead.nextPolicyWindowEnd)};
  } else report.stages.push({name: PRICE, status: 'SKIPPED'});
  const https = base.startsWith('https://');
  for (const [origin, path, count] of live ? [[base, '/app', 3], [origins.fallback, '/app', 2], [origins.apex, '/', 2]] : [[base, '/app', 3]]) {
    for (let sample = 1; sample <= count; sample++) {
      // Session U: a sample that cannot be fetched or checked is a review reason, not the end of the run.
      try {
      const start = performance.now(); const response = await page.context().request.get(origin + path, {timeout: 20000});
      const body = await response.body(); const headers = response.headers();
      report.responses.push({url: response.url(), sample, status: response.status(), elapsedMs: Math.round(performance.now() - start), decodedBodyBytes: body.length, headers});
      // Session AE (Part 0b): an http:// loopback base answers over plain http, from that base (liveOnlySkips).
      assert.equal(response.status(), 200); assert(https ? response.url().startsWith('https://') : new URL(response.url()).origin === base);
      if (path === '/app') {
        // Session W Part 1d: which build answered, recorded always; another build than the expected one is for review.
        const build = headers['x-zigoals-build'] ?? null; report.builds.push({url: origin + path, sample, build});
        if (expectedCommit && build !== expectedCommit) throw Error(`This answer came from ${build ? `build ${build}` : 'a build that names none'}, not the expected ${expectedCommit}`);
        const csp = headers['content-security-policy'];
        assert.match(csp, /script-src 'self' 'nonce-[A-Za-z0-9+/]+=*' 'strict-dynamic'/);
        assert.doesNotMatch(csp.split(';').find(s => s.includes('script-src')), /unsafe-inline|unsafe-eval/);
        assert.deepEqual(csp.split(';').map(s => s.trim()).find(s => s.startsWith('connect-src ')).split(/\s+/).slice(1).sort(), connectSources(egressPolicy, 'app').sort());
        for (const d of ['object-src', 'frame-ancestors', 'base-uri']) assert(csp.includes(`${d} 'none'`));
        assert(csp.split(';').map(s => s.trim()).includes(`frame-src ${frameSources(egressPolicy, 'app').join(' ')}`), 'frame-src must be exactly the reviewed sources');
        assert(csp.includes("form-action 'self'"));
        // Session V Part 19 (docs/security/TRUSTED_TYPES.md): Trusted Types enforced, with the default policy only.
        assert(csp.split(';').map(s => s.trim()).includes("require-trusted-types-for 'script'"), 'Trusted Types must be enforced');
        assert.deepEqual(csp.split(';').map(s => s.trim()).filter(s => s.startsWith('trusted-types')), ['trusted-types default'], 'Trusted Types must allow the default policy only');
        // HSTS stays on a local base too: next.config.ts sends it on every route, also from a local `next start`.
        assert.match(headers['strict-transport-security'], /max-age=31536000/);
        assert.match(headers['cache-control'], /no-store/); assert.match(headers['x-robots-tag'], /noindex/);
        assert.equal(headers['x-frame-options'], 'DENY'); assert.equal(headers['x-content-type-options'], 'nosniff'); assert.equal(headers['referrer-policy'], 'no-referrer');
        // Session U Part 6 (FIX_PLAN D1): a page this app opens, or that opens it, gets no handle on it.
        assert.equal(headers['cross-origin-opener-policy'], 'same-origin');
      }
      } catch (error) { report.review.push(reviewReason(`${origin}${path} sample ${sample}`, error)); }
    }
  }
  // Nonces of the Alpha's /app samples only: the apex landing's static CSP has none (the old line crashed on it).
  const nonceSample = appNonceFindings(report.responses); report.review.push(...nonceSample.findings); report.freshNonceSamples = nonceSample.nonces.length;
}

/** Stage 2: opens Today, then Settings (it ends there since Session AC). */
async function identity(page, {base, expect, report}) {
  await page.goto(base + '/app'); await page.waitForLoadState('networkidle');
  // Session AC (owner finding 3 on #41): the page ends after the footer's link columns. The first-visit notice carries
  // the label and the sentence on /app; Settings' facts block carries the sentence, the mode and the build environment.
  await expect(page.getByRole('complementary', {name: 'Alpha notice'})).toContainText('Staking and votes sign in your own wallet (practice or real, your choice). Nothing else moves, and ZIGoals never holds keys.');
  await expect(page.locator('footer .network-banner, footer .mode-strip')).toHaveCount(0);
  report.initialPerformance = await page.evaluate(() => ({navigation: performance.getEntriesByType('navigation').map(x => x.toJSON()), resources: performance.getEntriesByType('resource').map(x => x.toJSON())}));
  await recordLayouts(page, report, 'alpha-dashboard');
  await page.goto(base + '/app/settings');
  await expect(page.locator('.about-alpha')).toContainText('PUBLIC_ALPHA_UNDEPLOYED');
  await expect(page.locator('.about-alpha .network-banner')).toContainText('Staking and votes sign in your own wallet (practice or real, your choice). Nothing else moves, and ZIGoals never holds keys.');
}

/**
 * Stage 3: opens Today and waits for its "+ Quick add" before the goal steps (the #43 failure). Session V Part 1a: the
 * goal steps live in lib/hosted-alpha-goal-stage.mjs, which apps/web/tests/hosted-alpha-goal-stage.spec.ts also runs.
 */
async function fictionalGoal(page, {base, expect, report}) {
  await page.goto(base + '/app'); await hydrated(page);
  await expect(todayQuickAdd(page)).toBeVisible();
  await createFictionalGoal(page, expect);
  await recordLayouts(page, report, 'alpha-goal');
  await depositAndWithdraw(page);
}

/** Stage 4: opens Settings (in-app navigation to Settings stays checked in stage 5). */
async function backupAndDiagnostics(page, {base, expect, report, expectedCommit, reviewedVersions, chainFetcher}) {
  await page.goto(base + '/app/settings'); await hydrated(page);
  const exportData = page.getByRole('button', {name: 'Export Goal Data', exact: true});
  await expect(exportData).toBeVisible();
  const download = page.waitForEvent('download'); await exportData.click(); const file = await download;
  const backup = JSON.parse(await readFile(await file.path(), 'utf8')); assert.equal(backup.goals['1'].name, SENTINELS[0]);
  backup.goals['1'].notes = SENTINELS[4]; backup.goals['1'].targetDate = SENTINELS[3];
  await page.getByLabel('Or paste backup JSON').fill(JSON.stringify(backup)); await page.getByRole('button', {name: 'Import backup', exact: true}).click();
  await expect.poll(async () => page.evaluate(key => JSON.parse(localStorage.getItem(key)).goals['1'].notes, LOCAL_SIMULATION_METADATA_KEY)).toBe(SENTINELS[4]);
  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), LOCAL_SIMULATION_METADATA_KEY);
  assert.equal(stored.goals['1'].notes, SENTINELS[4]); assert.equal(stored.goals['1'].targetDate, SENTINELS[3]);
  // Session V Part 1a: "Check connection" sits inside the folded Advanced Diagnostics, and the safe summary is previewed
  // before it is copied ("Preview safe diagnostics", then "Copy reviewed diagnostics").
  const panel = await openDiagnostics(page);
  await page.getByRole('button', {name: 'Check connection', exact: true}).click();
  // Session X Part 1, Session AJ (D1): zig-test-2 runs a reviewed zigchaind line (any patch of v5.1 or v6.0).
  await expect(panel).toContainText(reviewedRestPattern(reviewedVersions), {timeout: 20000});
  report.diagnostics = await panel.innerText();
  // Session AJ (ADR-035 A3): the verifier itself reads the version and, on v6, the base fee (read-only) and prints it,
  // so the live check proves the v6 fee path; a v6 node without a base fee is a finding. The page must name it too.
  if (chainFetcher) {
    report.baseFee = await readLiveBaseFee(chainFetcher, {restUrl: TESTNET.restUrl, chainId: TESTNET.chainId, checkVersion, parseBaseFee, formatGazig, basePath: BASE_FEE_REST_PATH});
    console.error(`[verifier] stage 4 fee path: ${report.baseFee.line}`);
    if (report.baseFee.fee === 'base-fee') assert.match(report.diagnostics, /· base fee [\d.]+ Gazig per gas/);
  }
  // The build commit Settings shows: the exact EXPECTED_COMMIT when given, else a full 40-hex commit (it pinned M5's
  // 3645b48 until Session X, so it failed on every later deploy).
  assert.match(report.diagnostics, expectedCommit ? new RegExp(`App version / build commit\\n[^\\n]*${expectedCommit}`) : /App version \/ build commit\n[^\n]*\b[a-f0-9]{40}\b/); assert.equal(await panel.getByText('NOT DEPLOYED', {exact: true}).count(), 3);
  report.safeDiagnostics = await previewSafeDiagnostics(page, expect);
  for (const value of SENTINELS) assert(!report.safeDiagnostics.includes(value));
  await recordLayouts(page, report, 'alpha-settings');
}

/** Stage 5: opens the goal, reloads it, reads the mode in Settings, comes back, closes the goal and opens Activity. */
async function reloadAndClose(page, {base, expect}) {
  await page.goto(base + '/app/goals/1'); await expect(page.getByRole('heading', {name: SENTINELS[0], exact: true})).toBeVisible();
  await page.reload(); await expect(page.getByRole('heading', {name: SENTINELS[0], exact: true})).toBeVisible();
  // Session AC: the mode is read in Settings' facts block (the footer's strip until #41), reached in the app, then back.
  await page.getByRole('navigation', {name: 'Main navigation'}).getByRole('link', {name: 'Settings', exact: true}).click();
  await expect(page.locator('.about-alpha .mode-strip')).toContainText('LOCAL SIMULATION');
  await page.goBack();
  await closeFictionalGoal(page, expect);
  await page.getByRole('link', {name: 'Activity', exact: true}).click(); await expect(page.getByRole('heading', {name: 'Activity.', exact: true})).toBeVisible();
  await page.waitForLoadState('networkidle');
}

/**
 * Stage 6. Session AB-Cloud Part 10 (ADR-023 C31): the pages Sessions AA-Cloud and AA-Local added open with their own
 * title and heading and no sideways scroll (fictional local data only, nothing is changed). Each one is opened directly.
 */
async function aaPages(page, {base, expect, report}) {
  for (const [path, title] of [['/app/wealth/calculator', 'Compound interest calculator'], ['/app/review', 'Life review'], ['/app/journey', 'Journey'], ['/app/settings/data', 'Your data'], ['/app/settings/reminders', 'Reminders'], ['/app/share?text=Fictional%20note', 'Shared with ZIGoals']]) {
    await page.goto(base + path); await expect(page.locator('main h1').first()).toBeVisible();
    assert.equal(await page.title(), `${title} · ZIGoals Alpha`, path);
    await recordLayouts(page, report, 'alpha' + path.split('?')[0].replaceAll('/', '-'));
  }
  await page.setViewportSize({width: 1280, height: 900});
}

/** The landing's honesty line sets stage 7 accepts (Session AJ item 3; Part 9 may add the session's new set). */
export const LANDING_LINE_SETS = Object.freeze([
  Object.freeze({status: 'Public Alpha / Nothing moves unless you sign', alpha: 'ZIGoals never holds keys. The Goal Manager contract is not deployed, so Goals never move funds.', independence: 'Independent project · Not affiliated with ZIGChain · Nothing moves unless you sign'}),
]);
/** Stage 7 (live only): the apex landing, a separate deployment, and its CTA to the live Alpha. */
async function landing(page, {origins, expect, report, output}) {
  await page.goto(origins.apex); await page.waitForLoadState('networkidle');
  const cta = page.getByRole('link', {name: 'Launch Alpha', exact: false}).first();
  assert.equal(await cta.getAttribute('href'), origins.alpha + '/app'); assert.equal(await cta.getAttribute('target'), '_blank');
  assert.match(await cta.getAttribute('rel'), /noopener/); assert.match(await cta.getAttribute('rel'), /noreferrer/);
  // Session AH (MO5; TIER 3 verifier), Session AJ (item 3): the landing deployed from 65d0b85 (version 8708970d, 28 Oct)
  // carries the "Nothing moves unless you sign" lines, so the pre-#50 "Financial execution disabled" set is dropped.
  // LANDING_LINE_SETS holds the live set and, while the owner has not redeployed the landing after Session AJ, the
  // session's new set: exactly one must be there in full.
  const sets = LANDING_LINE_SETS;
  const shown = ((await page.locator('.alpha-status').textContent()) ?? '').replace(/\s+/g, ' ').trim();
  const set = sets.find(s => s.status === shown);
  assert.ok(set, `landing status line is neither known set: "${shown}"`);
  await expect(page.getByText(set.alpha, {exact: false})).toBeVisible();
  await expect(page.getByText(set.independence, {exact: false})).toBeVisible();
  report.landingLinks = await page.locator('a').evaluateAll(nodes => nodes.map(a => ({text: a.textContent.trim(), href: a.href, target: a.target, rel: a.rel})));
  for (const url of ['https://x.com/ZIGoals', 'https://x.com/ZIGFluencer', 'https://github.com/reyals1111-ux/ZIGoals']) assert(report.landingLinks.some(a => a.href === url));
  await recordLayouts(page, report, 'landing'); await page.screenshot({path: output + '/landing.png', fullPage: true});
}

/**
 * Stage 8. Session AB-Cloud Part 10 (ADR-023 C31): the recipe route refuses what it must before any fetch (Node's fetch,
 * outside the page, so the page's GET-only record is unchanged; never a real third-party page).
 */
async function recipeRefusals(page, {base, report}) {
  report.recipeRefusals = [];
  for (const [url, code] of [['http://example.com/recipe', 'NOT_HTTPS'], ['https://127.0.0.1/recipe', 'PRIVATE_HOST'], ['https://example.com/' + 'a'.repeat(2050), 'INVALID_URL']]) {
    const res = await fetch(base + '/api/recipe-import', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({url})});
    const body = await res.json().catch(() => ({}));
    report.recipeRefusals.push({expected: code, status: res.status, error: body.error});
    assert.equal(res.status, 400, code); assert.equal(body.error, code);
  }
}

/**
 * The stages in the verifier's order (the owner's numbering). `browser`: it uses the page, and opens its own page first.
 * `liveOnly`: skipped as a whole on a local base. `reportsItself`: it records its own entry in report.stages (stage 1's
 * price status); the verifier records PASS for every other stage that returns.
 */
export const VERIFIER_STAGES = Object.freeze([
  {number: 1, key: 'price-and-headers', name: PRICE, browser: false, liveOnly: false, reportsItself: true, run: priceAndHeaders},
  {number: 2, key: 'identity', name: 'Live Alpha identity, initial resources and navigation', browser: true, liveOnly: false, reportsItself: false, run: identity},
  {number: 3, key: 'goal', name: 'Fictional local create, deposit and withdraw', browser: true, liveOnly: false, reportsItself: false, run: fictionalGoal},
  {number: 4, key: 'backup-diagnostics', name: 'Local backup export/import and live read-only diagnostics', browser: true, liveOnly: false, reportsItself: false, run: backupAndDiagnostics},
  {number: 5, key: 'reload-close', name: 'Reload retention, close empty goal and navigation', browser: true, liveOnly: false, reportsItself: false, run: reloadAndClose},
  {number: 6, key: 'aa-pages', name: 'AA pages: calculator, Life review, Journey, Your data, Reminders and Share open', browser: true, liveOnly: false, reportsItself: false, run: aaPages},
  {number: 7, key: 'landing', name: LANDING, browser: true, liveOnly: true, reportsItself: false, run: landing},
  {number: 8, key: 'recipe', name: 'Recipe import refuses http, a private host and an oversized address', browser: false, liveOnly: false, reportsItself: false, run: recipeRefusals},
  // Session AF (ADR-028 H57): new stages are appended, never inserted; existing numbers never change.
  EARN_STAGE,
  CHECKLIST_STAGE,
  // Session AK Part 14 (TIER 3 (verifier)): the AK stage; its off switches are recorded, never a failure.
  AK_STAGE,
].map(stage => Object.freeze(stage)));

/**
 * What a local base skips, as `{stage, reason}` (HOSTED_SMOKE.json `skipped`; docs/deployment/MANUAL_ALPHA_WORKFLOW.md
 * names each `label`). Only what a local build cannot answer: every header check of the base's /app samples still runs,
 * CSP, nonces, Trusted Types and HSTS included (middleware.ts and next.config.ts send them from a local `next start`).
 */
export const LIVE_ONLY_CHECKS = Object.freeze([
  {key: 'price', stage: PRICE, label: 'the live BTC/USD price and the market policy period', reason: 'live only: both come from the deployed market coordinator (a Worker binding and a provider key that a local build does not have)'},
  {key: 'fallback-headers', stage: `${PRICE} (header samples of ${LIVE_ORIGINS.fallback}/app)`, label: 'the workers.dev fallback header samples', reason: 'live only: the deployed Alpha\'s second origin'},
  {key: 'apex-headers', stage: `${PRICE} (header samples of ${LIVE_ORIGINS.apex}/)`, label: 'the apex header samples', reason: 'live only: the apex landing is its own deployment (landing/), not this app'},
  {key: 'https', stage: `${PRICE} (the /app samples answered over HTTPS)`, label: 'the HTTPS answer check', reason: 'live only: an http:// loopback base answers over plain http; its answers must come from that base instead', httpOnly: true},
  {key: 'landing', stage: LANDING, label: 'the landing stage', reason: 'live only: https://zigoals.app is the separate landing deployment, and its CTA must lead to the live Alpha'},
  {key: 'unbound-api', stage: 'HTTP and console errors: 503 answers of the base\'s own /api routes', label: '503 answers of the app\'s own /api routes', reason: 'live only: those routes need the deployment\'s Worker bindings (push, account, market); a local build answers 503 ("not configured here"); they are recorded under setAside, not counted'},
].map(check => Object.freeze(check)));

/** The `skipped` list of a run on `base` (an https base answers over HTTPS, so only an http loopback base skips that). */
export function liveOnlySkips(base) {
  return LIVE_ONLY_CHECKS.filter(check => !check.httpOnly || base.startsWith('http://')).map(({stage, reason}) => ({stage, reason}));
}

const UNBOUND_CONSOLE = /^Failed to load resource: the server responded with a status of 503\b/;
/**
 * On a local base only: moves the base's own /api answers of 503, and Chrome's "Failed to load resource" line for each of
 * those URLs, from report.httpErrors and report.consoleErrors to report.setAside (LIVE_ONLY_CHECKS "unbound-api"). Any
 * other status, origin or path stays an error; so does a console line for any other URL.
 */
export function setAsideUnboundApi(report, base) {
  const unbound = ({url, status}) => { try { const {origin, pathname} = new URL(url); return status === 503 && origin === base && pathname.startsWith('/api/'); } catch { return false; } };
  const urls = new Set(report.httpErrors.filter(unbound).map(answer => answer.url));
  const line = entry => UNBOUND_CONSOLE.test(entry.message ?? '') && urls.has(entry.location?.url);
  report.setAside = {httpErrors: report.httpErrors.filter(unbound), consoleErrors: report.consoleErrors.filter(line)};
  report.httpErrors = report.httpErrors.filter(answer => !unbound(answer));
  report.consoleErrors = report.consoleErrors.filter(entry => !line(entry));
}

/**
 * Session AF Part 11 A2 (ADR-028 H70): the public Alpha's two designed "not configured on this installation" answers. On
 * any base, exactly these — the path, the query, GET, status 503 and this JSON body — are named items, not HTTP errors:
 * the push Worker and accounts are off until the owner activates them, and a correctly configured Alpha says so on every
 * page that asks. Anything else still counts, including the same path with another status, body, query or method, and an
 * answer whose body could not be read (fail closed).
 */
export const NOT_CONFIGURED_ANSWERS = Object.freeze([
  Object.freeze({path: '/api/push', search: '', method: 'GET', status: 503, body: Object.freeze({error: 'PUSH_UNAVAILABLE', message: 'Reminders while ZIGoals is closed are not available in this build.'})}),
  Object.freeze({path: '/api/private-account', search: '?action=status', method: 'GET', status: 503, body: Object.freeze({error: 'HOSTED_CONFIGURATION_REQUIRED', message: 'Email and encrypted sync have not been configured. Local records remain available.'})}),
]);
const sameJson = (text, expected) => { try { const parsed = JSON.parse(text); return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) && Object.keys(parsed).length === Object.keys(expected).length && Object.entries(expected).every(([key, value]) => parsed[key] === value); } catch { return false; } };
/**
 * Moves the designed answers (NOT_CONFIGURED_ANSWERS) and Chrome's "Failed to load resource" line for each of their URLs
 * from report.httpErrors and report.consoleErrors to report.notConfigured, a named, counted list printed in the summary
 * and never a review reason (a review reason would deny PASS to every correctly configured Alpha). `answerOf(entry)`
 * returns the request method and the response body the verifier read for that error (undefined when unread).
 */
export function setAsideNotConfigured(report, base, answerOf) {
  const designed = entry => {
    let url; try { url = new URL(entry.url); } catch { return undefined; }
    const answer = answerOf(entry);
    if (url.origin !== base || typeof answer?.body !== 'string') return undefined;
    return NOT_CONFIGURED_ANSWERS.find(d => url.pathname === d.path && url.search === d.search && entry.status === d.status && answer.method === d.method && sameJson(answer.body, d.body));
  };
  const named = report.httpErrors.map(entry => ({entry, match: designed(entry)})).filter(x => x.match);
  const urls = new Set(named.map(x => x.entry.url));
  const line = entry => UNBOUND_CONSOLE.test(entry.message ?? '') && urls.has(entry.location?.url);
  report.notConfigured = {
    count: named.length,
    answers: named.map(({entry, match}) => ({url: entry.url, status: entry.status, error: match.body.error})),
    consoleErrors: report.consoleErrors.filter(line),
  };
  const moved = new Set(named.map(x => x.entry));
  report.httpErrors = report.httpErrors.filter(entry => !moved.has(entry));
  report.consoleErrors = report.consoleErrors.filter(entry => !line(entry));
}

/**
 * Session AF Part 11 A3 (ADR-028 H5/H70): requests the verifier's own navigations abort (Next link prefetches and RSC
 * fetches cancelled when a stage navigates; a page's own fetch cut off by the next goto) are recorded as a count, not as
 * findings. A failed request is "aborted by a navigation" only when its error is net::ERR_ABORTED and it is a Next
 * prefetch or RSC fetch, or it failed within 2 s of a main-frame navigation, or it started before a main-frame navigation and
 * failed after that navigation began (Session AH, AF7); everything else still counts.
 * Each failedRequests entry carries `at` (ms), `startedAt` (ms, when the request was sent) and `rsc` (a prefetch or RSC
 * request); `navigations` is the list of
 * main-frame navigation times (ms).
 */
export const NAVIGATION_WINDOW_MS = 2000;
export function classifyFailedRequests(report, navigations) {
  const nearNavigation = at => typeof at === 'number' && navigations.some(t => Math.abs(at - t) <= NAVIGATION_WINDOW_MS);
  // Session AH Part 2 (AF7): a request that started before a main-frame navigation and failed after it began was cut
  // off by that navigation, however late the browser reports the failure (one /api/push failed 2.1 s after its goto).
  const spanned = entry => typeof entry.startedAt === 'number' && typeof entry.at === 'number' && navigations.some(t => entry.startedAt <= t && t <= entry.at);
  const aborted = entry => entry.failure?.errorText === 'net::ERR_ABORTED' && (entry.rsc === true || nearNavigation(entry.at) || spanned(entry));
  const set = report.failedRequests.filter(aborted);
  report.abortedByNavigation = {count: set.length, urls: set.map(entry => entry.url)};
  report.failedRequests = report.failedRequests.filter(entry => !aborted(entry));
}
/** A Next prefetch or RSC request: the `next-router-prefetch: 1` header, an `rsc: 1` header or an `_rsc` query parameter. */
export function isRscRequest(url, headers = {}) {
  if (headers['next-router-prefetch'] === '1' || headers.rsc === '1') return true;
  try { return new URL(url).searchParams.has('_rsc'); } catch { return false; }
}
