// Session AF chunk 2 (L1; ADR-028 H24, H57, H58): the hosted verifier's Earn stage, number 9, appended after every existing
// stage (no stage is renumbered). The lead appends EARN_STAGE to VERIFIER_STAGES (it has no sentinel: it types nothing).
//
// Read-only: it opens /app/earn first, checks the page draws, waits for every live figure to settle, then checks that each
// one either shows a value with its source and "as of", or says "unavailable" with a reason (never a bare number, never a
// zero for unknown); that every outgoing link of the Earn page is, character for character, one of the verified link
// registry's, opening in a new tab with noopener noreferrer; that nothing on the page offers to sign; and that every request
// the page made during the stage was a GET to the base. No wallet, no typing, nothing stored. `expect` is Playwright's, passed
// in by the caller. No import.meta and no top-level await: the browser spec loads this file too.
import assert from 'node:assert/strict';
import {VERIFIED_URLS} from '../../packages/ecosystem-registry/src/verified-links.ts';

export const EARN_PATH = '/app/earn';
export const EARN_TITLE = 'Make your money work';
/** Every live figure of the Earn page carries this attribute and `data-state` (components/earn/live-figure.tsx). */
export const FIGURE = '[data-live-figure]';
/** The Earn page's own outgoing links (its sections and the guide panel; the app's shell is not Earn's). */
export const OUTGOING = '.earn-page a[href^="http"], .earn-guide-panel a[href^="http"]';
/** A figure's words when it is unavailable, and when it is shown (components/earn/live-figure.tsx). */
export const UNAVAILABLE_WORD = /unavailable/;
export const AS_OF = /· as of /;

/** Each live figure as the page draws it: its id, state, reason and whether its source line says "as of". */
export async function readFigures(page) {
  return page.locator(FIGURE).evaluateAll(els => els.map(el => ({
    id: el.getAttribute('data-live-figure'), state: el.getAttribute('data-state'), reason: el.getAttribute('data-reason'),
    text: (el.textContent || '').replace(/\s+/g, ' ').trim(), source: (el.querySelector('.earn-source')?.textContent || '').replace(/\s+/g, ' ').trim(),
  })));
}
/** Checks one figure; returns a plain sentence for each problem ([] when it is honest). */
export function figureProblems(f) {
  const out = [];
  if (f.state === 'ok') {
    if (!f.source) out.push(`${f.id}: a value without its source`);
    else if (!AS_OF.test(f.source)) out.push(`${f.id}: a value without "as of"`);
  } else if (f.state === 'unavailable') {
    if (!f.reason) out.push(`${f.id}: unavailable without a reason`);
    if (!UNAVAILABLE_WORD.test(f.text)) out.push(`${f.id}: unavailable but does not say so`);
  } else out.push(`${f.id}: state ${f.state ?? 'missing'}`);
  return out;
}
/** Each outgoing link that is not a verified one opening in a new tab with noopener noreferrer. */
export function linkProblems(links) {
  return links.flatMap(l => [...(VERIFIED_URLS.has(l.href) ? [] : [`not a verified link: ${l.href}`]), ...(l.target === '_blank' ? [] : [`not a new tab: ${l.href}`]), ...(l.rel === 'noopener noreferrer' ? [] : [`rel is not noopener noreferrer: ${l.href}`])]);
}

/** Stage 9: the Earn page is honest about every figure and every link, signs nothing and asks only its own base. Ends on /app/earn. */
export async function earnStage(page, {base, expect, report}) {
  const requests = [], onRequest = r => requests.push({url: r.url(), method: r.method()});
  page.on('request', onRequest);
  try {
    await page.goto(base + EARN_PATH);
    await expect(page.getByRole('heading', {level: 1, name: EARN_TITLE})).toBeVisible();
    await expect(page.locator('#start-here')).toBeVisible();
    // Every figure settles: shown or unavailable, never left "reading".
    await expect.poll(async () => page.locator(`${FIGURE}[data-state="loading"]`).count(), {timeout: 60_000}).toBe(0);
    const figures = await readFigures(page);
    assert(figures.length >= 20, `the Earn page shows its live figures (${figures.length})`);
    const problems = figures.flatMap(figureProblems);
    assert.deepEqual(problems, [], 'every live figure says its source and as-of, or "unavailable" with a reason');
    const links = await page.locator(OUTGOING).evaluateAll(els => els.map(a => ({href: a.getAttribute('href'), target: a.getAttribute('target'), rel: a.getAttribute('rel')})));
    assert(links.length >= 20, `the Earn page links out (${links.length})`);
    assert.deepEqual(linkProblems(links), [], 'every outgoing link is a verified one, in a new tab, noopener noreferrer');
    await expect(page.locator('iframe, frame, embed, object')).toHaveCount(0);
    await expect(page.getByRole('button', {name: /\bsign\b/i})).toHaveCount(0);
    await page.waitForLoadState('networkidle').catch(() => undefined);
    const origin = new URL(base).origin;
    const foreign = requests.filter(r => !/^(data|blob):/.test(r.url) && new URL(r.url).origin !== origin).map(r => r.url);
    const notGet = requests.filter(r => r.method !== 'GET').map(r => `${r.method} ${r.url}`);
    assert.deepEqual(foreign, [], 'every request stays on the base');
    assert.deepEqual(notGet, [], 'every request is a GET');
    if (report) report.earn = {figures: figures.length, shown: figures.filter(f => f.state === 'ok').length, unavailable: figures.filter(f => f.state === 'unavailable').map(f => `${f.id}:${f.reason}`), links: links.length, requests: requests.length};
  } finally {
    page.off('request', onRequest);
  }
}
export const EARN_STAGE = Object.freeze({number: 9, key: 'earn', name: 'Earn: every live figure says its source and as-of or why it is unavailable; every outgoing link is a verified one; nothing signs; GET on the base only', browser: true, liveOnly: false, reportsItself: false, run: earnStage});
