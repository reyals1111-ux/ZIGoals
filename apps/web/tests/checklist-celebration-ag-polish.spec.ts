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
 * or an Undo and the same tick again, never replays it; the menu's "Replay today's celebration" does. Part 6b: the rebuilt
 * moment — the day's planets and an orb per item in a ring, ZIGi's celebrate clip, the real count, streak and Continue.
 */
const party = (page: Page) => page.getByRole('dialog', {name: /planets? lit!$/});
const twoCustoms = () => { let r = emptyChecklist(); r = addCustom(r, {label: 'Fictional first star', colour: 'cyan', section: 'morning'}, {id: 'ck_c-1', at: new Date(Date.now() - 2 * 86_400_000)}); return addCustom(r, {label: 'Fictional last star', colour: 'purple', section: 'evening'}, {id: 'ck_c-2', at: new Date(Date.now() - 86_400_000)}); };
async function open(page: Page, path = twoCustoms(), extra: Record<string, string> = {}) {
  await seedChecklist(page, {path, extra});
  await page.goto('/app/checklist'); await settled(page);
  await expect(page.locator('dialog.checklist-overlay')).toHaveAttribute('data-loaded');
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
  await expect(dialog).toHaveAccessibleDescription('Every planet today, in path order — a Perfect orbit!');
  expect(await dialog.evaluate(d => d.matches(':modal'))).toBe(true);
  await expect(dialog.getByRole('button', {name: 'Continue'})).toBeFocused();
  // The ring: the day's planets (two orbits) and an orb for each item done; the streak; the last tick's Undo in reach.
  await expect(dialog.locator('.checklist-celebration-planet .orbit-planet')).toHaveCount(2);
  await expect(dialog.locator('.checklist-celebration-orb')).toHaveCount(2);
  await expect(dialog.locator('.checklist-celebration-streak')).toContainText('1 day streak');
  await expect(dialog.locator('.aa-toast').getByRole('button', {name: 'Undo', exact: true})).toBeVisible();
  expect(await celebratedOn(page)).toBe(await browserToday(page));
  await page.keyboard.press('Escape');
  await expect(party(page)).toHaveCount(0);
  await expect(page.locator('dialog.checklist-overlay')).toBeVisible();
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
  await party(page).getByRole('button', {name: 'Continue'}).click();
  await expect(party(page)).toHaveCount(0);
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
  await expect(party(page)).toHaveAccessibleDescription('Every planet today, in your own order.');
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
  await party(page).getByRole('button', {name: 'Continue'}).click();
  await page.goto('/app'); await settled(page);
  await page.goto('/app/checklist'); await settled(page);
  await expect(page.locator('dialog.checklist-overlay')).toHaveAttribute('data-loaded');
  await page.waitForTimeout(1200);
  await expect(party(page)).toHaveCount(0);
});

test('reduced motion: the final composition at once, still; ZIGi\'s cheer is the celebrate pose', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await open(page);
  await page.getByRole('button', {name: 'Fictional first star: not done yet', exact: true}).click();
  await page.getByRole('button', {name: 'Fictional last star: not done yet', exact: true}).click();
  const dialog = party(page);
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(d => d.getAnimations({subtree: true}).filter(a => a.playState === 'running').length)).toBe(0);
  await expect(dialog.locator('.checklist-celebration-zigi img').last()).toHaveAttribute('src', /F009-celebrate/);
  const ring = await dialog.locator('[data-slot]').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return {x: r.left + r.width / 2, y: r.top + r.height / 2}; }));
  expect(new Set(ring.map(p => `${Math.round(p.x / 4)},${Math.round(p.y / 4)}`)).size, 'the bodies stand in a ring, not on one spot').toBe(ring.length);
  expect(Math.max(...ring.map(p => p.x)) - Math.min(...ring.map(p => p.x)), 'a ring wider than it is deep').toBeGreaterThan(Math.max(...ring.map(p => p.y)) - Math.min(...ring.map(p => p.y)));
});

test('themes (owner amendment 4): the celebration stands on each theme\'s own sky, with the same hues, planets and bodies', async ({page}) => {
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
        orbs: css('.checklist-celebration-orb', ['background-image', 'box-shadow']),
        planets: [...d.querySelectorAll('.checklist-celebration-planet .orbit-planet')].map(p => p.getAttribute('data-planet')),
        planetPaint: css('.checklist-celebration-planet .orbit-planet, .checklist-celebration-planet .orbit-planet-glow', ['filter', 'background-image']),
        ring: css('.checklist-celebration-ring ellipse', ['stroke']),
        lit: css('.checklist-celebration-lit', ['background-image']),
        go: css('.checklist-celebration-go', ['background-image', 'color']),
        sky: !!d.querySelector('.checklist-celebration-sky .checklist-sky'),
        ground: getComputedStyle(d).backgroundColor,
      };
    });
  }
  const {ground: g0, ...nebula} = paints.nebula as Record<string, unknown>;
  for (const theme of ['light', 'dark']) {
    const {ground, ...rest} = paints[theme] as Record<string, unknown>;
    expect(rest, `${theme}: the same hues, planets and bodies as Nebula`).toEqual(nebula);
    expect(ground, `${theme}: its own ground`).not.toBe(g0);
  }
  expect((paints.nebula as {sky: boolean}).sky).toBe(true);
});
