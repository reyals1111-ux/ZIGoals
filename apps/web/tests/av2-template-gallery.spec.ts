import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';

/**
 * Session AV lane 2 (tasks-r2, LEDGER #226; Any.do's template gallery): Tasks → Areas and templates → "Template gallery"
 * lists the written templates by group (Home, Work, Family, Personal) in English or Dutch; "Use" chooses one and moves the
 * focus to its project name; Make the project builds it with its sections and days from the start day (one Undo) — at 390
 * and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam', locale: 'en-GB'});
const tasks = (page: import('@playwright/test').Page) => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:tasks:v1') ?? '{"tasks":[]}') as {tasks: {title: string; due?: string; projectId?: string}[]; projects?: {id: string; name: string}[]; sections?: {name: string}[]});

for (const theme of THEMES) test(`${theme}: the template gallery in Dutch makes a project`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T09:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(() => { localStorage.setItem('zigoals:tasks:v1', JSON.stringify({version: 1, tasks: []})); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); });
  await page.goto('/app/tasks?view=organise'); await settle(page);
  const gallery = page.locator('details.tasks-gallery');
  await gallery.locator('summary').click();
  await expect(gallery.getByRole('heading', {level: 5})).toHaveText(['Home', 'Work', 'Family', 'Personal']);
  await gallery.getByRole('radio', {name: 'Nederlands'}).check();
  await expect(gallery.getByRole('heading', {level: 5})).toHaveText(['Thuis', 'Werk', 'Gezin', 'Persoonlijk']);
  await gallery.getByRole('button', {name: 'Use the template “Een feestje”'}).click();
  const name = page.getByRole('textbox', {name: 'Project name'});
  await expect(name).toBeFocused();
  await expect(page.getByRole('combobox', {name: 'Template'})).toHaveValue('gallery-party');
  await name.fill('Fictief feest');
  await page.getByLabel('Start day').fill('2026-12-01');
  await page.getByRole('button', {name: 'Make the project'}).click();
  await expect.poll(async () => (await tasks(page)).projects?.map(p => p.name)).toEqual(['Fictief feest']);
  const made = await tasks(page);
  expect(made.tasks.find(t => t.title === 'Versieren en het eten klaarzetten')?.due).toBe('2026-12-22');
  expect(made.sections?.map(s => s.name)).toEqual(['Plannen', 'Twee weken ervoor', 'De week ervoor', 'De dag ervoor', 'Feestdag', 'Erna']);
  const f = await axe(page, page.locator('main'));
  expect(f.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(f)).toEqual([]);
  await page.getByRole('button', {name: /^Undo/}).first().click();
  await expect.poll(async () => (await tasks(page)).tasks.length).toBe(0);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
