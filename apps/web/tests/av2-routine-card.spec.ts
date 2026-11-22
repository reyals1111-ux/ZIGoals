import {expect, test} from '@playwright/test';
import {createHabit, emptyHabitData, logHabitValue, HABITS_KEY, type HabitInput} from '../lib/habits';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Session AV lane 2 (habits pillar; LEDGER #181, #182, #183 — Fabulous's routine reminder, a tick from the routine card,
 * the small window): Habits → Routines: each step of a routine ticked for today from its card, with Undo, without the
 * player; the routine's reminder time; the reminder's link (#routine=<id>&open) opens the player at the first step still
 * open; "Small window" where the browser has Document Picture-in-Picture — at 390 and 1440, in Nebula, Light and Dark,
 * axe-clean, no sideways scroll at 320. Fictional data; every /api call 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const START = new Date('2026-11-01T08:00:00+01:00'), NOW = new Date('2026-11-25T08:00:00+01:00');
const A = 'aaaaaaaa-0000-4000-8000-0000000000a1', B = 'aaaaaaaa-0000-4000-8000-0000000000a2', C = 'aaaaaaaa-0000-4000-8000-0000000000a3';
const input = (title: string, extra: Partial<HabitInput> = {}): HabitInput => ({title, category: 'Wellbeing', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'morning', endCondition: {kind: 'none'}, ...extra});
function journal(firstDone: boolean) {
  let d = createHabit(emptyHabitData(), input('Fictional water'), START, A);
  d = createHabit(d, input('Fictional stretch', {stackAfterId: A}), START, B);
  d = createHabit(d, input('Fictional plan', {stackAfterId: B}), START, C);
  return firstDone ? logHabitValue(d, A, '2026-11-25', 1, {}, NOW) : d;
}
async function open(page: import('@playwright/test').Page, firstDone: boolean, path = '/app/habits') {
  await offline(page);
  await page.clock.install({time: NOW});
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([k, v]) => { localStorage.setItem(k, v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); sessionStorage.setItem('zigoals:yesterday-open:hidden', '2026-11-25'); }, [HABITS_KEY, JSON.stringify(journal(firstDone))] as const);
  await page.goto(path); await hydrated(page);
}
const stored = (page: import('@playwright/test').Page, id: string) => page.evaluate(([k, h]) => (JSON.parse(localStorage.getItem(k) ?? '{"habits":[]}').habits as {id: string; entries: {date: string; count: number}[]}[]).find(x => x.id === h)?.entries.find(e => e.date === '2026-11-25')?.count ?? 0, [HABITS_KEY, id] as const);

for (const theme of THEMES) test(`${theme}: tick a step from the routine card, with Undo, and set its reminder`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await open(page, false);
  const steps = page.getByRole('list', {name: /: today’s steps$/});
  const stretch = steps.getByRole('checkbox', {name: 'Fictional stretch'});
  await expect(stretch).not.toBeChecked();
  await stretch.check();
  await expect.poll(() => stored(page, B)).toBe(1);
  await expect(stretch).toBeChecked();
  await expect(stretch).toBeFocused();
  await page.getByRole('button', {name: 'Undo'}).first().click();
  await expect.poll(() => stored(page, B)).toBe(0);
  const time = page.getByLabel(/: reminder time$/);
  await time.fill('07:30');
  await expect(page.getByText(/reminder at .+ on this device; it opens the routine at the first step still open\./)).toBeVisible();
  await page.getByRole('button', {name: /^Turn the .+ reminder off$/}).click();
  await expect(time).toBeFocused();
  const findings = await axe(page, page.locator('.habit-routines'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test('the reminder link opens the player at the first step still open', async ({page}) => {
  await open(page, true, `/app/habits#routine=${A}&open`);
  const player = page.locator('.routine-player');
  await expect(player.getByRole('heading', {level: 2})).toHaveText('Fictional stretch');
  await expect(player).toContainText('step 2 of 3');
  // The small window is offered only where the browser has Document Picture-in-Picture.
  const pip = await page.evaluate(() => 'documentPictureInPicture' in window);
  await expect(player.getByRole('button', {name: 'Small window'})).toHaveCount(pip ? 1 : 0);
});
