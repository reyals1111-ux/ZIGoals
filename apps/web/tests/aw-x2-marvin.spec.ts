import {expect, test, type Page} from '@playwright/test';
import {moreViews} from './fr-layout-helpers';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {MOTION_PREFERENCE_KEY} from '../components/use-entrance';
import {tasksSchema, type Tasks} from '../lib/tasks/schema';

/**
 * Session AW (X2, LEDGER #432–#437, #448; Amazing Marvin's stuck-task tools): Tasks → Today's heading line says today's
 * tasks done next to how far the working hours have gone (never "behind"); a dreaded task says so on its row and Hardest
 * first gives it the first free time in Plan my day; Pick one for me offers one of today's tasks and "This one" opens it;
 * its editor's "Stuck? Help me start" splits it into steps (subtasks); Tasks → Review lists the task moved most ("Moved 3
 * times") and the one open a long time, whose Keep touches only its last change; Tasks → This week shows a time target met
 * from a focus block. At 390 and 1440 in Nebula, Light and Dark (plus 320 and pure black once), axe-clean, no sideways
 * scroll, and still under Motion Off and reduced motion. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const MON = '2026-11-23', NOW = new Date(`${MON}T13:30:00+01:00`);
function seed(): Tasks {
  const at = '2026-11-16T08:00:00.000Z';
  return tasksSchema.parse({version: 1, projects: [{id: 'project_book', name: 'Fictional book', colour: 'teal', order: 0}], tasks: [
    {id: 'task_tax', title: 'Fictional tax form', priority: 'normal', due: MON, createdAt: at, dread: 3},
    {id: 'task_email', title: 'Fictional email', priority: 'normal', due: MON, createdAt: at},
    {id: 'task_stamps', title: 'Fictional stamps', priority: 'normal', due: MON, createdAt: at, doneAt: `${MON}T08:00:00.000Z`},
    {id: 'task_letter', title: 'Fictional letter', priority: 'normal', due: '2026-11-26', createdAt: at, moved: 3},
    {id: 'task_shed', title: 'Fictional shed', priority: 'low', createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z'},
    {id: 'task_chapter', title: 'Fictional chapter', priority: 'normal', due: '2026-11-27', createdAt: at, projectId: 'project_book', labels: ['writing']},
  ]});
}
const PLAN = {version: 1, timeTargets: [{id: 'tt_writing', kind: 'label', of: 'writing', minutes: 300, per: 'week'}]};
const FOCUS = {version: 1, sessions: [{id: 'focus_x2-aaaaaaaa', startedAt: `${MON}T08:00:00.000Z`, endedAt: `${MON}T08:25:00.000Z`, day: MON, plannedMinutes: 25, focusedSeconds: 1500, awaySeconds: 0, outcome: 'grown', taskId: 'task_chapter'}]};
type Stored = {id: string; parentId?: string; updatedAt?: string; due?: string; moved?: number};
const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:tasks:v1') ?? '{"tasks":[]}')) as Promise<{tasks: Stored[]}>;
const clean = async (page: Page) => { const f = await axe(page, page.locator('main')); expect(f.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(f)).toEqual([]); };
const noSideways = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
const row = (page: Page, title: string) => page.locator('li.task').filter({has: page.locator('.task-title', {hasText: title})}).first();
const ready = (page: Page) => page.locator('.tasks-page[data-tasks="ready"]').waitFor();

async function start(page: Page, theme: (typeof THEMES)[number] | 'black', width?: number) {
  if (theme === 'black') await page.addInitScript(() => localStorage.setItem('zigoals:ui-prefs:v1', JSON.stringify({version: 1, theme: 'dark', look: {darkStyle: 'black'}})));
  else await applyTheme(page, theme);
  await offline(page);
  if (width) await page.setViewportSize({width, height: 900});
  await page.clock.install({time: NOW});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(([t, p, f]) => {
    localStorage.setItem('zigoals:tasks:v1', t); localStorage.setItem('zigoals:task-plan:v1', p); localStorage.setItem('zigoals:focus-sessions:v1', f);
    localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true}));
  }, [JSON.stringify(seed()), JSON.stringify(PLAN), JSON.stringify(FOCUS)] as const);
}

for (const theme of THEMES) test(`${theme}: today's progress, Hardest first, Pick one for me, the stuck guide, Review's moved and long open, a time target`, async ({page, isMobile}) => {
  await start(page, theme, isMobile ? undefined : 1440);

  // #436: two facts in Today's heading line, never "behind"; nothing of it is a card of its own.
  await page.goto('/app/tasks?view=today'); await settle(page); await ready(page);
  const line = page.locator('.tasks-view-head .tasks-day-progress');
  await expect(line).toContainText('1 of 3 of today’s tasks done');
  await expect(line).toContainText('the day is 50 % through');
  await expect(line).not.toContainText(/behind|late/i);
  // #432: the person's own dread mark, as words on the row.
  await expect(row(page, 'Fictional tax form').locator('.task-dread')).toHaveText('Dreading · a lot');
  await noSideways(page);

  // #432: Hardest first gives the dreaded task the first free time in Fit my day.
  const fit = page.locator('details.tasks-fit-day');
  await fit.locator('summary').click();
  await fit.getByRole('checkbox', {name: /Hardest first/}).check();
  await expect(fit.getByRole('list', {name: 'A plan for today'}).getByRole('listitem').first()).toContainText('Fictional tax form');

  // #435: Pick one for me offers one of today's open tasks; This one opens its editor. Nothing is changed by the pick.
  const before = JSON.stringify(await stored(page));
  const pick = page.locator('details.tasks-pick');
  await pick.locator('summary').click();
  await pick.getByRole('button', {name: 'Pick one', exact: true}).click();
  const picked = (await pick.locator('.tasks-pick-one').textContent())!.trim();
  expect(['Fictional tax form', 'Fictional email']).toContain(picked);
  expect(JSON.stringify(await stored(page))).toBe(before);
  if (!isMobile) await clean(page);
  await pick.getByRole('button', {name: 'This one'}).click();
  const editor = page.getByRole('form', {name: `Edit “${picked}”`});
  await expect(editor).toBeVisible();

  // #448: the written guide — too big? — splits it into steps (subtasks), one change with its Undo.
  await editor.getByRole('button', {name: 'Stuck? Help me start'}).click();
  const guide = editor.getByRole('group', {name: 'Stuck? Help me start'});
  await guide.getByRole('button', {name: 'Does it feel too big?'}).click();
  await expect(guide).toContainText('Write down three to five small steps');
  await guide.getByLabel('Steps, one on each line').fill('Find last year’s letter\nOpen the form');
  await guide.getByRole('button', {name: 'Split it into steps'}).click();
  const id = picked === 'Fictional tax form' ? 'task_tax' : 'task_email';
  await expect.poll(async () => (await stored(page)).tasks.filter(t => t.parentId === id).length).toBe(2);
  await expect(guide.getByRole('button', {name: 'Play the steps'})).toBeVisible();
  if (!isMobile) await clean(page);
  await noSideways(page);
  await editor.getByRole('button', {name: 'Cancel', exact: true}).click();

  // #433, #434: Tasks → Review (under More views), Moved most and Open a long time; Keep touches only the last change.
  await moreViews(page);
  await expect(page.getByRole('navigation', {name: 'Task views'}).getByRole('button', {name: /^Review/})).toBeVisible();
  await page.goto('/app/tasks?view=review'); await settle(page); await ready(page);
  const moved = page.getByRole('list', {name: 'Tasks moved most'});
  await expect(moved).toContainText('Fictional letter');
  await expect(moved).toContainText('Moved 3 times');
  const long = page.getByRole('list', {name: 'Tasks unchanged for 60 days or more'});
  await expect(long).toContainText('Fictional shed');
  if (!isMobile) await clean(page);
  await long.getByRole('button', {name: 'Keep “Fictional shed”'}).click();
  await expect.poll(async () => (await stored(page)).tasks.find(t => t.id === 'task_shed')?.updatedAt?.slice(0, 10)).toBe(MON);
  await expect(page.getByRole('heading', {name: /Open a long time/})).toBeFocused();
  expect((await stored(page)).tasks.find(t => t.id === 'task_shed')?.due).toBeUndefined();
  await noSideways(page);

  // #437: a time target in This week, met from the focus block on its task.
  await page.goto('/app/tasks?view=week'); await settle(page); await ready(page);
  const targets = page.getByRole('list', {name: 'Time targets'});
  await expect(targets).toContainText('@writing');
  await expect(targets).toContainText('25 min of 5 h this week');
  await expect(targets).not.toContainText(/behind/i);
  if (!isMobile) await clean(page);
  await noSideways(page);
});

test('320 px in pure black: the heading line, Review and the targets fit, axe-clean', async ({page}) => {
  await start(page, 'black', 320);
  for (const view of ['today', 'review', 'week']) {
    await page.goto(`/app/tasks?view=${view}`); await settle(page); await ready(page);
    await noSideways(page);
    await clean(page);
  }
  await expect(page.getByRole('list', {name: 'Time targets'})).toContainText('25 min of 5 h this week');
});

test('Motion Off and reduced motion: the progress bar and the pick stand still', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await start(page, 'nebula');
  await page.evaluate(k => localStorage.setItem(k, 'off'), MOTION_PREFERENCE_KEY);
  await page.goto('/app/tasks?view=today'); await settle(page); await ready(page);
  await expect(page.locator('.tasks-day-progress')).toBeVisible();
  const pick = page.locator('details.tasks-pick');
  await pick.locator('summary').click();
  await pick.getByRole('button', {name: 'Pick one', exact: true}).click();
  const running = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect instanceof KeyframeEffect && !!(a.effect.target as Element | null)?.closest?.('.tasks-day-progress, .tasks-pick')).length);
  expect(running).toBe(0);
});
