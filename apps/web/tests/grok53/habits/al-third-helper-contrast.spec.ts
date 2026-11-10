import {expect, test} from '@playwright/test';
import {createHabit, emptyDevice, open} from '../l3-helpers';

/**
 * AL-THEME-005 helper text (P-DVR-32; D-178, D-179, D-192, D-198: old ids, Q7 replay): the Habits page's small and helper
 * text reads at 4.5:1 or more in Light and Dark. Each text's colour is measured against the first opaque background
 * behind it (texts over an image or a gradient are skipped and counted, never guessed).
 */
for (const theme of ['light', 'dark'] as const) {
  test(`P-DVR-32 (${theme}): Habits helper text meets 4.5:1`, async ({page}) => {
    await page.setViewportSize({width: 1280, height: 900});
    await page.emulateMedia({reducedMotion: 'reduce'});
    await emptyDevice(page, {theme});
    await createHabit(page, 'Fictional stretch');
    await open(page, '/app/habits');
    const result = await page.evaluate(() => {
      const rgb = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number);
      const lum = ([r, g, b]: number[]) => { const f = (v: number) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(r!) + .7152 * f(g!) + .0722 * f(b!); };
      const ratio = (a: number[], b: number[]) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + .05) / (y! + .05); };
      const background = (el: Element): number[] | null => {
        for (let e: Element | null = el; e; e = e.parentElement) {
          const s = getComputedStyle(e);
          if (s.backgroundImage !== 'none') return null;
          const c = rgb(s.backgroundColor);
          if (c.length >= 3 && (c[3] === undefined || c[3] >= .95)) return c;
        }
        return rgb(getComputedStyle(document.body).backgroundColor);
      };
      const failures: string[] = []; let checked = 0, skipped = 0;
      for (const el of document.querySelectorAll('main :is(.fine, small, .habit-section-count, .habit-tag, .eyebrow)')) {
        const box = el.getBoundingClientRect(); if (!box.width || !box.height || !el.textContent?.trim()) continue;
        const s = getComputedStyle(el); if (s.visibility === 'hidden' || Number(s.opacity) < .5) continue;
        const bg = background(el); if (!bg) { skipped++; continue; }
        checked++;
        const r = ratio(rgb(s.color), bg);
        if (r < 4.5) failures.push(`${el.textContent.trim().slice(0, 40)} · ${r.toFixed(2)}:1`);
      }
      return {failures, checked, skipped};
    });
    expect(result.checked).toBeGreaterThan(5);
    expect(result.failures).toEqual([]);
  });
}
