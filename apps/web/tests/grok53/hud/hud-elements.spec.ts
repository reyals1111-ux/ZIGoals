import {expect, test, type Page} from '@playwright/test';
import {hydrated} from '../../ah-helpers';
import {NOON, NOVA_KEY, panel} from './hud-helpers';

/**
 * Session AL Part 11, second pass (lane L8): the reference image's elements on the Showcase's NOVA, each on real data with
 * its words and table, and every ornament hidden from assistive technology (AL_SCOPE B). The Showcase now puts the five
 * HUD instruments beside the star (lib/nova/store.ts showcaseNova). 1440 and 1920, Full motion, Brussels.
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
    const core = page.getByRole('list', {name: 'Today’s core'});
    await expect(core.locator('li')).toHaveCount(4);
    await expect(core.locator('li .holo-core-bar')).toHaveCount(4);

    // Health: the kcal ring with its lens, the meters, and the week's calories with the target as the line through them.
    const health = panel(page, 'Health HUD');
    await expect(health.locator('.holo-histo')).toBeVisible();
    await expect(health.locator('.holo-histo .holo-bar').first()).toBeAttached();
    await expect(health).toContainText('This week · kcal');
    await expect(health).toContainText('line: your target, 2,200 kcal');
    await expect(health.locator('table')).toContainText('Calories');

    // Wealth: the framed amber wave with its four labels, and the purpose flow's ribbons with their legend.
    const wealth = panel(page, 'Wealth HUD');
    const wave = wealth.locator('.holo-wave');
    await expect(wave).toBeVisible();
    await expect(wave.locator('.holo-frame-label')).toHaveCount(4);
    await expect(wealth.locator('table')).toContainText('Over time');
    await expect(wealth.locator('.holo-flow-ribbons')).toBeVisible();
    await expect(wealth.locator('.holo-flow-legend')).toContainText('Still available');

    // Goals: arcs; where the lead goal has a pace chart, it names Target and Today in place.
    const goals = panel(page, 'Goals HUD');
    await expect(goals.locator('.holo-arcs li').first()).toBeVisible();
    if (await goals.locator('.holo-pace-chart').count()) {
      await expect(goals.locator('.holo-chart-tag[data-at=target]')).toHaveText('Target');
      await expect(goals.locator('.holo-chart-tag[data-at=today]')).toHaveText('Today');
    }

    // Habits (segmented orbit rings), the Agenda clock (lens bezel) and every instrument's table for assistive technology.
    await expect(panel(page, 'Habits HUD').locator('.holo-stack-box')).toBeVisible();
    await expect(panel(page, 'Agenda clock').locator('.holo-lens')).toBeAttached();
    for (const name of ['Health HUD', 'Habits HUD', 'Goals HUD', 'Wealth HUD', 'Agenda clock']) await expect(panel(page, name).locator('table caption'), name).toHaveCount(1);

    // Ornaments are ornaments: never exposed, never focusable; the large panels carry the left ruler.
    const exposed = await page.locator('.holo-orn, .holo-lens, .holo-ruler, .holo-brackets, .holo-frame, .holo-histo, .holo-flow-ribbons, .holo-stack-box').evaluateAll(els => els.filter(el => !el.closest('[aria-hidden="true"]')).map(el => el.className));
    expect(exposed).toEqual([]);
    await expect(health.locator('.holo-ruler')).toBeAttached();
    // The large panels glow magenta at their edge (the reference's tilted panel), beside the star.
    expect(await health.evaluate(el => getComputedStyle(el).boxShadow)).toMatch(/240, 109, 255|f06dff/i);
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
