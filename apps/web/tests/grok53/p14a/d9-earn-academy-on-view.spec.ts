import {expect, test} from '@playwright/test';
import {chooseChain} from '../../chain-choice';
import {earnRoutes} from '../../earn-fixtures';
import {openFold} from '../../phone-nav';

// Session AL Part 14 (lane P14-A): AL_SCOPE D9 (Earn's first load ≈ 3.9 s TBT on the phone profile). The Academy's mini
// path (its chunk and the path engine's measuring of the page's last section) now loads when the Academy nears the
// screen, not during the first load; until then the same eight lessons show as a plain list. Phone 390 × 844.
test.use({viewport: {width: 390, height: 844}});

test('D9: on a plain load the Academy shows its list; scrolled near, the path with its eight lessons', async ({page}) => {
  await chooseChain(page); await earnRoutes(page);
  await page.goto('/app/earn');
  await expect(page.locator('#start-here .path-dot').first()).toBeVisible();
  const academy = page.locator('#academy');
  await expect(academy.locator('.earn-start-list > li')).toHaveCount(8);
  await expect(academy.locator('.path-dot')).toHaveCount(0);
  // Session AO (N-BN-05, deliberate): on a phone the Academy is a folded row; opened, it nears the screen as before.
  await openFold(page, 'Earn Academy: learn it before you earn it');
  await academy.scrollIntoViewIfNeeded();
  await expect(academy.getByRole('group', {name: 'Earn Academy: eight lessons'}).locator('button.path-dot')).toHaveCount(8);
  await expect(academy.locator('.earn-start-progress')).toContainText('0 of 8 lessons passed');
});
