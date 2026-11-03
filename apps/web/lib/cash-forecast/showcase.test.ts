import {describe, expect, test} from 'vitest';
import {SHOWCASE_EURO_CASH_ID, withShowcaseEuroCash} from './showcase';
import {cashForecast, type KnownForecast} from './model';
import {showcaseAccounts} from '../accounts/showcase';
import {showcaseBills, showcaseBudgets} from '../bills/showcase';
import {showcaseMoneyLog} from '../money-log/showcase';

const DAY = '2026-11-01';
describe('BUILD list 2 #11: the Showcase example for "Next 60 days"', () => {
  test('without a euro cash account the euro bills are named, not drawn', () => {
    const out = cashForecast({accounts: showcaseAccounts(DAY), bills: showcaseBills(DAY), entries: showcaseMoneyLog(DAY).entries, budgets: showcaseBudgets(DAY), today: DAY});
    expect(out.rows.map(r => r.currency)).toEqual(['USD']);
    expect(out.unplaced).toEqual(['EUR']);
  });
  test('with the fictional euro account: a labelled euro line with the bills and the log\'s pace', () => {
    const accounts = withShowcaseEuroCash(showcaseAccounts(DAY), DAY);
    expect(withShowcaseEuroCash(accounts, DAY)).toBe(accounts);
    expect(accounts.items.find(a => a.id === SHOWCASE_EURO_CASH_ID)?.institution).toContain('SHOWCASE DATA');
    const out = cashForecast({accounts, bills: showcaseBills(DAY), entries: showcaseMoneyLog(DAY).entries, budgets: showcaseBudgets(DAY), today: DAY});
    const eur = out.rows.find(r => r.currency === 'EUR') as KnownForecast;
    expect(eur.known).toBe(true);
    expect(eur.startCents).toBe(185000n);
    expect(eur.everyday.source).toBe('log');
    expect(eur.events.some(e => e.title.startsWith('Rent'))).toBe(true);
    // One salary in 31 days of history is part of the everyday average (it does not repeat yet), so this line rises.
    expect(eur.everyday).toMatchObject({days: 31, inCents: 255000n});
    expect(eur.events.filter(e => e.kind === 'bill')).toHaveLength(6);
    expect(out.unplaced).toEqual([]);
  });
});
