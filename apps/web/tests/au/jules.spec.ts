import {expect, test} from '@playwright/test';
import {at, DAY1, freshWeek, novaSays, openAt, setup, ZONE} from './au-helpers';
import {openZigi, sendToZigi, zigiPanel} from '../zigi-open';

/**
 * Session AU (ADR-044, the friends dress rehearsal): Jules at 1440 in Nebula. Curious about crypto, careful with money; no
 * wallet, no holdings, a goal "First 0.01 BTC". In the rehearsal NOVA answered a price question with "Nothing is tracked on
 * Wealth yet" (R-7), a staking question with "No income logged yet" (R-8), and "How much BTC do I have?" with the goal's
 * progress (R-9); ZIGi had nothing to say about whether staking is safe (R-10). Now: no price without its source, no
 * earnings figure without Earn's measured rate, holdings first, and facts about staking without advice.
 */
test.skip(({isMobile}) => isMobile, 'the desktop part of Jules\'s week (his phone part is tests/au/webkit-au-jules.spec.ts)');
test.use({timezoneId: ZONE, viewport: {width: 1440, height: 900}, actionTimeout: 15_000});

test('Jules at 1440: price, staking and holdings questions are answered honestly, never as advice', async ({page}) => {
  test.setTimeout(180_000);
  await freshWeek(page, 'nebula', at(DAY1, '09:00'));
  await setup(page, [/^Goals & money/, /^Crypto & ZIGChain/], {kind: 'Something else', name: 'First 0.01 BTC', amount: '900'});
  await openAt(page, at(DAY1, '11:00'), '/app/nova');
  await page.keyboard.press('Shift');

  const holdings = await novaSays(page, 'How much BTC do I have?');
  expect(holdings).toContain('You have no BTC recorded in Wealth');
  expect(holdings.indexOf('You have no BTC recorded')).toBeLessThan(holdings.indexOf('First 0.01 BTC') === -1 ? Infinity : holdings.indexOf('First 0.01 BTC'));

  const price = await novaSays(page, 'What is bitcoin worth today?');
  expect(price).toContain('no BTC price has reached Markets on this device');
  expect(price).not.toMatch(/\$\s?\d|€\s?\d|\d[\d,.]* USD/);

  const earn = await novaSays(page, 'What would I earn if I staked 100 ZIG?');
  expect(earn).not.toContain('No income logged yet');
  expect(earn).not.toMatch(/about \d[\d.,]* ZIG over a year/);

  await openZigi(page);
  await sendToZigi(page, 'Is staking ZIG safe?');
  const safe = zigiPanel(page).locator('.ai-turn-local').last();
  await expect(safe).toContainText('Whether it is right for you is your call', {timeout: 20_000});
  await expect(safe).toContainText(/slash/i);
  await expect(safe).toContainText(/unbond/i);
});
