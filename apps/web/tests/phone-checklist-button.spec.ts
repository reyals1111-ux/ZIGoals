import {expect, test, type Page} from '@playwright/test';
import {UI_PREFS_KEY} from '../lib/ab-design-keys';
import {seedChecklist, settled} from './checklist-fixtures';

/**
 * Session AG Polish (ADR-030; owner addition of 22 Oct): on a phone the header holds a "Checklist" pill between the logo
 * and "+" — the footer's link-pill style with the nebula check — that opens the Checklist; it fits from 320 to 640 px
 * without wrapping, overlapping or pushing the header's icons off screen, is at least 44 px tall, and leaves with the
 * Checklist's "off" setting. On a computer there is no header pill, and the launcher's circle holds one bold nebula check.
 */
const pill = (page: Page) => page.getByRole('link', {name: 'Open the Checklist', exact: true});

test('phones 320–640: the header pill sits between the logo and "+", one line, ≥ 44 px, nothing overlaps or spills; it opens the Checklist', async ({page}, info) => {
  test.skip(info.project.name !== 'mobile', 'the phone header');
  await seedChecklist(page);
  for (const width of [320, 375, 390, 430, 640]) {
    await page.setViewportSize({width, height: 844});
    await page.goto('/app'); await settled(page);
    await expect(pill(page), `${width}: shown`).toBeVisible();
    const m = await page.locator('.phone-topbar-row').evaluate(row => {
      const r = (el: Element | null) => el ? el.getBoundingClientRect() : null;
      const pillBox = r(row.querySelector('.phone-checklist-pill'))!, logo = r(row.querySelector('.phone-home, .phone-back'))!;
      const icons = [...row.querySelectorAll('.phone-actions > *')].filter(el => !el.classList.contains('phone-checklist-pill') && (el as HTMLElement).offsetWidth > 0).map(el => ({c: String(el.getAttribute('class')), b: el.getBoundingClientRect()}));
      const word = row.querySelector('.phone-checklist-pill-word') as HTMLElement | null;
      return {pill: pillBox, logo, icons, vw: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth, wordLines: word && word.offsetWidth ? Math.round(word.getBoundingClientRect().height / parseFloat(getComputedStyle(word).lineHeight || '15')) : 0, wordShown: !!word && word.offsetWidth > 0};
    });
    expect(m.pill.height, `${width}: 44 px tall`).toBeGreaterThanOrEqual(44);
    expect(m.pill.width).toBeGreaterThanOrEqual(44);
    expect(m.pill.left, `${width}: after the logo`).toBeGreaterThanOrEqual(m.logo.right);
    const first = m.icons[0]!.b;
    expect(m.pill.right, `${width}: before "+"`).toBeLessThanOrEqual(first.left + .5);
    for (const icon of m.icons) { expect(icon.b.right, `${width}: ${icon.c} on screen`).toBeLessThanOrEqual(m.vw + .5); expect(icon.b.width, `${width}: ${icon.c} keeps its size`).toBeGreaterThanOrEqual(43.5); }
    expect(m.scroll, `${width}: no sideways scroll`).toBeLessThanOrEqual(m.vw);
    if (width >= 375) expect(m.wordShown, `${width}: the word shows`).toBe(true);
    if (m.wordShown) expect(m.wordLines, `${width}: one line`).toBeLessThanOrEqual(1);
  }
  await pill(page).click();
  await expect(page).toHaveURL(/\/app\/checklist$/);
  await expect(page.locator('dialog.checklist-overlay')).toHaveAttribute('data-loaded');
});

test('phones: the pill follows the Checklist\'s "off" setting', async ({page}, info) => {
  test.skip(info.project.name !== 'mobile', 'the phone header');
  await seedChecklist(page, {extra: {[UI_PREFS_KEY]: JSON.stringify({version: 1, checklist: {launcher: false}})}});
  await page.goto('/app/habits'); await settled(page);
  await expect(page.locator('.phone-topbar')).toBeVisible();
  await expect(pill(page)).toHaveCount(0);
});

test('computers: no header pill; the launcher holds one bold nebula check', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop', 'the computer launcher');
  await seedChecklist(page);
  await page.goto('/app'); await settled(page);
  await expect(pill(page)).toHaveCount(0);
  const mark = page.locator('.checklist-launcher svg.checklist-mark');
  await expect(mark).toBeVisible();
  expect(await mark.evaluate(svg => ({paths: svg.querySelectorAll('path').length, shapes: svg.querySelectorAll('rect, circle').length, stroke: svg.querySelector('path')!.getAttribute('stroke'), width: Number(svg.querySelector('path')!.getAttribute('stroke-width'))}))).toMatchObject({paths: 1, shapes: 0, stroke: expect.stringMatching(/^url\(#/), width: expect.any(Number)});
  expect(await mark.locator('path').getAttribute('stroke-width').then(Number)).toBeGreaterThanOrEqual(3.6);
});
