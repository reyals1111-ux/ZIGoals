import {describe, expect, test} from 'vitest';
import {accountsSchema} from '../accounts/schema';
import {limitStates, withLimit} from './alerts';
import {todayExtras} from './today';
import {av2MoneyR2Answer} from '../ai/local-answers/av2-money-r2';
import {freshAll, zigiEnv} from '../ai/evals/as/harness';
import type {ToolEnv} from '../ai/tools/env';

/**
 * Session AV lane 2 (review b2a #8): a balance line on a debt reads what Wealth shows it owes — the typed balance less the
 * payments logged since (`owedAfterPayments`) — so a credit card paid down below its "above 1,000" line no longer reads
 * "above your line" on Wealth, on Today or in ZIGi's answer until a new balance is typed. Other accounts: the latest
 * balance, as before.
 */
const at = '2026-11-01T10:00:00.000Z', CARD = '00000000-0000-4000-8000-0000000000c1', CASH = '00000000-0000-4000-8000-0000000000c2';
const accounts = accountsSchema.parse({version: 1, items: [
  {id: CARD, kind: 'credit-card', name: 'Fictional card', currency: 'EUR', snapshots: [{id: '10000000-0000-4000-8000-0000000000c1', date: '2026-11-01', value: '120000', decimals: 2}],
    payments: [{id: '20000000-0000-4000-8000-0000000000c1', date: '2026-11-05', value: '30000', decimals: 2}, {id: '20000000-0000-4000-8000-0000000000c2', date: '2026-11-20', value: '10000', decimals: 2}], createdAt: at, updatedAt: at},
  {id: CASH, kind: 'cash', name: 'Checking', currency: 'EUR', snapshots: [{id: '10000000-0000-4000-8000-0000000000c2', date: '2026-11-01', value: '120000', decimals: 2}], payments: [], createdAt: at, updatedAt: at}]});
const sheet = withLimit(withLimit({version: 1}, CARD, {above: '1000.00'}), CASH, {above: '1000.00'});

describe('a debt’s balance line counts the payments logged since its balance', () => {
  test('€1,200 typed, €300 paid since: €900 owed, under the line; the account without payments is read as typed', () => {
    expect(limitStates(accounts, sheet, '2026-11-14')).toEqual([{id: CASH, name: 'Checking', currency: 'EUR', balance: '1200.00', date: '2026-11-01', line: '1000.00', side: 'above'}]);
    // Before the payment: €1,200 owed, above the line, as typed.
    expect(limitStates(accounts, sheet, '2026-11-03')[0]).toMatchObject({id: CARD, balance: '1200.00', date: '2026-11-01', side: 'above'});
    // A low line on the debt: €800 after both payments, dated today.
    expect(limitStates(accounts, withLimit({version: 1}, CARD, {below: '850.00'}), '2026-11-22')).toEqual([{id: CARD, name: 'Fictional card', currency: 'EUR', balance: '800.00', date: '2026-11-22', line: '850.00', side: 'below'}]);
  });
  test('Today and ZIGi read it the same way', () => {
    expect(todayExtras({entries: [], today: '2026-11-14', accounts, sheet}).map(p => p.text)).toEqual(['Checking above your line']);
    const env = {...zigiEnv(freshAll()), accounts, wealthSheet: sheet, habitDay: '2026-11-14'} as ToolEnv;
    const r = av2MoneyR2Answer('which accounts are past my balance lines', env), said = r && 'text' in r ? r.text : '';
    expect(said).toContain('Checking');
    expect(said).not.toContain('Fictional card');
  });
});
