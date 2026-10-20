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
  // One name per planet, beside it (no box), one line from a tablet up and two at most on a phone, 14 px or more. Round 4
  // (L3b), moved at greater strength: the next planet's name is no longer a bubble but an ordinary name held to the same
  // rules as every other, and the planet itself wears a one-word NEXT / START tag on its crown (asserted below).
  const names = await page.locator('.path-step .path-label').evaluateAll(els => els.map(e => { const cs = getComputedStyle(e), text = e.querySelector('.path-label-text')!, shown = [...e.children].filter(c => getComputedStyle(c).display !== 'none' && !c.classList.contains('path-label-cue')); const dot = e.parentElement!.querySelector('.path-dot')!.getBoundingClientRect(), r = e.getBoundingClientRect(); return {bubble: e.classList.contains('path-label-bubble'), parts: shown.length, lines: Math.round(text.getBoundingClientRect().height / parseFloat(getComputedStyle(text).lineHeight)), size: parseFloat(cs.fontSize), boxed: cs.backgroundColor !== 'rgba(0, 0, 0, 0)', beside: r.right <= dot.left + 1 || r.left >= dot.right - 1, above: r.bottom <= dot.top + 1}; }));
  expect(names.filter(n => n.bubble)).toHaveLength(0);
  for (const n of names) { expect(n.parts, 'one name, no second line of notes').toBe(1); expect(n.size).toBeGreaterThanOrEqual(14); }
  for (const n of names) { expect(n.boxed, 'no box behind a name').toBe(false); expect(n.beside, 'beside its planet').toBe(true); expect(n.lines).toBeLessThanOrEqual(info.project.name === 'mobile' ? 2 : 1); }
  const tag = await page.locator('[data-next] .path-next-tag').evaluate(el => { const r = el.getBoundingClientRect(), d = el.parentElement!.querySelector('.path-dot')!.getBoundingClientRect(); return {text: el.textContent, onCrown: r.top < d.top && r.bottom > d.top - 2, centred: Math.abs((r.left + r.right) / 2 - (d.left + d.right) / 2) <= 2}; });
  expect(tag.text, 'one word').toMatch(/^(Next|Start)$/);
  expect(tag.onCrown, 'the tag sits on the planet’s crown').toBe(true);
  expect(tag.centred, 'centred on its planet').toBe(true);
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
  // Round 4, moved at greater strength: the cheer is a still from its first frame — ZIGi's waving greeting, never the
  // celebrate frame that reads as hands on the head — with its sparkles.
  const cheer = page.locator('.path-zigi[data-cheer][data-zigi-state="cheer"]');
  await expect(cheer).toHaveCount(1);
  await expect(cheer.locator('.path-zigi-cheer i')).not.toHaveCount(0);
  // Round 5, moved at equal strength: one held frame of the greeting clip (the open hand, a wink), never the celebrate art.
  await expect(cheer.locator('img')).toHaveAttribute('src', /zigi-cheer-wave/);
  await expect(cheer.locator('.path-zigi-burst')).toHaveCount(1);
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
    // Every end state is readable: the next planet's tag and ring are there, at rest; ZIGi points at the next planet (no
    // cheer at the planet just ticked).
    await expect(page.locator('[data-next] .path-next-tag')).toBeVisible();
    await expect(page.locator('[data-next] .path-zigi')).toHaveCount(1);
    await expect(page.locator('.path-zigi[data-cheer]')).toHaveCount(0);
    // Round 5 (L3b): it points at the next planet — the pointing still, never the hands-on-head celebrate art (the half-way
    // mood's `proud` wears it), and 12 px clear of everything on the path.
    await expect(page.locator('[data-next] .path-zigi img')).toHaveAttribute('src', /presenting/);
    await page.waitForTimeout(1500);
    expect(await zigiClash(page), 'ZIGi 12 px clear of the path').toEqual([]);
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
  // Round 4: a full-screen moment — ZIGi large (160 px on a phone, 200 on a computer), cheering, in front of the trophy.
  await party.locator('.checklist-celebration-zigi').evaluate(el => Promise.all(el.getAnimations({subtree: true}).map(a => a.finished.catch(() => undefined))));
  const zigi = await party.locator('.checklist-celebration-zigi').evaluate(el => { const r = el.getBoundingClientRect(), hit = document.elementFromPoint((r.left + r.right) / 2, r.top + r.height * .45); return {h: r.height, front: !!hit && el.contains(hit), src: el.querySelector('img')?.getAttribute('src') ?? ''}; });
  expect(zigi.h).toBeGreaterThanOrEqual(page.viewportSize()!.width < 768 ? 160 : 200);
  expect(zigi.front, 'ZIGi in front of the trophy').toBe(true);
  expect(zigi.src).toMatch(/zigi-cheer-wave/);
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
/** Round 5 (L3b): the parts of the path ZIGi's drawn figure — its picture's own box, as painted — comes within 12 px of:
 *  planets (the next one with its ring and moon), names, banners, chests and their names, the NEXT tag, an open panel. */
const zigiClash = (page: Page) => page.evaluate(() => {
  const z = document.querySelector<HTMLElement>('.path-zigi'); if (!z) return ['no ZIGi'];
  const r = z.querySelector('img')!.getBoundingClientRect(), C = 12;
  const ring = (dot: HTMLElement) => { const b = dot.getBoundingClientRect(), o = dot.querySelector<HTMLElement>(':scope > .path-dot-orbit'), own = dot.offsetWidth || b.width, e = o ? ((o.offsetWidth - own) / 2 + 6) * (b.width / own) : 0; return {left: b.left - e, top: b.top - e, right: b.right + e, bottom: b.bottom + e}; };
  return [...document.querySelectorAll<HTMLElement>('.path-dot, .path-label, .path-banner, .path-chest-art, .path-chest-text, .path-next-tag, .path-panel')].filter(o => !z.contains(o))
    .map(o => ({o, b: o.classList.contains('path-dot') ? ring(o) : o.getBoundingClientRect()}))
    .filter(({b}) => b.right - b.left > 2 && b.bottom - b.top > 2 && Math.min(r.right, b.right + C) - Math.max(r.left, b.left - C) > 0 && Math.min(r.bottom, b.bottom + C) - Math.max(r.top, b.top - C) > 0)
    .map(({o}) => `${o.className.toString().split(' ')[0]}: ${(o.textContent ?? '').slice(0, 24)}`);
});
/** ZIGi at rest: its cheer over and its place measured again once the tick's own motion has settled. */
async function zigiAtRest(page: Page) {
  await expect(page.locator('.path-zigi[data-cheer]')).toHaveCount(0, {timeout: 5000});
  await page.waitForTimeout(1600);
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
  // ZIGi stands beside it, whole on the screen, at least 130 px tall. Round 5 (L3b), moved at equal strength: "beside" is
  // read from the next planet's ring (its outer edge, which ZIGi must now clear by 12 px) instead of its body: ZIGi's drawn
  // figure stands 12 to 36 px from the ring — the same 24 px of play the old check allowed, past the new clearance.
  await zigiAtRest(page);
  const z = await rect(page, '[data-next] .path-zigi img');
  const ringEdge = await page.locator('[data-next] .path-dot').evaluate(dot => { const b = dot.getBoundingClientRect(), o = dot.querySelector<HTMLElement>(':scope > .path-dot-orbit')!, own = (dot as HTMLElement).offsetWidth, e = ((o.offsetWidth - own) / 2 + 6) * (b.width / own); return {left: b.left - e, right: b.right + e, top: b.top - e, bottom: b.bottom + e}; });
  const beside = z.left >= ringEdge.right ? z.left - ringEdge.right : ringEdge.left - z.right;
  expect(beside, 'ZIGi beside the next planet').toBeGreaterThanOrEqual(12);
  expect(beside, 'ZIGi beside the next planet').toBeLessThanOrEqual(36);
  expect(Math.min(z.bottom, ringEdge.bottom) - Math.max(z.top, ringEdge.top), 'level with it').toBeGreaterThan(0);
  expect(z.left).toBeGreaterThanOrEqual(0); expect(z.right).toBeLessThanOrEqual(z.vw); expect(z.top).toBeGreaterThanOrEqual(0); expect(z.bottom).toBeLessThanOrEqual(z.vh);
  expect(z.bottom - z.top).toBeGreaterThanOrEqual(130);
  // The corner timers are on the first screen: the side column's Sleep on a computer, the foot bar's Sleep chip on a phone.
  // (Round 4: on a phone the timers are the foot bar's own chips, so Sleep itself is on the first screen everywhere.)
  await expect(page.getByRole('group', {name: 'Quick timers'}).getByRole('button', {name: /^Sleep:/})).toBeInViewport();
  // Round 4 → round 5 (L3b), moved at greater strength: the old check read an inset box (the figure's sides and top left
  // out) and only at the opening, so it passed while the frames showed ZIGi over a name and a chest after a tick. Now ZIGi's
  // drawn figure is at least 12 px clear of every planet (and the next one's ring), name, banner, chest and tag — here, and
  // after a tick, an orbit and under reduced motion in the test below.
  expect(await zigiClash(page), 'ZIGi 12 px clear of the path').toEqual([]);
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

test('a learning path’s density: six planets or more on the opening screen, between the bars; the foot bar keeps the path clear', async ({page}, info) => {
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
  // (Round 4, raised: six — one more than iteration 3's five, from the one-row top bar and the chests beside their planets.)
  expect(shown, 'planets on the opening screen').toBeGreaterThanOrEqual(6);
  if (mobile) {
    // The foot bar is opaque and holds the timers: nothing of the path is drawn over it.
    // (Round 4: the bar holds the timers' own chips, each 44 px or more.)
    const bar = await rect(page, '.checklist-dock'), chips = await rect(page, '.checklist-timers');
    expect(chips.top).toBeGreaterThanOrEqual(bar.top - 1); expect(chips.bottom).toBeLessThanOrEqual(bar.bottom + 1);
    for (const b of await page.getByRole('group', {name: 'Quick timers'}).getByRole('button').all()) { const box = (await b.boundingBox())!; expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44); }
    const alpha = await page.locator('.checklist-dock').evaluate(el => { const m = getComputedStyle(el).backgroundImage.match(/rgba?\([^)]*\)/g) ?? []; return Math.min(...m.map(c => { const v = c.match(/[\d.]+/g)!.map(Number); return v.length > 3 ? v[3]! : 1; })); });
    expect(alpha, 'the foot bar is opaque').toBeGreaterThanOrEqual(.95);
  }
});

test('ZIGi at rest is 12 px clear of the path after a tick, after an orbit and under reduced motion, at 390, 768 and 1440', async ({page}, info) => {
  // Round 5 (L3b; the iteration-4 frames showed ZIGi over a name, a chest and the NEXT ring once it settled after a tick).
  test.setTimeout(120_000);
  const sizes = info.project.name === 'mobile' ? [{width: 390, height: 844}] : [{width: 1440, height: 900}, {width: 768, height: 1024}];
  for (const size of sizes) {
    await page.emulateMedia({reducedMotion: 'no-preference'});
    await page.setViewportSize(size);
    await open(page, {path: longDay()});
    await zigiAtRest(page);
    expect(await zigiClash(page), `${size.width}px: on opening`).toEqual([]);
    // After a tick, and after the tick that completes the morning orbit.
    for (const n of [1, 2, 3]) {
      await page.getByRole('button', {name: `Fictional star ${n}: not done yet`, exact: true}).click();
      await zigiAtRest(page);
      expect(await zigiClash(page), `${size.width}px: after ticking star ${n}`).toEqual([]);
      await expect(page.locator('[data-next] .path-zigi img')).not.toHaveAttribute('src', /celebrate/);
    }
    // Under reduced motion: the pointing still, clear.
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.reload(); await settled(page);
    await page.getByRole('button', {name: 'Fictional star 4: not done yet', exact: true}).click();
    await zigiAtRest(page);
    await expect(page.locator('[data-next] .path-zigi img')).toHaveAttribute('src', /presenting/);
    expect(await zigiClash(page), `${size.width}px: reduced motion, after ticking star 4`).toEqual([]);
  }
});
