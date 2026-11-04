// Session AL (TIER 3 (verifier)): the hosted verifier's AL stage, number 12, appended after every existing stage (no stage
// is renumbered). Read-only and browser-local: nothing is typed or stored, no wallet.
//
// It checks what AL ships, and each part is recorded under report.al.absent (never a failure) when the build does not
// have it yet or has it switched off: /app/plans answers 200 with its two honesty lines; /app/tasks answers 200; on a
// computer (1280 px) the sidebar carries the Apps group; below 901 px the "Apps & extras" button opens its dialog,
// which Escape closes. A part that is there but wrong is a problem and fails the stage. `expect` is Playwright's, passed
// in by the caller. No import.meta and no top-level await (the browser spec loads this file too).
import assert from 'node:assert/strict';

export const AL_PATHS = Object.freeze({plans: '/app/plans', tasks: '/app/tasks'});
/** The two lines /app/plans must carry (case and spacing aside). */
export const PLANS_LINES = Object.freeze(['Placeholder prices', 'nothing is charged during the Alpha']);
export const SIDEBAR_GROUP = '[data-testid="sidebar-apps-group"]';
export const EXTRAS_BUTTON = '[data-testid="apps-extras-button"]';
export const EXTRAS_DIALOG = '[role="dialog"][aria-label="Apps & extras"]';
/** The widths: the sidebar from 901 px up (1280, the verifier's desktop), the button below it (900). */
export const AL_WIDTHS = Object.freeze({desktop: 1280, narrow: 900});
/** How long a part may take to appear after a load or a resize before it counts as absent. */
const APPEAR_MS = 5000;

/** An HTML answer as plain text: tags out, the few entities React writes decoded, spaces collapsed. */
export function htmlText(html) {
  return String(html ?? '').replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();
}
/** A page's answer (fetched with redirect: 'manual'): 'present' (200), 'absent' (404, or a redirect: not built or switched off), or a problem sentence. */
export function pageState(path, status) {
  if (status === 200) return 'present';
  if (status === 404 || (status >= 300 && status < 400)) return 'absent';
  return `${path}: unexpected answer ${status}`;
}
/** The plans lines missing from a text ([] when both are there). */
export function plansMissing(text) {
  const plain = String(text ?? '').replace(/\s+/g, ' ').toLowerCase();
  return PLANS_LINES.filter(line => !plain.includes(line.toLowerCase()));
}

/**
 * The HTTP part (Node's fetch, outside the page): each new page's answer, and the plans lines in the server's HTML.
 * Returns {absent, problems, plansNeedPage}: plansNeedPage lists the lines the HTML lacked, to be read from the rendered page.
 */
export async function readAlPages({base, fetcher = fetch}) {
  const absent = [], problems = []; let plansNeedPage = [];
  for (const [name, path] of Object.entries(AL_PATHS)) {
    const response = await fetcher(base + path, {redirect: 'manual', cache: 'no-store'});
    const html = await response.text().catch(() => '');
    const state = pageState(path, response.status);
    if (state === 'absent') { absent.push(`${path}: not in this build or switched off (${response.status})`); continue; }
    if (state !== 'present') { problems.push(state); continue; }
    if (name === 'plans') plansNeedPage = plansMissing(htmlText(html));
  }
  return {absent, problems, plansNeedPage};
}

const appears = (locator, ms = APPEAR_MS) => locator.first().waitFor({state: 'attached', timeout: ms}).then(() => true, () => false);

async function al(page, {base, expect, report}) {
  report.al = {absent: [], problems: []};
  // 1. Today on a computer (every browser stage opens its own page first): the sidebar's Apps group.
  await page.goto(base + '/app');
  await page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 20_000});
  await page.setViewportSize({width: AL_WIDTHS.desktop, height: 900});
  const group = page.locator(SIDEBAR_GROUP);
  if (await appears(group)) await expect(group.first()).toBeVisible();
  else report.al.absent.push(`sidebar Apps group (${SIDEBAR_GROUP}) at ${AL_WIDTHS.desktop} px: not in this build`);
  // 2. Below 901 px: the "Apps & extras" button opens its dialog, and Escape closes it.
  await page.setViewportSize({width: AL_WIDTHS.narrow, height: 900});
  const button = page.locator(EXTRAS_BUTTON);
  if (await appears(button)) {
    await expect(button.first()).toBeVisible();
    await button.first().click();
    const dialog = page.locator(EXTRAS_DIALOG);
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  } else report.al.absent.push(`"Apps & extras" button (${EXTRAS_BUTTON}) at ${AL_WIDTHS.narrow} px: not in this build`);
  await page.setViewportSize({width: AL_WIDTHS.desktop, height: 900});
  // 3. The new pages over HTTP; a plans line the server's HTML lacks is read from the rendered page before it counts.
  const pages = await readAlPages({base});
  report.al.absent.push(...pages.absent); report.al.problems.push(...pages.problems);
  if (pages.plansNeedPage.length) {
    await page.goto(base + AL_PATHS.plans);
    await page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 20_000});
    const text = await page.locator('main').innerText().catch(() => '');
    for (const line of plansMissing(text)) report.al.problems.push(`${AL_PATHS.plans}: "${line}" missing`);
  }
  assert.deepEqual(report.al.problems, [], 'AL stage');
}

export const AL_STAGE = {number: 12, key: 'al', name: 'AL: plans and tasks pages, the sidebar Apps group and the Apps & extras dialog', browser: true, liveOnly: false, reportsItself: false, run: al};
