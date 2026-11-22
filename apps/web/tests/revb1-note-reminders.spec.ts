import {expect, test} from '@playwright/test';
import {offline, settle} from './p6-helpers';

/**
 * Session AV lane 2 (review b1 #1, Blocker): "@remind tomorrow 9:30 …" written on Monday is still Tuesday 09:30 when the
 * app is opened again on Tuesday morning (it used to slide to Wednesday, every day, and never go off). Fictional data.
 */
test.use({timezoneId: 'Europe/Amsterdam'});

test('a note reminder keeps its day when the app is opened the next morning', async ({page}) => {
  await offline(page);
  await page.clock.install({time: new Date('2026-11-23T10:00:00+01:00')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(() => localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})));
  await page.goto('/app/notes?view=notes'); await settle(page);
  await page.getByRole('textbox', {name: 'New note'}).fill('Fictional house');
  await page.getByRole('button', {name: 'Make note'}).click();
  await page.getByRole('textbox', {name: 'Note'}).fill('Boiler\n@remind tomorrow 9:30 call the fictional plumber');
  await page.getByRole('button', {name: 'Save'}).click();
  await expect(page.getByRole('list', {name: 'Reminders in this note'})).toContainText('Reminder · Tue, Nov 24, 9:30 AM · call the fictional plumber');
  const id = await page.evaluate(() => (JSON.parse(localStorage.getItem('zigoals:notes:v1') ?? '{"notes":[]}').notes as {id: string; title: string}[]).find(n => n.title === 'Fictional house')!.id);
  // The next morning, before it is due.
  await page.clock.setSystemTime(new Date('2026-11-24T08:00:00+01:00'));
  await page.goto(`/app/notes?note=${encodeURIComponent(id)}`); await settle(page);
  await expect(page.getByRole('list', {name: 'Reminders in this note'})).toContainText('Reminder · Today, 9:30 AM · call the fictional plumber');
  await page.goto('/app/notes?view=notes'); await settle(page);
  const panel = page.locator('.note-reminders-panel');
  await panel.locator('summary').click();
  await expect(panel.getByRole('list', {name: 'Reminders in your notes'})).toContainText('Today, 9:30 AM · call the fictional plumber');
  await expect(panel).not.toContainText('Nov 25');
});
