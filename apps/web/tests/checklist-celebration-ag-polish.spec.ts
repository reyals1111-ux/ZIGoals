import {expect, test, type Page} from '@playwright/test';
import {UI_PREFS_KEY} from '../lib/ab-design-keys';
import {CHECKLIST_DAYS_KEY} from '../lib/af-checklist-keys';
import {addCustom, addFavourite} from '../lib/checklist/store';
import {emptyChecklist} from '../lib/checklist/schema';
import {ID, TITLE, browserToday, seedChecklist, settled, stored} from './checklist-fixtures';

/**
 * Session AG Polish (ADR-030 J5; owner Part 6a): the day's celebration always plays once the day is complete, by any route
 * — a tap, the value stepper, the List view, or a day finished elsewhere (a habit's page, ZIGi's card writing the day) and
 * the Checklist opened afterwards — once per day on this device (`checklist.celebratedOn` in the UI preferences): a reload,
 * or an Undo and the same tick again, never replays it; the menu's "Replay today's celebration" does. Session AG Polish 2
 * (ADR-031 K13; owner Part 7): the moment is the owner's video with our real count, streak and Continue; no Undo while open.
 */
const party = (page: Page) => page.getByRole('dialog', {name: /planets? lit!$/});
const twoCustoms = () => { let r = emptyChecklist(); r = addCustom(r, {label: 'Fictional first star', colour: 'cyan', section: 'morning'}, {id: 'ck_c-1', at: new Date(Date.now() - 2 * 86_400_000)}); return addCustom(r, {label: 'Fictional last star', colour: 'purple', section: 'evening'}, {id: 'ck_c-2', at: new Date(Date.now() - 86_400_000)}); };
async function open(page: Page, path = twoCustoms(), extra: Record<string, string> = {}) {
  await seedChecklist(page, {path, extra});
  await page.goto('/app/checklist'); await settled(page);
  await expect(page.locator('dialog.checklist-overlay')).toHaveAttribute('data-loaded');
}
/** Continue: a first tap before the words skips to the last frame with the words (Session AG Polish 2, owner Part 7); then it closes. */
async function finish(page: Page) {
  const go = party(page).getByRole('button', {name: 'Continue'});
  await go.click();
  if (await party(page).count()) { await expect(party(page)).toHaveAttribute('data-words', ''); await go.click(); }
  await expect(party(page)).toHaveCount(0);
}
const celebratedOn = async (page: Page) => (await stored<{checklist?: {celebratedOn?: string}}>(page, UI_PREFS_KEY))?.checklist?.celebratedOn ?? null;

test('a tap on the last item plays it; Continue closes it and focus returns to the path; a reload, Undo and the same tick never replay it; the menu replays it', async ({page}) => {
  await open(page);
  await page.getByRole('button', {name: 'Fictional first star: not done yet', exact: true}).click();
  await expect(party(page)).toHaveCount(0);
  await page.getByRole('button', {name: 'Fictional last star: not done yet', exact: true}).click();
  const dialog = party(page);
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleName('All 2 planets lit!');
  // (Ticked in path order: a Perfect orbit.)
  await expect(dialog).toHaveAccessibleDescription('Every planet today, in path order — a Perfect orbit! 1 day streak');
  expect(await dialog.evaluate(d => d.matches(':modal'))).toBe(true);
  await expect(dialog.getByRole('button', {name: 'Continue'})).toBeFocused();
  // Session AG Polish 2 (owner Part 7), moved: the owner's video (or its last frame) with the real streak — and no Undo while
  // it is open (the last tick's toast waits, and comes back after it closes).
  await expect(dialog).toHaveAttribute('data-media', /^(video|still)$/);
  await expect(dialog.locator('.checklist-celebration-streak')).toContainText('1 day streak');
  await expect(page.locator('.aa-toast')).toHaveCount(0);
  expect(await celebratedOn(page)).toBe(await browserToday(page));
  await page.keyboard.press('Escape');
  await expect(party(page)).toHaveCount(0);
  await expect(page.locator('dialog.checklist-overlay')).toBeVisible();
  await expect(page.locator('.aa-toast').getByRole('button', {name: 'Undo', exact: true}), 'the toast is back after it closes').toBeVisible();
  expect(await page.evaluate(() => !!document.activeElement?.closest('dialog.checklist-overlay'))).toBe(true);
  // A reload: once a day.
  await page.reload(); await settled(page);
  await expect(page.locator('dialog.checklist-overlay')).toHaveAttribute('data-loaded');
  await page.waitForTimeout(1200);
  await expect(party(page)).toHaveCount(0);
  // Taken back and lit again the same day: still once.
  await page.getByRole('button', {name: 'Fictional last star: done', exact: true}).click();
  await page.getByRole('button', {name: 'Fictional last star: not done yet', exact: true}).click();
  await page.waitForTimeout(1200);
  await expect(party(page)).toHaveCount(0);
  // The menu's replay, while the day is complete.
  await page.getByRole('button', {name: 'Checklist menu'}).click();
  await page.getByRole('button', {name: 'Replay today’s celebration'}).click();
  await expect(party(page)).toBeVisible();
  await finish(page);
});

test('the value stepper completing the day plays it', async ({page}) => {
  let r = emptyChecklist(); r = addFavourite(r, {kind: 'habit', habitId: ID.push}, {id: 'ck_s-1', at: new Date(Date.now() - 86_400_000), section: 'afternoon'});
  await open(page, r);
  await page.getByRole('button', {name: `${TITLE.push}: not done yet`, exact: true}).click();
  const form = page.getByRole('form', {name: `Log ${TITLE.push}`});
  await form.getByRole('textbox').or(form.getByRole('spinbutton')).first().fill('20');
  await form.getByRole('button', {name: /^Log 20/}).click();
  await expect(party(page)).toBeVisible();
  await expect(party(page)).toHaveAccessibleName('All 1 planet lit!');
});

test('the List view completing the day plays it (out of path order: "in your own order")', async ({page}) => {
  await open(page, twoCustoms(), {[UI_PREFS_KEY]: JSON.stringify({version: 1, checklist: {view: 'list'}})});
  for (const name of ['Fictional last star', 'Fictional first star']) await page.getByRole('button', {name: new RegExp(`^${name}.*not done yet`)}).first().click();
  await expect(party(page)).toBeVisible();
  await expect(party(page)).toHaveAccessibleDescription('Every planet today, in your own order. 1 day streak');
});

test('a day finished elsewhere (a habit\'s page, ZIGi\'s card) plays it the next time the Checklist opens that day — once', async ({page}) => {
  // ZIGi's card ticks a custom item straight into the day record while the Checklist is closed; a habit is done on its page.
  let r = emptyChecklist(); r = addFavourite(r, {kind: 'habit', habitId: ID.stretch}, {id: 'ck_e-1', at: new Date(Date.now() - 2 * 86_400_000), section: 'morning'});
  r = addCustom(r, {label: 'Fictional card star', colour: 'teal', section: 'evening'}, {id: 'ck_e-2', at: new Date(Date.now() - 86_400_000)});
  await seedChecklist(page, {path: r});
  const today = await browserToday(page);
  await page.evaluate(([key, date]) => localStorage.setItem(key!, JSON.stringify({version: 1, days: {}, today: {date, ticks: [], custom: ['ck_e-2'], nudged: []}})), [CHECKLIST_DAYS_KEY, today]);
  await page.goto('/app/habits'); await settled(page);
  await page.getByRole('button', {name: new RegExp(`^Complete ${TITLE.stretch}`)}).first().click();
  await page.goto('/app/checklist'); await settled(page);
  await expect(party(page)).toBeVisible();
  await finish(page);
  await page.goto('/app'); await settled(page);
  await page.goto('/app/checklist'); await settled(page);
  await expect(page.locator('dialog.checklist-overlay')).toHaveAttribute('data-loaded');
  await page.waitForTimeout(1200);
  await expect(party(page)).toHaveCount(0);
});

test('reduced motion: the last frame and the words at once, still — no video, nothing fetched', async ({page}) => {
  // Session AG Polish 2 (owner Part 7), moved at equal strength: the final composition is the clip's last frame with our words.
  await page.emulateMedia({reducedMotion: 'reduce'});
  const clips: string[] = [];
  page.on('request', r => { if (/\.(webm|mp4)(\?|$)/.test(r.url())) clips.push(r.url()); });
  await open(page);
  await page.getByRole('button', {name: 'Fictional first star: not done yet', exact: true}).click();
  await page.getByRole('button', {name: 'Fictional last star: not done yet', exact: true}).click();
  const dialog = party(page);
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('data-media', 'still');
  await expect(dialog).toHaveAttribute('data-words', '');
  expect(await dialog.evaluate(d => d.getAnimations({subtree: true}).filter(a => a.playState === 'running').length)).toBe(0);
  await expect(dialog.locator('video')).toHaveCount(0);
  await expect(dialog.locator('.checklist-celebration-still')).toHaveAttribute('src', /13-celebration-last-frame\.webp$/);
  expect(await dialog.locator('.checklist-celebration-still').evaluate(i => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0)).toBe(true);
  expect(clips, 'no clip fetched').toEqual([]);
  await expect(dialog.getByRole('button', {name: 'Continue'})).toBeVisible();
});

test('themes: the celebration is media and our words on its own gradient — the same in Nebula, Light and Dark', async ({page}) => {
  // Session AG Polish 2 (ADR-031 K13; owner non-negotiable 5: "the celebration video is media and looks the same in every
  // theme"), moved from AG Polish's amendment 4 (each theme's own sky): every paint, the ground included, is the same.
  test.setTimeout(120_000);
  await page.emulateMedia({reducedMotion: 'reduce'});
  const paints: Record<string, unknown> = {};
  for (const theme of ['nebula', 'light', 'dark'] as const) {
    await open(page, twoCustoms(), {[UI_PREFS_KEY]: JSON.stringify({version: 1, ...(theme === 'nebula' ? {} : {theme})})});
    if (theme !== 'nebula') await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await page.getByRole('button', {name: 'Fictional first star: not done yet', exact: true}).click();
    await page.getByRole('button', {name: 'Fictional last star: not done yet', exact: true}).click();
    const dialog = party(page);
    await expect(dialog).toBeVisible();
    paints[theme] = await dialog.evaluate(d => {
      const css = (sel: string, props: string[]) => [...d.querySelectorAll(sel)].map(el => { const s = getComputedStyle(el); return props.map(p => s.getPropertyValue(p)).join(' | '); });
      return {
        title: css('.checklist-celebration-title', ['color', 'text-shadow']), lit: css('.checklist-celebration-lit', ['background-image']), line: css('.checklist-celebration-line', ['color']),
        streak: css('.checklist-celebration-streak', ['color', 'background-image', 'border-top-color']), go: css('.checklist-celebration-go', ['background-image', 'color']),
        words: css('.checklist-celebration-words', ['background-image']), still: d.querySelector('.checklist-celebration-still')?.getAttribute('src'), ground: getComputedStyle(d).backgroundColor,
      };
    });
  }
  expect(paints.light, 'Light: the same as Nebula').toEqual(paints.nebula);
  expect(paints.dark, 'Dark: the same as Nebula').toEqual(paints.nebula);
});
