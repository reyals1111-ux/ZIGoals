import {expect, test, type Locator, type Page} from '@playwright/test';
import {GLOSSARY} from '../lib/ai/earn/glossary';
import {PLAIN_ASK, PLAIN_TERMS, type PlainTerm} from '../lib/earn/plain-words';
import {earnRoutes, seedShowcase} from './earn-fixtures';
import {governanceRelay, openGovernance} from './governance-chain';
import {SIGNER_CALLS, fakeChain, fakeKeplr, openStaking, relay} from './staking-chain';

/**
 * Session AF (L1c, non-negotiable N1; plan section 11.9, proof `earn-plain-words`): every word of the plan's plain-words
 * list has a "What's this?" tap where it first appears in each Earn section, in the Staking actions and review, and on
 * Governance — never twice in one section. A tap is a 44 px button with a 14 px or larger label and aria-expanded; its
 * answer opens inline in the Earn glossary's own words (loaded on the tap), by mouse or keyboard, and nothing moves, with
 * or without reduced motion and Motion Off. Every answer from the recorded fixtures; no wallet is asked to sign.
 */
const words = (term: PlainTerm) => GLOSSARY.find(t => t.id === term)!.text.en;
/** The taps each Earn section offers: the words of the plan's list where they first appear in that section. */
const EARN: Record<string, PlainTerm[]> = {
  'native-staking': ['validator', 'rewards', 'staking', 'custody', 'apr', 'commission', 'unbonding', 'gas', 'redelegate', 'slashing', 'jailed', 'voting-power'],
  valdora: ['liquid-staking', 'swap', 'custody', 'exchange-rate', 'apy', 'gas', 'unbonding', 'validator', 'slashing'],
  'valdora-vaults': ['custody', 'gas'],
  oroswap: ['swap', 'pool', 'impermanent-loss', 'custody', 'gas', 'pool-depth', 'slippage', 'decoy'],
  nawa: ['custody'],
  zignaly: ['copy-trading', 'custody'],
  governance: ['proposal', 'staking', 'gas', 'voting-power', 'quorum'],
  'goal-vaults': ['rewards', 'unbonding'],
  stablecoins: ['gas', 'bridge', 'custody', 'impermanent-loss', 'pool-depth'],
  validators: ['validator', 'voting-power', 'jailed', 'commission'],
  safety: ['verified-link', 'decoy', 'seed-phrase'],
};
const tapsIn = (scope: Locator) => scope.locator('button.whats-this').evaluateAll(els => els.map(e => e.getAttribute('data-whats-this')!));
const sorted = (list: readonly string[]) => [...list].sort();
/** A tap's own rules: a 44 × 44 px button with a label of 14 px or more, aria-expanded, controlling its own answer. */
async function checkTap(tap: Locator, term: PlainTerm) {
  await expect(tap).toHaveText(PLAIN_ASK[term]);
  await expect(tap).toHaveAttribute('type', 'button');
  await expect(tap).toHaveAttribute('aria-expanded', 'false');
  const box = (await tap.boundingBox())!;
  expect(box.height, term).toBeGreaterThanOrEqual(44);
  expect(box.width, term).toBeGreaterThanOrEqual(44);
  expect(await tap.evaluate(e => parseFloat(getComputedStyle(e).fontSize)), term).toBeGreaterThanOrEqual(14);
  const answer = tap.page().locator(`[id="${await tap.getAttribute('aria-controls')}"]`);
  await expect(answer).toBeHidden();
  return answer;
}
/** Opens a tap with a press, checks its answer is the glossary's words inline, and closes it again. */
async function openAndClose(page: Page, tap: Locator, term: PlainTerm) {
  const answer = await checkTap(tap, term);
  await tap.click();
  await expect(tap).toHaveAttribute('aria-expanded', 'true');
  await expect(answer).toBeVisible();
  await expect(answer).toHaveText(words(term));
  expect(await answer.evaluate(e => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(14);
  await tap.click();
  await expect(tap).toHaveAttribute('aria-expanded', 'false');
  await expect(answer).toBeHidden();
}

test('Earn: each section offers its taps once, where the word first appears; every tap opens the glossary’s words inline', async ({page}) => {
  test.setTimeout(120_000);
  await seedShowcase(page);
  await earnRoutes(page);
  await page.goto('/app/earn');
  await expect(page.locator('[data-live-figure="native-apr"]')).toHaveAttribute('data-state', 'ok');
  const seen = new Set<string>();
  for (const [id, expected] of Object.entries(EARN)) {
    const section = page.locator(`#${id}`);
    const taps = await tapsIn(section);
    expect(sorted(taps), id).toEqual(sorted(expected));
    expect(new Set(taps).size, `${id}: never twice in one section`).toBe(taps.length);
    for (const t of taps) seen.add(t);
  }
  // DeFa and Permapod use none of the list's words; the rest of the page adds none of its own.
  for (const id of ['defa', 'permapod', 'summary', 'calculator']) expect(await page.locator(`#${id} button.whats-this`).count(), id).toBe(0);
  // Start here: the guides under its dots (one open at a time) carry their own.
  const start = page.locator('#start-here');
  const dot = (name: string) => start.locator(`.path-dot[aria-label^="${name}:"]`);
  for (const [step, terms] of [['Get a wallet', ['seed-phrase']], ['Practice first', ['practice-network']], ['Get ZIG', ['bridge', 'gas']], ['Your first real stake', ['unbonding']], ['Explore more', ['liquid-staking', 'pool', 'proposal']]] as const) {
    await dot(step).click();
    const panel = start.locator('.earn-start-panel');
    await expect(panel).toHaveCount(1);
    expect(sorted(await tapsIn(panel)), step).toEqual(sorted(terms));
    expect(sorted(await tapsIn(start)), `${step}: only the open guide's`).toEqual(sorted(terms));
    for (const t of terms) seen.add(t);
  }
  // Every word of the plan's list is one tap away on Earn.
  expect(sorted([...seen])).toEqual(sorted(PLAIN_TERMS));
  // Each tap: its rules, then its answer opens inline in the glossary's own words and closes again.
  for (const [id, expected] of Object.entries(EARN)) for (const term of expected) await openAndClose(page, page.locator(`#${id} button.whats-this[data-whats-this="${term}"]`), term);
  // By keyboard: Enter opens, Space closes; focus stays on the tap.
  const tap = page.locator('#native-staking button.whats-this[data-whats-this="validator"]');
  await tap.focus();
  await page.keyboard.press('Enter');
  await expect(tap).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator(`[id="${await tap.getAttribute('aria-controls')}"]`)).toHaveText(words('validator'));
  await page.keyboard.press('Space');
  await expect(tap).toHaveAttribute('aria-expanded', 'false');
  await expect(tap).toBeFocused();
});

test('still in every motion setting: no transition and no animation on a tap or its answer, by default, reduced and Motion Off', async ({page}) => {
  await seedShowcase(page);
  await earnRoutes(page);
  const still = async () => {
    const tap = page.locator('#safety button.whats-this[data-whats-this="seed-phrase"]');
    await tap.scrollIntoViewIfNeeded();
    await tap.click();
    const answer = page.locator(`[id="${await tap.getAttribute('aria-controls')}"]`);
    await expect(answer).toHaveText(words('seed-phrase'));
    for (const el of [tap, answer]) expect(await el.evaluate(e => getComputedStyle(e).transitionDuration.split(',').every(d => parseFloat(d) === 0))).toBe(true);
    expect(await page.evaluate(() => document.getAnimations().filter(a => ((a.effect as KeyframeEffect | null)?.target as Element | null)?.closest?.('.whats-this, .whats-this-def')).length)).toBe(0);
  };
  await page.goto('/app/earn#safety');
  await still();
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.reload();
  await still();
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await page.evaluate(() => localStorage.setItem('zigoals:motion:v1', 'off'));
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-app-motion', 'off');
  await still();
});

test('Staking: the actions and the review screen explain their words, one tap each; the wallet is never asked to sign', async ({page}) => {
  const calls = await fakeKeplr(page);
  await fakeChain(page, 'practice');
  await relay(page, 'practice');
  const panel = await openStaking(page);
  expect(sorted(await tapsIn(panel))).toEqual(sorted(['practice-network', 'staking']));
  await openAndClose(page, panel.locator('button.whats-this[data-whats-this="practice-network"]'), 'practice-network');
  await panel.getByRole('button', {name: 'Connect Keplr for PRACTICE', exact: true}).click();
  await expect(panel.getByRole('radio', {name: /Fictional Alpha/})).toBeVisible();
  // Stake: the validator choice (what a validator is, its commission, its share of the stake) and the fee.
  expect(sorted(await tapsIn(panel))).toEqual(sorted(['practice-network', 'staking', 'validator', 'commission', 'voting-power', 'gas']));
  await openAndClose(page, panel.locator('button.whats-this[data-whats-this="commission"]'), 'commission');
  // Each other action names its own word.
  for (const [tab, term] of [['Unstake', 'unbonding'], ['Move stake', 'redelegate'], ['Claim rewards', 'rewards']] as const) {
    await panel.getByRole('tab', {name: tab, exact: true}).click();
    const tap = panel.locator(`button.whats-this[data-whats-this="${term}"]`);
    await expect(tap, tab).toHaveCount(1);
    await openAndClose(page, tap, term);
  }
  // The review screen: the action, the validator and the fee, each one tap away; only a tap, nothing else happens.
  await panel.getByRole('tab', {name: 'Stake', exact: true}).click();
  await panel.getByRole('radio', {name: /Fictional Alpha/}).check();
  await panel.getByLabel('Amount of ZIG').fill('25');
  await panel.getByRole('button', {name: 'Review', exact: true}).click();
  const sheet = page.getByRole('dialog', {name: 'Review before you sign'});
  await expect(sheet).toContainText('Stake (delegate)');
  expect(sorted(await tapsIn(sheet))).toEqual(sorted(['staking', 'validator', 'gas']));
  for (const term of ['staking', 'validator', 'gas'] as const) await openAndClose(page, sheet.locator(`button.whats-this[data-whats-this="${term}"]`), term);
  await expect(sheet).toBeVisible();
  expect(calls.filter(c => SIGNER_CALLS.test(c)), 'no signer was asked for').toEqual([]);
  await sheet.getByRole('button', {name: 'Back', exact: true}).click();
  await expect(sheet).toHaveCount(0);
});

test('Governance: the why, the network and the quorum explained once each on the page', async ({page}) => {
  await governanceRelay(page, 'practice');
  const view = await openGovernance(page);
  await expect(view.locator('article.governance-proposal').first()).toBeVisible();
  const why = view.locator('.governance-why');
  expect(sorted(await tapsIn(why))).toEqual(sorted(['proposal', 'validator', 'voting-power', 'practice-network']));
  // The quorum: once, in the first proposal whose tally shows it.
  const quorum = view.locator('button.whats-this[data-whats-this="quorum"]');
  await expect(quorum).toHaveCount(1);
  await expect(view.locator('article.governance-proposal').first().locator('button.whats-this[data-whats-this="quorum"]')).toHaveCount(1);
  const all = await tapsIn(view);
  expect(new Set(all).size, 'never twice on the page').toBe(all.length);
  for (const term of ['proposal', 'quorum'] as const) await openAndClose(page, view.locator(`button.whats-this[data-whats-this="${term}"]`), term);
});
