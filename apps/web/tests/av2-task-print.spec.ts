import {expect, test} from '@playwright/test';
import {THEMES, applyTheme, axe, offline, settle} from './p6-helpers';
import {addProject, addSection, addTask} from '../lib/tasks/engine';
import {emptyTasks} from '../lib/tasks/schema';

/**
 * Session AV lane 2 (tasks-r2, LEDGER #225; Google Tasks' print): "Print this list" under a project's list puts a print
 * sheet on the page for the browser's print — title, groups by section, tick boxes, days, priority, subtasks indented —
 * hidden on screen and gone after printing; focus stays on the button. The browser's print is stubbed to read the sheet.
 * At 390 and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const at = new Date('2026-11-23T07:00:00Z'), today = '2026-11-23';
let seeded = addSection(addProject(emptyTasks(), {name: 'Fictional move'}, 'project_fictional-move'), 'project_fictional-move', 'Packing', 'section_packing');
seeded = addTask(seeded, {title: 'Book the fictional van', projectId: 'project_fictional-move', due: today, level: 1}, {id: 'task_van', at, today});
seeded = addTask(seeded, {title: 'Pack the fictional kitchen', projectId: 'project_fictional-move', sectionId: 'section_packing'}, {id: 'task_kitchen', at, today});
seeded = addTask(seeded, {title: 'Fictional plates', parentId: 'task_kitchen', projectId: 'project_fictional-move', sectionId: 'section_packing'}, {id: 'task_plates', at, today});

for (const theme of THEMES) test(`${theme}: print a project's list`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T09:00:00+01:00')});
  await page.addInitScript(() => {
    const w = window as unknown as {__prints: {text: string; on: boolean; shown: string}[]; print: () => void};
    w.__prints = [];
    w.print = () => { const sheet = document.querySelector<HTMLElement>('.tasks-print-sheet'); w.__prints.push({text: sheet?.innerText ?? sheet?.textContent ?? '', on: document.documentElement.classList.contains('zg-print-tasks'), shown: sheet ? getComputedStyle(sheet).display : 'none'}); window.dispatchEvent(new Event('afterprint')); };
  });
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(v => { localStorage.setItem('zigoals:tasks:v1', v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, JSON.stringify(seeded));
  await page.goto('/app/tasks?view=project:project_fictional-move'); await settle(page);
  const button = page.getByRole('button', {name: 'Print this list'});
  await expect(button).toBeVisible();
  await button.click();
  await expect.poll(() => page.evaluate(() => (window as unknown as {__prints: unknown[]}).__prints.length)).toBe(1);
  const printed = await page.evaluate(() => (window as unknown as {__prints: {text: string; on: boolean; shown: string}[]}).__prints[0]!);
  expect(printed.on).toBe(true);
  // Hidden on screen (the print media shows it).
  expect(printed.shown).toBe('none');
  await expect(page.locator('.tasks-print-sheet')).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveClass(/zg-print-tasks/);
  await expect(button).toBeFocused();
  // The sheet as the printer sees it.
  await page.emulateMedia({media: 'print'});
  await page.evaluate(() => { (window as unknown as {print: () => void}).print = () => undefined; });
  await button.click();
  const sheet = page.locator('.tasks-print-sheet');
  await expect(sheet.getByRole('heading', {level: 1})).toHaveText('Fictional move');
  await expect(sheet.getByRole('heading', {level: 2})).toHaveText(['Packing']);
  await expect(sheet.locator('li')).toHaveText([/☐Book the fictional vanToday · P1 · High/, /☐Pack the fictional kitchen/, /☐Fictional plates/]);
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await expect(sheet).toHaveCount(0);
  await page.emulateMedia({media: 'screen'});
  const f = await axe(page, page.locator('main'));
  expect(f.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(f)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
