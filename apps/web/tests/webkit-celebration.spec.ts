import {expect, test, type Page} from '@playwright/test';
import {addCustom} from '../lib/checklist/store';
import {emptyChecklist} from '../lib/checklist/schema';
import {seedChecklist, settled} from './checklist-fixtures';

/**
 * Session AG Polish 2 (ADR-031; owner amendment 2): the day's celebration on a phone in WebKit (evidence label: WebKit,
 * never "Safari on an iPhone"). Either the muted inline clip starts, or the still and the words show within 1.5 s; the
 * dialog never hangs on a clip that will not play, and Continue always closes it — the replay too.
 */
test.use({viewport: {width: 390, height: 844}});
const party = (page: Page) => page.getByRole('dialog', {name: /planets? lit!$/});
async function settledMoment(page: Page) {
  const dialog = party(page);
  await expect(dialog).toBeVisible();
  // Within 1.5 s (and a margin for the runner): playing, or resting on the still with the words.
  await expect.poll(async () => { const [phase, words] = await dialog.evaluate(d => [d.getAttribute('data-phase'), d.hasAttribute('data-words')]); return phase === 'playing' || (phase === 'rest' && words); }, {timeout: 2500}).toBe(true);
  // (CI on c5014b60: the clip played in WebKit, and Continue — not shown, and not pressable, until the words come — could
  // never be clicked. While it plays, a tap on the clip, as a person would tap, skips to its last frame with the words; a
  // clip that stops moving shows them by itself within 1.5 s. Either way the words come, and Continue closes it.)
  if (!await dialog.evaluate(d => d.hasAttribute('data-words'))) await dialog.click({position: {x: 40, y: 200}});
  await expect(dialog).toHaveAttribute('data-words', '', {timeout: 2500});
  await dialog.getByRole('button', {name: 'Continue'}).click();
  await expect(party(page)).toHaveCount(0);
}
test('the celebration on a phone in WebKit: it plays or shows the still at once, and Continue closes it — the replay too', async ({page, browserName}, info) => {
  test.skip(browserName !== 'webkit', 'The WebKit job; Chrome covers the celebration in its own specs.');
  test.skip(info.project.name !== 'mobile', 'A phone: the iPhone project only.');
  test.setTimeout(60_000);
  let r = emptyChecklist();
  r = addCustom(r, {label: 'Fictional first star', colour: 'cyan', section: 'morning'}, {id: 'ck_wk-1', at: new Date(Date.now() - 2 * 86_400_000)});
  r = addCustom(r, {label: 'Fictional last star', colour: 'purple', section: 'evening'}, {id: 'ck_wk-2', at: new Date(Date.now() - 86_400_000)});
  await seedChecklist(page, {path: r});
  await page.goto('/app/checklist'); await settled(page);
  await page.getByRole('button', {name: 'Fictional first star: not done yet', exact: true}).click();
  await page.getByRole('button', {name: 'Fictional last star: not done yet', exact: true}).click();
  await settledMoment(page);
  await page.getByRole('button', {name: 'Checklist menu'}).click();
  await page.getByRole('button', {name: 'Replay today’s celebration'}).click();
  await settledMoment(page);
  await expect(page.locator('dialog.checklist-overlay')).toBeVisible();
});
