import {expect, test, type Page} from '@playwright/test';
import {DEFAULT_WIDGETS} from '../../../lib/nova/store';
import {NOVA_HUD_KEY, presetWidgets} from '../../../lib/nova/layout';
import {NOON, NOVA_KEY, frame, freshNova, panel, storedJson} from './hud-helpers';

/**
 * Session AL Part 11 (lane L8), specs (d), (e) and (f): Light keeps NOVA's HUD a dark island (Light's dark-islands rule;
 * the same panels and night tokens as Nebula and Dark, figures ≥ 4.5:1); arranging and the presets work from the keyboard
 * alone, with Undo, and the look switches between Holo and Classic (device-only record); and a 390 px phone shows the
 * same Holo panels in one column, with the lighter effects.
 */
test.use({timezoneId: 'Europe/Brussels'});

const lum = (rgb: string) => { const [r, g, b] = (rgb.match(/[\d.]+/g) ?? ['0', '0', '0']).slice(0, 3).map(Number).map(c => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!; };
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x! + 0.05) / (y! + 0.05); };
async function islandColours(page: Page) {
  return page.evaluate(() => {
    const css = (el: Element | null, prop: string) => el ? getComputedStyle(el).getPropertyValue(prop) : '';
    const f = document.querySelector('.nova-frame'), p = document.querySelector('.nova-widget[data-holo]'), n = document.querySelector('.nova-widget[data-holo] .holo-num'), h = document.querySelector('.nova-widget[data-holo] .nova-widget-head h3');
    return {theme: document.documentElement.dataset.theme ?? '', frameBg: css(f, 'background-color'), border: css(p, 'border-top-color'), figure: css(n, 'color'), title: css(h, 'color')};
  });
}

test.describe('computer', () => {
  // The mobile project emulates a phone; these check the computer layout (arranging is offered on computers only, owner
  // rule: NOVA stays simplified on phones), which the desktop project runs. The phone column is checked below, in both.
  test.skip(({isMobile}) => isMobile, 'computer layout: runs in the desktop project');
  test.use({viewport: {width: 1440, height: 900}});

  test('(d) Light keeps the HUD a dark island, alike in Nebula and Dark; figures read ≥ 4.5:1 without their glow', async ({page}) => {
    await page.clock.install({time: NOON});
    const seen: Record<string, Awaited<ReturnType<typeof islandColours>>> = {};
    for (const theme of [undefined, 'dark', 'light'] as const) {
      await freshNova(page, {preset: 'command', waterTarget: true, ...(theme ? {theme} : {})});
      await expect(frame(page)).toHaveAttribute('data-look', 'holo');
      await expect(page.locator('.nova-widget[data-holo] .holo-num').first()).toBeVisible();
      seen[theme ?? 'nebula'] = await islandColours(page);
    }
    expect(seen.light!.theme).toBe('light');
    for (const [name, c] of Object.entries(seen)) {
      expect(lum(c.frameBg), `${name}: the night sky behind the HUD`).toBeLessThan(0.02);
      expect(ratio(c.figure, c.frameBg), `${name}: a figure on the night glass`).toBeGreaterThanOrEqual(4.5);
      expect(ratio(c.title, c.frameBg), `${name}: a panel title`).toBeGreaterThanOrEqual(4.5);
    }
    // Parity: the panels themselves are the same neon in every theme.
    expect(seen.light!.border).toBe(seen.nebula!.border);
    expect(seen.dark!.border).toBe(seen.nebula!.border);
    expect(seen.light!.figure).toBe(seen.nebula!.figure);
  });

  test('(e) presets and arranging from the keyboard alone, with Undo; the look switches Holo ↔ Classic and is remembered', async ({page}) => {
    await page.clock.install({time: NOON});
    await freshNova(page);
    const order = async () => ((await storedJson(page, NOVA_KEY))?.widgets ?? DEFAULT_WIDGETS).map((w: {id: string}) => w.id);
    await page.getByRole('button', {name: /View controls/}).focus();
    await page.keyboard.press('Enter');
    const presets = page.getByRole('group', {name: 'HUD presets'});
    await presets.getByRole('button', {name: /^Command/}).focus();
    await page.keyboard.press('ArrowRight');
    await expect(presets.getByRole('button', {name: /^Health HUD/})).toBeFocused();
    await page.keyboard.press('Enter');
    await expect.poll(order).toEqual(presetWidgets('health').map(w => w.id));
    await expect(presets.getByRole('button', {name: /^Health HUD/})).toHaveAttribute('aria-pressed', 'true');
    await expect(panel(page, 'Health HUD')).toBeVisible();
    expect((await storedJson(page, NOVA_HUD_KEY))?.preset).toBe('health');
    await page.locator('.aa-toast').getByRole('button', {name: /^Undo/}).focus();
    // Session AL second pass (production-build result; app fix in nova-command.tsx): the menu closes when the keyboard's
    // focus leaves it, so it never stays open over the toast the focus moved to.
    const view = page.getByRole('button', {name: /View controls/});
    await expect(view).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Enter');
    await expect.poll(order).toEqual(DEFAULT_WIDGETS.map(w => w.id));
    // Arrange with the keyboard: the grip's arrow keys move a panel one place.
    await view.focus();
    await page.keyboard.press('Enter');
    await expect(view).toHaveAttribute('aria-expanded', 'true');
    await page.getByRole('button', {name: 'Arrange on the orbits'}).focus();
    await page.keyboard.press('Enter');
    // Session AL L8c: the closing menu hands the focus back to its button one frame later. Wait for it, so the grip's focus
    // below is not taken back by that frame (the race failed this step about one run in two on the production build).
    await expect(view).toBeFocused();
    await expect(view).toHaveAttribute('aria-expanded', 'false');
    const before = await order();
    await page.getByRole('button', {name: /^Move Water: drag/}).focus();
    await page.keyboard.press('ArrowUp');
    await expect.poll(async () => (await order()).indexOf('water')).toBe(before.indexOf('water') - 1);
    await page.getByRole('article', {name: 'Water'}).getByRole('group', {name: 'Size of Water'}).getByRole('button', {name: 'Medium'}).press('Enter');
    await expect(page.getByRole('article', {name: 'Water'})).toHaveAttribute('data-size', 'M');
    await page.keyboard.press('Escape');
    await expect(frame(page)).not.toHaveAttribute('data-editing', '');
    // The look: Classic, remembered on this device; and back to Holo.
    await page.getByRole('button', {name: 'Customize the view'}).focus();
    await page.keyboard.press('Enter');
    const sheet = page.getByRole('dialog', {name: 'Make NOVA yours'}), looks = sheet.getByRole('group', {name: 'Widget look'});
    await looks.getByRole('button', {name: /^Classic/}).focus();
    await page.keyboard.press('Enter');
    await expect(frame(page)).toHaveAttribute('data-look', 'classic');
    await expect(page.locator('.nova-widget[data-holo]')).toHaveCount(0);
    expect((await storedJson(page, NOVA_HUD_KEY))?.look).toBe('classic');
    await page.keyboard.press('ArrowLeft');
    await expect(looks.getByRole('button', {name: /^Holo/})).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(frame(page)).toHaveAttribute('data-look', 'holo');
  });

  test('every Holo panel has its name, its quick actions and a visible focus', async ({page}) => {
    await page.clock.install({time: NOON});
    await freshNova(page, {preset: 'command', waterTarget: true});
    for (const name of ['Health HUD', 'Habits HUD', 'Goals HUD', 'Wealth HUD', 'Agenda clock', 'Tasks', 'Today’s orbit', 'Notes inbox']) {
      const p = panel(page, name);
      await expect(p, name).toBeVisible();
      const act = p.getByRole('button', {name: `Quick actions: ${name}`});
      await act.focus();
      expect(await act.evaluate(el => getComputedStyle(el).outlineStyle), `${name}: visible focus`).not.toBe('none');
    }
    await expect(panel(page, 'Health HUD').locator('table caption')).toHaveText('Health today, against your targets');
    await expect(page.getByRole('list', {name: 'Today’s core'})).toBeVisible();
  });
});

test.describe('phone', () => {
  test.use({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
  test('(f) 390 px: the same Holo panels in one column, lighter (no blur stacks, no shimmer, no tilt), no side scroll', async ({page}) => {
    await page.clock.install({time: NOON});
    await freshNova(page, {preset: 'command', waterTarget: true});
    await expect(page.locator('.holo-phone-column')).toBeVisible();
    const boxes = await page.locator('.holo-phone-column > .nova-widget').evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return {id: (el as HTMLElement).dataset.widget, x: Math.round(r.x), w: Math.round(r.width), blur: s.backdropFilter, transform: s.transform}; }));
    expect(boxes.map(b => b.id)).toEqual(presetWidgets('command').map(w => w.id));
    expect(new Set(boxes.map(b => b.x)).size, 'one column').toBe(1);
    expect(new Set(boxes.map(b => b.w)).size, 'one width').toBe(1);
    for (const b of boxes) { expect(b.blur, `${b.id}: no backdrop blur on a phone`).toBe('none'); expect(b.transform, `${b.id}: no tilt`).toBe('none'); }
    expect(await page.locator('.holo-sheen').evaluateAll(els => els.filter(el => getComputedStyle(el).display !== 'none').length)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    await expect(page.locator('.nova-orb-button')).toBeVisible();
  });
});
