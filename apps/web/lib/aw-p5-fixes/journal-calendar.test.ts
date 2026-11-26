import {describe, expect, test} from 'vitest';
import {px, rulesFor} from './css';

/**
 * Session AW (p5-fixes; QUALITY b1 #9): the Journal's search-by-date calendar had 34 × 44 px day buttons at 320 px. Below
 * 390 px its month table now takes the phone card's padding (16 px), its border (1 px) and the page gutter less 4 px, with
 * no cell padding: at 320 px that is 254 + 2 × 29 = 312 px for seven days, 44.6 px each, so a 44 px button fits.
 */
const FILE = 'components/journal/journal.css', Q = '@media (max-width: 389.98px)';
describe('b1 #9: the calendar\'s day buttons are 44 × 44 below 390 px', () => {
  test('the table bleeds into the card padding and the gutter, with no cell padding, only below 390 px', () => {
    const [grid] = rulesFor(FILE, ':root main .panel .journal-calendar-grid');
    expect(grid?.media).toBe(Q);
    // 13 px = the card's 16 px padding + its 1 px border − the 4 px kept free at the screen edge (no custom property, so
    // the theme generator sees nothing to carry into the theme sheets).
    expect(grid?.decls.width).toBe('calc(100% + 2 * (13px + var(--phone-gutter,16px)))');
    expect(grid?.decls['margin-inline']).toBe('calc(-1 * (13px + var(--phone-gutter,16px)))');
    expect(rulesFor(FILE, ':root main .panel .journal-calendar-grid td')[0]?.decls.padding).toBe('0');
    const day = rulesFor(FILE, ':root main .panel .journal-calendar-day')[0];
    expect(day?.media).toBe(Q);
    expect(px(day?.decls.width)).toBe(44); expect(px(day?.decls['min-width'])).toBe(44);
  });
  test('the arithmetic at 320 and 360 px leaves at least 44 px a day, 4 px from each screen edge', () => {
    for (const width of [320, 360, 389]) {
      const gutter = 16, card = width - 2 * gutter - 2 * 1 - 2 * 16, bleed = 16 + 1 + gutter - 4, table = card + 2 * bleed;
      expect(table / 7, `${width} px`).toBeGreaterThanOrEqual(44);
      expect((width - table) / 2, `${width} px`).toBe(4);
    }
  });
  test('the buttons keep their 44 px height everywhere', () => {
    const base = rulesFor(FILE, '.journal-calendar-day').find(r => r.media === '');
    expect(px(base?.decls['min-height'])).toBe(44);
  });
});
