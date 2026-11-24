import {describe, expect, test} from 'vitest';
import {showSpace, spaceName, spaceOf, withBusiness} from './spaces';
import {emptyMoneyMore, moneyMoreSchema} from './schema';

/** Session AV lane 2 (review b2a #10): renaming the business space keeps the space shown; only starting it switches to it. */
describe('renaming the business space', () => {
  test('from Personal it stays on Personal; from the business space it stays there; starting it shows it', () => {
    const started = withBusiness(emptyMoneyMore(), 'Studio');
    expect(spaceOf(started)).toBe('business');
    const personal = showSpace(started, 'personal'), renamed = withBusiness(personal, ' Atelier ');
    expect(renamed).toEqual({version: 1, business: {name: 'Atelier'}});
    expect(spaceOf(renamed)).toBe('personal'); expect(spaceName(renamed, 'business')).toBe('Atelier');
    expect(spaceOf(withBusiness(started, 'Atelier'))).toBe('business');
    expect(moneyMoreSchema.parse(renamed)).toEqual(renamed);
  });
});
