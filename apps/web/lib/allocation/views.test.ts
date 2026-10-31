import {describe, expect, test} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {BillsView} from '../../components/wealth/bills/upcoming-bills';
import {BudgetsView} from '../../components/wealth/budgets/budgets-month';
import {TargetAllocationView} from '../../components/wealth/allocation/target-allocation';
import {PurposeFlow} from '../../components/wealth/allocation/purpose-flow';
import {ContributionAutopilotView} from '../../components/wealth/allocation/contribution-autopilot';
import {LastSyncedLine} from '../../components/wealth/allocation/last-synced';
import {BankFileImportView} from '../../components/import/bankfiles/bank-file-import';
import {CsvTemplateDownloads} from '../../components/import/bankfiles/csv-templates';
import {addManualBill} from '../bills/store';
import {emptyBills} from '../bills/schema';
import {setBudget} from '../budgets/engine';
import {emptyBudgets} from '../budgets/schema';
import {emptyTargetAllocation, setTargets} from './target';
import type {MoneyEntry} from '../money-log/schema';

// Session AK (lane W): the new Wealth views render from props alone, with their numbers as text and tables, 44 px
// targets named, and the "never moves money" copy. The connected default exports read the device records.
const now = new Date('2026-10-31T10:00:00Z');
const spend = (date: string, amount: string, note: string, category = 'Subscriptions'): MoneyEntry => ({id: `${date}-${note}`, kind: 'expense', amount, currency: 'EUR', category, note, date, createdAt: `${date}T10:00:00.000Z`});
const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);
const noop = () => {};

describe('the lane W views', () => {
  test('Upcoming bills: list, totals per currency, a found candidate, reminders-only copy', () => {
    const record = addManualBill(emptyBills(), {title: 'Rent', amount: '900.00', currency: 'EUR', cadence: 'monthly', nextDue: '2026-11-01'}, 'rent', now);
    const entries = ['2026-08-05', '2026-09-05', '2026-10-05'].map(d => spend(d, '9.99', 'Music'));
    const out = html(createElement(BillsView, {record, entries, today: '2026-10-31', onChange: noop}));
    expect(out).toContain('Rent');
    expect(out).toContain('€900.00');
    expect(out).toContain('Found in your spending');
    expect(out).toContain('Confirm Music as a bill');
    expect(out).toContain('(an estimate)');
    expect(out).toMatch(/never pays, cancels or moves money/);
    expect(html(createElement(BillsView, {record: emptyBills(), entries: [], today: '2026-10-31', onChange: noop}))).toContain('No bills yet');
  });
  test('Budgets: a month table with what rolled over', () => {
    const record = setBudget(emptyBudgets(), {category: 'Groceries', currency: 'EUR', monthly: '100.00', rollover: true}, 'g', '2026-09');
    const out = html(createElement(BudgetsView, {record, entries: [spend('2026-09-10', '60.00', 'Shop', 'Groceries'), spend('2026-10-10', '30.00', 'Shop', 'Groceries')], today: '2026-10-31', onChange: noop}));
    expect(out).toContain('<table');
    expect(out).toContain('€140.00');
    expect(out).toContain('rolled over');
    expect(out).toContain('Remove the Groceries budget in EUR');
  });
  test('Target mix: the table, the drift and the unknown price change', () => {
    const record = setTargets(emptyTargetAllocation(), 'class', [{key: 'Stocks', label: 'Stocks', percent: '50'}]);
    const rows = [{position: {id: 'p', asset: 'BTC', providerId: 'My bitcoin', marketRef: {kind: 'coin'}}, wealthClass: 'Crypto', currency: 'EUR', value: 30000n}, {position: {id: 's', asset: 'ETF', providerId: 'Index fund'}, wealthClass: 'Stocks', currency: 'EUR', value: 10000n}];
    const out = html(createElement(TargetAllocationView, {record, rows, snapshots: [], now: now.getTime(), onChange: noop}));
    expect(out).toContain('Below your target');
    expect(out).toContain('My bitcoin');
    expect(out).toContain('Unknown');
    expect(out).toMatch(/not financial advice/);
  });
  test('Purpose flow: an SVG with a title, and the table toggle', () => {
    const out = html(createElement(PurposeFlow, {rows: [{position: {id: 'a', asset: 'EUR', providerId: 'Savings', quantity: '100'}, wealthClass: 'Cash', currency: 'EUR', value: 100000n}], goals: [{id: '1', name: 'House', status: 'active'}], allocations: [{goalId: '1', positionId: 'a', quantity: '40'}]}));
    expect(out).toContain('<svg');
    expect(out).toContain('role="img"');
    expect(out).toContain('House');
    expect(out).toContain('Still available');
    expect(out).toContain('aria-pressed="false"');
    expect(out).toContain('40.0 %');
  });
  test('Autopilot: the sentence, the pre-fill link and no money moved', () => {
    const out = html(createElement(ContributionAutopilotView, {reminders: {}, onRemind: noop, suggestions: [{goalId: '7', goalName: 'Trip', rhythm: 'monthly', day: 3, amount: '10000', asset: 'EUR', decimals: 2, occurrences: 4, nextDate: '2026-11-03', doneThisPeriod: false, confidence: 'high', hasPlan: true, prefillHref: '/app/goals/tracked/7?contribute=1&amount=10000#funding-wealth'}]}));
    expect(out).toContain('you usually contribute on the 3rd');
    expect(out).toContain('href="/app/goals/tracked/7?contribute=1&amp;amount=10000#funding-wealth"');
    expect(out).toContain('Remind me');
    expect(out).toMatch(/never moves money/);
  });
  test('The sync line, the bank file step and the template list', () => {
    expect(html(createElement(LastSyncedLine, {lastReadAt: new Date(now.getTime() - 4 * 60_000).toISOString(), now: now.getTime(), busy: false, canRefresh: true, waitSeconds: 0, onRefresh: noop, label: 'Kraken'}))).toContain('Last synced 4 min ago');
    const bank = html(createElement(BankFileImportView, {log: {entries: []}, onAdd: () => ({added: 0, refused: []})}));
    expect(bank).toContain('type="file"');
    expect(bank).toMatch(/Nothing is uploaded/);
    expect(html(createElement(CsvTemplateDownloads, {target: 'money'})).match(/Download template/g)).toHaveLength(4);
  });
});
