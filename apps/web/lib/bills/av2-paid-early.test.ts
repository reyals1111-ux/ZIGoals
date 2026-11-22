import {describe, expect, it} from 'vitest';
import {billsThisMonth, entryMatchKey} from './month';
import {billHistory} from './tracker';
import {countAsPayment, paidEarlyCandidates, undoCountAsPayment} from './paid-early';
import {openCandidates} from './detect';
import type {BillsRecord} from './schema';
import type {MoneyEntry} from '../money-log/schema';

/**
 * Session AV lane 2, round 5 (money; PocketSmith's "fix this bill", LEDGER #386): a passed bill date paid early — the
 * candidates of the days before it, one counted as the payment by the bill's own match words, and Undo.
 */
const A = '2026-01-01T09:00:00.000Z', TODAY = '2026-11-20';
let n = 0;
const e = (over: Partial<MoneyEntry>): MoneyEntry => ({id: `pe-${n++}`, kind: 'expense', amount: '800.00', currency: 'EUR', category: 'Home', date: '2026-11-05', createdAt: A, note: 'Landlord BV · november', ...over});
const RECORD: BillsRecord = {version: 1, dismissed: [], bills: [
  {id: 'rent', title: 'Rent', amount: '800.00', currency: 'EUR', cadence: 'monthly', nextDue: '2026-12-15', origin: 'manual', createdAt: A},
  {id: 'tv', title: 'Streaming', amount: '15.00', currency: 'EUR', cadence: 'monthly', nextDue: '2026-12-12', origin: 'detected', matchKey: 'EUR|Subscriptions|netflix|monthly', category: 'Subscriptions', createdAt: A},
  {id: 'club', title: 'Club', amount: '10.00', currency: 'EUR', cadence: 'weekly', nextDue: '2026-11-23', origin: 'manual', createdAt: A},
]};
const EARLY = e({});
const ENTRIES = [EARLY, e({amount: '790.00', date: '2026-11-02', note: 'Other landlord'}), e({amount: '700.00', date: '2026-11-08'}), e({amount: '800.00', date: '2026-10-25'}), e({amount: '800.00', currency: 'USD', date: '2026-11-06'}),
  e({kind: 'income', amount: '800.00', date: '2026-11-07'}), e({amount: '15.20', category: 'Subscriptions', note: 'Disney Plus', date: '2026-11-01'})];

describe('paid early', () => {
  it('a passed date lists the expenses of the 14 days before it within 5 % of the amount, closest first', () => {
    expect(billsThisMonth(RECORD, ENTRIES, TODAY).lines.find(l => l.billId === 'rent')!.state).toBe('passed');
    const found = paidEarlyCandidates(RECORD, ENTRIES, RECORD.bills[0]!, '2026-11-15', TODAY);
    // Not the 700 (more than 5 % off), not Oct 25 (more than 14 days), not USD, not income.
    expect(found.map(c => [c.entry.id, c.days])).toEqual([[EARLY.id, 10], [ENTRIES[1]!.id, 13]]);
  });
  it('one tap counts it: the bill learns its match words, the date shows as seen, the history too; Undo puts it back', () => {
    const {record, before} = countAsPayment(RECORD, 'rent', EARLY, TODAY);
    expect(record.bills[0]!.matchKey).toBe(`${entryMatchKey(EARLY)}|monthly`);
    expect(record.bills[0]!.matchKey).toBe('EUR|Home|landlord november|monthly');
    expect(billsThisMonth(record, ENTRIES, TODAY).lines.find(l => l.billId === 'rent')!.state).toBe('seen');
    expect(billHistory(record.bills[0]!, ENTRIES, TODAY).at(-1)).toEqual({due: '2026-11-15', state: 'seen'});
    // The counted entry is no longer offered for another date.
    expect(paidEarlyCandidates(record, ENTRIES, record.bills[0]!, '2026-11-15', TODAY).map(c => c.entry.id)).not.toContain(EARLY.id);
    expect(record.dismissed).toEqual([]); // a manual bill: nothing to dismiss
    const undone = undoCountAsPayment(record, before);
    expect(undone).toEqual(RECORD);
  });
  it('a confirmed candidate whose words change: its old key is dismissed, so it is not offered again; Undo takes it off', () => {
    const disney = ENTRIES.at(-1)!;
    const {record, before} = countAsPayment(RECORD, 'tv', disney, TODAY);
    expect(record.bills[1]!.matchKey).toBe('EUR|Subscriptions|disney plus|monthly');
    expect(record.dismissed).toEqual([{key: 'EUR|Subscriptions|netflix|monthly', at: TODAY}]);
    expect(openCandidates([{key: 'EUR|Subscriptions|netflix|monthly'} as never], record)).toEqual([]);
    expect(undoCountAsPayment(record, before)).toEqual(RECORD);
  });
  it('a weekly bill looks 6 days back; an unknown bill is refused in words', () => {
    const found = paidEarlyCandidates(RECORD, [e({amount: '10.00', date: '2026-11-09'}), e({amount: '10.00', date: '2026-11-15'})], RECORD.bills[2]!, '2026-11-16', TODAY);
    expect(found.map(c => c.days)).toEqual([1]);
    expect(() => countAsPayment(RECORD, 'gone', EARLY, TODAY)).toThrow('That bill is no longer here.');
  });
  it('an entry of the bill’s own words within 4 days still counts as before; the money log is never changed', () => {
    const near = [e({amount: '800.00', date: '2026-11-13'})], learned = countAsPayment(RECORD, 'rent', near[0]!, TODAY).record;
    expect(billsThisMonth(learned, near, TODAY).lines.find(l => l.billId === 'rent')!.state).toBe('seen');
    expect(near[0]!.date).toBe('2026-11-13');
  });
});
