import {COMPUTER_BAND} from '../lib/path/phone-scale';
import {expect, test} from '@playwright/test';
import {TITLE, seedChecklist, settled} from './checklist-fixtures';

/**
 * Session AF (L3; P7.4–P7.8): the shared path engine on a real page (the Checklist draws with it; the Earn lane's
 * Start-here path and Academy reuse it). Large dots (at least 44 px, 56 or more), one flowing neon line through every node
 * (Session AG: meeting each node's ring at its side point, heading straight down — tangent to the ring — on to the day's
 * finale), lit only between two done dots, orbit labels with real headings, the day's finale (no chests), ZIGi beside
 * the next dot, and the keyboard: the dots are buttons in path order, Home/End and the arrows move between them.
 * The locked and link steps the Earn lane uses are covered on first paint by lib/path/render.test.ts.
 */
test('dots, the line tangent to every ring, orbit labels, the finale, ZIGi by the next dot, and the keyboard', async ({page}) => {
  await seedChecklist(page);
  await page.goto('/app/checklist'); await settled(page);
  const stage = page.getByRole('group', {name: "Today's path"});
  await expect(stage).toBeVisible();
  const dots = stage.locator('button.path-dot');
  await expect(dots).toHaveCount(4);
  for (const dot of await dots.all()) { const b = (await dot.boundingBox())!; expect(Math.min(b.width, b.height)).toBeGreaterThanOrEqual(44); expect(Math.min(b.width, b.height)).toBeGreaterThanOrEqual(56); }
  // Session AF (L3b; CI on 42ec357c read a line end 3.01 px from its dot while the page was still settling), moved at equal
  // strength: the line is read once the path says its geometry has settled (its own `data-settled`), with the same 2 px.
  await expect(stage).toHaveAttribute('data-settled', '', {timeout: 10_000});
  // Session AG, moved at equal strength (was: from dot centre to dot centre): each stretch leaves one node's ring at its
  // side point and enters the next one's at its side point (within 2 px, in the stage's own coordinates), heading straight
  // down at both ends — tangent to the rings — in path order across the orbits, and on to the day's finale.
  const geometry = await stage.evaluate(el => {
    const base = el.getBoundingClientRect(), at = (id: string) => { const d = el.querySelector<HTMLElement>(`[data-path-point="${CSS.escape(id)}"]`)!, r = d.getBoundingClientRect(); return {x: r.left + r.width / 2 - base.left, y: r.top + r.height / 2 - base.top, r: d.offsetWidth / 2}; };
    return [...el.querySelectorAll('.orbit-flow-segment[data-kind=step]')].map(g => { const [from, to] = g.getAttribute('data-segment')!.split('>'); const n = g.querySelector('.orbit-flow-core')!.getAttribute('d')!.match(/-?\d+(\.\d+)?/g)!.map(Number);
      return {id: g.getAttribute('data-segment')!, start: [n[0]!, n[1]!], startDir: [n[2]! - n[0]!, n[3]! - n[1]!], end: [n.at(-2)!, n.at(-1)!], endDir: [n.at(-2)! - n.at(-4)!, n.at(-1)! - n.at(-3)!], from: at(from!), to: at(to!), lit: g.hasAttribute('data-lit')}; });
  });
  // Session AG Polish (owner Part 4, moved at equal strength): each orbit's planet stands on the line before its first
  // node — the line enters the planet at its top rim and leaves from its bottom rim (reference 03), straight down at both.
  expect(geometry.map(s => s.id)).toEqual(['planet:morning>ck_fixture-1', 'ck_fixture-1>ck_fixture-2', 'ck_fixture-2>planet:afternoon', 'planet:afternoon>ck_fixture-3', 'ck_fixture-3>planet:evening', 'planet:evening>ck_fixture-4', 'ck_fixture-4>finale:end']);
  // Session AG Polish 3 (ADR-032 L13; owner Part 1 and amendment 7): a phone's line is the computer's own (flowSegments, with
  // the phone's swing), so a phone is checked as a computer is — at greater strength than the river's check it replaces
  // (rims within 2 px, on within 60°): each stretch leaves and enters at a side point (a planet: its bottom and top rims),
  // straight down at both. On a phone the finale, in the column's middle, takes the line in at its top rim, straight down.
  // Session AG Polish 3 (ADR-032 L20; owner amendment 8), moved at equal strength: a phone's line is the computer's line × s,
  // so its ends are the computer's side points (a planet's rims) × s — the computer's radii × s about each drawn centre,
  // inside the phone's larger node, which is drawn over them; the finale as on a computer.
  const phone = (page.viewportSize()?.width ?? 1440) <= 640, stageW = await stage.evaluate(el => el.getBoundingClientRect().width);
  const k = phone ? (stageW - 12) / (COMPUTER_BAND.right - COMPUTER_BAND.left) : 1;
  for (const s of geometry) {
    const [fromId, toId] = s.id.split('>');
    const radius = (id: string, c: {r: number}) => phone ? (id.startsWith('planet:') ? 64 : id === 'finale:end' ? 44 : 40) * k : c.r;
    const side = (p: number[], c: {x: number; y: number; r: number}, id: string) => Math.min(Math.hypot(p[0]! - (c.x - radius(id, c)), p[1]! - c.y), Math.hypot(p[0]! - (c.x + radius(id, c)), p[1]! - c.y));
    const rim = (p: number[], c: {x: number; y: number; r: number}, top: boolean, id: string) => Math.hypot(p[0]! - c.x, p[1]! - (c.y + (top ? -radius(id, c) : radius(id, c))));
    const topIn = toId!.startsWith('planet:');
    expect(fromId!.startsWith('planet:') ? rim(s.start, s.from, false, fromId!) : side(s.start, s.from, fromId!), `${s.id}: leaves its ring at a side point (a planet: its bottom rim)`).toBeLessThan(2);
    expect(topIn ? rim(s.end, s.to, true, toId!) : side(s.end, s.to, toId!), `${s.id}: enters its ring at a side point (a planet: its top rim)`).toBeLessThan(2);
    expect(Math.abs(s.startDir[0]!), `${s.id}: leaves straight down`).toBeLessThan(.2); expect(s.startDir[1]!).toBeGreaterThan(0);
    expect(Math.abs(s.endDir[0]!), `${s.id}: arrives straight down`).toBeLessThan(.2); expect(s.endDir[1]!).toBeGreaterThan(0);
  }
  expect(geometry.some(s => s.lit)).toBe(false);
  // Orbit banners are headings with their counts; ZIGi stands by the first waiting dot.
  // (Session AG Polish, owner Part 3, moved: the Habits page's banners, titled "… Orbit", the count right after the title.)
  await expect(stage.getByRole('heading', {level: 2})).toHaveText(['Morning Orbit', 'Afternoon Orbit', 'Evening Orbit']);
  await expect(stage.locator('.habit-section-count > [aria-hidden]').first()).toHaveText('0 of 2');
  await expect(stage.locator('[data-next] .path-zigi')).toHaveCount(1);
  await expect(stage.locator('[data-next] [data-path-point]')).toHaveAttribute('aria-label', `${TITLE.stretch}: not done yet`);
  // Ticking two neighbours lights the line between them; no chest on the path (owner Part 6), the finale not yet reached.
  await stage.getByRole('button', {name: `${TITLE.stretch}: not done yet`, exact: true}).click();
  await stage.getByRole('button', {name: 'Water: not done yet', exact: true}).click();
  await page.getByRole('form', {name: 'Log Water'}).getByRole('button', {name: /^Log /}).click();
  // (Session AG Polish, owner Part 4: the two complete the morning, so its planet lights too — the stretch from the planet
  // into the first node is lit as well as the one between the two. Session AG Polish 2, owner Part 2b, moved at equal
  // strength: with the morning done the afternoon's planet is reached, so the stretch into it is lit too.)
  await expect(stage.locator('.path-segment[data-lit]')).toHaveCount(3);
  expect(await stage.locator('.path-segment[data-lit]').evaluateAll(gs => gs.map(g => g.getAttribute('data-segment')))).toEqual(['planet:morning>ck_fixture-1', 'ck_fixture-1>ck_fixture-2', 'ck_fixture-2>planet:afternoon']);
  await expect(stage.locator('.path-chest[data-milestone="half"]')).toHaveCount(0);
  await expect(stage.locator('.path-chest[data-milestone="end"]')).not.toHaveAttribute('data-reached', /.*/);
  await expect(stage.locator('[data-next] [data-path-point]')).toHaveAttribute('aria-label', `${TITLE.push}: not done yet`);
  // The keyboard: Home, End and the arrows.
  await dots.nth(1).focus();
  await page.keyboard.press('Home'); await expect(dots.nth(0)).toBeFocused();
  await page.keyboard.press('End'); await expect(dots.nth(3)).toBeFocused();
  await page.keyboard.press('ArrowUp'); await expect(dots.nth(2)).toBeFocused();
  await page.keyboard.press('ArrowDown'); await expect(dots.nth(3)).toBeFocused();
});

test('the layout holds from a phone to a wide screen: no sideways scroll, name tabs beside their nodes', async ({page}) => {
  await seedChecklist(page);
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({width, height: 900});
    await page.goto('/app/checklist'); await settled(page);
    await expect(page.locator('.path-dot').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${width}px: nothing scrolls sideways`).toBeLessThanOrEqual(0);
    // Session AF (L3b): the full-screen Checklist scrolls in its own layer; nothing scrolls sideways there either.
    expect(await page.locator('dialog.checklist-overlay').evaluate(d => d.scrollWidth - d.clientWidth), `${width}px: nothing scrolls sideways in the Checklist`).toBeLessThanOrEqual(0);
    // Session AG, moved: the name tab overlaps its node's ring like the footer's badge, never its glyph (the middle 70 %).
    const overlap = await page.locator('.path-step').evaluateAll(steps => steps.some(s => { const dot = s.querySelector('.path-dot')!.getBoundingClientRect(), label = s.querySelector('.path-label')!.getBoundingClientRect(), k = dot.width * .35, cx = (dot.left + dot.right) / 2, cy = (dot.top + dot.bottom) / 2; return label.left < cx + k && label.right > cx - k && label.top < cy + k * .2 && label.bottom > cy - k; }));
    expect(overlap, `${width}px: no name tab covers its node's glyph`).toBe(false);
  }
});
