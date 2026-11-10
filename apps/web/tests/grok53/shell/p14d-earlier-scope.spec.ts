import {expect, test, type Page} from '@playwright/test';
import {hydrated, loadShowcase} from '../../ah-helpers';
import {applyTheme, axe} from '../../p6-helpers';
import {chooseChain} from '../../chain-choice';

/**
 * Session AL Part 14, lane P14-D (earlier-scope rows of L1 and L10a, and late requests). Each test names its row and ids.
 * Written to fail on main where the row was open, and to prove the "already fixed" rows in the bot's conditions.
 */
const desktopOnly = (isMobile: boolean) => test.skip(isMobile, 'A computer window');
async function ready(page: Page, path: string) {
  await page.goto(path); await hydrated(page);
  await expect(page.locator('.workspace')).not.toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('main h1').first()).toBeVisible();
}
const overlap = (a: {x: number; y: number; width: number; height: number}, b: {x: number; y: number; width: number; height: number}) =>
  a.x < b.x + b.width - 1 && b.x < a.x + a.width - 1 && a.y < b.y + b.height - 1 && b.y < a.y + a.height - 1;

test.describe('N-LS-01 (P-LS-69): Quick add on a computer', () => {
  for (const width of [1280, 1600]) {
    test(`N-LS-01: at ${width} px every page has one visible, keyboard-reachable "+ Quick add"; the sidebar is unchanged`, async ({page, isMobile}) => {
      desktopOnly(isMobile);
      await page.setViewportSize({width, height: 900});
      for (const path of ['/app/goals', '/app/wealth', '/app/settings', '/app/habits', '/app']) {
        await ready(page, path);
        const quick = page.getByRole('button', {name: '+ Quick add', exact: true});
        await expect(quick, path).toHaveCount(1);
        await expect(quick, path).toBeVisible();
        // The PROTECTED sidebar keeps its own copy hidden (brand-nav-polish, run10-shared-visuals).
        await expect(page.locator('.app-sidebar .quick-add-trigger')).toBeHidden();
      }
      // Keyboard: Tab reaches it and Enter opens the sheet; Escape gives the focus back.
      await ready(page, '/app/goals');
      await page.locator('body').focus();
      let reached = false;
      for (let i = 0; i < 80 && !reached; i++) { await page.keyboard.press('Tab'); reached = await page.evaluate(() => document.activeElement?.textContent?.trim() === '+ Quick add'); }
      expect(reached).toBe(true);
      await page.keyboard.press('Enter');
      await expect(page.getByRole('dialog', {name: 'What would you like to add?'})).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', {name: '+ Quick add', exact: true})).toBeFocused();
    });
  }
});

test('P-NB-38 (NB-093, NB-193, NB-228): while arranging, the toast shows above the Arrange bar and an open ⋯ menu moves the bar aside', async ({page, isMobile}) => {
  desktopOnly(isMobile);
  await page.setViewportSize({width: 1280, height: 800});
  await loadShowcase(page);
  await ready(page, '/app/habits');
  await page.getByRole('button', {name: 'Unlock layout to rearrange'}).click();
  const bar = page.getByRole('region', {name: 'Arrange this page'});
  await expect(bar).toBeVisible();
  const complete = page.getByRole('button', {name: /^Complete /}).first();
  if (await complete.count()) {
    await complete.click();
    const toast = page.locator('.aa-toast-region').locator(':scope > *').filter({visible: true}).first();
    await expect(toast).toBeVisible();
    expect(overlap((await toast.boundingBox())!, (await bar.boundingBox())!)).toBe(false);
  }
  const options = page.locator('main .card-options-trigger').filter({visible: true}).first();
  if (await options.count()) {
    await options.click();
    await expect.poll(() => bar.evaluate(el => getComputedStyle(el).opacity)).toBe('0');
  }
});

test.describe('DV-246 / DV-204: the pillar header actions beside the rail and a narrow window', () => {
  for (const width of [768, 1024]) {
    test(`DV-246: at ${width} px the primary button sits under the lede, flush left, never on the header art`, async ({page}) => {
      await page.setViewportSize({width, height: 900});
      for (const path of ['/app/goals', '/app/habits']) {
        await ready(page, path);
        const hero = page.locator('.pillar-hero').first();
        const lede = (await hero.locator('.pillar-hero-lede').boundingBox())!, actions = (await hero.locator('.pillar-hero-actions').boundingBox())!;
        expect(actions.y, path).toBeGreaterThanOrEqual(lede.y + lede.height - 1);
        expect(Math.abs(actions.x - lede.x), path).toBeLessThanOrEqual(2);
        const art = hero.locator('.pillar-hero-art');
        if (await art.count() && await art.isVisible()) for (const button of await hero.locator('.pillar-hero-buttons > :is(a, button)').all()) expect(overlap((await button.boundingBox())!, (await art.boundingBox())!), path).toBe(false);
      }
    });
  }
});

test('LA6 D-196 (BN-127, P-BN-49): in Dark at 1440 every page’s content column ends at the same place', async ({page, isMobile}) => {
  desktopOnly(isMobile);
  await chooseChain(page);
  await applyTheme(page, 'dark');
  await page.setViewportSize({width: 1440, height: 900});
  const edges: Record<string, number> = {};
  for (const path of ['/app/goals', '/app/wealth', '/app/portfolio', '/app/ecosystem', '/app/governance', '/app/staking', '/app/markets', '/app/wealth/add-money', '/app/settings']) {
    await ready(page, path);
    edges[path] = await page.evaluate(() => {
      const main = document.querySelector<HTMLElement>('main#main')!;
      // The right edge of the widest block's content box (its own padding taken off): where its words can end.
      return Math.max(...[...main.children].map(el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 ? Math.round(r.right - parseFloat(s.paddingRight) - parseFloat(s.borderRightWidth)) : 0; }));
    });
  }
  const goals = edges['/app/goals']!;
  for (const [path, edge] of Object.entries(edges)) expect(Math.abs(edge - goals), `${path}: ${edge} vs Goals ${goals}`).toBeLessThanOrEqual(2);
});

test('E2 (BUG-047, BUG-048): Wealth and Portfolio charts have no nested interactive parts and no invalid <dl>', async ({page}) => {
  await chooseChain(page);
  await loadShowcase(page);
  for (const path of ['/app/wealth', '/app/portfolio']) {
    await ready(page, path);
    const found = (await axe(page)).filter(v => ['nested-interactive', 'dlitem', 'definition-list', 'list', 'listitem'].includes(v.rule));
    expect(found, path).toEqual([]);
  }
});

test('LA10 (D-212, D-223): a text link shows its hover feedback (an underline) on every page checked', async ({page, isMobile}) => {
  desktopOnly(isMobile);
  await page.setViewportSize({width: 1280, height: 900});
  await loadShowcase(page);
  for (const path of ['/app/goals', '/app/wealth', '/app/settings', '/app/health']) {
    await ready(page, path);
    const link = page.locator('main a.text-link').filter({visible: true}).first();
    if (!await link.count()) continue;
    await link.scrollIntoViewIfNeeded();
    await link.hover();
    await expect.poll(() => link.evaluate(el => getComputedStyle(el).textDecorationLine), path).toContain('underline');
  }
});

test('R30: the Wealth charts and market cards draw no text under 12 px (Showcase, 1440)', async ({page, isMobile}) => {
  desktopOnly(isMobile);
  await page.setViewportSize({width: 1440, height: 900});
  await loadShowcase(page);
  await ready(page, '/app/wealth');
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } });
  const small = await page.evaluate(() => {
    const out: string[] = [];
    for (const el of document.querySelectorAll<SVGTextElement | HTMLElement>('main svg text, main svg tspan, main .asset-orb')) {
      const box = el.getBoundingClientRect();
      if (!box.width || !el.textContent?.trim()) continue;
      const svg = el.closest('svg'), view = svg?.viewBox?.baseVal;
      const scale = svg && view && view.width ? svg.getBoundingClientRect().width / view.width : 1;
      const size = parseFloat(getComputedStyle(el).fontSize) * (el instanceof SVGElement ? scale : 1);
      if (size < 12) out.push(`${el.textContent.trim().slice(0, 20)} ${size.toFixed(1)}px`);
    }
    return out;
  });
  expect(small).toEqual([]);
});

for (const height of [900, 1380]) {
  test(`R2-10 (O4): at 1440 × ${height} Notes and Tasks are findable in the sidebar (fresh profile), and reachable by keyboard`, async ({page, isMobile}) => {
    desktopOnly(isMobile);
    await page.setViewportSize({width: 1440, height});
    await ready(page, '/app/goals');
    const apps = page.getByTestId('sidebar-apps-group');
    for (const name of ['Tasks', 'Notes']) {
      const link = apps.getByRole('link', {name, exact: true});
      await expect(link).toHaveCount(1);
      await link.scrollIntoViewIfNeeded();
      await expect(link).toBeInViewport();
      await link.focus();
      await expect(link).toBeFocused();
    }
  });
}
