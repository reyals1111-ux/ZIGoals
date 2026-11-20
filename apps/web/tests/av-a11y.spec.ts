import {expect, test, type Locator, type Page} from '@playwright/test';
import {at, DAY1, freshWeek, hydrated, openAt, setup, ZONE} from './au/au-helpers';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {device, notes} from './av-keep-helpers';

/**
 * Session AV Part 6 (ADR-045 D-A11Y; owner amendment 8). What the Session AK sweep (p6-axe-all, p6-keyboard) does not
 * cover yet: the brief's everyday flows done by keyboard alone — "Your first five", a meal in words, a habit, a money
 * record, asking NOVA, Settings — with every stop visible, lit and never under a sticky bar; reflow at 320 px and at
 * 200 % text zoom; and axe on this session's new parts in Nebula, Light and Dark. Fictional data; every /api answers 503.
 */
test.use({timezoneId: ZONE});

/** Tabs (at most `max` times) until `target` holds the focus; each stop on the way is checked as the focus moves. */
async function tabTo(page: Page, target: Locator, max = 120) {
  for (let i = 0; i < max; i++) {
    if (await target.evaluate(el => el === document.activeElement || el.contains(document.activeElement)).catch(() => false)) { await expectFocusSeen(page); return; }
    await page.keyboard.press('Tab');
  }
  throw new Error(`Tab never reached ${target}`);
}
/** The focused control is on screen, lit (2.4.7) and not hidden under a sticky bar or the shell's navigation (2.4.11). */
async function expectFocusSeen(page: Page) {
  const seen = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return 'nothing has the focus';
    el.scrollIntoView({block: 'nearest'});
    const r = el.getBoundingClientRect(), x = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), y = Math.min(innerHeight - 1, Math.max(0, r.top + Math.min(r.height / 2, 12)));
    if (r.width === 0 || r.height === 0) return `${el.tagName} has no size`;
    const top = document.elementFromPoint(x, y);
    if (top && !el.contains(top) && !top.contains(el) && !(top instanceof HTMLLabelElement && top.control === el)) return `${el.tagName} "${el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 40)}" is under ${top.tagName}.${top.className}`;
    // Lit: the control (or its ::before/::after, or its field's frame) looks different focused than not (outline, ring,
    // border or face), as the Session AK sweep judges it.
    const frame = el.closest('label, .field, .nova-command') as HTMLElement | null;
    const look = () => [el, frame].filter((x): x is HTMLElement => !!x).flatMap(x => [getComputedStyle(x), getComputedStyle(x, '::before'), getComputedStyle(x, '::after')]).map(c => [c.outlineStyle, c.outlineWidth, c.outlineColor, c.boxShadow, c.borderColor, c.borderWidth, c.backgroundColor, c.backgroundImage, c.getPropertyValue('--w')].join('|')).join(';');
    const focused = look(); el.blur(); const resting = look(); el.focus({preventScroll: true});
    if (focused === resting) return `${el.tagName} "${el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 40)}" looks the same focused and not`;
    return 'ok';
  });
  expect(seen).toBe('ok');
}

test.describe('keyboard alone: the everyday flows (1440)', () => {
  test.skip(({isMobile}) => isMobile, 'a keyboard at a computer; the phone project walks its pages in p6-keyboard');
  test.use({viewport: {width: 1440, height: 900}});

  test('"Your first five" → a meal in words, a habit, a money record, NOVA and Settings, by Tab, Enter and Space', async ({page}) => {
    test.setTimeout(150_000);
    await freshWeek(page, 'nebula', at(DAY1, '08:00'));
    await setup(page, [/^Habits/, /^Health/]);
    await openAt(page, at(DAY1, '08:30'));
    // Your first five: its "Log a meal" step opens Health by Enter.
    const step = page.getByRole('region', {name: 'Five small steps, about two minutes.'}).getByRole('link', {name: /Log a meal/});
    await tabTo(page, step); await page.keyboard.press('Enter');
    await page.waitForURL('**/app/health**'); await hydrated(page);
    // A meal in words.
    const words = page.getByRole('form', {name: 'Just describe it'}).first();
    await tabTo(page, words.getByLabel('What did you eat?'));
    await page.keyboard.type('Fictional porridge');
    await tabTo(page, words.getByRole('button', {name: 'Log in words'})); await page.keyboard.press('Enter');
    await expect(words.getByRole('status')).toContainText('Calories unknown');
    // A habit, by Space on its check-in.
    await page.goto('/app/habits'); await hydrated(page);
    const check = page.locator('main button[aria-pressed="false"]').filter({visible: true}).first();
    await tabTo(page, check); await page.keyboard.press('Space');
    await expect(page.locator('main button[aria-pressed="true"]').first()).toBeVisible();
    // A money record.
    await page.goto('/app/wealth'); await hydrated(page);
    await tabTo(page, page.locator('#spending').getByRole('button', {name: 'Log spending', exact: true})); await page.keyboard.press('Enter');
    const money = page.getByRole('form', {name: 'Log spending or income'});
    await tabTo(page, money.getByLabel('Amount', {exact: true})); await page.keyboard.type('4.20');
    await tabTo(page, money.getByRole('button', {name: 'Save', exact: true})); await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => (JSON.parse(localStorage.getItem('zigoals:money-log:v1') ?? '{"entries":[]}').entries as unknown[]).length)).toBe(1);
    // Ask NOVA.
    await page.goto('/app/nova'); await hydrated(page);
    await expect(page.locator('.nova-frame')).toHaveAttribute('data-opening', 'done', {timeout: 20_000});
    const field = page.locator('.nova-command input').first();
    await tabTo(page, field); await page.keyboard.type('what is left today?'); await page.keyboard.press('Enter');
    await expect(page.locator('.ns-answer, section.nova-chat .nova-turn-assistant').filter({visible: true}).last()).toBeVisible({timeout: 20_000});
    // Settings: the theme, by keyboard.
    await page.goto('/app/settings'); await hydrated(page);
    const light = page.getByRole('radio', {name: /^Light/}).first();
    await tabTo(page, page.getByRole('radio', {checked: true}).first());
    for (let i = 0; i < 3 && !(await light.isChecked()); i++) await page.keyboard.press('ArrowRight');
    await expect(page.locator('html')).toHaveAttribute('data-theme', /light|nebula|dark/);
  });
});

test.describe('reflow: 320 px and 200 % text zoom, nothing cut off sideways', () => {
  const ROUTES = ['/app', '/app/goals', '/app/habits', '/app/health', '/app/wealth', '/app/tasks', '/app/notes', '/app/journal', '/app/agenda', '/app/nova', '/app/settings', '/app/help'];
  for (const [label, viewport, zoom] of [['320 px', {width: 320, height: 720}, 1], ['200 % zoom of 1280 px', {width: 640, height: 400}, 2]] as const) {
    test(`${label}: no page scrolls sideways (WCAG 1.4.10)`, async ({page}) => {
      test.setTimeout(150_000);
      await offline(page);
      await device(page, {'zigoals:notes:v1': notes(30)});
      await page.setViewportSize(viewport);
      const wide: string[] = [];
      for (const path of ROUTES) {
        await page.goto(path); await settle(page);
        if (zoom > 1) await page.evaluate(z => { document.documentElement.style.fontSize = `${100 * z}%`; }, zoom);
        const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        if (over > 1) wide.push(`${path} is ${over}px wider than the window`);
      }
      expect(wide).toEqual([]);
    });
  }
});

test.describe('axe on this session\'s new parts, in Nebula, Light and Dark', () => {
  for (const theme of THEMES) test(`${theme}: the keep-your-records card and the import preview's categories`, async ({page}) => {
    test.setTimeout(150_000);
    await applyTheme(page, theme);
    await offline(page);
    await device(page, {'zigoals:notes:v1': notes(30)});
    await page.goto('/app'); await settle(page);
    const keep = page.locator('section.keep-data-card');
    await expect(keep).toBeVisible();
    const findings = [...await axe(page, keep)];
    // The CSV preview with its Category column.
    await page.goto('/app/wealth'); await settle(page);
    const csv = 'Date,Payee,Amount\n2026-11-02,Fictional Grocer,-12.50\n2026-11-03,Fictional Cinema,-9.00\n';
    await page.locator('#spending').getByRole('button', {name: 'Import from your bank', exact: true}).click();
    const sheet = page.getByRole('region', {name: 'Import spending and income'});
    await sheet.getByRole('button', {name: 'CSV file', exact: true}).click();
    await sheet.getByLabel('CSV file', {exact: true}).setInputFiles({name: 'bank.csv', mimeType: 'text/csv', buffer: Buffer.from(csv)});
    const currency = sheet.getByRole('combobox', {name: 'Currency of this file', exact: true});
    if (await currency.count()) await currency.selectOption('EUR');
    await sheet.getByRole('button', {name: 'Next', exact: true}).click();
    await expect(sheet.getByRole('columnheader', {name: 'Category'})).toBeVisible();
    await expect(sheet.getByRole('combobox', {name: /^Category for Fictional Grocer/})).toHaveValue('Groceries');
    findings.push(...await axe(page, sheet.locator('table').first()));
    expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  });
});
