import {expect, test} from '@playwright/test';
import {VERIFIED_URLS, verifiedLink} from '../../../packages/ecosystem-registry/src/verified-links';
import {earnRoutes, live, outgoing, seedShowcase} from './earn-fixtures';

/**
 * Session AF chunk 2 (amendment 3, H84, H88, H97, P1.12–P1.23): every way to earn, each its own section with the same
 * anatomy (sentence, best for, who runs it, status, custody, live numbers with source and "as of", fees, lockups,
 * minimums, risks, numbered steps with how long), the facts that matter first (USDC on Noble, Zignaly's closure, Permapod's
 * incident) said neutrally with source and date, the measured staking figure beside the issuance figure, and the
 * redrawn "what you'll see" pictures, loaded only when opened. Every answer from the recorded fixtures.
 */
const SECTIONS = ['native-staking', 'valdora', 'valdora-vaults', 'oroswap', 'nawa', 'defa', 'permapod', 'zignaly', 'governance', 'goal-vaults', 'stablecoins'];
test.beforeEach(async ({page}) => { await seedShowcase(page); });

test('every way to earn has the full anatomy; vault, pool and app figures are live with source and as-of', async ({page}) => {
  await earnRoutes(page);
  await page.goto('/app/earn');
  for (const id of SECTIONS) {
    const s = page.locator(`#${id}`);
    await expect(s, id).toHaveAttribute('data-option', id);
    await expect(s.locator('.earn-facts > div'), id).toHaveCount(4);
    await expect(s.locator('.earn-columns .earn-subhead'), id).toHaveText(['Fees', 'Lockups', 'Minimums', 'Risks']);
    // Session AF (L1c, N5; moved at greater strength, was "at least 2"): at least five risks in plain words, each with
    // its source — a verified link the notes record as checked, or the on-chain read named in words.
    const risks = s.locator('.earn-risks li');
    expect(await risks.count(), id).toBeGreaterThanOrEqual(5);
    for (const risk of await risks.all()) {
      const kinds = (await risk.getAttribute('data-risk-source') ?? '').split(' ').filter(Boolean);
      expect(kinds.length, `${id}: a risk without its source`).toBeGreaterThan(0);
      const source = risk.locator('.earn-risk-source');
      await expect(source, id).toHaveText(/^Source: \S.*\.$/);
      const hrefs = await source.locator('a[href]').evaluateAll(els => els.map(a => a.getAttribute('href')!));
      if (kinds.includes('link')) expect(hrefs.length, id).toBeGreaterThan(0);
      for (const href of hrefs) expect(VERIFIED_URLS.has(href), `${id}: ${href}`).toBe(true);
      if (kinds.includes('chain')) await expect(source, id).toContainText(/ZIGChain|the chain/);
    }
    expect(await s.locator('.earn-steps li').count(), id).toBeGreaterThanOrEqual(2);
    await expect(s.locator('.earn-steps-time'), id).toContainText('How long:');
  }
  // The order is the network's, never by rate.
  expect(await page.locator('[data-option]').evaluateAll(els => els.map(e => e.getAttribute('data-option')))).toEqual(SECTIONS);
  for (const id of ['vault-stablecoin-yield', 'vault-private-credit', 'vault-core-income', 'nawa-usdc', 'nawa-zig', 'defa-counter', 'oroswap-zig-usdc-inj', 'stable-usdc-inj', 'permapod-incident', 'native-apr-measured']) {
    const f = page.locator(`[data-live-figure="${id}"]`);
    await expect(f, id).toHaveAttribute('data-state', 'ok');
    await expect(f.locator('.earn-source'), id).toContainText(/as of /);
  }
  await expect(page.locator('[data-live-figure="vault-stablecoin-yield"] .earn-value')).toHaveText(/million\sUSDC\.n$/);
  await expect(page.locator('[data-live-figure="vault-stablecoin-yield"]')).toContainText('it holds USDC on Noble (USDC.n)');
  // A yield no checked source publishes is "unavailable" with its reason, never copied from a page.
  await expect(page.locator('[data-live-figure="vaults-yield"]')).toHaveAttribute('data-reason', 'NOT_PUBLISHED');
  await expect(page.locator('[data-live-figure="zignaly-figures"]')).toHaveAttribute('data-reason', 'NOT_PUBLISHED');
  // Every outgoing link, the new ones included, is a verified one in a new tab.
  const links = await outgoing(page);
  for (const l of links) { expect(VERIFIED_URLS.has(l.href), l.href).toBe(true); expect(l.rel, l.href).toBe('noopener noreferrer'); }
  for (const url of [verifiedLink('valdora', 'vault-private-credit').url, verifiedLink('zig-finance', 'circle-noble').url, verifiedLink('zignaly', 'closure-notice').url, verifiedLink('permapod', 'defillama').url]) expect(links.map(l => l.href), url).toContain(url);
  await expect(page.locator('body')).not.toContainText(/partners?\b|guaranteed return|we recommend|you should/i);
});

test('the facts first, neutrally, with source and date: USDC on Noble, Nawa’s dependence on Zignaly, Permapod’s incident, Zignaly’s dates', async ({page}) => {
  await earnRoutes(page);
  await page.goto('/app/earn');
  const vaults = page.locator('[data-notice="valdora-vaults"]');
  await expect(vaults).toContainText('Every USDC vault on ZIGChain holds USDC on Noble (USDC.n).');
  await expect(vaults).toContainText('13 October 2026');
  await expect(vaults).toContainText('12 January 2027');
  await expect(vaults).toContainText('(Circle, read Oct 18, 2026)');
  await expect(page.locator('[data-notice="nawa"]')).toContainText('Its USDC vault depends on Zignaly, which is closing.');
  await expect(page.locator('[data-notice="permapod"]')).toContainText('DefiLlama lists an incident for Permapod on Aug 29, 2026, classified “Protocol Logic”');
  await expect(page.locator('#permapod .earn-tag').first()).toHaveText('Paused after an exploit');
  await expect(page.locator('[data-notice="zignaly"] [data-date]')).toHaveCount(4);
  await expect(page.locator('[data-notice="zignaly"] [data-date="2026-12-01"]')).toContainText('The last day to withdraw, until 23:59 UTC.');
  await expect(page.locator('#zignaly')).toContainText('USDT on BNB Smart Chain (BEP20) only');
  // Governance and Goal Vaults open the pages that do the work (lanes L2a and L2b build them): only the hrefs are asserted.
  await expect(page.locator('#governance').getByRole('link', {name: 'Open Governance'})).toHaveAttribute('href', '/app/governance');
  await expect(page.locator('#goal-vaults').getByRole('link', {name: 'Open Goals'})).toHaveAttribute('href', '/app/goals');
  // OroSwap: the USDC.inj pool joins; farms only while active_pools lists one.
  await expect(page.locator('[data-live-figure="oroswap-zig-usdc-inj"] dt')).toHaveText('ZIG / USDC.inj (Injective) pool');
  await expect(page.locator('[data-live-figure="oroswap-farms"] .earn-value')).toHaveText('None running now');
});

test('the measured figure stands beside the issuance figure; past 10 % apart both stay, saying they disagree; a host without history is said plainly', async ({page}) => {
  const measured = (live.answers as unknown as Record<string, {data: {measured: {rate: string}; validator: {moniker: string}}}>).measured!;
  await earnRoutes(page);
  await page.goto('/app/earn#native-staking');
  await expect(page.locator('[data-live-figure="native-apr-measured"] dt')).toContainText(`Measured: what ${measured.data.validator.moniker}’s own stake earned, at its 5 % commission`);
  await expect(page.locator('[data-live-figure="native-apr-measured"] .earn-value')).toHaveText(/^5\.\d\d\s%$/);
  await expect(page.locator('[data-apr-agreement]')).toHaveAttribute('data-apr-agreement', 'agree');
  // The same read with the measured accrual halved: the two figures disagree, and both stay.
  await page.route(url => url.pathname === '/api/earn/measured', route => route.fulfill({json: {...live.answers.measured, fetchedAt: new Date().toISOString(), stale: false, data: {...measured.data, measured: {...measured.data.measured, rate: String(Number(measured.data.measured.rate) / 2)}}}}));
  await page.reload();
  await expect(page.locator('[data-apr-agreement]')).toHaveAttribute('data-apr-agreement', 'disagree');
  await expect(page.locator('[data-apr-agreement]')).toContainText('The two figures disagree');
  await expect(page.locator('[data-live-figure="native-apr"]')).toHaveAttribute('data-state', 'ok');
  await expect(page.locator('[data-live-figure="native-apr-measured"]')).toHaveAttribute('data-state', 'ok');
  await page.route(url => url.pathname === '/api/earn/measured', route => route.fulfill({json: {version: 1, status: 'unavailable', reason: 'HISTORY_NOT_KEPT', source: live.answers.measured!.source, fetchedAt: new Date().toISOString(), stale: false, data: null}}));
  await page.reload();
  await expect(page.locator('[data-live-figure="native-apr-measured"]')).toHaveAttribute('data-reason', 'HISTORY_NOT_KEPT');
  await expect(page.locator('[data-live-figure="native-apr-measured"]')).toContainText('no source answering now keeps the older block');
  await expect(page.locator('[data-apr-agreement]')).toHaveCount(0);
});

test('the pictures of the apps’ own pages load only when opened: numbered, labelled, still', async ({page}) => {
  const requests = await earnRoutes(page);
  await page.goto('/app/earn#valdora');
  const slot = page.locator('[data-illustration-slot="valdora-stake"]');
  await expect(slot.locator('svg')).toHaveCount(0);
  const before = requests.length;
  await slot.locator('summary').click();
  const screens = slot.locator('.earn-illustration-screens > li');
  await expect(screens).toHaveCount(4);
  await expect(slot.getByRole('img', {name: 'Valdora, step 1: the Stake page with Connect Wallet'})).toBeVisible();
  await expect(screens.first()).toContainText('press Connect Wallet');
  await expect(slot).toContainText('Redrawn by ZIGoals from Valdora’s own page');
  expect(requests.length).toBeGreaterThan(before); // its own chunk
  for (const set of ['oroswap-swap', 'oroswap-pools', 'keplr-staking', 'valdora-vault', 'nawa-vaults', 'skip-go']) {
    const s = page.locator(`[data-illustration-slot="${set}"]`);
    await s.locator('summary').click();
    await expect(s.locator('svg').first(), set).toBeVisible();
    // One screen stays small (the inline-SVG budget of 6 KB a screen).
    for (const size of await s.locator('svg').evaluateAll(els => els.map(e => e.outerHTML.length))) expect(size, set).toBeLessThan(6144);
  }
});
