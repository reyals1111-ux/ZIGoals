import {expect, test, type Page} from '@playwright/test';
import {hydrated} from './ah-helpers';

/**
 * Session AS (ADR-042 Part 2): one test per visual family of the answer widgets. Each asks NOVA the way a person would
 * (or, for a family no answer makes, pins its kind on the stage), on the Showcase of 17 November 2026 with NOVA's Health,
 * Journal and Notes switches and ZIGi's Health sharing opened, and demands: the answer's own widget is made; it carries
 * its figure and the facts the Showcase holds; its source and as-of; a table for assistive technology; and no text runs
 * out of its panel or is cut. The two families behind the owner's questions are tests/nova-answers-as.spec.ts. Fictional
 * data only.
 */
test.skip(({isMobile}) => isMobile, 'computer layout: runs in the desktop project (the phone keeps the same bodies; their fit is measured by hand, ADR-042 D18)');
test.use({timezoneId: 'UTC', viewport: {width: 1440, height: 900}});
const DAY = new Date('2026-11-17T19:00:00.000Z');
const AI = {version: 1, enabled: false, mode: null, provider: null, model: null, localServer: null, baseUrl: null, subscriptionApp: null, rememberKey: false, pageShare: {today: true, goals: true, habits: true, health: true, wealth: true, help: true}, includeHealth: true, customInstructions: '', contextBudgetTokens: 10000, maxOutputTokens: 2048, launcherHidden: false, voice: {transcription: 'off', transcriptionModel: null, language: null, readAloud: false}};
const frame = (page: Page) => page.locator('.nova-frame'), field = (page: Page) => page.locator('.nova-command input');
const widget = (page: Page, id: string) => page.locator(`.nova-stage-area .nova-widget[data-widget="${id}"]`);

/** The Showcase with the switches open; `pinned` puts those kinds on the stage as if an answer had made them. */
async function showcaseNova(page: Page, pinned: string[] = []) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.clock.install({time: DAY});
  await page.goto('/app/settings');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto('/app/settings'); await hydrated(page);
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await page.evaluate(([ai, pinned]) => {
    const some = Object.keys(sessionStorage).find(k => /^zigoals:showcase:v1:[^:]+:/.test(k))!, prefix = some.match(/^zigoals:showcase:v1:[^:]+:/)![0];
    localStorage.setItem('zigoals:ai:v1', ai as string); sessionStorage.setItem(prefix + 'zigoals:ai:v1', ai as string);
    sessionStorage.setItem(prefix + 'zigoals:nova-setup:v1', JSON.stringify({version: 1, scopes: {health: true, journal: true, notes: true}}));
    sessionStorage.setItem(prefix + 'zigoals:nova:v1', JSON.stringify({version: 1, openingSeen: true, layout: 'orbit', widgets: []}));
    const at = '2026-11-17T18:59:00.000Z';
    sessionStorage.setItem(prefix + 'zigoals:nova-stage:v1', JSON.stringify({version: 1, made: (pinned as string[]).map(id => ({id, at})), hidden: []}));
  }, [JSON.stringify(AI), pinned] as const);
  await page.goto('/app/nova'); await hydrated(page);
  await expect(frame(page)).toHaveAttribute('data-opening', 'done', {timeout: 15_000});
  await expect(field(page)).toBeVisible();
}
async function ask(page: Page, words: string) { await field(page).fill(words); await field(page).press('Enter'); }
/** The widget is a live answer body with its facts, its foot and its table, and nothing in it is cut or out of its panel. */
async function shows(page: Page, id: string, facts: readonly string[]) {
  const el = widget(page, id);
  await expect(el, id).toBeVisible({timeout: 15_000});
  await el.scrollIntoViewIfNeeded();
  const body = el.locator('.ax-body');
  await expect(body.locator('.ax-head-num').first(), id).not.toBeEmpty();
  for (const fact of facts) await expect(el, `${id} shows ${fact}`).toContainText(fact);
  await expect(body.locator('.nc-foot'), id).toContainText(/Your /);
  await expect(body.locator('table.sr-only caption'), id).not.toBeEmpty();
  const cut = await el.evaluate(w => {
    const panel = (w.querySelector('.nova-widget-body') ?? w).getBoundingClientRect(), bad: string[] = [];
    for (const t of w.querySelectorAll('.ax-body :is(p, span, b, li, small, strong)')) {
      if (t.closest('.sr-only, [aria-hidden=true] svg')) continue;
      if (![...t.childNodes].some(n => n.nodeType === 3 && n.textContent!.trim())) continue;
      const r = t.getBoundingClientRect(), cs = getComputedStyle(t);
      if (!r.width || !r.height || cs.visibility === 'hidden') continue;
      if (r.bottom > panel.bottom + 1 || r.right > panel.right + 1 || r.left < panel.left - 1) bad.push(`out: ${t.textContent!.trim().slice(0, 30)}`);
      if (cs.textOverflow === 'ellipsis' && t.scrollWidth > t.clientWidth + 1) bad.push(`cut: ${t.textContent!.trim().slice(0, 30)}`);
    }
    return bad;
  });
  expect(cut, `${id}: nothing out of its panel or cut`).toEqual([]);
}

const ASKED: {family: string; ask: string; kinds: Record<string, readonly string[]>; never?: RegExp; table?: Record<string, RegExp>; wide?: boolean}[] = [
  // A log's calendar: no day below the target this month; the two days with nothing logged said apart, never counted.
  {family: 'month calendars (Health)', ask: 'which days did I not reach my water goal this month', kinds: {'water-days': ['target reached on every day logged', '2 with nothing logged']}},
  {family: 'ranked bars', ask: 'wat heb ik deze maand uitgegeven', kinds: {'spending-ranks': ['€435.59', 'Groceries', '€187.10']}},
  // At 2560 the scan stands as a hero with its heart and its rows (a narrow panel keeps the figure, the vitals and the foot).
  {family: 'scanners', ask: 'how is my health', wide: true, kinds: {'health-scan': ['4', 'of 5', '7 h 17 min', '8,800 steps', '73.48 kg', 'none recorded', 'not a live reading']}},
  {family: 'trends', ask: 'is my weight going down', kinds: {'weight-trend': ['73.48', 'Goal 72 kg']}},
  {family: 'gauges and dials', ask: 'what is my next bill', kinds: {'bill-dial': ['Rent', '€950.00', '14']}},
  {family: 'flames', ask: 'what is my journal streak', kinds: {'journal-streak': ['4', 'Longest']}},
  {family: 'twins', ask: 'did I spend more this month than last month', kinds: {'spending-compare': ['€435.59']}},
  {family: 'timelines', ask: 'which tasks are overdue', kinds: {'task-overdue': ['Sketch the garden bed', 'Book the dentist'], 'task-timeline': ['2 overdue']}},
  // "How am I doing": facts beside the person's own past, never a score, grade or judgement (A3).
  {family: 'radars', ask: 'hoe doe ik het deze week in het algemeen', kinds: {'life-radar': ['11', 'Habits']}, table: {'life-radar': /Nov 9/}, never: /\b(?:score|grade|rating|good job|well done|great|poor|bad)\b/i},
  {family: 'rivers', ask: 'how much did I earn this month', kinds: {'cash-river': ['€2,114.41', '€2,550.00', '€435.59']}},
  {family: 'orbits', ask: 'which goals are behind', kinds: {'goal-orbits': ['Japan adventure', '42%']}},
  {family: 'lattices', ask: 'on which weekday do I miss habits most', kinds: {'habit-weekdays': ['Mondays']}},
  {family: 'constellation', ask: 'how many notes do I have', kinds: {'notes-constellation': ['8', 'Inbox']}},
  {family: 'NOVA itself', ask: 'what can you answer', kinds: {'nova-answers': ['Which days did I skip meditation this month?']}},
];
for (const f of ASKED) test(`family: ${f.family} — "${f.ask}" makes its own widget, with the Showcase's facts, whole`, async ({page}) => {
  if (f.wide) await page.setViewportSize({width: 2560, height: 1440});
  await showcaseNova(page);
  await ask(page, f.ask);
  for (const [id, facts] of Object.entries(f.kinds)) {
    await shows(page, id, facts);
    if (f.never) await expect(widget(page, id)).not.toContainText(f.never);
    // The comparison with the person's own past is always in the table, at every size.
    if (f.table?.[id]) await expect(widget(page, id).locator('table')).toContainText(f.table[id]!);
  }
});

// The families no answer of the Showcase makes in one step: pinned as an answer would make them.
const PINNED: {family: string; kinds: Record<string, readonly string[]>}[] = [
  {family: 'heat maps', kinds: {'spending-heat': ['€611.99', 'Nov 8']}},
  {family: 'stage bars', kinds: {'sleep-times': ['11:35']}},
  {family: 'vessels', kinds: {'water-week': ['14,500 mL', 'Target 2,000 mL']}},
];
for (const f of PINNED) test(`family: ${f.family} — on the stage with the Showcase's facts, whole`, async ({page}) => {
  await showcaseNova(page, Object.keys(f.kinds));
  for (const [id, facts] of Object.entries(f.kinds)) await shows(page, id, facts);
});

test('the health scan\'s heart is decoration and says so; Motion Off leaves every answer widget still', async ({page}) => {
  await page.setViewportSize({width: 2560, height: 1440});
  await showcaseNova(page, ['health-scan', 'water-days', 'streak-flames', 'cash-river']);
  // A2: never a live measurement; a heart rate only where one is recorded (the Showcase has none).
  await expect(widget(page, 'health-scan').getByRole('img', {name: 'Decorative heart, not a live measurement'})).toBeVisible();
  await expect(widget(page, 'health-scan')).toContainText('none recorded');
  await page.evaluate(() => { localStorage.setItem('zigoals:motion:v1', 'off'); document.documentElement.dataset.appMotion = 'off'; });
  await expect(frame(page)).toHaveAttribute('data-hud-motion', 'still');
  await expect.poll(() => page.evaluate(() => [...document.querySelectorAll('.nova-stage-area .ax-body')].flatMap(b => b.getAnimations({subtree: true})).filter(a => a.playState === 'running').length)).toBe(0);
});
