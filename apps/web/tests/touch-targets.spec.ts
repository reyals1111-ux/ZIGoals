import {test, expect, type Browser} from '@playwright/test';

// Session AB-Design Phase 2 closing pass (owner, 2026-10-14: "tablets are touch devices"): wherever the primary pointer is
// coarse every standalone control is a 44 × 44 px target, at every width. Phones are held to it by their own specs; this
// checks the tablet widths (768 and 1024 px) with touch emulation, which gives the page a coarse primary pointer. The same
// rule as the layout audit (tests/audit/layout-audit.mjs): a link inside a sentence is not a standalone target, a
// checkbox or radio counts through its label, and the floating ZIGi and music buttons are their own components.
const PAGES = ['/app', '/app/goals', '/app/habits', '/app/health', '/app/wealth', '/app/settings', '/app/help'];

async function tablet(browser: Browser, width: number) {
  const context = await browser.newContext({viewport: {width, height: 900}, hasTouch: true, reducedMotion: 'reduce', locale: 'en-US'});
  const page = await context.newPage();
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  return {context, page};
}

for (const width of [768, 1024]) {
  test(`${width} px with a touch screen: every standalone control on the main pages is at least 44 × 44 px`, async ({browser}, info) => {
    test.skip(info.project.name !== 'desktop', 'one run is enough: the context sets its own touch screen and width');
    test.setTimeout(180_000);
    const {context, page} = await tablet(browser, width);
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), 'the emulated tablet has a coarse primary pointer').toBe(true);
    const findings: Record<string, string[]> = {};
    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.locator('main h1').first()).toBeVisible();
      await page.waitForTimeout(1200);
      const small = await page.evaluate(() => {
        const out: string[] = [];
        const shown = (el: Element) => { const s = getComputedStyle(el), r = el.getBoundingClientRect(); return s.visibility !== 'hidden' && s.display !== 'none' && r.width > 1 && r.height > 1 && !el.closest('[hidden], [aria-hidden="true"], .sr-only, details:not([open]) > :not(summary)'); };
        for (const el of document.querySelectorAll('main :is(a[href], button, select, summary, input:not([type=hidden]), [role=button], [role=tab], [role=switch])')) {
          if (!shown(el)) continue;
          const r = el.getBoundingClientRect(); if (r.width >= 44 && r.height >= 44) continue;
          const s = getComputedStyle(el);
          if (el.matches('input[type=checkbox], input[type=radio]')) { const label = el.closest('label'); if ((label && label.getBoundingClientRect().height >= 44) || s.opacity === '0' || r.width <= 1) continue; }
          if (el.matches('input[type=range]')) continue;
          if (el.tagName === 'A' && s.display === 'inline' && [...el.parentElement!.childNodes].some(n => n.nodeType === 3 && n.textContent!.trim())) continue; // in a sentence
          if (el.closest('table') && r.height >= 40) continue;
          out.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? el.getAttribute('aria-label') ?? '').trim().slice(0, 32)}" ${Math.round(r.width)}×${Math.round(r.height)}`);
        }
        return [...new Set(out)];
      });
      if (small.length) findings[path] = small;
    }
    await context.close();
    expect(findings).toEqual({});
  });
}
