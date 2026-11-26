import {expect, test, type Locator, type Page} from '@playwright/test';
import {applyTheme, axe, loadShowcase, offline, settle, THEMES, type Theme} from './p6-helpers';
import {HEALTH_STORAGE_KEY} from '../lib/health';
import {WORKOUTS_KEY} from '../lib/workouts/schema';
import {addTask} from '../lib/tasks/engine';
import {emptyTasks} from '../lib/tasks/schema';

/**
 * Session AW (fr-ui): the quick UI Minors from the fresh-eyes persona walks (FRIEND_READINESS FR-AW-7, -8, -15, -18, -21,
 * -26), at 390 (the phone project, measured on a 390 × 844 screen as the walks were) and 1440, in Nebula, Light and Dark,
 * axe-clean, no sideways scroll at 320. Nothing here moves, so there is no Motion Off check. Fictional data; offline.
 * - FR-AW-7: the "Sleep better" focus picks a sleep goal of 8 h on the starters step, said as a suggestion, changeable;
 * - FR-AW-8: bed 00:30 with the default bed date (the evening before) and wake 07:00 saves as 00:30 → 07:00 on the wake day;
 * - FR-AW-15: once a reminder has gone off, "New task" stays on the first phone screen (the reminders come under it);
 * - FR-AW-18: "Start an empty workout" comes before the week figures and the 12-week chart;
 * - FR-AW-21: Habits' empty-card idea notes are at least 14 px;
 * - FR-AW-26: the Checklist's Showcase label and Wealth's split figures are at least 14 px.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const serious = async (page: Page, where: Locator) => { const f = await axe(page, where); expect(f.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(f)).toEqual([]); };
const noSideways = async (page: Page) => { await page.setViewportSize({width: 320, height: 720}); expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1); };
const size = (el: Locator) => el.evaluate(e => parseFloat(getComputedStyle(e).fontSize));
const screen = (isMobile: boolean) => isMobile ? {width: 390, height: 844} : {width: 1440, height: 900};
/** The phone's tab bar covers the foot of the screen: a control counts as on the first screen above it. */
const PHONE_TABS = 72;
async function start(page: Page, theme: Theme, isMobile: boolean, at: string, records: Record<string, string> = {}) {
  await applyTheme(page, theme);
  await offline(page);
  await page.setViewportSize(screen(isMobile));
  await page.clock.install({time: new Date(at)});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(r => { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); for (const [k, v] of Object.entries(r)) localStorage.setItem(k, v); }, records);
}

for (const theme of THEMES) test.describe(`${theme}`, () => {
  test('FR-AW-7: "Sleep better" picks a sleep goal of 8 h on the starters step, as a suggestion that can be changed', async ({page, isMobile}) => {
    await applyTheme(page, theme);
    await offline(page);
    await page.setViewportSize(screen(isMobile));
    await page.goto('/app/welcome');
    const flow = page.locator('main');
    await flow.getByRole('button', {name: 'Let’s begin', exact: true}).click();
    await flow.getByRole('checkbox', {name: /^Sleep & mind/}).check();
    await flow.getByRole('button', {name: 'Continue', exact: true}).click();
    await expect(flow.getByRole('heading', {level: 1, name: 'Two or three things to focus on.'})).toBeFocused();
    await flow.getByRole('checkbox', {name: /^Sleep better/}).check();
    await expect(flow).toContainText('a sleep goal of 8 h 00 min');
    await flow.getByRole('button', {name: 'Continue', exact: true}).click();
    const goal = flow.getByRole('radiogroup', {name: 'Sleep goal'});
    const eight = goal.getByRole('radio', {name: /^8 h 00 min asleep/});
    await expect(eight).toBeChecked();
    await expect(goal).toContainText('Suggested for your focus “Sleep better”');
    await expect(flow).toContainText('Picked as a suggestion: choose another length or “No sleep goal” if it does not fit.');
    await serious(page, flow);
    // Changeable: "No sleep goal" sticks, and the suggestion line goes.
    await goal.getByRole('radio', {name: 'No sleep goal', exact: true}).check();
    await expect(eight).not.toBeChecked();
    await expect(flow).not.toContainText('Picked as a suggestion');
    await goal.getByRole('radio', {name: /^8 h 00 min asleep/}).check();
    await flow.getByRole('button', {name: 'Continue', exact: true}).click();
    await flow.getByRole('button', {name: 'Skip the tour', exact: true}).click();
    await flow.getByRole('button', {name: 'Continue', exact: true}).click();
    await flow.getByRole('button', {name: 'Continue', exact: true}).click();
    await expect(flow.getByRole('region', {name: 'When you finish'})).toContainText('A sleep goal of 8 h 00 min.');
    await noSideways(page);
  });

  test('FR-AW-8: bed 00:30 with the default bed date and wake 07:00 saves as a night on the wake day', async ({page, isMobile}) => {
    await start(page, theme, isMobile, '2026-12-03T09:00:00+01:00');
    await page.goto('/app/health?view=sleep'); await settle(page);
    const form = page.getByRole('form', {name: 'Log a night or a nap'});
    await expect(form.getByLabel('Went to bed (date)')).toHaveValue('2026-12-02');
    await expect(form.getByLabel('Woke up (date)')).toHaveValue('2026-12-03');
    await expect(form.getByLabel('Woke up (time)')).toHaveValue('07:00');
    await form.getByLabel('Went to bed (time)').fill('00:30');
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    await expect(page.locator('.sleep-note')).toHaveText('Night saved. Bed time read as Dec 3, 2026, the day you woke up (a night is at most 24 hours).');
    await expect.poll(async () => page.evaluate(k => { const s = JSON.parse(localStorage.getItem(k) ?? 'null')?.sleep; return s?.nights?.map((n: {start: string; end: string}) => [n.start, n.end]) ?? null; }, HEALTH_STORAGE_KEY))
      .toEqual([[new Date('2026-12-03T00:30:00+01:00').toISOString(), new Date('2026-12-03T07:00:00+01:00').toISOString()]]);
    await serious(page, page.locator('main'));
    await noSideways(page);
  });

  test('FR-AW-15: once a reminder has gone off, "New task" stays on the first screen, the reminder under it', async ({page, isMobile}) => {
    const at = new Date('2026-11-25T07:00:00Z');
    const tasks = JSON.stringify(addTask(emptyTasks(), {title: 'Pay the fictional card minimum', due: '2026-11-25', time: '09:00', reminders: [{before: 30}]}, {id: 'task_fictional-card', at, today: '2026-11-25'}));
    await start(page, theme, isMobile, '2026-11-25T08:40:00+01:00', {'zigoals:tasks:v1': tasks});
    await page.goto('/app/tasks'); await settle(page);
    const rows = page.getByRole('list', {name: 'Reminders that have gone off'});
    await expect(rows.getByRole('listitem')).toHaveCount(1);
    const field = page.getByRole('textbox', {name: 'New task'}).first();
    const box = (await field.boundingBox())!, card = (await page.getByRole('region', {name: 'Reminders'}).boundingBox())!;
    expect(box.y + box.height, 'New task on the first screen').toBeLessThanOrEqual(screen(isMobile).height - (isMobile ? PHONE_TABS : 0));
    expect(card.y, 'the reminders under New task').toBeGreaterThan(box.y);
    // The row keeps every button.
    for (const name of ['Done', 'Dismiss', 'Start focus on “Pay the fictional card minimum”']) await expect(rows.getByRole('button', {name, exact: true})).toBeVisible();
    await expect(rows.getByRole('group', {name: 'Snooze “Pay the fictional card minimum”'}).getByRole('button')).toHaveCount(3);
    await serious(page, page.locator('main'));
    await rows.getByRole('button', {name: 'Done', exact: true}).click();
    await expect.poll(async () => page.evaluate(() => !!JSON.parse(localStorage.getItem('zigoals:tasks:v1')!).tasks[0].doneAt)).toBe(true);
    await noSideways(page);
  });

  test('FR-AW-18: "Start an empty workout" comes before the week figures and the 12-week chart', async ({page, isMobile}) => {
    const workout = (id: string, date: string) => ({id, name: 'Fictional session', date, type: 'strength', startedAt: `${date}T08:00:00.000Z`, endedAt: `${date}T08:40:00.000Z`,
      exercises: [{id: `${id}-e`, exerciseId: 'bench-press', name: 'Bench press', measure: 'weight-reps', sets: [{id: `${id}-s`, kind: 'normal', weightKg: 60, reps: 8, done: true}]}]});
    const record = {version: 1, templates: [], exercises: [], workouts: ['2026-11-24', '2026-11-17', '2026-11-10', '2026-11-03', '2026-10-27', '2026-10-20'].map((d, i) => workout(`w${i}`, d))};
    await start(page, theme, isMobile, '2026-11-25T10:00:00+01:00', {[WORKOUTS_KEY]: JSON.stringify(record)});
    await page.goto('/app/health?view=workouts'); await settle(page);
    const panel = page.getByRole('region', {name: 'Start a workout'});
    const button = panel.getByRole('button', {name: 'Start an empty workout', exact: true});
    const weeks = page.getByRole('region', {name: 'Your last 12 weeks'});
    await expect(weeks).toBeVisible();
    const b = (await button.boundingBox())!;
    expect(b.y, 'above the week figures').toBeLessThan((await panel.getByText(/^This week: /).boundingBox())!.y);
    expect(b.y, 'above the 12-week chart').toBeLessThan((await weeks.boundingBox())!.y);
    expect(b.y + b.height, 'on the first screen').toBeLessThanOrEqual(screen(isMobile).height - (isMobile ? PHONE_TABS : 0));
    await expect(panel.getByRole('button', {name: 'Repeat Fictional session', exact: true})).toBeVisible();
    await serious(page, panel);
    await button.click();
    await expect(page.getByText('Workout in progress', {exact: true})).toBeVisible();
    await noSideways(page);
  });

  test('FR-AW-21: the empty Habits card\'s idea notes are at least 14 px', async ({page, isMobile}) => {
    await start(page, theme, isMobile, '2026-11-25T10:00:00+01:00');
    await page.goto('/app/habits'); await settle(page);
    const ideas = page.getByRole('group', {name: 'Start with an idea'});
    await expect(ideas.getByRole('button')).toHaveCount(3);
    for (const note of await ideas.locator('button small').all()) expect(await size(note)).toBeGreaterThanOrEqual(14);
    await serious(page, ideas);
    await noSideways(page);
  });

  test('FR-AW-26: the Checklist\'s Showcase label and Wealth\'s split figures are at least 14 px', async ({page, isMobile}) => {
    await applyTheme(page, theme);
    await offline(page);
    await page.setViewportSize(screen(isMobile));
    await loadShowcase(page); await settle(page);
    await page.goto('/app/wealth'); await settle(page);
    const figures = page.locator('.wealth-split .split-figure');
    await expect(figures.first()).toBeVisible();
    for (const f of await figures.all()) {
      expect(await size(f)).toBeGreaterThanOrEqual(14);
      // Still on one line inside its box.
      expect(await f.evaluate(e => e.scrollWidth <= (e.parentElement!.closest('div')!.clientWidth + 1))).toBe(true);
    }
    await serious(page, page.getByRole('region', {name: 'Your wealth in one view'}));
    await page.goto('/app/checklist'); await settle(page);
    const dialog = page.locator('dialog.checklist-overlay');
    const label = dialog.getByRole('note').filter({hasText: 'Showcase · fictional'});
    await expect(label).toBeInViewport();
    expect(await size(label)).toBeGreaterThanOrEqual(14);
    const box = (await label.boundingBox())!, bar = (await dialog.locator('.checklist-topbar').boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(bar.y + bar.height - 1);
    expect(box.x + box.width).toBeLessThanOrEqual(screen(isMobile).width);
  });
});
