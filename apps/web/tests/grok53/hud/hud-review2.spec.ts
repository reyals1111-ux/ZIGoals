import {expect, test, type Page} from '@playwright/test';
import {hydrated} from '../../ah-helpers';
import {NOON, frame, freshNova, panel} from './hud-helpers';

/**
 * Session AL lane L8f: guards for the second HUD review's Blocker and Majors (docs/review/session-al/NOVA_HUD_REVIEW_2.md),
 * each at the review's own width and profile (the Showcase loaded from Settings, or a fresh profile), Full motion, Brussels.
 * - B1: the quick-actions sheet's habit rows keep their names, and no button is narrower than its words or taller than 48 px.
 * - M1: nothing on the Goals HUD runs past its panel (the pace chart's "Estimate" tag did, as "Estima"); "Estimate" is said once.
 * - M2: a dial's figure sits inside its ring, its words ("of 2,200 kcal", "of 30 days") under the ring.
 * - M3: at 1280 × 720 the Health targets are whole, the deck is slim and at least three panels are in view.
 * - M4: on an 820 × 1180 tablet the first screen holds a whole panel, and no value runs past its panel.
 * - M5: the outer band's small panels never cut their own buttons (Tasks' "Add", Focus' Pomodoro, the briefs' link).
 * - M6: each goal's percent on NOVA is the Goals page's.
 * - M7: on the Minimal preset the core's readout is on top, never under the panels.
 * - M8: on a phone the first screen shows the core's readout (the HUD's data) above the command field. Session AM (phone,
 *   deliberate): the first screen is now the star, its state, the one-tap requests and the command field; the read-outs are not shown.
 */
test.skip(({isMobile}) => isMobile, 'each case sets the review\'s own viewport (the phone case too); runs in the desktop project');
test.use({timezoneId: 'Europe/Brussels'});

async function showcase(page: Page) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto('/app/settings'); await hydrated(page);
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
}
async function openNova(page: Page) {
  await page.goto('/app/nova'); await hydrated(page);
  await expect(frame(page)).toHaveAttribute('data-look', 'holo');
  await expect(frame(page)).toHaveAttribute('data-opening', 'done', {timeout: 15_000});
  // The panels' arrival is finite: measure once it is over.
  await frame(page).evaluate(el => Promise.all(el.getAnimations({subtree: true}).filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => undefined))));
}
async function preset(page: Page, name: RegExp) {
  await page.getByRole('button', {name: /View controls/}).click();
  await page.getByRole('group', {name: 'HUD presets'}).getByRole('button', {name}).click();
  await page.keyboard.press('Escape');
}
/** What inside a panel lies past its edges (ornaments and screen-reader words aside), in words for a failure. */
const outsideItsPanel = (page: Page, selector: string) => page.locator(selector).evaluateAll(els => els.flatMap(el => {
  const p = el.getBoundingClientRect();
  return [...el.querySelectorAll('*')].filter(c => c.getClientRects().length && !c.closest('.sr-only, table, .holo-orn, .holo-brackets, .holo-sheen, .holo-ruler') && getComputedStyle(c).visibility !== 'hidden')
    .map(c => ({c, r: c.getBoundingClientRect()})).filter(({r}) => r.width > 0 && (r.right > p.right + 1.5 || r.left < p.left - 1.5 || r.bottom > p.bottom + 1.5))
    .map(({c, r}) => `${(el as HTMLElement).dataset.widget}: "${(c.textContent ?? '').trim().slice(0, 30)}" ${Math.round(r.right - p.right)} px right, ${Math.round(r.bottom - p.bottom)} px below`);
}));

test('B1: the quick-actions sheet\'s habit rows keep their names and their buttons whole (Health HUD and Habits HUD, 1440)', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: NOON});
  await showcase(page); await openNova(page);
  for (const name of ['Health HUD', 'Habits HUD']) {
    await panel(page, name).getByRole('button', {name: `Quick actions: ${name}`}).click();
    const sheet = page.getByRole('dialog', {name: `Quick actions · ${name}`});
    await expect(sheet.locator('.holo-action').first()).toBeVisible();
    const rows = await sheet.locator('.holo-habit-list li').evaluateAll(els => els.map(li => {
      const title = li.querySelector('.holo-habit-title')!, t = title.getBoundingClientRect();
      const buttons = [...li.querySelectorAll('button')].map(b => ({words: (b.textContent ?? '').trim(), fits: b.scrollWidth <= b.clientWidth + 1, h: Math.round(b.getBoundingClientRect().height)}));
      return {title: (title.textContent ?? '').trim(), shown: t.width >= 30 && title.scrollWidth <= title.clientWidth + 1, buttons};
    }));
    expect(rows.length, `${name}: its sheet offers habits to tick`).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.shown, `${name}: "${r.title}" keeps its name whole`).toBe(true);
      for (const b of r.buttons) { expect(b.fits, `${name} · ${r.title}: "${b.words}" on one line`).toBe(true); expect(b.h, `${name} · ${r.title}: "${b.words}" is one row high`).toBeLessThanOrEqual(48); }
    }
    // p4: the Health sheet ticks only the habits Health counts (the Showcase links Walk to its steps).
    if (name === 'Health HUD') await expect(sheet.locator('.holo-habit-title', {hasText: 'Read'})).toHaveCount(0);
    await page.keyboard.press('Escape');
  }
});

for (const [width, height] of [[1280, 720], [1440, 900], [1920, 1080]] as const) {
  test(`M1, M2: at ${width} the Goals HUD keeps everything inside it and the dials' figures sit inside their rings`, async ({page}) => {
    await page.setViewportSize({width, height});
    await page.clock.install({time: NOON});
    await showcase(page); await openNova(page);
    const goals = panel(page, 'Goals HUD');
    await goals.scrollIntoViewIfNeeded();
    expect(await outsideItsPanel(page, '.nova-widget[data-widget="goals-hud"]')).toEqual([]);
    if (await goals.locator('.holo-pace-chart').count()) await expect(goals.getByText('Estimate', {exact: true})).toHaveCount(1);
    for (const sel of ['.holo-health .holo-ring', '.holo-habits .holo-dial']) {
      const ring = page.locator(sel).first();
      await ring.scrollIntoViewIfNeeded();
      const g = await ring.evaluate(el => {
        const b = el.getBoundingClientRect(), fig = el.querySelector('.holo-ring-centre .holo-num-ring')!.getBoundingClientRect(), words = el.querySelector('.holo-ring-centre small')?.getBoundingClientRect();
        // The track's inside: 62 % of the kcal ring's width, 66 % of the dial's; the figure's box must fit in it.
        const inner = b.width * (el.classList.contains('holo-dial') ? 0.66 : 0.62), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
        const corner = Math.max(...[[fig.left, fig.top], [fig.right, fig.top], [fig.left, fig.bottom], [fig.right, fig.bottom]].map(([x, y]) => Math.hypot(x! - cx, y! - cy)));
        return {inner, figWidth: fig.width, corner, wordsBelow: !words || words.top >= b.bottom - 1};
      });
      expect(g.figWidth, `${sel}: the figure is narrower than the ring's inside`).toBeLessThanOrEqual(g.inner);
      expect(g.corner, `${sel}: the figure's box stays inside the ring's stroke`).toBeLessThanOrEqual(g.inner / 2 + 6);
      expect(g.wordsBelow, `${sel}: its words sit under the ring`).toBe(true);
    }
  });
}

test('M3: at 1280 × 720 the Health targets are whole, the deck is slim and three panels are in view', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 720});
  await page.clock.install({time: NOON});
  await showcase(page); await openNova(page);
  expect(await outsideItsPanel(page, '.nova-widget[data-widget="health-hud"]')).toEqual([]);
  const values = await panel(page, 'Health HUD').locator('.holo-meter-value').evaluateAll(els => els.map(e => ({text: (e.textContent ?? '').trim(), fits: e.scrollWidth <= e.clientWidth + 1})));
  for (const v of values) expect(v.fits, `"${v.text}" whole`).toBe(true);
  expect((await page.locator('.nova-deck').boundingBox())!.height, 'the deck is one or two slim rows').toBeLessThanOrEqual(100);
  const foot = (await page.locator('.nova-foot').boundingBox())!;
  const inView = await page.locator('.nova-widget[data-holo]').evaluateAll((els, footTop) => els.filter(el => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= footTop + 1 && r.left >= 0 && r.right <= innerWidth; }).length, foot.y);
  expect(inView, 'panels wholly in view').toBeGreaterThanOrEqual(3);
});

test('M4: an 820 × 1180 tablet opens on the HUD — a whole panel on the first screen, no value past its panel', async ({page}) => {
  await page.setViewportSize({width: 820, height: 1180});
  await page.clock.install({time: NOON});
  await showcase(page); await openNova(page);
  await expect(frame(page)).not.toHaveAttribute('data-left', 'open');
  const foot = (await page.locator('.nova-foot').boundingBox())!;
  const first = await page.locator('.nova-widget[data-holo]').first().boundingBox();
  expect(first, 'a panel is drawn').not.toBeNull();
  expect(first!.y + first!.height, 'the first panel is whole above the command field').toBeLessThanOrEqual(foot.y + 1);
  expect(await outsideItsPanel(page, '.nova-widget[data-holo]')).toEqual([]);
});

test('M5: the outer band\'s small panels never cut their own buttons (fresh profile, 1440)', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: NOON});
  await freshNova(page, {preset: 'command', waterTarget: true});
  await page.locator('.nova-stage-area').evaluate(el => { el.scrollTop = el.scrollHeight; });
  const band = await page.locator('.nova-orbit-band .nova-widget[data-holo]').evaluateAll(els => els.map(el => {
    const p = el.getBoundingClientRect(), body = el.querySelector('.nova-widget-body') as HTMLElement;
    const cut = [...el.querySelectorAll('a, button, input')].filter(c => c.getClientRects().length && !c.closest('.nova-widget-head')).map(c => ({c, r: c.getBoundingClientRect()})).filter(({r}) => r.bottom > p.bottom + 1 || r.right > p.right + 1).map(({c}) => (c.textContent || c.getAttribute('aria-label') || '').trim().slice(0, 40));
    return {id: (el as HTMLElement).dataset.widget, cut, hidden: body.scrollHeight - body.clientHeight};
  }));
  expect(band.map(b => b.id)).toEqual(expect.arrayContaining(['tasks', 'focus', 'briefs']));
  for (const b of band) { expect(b.cut, `${b.id}: every control inside its panel`).toEqual([]); expect(b.hidden, `${b.id}: nothing under its edge`).toBeLessThanOrEqual(1); }
});

test('M6: each goal\'s percent on NOVA is the Goals page\'s (Showcase, 1440)', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: NOON});
  await showcase(page); await openNova(page);
  const arcs = await panel(page, 'Goals HUD').locator('.holo-arcs li').evaluateAll(els => els.map(li => ({name: li.querySelector('a')?.getAttribute('title') ?? '', text: (li.querySelector('.holo-num-arc')?.textContent ?? '').trim()})));
  expect(arcs.length).toBeGreaterThan(0);
  await page.goto('/app/goals'); await hydrated(page);
  for (const a of arcs) {
    const ring = page.getByRole('progressbar', {name: `${a.name} progress`}).first();
    await expect(ring, a.name).toBeVisible();
    const onGoals = (await ring.innerText()).replace(/\s+/g, '');
    expect(a.text.replace(/\s+/g, ''), `${a.name}: NOVA and Goals`).toBe(onGoals);
  }
});

test('M7: on the Minimal preset the core\'s readout is on top, whole above the three panels (Showcase, 1920; not shown at 1440)', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: NOON});
  await showcase(page); await openNova(page);
  await preset(page, /^Minimal/);
  await expect(page.locator('.nova-focus-row > .nova-widget')).toHaveCount(3);
  const readout = page.locator('.holo-core-readout');
  // Session AM (calm stage, deliberate): on a set stage the core's read-outs show only where the stage is wider than
  // 1240 px (components/nova/holo/holo-parts.css); at 1440 with the left bar open it is 1,164 px, so they are not shown
  // (and so never under the panels). Where they are shown (1920 × 1080), they are on top and whole above the three panels.
  await expect(readout).toBeHidden();
  await page.setViewportSize({width: 1920, height: 1080});
  await expect(page.locator('.nova-focus-row > .nova-widget')).toHaveCount(3);
  await expect(readout).toBeVisible();
  const covered = await readout.evaluate(ro => { const b = ro.getBoundingClientRect(); return [[b.left + 12, b.top + 6], [b.right - 12, b.top + 6], [b.left + 12, b.bottom - 3], [b.right - 12, b.bottom - 3]].map(([x, y]) => document.elementFromPoint(x!, y!)).filter(h => h && !ro.contains(h) && !ro.closest('.nova-stage')!.contains(h)).map(h => (h as HTMLElement).className); });
  expect(covered, 'nothing lies over the readout').toEqual([]);
  const row = (await page.locator('.nova-focus-row').boundingBox())!, box = (await readout.boundingBox())!;
  expect(box.y + box.height, 'the readout ends above the panels').toBeLessThanOrEqual(row.y + 1);
});

test('M8: a phone\'s first screen is the star, its state, the one-tap requests and the command field; the panels follow under it (Showcase, 390 × 844)', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.clock.install({time: NOON});
  await showcase(page); await openNova(page);
  await expect(frame(page)).toHaveAttribute('data-phone', 'true');
  // Session AM (phone, deliberate): a phone's first screen is the star, its state, the one-tap requests and the command
  // field; the core's four read-outs are not shown on a phone any more (components/nova/holo/holo-parts.css), and the
  // app's bottom tab bar gives its row to NOVA. Each of the four is whole on the first screen, the star and its state
  // above the foot, the requests above the command field.
  await expect(page.locator('.holo-core-readout')).toBeHidden();
  await expect(page.locator('.phone-tabbar')).toBeHidden();
  const foot = (await page.locator('.nova-foot').boundingBox())!;
  const first: Record<string, {x: number; y: number; width: number; height: number}> = {};
  for (const sel of ['.nova-orb-button', '.nova-orb-state', '.ns-strip', '.nova-command']) {
    await expect(page.locator(sel), sel).toBeVisible();
    const b = (await page.locator(sel).boundingBox())!; first[sel] = b;
    expect(b.y, `${sel} starts on the first screen`).toBeGreaterThanOrEqual(0);
    expect(b.y + b.height, `${sel} is whole on the first screen`).toBeLessThanOrEqual(844 + 0.5);
    expect(b.x, `${sel} left`).toBeGreaterThanOrEqual(0); expect(b.x + b.width, `${sel} right`).toBeLessThanOrEqual(390 + 0.5);
  }
  expect(first['.nova-orb-button']!.y + first['.nova-orb-button']!.height, 'the star is above its state').toBeLessThanOrEqual(first['.nova-orb-state']!.y + 1);
  expect(first['.nova-orb-state']!.y + first['.nova-orb-state']!.height, 'the star\'s state is whole above the foot').toBeLessThanOrEqual(foot.y + 1);
  expect(first['.ns-strip']!.y + first['.ns-strip']!.height, 'the one-tap requests are above the command field').toBeLessThanOrEqual(first['.nova-command']!.y + 1);
  // The page scrolls as one: the panels follow under the star.
  await page.locator('.nova-centre').evaluate(el => { el.scrollTop = 600; });
  await expect(page.locator('.holo-phone-column .nova-widget').first()).toBeInViewport();
});
