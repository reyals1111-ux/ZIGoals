import {expect, test, type Locator, type Page} from '@playwright/test';
import {moreViews} from './fr-layout-helpers';
import {at, DAY1, freshWeek, hydrated, openAt, setup, ZONE} from './au/au-helpers';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {MONEY_LOG_KEY} from '../lib/money-log/schema';
import {BUDGETS_KEY} from '../lib/budgets/schema';
import {createHabit, emptyHabitData, HABITS_KEY} from '../lib/habits';

/**
 * Session AV, owner follow-up 1 (Part 4b, ADR-045): the audit's open rows, each at 390 (the phone project) and at 1440 (the
 * desktop project), the visual ones in Nebula, Light and Dark. D20-1/D20-2 setup's target field; D20-6/D20-7 the first
 * five; M-12c Tasks' priorities; S-12/M-12a the toast clear of what a save changed; M-12b the chip rows; L-7 the weekly
 * card with only monthly budgets. Fictional records; every /api call answers 503.
 */
test.use({timezoneId: ZONE});
const wide = (page: Page) => (page.viewportSize()?.width ?? 0) >= 901;
test.beforeEach(async ({page, isMobile}) => { if (!isMobile) await page.setViewportSize({width: 1440, height: 900}); });
const overlap = (a: {x: number; y: number; width: number; height: number}, b: {x: number; y: number; width: number; height: number}) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
/** The toast and `target` do not overlap on screen (both visible). */
async function clearOf(page: Page, target: Locator) {
  const toast = page.locator('.aa-toast').last();
  await expect(toast).toBeVisible();
  await expect.poll(async () => { const [t, r] = await Promise.all([toast.boundingBox(), target.boundingBox()]); return !!t && !!r && !overlap(t, r); }, {timeout: 5_000}).toBe(true);
}

test('D20-1, D20-2: setup\'s target amount starts empty, says it is the person\'s own, and the phone keyboard says Next', async ({page}) => {
  await freshWeek(page, 'nebula', at(DAY1, '08:00'));
  await page.goto('/app'); await hydrated(page);
  await page.getByRole('region', {name: 'Set up your first goal and habit in about a minute.'}).getByRole('link', {name: 'Start setup', exact: true}).click();
  await page.waitForURL('**/app/welcome');
  const flow = page.locator('main');
  await flow.getByRole('button', {name: 'Let’s begin', exact: true}).click();
  await flow.getByRole('checkbox', {name: /^Goals & money/}).check();
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  await flow.getByRole('button', {name: 'Skip this step', exact: true}).click();
  await flow.getByRole('radio', {name: 'Something else', exact: true}).check();
  const amount = flow.getByLabel('Target amount');
  await expect(amount).toHaveValue('');
  await expect(amount).toHaveAttribute('placeholder', 'For example 1500');
  await expect(amount).toHaveAttribute('inputmode', 'decimal');
  await expect(amount).toHaveAttribute('enterkeyhint', 'next');
  await expect(amount).toHaveAccessibleDescription('Your own amount; nothing is filled in for you.');
  await expect(flow.getByLabel('Goal name')).toHaveAttribute('enterkeyhint', 'next');
});

test('D20-6, D20-7: the first five names its money step for what ticks it; Tab follows the card as it is drawn', async ({page}) => {
  await freshWeek(page, 'nebula', at(DAY1, '08:00'));
  await setup(page, [/^Habits/]);
  await openAt(page, at(DAY1, '08:30'));
  const card = page.getByRole('region', {name: 'Five small steps, about two minutes.'});
  await expect(card.getByRole('link', {name: 'Log an expense or income'})).toBeVisible();
  await expect(card.getByText('Record some money')).toHaveCount(0);
  // The card's stops in Tab order: every link, top to bottom, then "Not now, hide this" last.
  const stops = card.locator('a, button');
  const n = await stops.count(), tops: number[] = [];
  await stops.first().focus();
  for (let i = 0; i < n; i++) {
    const focused = await page.evaluate(() => { const el = document.activeElement as HTMLElement; return {top: el.getBoundingClientRect().top + scrollY, text: el.textContent?.trim()}; });
    tops.push(focused.top);
    if (i === n - 1) expect(focused.text).toBe('Not now, hide this');
    await page.keyboard.press('Tab');
  }
  for (let i = 1; i < tops.length; i++) expect(tops[i]).toBeGreaterThanOrEqual(tops[i - 1]!);
});

test('M-12c, M-12a: Tasks lists P1 to P4, P3 included; the "Added" note stays clear of the new row', async ({page}) => {
  await freshWeek(page, 'nebula', at(DAY1, '08:00'));
  await page.goto('/app/tasks'); await hydrated(page);
  const nav = page.getByRole('navigation', {name: 'Task views'});
  // (fr-layout; deliberate) on a phone the view sits behind "More views" (FR-L-5): opened first, the same check after.
  await moreViews(page);
  await expect(nav.getByRole('button', {name: /^P\d · /})).toHaveText([/^P1 · High/, /^P2 · Medium/, /^P3 · Normal/, /^P4 · Low/]);
  for (let i = 0; i < 6; i++) { await page.getByLabel('New task').first().fill(`Fictional errand ${i + 1}`); await page.getByLabel('New task').first().press('Enter'); }
  await expect(page.locator('.aa-toast').last()).toContainText('Added “Fictional errand 6”.');
  await clearOf(page, page.locator('li.task').filter({hasText: 'Fictional errand 6'}));
  // P3 is the default level: the view lists the plain errands.
  await moreViews(page);
  await nav.getByRole('button', {name: /^P3 · Normal/}).click();
  await expect(page.locator('li.task').filter({hasText: 'Fictional errand 1'})).toBeVisible();
});

test('S-12: "Night saved." stays clear of the 7-day averages the save just changed', async ({page}) => {
  await freshWeek(page, 'nebula', at(DAY1, '08:00'));
  await page.goto('/app/health?view=sleep'); await hydrated(page);
  const form = page.getByRole('form', {name: 'Log a night or a nap'});
  await form.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(page.locator('.aa-toast').last()).toContainText('Night saved.');
  await clearOf(page, page.locator('.sleep-week .sleep-stats'));
});

test('M-12b: a sideways chip row says there is more; Tasks has none that runs off the screen', async ({page}) => {
  await freshWeek(page, 'nebula', at(DAY1, '08:00'));
  await page.goto('/app/settings'); await hydrated(page);
  let data = emptyHabitData();
  for (const [i, title] of ['Fictional walk', 'Fictional reading'].entries()) data = createHabit(data, {title, category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, at(DAY1, '07:00'), `aaaaaaaa-0000-4000-8000-00000000000${i + 1}`);
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [HABITS_KEY, JSON.stringify(data)] as const);
  await page.goto('/app/habits'); await hydrated(page);
  const bar = page.locator('.habit-filter-bar').first();
  await expect(bar).toBeVisible();
  const runsOff = await bar.evaluate(el => el.scrollWidth - el.clientWidth > 2);
  if (runsOff) await expect(bar).toHaveAttribute('data-scroll-more', '');
  await page.goto('/app/tasks'); await hydrated(page);
  const cut = await page.evaluate(() => [...document.querySelectorAll('main *')].filter(el => { const cs = getComputedStyle(el); return (cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth - el.clientWidth > 2 && !el.hasAttribute('data-scroll-more') && el.getClientRects().length; }).map(el => el.className));
  expect(cut).toEqual([]);
});

test.describe('L-7: with only monthly budgets, the weekly card shows this month\'s room and points to the budgets', () => {
  for (const theme of THEMES) test(theme, async ({page}) => {
    await applyTheme(page, theme);
    await offline(page);
    await page.clock.install({time: at(DAY1, '10:00')});
    await page.goto('/app/settings'); await hydrated(page);
    const month = DAY1.slice(0, 7);
    await page.evaluate(([logKey, budgetsKey, day, since]) => {
      localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true}));
      localStorage.setItem(logKey, JSON.stringify({version: 1, weekStartsOn: 'monday', currency: 'EUR', entries: [{id: 'e1', kind: 'expense', amount: '45.50', currency: 'EUR', category: 'Groceries', date: day, createdAt: `${day}T09:00:00.000Z`}]}));
      localStorage.setItem(budgetsKey, JSON.stringify({version: 1, budgets: [{id: 'b1', category: 'Groceries', currency: 'EUR', monthly: '300.00', rollover: false, since}]}));
    }, [MONEY_LOG_KEY, BUDGETS_KEY, DAY1, month] as const);
    await page.goto('/app/wealth'); await settle(page);
    const room = page.getByRole('group', {name: 'Room to spend'});
    await expect(room).toContainText('left of €300.00 in this month\'s budgets');
    await expect(room).toContainText('€254.50');
    await expect(room).not.toContainText('No weekly budget');
    const findings = await axe(page, room);
    expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await room.getByRole('link', {name: 'See budgets by category'}).click();
    await expect(page.locator('#budgets')).toBeVisible();
    await expect(page.locator('#budgets')).toContainText('Groceries');
  });
});
