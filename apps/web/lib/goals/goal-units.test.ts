import {describe, expect, it} from 'vitest';
import {isUnitWord, newOwnUnitPosition, ownUnitPosition, unitAmount, unitWord, isOwnUnitGoal} from './goal-units';
import {formatGoalAmount} from '../goal-summary';
import {emptyPlatform, goalProgress, privateGoalSchema} from '../positions';
import {fundGoal, previewFunding} from '../contribution-funding';

// Session AL (L4): DV-014/DV-034b/DV-035/DV-103/DV-123 — "Read 20 books" reads in books and can be funded in books.
const books = (asset = 'BOOKS') => privateGoalSchema.parse({id: '7', name: 'Read 20 books', type: 'QUANTITY', status: 'active', asset, denom: `manual:${asset}`, decimals: 18, target: (20n * 10n ** 18n).toString(), notes: '', createdAt: '2026-11-01T10:00:00.000Z', milestones: []});

describe('DV-014: a count goal\'s own unit is a word, never a coin', () => {
  it('tells words from tickers', () => {
    for (const w of ['books', 'BOOKS', 'Pages', 'push-ups', 'Gold grams', 'milestones']) expect(isUnitWord(w), w).toBe(true);
    for (const t of ['BTC', 'ZIG', 'USD', 'EUR', 'GOLD']) expect(isUnitWord(t), t).toBe(false);
    expect(unitWord('BOOKS')).toBe('books');
    expect(unitWord('push-ups')).toBe('push-ups');
  });
  it('writes "20 books", "1 book", "1 milestone"; tickers and money unchanged', () => {
    expect(unitAmount('20', 'BOOKS')).toBe('20 books');
    expect(formatGoalAmount('20', 'BOOKS')).toBe('20 books');
    expect(formatGoalAmount('1', 'books')).toBe('1 book');
    expect(formatGoalAmount('1', 'milestones')).toBe('1 milestone');
    expect(formatGoalAmount('4', 'milestones')).toBe('4 milestones');
    expect(formatGoalAmount('1.5', 'BTC')).toBe('1.5 BTC');
    expect(formatGoalAmount('1500', 'USD')).toBe('$1,500.00');
  });
  it('DV-054a/D-195: a legacy 21-digit amount reads short; 18 digits keep their exact grouping', () => {
    const shown = formatGoalAmount('99999999999999999999.00', 'USD');
    expect(shown.length).toBeLessThan(20);
    expect(shown).toMatch(/^\$/);
    expect(formatGoalAmount('123456789123456789.12', 'USD')).toBe('$123,456,789,123,456,789.12');
  });
});

describe('DV-035/DV-103: funding a count goal of your own unit', () => {
  it('is an own-unit goal with its own source, made on first use', () => {
    const g = books(), s = {...emptyPlatform(), goals: [g]};
    expect(isOwnUnitGoal(g)).toBe(true);
    expect(ownUnitPosition(s, g)).toBeUndefined();
    const p = newOwnUnitPosition(g, 'own-1', '2026-11-04T10:00:00.000Z');
    expect(p).toMatchObject({asset: 'BOOKS', denom: 'manual:BOOKS', decimals: 18, quantity: '0', sourceType: 'MANUAL', network: 'manual'});
  });
  it('funds 3 books without "Choose the same asset", and progress moves to 3 of 20', () => {
    const g = books(), s = {...emptyPlatform(), goals: [g]}, now = Date.now();
    const position = newOwnUnitPosition(g, 'own-1', new Date(now).toISOString());
    const input = {id: 'c1', goalId: '7', newPosition: position, quantity: (3n * 10n ** 18n).toString(), occurredAt: new Date(now).toISOString()};
    expect(() => previewFunding(s, input, [], now)).not.toThrow();
    const after = fundGoal(s, input, [], now);
    expect(goalProgress(after, '7', now).current).toBe((3n * 10n ** 18n).toString());
    expect(ownUnitPosition(after, g)?.quantity).toBe((3n * 10n ** 18n).toString());
    // The second time the same source is found and used.
    const again = fundGoal(after, {id: 'c2', goalId: '7', positionId: 'own-1', quantity: (2n * 10n ** 18n).toString(), occurredAt: new Date(now).toISOString()}, [], now);
    expect(goalProgress(again, '7', now).current).toBe((5n * 10n ** 18n).toString());
  });
});
