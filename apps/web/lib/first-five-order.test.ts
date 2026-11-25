import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {FIRST_FIVE_STEPS, firstFiveOrder} from '../components/onboarding/first-five-order';
import {FOCUS_IDS} from './onboarding-setup';

/** Session AW Part 3 (simplicity c): "Your first five" puts each persona's daily step first, from the setup's focuses. */
describe('the first five’s order (components/onboarding/first-five-order.ts)', () => {
  it('keeps its own order without focuses, so a setup that chose none sees what it always saw', () => {
    expect(firstFiveOrder([])).toEqual(['goal', 'habit', 'meal', 'money']);
  });
  it('puts each persona’s daily step first', () => {
    expect(firstFiveOrder(['save'])[0], 'Tom, money').toBe('money');
    expect(firstFiveOrder(['debt'])[0], 'Tom, a debt').toBe('money');
    expect(firstFiveOrder(['eat-well', 'water'])[0], 'Lina, food').toBe('meal');
    expect(firstFiveOrder(['read', 'meditate'])[0], 'Sanne, habits').toBe('habit');
    expect(firstFiveOrder(['sleep', 'water'])).toEqual(['habit', 'meal', 'goal', 'money']);
    expect(firstFiveOrder(['move']), 'Max, movement').toEqual(['habit', 'meal', 'goal', 'money']);
  });
  it('always gives the same four steps once each, for every focus', () => {
    for (const f of FOCUS_IDS) expect([...firstFiveOrder([f])].sort(), f).toEqual([...FIRST_FIVE_STEPS].sort());
    expect(firstFiveOrder([...FOCUS_IDS])).toHaveLength(4);
    // An unknown focus (a newer build's) is passed over.
    expect(firstFiveOrder(['juggle' as never])).toEqual(['goal', 'habit', 'meal', 'money']);
  });
  it('keeps the steps’ own addresses (lib/fr-layout.test.ts reads them too)', () => {
    const five = readFileSync(new URL('../components/onboarding/first-five.tsx', import.meta.url), 'utf8');
    for (const href of ["href: '/app/goals/new'", "href: '/app/habits?add=habit'", "href: '/app/health?add=entry'", "href: '/app/wealth#log-spending'"]) expect(five).toContain(href);
  });
});
