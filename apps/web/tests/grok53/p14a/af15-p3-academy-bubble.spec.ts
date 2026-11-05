import {expect, test} from '@playwright/test';
import {chooseChain} from '../../chain-choice';
import {earnRoutes} from '../../earn-fixtures';

// Session AL Part 14 (lane P14-A): earlier row AF15 part 3 (WIRING_AUDIT_3 gap 7): on Earn → Academy, while scrolling, the
// "Jump to your next lesson" bubble sat over a lesson's name. The path engine hides its bubble over banners, chests,
// ends and open panels, not over a step's name (components/path/path.tsx, the `covers` list). Phone 390 × 844, a fresh
// profile that chose the chain (Earn is a chain page), the live answers offline. Expected to FAIL until path.tsx adds
// `.path-label` to the list for the non-orbit paths (request to the integrator; the Checklist orbit stays as it is).
test.use({viewport: {width: 390, height: 844}});

test('AF15 p3: the Academy’s jump bubble never sits over a lesson’s name while the page scrolls', async ({page}) => {
  test.setTimeout(90_000);
  await chooseChain(page); await earnRoutes(page);
  await page.goto('/app/earn#academy');
  const stage = page.locator('#academy').getByRole('group', {name: 'Earn Academy: eight lessons'});
  await expect(stage.locator('button.path-dot')).toHaveCount(8);
  const box = (await stage.boundingBox())!, top = await page.evaluate(() => scrollY) + box.y;
  let shown = 0;
  for (let y = top - 600; y < top + box.height + 200; y += 60) {
    await page.evaluate(v => window.scrollTo(0, v), y);
    await page.waitForTimeout(90);
    const hit = await stage.evaluate(s => {
      const b = s.querySelector<HTMLElement>('.path-jump');
      if (!b || !b.hasAttribute('data-clear') || getComputedStyle(b).visibility !== 'visible') return null;
      const r = b.getBoundingClientRect();
      const over = [...s.querySelectorAll<HTMLElement>('.path-label')].filter(l => { const o = l.getBoundingClientRect(); return o.width > 0 && o.left < r.right && o.right > r.left && o.top < r.bottom && o.bottom > r.top; });
      return over.map(l => l.textContent?.trim() ?? '');
    });
    if (hit === null) continue;
    shown++;
    expect(hit, `bubble over a lesson's name at scroll ${y}`).toEqual([]);
  }
  expect(shown, 'the bubble shows somewhere while the next lesson is off screen').toBeGreaterThan(0);
});
