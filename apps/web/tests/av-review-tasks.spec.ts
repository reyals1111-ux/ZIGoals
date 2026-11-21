import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {TASKS_KEY} from '../lib/tasks/schema';
import {JOURNAL_KEY} from '../lib/journal/schema';

/**
 * Session AV, owner follow-up 1 (F-REVIEW-TASKS; Sunsama's weekly review): the weekly review gains a Tasks step and a
 * Journal step (read only: counts, never the entries' words), and its last step can add the intention to Tasks for the
 * Monday after — at 390 and 1440, three themes, axe-clean. Fictional records; every /api call answers 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
for (const theme of THEMES) test(`${theme}: Tasks and Journal steps, then the intention as a task for Monday`, async ({page, isMobile}) => {
  test.setTimeout(90_000);
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-29T18:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  const task = (id: string, title: string, doneAt?: string) => ({id, title, priority: 'normal', createdAt: '2026-11-24T08:00:00.000Z', updatedAt: '2026-11-24T08:00:00.000Z', ...(doneAt ? {doneAt} : {})});
  await page.evaluate(([tk, tv, jk, jv]) => { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); localStorage.setItem(tk, tv); localStorage.setItem(jk, jv); }, [TASKS_KEY, JSON.stringify({version: 1, tasks: [task('task_a', 'Fictional call', '2026-11-25T10:00:00.000Z'), task('task_b', 'Fictional letter')]}), JOURNAL_KEY, JSON.stringify({version: 1, shareWithAi: false, followUps: true, entries: [{id: 'j1', date: '2026-11-26', text: 'A fictional calm evening with tea', createdAt: '2026-11-26T20:00:00.000Z'}]})] as const);
  await page.goto('/app/review'); await settle(page);
  await page.getByRole('region', {name: 'A short look back at your week.'}).getByRole('button', {name: 'Start review', exact: true}).click();
  const dialog = page.getByRole('dialog', {name: 'Your week'}), next = dialog.getByRole('button', {name: 'Next', exact: true}), heading = dialog.getByRole('heading', {level: 3});
  const seen: string[] = [];
  for (let i = 0; i < 10; i++) {
    const title = (await heading.textContent())!; seen.push(title);
    if (title === 'Tasks') await expect(dialog).toContainText('1 task finished this week (0 the week before) · 2 added');
    if (title === 'Journal') { await expect(dialog).toContainText('1 journal entry this week · 6 words.'); await expect(dialog).not.toContainText('calm evening'); await expect(dialog.getByLabel('Your words, if you like')).toHaveCount(0); }
    if (title === 'One intention') break;
    await next.click(); await expect(heading).not.toHaveText(title);
  }
  expect(seen).toEqual(expect.arrayContaining(['Tasks', 'Journal', 'One intention']));
  await dialog.getByLabel('Your words, if you like').fill('Fictional walk with a friend');
  await dialog.getByRole('checkbox', {name: /^Also add it to Tasks for Monday/}).check();
  const findings = await axe(page, dialog);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await dialog.getByRole('button', {name: 'Finish review', exact: true}).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(() => page.evaluate(k => (JSON.parse(localStorage.getItem(k) ?? '{"tasks":[]}').tasks as {title: string; due?: string}[]).map(t => [t.title, t.due ?? null]), TASKS_KEY)).toContainEqual(['Fictional walk with a friend', '2026-11-30']);
});
