import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {NOTES_KEY} from '../lib/notes/schema';

/**
 * Session AV lane 2 (review B3C-12): Notes → Notes shows the Open tick boxes count on the closed fold; what the fold holds
 * is loaded only when it opens. Fictional data; the API offline.
 */
test.use({timezoneId: 'UTC'});
const NOTES = {version: 1, voice: false, notes: [
  {id: 'n-a', kind: 'topic', title: 'Fictional trip', body: '- [ ] pack a fictional charger\n- [x] book it', createdAt: '2026-11-01T09:00:00.000Z', updatedAt: '2026-11-20T09:00:00.000Z'}]};
test('Open tick boxes: the count while closed, the list only once opened', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [NOTES_KEY, JSON.stringify(NOTES)] as const);
  await page.goto('/app/notes?view=notes'); await hydrated(page);
  const fold = page.locator('details.note-ticks-fold');
  await expect(fold.locator('summary')).toContainText('1 across your notes');
  await expect(fold.locator('.notes-ticks')).toHaveCount(0);
  await fold.locator('summary').click();
  await expect(fold.getByRole('checkbox', {name: 'pack a fictional charger'})).toBeVisible();
  // Typing in the notes search leaves the count as it is.
  await page.locator('label.field', {hasText: /^Search$/}).locator('input[type="search"]').fill('fictional');
  await expect(fold.locator('summary')).toContainText('1 across your notes');
});
