import {expect, test, type Page} from '@playwright/test';
import {hydrated} from '../../ah-helpers';
import {NOON, NOVA_KEY, panel} from './hud-helpers';

/**
 * Session AL Part 11, second pass (lane L8): the reference image's elements on the Showcase's NOVA, each on real data with
 * its words and table, and every ornament hidden from assistive technology (AL_SCOPE B). 1440 and 1920, Full motion, Brussels.
 * Review fixes (lane L8d): the Showcase opens on the Command preset (medium instruments beside the star); the large
 * instruments (the week's histogram, the framed wave, the purpose ribbons, the dot sliders) are checked on the Health HUD
 * and Wealth HUD presets, applied from View controls as a person would; the lens ring is the core's alone (review p3).
 */
test.skip(({isMobile}) => isMobile, 'computer layout: runs in the desktop project (the phone column is hud-look (f))');
test.use({timezoneId: 'Europe/Brussels'});

async function showcaseNova(page: Page) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto('/app/settings'); await hydrated(page);
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  // Keep the Showcase's own NOVA (its widgets); only mark the opening seen so the stage shows at once.
  await page.evaluate(k => { const r = JSON.parse(localStorage.getItem(k) ?? '{"version":1}'); localStorage.setItem(k, JSON.stringify({...r, openingSeen: true})); }, NOVA_KEY);
  await page.goto('/app/nova'); await hydrated(page);
  await expect(page.locator('.nova-frame[data-look=holo]')).toBeVisible();
  await expect(page.locator('.nova-frame')).toHaveAttribute('data-opening', 'done', {timeout: 10_000});
}
/** Applies a HUD preset from View controls (Undo is offered in the toast; the spec keeps the preset). */
async function preset(page: Page, name: RegExp) {
  await page.getByRole('button', {name: /View controls/}).click();
  await page.getByRole('group', {name: 'HUD presets'}).getByRole('button', {name}).click();
  await page.keyboard.press('Escape');
}

for (const [width, height] of [[1440, 900], [1920, 1080]] as const) {
  test(`Showcase ${width}: the HUD instruments, the core and the ornaments (each on real data, each with its words)`, async ({page}) => {
    await page.setViewportSize({width, height});
    await page.clock.install({time: NOON});
    await showcaseNova(page);
    await expect(page.getByText('Showcase · fictional example data')).toBeVisible();

    // The core: four segmented pillar rings around the orb, a lens ring, and the stacked neon bar meters in words.
    await expect(page.locator('.nova-orb-button .holo-core .holo-stack-box')).toBeAttached();
    await expect(page.locator('.nova-orb-button .holo-core-lens')).toBeAttached();
    // Session AM (calm stage, deliberate): on a set stage the core's four read-outs show only where the stage is wider than
    // 1240 px (components/nova/holo/holo-parts.css); at 1440 with the left bar open it is 1,164 px, so they are in the
    // page (four, each with its bar) but not shown, and at 1920 they are shown and read as a list, as before.
    const core = page.locator('.holo-core-readout[aria-label="Today’s core"]');
    await expect(core.locator('li')).toHaveCount(4);
    await expect(core.locator('li .holo-core-bar')).toHaveCount(4);
    if (width >= 1920) { await expect(page.getByRole('list', {name: 'Today’s core'})).toBeVisible(); await expect(page.getByRole('list', {name: 'Today’s core'}).getByRole('listitem')).toHaveCount(4); }
    else { await expect(core).toBeHidden(); await expect(page.getByRole('list', {name: 'Today’s core'})).toHaveCount(0); }

    // Health (medium, beside the star): the kcal ring and its meters, each with its target in words, and its table.
    const health = panel(page, 'Health HUD');
    await expect(health.locator('.holo-ring')).toBeVisible();
    await expect(health.locator('.holo-meter').first()).toBeVisible();
    await expect(health.locator('table')).toContainText('Calories');

    // Wealth (medium): the framed wave says what it is — recorded valuations, max and min, its dates — never "Latest".
    const wealth = panel(page, 'Wealth HUD');
    const wave = wealth.locator('.holo-wave');
    await expect(wave).toBeVisible();
    await expect(wave.locator('.holo-frame-label')).toHaveCount(4);
    await expect(wave.locator('.holo-frame-label[data-at=title]')).toHaveText('Recorded valuations');
    await expect(wave.locator('.holo-frame-label[data-at=top]')).toContainText('max');
    await expect(wave.locator('.holo-frame-label[data-at=bottom]')).toContainText('min');
    await expect(wave).not.toContainText('Latest');
    await expect(wealth.locator('table')).toContainText('Over time');

    // Goals: arcs; where the lead goal has a pace chart, it names Target and Today in place.
    const goals = panel(page, 'Goals HUD');
    await expect(goals.locator('.holo-arcs li').first()).toBeVisible();
    if (await goals.locator('.holo-pace-chart').count()) {
      await expect(goals.locator('.holo-chart-tag[data-at=target]')).toHaveText('Target');
      await expect(goals.locator('.holo-chart-tag[data-at=today]')).toHaveText('Today');
    }

    // Habits (segmented orbit rings), the Agenda clock (its hours in words) and every instrument's table.
    await expect(panel(page, 'Habits HUD').locator('.holo-stack-box')).toBeVisible();
    await expect(panel(page, 'Agenda clock').locator('.holo-dial-hour')).toHaveCount(4);
    for (const name of ['Health HUD', 'Habits HUD', 'Goals HUD', 'Wealth HUD', 'Agenda clock']) await expect(panel(page, name).locator('table caption'), name).toHaveCount(1);
    // Review p3: the lens ring is the core's alone.
    await expect(page.locator('.nova-widget .holo-lens')).toHaveCount(0);

    // Ornaments are ornaments: never exposed, never focusable; the large panels carry the left ruler.
    const exposed = await page.locator('.holo-orn, .holo-lens, .holo-ruler, .holo-brackets, .holo-frame, .holo-histo, .holo-flow-ribbons, .holo-stack-box, .holo-floor, .holo-empty-shape').evaluateAll(els => els.filter(el => !el.closest('[aria-hidden="true"]')).map(el => el.className));
    expect(exposed).toEqual([]);

    // The large instruments, on the presets that make them heroes.
    await preset(page, /^Health HUD/);
    const big = panel(page, 'Health HUD');
    await expect(big).toHaveAttribute('data-size', 'L');
    await expect(big.locator('.holo-histo')).toBeVisible();
    await expect(big.locator('.holo-histo .holo-bar').first()).toBeAttached();
    await expect(big).toContainText('This week · kcal');
    await expect(big).toContainText('line: your target, 2,200 kcal');
    await expect(big.locator('.holo-histo-line-tag')).toHaveText('2,200');
    await expect(big.locator('.holo-hearts .holo-heart-pct').first()).toContainText('%');
    await expect(big.locator('.holo-ruler')).toBeAttached();
    // The large panel glows magenta at its edge (the reference's tilted panel): on its tilted back-plate (review m13).
    // Session AM (D-frames, deliberate): the back-plate now has cut corners (a clip-path would cut a shadow off), so the
    // magenta glow sits on the panel's own glow layer behind the plate; the same colour is asserted there, and the layer shows.
    const aura = big.locator('> .holo-aura');
    await expect(aura).toBeVisible();
    expect(await aura.evaluate(el => getComputedStyle(el).boxShadow)).toMatch(/240, 109, 255|f06dff/i);
    expect(await big.evaluate(el => getComputedStyle(el).transform)).toBe('none');
    await preset(page, /^Wealth HUD/);
    const money = panel(page, 'Wealth HUD');
    await expect(money).toHaveAttribute('data-size', 'L');
    await expect(money.locator('.holo-flow-ribbons')).toBeVisible();
    await expect(money.locator('.holo-flow-legend')).toContainText('Still available');
    await expect(money.locator('.holo-mix')).toBeVisible();
    // The Goals hero beside it: the pace line and, past the first three goals, the next ones as dot sliders.
    const heroGoals = panel(page, 'Goals HUD');
    await expect(heroGoals).toHaveAttribute('data-size', 'L');
    await expect(heroGoals.getByRole('list', {name: 'More active goals'}).locator('.holo-slider').first()).toBeVisible();
  });
}

test('keyboard: Tab reaches every instrument\'s quick actions and its page link', async ({page}) => {
  test.setTimeout(120_000); // up to 300 Tab presses through the Showcase's panels
  await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: NOON});
  await showcaseNova(page);
  await page.locator('.nova-exit').focus();
  const seen = new Set<string>();
  const names = ['Health HUD', 'Habits HUD', 'Goals HUD', 'Wealth HUD', 'Agenda clock'];
  for (let i = 0; i < 300 && seen.size < 10; i++) {
    await page.keyboard.press('Tab');
    const at = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null, title = el?.closest('article.nova-widget')?.querySelector('h3')?.textContent ?? '';
      return {title, act: el?.classList.contains('holo-act') ?? false, open: el?.classList.contains('nova-widget-open') ?? false};
    });
    if (names.includes(at.title) && at.act) seen.add(`act:${at.title}`);
    if (names.includes(at.title) && at.open) seen.add(`open:${at.title}`);
  }
  expect([...seen].sort()).toEqual(names.flatMap(w => [`act:${w}`, `open:${w}`]).sort());
});
