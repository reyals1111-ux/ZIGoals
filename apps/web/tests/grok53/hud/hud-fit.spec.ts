import {expect, test, type Page} from '@playwright/test';
import {hydrated} from '../../ah-helpers';
import {NOON, NOVA_KEY, frame, freshNova, panel, storedJson} from './hud-helpers';

/**
 * Session AL review fixes (lane L8d; docs/review/session-al/NOVA_HUD_REVIEW.md):
 * - B2: at 1440 × 900 the Showcase's first view is the HUD — at least three Holo panels beside the star, fully in the
 *   window — and the core's readout clears the command field (1920: at least four).
 * - B1: no instrument is cropped — every drawing of a panel beside the star lies inside its panel, no instrument panel is
 *   cut (no fade, no scroll fallback), and a panel's body never holds more than it shows.
 * - M2: a large panel is wider than a medium one. M11: a small panel's header never draws over its body.
 * - M5: water with nothing logged today is "—" with its reason. M8: a brand-new NOVA opens on the instruments, and an empty
 *   one is the instrument unlit. m9: Left/Right on a grip changes column and the status line says where.
 */
test.skip(({isMobile}) => isMobile, 'computer layout: runs in the desktop project');
test.use({timezoneId: 'Europe/Brussels'});

async function showcaseNova(page: Page) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto('/app/settings'); await hydrated(page);
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await page.goto('/app/nova'); await hydrated(page);
  await expect(frame(page)).toHaveAttribute('data-look', 'holo');
  await expect(frame(page)).toHaveAttribute('data-opening', 'done', {timeout: 10_000});
  // The panels' arrival is finite: measure once it is over.
  await frame(page).evaluate(el => Promise.all(el.getAnimations({subtree: true}).filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => undefined))));
}
/** Every Holo panel beside the star: fully in the window, its drawings inside it, not cut, and the body holding no more than it shows. */
async function besideTheStar(page: Page) {
  return page.locator('.nova-orbit-main .nova-widget[data-holo]').evaluateAll(els => els.map(el => {
    const p = el.getBoundingClientRect(), body = el.querySelector<HTMLElement>('.nova-widget-body')!;
    const drawings = [...el.querySelectorAll('svg')].filter(s => !s.closest('.holo-orn, .nova-widget-head')).map(s => s.getBoundingClientRect()).filter(r => r.width && r.height);
    const outside = drawings.filter(r => r.left < p.left - 1 || r.right > p.right + 1 || r.top < p.top - 1 || r.bottom > p.bottom + 1).length;
    const html = el as HTMLElement;
    return {id: html.dataset.widget!, fit: html.dataset.fit ?? '', cut: html.dataset.cut !== undefined, inWindow: p.left >= -0.5 && p.top >= -0.5 && p.right <= innerWidth + 0.5 && p.bottom <= innerHeight + 0.5,
      outside, drawings: drawings.length, overflow: body.scrollHeight - body.clientHeight, width: Math.round(p.width), size: html.dataset.size!};
  }));
}

for (const [width, height, least] of [[1440, 900, 3], [1920, 1080, 4]] as const) {
  test(`B1, B2: the Showcase at ${width} × ${height} opens on the HUD, every instrument whole`, async ({page}) => {
    await page.setViewportSize({width, height});
    await page.clock.install({time: NOON});
    await showcaseNova(page);
    // Session AL (deliberate, sweep 2; LA-024 / N-LS-05): NOVA's side panels are named regions inside <main>, no longer complementary landmarks; same element, same name.
    await expect(page.getByRole('region', {name: 'Behind the intelligence'})).toHaveCount(0);
    const panels = await besideTheStar(page);
    expect(panels.filter(p => p.inWindow).length, JSON.stringify(panels)).toBeGreaterThanOrEqual(least);
    for (const p of panels) {
      expect(p.inWindow, `${p.id} in the window`).toBe(true);
      expect(p.outside, `${p.id}: every drawing inside its panel`).toBe(0);
      if (p.fit === 'rows') { expect(p.cut, `${p.id} is not cut`).toBe(false); expect(p.overflow, `${p.id}: nothing hidden under its edge`).toBeLessThanOrEqual(1); }
    }
    for (const id of ['health-hud', 'habits-hud', 'goals-hud', 'wealth-hud']) expect(panels.map(p => p.id), id).toContain(id);
    // The Goals pace line and its projection's names are in view at the medium size (they never showed before).
    const goals = panel(page, 'Goals HUD');
    if (await goals.locator('.holo-pace-chart').count()) await expect(goals.locator('.holo-pace-chart svg')).toBeInViewport({ratio: 1});
    // The core's readout and the words under the orb clear the command field; NOVA's name and state clear the rings.
    const foot = (await page.locator('.nova-foot').boundingBox())!;
    for (const sel of ['.holo-core-readout', '.nova-greeting', '.nova-dayline']) {
      const b = (await page.locator(sel).boundingBox())!;
      expect(b.y + b.height, `${sel} above the command field`).toBeLessThanOrEqual(foot.y + 0.5);
    }
    const rings = (await page.locator('.holo-core').boundingBox())!, name = (await page.locator('.nova-name').boundingBox())!, state = (await page.locator('.nova-orb-state').boundingBox())!;
    expect(name.y + name.height, 'NOVA’s name above the rings').toBeLessThanOrEqual(rings.y + 1);
    expect(state.y, 'the state under the rings').toBeGreaterThanOrEqual(rings.y + rings.height - 1);
    await expect(page.getByRole('list', {name: 'Today’s core'}).locator('li')).toHaveCount(4);
  });
}

test('M2: on the Health HUD preset the large panel is a wide hero, its histogram whole', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: NOON});
  await showcaseNova(page);
  await page.getByRole('button', {name: /View controls/}).click();
  await page.getByRole('group', {name: 'HUD presets'}).getByRole('button', {name: /^Health HUD/}).click();
  await page.keyboard.press('Escape');
  await expect(panel(page, 'Health HUD')).toHaveAttribute('data-size', 'L');
  const panels = await besideTheStar(page), hero = panels.find(p => p.id === 'health-hud')!, medium = panels.find(p => p.size === 'M');
  expect(hero.inWindow).toBe(true);
  expect(hero.outside).toBe(0);
  expect(hero.overflow).toBeLessThanOrEqual(1);
  if (medium) expect(hero.width, 'L is wider than M').toBeGreaterThan(medium.width + 40);
  await expect(panel(page, 'Health HUD').locator('.holo-histo-days small')).toHaveCount(7);
  await expect(panel(page, 'Health HUD').locator('.holo-histo-days')).toBeInViewport({ratio: 1});
});

test('M11, M5: a small panel\'s header never covers its body; water with nothing logged is "—" with its reason', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: NOON});
  await freshNova(page, {waterTarget: true});
  const small = await page.locator('.nova-widget[data-holo][data-size=S]').evaluateAll(els => els.map(el => {
    const head = el.querySelector('.nova-widget-head')!.getBoundingClientRect(), body = el.querySelector('.nova-widget-body')!.getBoundingClientRect();
    // Session AL L8e (spec cause): a small panel may rest on the outer band below the fold (the stage area scrolls), where
    // elementFromPoint finds the command bar or nothing; bring the link into its scroller's view before asking what is on top.
    const link = el.querySelector<HTMLElement>('.nova-widget-open');
    link?.scrollIntoView({block: 'nearest', inline: 'nearest'});
    const r = link?.getBoundingClientRect();
    const hit = r && r.width ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
    return {id: (el as HTMLElement).dataset.widget, headBottom: head.bottom, bodyTop: body.top, oneLine: head.height <= 30, linkOnTop: !r || !r.width || (!!hit && (hit === link || link!.contains(hit))), name: link?.getAttribute('aria-label') ?? ''};
  }));
  expect(small.length).toBeGreaterThan(0);
  for (const s of small) {
    expect(s.oneLine, `${s.id}: its header is one line`).toBe(true);
    expect(s.headBottom, `${s.id}: the header ends before the body`).toBeLessThanOrEqual(s.bodyTop + 0.5);
    expect(s.linkOnTop, `${s.id}: nothing covers its link`).toBe(true);
    expect(s.name, `${s.id}: the arrow keeps its name`).toMatch(/^Open /);
  }
  const water = panel(page, 'Water');
  await expect(water.locator('.holo-num-big')).toHaveText('—');
  await expect(water.locator('.holo-big-line')).toHaveText('— of 2,000 mL');
  await expect(water.locator('.holo-meter')).toContainText('No water logged yet today');
});

test('M8: a brand-new NOVA opens on the instruments; an empty instrument is drawn unlit with its reason, never a zero', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: NOON});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  // No NOVA record at all on this device (Motion Off, so the opening does not play and the stage shows at once).
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); localStorage.setItem('zigoals:motion:v1', 'off'); });
  await page.goto('/app/nova'); await hydrated(page);
  await expect(frame(page)).toHaveAttribute('data-look', 'holo');
  await expect(panel(page, 'Health HUD')).toBeVisible();
  await expect.poll(async () => ((await storedJson(page, NOVA_KEY))?.widgets ?? []).slice(0, 4).map((w: {id: string}) => w.id)).toEqual(['health-hud', 'habits-hud', 'goals-hud', 'wealth-hud']);
  for (const name of ['Habits HUD', 'Goals HUD', 'Wealth HUD']) {
    const empty = panel(page, name).locator('.holo-empty');
    await expect(empty, name).toBeVisible();
    await expect(empty.locator('.holo-empty-shape'), name).toContainText('—');
    await expect(empty.locator('.holo-empty-shape'), name).toHaveAttribute('aria-hidden', 'true');
    await expect(empty.locator('.holo-empty-action'), name).toBeVisible();
  }
  await expect(panel(page, 'Health HUD').locator('.holo-num-ring')).toHaveText('—');
  // m14: the shared reason is said once, under the ring.
  await expect(panel(page, 'Health HUD').locator('.holo-meters').getByText('No meals logged today')).toHaveCount(1);
});

test('m9: Left/Right on a grip move a panel to the other column, and the status line says where it is', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: NOON});
  await freshNova(page, {preset: 'command'});
  await page.getByRole('button', {name: /View controls/}).click();
  await page.getByRole('button', {name: 'Arrange on the orbits'}).click();
  // Session AL L8e (spec cause): React writes `data-editing={true}` as "true", never "" (so `''` could not match); the
  // CSS keys on the attribute's presence, and so does this check.
  await expect(frame(page)).toHaveAttribute('data-editing');
  const grip = page.getByRole('button', {name: /^Move Health HUD: drag/});
  await expect(grip).toBeVisible();
  await grip.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => ((await storedJson(page, NOVA_KEY))?.widgets ?? []).slice(0, 2).map((w: {id: string}) => w.id)).toEqual(['habits-hud', 'health-hud']);
  await expect(page.locator('.nova-frame > p[role=status]')).toHaveText(/Health HUD is now 2 of \d+, right column\./);
  await expect(page.locator('.nova-orbit-side[data-side=right] [data-widget="health-hud"]')).toBeVisible();
});
