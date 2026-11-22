import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {NOTES_KEY} from '../lib/notes/schema';

/**
 * Session AV lane 2 (r5-notes; LEDGER #365, Logseq's flashcards): Notes → Notes → Review cards. "question :: answer"
 * lines and #card lines are cards; one at a time, Show the answer, then Again, Hard, Good or Easy (each saying when it
 * comes back); the review days are kept on this device; a locked note's card never shows. Keyboard only, Nebula, Light
 * and Dark, axe-clean, no sideways scroll at 320.
 */
test.use({timezoneId: 'UTC'});
const NOTES = {version: 1, voice: false, notes: [
  {id: 'n-a', kind: 'topic', title: 'Fictional Spanish', body: '- hola :: hello\n- gracias :: thank you', createdAt: '2026-11-01T09:00:00.000Z'},
  {id: 'n-l', kind: 'topic', title: 'Fictional private', body: 'secret question :: secret answer', locked: true, createdAt: '2026-11-02T09:00:00.000Z'}]};
const cards = (page: import('@playwright/test').Page) => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:note-cards:v1') ?? '{"reviews":[]}'));
for (const theme of THEMES) test(`${theme}: review cards from notes`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [NOTES_KEY, JSON.stringify(NOTES)] as const);
  await page.goto('/app/notes?view=notes'); await hydrated(page);
  const fold = page.locator('details.note-cards-fold');
  await fold.locator('summary').click();
  await expect(fold).toContainText('2 cards to look at today');
  await fold.getByRole('button', {name: 'Review cards'}).click();
  const card = fold.getByRole('region', {name: 'Card 1 of 2'});
  await expect(card.locator('.note-card-question')).toHaveText('Question: hola');
  await expect(card).not.toContainText('hello');
  await card.getByRole('button', {name: 'Show the answer'}).press('Enter');
  await expect(card.locator('.note-card-answer')).toHaveText('Answer: hello');
  const findings = await axe(page, fold);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await card.getByRole('group', {name: 'How well did you know it?'}).getByRole('button', {name: /^Good · tomorrow/}).click();
  await expect(fold.getByRole('status')).toHaveText('Good: this card comes back tomorrow.');
  const second = fold.getByRole('region', {name: 'Card 2 of 2'});
  await expect(second.locator('.note-card-question')).toHaveText('Question: gracias');
  await second.getByRole('button', {name: 'Show the answer'}).click();
  await second.getByRole('button', {name: /^Easy · in 4 days/}).click();
  await expect(fold).toContainText('That is all for today. The next cards come back Nov 23, 2026.');
  await expect(fold).not.toContainText('secret');
  await expect.poll(async () => (await cards(page)).reviews.map((r: {due: string}) => r.due).sort()).toEqual(['2026-11-23', '2026-11-26']);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
