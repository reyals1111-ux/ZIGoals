import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import type {Page} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';

/**
 * Session AF (L1): the Earn page's browser fixtures. Every /api/earn/* answer comes from lib/earn/fixtures/live-2026-10-19.json
 * (one real read of each upstream) and /api/chain/validators from validators-2026-10-19.json (lane L2a's wire shape), with
 * `fetchedAt` set to now so the page says "updated just now"; any other /api request answers 503. No test reaches a real
 * source. `unavailable` turns a family into the route's honest `unavailable` answer with that reason.
 */
const FIXTURES = join(__dirname, '..', 'lib', 'earn', 'fixtures');
export const live = JSON.parse(readFileSync(join(FIXTURES, 'live-2026-10-19.json'), 'utf8')) as {answers: Record<string, {source: unknown; data: unknown}>};
export const validatorsFixture = JSON.parse(readFileSync(join(FIXTURES, 'validators-2026-10-19.json'), 'utf8')) as {answer: {validators: {operator: string; moniker: string; status: string; jailed: boolean; votingPowerShare: string; commission: {rate: string}; website: string | null}[]}};
export type Family = 'chain' | 'valdora' | 'oroswap' | 'defillama' | 'validators' | 'vaults' | 'measured';
export const DAY = '2026-10-19';
export async function seedShowcase(page: Page) {
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); },
    {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), 'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true})});
  // Session AE's WebKit lesson: the seed's own page settles before the test's next navigation.
  await page.waitForLoadState('networkidle', {timeout: 10_000}).catch(() => undefined);
}
export async function earnRoutes(page: Page, {unavailable = {}, missingValidators = false}: {unavailable?: Partial<Record<Family, string>>; missingValidators?: boolean} = {}) {
  const seen: string[] = [];
  page.on('request', r => seen.push(r.url()));
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  const answer = (family: Exclude<Family, 'validators'>, key: string) => {
    const a = live.answers[key]!;
    return unavailable[family] ? {version: 1, status: 'unavailable', reason: unavailable[family], source: a.source, fetchedAt: new Date().toISOString(), stale: false, data: null} : {...a, fetchedAt: new Date().toISOString(), stale: false};
  };
  await page.route(url => url.pathname === '/api/earn/chain', route => route.fulfill({json: answer('chain', new URL(route.request().url()).searchParams.get('network') === 'testnet' ? 'chainTestnet' : 'chainMainnet')}));
  await page.route(url => url.pathname === '/api/earn/valdora', route => route.fulfill({json: answer('valdora', 'valdora')}));
  await page.route(url => url.pathname === '/api/earn/oroswap', route => route.fulfill({json: answer('oroswap', 'oroswap')}));
  await page.route(url => url.pathname === '/api/earn/defillama', route => route.fulfill({json: answer('defillama', 'defillama')}));
  // Session AF chunk 2: the vault products and the measured staking figure (the same recorded read).
  await page.route(url => url.pathname === '/api/earn/vaults', route => route.fulfill({json: answer('vaults', 'vaults')}));
  await page.route(url => url.pathname === '/api/earn/measured', route => route.fulfill({json: answer('measured', 'measured')}));
  await page.route(url => url.pathname === '/api/chain/validators', route => missingValidators ? route.fulfill({status: 404, body: 'Not found'})
    : unavailable.validators ? route.fulfill({json: {version: 1, status: 'unavailable', reason: unavailable.validators, network: 'mainnet', source: {name: 'ZIGChain mainnet LCD (official)'}, validators: []}})
    : route.fulfill({json: validatorsFixture.answer}));
  return seen;
}
/** Every outgoing link of the Earn page (its sections and the guide panel; the app's shell and footer are not Earn's): href, target and rel. */
export const outgoing = (page: Page) => page.locator('.earn-page a[href^="http"], .earn-guide-panel a[href^="http"]').evaluateAll(els => els.map(a => ({href: (a as HTMLAnchorElement).getAttribute('href')!, target: a.getAttribute('target'), rel: a.getAttribute('rel')})));
