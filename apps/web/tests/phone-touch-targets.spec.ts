import {expect, test, type Page} from '@playwright/test';

// Session M, Part A4 (QA2-07): on a phone every link or control a person taps is at least 44 × 44 px. The QA sweep found
// Activity rows (23 px), Wealth asset rows (28 px), Goal card titles (26 px), the Goal workspace tabs (39 px), a Goal's
// "Newer/Older events" (31 px) and the asset detail's "Refresh available soon" (43 px); a full audit added Today's Goal
// links, the Funding agenda, Health's meal links, Market names, a Goal's checkbox, Wealth's change rows and two links
// on Ecosystem and Help. phone-targets.css fixes them on phones only.
// Counted as WCAG 2.5.8 counts them: a link inside a sentence is sized by the text around it and is not a target here;
// a checkbox or radio inside its label is measured by the label it sits in. Disclosures are opened first.
test.skip(({viewport}) => (viewport?.width ?? 1280) > 767, 'phones only: desktop and tablet are unchanged');

async function showcase(page: Page) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); localStorage.setItem('zigoals:motion:v1', 'off'); } catch { /* storage denied */ } });
  await page.goto('/app/settings'); await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click(); await page.waitForURL('**/app');
}
async function firstHref(page: Page, list: string, prefix: string) {
  await page.goto(list);
  const link = page.locator(`main a[href^="${prefix}"]`).first();
  await link.waitFor({state: 'attached'});
  return (await link.getAttribute('href'))!.split('#')[0]!;
}
/** Every visible, standalone tap target under 44 px on this page, as "name (w×h)". */
async function smallTargets(page: Page) {
  await page.evaluate(() => { for (const details of document.querySelectorAll('main details')) (details as HTMLDetailsElement).open = true; });
  return page.evaluate(() => {
    const found: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button]')) {
      const style = getComputedStyle(el), box = el.getBoundingClientRect();
      if (!box.width || !box.height || style.visibility === 'hidden' || el.closest('[aria-hidden="true"], [hidden], .sr-only') || el.matches('a[href="#main"]')) continue;
      const own = el.parentElement ? [...el.parentElement.childNodes].filter(node => node.nodeType === 3).map(node => node.textContent).join('').replace(/[\s·|,]/g, '') : '';
      if (style.display === 'inline' && own.length) continue;
      const target = el.matches('input[type=checkbox], input[type=radio]') && el.closest('label') ? el.closest('label')!.getBoundingClientRect() : box;
      if (target.height < 44 || target.width < 44) found.push(`${(el.getAttribute('aria-label') || el.textContent || el.getAttribute('type') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 48)} (${Math.round(target.width)}×${Math.round(target.height)})`);
    }
    return found;
  });
}

test('QA2-07: every standalone tap target on the main phone pages is at least 44 × 44 px', async ({page}) => {
  test.setTimeout(120_000);
  await showcase(page);
  const detail = await firstHref(page, '/app/goals', '/app/goals/tracked/'), asset = await firstHref(page, '/app/wealth', '/app/wealth/asset/');
  for (const path of ['/app', '/app/goals', detail, '/app/habits', '/app/health', '/app/wealth', asset, '/app/markets', '/app/staking', '/app/portfolio', '/app/ecosystem', '/app/activity', '/app/settings', '/app/help']) {
    await page.goto(path);
    await expect(page.locator('main h1').first()).toBeVisible();
    await page.waitForTimeout(400);
    expect(await smallTargets(page), path).toEqual([]);
  }
});

test('QA2-07: the title links reach 44 px without moving anything', async ({page}) => {
  await showcase(page);
  await page.goto('/app/goals');
  const title = page.locator('.goal-grid .goal-card h2.nebula-number > a').first();
  await expect(title).toBeVisible();
  const [link, heading] = await Promise.all([title.boundingBox(), title.locator('xpath=..').boundingBox()]);
  expect(link!.height).toBeGreaterThanOrEqual(44);
  // The heading keeps the height of its own line: the taller hit area takes no room.
  expect(heading!.height).toBeLessThan(44);
  expect(await title.evaluate(el => { const style = getComputedStyle(el); return parseFloat(style.paddingTop) + parseFloat(style.marginTop); })).toBeCloseTo(0, 1);
});
