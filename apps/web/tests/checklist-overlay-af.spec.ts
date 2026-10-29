import {expect, test, type Page} from '@playwright/test';
import {CHECKLIST_DAYS_KEY} from '../lib/af-checklist-keys';
import {MOTION_PREFERENCE_KEY} from '../components/use-entrance';
import {addCustom} from '../lib/checklist/store';
import {emptyChecklist} from '../lib/checklist/schema';
import {TITLE, seedChecklist, settled, stored} from './checklist-fixtures';
import {suggestPathLabel} from '../lib/checklist/path-label';
import {navLink} from './phone-nav';

/**
 * Session AF (L3b; the owner's full-screen Checklist): the Checklist is a stand-alone layer over the whole app. Only the
 * Checklist is on screen — no sidebar, header, footer banner, tab bar or other launcher — as a modal dialog in the
 * browser's top layer, so everything behind it is inert and focus stays inside; X and Escape return to the page it was
 * opened from, or to Today when it was opened directly; the address stays /app/checklist. Session AG (ADR-029): the path's
 * nodes are 76–88 px on a computer and 58–68 px on a phone, each with one name tab and no paragraph on the path. A tick
 * lights its node (the ring blooms, the tab fills with a check) and sends a light along the line under normal motion, and
 * is a still under reduced motion and Motion Off. The day's celebration plays once, on the last tick, never when a
 * finished day is opened again.
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

test('nodes (76–88 px on a computer, 58–68 px on a phone, the next one a size larger); one name tab on each, no paragraph on the path', async ({page}, info) => {
  await open(page);
  // Session AG, moved at equal strength: the footer banner's nodes (80 px on a computer, 62 on a phone; the next ×1.06).
  const range = info.project.name === 'mobile' ? [58, 68] : [76, 88];
  for (const size of info.project.name === 'mobile' ? [{width: 390, height: 844}] : [{width: 1440, height: 900}, {width: 1280, height: 720}]) {
    await page.setViewportSize(size); await page.waitForTimeout(300);
    const dots = await page.locator('button.path-dot').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return Math.round(Math.min(r.width, r.height)); }));
    expect(dots.length).toBe(4);
    for (const d of dots) { expect(d, `${size.width}px`).toBeGreaterThanOrEqual(range[0]!); expect(d, `${size.width}px`).toBeLessThanOrEqual(range[1]!); }
  }
  // Session AG (owner pointer 2), moved at equal strength: one name per node, now a tab attached to it where the footer's
  // badge sits — overlapping its ring on its lower side, below its centre — one line from a tablet up and two at most on a
  // phone (Session AG Polish 2: never an ellipsis, ADR-031), 14 px or more, with the full name in its title.
  const names = await page.locator('.path-step .path-label').evaluateAll(els => els.map(e => { const cs = getComputedStyle(e), text = e.querySelector('.path-label-text')!, shown = [...e.children].filter(c => getComputedStyle(c).display !== 'none' && !c.classList.contains('path-label-cue')); const dot = e.parentElement!.querySelector('.path-dot')!.getBoundingClientRect(), r = e.getBoundingClientRect(), cx = (dot.left + dot.right) / 2, cy = (dot.top + dot.bottom) / 2; return {bubble: e.classList.contains('path-label-bubble'), tab: e.classList.contains('orbit-tab'), parts: shown.length, lines: Math.round(text.getBoundingClientRect().height / parseFloat(getComputedStyle(text).lineHeight)), size: parseFloat(cs.fontSize), title: e.getAttribute('title'), label: text.textContent, attached: r.left < dot.right && r.right > dot.left && r.top < dot.bottom && r.bottom > dot.top, below: r.top > cy, aside: e.getAttribute('data-side') === 'right' ? r.left > cx && r.right > dot.right : r.right < cx && r.left < dot.left}; }));
  expect(names.filter(n => n.bubble)).toHaveLength(0);
  for (const n of names) { expect(n.parts, 'one name, no second line of notes').toBe(1); expect(n.size).toBeGreaterThanOrEqual(14); expect(n.tab, 'a name tab').toBe(true); expect(n.label, 'its one word on the path (owner amendment 10)').toBe(suggestPathLabel(n.title ?? '')); expect(n.title, 'the full name in its title').toBeTruthy(); }
  for (const n of names) { expect(n.attached, `${n.label}: attached to its node`).toBe(true); expect(n.below, `${n.label}: on the node's lower side`).toBe(true); expect(n.aside, `${n.label}: toward its side`).toBe(true); expect(n.lines).toBeLessThanOrEqual(info.project.name === 'mobile' ? 2 : 1); }
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

test('a tick: the node lights (its ring blooms, its tab fills with a check), a light runs along the line, ZIGi’s cheer and the bar’s shine', async ({page}) => {
  await open(page);
  const dot = page.getByRole('button', {name: `${TITLE.stretch}: not done yet`, exact: true});
  // Round 7 (L3b; the iteration-6 frames showed ZIGi's head over a name and a banner's title as it glided): every frame of
  // ZIGi's moves — to its cheer and on to the next planet — keeps its figure off every name, banner and planet shown.
  // Round 8 (the iteration-7 frames lost a name while ZIGi cheered beside its planet): every name stays shown in every frame.
  await page.evaluate(CHEER_FRAME);
  await page.evaluate(() => {
    const w = window as unknown as {__moves: string[]}; w.__moves = []; const t0 = performance.now();
    const cheerFrame = (window as unknown as {__cheerFrame: (t: number) => string[]}).__cheerFrame;
    const frame = () => {
      for (const l of document.querySelectorAll<HTMLElement>('.path-label')) if (Number(getComputedStyle(l).opacity) < .9) w.__moves.push(`${Math.round(performance.now() - t0)} ms: the name ${(l.textContent ?? '').slice(0, 20)} hidden`);
      w.__moves.push(...cheerFrame(Math.round(performance.now() - t0)));
      const z = document.querySelector<HTMLElement>('.path-zigi');
      if (z && z.getAnimations().some(a => a.playState === 'running') && Number(getComputedStyle(z).opacity) > .5) {
        const r = z.querySelector('img')!.getBoundingClientRect();
        for (const o of document.querySelectorAll<HTMLElement>('.path-label, .path-banner, .path-dot')) {
          if (Number(getComputedStyle(o).opacity) <= .5) continue;
          const b = o.getBoundingClientRect();
          if (Math.min(r.right, b.right) - Math.max(r.left, b.left) > 1 && Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top) > 1) w.__moves.push(`${Math.round(performance.now() - t0)} ms: over ${o.className.toString().split(' ')[0]} ${(o.textContent ?? '').slice(0, 20)}`);
        }
      }
      if (performance.now() - t0 < 3200) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  // (The bloom and the light play once, about a second: the page records them as they appear, so a slow runner reads them.)
  await page.evaluate(() => {
    const w = window as unknown as {__lit: {bloom: string[]; travel: {segment: string; running: number}[]}}; w.__lit = {bloom: [], travel: []};
    new MutationObserver(records => { for (const r of records) for (const n of r.addedNodes) {
      if (!(n instanceof Element)) continue;
      for (const b of [n, ...n.querySelectorAll('*')].filter(e => e.classList.contains('orbit-node-bloom'))) w.__lit.bloom.push(b.closest('[data-path-point]')?.getAttribute('data-path-point') ?? '');
      for (const t of [n, ...n.querySelectorAll('*')].filter(e => e.classList.contains('orbit-flow-travel'))) requestAnimationFrame(() => w.__lit.travel.push({segment: t.closest('[data-segment]')?.getAttribute('data-segment') ?? '', running: t.getAnimations().length}));
    } }).observe(document.querySelector('.path-stage')!, {childList: true, subtree: true});
  });
  await dot.click();
  const done = page.getByRole('button', {name: `${TITLE.stretch}: done`, exact: true});
  await expect(done).toHaveAttribute('data-lit', '');
  // Session AG (owner pointers 1–2), moved at equal strength (was: fourteen sparks and a comet): the node lights — lit, its
  // ring blooming once — its name tab fills in its colour with a check, and a light runs from it along the line toward the
  // next node, once.
  const lit = () => page.evaluate(() => (window as unknown as {__lit: {bloom: string[]; travel: {segment: string; running: number}[]}}).__lit);
  await expect.poll(async () => (await lit()).bloom, {message: 'its ring blooms once'}).toEqual(['ck_fixture-1']);
  const tab = await done.locator('xpath=ancestor::li[contains(@class, "path-step")]').locator('.path-label').evaluate(l => { const cs = getComputedStyle(l), check = getComputedStyle(l, '::before'); return {fill: cs.backgroundImage, check: check.content !== 'none' && parseFloat(check.borderLeftWidth) > 0}; });
  expect(tab.fill, 'the tab fills in its colour').toMatch(/gradient/);
  expect(tab.check, 'a check before the name: done never rests on colour alone').toBe(true);
  await expect.poll(async () => (await lit()).travel.length, {message: 'a light runs along the line'}).toBe(1);
  const travel = (await lit()).travel[0]!;
  expect(travel.segment, 'from the node just lit to the next one').toMatch(/^ck_fixture-1>/);
  expect(travel.running, 'the light runs').toBeGreaterThan(0);
  // Round 4, moved at greater strength: the cheer is a still from its first frame — ZIGi's waving greeting, never the
  // celebrate frame that reads as hands on the head — with its sparkles.
  const cheer = page.locator('.path-zigi[data-cheer][data-zigi-state="cheer"]');
  await expect(cheer).toHaveCount(1);
  await expect(cheer.locator('.path-zigi-cheer i')).not.toHaveCount(0);
  // Round 6, moved in round 7 at equal strength: ZIGi's delivered presenting still, cropped to the figure (the same pixels
  // without the empty margin; the arm held out, the hand away from the face; never the celebrate art nor a greeting frame),
  // with its star burst.
  await expect(cheer.locator('img')).toHaveAttribute('src', /\/brand\/checklist\/zigi-present\.webp$/);
  await expect(cheer.locator('.path-zigi-burst')).toHaveCount(1);
  // (Where it cheers, for the glide below.)
  // (Its laid-out place — never read through a glide or a hop.)
  const stageOf = () => page.locator('.path-zigi').evaluate((z: HTMLElement) => { const s = z.closest('.path-stage')!.getBoundingClientRect(), r = z.parentElement!.getBoundingClientRect(); return {x: r.left + z.offsetLeft - s.left, y: r.top + z.offsetTop - s.top}; });
  const cheered = await stageOf();
  await expect(done.locator('xpath=ancestor::li[contains(@class, "path-step")]').locator('.path-zigi[data-cheer]')).toHaveCount(1);
  const moving = await overlay(page).evaluate(d => d.getAnimations({subtree: true}).filter(a => a.playState === 'running').length);
  expect(moving, 'the tick plays').toBeGreaterThan(5);
  // Then the bloom and the light are gone and the node rests, lit.
  await expect(done).not.toHaveAttribute('data-just', /.*/, {timeout: 3000});
  await expect(done.locator('.orbit-node-bloom')).toHaveCount(0);
  await expect(page.locator('.orbit-flow-travel')).toHaveCount(0);
  await expect(done).toHaveAttribute('data-lit', '');
  // Round 6: from the cheer to its place beside the next planet ZIGi glides (a 300 ms move or longer), or stays where it is.
  const glided = await page.waitForFunction(() => { const z = document.querySelector('.path-zigi'); if (!z || z.hasAttribute('data-cheer')) return null; return {glide: z.getAnimations().some(a => Number(a.effect?.getComputedTiming().duration) >= 300)}; }, null, {polling: 'raf', timeout: 5000}).then(h => h.jsonValue());
  await page.waitForTimeout(1600);
  const rested = await stageOf();
  if (Math.hypot(rested.x - cheered.x, rested.y - cheered.y) > 3) expect(glided?.glide, 'ZIGi glides to its place, never jumps').toBe(true);
  expect(await cutNames(page), 'with the toast showing, no name cut by the foot bar: it fades into it').toEqual([]);
  const moves = await page.evaluate(() => (window as unknown as {__moves: string[]}).__moves);
  expect(moves, 'ZIGi never passes over a name, a banner or a planet, no name is hidden, and its cheer — at the top of its hops, its sparkles — keeps off every name').toEqual([]);
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
    await expect(page.locator('[data-next] .path-zigi img')).toHaveAttribute('src', /\/brand\/checklist\/zigi-present\.webp$/);
    await page.waitForTimeout(1500);
    expect(await zigiClash(page), 'ZIGi 12 px clear of the path').toEqual([]);
    // Session AG, moved at equal strength (was: the next planet's pulse at rest): the lit state shows at once — the node lit,
    // its stretch of line lit from its side — and no light runs along the line.
    await expect(page.getByRole('button', {name: `${TITLE.stretch}: done`, exact: true})).toHaveAttribute('data-lit', '');
    await expect(page.locator('.orbit-flow-segment[data-light=from]')).not.toHaveCount(0);
    expect(await page.locator('.orbit-flow-travel').evaluateAll(els => els.filter(el => getComputedStyle(el).display !== 'none').length)).toBe(0);
  });
}

test('the day’s celebration plays once, on the last tick; never when the finished day is opened again', async ({page}) => {
  let r = emptyChecklist();
  r = addCustom(r, {label: 'Fictional first star', colour: 'cyan', section: 'morning'}, {id: 'ck_fixture-a', at: new Date(Date.now() - 2 * 86_400_000)});
  r = addCustom(r, {label: 'Fictional last star', colour: 'gold', section: 'evening'}, {id: 'ck_fixture-b', at: new Date(Date.now() - 86_400_000)});
  await open(page, {path: r});
  await page.getByRole('button', {name: 'Fictional first star: not done yet', exact: true}).click();
  await expect(page.getByRole('dialog', {name: /lit!$/})).toHaveCount(0);
  // Round 8 (the iteration-7 frames: on the last tick a name was missing and ZIGi, on its way to the trophy, faced the
  // screen's edge): in every frame of the last tick every name stays shown, and ZIGi, wherever it shows, faces the planet
  // just ticked or the trophy, whichever is nearer — its arm toward it.
  await page.evaluate(() => {
    const w = window as unknown as {__last: string[]}; w.__last = []; const t0 = performance.now();
    const frame = () => {
      const t = Math.round(performance.now() - t0);
      for (const l of document.querySelectorAll<HTMLElement>('.path-stage .path-label')) if (Number(getComputedStyle(l).opacity) < .9) w.__last.push(`${t} ms: the name ${(l.textContent ?? '').slice(0, 20)} hidden`);
      const z = document.querySelector<HTMLElement>('.path-stage .path-zigi'), ticked = [...document.querySelectorAll<HTMLElement>('.path-stage .path-dot')].at(-1), trophy = document.querySelector('.path-stage .path-chest[data-trophy] .path-chest-art');
      if (z && ticked && trophy && Number(getComputedStyle(z).opacity) > .5) {
        const r = z.querySelector('img')!.getBoundingClientRect(), cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
        const target = [ticked.getBoundingClientRect(), trophy.getBoundingClientRect()].map(b => ({x: (b.left + b.right) / 2, d: Math.hypot((b.left + b.right) / 2 - cx, (b.top + b.bottom) / 2 - cy)})).sort((a, b) => a.d - b.d)[0]!;
        const armRight = (z.getAttribute('data-side') === 'left') !== (new DOMMatrix(getComputedStyle(z).transform).a < 0);
        if (armRight ? target.x < cx : target.x > cx) w.__last.push(`${t} ms: ZIGi faces away from its planet`);
      }
      if (performance.now() - t0 < 900 && !document.querySelector('[role=dialog][open], dialog.checklist-celebration[open]')) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  await page.getByRole('button', {name: 'Fictional last star: not done yet', exact: true}).click();
  const party = page.getByRole('dialog', {name: 'All 2 planets lit!'});
  await expect(party).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as {__last: string[]}).__last), 'the last tick: every name shown, ZIGi facing its planet').toEqual([]);
  await expect(party.getByRole('button', {name: 'Continue'})).toBeFocused();
  expect(await party.evaluate(d => d.matches(':modal'))).toBe(true);
  // Session AG Polish 2 (owner Part 7), moved: no Undo over the celebration — the last tick's toast waits for Continue.
  await expect(page.locator('.aa-toast')).toHaveCount(0);
  // Round 4, moved (Session AG Polish 2): a full-screen moment — the owner's clip (or its last frame) at the screen's full
  // height (the whole screen on a phone), in front of the path.
  const media = await party.locator('.checklist-celebration-media').evaluate(el => { const r = el.getBoundingClientRect(), hit = document.elementFromPoint(innerWidth / 2, innerHeight * .4); return {h: r.height, w: r.width, vh: innerHeight, vw: innerWidth, front: !!hit && !!hit.closest('dialog.checklist-celebration'), src: el.querySelector('img')?.getAttribute('src') ?? ''}; });
  expect(media.h, 'the full height').toBeGreaterThanOrEqual(media.vh - 1);
  if (media.vw <= 640) expect(media.w, 'the whole width on a phone').toBeGreaterThanOrEqual(media.vw - 1);
  expect(media.front, 'in front of the path').toBe(true);
  expect(media.src).toMatch(/13-celebration-last-frame\.webp$/);
  await party.getByRole('button', {name: 'Continue'}).click();
  if (await party.count()) await party.getByRole('button', {name: 'Continue'}).click();
  await expect(party).toHaveCount(0);
  await expect(page.locator('.aa-toast').getByRole('button', {name: 'Undo', exact: true}), 'the toast is back').toBeVisible();
  await expect(overlay(page)).toBeVisible();
  // Round 7 (L3b; the iteration-6 frames showed ZIGi over the trophy planet on the last tick): at the day's end ZIGi
  // stands beside the trophy, 12 px clear of it and of everything else on the path; round 8: its arm toward the trophy.
  await page.waitForTimeout(1500);
  expect(await zigiClash(page), 'ZIGi beside the trophy, clear').toEqual([]);
  const faces = await page.evaluate(() => {
    const z = document.querySelector<HTMLElement>('.path-stage .path-zigi')!, r = z.querySelector('img')!.getBoundingClientRect(), b = document.querySelector('.path-stage .path-chest[data-trophy] .path-chest-art')!.getBoundingClientRect();
    return (z.getAttribute('data-side') === 'left') === ((r.left + r.right) / 2 < (b.left + b.right) / 2);
  });
  expect(faces, 'ZIGi beside the trophy, its arm toward it').toBe(true);
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

/** A longer fictional day: eight custom items across the three orbits, added in the ten days before `now`. */
function longDay(now = Date.now()) {
  let r = emptyChecklist(); const sections = ['morning', 'morning', 'morning', 'afternoon', 'afternoon', 'evening', 'evening', 'evening'];
  sections.forEach((section, i) => { r = addCustom(r, {label: `Fictional star ${i + 1}`, colour: ['cyan', 'pink', 'gold', 'purple', 'blue', 'teal', 'magenta', 'gold'][i]!, section}, {id: `ck_fixture-${i + 1}`, at: new Date(now - (10 - i) * 86_400_000)}); });
  return r;
}
/**
 * Session AJ (item 12): a fixed midday for the landing test below. Its ticks, the reload and ZIGi's rest were measured on
 * the real clock, so a run near midnight (the day turning between the ticks and the reload) or at another time of day
 * (which orbit is "now") could land elsewhere (CI and `main`'s own build, Session AI). The clock only runs from here.
 */
const LANDING_NOON = new Date('2026-10-21T12:00:00Z');
/** Round 5 (L3b): the parts of the path ZIGi's drawn figure — its picture's own box, as painted — comes within 12 px of:
 *  nodes (with their 6 px dark halo; Session AG), names, banners, chests and their names, the NEXT tag, an open panel. */
const zigiClash = (page: Page) => page.evaluate(() => {
  const z = document.querySelector<HTMLElement>('.path-zigi'); if (!z) return ['no ZIGi'];
  const r = z.querySelector('img')!.getBoundingClientRect(), C = 12;
  const ring = (dot: HTMLElement) => { const b = dot.getBoundingClientRect(), own = dot.offsetWidth || b.width, e = 6 * (b.width / own); return {left: b.left - e, top: b.top - e, right: b.right + e, bottom: b.bottom + e}; };
  return [...document.querySelectorAll<HTMLElement>('.path-dot, .path-label, .path-banner, .path-chest-art, .path-chest-text, .path-next-tag, .path-panel')].filter(o => !z.contains(o))
    .map(o => ({o, b: o.classList.contains('path-dot') ? ring(o) : o.getBoundingClientRect()}))
    .filter(({b}) => b.right - b.left > 2 && b.bottom - b.top > 2 && Math.min(r.right, b.right + C) - Math.max(r.left, b.left - C) > 0 && Math.min(r.bottom, b.bottom + C) - Math.max(r.top, b.top - C) > 0)
    .map(({o}) => `${o.className.toString().split(' ')[0]}: ${(o.textContent ?? '').slice(0, 24)}`);
});
/** Round 7 (L3b): ZIGi at rest beside the next planet, measured on the figure as seen — its picture's non-transparent
 *  pixels, mapped onto the drawn box (mirrored on the planet's left) — never on the box: its height, its distance from the
 *  screen's edges, which way it faces, and whether it points at the next planet: the presenting still, its arm (31 % of
 *  the figure's height) through the middle of the planet's body (half its radius either side of its centre; the edge of its
 *  ring reads as pointing at the planet beyond). And the next planet's name's distance from the
 *  ring and moon as drawn: from their box where the ring is whole; where the ring opens toward the name (a phone), from every
 *  point of the ring and moon that is not faded out. */
const restFacts = (page: Page) => page.evaluate(() => {
  const z = document.querySelector<HTMLElement>('[data-next] .path-zigi')!, image = z.querySelector('img')!, dot = document.querySelector<HTMLElement>('[data-next] .path-dot')!, d = dot.getBoundingClientRect();
  const b = image.getBoundingClientRect(), W = image.naturalWidth, H = image.naturalHeight, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!; x.drawImage(image, 0, 0); const px = x.getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let i = 0; i < W; i++) if (px[(y * W + i) * 4 + 3]! > 8) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const k = Math.min(b.width / W, b.height / H), ox = b.left + (b.width - W * k) / 2, oy = b.top + (b.height - H * k) / 2, mirrored = z.getAttribute('data-side') === 'left';
  const fig = {left: mirrored ? ox + (W - 1 - x1) * k : ox + x0 * k, right: mirrored ? ox + (W - x0) * k : ox + (x1 + 1) * k, top: oy + y0 * k, bottom: oy + (y1 + 1) * k};
  // (Session AG: the node's ring as drawn reaches its 6 px dark halo; there is no orbit ring or moon any more.)
  const e = 6 * d.width / dot.offsetWidth, l = document.querySelector('[data-next] .path-label')!.getBoundingClientRect();
  const left = (fig.left + fig.right) / 2 < (d.left + d.right) / 2, arm = fig.top + (fig.bottom - fig.top) * .31;
  const presenting = /\/brand\/checklist\/zigi-present\.webp$/.test(image.getAttribute('src') ?? '');
  // (Session AG: the next node's name is a tab attached to its node — `nameGap` now reads that it overlaps the node.)
  const nameGap = Math.min(l.right, d.right) - Math.max(l.left, d.left) > 0 && Math.min(l.bottom, d.bottom) - Math.max(l.top, d.top) > 0 ? 0 : -1, masked = false;
  const cy = (d.top + d.bottom) / 2, band = Math.max(14, d.height / 4);
  // (Gate C test audit: the figure's distance from the next planet's ring, as drawn, on the side it stands.)
  const gap = left ? (d.left - e) - fig.right : fig.left - (d.right + e);
  // (Gate C, CI's Linux fonts: where the next planet's name stands between the ring and ZIGi, level with the figure, ZIGi's
  // nearest clear place is just past the name — how far past it, from the name's far edge.)
  // (Session AG Polish 3, ADR-032 L13: a name tab attached to its node — overlapping the ring, as on a phone's river — stands
  // between them too where its far edge reaches past the ring toward ZIGi.)
  const between = l.bottom > fig.top && l.top < fig.bottom && (left ? l.left < d.left - 1 && l.left >= fig.right - 1 && l.right <= d.right + 1 : l.right > d.right + 1 && l.right <= fig.left + 1 && l.left >= d.left - 1);
  const pastName = between ? (left ? l.left - fig.right : fig.left - l.right) : null;
  // (Session AG Polish, owner Part 2: where a long name leaves no room on its node's other side on a phone, ZIGi's slot is
  // above that name — `data-zigi-slot="above"` — and the clearances below are read from the node and the name instead.)
  const slot = document.querySelector('[data-next] .path-label')!.getAttribute('data-zigi-slot');
  const apart = (a: {left: number; right: number; top: number; bottom: number}, o: {left: number; right: number; top: number; bottom: number}) => Math.max(o.left - a.right, a.left - o.right, o.top - a.bottom, a.top - o.bottom);
  const clearNode = apart(fig, {left: d.left - e, right: d.right + e, top: d.top - e, bottom: d.bottom + e}), clearName = apart(fig, l);
  return {h: fig.bottom - fig.top, edge: Math.min(fig.left, innerWidth - fig.right), mirrored, left, points: presenting && Math.abs(arm - cy) <= band, nameGap, masked, gap, pastName, slot, clearNode, clearName};
});
/** Round 9 (L3b; the iteration-8 frames: at the top of a cheer's hop ZIGi's head met the descenders of a name, and a sparkle
 *  sat on a name — the round-7 and round-8 checks read ZIGi at rest and its moves only, never the hop's own frames, nor the
 *  sparkles): installed in the page, it reads one frame of a cheer — ZIGi's figure as drawn at that moment (its hop and its
 *  squash and stretch with it) 12 px or more from every name shown, and no sparkle on a name. */
const CHEER_FRAME = () => {
  (window as unknown as {__cheerFrame: (t: number) => string[]}).__cheerFrame = (t: number) => {
    // (What is seen: a cheer shrinking away at its old place, faded below half, is not.)
    const out: string[] = [], z = document.querySelector<HTMLElement>('.path-zigi[data-cheer]'); if (!z || Number(getComputedStyle(z).opacity) <= .5) return out;
    const names = [...document.querySelectorAll<HTMLElement>('.path-label')].filter(l => Number(getComputedStyle(l).opacity) > .5).map(l => ({t: (l.textContent ?? '').slice(0, 20), b: l.getBoundingClientRect()}));
    const r = z.querySelector('img')!.getBoundingClientRect();
    for (const {t: name, b} of names) { const d = Math.hypot(Math.max(b.left - r.right, 0, r.left - b.right), Math.max(b.top - r.bottom, 0, r.top - b.bottom)); if (d < 12) out.push(`${t} ms: ZIGi's cheer ${Math.round(d)} px from the name ${name}`); }
    for (const i of z.querySelectorAll<HTMLElement>('.path-zigi-cheer i')) {
      if (Number(getComputedStyle(i).opacity) < .1) continue;
      const q = i.getBoundingClientRect();
      for (const {t: name, b} of names) if (Math.min(q.right, b.right) - Math.max(q.left, b.left) > 0 && Math.min(q.bottom, b.bottom) - Math.max(q.top, b.top) > 0) out.push(`${t} ms: a sparkle on the name ${name}`);
    }
    return out;
  };
};
/** Watches a tick's cheer, frame by frame, until `read`. */
async function watchCheer(page: Page) {
  await page.evaluate(CHEER_FRAME);
  await page.evaluate(() => {
    const w = window as unknown as {__cheer: string[]; __cheerFrame: (t: number) => string[]}; w.__cheer = []; const t0 = performance.now();
    const frame = () => { w.__cheer.push(...w.__cheerFrame(Math.round(performance.now() - t0))); if (performance.now() - t0 < 2600) requestAnimationFrame(frame); };
    requestAnimationFrame(frame);
  });
  return () => page.evaluate(() => [...new Set((window as unknown as {__cheer: string[]}).__cheer.map(m => m.replace(/^\d+ ms: /, '')))]);
}
/** Round 9 (L3b; the iteration-8 frames cut a name in half at the foot bar's edge, and at the toast's): the names the foot
 *  bar cuts where they show unfaded — the part of a name above the bar's edge must lie inside the fade above the bar. */
const cutNames = (page: Page) => page.evaluate(() => {
  const dock = document.querySelector<HTMLElement>('.checklist-dock'); if (!dock || getComputedStyle(dock).display === 'none') return [];
  const edge = dock.getBoundingClientRect().top, fade = parseFloat(getComputedStyle(dock, '::before').height) || 0;
  return [...document.querySelectorAll<HTMLElement>('.path-label')].map(l => ({t: (l.textContent ?? '').slice(0, 24), b: l.getBoundingClientRect()}))
    .filter(({b}) => b.top < edge && b.bottom > edge && edge - b.top > fade).map(({t}) => t);
});
/** The round-7 rest checks, at each size (see `restFacts`). */
async function expectRest(page: Page, width: number, when: string) {
  // Session AG (owner Part 6): ZIGi on the path at half its earlier size on a computer and a tablet (140 → 70, 118 → 59 as
  // drawn); a phone keeps a size that reads (96 → 76).
  const f = await restFacts(page), least = width >= 1180 ? 66 : width >= 641 ? 56 : 76;
  expect(f.h, `${width}px, ${when}: ZIGi's figure at rest ${least} px or more`).toBeGreaterThanOrEqual(least);
  if (width < 641) expect(f.edge, `${width}px, ${when}: ZIGi 16 px or more from the screen's edges`).toBeGreaterThanOrEqual(16);
  expect(f.mirrored, `${width}px, ${when}: ZIGi faces the next planet`).toBe(f.left);
  expect(f.nameGap, `${width}px, ${when}: the next node's name tab attached to it`).toBe(0);
  if (f.slot === 'above') {
    // Session AG Polish (owner Part 2, moved): a name too long to leave ZIGi room on the node's other side keeps to one
    // line, and ZIGi stands above it — 12 px or more clear of the node and of the name, and near them (within 60 px).
    expect(f.clearNode, `${width}px, ${when}: ZIGi clear of the next node`).toBeGreaterThanOrEqual(12);
    expect(f.clearName, `${width}px, ${when}: ZIGi clear of the next node's name`).toBeGreaterThanOrEqual(12);
    expect(Math.min(f.clearNode, f.clearName), `${width}px, ${when}: ZIGi beside them`).toBeLessThanOrEqual(60);
    test.info().annotations.push({type: 'zigi-gap', description: `${width}px ${when}: above the name, ${Math.round(f.clearNode)} from the node, ${Math.round(f.clearName)} from the name`});
    return;
  }
  expect(f.points, `${width}px, ${when}: ZIGi points at the next planet, its arm through the planet's body`).toBe(true);
  // Gate C test audit (new, after every tick and under reduced motion, not only on opening): ZIGi's figure stays beside the
  // next planet — 12 px clear of its ring and no further than the measured rests (1440: 91, 768: 60, 390: 27 px from the
  // ring) plus 8 px or so: 100 on a computer, 68 on a tablet, 36 on a phone.
  expect(f.gap, `${width}px, ${when}: ZIGi 12 px or more from the next planet's ring`).toBeGreaterThanOrEqual(12);
  // Where the next planet's name stands between them, ZIGi's nearest clear place (path-zigi.tsx) is just past the name: its
  // box 13.5 px clear of the name, its figure filling the box (CI on 624e5d9f, 1440 after star 3: 131 px from the ring, the
  // name between). Then the figure stands 12 to 36 px past the name — the phone's bound, tighter than any ring bound.
  if (f.pastName !== null) {
    expect(f.pastName, `${width}px, ${when}: ZIGi just past the next planet's name`).toBeGreaterThanOrEqual(12);
    expect(f.pastName, `${width}px, ${when}: ZIGi just past the next planet's name`).toBeLessThanOrEqual(36);
  // Session AG Polish 3, OWNER DECISION (after the 10d checkpoint; ADR-032 L26): on a phone ZIGi may rest up to 72 px
  // from the next node (was 36) — the computer's loops now take the room right beside a node. Nothing else is changed.
  } else expect(f.gap, `${width}px, ${when}: ZIGi beside the next planet`).toBeLessThanOrEqual(width >= 1180 ? 100 : width >= 641 ? 68 : 72);
  test.info().annotations.push({type: 'zigi-gap', description: `${width}px ${when}: ${Math.round(f.gap)}${f.pastName === null ? '' : ` (${Math.round(f.pastName)} past the name)`}`});
}
/** ZIGi at rest: its cheer over and its place measured again once the tick's own motion has settled. */
async function zigiAtRest(page: Page) {
  await expect(page.locator('.path-zigi[data-cheer]')).toHaveCount(0, {timeout: 5000});
  // (Its last measure is 1.3 s after it moves, and a move glides 480 ms.)
  await page.waitForTimeout(2200);
}
const rect = (page: Page, selector: string) => page.locator(selector).first().evaluate(el => { const r = el.getBoundingClientRect(); return {top: r.top, bottom: r.bottom, left: r.left, right: r.right, vh: innerHeight, vw: innerWidth}; });

test.describe('the landing on a fixed midday (Session AJ item 12)', () => {
  test.use({timezoneId: 'UTC'});
  test('it opens on the next planet, ZIGi beside it; the Undo toast never covers either; the timers are on the first screen', async ({page}, info) => {
    await page.clock.install({time: LANDING_NOON}); // the clock runs on from a fixed midday: animations and timers move as before
    await open(page, {path: longDay(LANDING_NOON.getTime())});
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
    const ringEdge = await page.locator('[data-next] .path-dot').evaluate(dot => { const b = dot.getBoundingClientRect(), e = 6 * (b.width / (dot as HTMLElement).offsetWidth); return {left: b.left - e, right: b.right + e, top: b.top - e, bottom: b.bottom + e}; });
    const beside = z.left >= ringEdge.right ? z.left - ringEdge.right : ringEdge.left - z.right;
    expect(beside, 'ZIGi beside the next planet').toBeGreaterThanOrEqual(12);
    // Round 7, moved (iteration-6 critique: pointing at the next planet comes before size, and size before nearness): on a
    // phone and a tablet still 12–36 px from the ring; on a computer, where at this landing no place within 36 px both points
    // at the planet and holds a 140 px figure (the free band left of it is 106 px tall), 12–104 px from the ring, its arm
    // through the planet's body (`expectRest`) and nothing on the path between its arm and the ring.
    const wide = page.viewportSize()!.width >= 1180;
    // Gate C test audit (tightened): the computer's bound is the landing's measured distance (78 px from the ring at 1280 px,
    // the figure as drawn) plus 8 px of play, not 104.
    // Session AG Polish 3 (ADR-032 L13), moved at equal strength: on a phone's river the next node's own name tab can stand
    // between it and ZIGi (the name hangs toward the column's middle, where ZIGi has room); there ZIGi's nearest clear place
    // is just past the name, and `expectRest` below holds it 12–36 px past the name — Gate C's rule, unchanged.
    if ((await restFacts(page)).pastName === null) expect(beside, 'ZIGi beside the next planet').toBeLessThanOrEqual(wide ? 86 : 36);
    test.info().annotations.push({type: 'zigi-landing', description: `${page.viewportSize()!.width}px: ${Math.round(beside)}`});
    const sight = await page.evaluate(() => {
      const z = document.querySelector<HTMLElement>('[data-next] .path-zigi')!, img = z.querySelector('img')!.getBoundingClientRect(), dot = document.querySelector<HTMLElement>('[data-next] .path-dot')!, d = dot.getBoundingClientRect();
      const arm = img.top + img.height * .31, from = img.right <= d.left ? img.right : d.right, to = img.right <= d.left ? d.left : img.left;
      return [...document.querySelectorAll<HTMLElement>('.path-dot, .path-label, .path-banner, .path-chest-art, .path-next-tag')].filter(o => o !== dot && !dot.contains(o))
        .filter(o => { const b = o.getBoundingClientRect(); return b.top <= arm && b.bottom >= arm && b.right > from && b.left < to; }).map(o => `${o.className.toString().split(' ')[0]} ${(o.textContent ?? '').slice(0, 20)}`);
    });
    expect(sight, 'nothing between ZIGi\'s arm and the next planet').toEqual([]);
    expect(Math.min(z.bottom, ringEdge.bottom) - Math.max(z.top, ringEdge.top), 'level with it').toBeGreaterThan(0);
    expect(z.left).toBeGreaterThanOrEqual(0); expect(z.right).toBeLessThanOrEqual(z.vw); expect(z.top).toBeGreaterThanOrEqual(0); expect(z.bottom).toBeLessThanOrEqual(z.vh);
    // Round 7, moved at greater strength: the figure as seen (`restFacts`), never the box — 106 px or more on a phone (was: a
    // 130 px box of the uncropped picture, 81 % of it figure: 106 px) and 140 on a computer; pointing at the planet.
    await expectRest(page, page.viewportSize()!.width, 'on opening');
    expect(await cutNames(page), 'no name cut by the foot bar: it fades into it').toEqual([]);
    expect((await restFacts(page)).h).toBeGreaterThanOrEqual(page.viewportSize()!.width < 641 ? 76 : 66);
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
  // Session AG Polish (owner Parts 2 and 4, moved): a phone's path is a long, airy journey — about 170 px from node to
  // node, scrolled more — and each orbit now opens with its planet in a band of its own, so the opening screen holds four
  // or more nodes on a computer and two or more on a phone (the planets on it besides).
  expect(shown, 'planets on the opening screen').toBeGreaterThanOrEqual(mobile ? 2 : 4);
  if (mobile) {
    // The foot bar is opaque and holds the timers: nothing of the path is drawn over it.
    // (Round 4: the bar holds the timers' own chips, each 44 px or more.)
    const bar = await rect(page, '.checklist-dock'), chips = await rect(page, '.checklist-timers');
    expect(chips.top).toBeGreaterThanOrEqual(bar.top - 1); expect(chips.bottom).toBeLessThanOrEqual(bar.bottom + 1);
    for (const b of await page.getByRole('group', {name: 'Quick timers'}).getByRole('button').all()) { const box = (await b.boundingBox())!; expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44); }
    const alpha = await page.locator('.checklist-dock').evaluate(el => { const m = getComputedStyle(el).backgroundImage.match(/rgba?\([^)]*\)/g) ?? []; return Math.min(...m.map(c => { const v = c.match(/[\d.]+/g)!.map(Number); return v.length > 3 ? v[3]! : 1; })); });
    expect(alpha, 'the foot bar is opaque').toBeGreaterThanOrEqual(.95);
    // Session AG (owner Part 6), replacing the chests' places on a phone: there are no chests on the path any more — only
    // the day's finale, at its end.
    await expect(page.locator('.path-chest[data-inline]')).toHaveCount(0);
    await expect(page.locator('.path-stage .path-chest')).toHaveCount(1);
    await expect(page.locator('.path-stage .path-chest')).toHaveAttribute('data-milestone', 'end');
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
      // Round 6, moved in round 7 at greater strength (the iteration-6 frames: a 164 px box held a 135 px figure, its arm
      // aimed past the next planet): ZIGi's figure as seen — never its box — rests at 140 px or more at 1440 (was: a 160 px
      // box, a 130 px figure), 118 at 768 and 96 on a phone, 16 px or more from the screen's edges on a phone; it faces the
      // next planet and points at it, presenting, its arm through the planet's body (was: never at a planet already done); the
      // next planet's name stands 12 px clear of its ring and moon as drawn (`restFacts`).
      await expectRest(page, size.width, `after ticking star ${n}`);
    }
    // Under reduced motion: the pointing still, clear.
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.reload(); await settled(page);
    await page.getByRole('button', {name: 'Fictional star 4: not done yet', exact: true}).click();
    await zigiAtRest(page);
    await expect(page.locator('[data-next] .path-zigi img')).toHaveAttribute('src', /\/brand\/checklist\/zigi-present\.webp$/);
    expect(await zigiClash(page), `${size.width}px: reduced motion, after ticking star 4`).toEqual([]);
    await expectRest(page, size.width, 'reduced motion, after ticking star 4');
  }
});

test('a tick moves nothing but its own node: every name keeps its place, the new next one too; a light runs along the line', async ({page}, info) => {
  // Round 6 (L3b; the iteration-5 frames showed names swapping sides and chests jumping between two frames of a tick).
  test.setTimeout(120_000);
  const sizes = info.project.name === 'mobile' ? [{width: 390, height: 844}] : [{width: 1440, height: 900}, {width: 768, height: 1024}];
  const boxes = () => page.evaluate(() => {
    const st = document.querySelector('.path-stage')!.getBoundingClientRect(), out: Record<string, {x: number; y: number; w: number; h: number; side: string}> = {};
    const box = (e: Element, side = '') => { const b = e.getBoundingClientRect(); return {x: b.left - st.left, y: b.top - st.top, w: b.width, h: b.height, side}; };
    for (const step of document.querySelectorAll('.path-step')) { const id = step.querySelector('[data-path-point]')!.getAttribute('data-path-point')!, l = step.querySelector('.path-label')!; out[`name ${id}`] = box(l, l.getAttribute('data-side') ?? ''); }
    return out;
  });
  for (const size of sizes) {
    await page.setViewportSize(size);
    await open(page, {path: longDay()});
    await zigiAtRest(page);
    for (const n of [1, 2, 3]) {
      const before = await boxes(), ticked = `name ck_fixture-${n}`, next = `name ck_fixture-${n + 1}`;
      const cheer = await watchCheer(page);
      // Session AJ (item 13): the travelling light exists for a moment only; a poll could miss it on a busy runner. An
      // observer set before the tick records every travelling segment that appears, so the check sees it whenever it ran.
      await page.evaluate(() => { const w = window as unknown as {__travel?: string[]}; w.__travel = []; const seen = (el: Element) => { if (el.matches('.orbit-flow-segment[data-travel]')) w.__travel!.push(el.getAttribute('data-segment') ?? ''); };
        document.querySelectorAll('.orbit-flow-segment[data-travel]').forEach(seen);
        new MutationObserver(list => { for (const m of list) { if (m.type === 'attributes' && m.target instanceof Element) seen(m.target); for (const node of m.addedNodes) if (node instanceof Element) { seen(node); node.querySelectorAll('.orbit-flow-segment[data-travel]').forEach(seen); } } }).observe(document.body, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-travel']}); });
      await page.getByRole('button', {name: `Fictional star ${n}: not done yet`, exact: true}).click();
      // Session AG, moved (was: a comet 12 px from every name): the light runs along the line itself, from the node just lit.
      await expect.poll(() => page.evaluate(prefix => ((window as unknown as {__travel?: string[]}).__travel ?? []).filter(s => s.startsWith(prefix)).length > 0, `ck_fixture-${n}>`)).toBe(true);
      await zigiAtRest(page);
      // Round 9: every frame of the cheer — the hop's top, its sparkles — off the names.
      expect(await cheer(), `${size.width}px, star ${n}: ZIGi's cheer and its sparkles off every name`).toEqual([]);
      const after = await boxes();
      for (const [key, b] of Object.entries(before)) {
        if (key === ticked) continue;
        const a = after[key]!;
        expect(a.side, `${size.width}px, star ${n}: ${key} keeps its side`).toBe(b.side);
        expect(Math.abs(a.y - b.y), `${size.width}px, star ${n}: ${key} keeps its height on the path`).toBeLessThanOrEqual(1);
        expect(Math.abs(a.h - b.h), `${size.width}px, star ${n}: ${key} keeps its lines`).toBeLessThanOrEqual(1);
        // (Session AG, at greater strength: the next node's name tab no longer steps out — it stays too, `next` included.)
        void next;
        expect(Math.abs(a.x - b.x), `${size.width}px, star ${n}: ${key} stays`).toBeLessThanOrEqual(1); expect(Math.abs(a.w - b.w), `${size.width}px, star ${n}: ${key} keeps its width`).toBeLessThanOrEqual(1);
      }
    }
  }
});

test('a long name shows whole on a phone — one line, never an ellipsis, its full name in its title — also once its node is the next one', async ({page}, info) => {
  // Round 7 (L3b; the iteration-6 frames cut a long name to "… breathwork 15…" on a phone).
  test.skip(info.project.name !== 'mobile', 'a phone');
  test.setTimeout(90_000);
  let r = emptyChecklist();
  const sections = ['morning', 'morning', 'morning', 'afternoon', 'afternoon', 'evening', 'evening', 'evening'];
  sections.forEach((section, i) => { r = addCustom(r, {label: i === 7 ? 'Starlight & breathwork 15 minutes' : `Fictional star ${i + 1}`, colour: 'teal', section}, {id: `ck_fixture-${i + 1}`, at: new Date(Date.now() - (10 - i) * 86_400_000)}); });
  await page.setViewportSize({width: 390, height: 844});
  await open(page, {path: r});
  const name = page.locator('.path-label[title="Starlight & breathwork 15 minutes"]');
  // Session AG Polish 2 (ADR-031; owner Part 1d), moved at greater strength: AG's "two lines at most, then a clean ellipsis"
  // becomes the whole name, on one line at 390 px (two only at 320 px, where it cannot fit), never cut, never "…"; its full
  // name stays in its title and its node's name.
  const whole = () => name.evaluate(l => { const t = l.querySelector<HTMLElement>('.path-label-text')!, lh = parseFloat(getComputedStyle(t).lineHeight), cs = getComputedStyle(t); return {cut: t.scrollWidth > t.clientWidth + 1 || t.scrollHeight > t.clientHeight + 1 || cs.textOverflow === 'ellipsis' && cs.overflow !== 'visible' || (cs.webkitLineClamp !== 'none' && cs.webkitLineClamp !== ''), text: t.textContent, lines: Math.round(t.getBoundingClientRect().height / lh), title: l.getAttribute('title'), right: l.getBoundingClientRect().right, left: l.getBoundingClientRect().left, vw: innerWidth}; });
  const before = await whole();
  expect(before.cut, 'nothing cut, no ellipsis').toBe(false);
  expect(before.text, 'its one word on the path, whole (owner amendment 10)').toBe('Starlight');
  expect(before.title, 'the full name in its title').toBe('Starlight & breathwork 15 minutes');
  expect(before.lines, 'one line at 390 px').toBe(1);
  for (const n of [1, 2, 3, 4, 5, 6, 7]) await page.getByRole('button', {name: `Fictional star ${n}: not done yet`, exact: true}).click();
  await zigiAtRest(page);
  await expect(page.locator('[data-next] .path-label')).toHaveAttribute('title', 'Starlight & breathwork 15 minutes');
  await expect(page.locator('[data-next] .path-label')).toHaveText('Starlight');
  const after = await whole();
  expect(after.cut, 'nothing cut as the next node\'s name').toBe(false);
  expect(after.lines, 'the same lines').toBe(before.lines);
  expect(after.left, 'on the screen').toBeGreaterThanOrEqual(0); expect(after.right, 'on the screen').toBeLessThanOrEqual(after.vw);
  await expectRest(page, 390, 'beside the long name\'s planet');
});
