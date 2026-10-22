import {expect, test, type Page} from '@playwright/test';
import {addCustom} from '../lib/checklist/store';
import {emptyChecklist} from '../lib/checklist/schema';
import {CELEBRATION_CLIP} from '../lib/checklist/celebration-clip';
import {seedChecklist, settled} from './checklist-fixtures';

/**
 * Session AG Polish 2 (ADR-031 K13; owner Part 7): the day's celebration plays the owner's video. Muted, inline, WebM then
 * MP4, the first frame as poster; never in the first load (fetched once the day is one item away, or at the moment);
 * our real words over its lower part from about 7.3 s; a tap or Space skips to the last frame with the words; not ready
 * within 1.5 s → the still at once, never a late start; Save-Data → the still; the menu's replay plays it again.
 */
const party = (page: Page) => page.getByRole('dialog', {name: /planets? lit!$/});
const three = () => { let r = emptyChecklist(); for (const [i, [label, section]] of ([['Fictional one', 'morning'], ['Fictional two', 'evening'], ['Fictional three', 'evening']] as const).entries()) r = addCustom(r, {label, colour: 'cyan', section}, {id: `ck_v-${i}`, at: new Date(Date.UTC(2026, 0, 1, 0, 0, i))}); return r; };
const clipRequests = (page: Page) => { const seen: string[] = []; page.on('request', r => { if (/\.(webm|mp4)(\?|$)/.test(r.url())) seen.push(r.url()); }); return seen; };
async function open(page: Page) {
  await seedChecklist(page, {path: three()});
  await page.goto('/app/checklist'); await settled(page);
  await expect(page.locator('dialog.checklist-overlay')).toHaveAttribute('data-loaded');
}
const tick = (page: Page, name: string) => page.getByRole('button', {name: `${name}: not done yet`, exact: true}).click();

test('never in the first load: the clip is fetched once the day is one item away; then it plays, muted and inline, and our words come at ~7.3 s', async ({page}) => {
  test.setTimeout(60_000);
  const clips = clipRequests(page);
  await open(page);
  await tick(page, 'Fictional one');
  await page.waitForTimeout(800);
  expect(clips, 'two items left: nothing fetched').toEqual([]);
  await tick(page, 'Fictional two');
  await expect.poll(() => clips.length, {message: 'one item away: the clip starts loading'}).toBeGreaterThan(0);
  expect(clips[0]).toContain('/art/checklist/celebration/13-celebration-clean.');
  await tick(page, 'Fictional three');
  const dialog = party(page);
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleName('All 3 planets lit!');
  await expect(dialog).toHaveAttribute('data-media', 'video');
  const video = dialog.locator('video');
  expect(await video.evaluate(v => { const e = v as HTMLVideoElement; return {muted: e.muted, inline: e.playsInline, hidden: e.getAttribute('aria-hidden'), controls: e.controls, poster: e.getAttribute('poster'), sources: [...e.querySelectorAll('source')].map(s => s.getAttribute('type')!.split(';')[0])}; })).toEqual({muted: true, inline: true, hidden: 'true', controls: false, poster: CELEBRATION_CLIP.poster, sources: ['video/webm', 'video/mp4']});
  // It plays (CI's Chrome; this sandbox's Chromium plays the WebM too), our words still hidden.
  await expect(dialog).toHaveAttribute('data-phase', 'playing', {timeout: 3000});
  await expect(dialog).not.toHaveAttribute('data-words', '');
  // The words fade in near the end and it rests on its last frame.
  await expect(dialog).toHaveAttribute('data-words', '', {timeout: 10_000});
  expect(await video.evaluate(v => (v as HTMLVideoElement).currentTime), 'the words come at about 7.3 s').toBeGreaterThanOrEqual(CELEBRATION_CLIP.uiAt - .4);
  await expect(dialog).toHaveAttribute('data-phase', 'rest', {timeout: 3000});
  await expect(dialog.locator('.checklist-celebration-streak')).toContainText('1 day streak');
  await dialog.getByRole('button', {name: 'Continue'}).click();
  await expect(party(page)).toHaveCount(0);
});

test('a tap anywhere, or Space, skips to the last frame with the words; Escape closes; the replay plays it again', async ({page}) => {
  test.setTimeout(60_000);
  await open(page);
  for (const n of ['Fictional one', 'Fictional two', 'Fictional three']) await tick(page, n);
  const dialog = party(page);
  await expect(dialog).toHaveAttribute('data-phase', /loading|playing/);
  await page.mouse.click(40, 200);
  await expect(dialog).toHaveAttribute('data-words', '');
  await expect(dialog).toHaveAttribute('data-phase', 'rest');
  expect(await dialog.locator('video').evaluate(v => (v as HTMLVideoElement).paused).catch(() => true), 'the clip stops').toBe(true);
  await page.keyboard.press('Escape');
  await expect(party(page)).toHaveCount(0);
  // The replay: the clip again; Space skips.
  await page.getByRole('button', {name: 'Checklist menu'}).click();
  await page.getByRole('button', {name: 'Replay today’s celebration'}).click();
  await expect(party(page)).toHaveAttribute('data-media', 'video');
  await expect(party(page)).not.toHaveAttribute('data-words', '');
  await page.keyboard.press('Space');
  await expect(party(page)).toHaveAttribute('data-words', '');
  await expect(party(page)).toBeVisible();
  await party(page).getByRole('button', {name: 'Continue'}).click();
  await expect(party(page)).toHaveCount(0);
});

test('not ready within 1.5 s: the last frame and the words at once, and the clip never starts late', async ({page}) => {
  test.setTimeout(60_000);
  await page.route(/\.(webm|mp4)(\?|$)/, () => undefined);
  await open(page);
  for (const n of ['Fictional one', 'Fictional two', 'Fictional three']) await tick(page, n);
  const dialog = party(page);
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('data-phase', 'rest', {timeout: 2500});
  await expect(dialog).toHaveAttribute('data-words', '');
  await page.waitForTimeout(1500);
  await expect(dialog).toHaveAttribute('data-phase', 'rest');
  await dialog.getByRole('button', {name: 'Continue'}).click();
  await expect(party(page)).toHaveCount(0);
});

// (Owner amendment 2, found by CI's WebKit job on c5014b60: a clip that started and then never moved held the moment.)
test('a clip that starts but stops moving: its last frame and the words within 1.5 s; Continue closes it', async ({page}) => {
  test.setTimeout(60_000);
  // play() resolves, but the clip never moves (a stalled decoder): its time stays where it was.
  await page.addInitScript(() => { HTMLMediaElement.prototype.play = function () { return Promise.resolve(); }; });
  await open(page);
  for (const n of ['Fictional one', 'Fictional two', 'Fictional three']) await tick(page, n);
  const dialog = party(page);
  await expect(dialog).toHaveAttribute('data-phase', 'playing');
  await expect(dialog).not.toHaveAttribute('data-words', '');
  const t0 = Date.now();
  await expect(dialog).toHaveAttribute('data-phase', 'rest', {timeout: 3000});
  expect(Date.now() - t0, 'within about 1.5 s of standing still').toBeLessThan(2600);
  await expect(dialog).toHaveAttribute('data-words', '');
  await dialog.getByRole('button', {name: 'Continue'}).click();
  await expect(party(page)).toHaveCount(0);
});

test('Save-Data: the still with the words, no clip fetched', async ({page}) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'connection', {value: {saveData: true}, configurable: true}));
  const clips = clipRequests(page);
  await open(page);
  for (const n of ['Fictional one', 'Fictional two', 'Fictional three']) await tick(page, n);
  await expect(party(page)).toHaveAttribute('data-media', 'still');
  await expect(party(page)).toHaveAttribute('data-words', '');
  expect(clips).toEqual([]);
});
