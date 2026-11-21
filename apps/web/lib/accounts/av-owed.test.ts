import {describe, expect, it} from 'vitest';
import {owedAfterPayments} from './net-worth';
import type {Account} from './schema';

/** Session AV (fresh-agent check q2, rank 16; Undebt.it): a payment recorded after a debt's balance lowers what it owes for the tracked plan. */
const snap = (date: string, value: string) => ({id: `s-${date}`, date, value, decimals: 2});
const card = (payments: {id: string; date: string; value: string; decimals: number}[]): Account => ({id: 'card', kind: 'credit-card', name: 'Fictional card', currency: 'EUR', snapshots: [snap('2026-10-01', '100000'), snap('2026-11-01', '90000')], payments, createdAt: '2026-09-01T10:00:00.000Z', updatedAt: '2026-11-01T10:00:00.000Z'} as unknown as Account);
describe('Session AV (q2 rank 16): owed after recorded payments', () => {
  it('takes the payments after the latest balance off it, and says how many', () => {
    const a = card([snap('2026-10-20', '20000'), snap('2026-11-10', '15000'), snap('2026-11-20', '5000'), snap('2026-12-05', '9000')].map((p, i) => ({...p, id: `p${i}`})));
    expect(owedAfterPayments(a, '2026-11-23')).toEqual({value: 70000n, decimals: 2, date: '2026-11-01', payments: 2});
    expect(owedAfterPayments(a, '2026-11-05')).toEqual({value: 90000n, decimals: 2, date: '2026-11-01', payments: 0});
    expect(owedAfterPayments(card([{id: 'p', date: '2026-11-02', value: '100000', decimals: 2}]), '2026-11-23')).toMatchObject({value: 0n, payments: 1}); // never below zero
    expect(owedAfterPayments({...card([]), snapshots: []} as Account, '2026-11-23')).toBeNull();
  });
});
