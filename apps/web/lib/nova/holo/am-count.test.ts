import {describe, expect, it} from 'vitest';
import {COUNT_MS, countable, mayCount} from '../../../components/nova/holo/use-hud-motion';

/**
 * Session AM (design review AM-D10): a figure on NOVA counts up at most once, when its widget is first made, for at most
 * 420 ms; money never counts; a re-mount (a re-flow, Pin, Hide and Show) never counts again.
 */
describe('NOVA figures count once (AM-D10)', () => {
  it('money never counts; a plain count or measure may; unknown and zero never do', () => {
    for (const money of ['$501,800.00', '€570.79', '950.00 EUR', '£12', '1.250,50 €', 'USD 12']) expect(countable(money), money).toBe(false);
    for (const plain of ['8,432', '71 kg', '15%', '120 g', '1,000 mL']) expect(countable(plain), plain).toBe(true);
    for (const none of ['—', '0', '0 g', '3/5', 'unknown', '']) expect(countable(none), none).toBe(false);
  });
  it('only a fresh widget counts, once per make: its figures mounting together count, a later re-mount does not', () => {
    expect(mayCount('am-d10-a', false, 1000)).toBe(false);
    expect(mayCount('am-d10-a', true, 1000)).toBe(true);
    expect(mayCount('am-d10-a', true, 1080)).toBe(true); // the widget's other figures, mounting in the same make
    expect(mayCount('am-d10-a', true, 1600)).toBe(false); // a re-flow while it is still fresh
    expect(mayCount('am-d10-a', false, 3000)).toBe(false); // pinned, hidden and shown, scrolled into view
    expect(mayCount('am-d10-a', true, 9000)).toBe(true); // closed and made again, later
    expect(mayCount('am-d10-b', true, 1700)).toBe(true); // another widget's own make
  });
  it('the count is capped at 420 ms', () => { expect(COUNT_MS).toBeLessThanOrEqual(420); });
});
