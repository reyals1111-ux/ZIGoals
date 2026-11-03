import {expect, test} from '@playwright/test';
import {hydrated, offlineApis, seedRecords} from './journeys/journey-helpers';
import {loadShowcase} from './wiring-helpers';

/**
 * Owner follow-up 2 (BUILD list 2 #21): "Was this useful?" under ZIGi's note on the Review page. A quiet week offers no
 * question; with the Showcase's records the note leads with one kind of line; "Not for me" says what changes, Undo takes
 * it back, and after a reload that kind of line is gone from the note. Fictional data; every /api route answers 503.
 */
test.use({timezoneId: 'UTC'});
const KINDS: [RegExp, string][] = [[/^Seen together, not a cause/, 'Seen together'], [/^Your longest running streak/, 'Your longest running streak'], [/beside .+ the week before\.$/, 'the week before']];

test('a fresh start asks nothing under a quiet note', async ({page}) => {
  await offlineApis(page);
  await seedRecords(page, {});
  await page.goto('/app/review'); await hydrated(page);
  await expect(page.getByRole('group', {name: 'ZIGi’s note on your week'})).toContainText('A quiet week in your records.');
  await expect(page.getByRole('group', {name: 'Was this note useful?'})).toHaveCount(0);
});

test('Showcase: "Not for me" leaves the leading kind of line out of later notes; Undo takes the tap back', async ({page}) => {
  await offlineApis(page);
  await loadShowcase(page);
  await page.goto('/app/review'); await hydrated(page);
  const note = page.getByRole('group', {name: 'ZIGi’s note on your week'}), ask = page.getByRole('group', {name: 'Was this note useful?'});
  await expect(ask).toBeVisible();
  const lines = (await note.getByRole('listitem').allTextContents()).map(l => l.trim());
  const kind = KINDS.find(([re]) => re.test(lines.at(-1)!));
  expect(kind, `a leading line of a known kind: ${lines.at(-1)}`).toBeTruthy();
  for (const name of ['Useful', 'Not for me']) expect((await ask.getByRole('button', {name, exact: true}).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  // Undo first: the tap is taken back and nothing changes later.
  await ask.getByRole('button', {name: 'Not for me', exact: true}).click();
  await expect(ask.getByRole('status')).toContainText('Noted on this device: later notes leave out');
  await ask.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect(ask.getByRole('button', {name: 'Not for me', exact: true})).toBeVisible();
  await page.reload(); await hydrated(page);
  await expect(note).toContainText(kind![1]);
  // Then for real: this visit's note stays as it was; the next one leaves the kind out.
  await ask.getByRole('button', {name: 'Not for me', exact: true}).click();
  await expect(note).toContainText(kind![1]);
  await page.reload(); await hydrated(page);
  await expect(note.getByRole('listitem').first()).toBeVisible();
  await expect(note).not.toContainText(kind![1]);
});
