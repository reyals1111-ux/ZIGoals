import {expect, test, type Page} from '@playwright/test';
import {CHECKLIST_DAYS_KEY} from '../lib/af-checklist-keys';
import {MOTION_PREFERENCE_KEY} from '../components/use-entrance';
import {addCustom} from '../lib/checklist/store';
import {emptyChecklist} from '../lib/checklist/schema';
import {TITLE, seedChecklist, settled, stored} from './checklist-fixtures';
import {navLink} from './phone-nav';

/**
 * Session AF (L3b; the owner's full-screen Checklist): the Checklist is a stand-alone layer over the whole app. Only the
 * Checklist is on screen — no sidebar, header, footer banner, tab bar or other launcher — as a modal dialog in the
 * browser's top layer, so everything behind it is inert and focus stays inside; X and Escape return to the page it was
 * opened from, or to Today when it was opened directly; the address stays /app/checklist. The path's planets are 72–88 px
 * on a computer and 64–76 px on a phone, each with one short caption and no paragraph on the path. A tick presses,
 * bursts and sends a comet along the line under normal motion and is a still under reduced motion and Motion Off. The
 * day's celebration plays once, on the last tick, never when a finished day is opened again.
 */
const overlay = (page: Page) => page.locator('dialog.checklist-overlay');
async function open(page: Page, path?: Parameters<typeof seedChecklist>[1]) {
  await seedChecklist(page, path);
  await page.goto('/app/checklist'); await settled(page);
  await expect(overlay(page)).toHaveAttribute('data-loaded');
}

test('only the Checklist on screen: a modal top layer over the whole app, the rest inert, focus kept inside', async ({page}) => {
  await open(page);
  await expect(page).toHaveURL(/\/app\/checklist$/);
  await expect(page).toHaveTitle('Checklist · ZIGoals Alpha');
  const facts = await overlay(page).evaluate(d => { const r = d.getBoundingClientRect(); return {modal: d.matches(':modal'), x: r.x, y: r.y, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight}; });
  expect(facts.modal, 'the Checklist is a modal dialog in the top layer').toBe(true);
  expect([facts.x, facts.y, Math.round(facts.w), Math.round(facts.h)]).toEqual([0, 0, facts.vw, facts.vh]);
  // Nothing of the shell shows: the sidebar, the phone's bars, the footer banner, the status row, the launchers.
  for (const selector of ['.app-sidebar', '.phone-topbar', '.phone-tabbar', '.site-footer', '.status-row', '.ai-launcher', '.music-launcher', '.checklist-launcher', '.earn-dock-button']) await expect(page.locator(selector).first(), selector).toBeHidden();
  // Whatever is drawn at any point of the screen belongs to the Checklist.
  const outside = await page.evaluate(() => { const hits: string[] = []; for (const fx of [.02, .25, .5, .75, .98]) for (const fy of [.02, .3, .6, .98]) { const el = document.elementFromPoint(innerWidth * fx, innerHeight * fy); if (el && !el.closest('.checklist-overlay')) hits.push(el.tagName + '.' + el.className); } return hits; });
  expect(outside, 'every point of the screen is the Checklist').toEqual([]);
  // Behind it everything is inert: no control outside the Checklist takes focus.
  const focusable = await page.evaluate(() => { const els = [...document.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex]')].filter(el => !el.closest('.checklist-overlay')); let took = 0; for (const el of els) { el.focus(); if (document.activeElement === el) took++; } return {outside: els.length, took}; });
  expect(focusable.outside, 'the shell is still there behind the Checklist').toBeGreaterThan(10);
  expect(focusable.took, 'no control behind the Checklist takes focus').toBe(0);
  // Tab moves through the Checklist only.
  await page.getByRole('button', {name: 'Close the Checklist'}).focus();
  const left: string[] = [];
  for (let i = 0; i < 40; i++) { await page.keyboard.press('Tab'); const where = await page.evaluate(() => { const a = document.activeElement; return !a || a === document.body ? 'body' : a.closest('.checklist-overlay') ? 'in' : `${a.tagName}.${a.className}`; }); if (where !== 'in' && where !== 'body') left.push(where); }
  expect(left, 'focus never leaves the Checklist').toEqual([]);
  // Nothing scrolls sideways, on the page or inside the Checklist.
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  expect(await overlay(page).evaluate(d => d.scrollWidth - d.clientWidth)).toBeLessThanOrEqual(0);
});

test('X and Escape return to the page it was opened from; opened directly, to Today', async ({page}) => {
  await open(page);
  // Opened directly (a shared address, the Home Screen shortcut): the close goes to Today.
  await page.getByRole('button', {name: 'Close the Checklist'}).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(overlay(page)).toHaveCount(0);
  // Opened from Habits through the navigation: Escape returns to Habits.
  await page.goto('/app/habits'); await settled(page);
  await (await navLink(page, 'Checklist')).click();
  await expect(overlay(page)).toHaveAttribute('data-loaded');
  await expect(page).toHaveURL(/\/app\/checklist$/);
  // Escape closes the innermost first: an open stepper, then the Checklist.
  await page.getByRole('button', {name: 'Water: not done yet', exact: true}).click();
  await expect(page.getByRole('form', {name: 'Log Water'})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('form', {name: 'Log Water'})).toHaveCount(0);
  await expect(page).toHaveURL(/\/app\/checklist$/);
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/app\/habits$/);
  await expect(overlay(page)).toHaveCount(0);
  // And X from a sheet's page: Edit path opens as a sheet, Escape closes it, X then returns.
  await (await navLink(page, 'Checklist')).click();
  await expect(overlay(page)).toHaveAttribute('data-loaded');
  await page.getByRole('button', {name: 'Checklist menu'}).click();
  await page.getByRole('button', {name: 'Edit path', exact: true}).click();
  await expect(page.getByRole('region', {name: 'Edit path'})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('region', {name: 'Edit path'})).toHaveCount(0);
  await page.getByRole('button', {name: 'Close the Checklist'}).click();
  await expect(page).toHaveURL(/\/app\/habits$/);
});

test('big planets (88–112 px on a computer, 64–84 px on a phone, the next one a size larger); one short name beside each, no paragraph on the path', async ({page}, info) => {
  await open(page);
  const range = info.project.name === 'mobile' ? [64, 84] : [88, 112];
  for (const size of info.project.name === 'mobile' ? [{width: 390, height: 844}] : [{width: 1440, height: 900}, {width: 1280, height: 720}]) {
    await page.setViewportSize(size); await page.waitForTimeout(300);
    const dots = await page.locator('button.path-dot').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return Math.round(Math.min(r.width, r.height)); }));
    expect(dots.length).toBe(4);
    for (const d of dots) { expect(d, `${size.width}px`).toBeGreaterThanOrEqual(range[0]!); expect(d, `${size.width}px`).toBeLessThanOrEqual(range[1]!); }
  }
  // One name per planet, beside it (no box), one line from a tablet up and two at most on a phone, 14 px or more; the next
  // planet's name is its START / NEXT bubble — round 3 (L3b), moved at equal strength: beside it, off the line, no longer
  // above it on the line's last stretch (where a comet arriving would be hidden).
  const names = await page.locator('.path-step .path-label').evaluateAll(els => els.map(e => { const cs = getComputedStyle(e), text = e.querySelector('.path-label-text')!, shown = [...e.children].filter(c => getComputedStyle(c).display !== 'none' && !c.classList.contains('path-label-cue')); const dot = e.parentElement!.querySelector('.path-dot')!.getBoundingClientRect(), r = e.getBoundingClientRect(); return {bubble: e.classList.contains('path-label-bubble'), parts: shown.length, lines: Math.round(text.getBoundingClientRect().height / parseFloat(getComputedStyle(text).lineHeight)), size: parseFloat(cs.fontSize), boxed: cs.backgroundColor !== 'rgba(0, 0, 0, 0)', beside: r.right <= dot.left + 1 || r.left >= dot.right - 1, above: r.bottom <= dot.top + 1}; }));
  expect(names.filter(n => n.bubble)).toHaveLength(1);
  for (const n of names) { expect(n.parts, 'one name, no second line of notes').toBe(1); expect(n.size).toBeGreaterThanOrEqual(14); }
  for (const n of names.filter(x => !x.bubble)) { expect(n.boxed, 'no box behind a name').toBe(false); expect(n.beside, 'beside its planet').toBe(true); expect(n.lines).toBeLessThanOrEqual(info.project.name === 'mobile' ? 2 : 1); }
  expect(names.find(n => n.bubble)!.beside, 'the next planet’s bubble beside it, off the line').toBe(true);
  expect(names.find(n => n.bubble)!.above, 'not over the line above it').toBe(false);
  // The path view carries no paragraph: its words are captions, banner titles and counts.
  expect(await page.locator('.checklist-stage p').count()).toBe(0);
  // The explanation lives behind the menu.
  await page.getByRole('button', {name: 'Checklist menu'}).click();
  await page.getByRole('button', {name: 'How it works', exact: true}).click();
  await expect(page.getByRole('region', {name: 'How it works'})).toContainText('Any order counts');
});

test('a tick: the press, a burst of sparks, a comet along the line, ZIGi’s cheer and the bar’s shine', async ({page}) => {
  await open(page);
  const dot = page.getByRole('button', {name: `${TITLE.stretch}: not done yet`, exact: true});
  await dot.click();
  const done = page.getByRole('button', {name: `${TITLE.stretch}: done`, exact: true});
  await expect(done).toHaveAttribute('data-just', '');
  await expect(done.locator('.path-dot-burst[data-rich] i')).toHaveCount(14);
  // Round 3 (L3b), moved at greater strength: the comet is a head with its tail, running on to the next planet; ZIGi's cheer is
  // its celebrate pose with hops and sparkles, beside the planet just ticked.
  await expect(page.locator('.path-comet .path-comet-head')).not.toHaveCount(0);
  await expect(page.locator('.path-comet .path-comet-tail')).not.toHaveCount(0);
  const cheer = page.locator('.path-zigi[data-cheer][data-zigi-state="celebrate"]');
  await expect(cheer).toHaveCount(1);
  await expect(cheer.locator('.path-zigi-cheer i')).not.toHaveCount(0);
  await expect(done.locator('xpath=ancestor::li[contains(@class, "path-step")]').locator('.path-zigi[data-cheer]')).toHaveCount(1);
  await expect(page.locator('.checklist-progress-shine')).toHaveCount(1);
  const moving = await overlay(page).evaluate(d => d.getAnimations({subtree: true}).filter(a => a.playState === 'running').length);
  expect(moving, 'the tick plays').toBeGreaterThan(5);
  // Then the burst is gone and the planet rests, done.
  await expect(done).not.toHaveAttribute('data-just', /.*/, {timeout: 3000});
  await expect(done.locator('.path-dot-burst')).toHaveCount(0);
});

for (const mode of ['reduced motion', 'Motion Off'] as const) {
  test(`${mode}: the Checklist is a still — the sky, the next planet and a tick do not move`, async ({page}) => {
    if (mode === 'reduced motion') await page.emulateMedia({reducedMotion: 'reduce'});
    await open(page, {extra: mode === 'Motion Off' ? {[MOTION_PREFERENCE_KEY]: 'off'} : {}});
    const still = () => overlay(page).evaluate(d => d.getAnimations({subtree: true}).filter(a => a.playState === 'running').map(a => ((a.effect as KeyframeEffect | null)?.target as Element | null)?.className.toString() ?? ''));
    expect(await still()).toEqual([]);
    await page.getByRole('button', {name: `${TITLE.stretch}: not done yet`, exact: true}).click();
    await expect(page.getByRole('button', {name: `${TITLE.stretch}: done`, exact: true})).toBeVisible();
    expect(await still()).toEqual([]);
    // Every end state is readable: the next planet's bubble and ring are there, at rest.
    await expect(page.locator('[data-next] .path-label-bubble')).toBeVisible();
    expect(await page.locator('.path-dot[data-next] .path-dot-pulse').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  });
}

test('the day’s celebration plays once, on the last tick; never when the finished day is opened again', async ({page}) => {
  let r = emptyChecklist();
  r = addCustom(r, {label: 'Fictional first star', colour: 'cyan', section: 'morning'}, {id: 'ck_fixture-a', at: new Date(Date.now() - 2 * 86_400_000)});
  r = addCustom(r, {label: 'Fictional last star', colour: 'gold', section: 'evening'}, {id: 'ck_fixture-b', at: new Date(Date.now() - 86_400_000)});
  await open(page, {path: r});
  await page.getByRole('button', {name: 'Fictional first star: not done yet', exact: true}).click();
  await expect(page.getByRole('dialog', {name: /lit!$/})).toHaveCount(0);
  await page.getByRole('button', {name: 'Fictional last star: not done yet', exact: true}).click();
  const party = page.getByRole('dialog', {name: 'All 2 planets lit!'});
  await expect(party).toBeVisible();
  await expect(party.getByRole('button', {name: 'Continue'})).toBeFocused();
  expect(await party.evaluate(d => d.matches(':modal'))).toBe(true);
  // The last tick's Undo stays in reach over the celebration.
  await expect(party.locator('.aa-toast').getByRole('button', {name: 'Undo', exact: true})).toBeVisible();
  await party.getByRole('button', {name: 'Continue'}).click();
  await expect(party).toHaveCount(0);
  await expect(overlay(page)).toBeVisible();
  // The day record says the day is complete; reopening it never celebrates again.
  await expect.poll(async () => (await stored<{today: {custom: string[]}}>(page, CHECKLIST_DAYS_KEY))?.today.custom.length).toBe(2);
  await page.reload(); await settled(page);
  await expect(overlay(page)).toHaveAttribute('data-loaded');
  await page.waitForTimeout(1200);
  await expect(page.getByRole('dialog', {name: /lit!$/})).toHaveCount(0);
  // Taken back and lit again the same day: still once.
  await page.getByRole('button', {name: 'Fictional last star: done', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Fictional last star: not done yet', exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Fictional last star: not done yet', exact: true}).click();
  await page.waitForTimeout(1200);
  await expect(page.getByRole('dialog', {name: /lit!$/})).toHaveCount(0);
});

/** A longer fictional day: eight custom items across the three orbits. */
function longDay() {
  let r = emptyChecklist(); const sections = ['morning', 'morning', 'morning', 'afternoon', 'afternoon', 'evening', 'evening', 'evening'];
  sections.forEach((section, i) => { r = addCustom(r, {label: `Fictional star ${i + 1}`, colour: ['cyan', 'pink', 'gold', 'purple', 'blue', 'teal', 'magenta', 'gold'][i]!, section}, {id: `ck_fixture-${i + 1}`, at: new Date(Date.now() - (10 - i) * 86_400_000)}); });
  return r;
}
const rect = (page: Page, selector: string) => page.locator(selector).first().evaluate(el => { const r = el.getBoundingClientRect(); return {top: r.top, bottom: r.bottom, left: r.left, right: r.right, vh: innerHeight, vw: innerWidth}; });

test('it opens on the next planet, ZIGi beside it; the Undo toast never covers either; the timers are on the first screen', async ({page}, info) => {
  await open(page, {path: longDay()});
  for (const n of [1, 2, 3, 4, 5]) await page.getByRole('button', {name: `Fictional star ${n}: not done yet`, exact: true}).click();
  await page.reload(); await settled(page);
  await expect(overlay(page)).toHaveAttribute('data-loaded');
  // Lands on the next planet (the sixth), at about 40 % of the screen's height.
  const next = page.locator('[data-next] [data-path-point]');
  await expect(next).toHaveAttribute('aria-label', 'Fictional star 6: not done yet');
  await expect.poll(async () => { const r = await rect(page, '[data-next] [data-path-point]'); return Math.round(((r.top + r.bottom) / 2) / r.vh * 100); }).toBeGreaterThanOrEqual(28);
  const n = await rect(page, '[data-next] [data-path-point]');
  expect(((n.top + n.bottom) / 2) / n.vh, 'the next planet near 40 % of the screen').toBeLessThanOrEqual(.55);
  // ZIGi stands beside it, within 24 px, whole on the screen, at least 130 px tall.
  const z = await rect(page, '[data-next] .path-zigi');
  expect(Math.min(Math.abs(z.left - n.right), Math.abs(n.left - z.right)), 'ZIGi beside the next planet').toBeLessThanOrEqual(24);
  expect(z.left).toBeGreaterThanOrEqual(0); expect(z.right).toBeLessThanOrEqual(z.vw); expect(z.top).toBeGreaterThanOrEqual(0); expect(z.bottom).toBeLessThanOrEqual(z.vh);
  expect(z.bottom - z.top).toBeGreaterThanOrEqual(130);
  // The corner timers are on the first screen: the side column's Sleep on a computer, the corner button on a phone.
  if (info.project.name === 'mobile') await expect(page.getByRole('button', {name: /^Timers:/})).toBeInViewport();
  else await expect(page.getByRole('group', {name: 'Quick timers'}).getByRole('button', {name: /^Sleep:/})).toBeInViewport();
  // The shell's own strips are not drawn inside the Checklist.
  await expect(overlay(page)).not.toContainText('NOTHING MOVES UNLESS YOU SIGN');
  // A tick: the toast is 52 px at most and covers neither the new next planet nor ZIGi — round 3 (L3b), at greater strength:
  // nor any planet, name, banner, chest or ZIGi on the screen; on a phone it sits inside the foot bar, on a computer beside
  // the path (right of it).
  await page.getByRole('button', {name: 'Fictional star 6: not done yet', exact: true}).click();
  await expect(page.locator('.aa-toast')).toBeVisible();
  await expect(page.locator('[data-next] [data-path-point]')).toHaveAttribute('aria-label', 'Fictional star 7: not done yet');
  await page.waitForTimeout(1800);
  const t = await rect(page, '.aa-toast'), a = await rect(page, '[data-next] [data-path-point]'), b = await rect(page, '[data-next] .path-zigi');
  expect(t.bottom - t.top).toBeLessThanOrEqual(52);
  for (const o of [a, b]) expect(o.bottom <= t.top || o.top >= t.bottom || o.right <= t.left || o.left >= t.right, 'the toast covers no planet or ZIGi').toBe(true);
  // (What shows of each part of the path: between the top bar and the foot bar, where there is one.)
  const hits = await page.evaluate(([l, r, tp, bt]) => { const dock = document.querySelector('.checklist-dock'), foot = dock && getComputedStyle(dock).display !== 'none' ? dock.getBoundingClientRect().top : innerHeight, head = document.querySelector('.checklist-topbar')!.getBoundingClientRect().bottom;
    return [...document.querySelectorAll('.path-dot, .path-label, .path-banner, .path-chest, .path-zigi')].filter(el => { const o = el.getBoundingClientRect(), top = Math.max(o.top, head), bottom = Math.min(o.bottom, foot); return bottom > top && o.left < r! && o.right > l! && top < bt! && bottom > tp!; }).map(el => el.className.toString().split(' ')[0]); }, [t.left, t.right, t.top, t.bottom] as const);
  expect(hits, 'the toast covers nothing of the path').toEqual([]);
  if (info.project.name === 'mobile') { const bar = await rect(page, '.checklist-dock'); expect(t.top).toBeGreaterThanOrEqual(bar.top - 1); }
  else { const stage = await rect(page, '.path-stage'); expect(t.left).toBeGreaterThanOrEqual(stage.right); }
});

test('a learning path’s density: five planets or more on the opening screen, between the bars; the foot bar keeps the path clear', async ({page}, info) => {
  // Round 3 (L3b): the critique's target — at least five planets on the opening screen at 390 and at 1440 (the owner's
  // reference shows seven or eight). A planet counts when at least half of it shows between the top bar and the foot bar.
  const mobile = info.project.name === 'mobile';
  await page.setViewportSize(mobile ? {width: 390, height: 844} : {width: 1440, height: 900});
  await open(page, {path: longDay()});
  for (const n of [1, 2, 3]) await page.getByRole('button', {name: `Fictional star ${n}: not done yet`, exact: true}).click();
  await page.reload(); await settled(page);
  await expect(page.locator('[data-next] [data-path-point]')).toHaveAttribute('aria-label', 'Fictional star 4: not done yet');
  await page.waitForTimeout(800);
  const shown = await page.evaluate(() => {
    const top = document.querySelector('.checklist-topbar')!.getBoundingClientRect().bottom, dock = document.querySelector('.checklist-dock');
    const foot = dock && getComputedStyle(dock).display !== 'none' ? dock.getBoundingClientRect().top : innerHeight;
    return [...document.querySelectorAll('.path-step .path-dot')].filter(d => { const r = d.getBoundingClientRect(); return Math.min(r.bottom, foot) - Math.max(r.top, top) >= r.height / 2; }).length;
  });
  expect(shown, 'planets on the opening screen').toBeGreaterThanOrEqual(5);
  if (mobile) {
    // The foot bar is opaque and holds the timers' button: nothing of the path is drawn over it.
    const bar = await rect(page, '.checklist-dock'), fab = await rect(page, '.checklist-timers-fab');
    expect(fab.top).toBeGreaterThanOrEqual(bar.top - 1); expect(fab.bottom).toBeLessThanOrEqual(bar.bottom + 1);
    const alpha = await page.locator('.checklist-dock').evaluate(el => { const m = getComputedStyle(el).backgroundImage.match(/rgba?\([^)]*\)/g) ?? []; return Math.min(...m.map(c => { const v = c.match(/[\d.]+/g)!.map(Number); return v.length > 3 ? v[3]! : 1; })); });
    expect(alpha, 'the foot bar is opaque').toBeGreaterThanOrEqual(.95);
  }
});
