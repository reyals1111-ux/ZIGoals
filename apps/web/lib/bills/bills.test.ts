import {describe, expect, test} from 'vitest';
import type {MoneyEntry} from '../money-log/schema';
import {addMonths, dueDatesBetween, dueOnOrAfter, stepDue} from './cadence';
import {detectBills, normalisePayee, openCandidates} from './detect';
import {addManualBill, billOccurrences, cancelReminders, confirmCandidate, dismissCandidate, manualBillIssue, monthlyEstimate, removeBill, setCancelNote, totalsByCurrency, upcomingBills} from './store';
import {BILLS_KEY, billsSchema, emptyBills} from './schema';

let n = 0;
const spend = (date: string, amount: string, note: string, category = 'Subscriptions', currency = 'EUR'): MoneyEntry => ({id: `e${n++}`, kind: 'expense', amount, currency, category, note, date, createdAt: `${date}T10:00:00.000Z`});
const now = new Date('2026-10-31T09:00:00Z');

describe('cadence steps (Session AK 7.3)', () => {
  test('months clamp to the last day and never drift', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(stepDue('2026-01-31', 'monthly', 2)).toBe('2026-03-31');
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15');
    expect(addMonths('2026-03-10', -3)).toBe('2025-12-10');
  });
  test('the first due date on or after a day, and the dates in a window', () => {
    expect(dueOnOrAfter('2026-01-31', 'monthly', '2026-04-01')).toBe('2026-04-30');
    expect(dueOnOrAfter('2020-01-06', 'weekly', '2026-10-31')).toBe('2026-11-02');
    expect(dueOnOrAfter('2026-12-01', 'yearly', '2026-10-31')).toBe('2026-12-01');
    expect(dueDatesBetween('2026-10-01', 'weekly', '2026-10-31', '2026-11-20')).toEqual(['2026-11-05', '2026-11-12', '2026-11-19']);
    expect(dueDatesBetween('2026-01-31', 'monthly', '2026-10-31', '2026-12-31')).toEqual(['2026-10-31', '2026-11-30', '2026-12-31']);
  });
});

describe('detecting recurring outflows', () => {
  test('payee names are normalised', () => {
    expect(normalisePayee('NETFLIX.COM 4471*AB')).toBe('netflix');
    expect(normalisePayee('Spotify B.V. · SHOWCASE DATA')).toBe('spotify');
    expect(normalisePayee('Café Zoë')).toBe('cafe zoe');
    expect(normalisePayee(undefined)).toBe('');
  });
  test('a monthly subscription with three payments is found, with the next due date', () => {
    const entries = [spend('2026-08-03', '12.99', 'Netflix'), spend('2026-09-03', '12.99', 'NETFLIX.COM'), spend('2026-10-02', '12.99', 'Netflix'), spend('2026-10-20', '4.20', 'Coffee', 'Food & drink')];
    const [c, ...rest] = detectBills(entries, '2026-10-31');
    expect(rest).toEqual([]);
    expect(c).toMatchObject({title: 'Netflix', payee: 'netflix', cadence: 'monthly', amount: '12.99', currency: 'EUR', occurrences: 3, lastDate: '2026-10-02', nextDue: '2026-11-02', variable: false});
    expect(c!.confidence).toBeGreaterThan(0.5);
  });
  test('amounts within ±5 % count, an outlier does not; a variable bill says so', () => {
    const entries = [spend('2026-07-15', '100.00', 'Energy', 'Bills'), spend('2026-08-15', '103.00', 'Energy', 'Bills'), spend('2026-09-15', '98.00', 'Energy', 'Bills'), spend('2026-10-15', '250.00', 'Energy', 'Bills')];
    const [c] = detectBills(entries, '2026-10-31');
    expect(c).toMatchObject({occurrences: 3, amount: '100.00', variable: true, cadence: 'monthly', nextDue: '2026-11-15'});
  });
  test('weekly, quarterly and yearly series', () => {
    const weekly = ['2026-10-03', '2026-10-10', '2026-10-17', '2026-10-24'].map(d => spend(d, '5.00', 'Gym class', 'Health'));
    const quarterly = ['2026-01-10', '2026-04-10', '2026-07-10', '2026-10-10'].map(d => spend(d, '30.00', 'Water board', 'Bills'));
    const yearly = ['2023-11-20', '2024-11-20', '2025-11-19'].map(d => spend(d, '49.00', 'Domain renewal', 'Other', 'USD'));
    const found = detectBills([...weekly, ...quarterly, ...yearly], '2026-10-31');
    expect(found.map(c => [c.title, c.cadence, c.nextDue, c.currency])).toEqual(expect.arrayContaining([['Gym class', 'weekly', '2026-10-31', 'EUR'], ['Water board', 'quarterly', '2027-01-10', 'EUR'], ['Domain renewal', 'yearly', '2026-11-19', 'USD']]));
  });
  test('two payments, irregular gaps, a stopped series and income are not bills', () => {
    expect(detectBills([spend('2026-09-01', '9.99', 'Music'), spend('2026-10-01', '9.99', 'Music')], '2026-10-31')).toEqual([]);
    expect(detectBills(['2026-08-01', '2026-08-04', '2026-09-20', '2026-10-01'].map(d => spend(d, '20.00', 'Taxi', 'Transport')), '2026-10-31')).toEqual([]);
    expect(detectBills(['2026-01-05', '2026-02-05', '2026-03-05'].map(d => spend(d, '9.99', 'Old app')), '2026-10-31')).toEqual([]);
    expect(detectBills(['2026-08-25', '2026-09-25', '2026-10-25'].map(d => ({...spend(d, '2400.00', 'Salary', 'Salary'), kind: 'income' as const})), '2026-10-31')).toEqual([]);
  });
  test('currencies are never mixed and same-day duplicates count once', () => {
    const entries = [spend('2026-08-01', '10.00', 'Cloud'), spend('2026-09-01', '10.00', 'Cloud', 'Subscriptions', 'USD'), spend('2026-10-01', '10.00', 'Cloud'), spend('2026-10-01', '10.00', 'Cloud')];
    expect(detectBills(entries, '2026-10-31')).toEqual([]);
  });
});

describe('the bills record (zigoals:bills:v1)', () => {
  const candidate = detectBills([spend('2026-08-03', '12.99', 'Netflix'), spend('2026-09-03', '12.99', 'Netflix'), spend('2026-10-03', '12.99', 'Netflix')], '2026-10-31')[0]!;
  test('the key, and a loose record that keeps a later field', () => {
    expect(BILLS_KEY).toBe('zigoals:bills:v1');
    expect(billsSchema.safeParse({...emptyBills(), later: true}).success).toBe(true);
    expect(billsSchema.safeParse({version: 2, bills: [], dismissed: []}).success).toBe(false);
  });
  test('confirm, dismiss and the candidates still open', () => {
    let r = confirmCandidate(emptyBills(), candidate, 'b1', now);
    expect(confirmCandidate(r, candidate, 'b2', now).bills).toHaveLength(1);
    expect(r.bills[0]).toMatchObject({origin: 'detected', matchKey: candidate.key, nextDue: '2026-11-03', amount: '12.99'});
    expect(openCandidates([candidate], r)).toEqual([]);
    r = dismissCandidate(removeBill(r, 'b1'), candidate.key, '2026-10-31');
    expect(openCandidates([candidate], r)).toEqual([]);
    expect(r.dismissed).toEqual([{key: candidate.key, at: '2026-10-31'}]);
  });
  test('a bill by hand is checked', () => {
    expect(manualBillIssue({title: ' ', amount: '5', currency: 'EUR', cadence: 'monthly', nextDue: '2026-11-01'})).toMatch(/name/);
    expect(manualBillIssue({title: 'Rent', amount: '5.555', currency: 'EUR', cadence: 'monthly', nextDue: '2026-11-01'})).toMatch(/amount/);
    expect(manualBillIssue({title: 'Rent', amount: '5', currency: 'eur', cadence: 'monthly', nextDue: '2026-11-01'})).toMatch(/currency/);
    expect(() => addManualBill(emptyBills(), {title: 'Rent', amount: '0', currency: 'EUR', cadence: 'monthly', nextDue: '2026-11-01'}, 'x', now)).toThrow();
  });
  test('occurrences, totals per currency, the monthly estimate and the notification input', () => {
    let r = addManualBill(emptyBills(), {title: 'Rent', amount: '900.00', currency: 'EUR', cadence: 'monthly', nextDue: '2026-11-01'}, 'rent', now);
    r = addManualBill(r, {title: 'Swim', amount: '6.00', currency: 'EUR', cadence: 'weekly', nextDue: '2026-11-04'}, 'swim', now);
    r = addManualBill(r, {title: 'VPN', amount: '60.00', currency: 'USD', cadence: 'yearly', nextDue: '2027-03-01'}, 'vpn', now);
    const thirty = billOccurrences(r, '2026-10-31', 30);
    expect(thirty.map(o => [o.title, o.due])).toEqual([['Rent', '2026-11-01'], ['Swim', '2026-11-04'], ['Swim', '2026-11-11'], ['Swim', '2026-11-18'], ['Swim', '2026-11-25']]);
    expect(totalsByCurrency(thirty)).toEqual([{currency: 'EUR', cents: 92400, count: 5}]);
    expect(monthlyEstimate(r)).toEqual([{currency: 'EUR', cents: 92600}, {currency: 'USD', cents: 500}]);
    expect(upcomingBills(r, '2026-10-31', 4)).toEqual([{id: 'rent-2026-11-01', title: 'Rent', due: '2026-11-01', amount: '€900.00'}, {id: 'swim-2026-11-04', title: 'Swim', due: '2026-11-04', amount: '€6.00'}]);
  });
  test('a note to self and its reminder; an empty note removes it', () => {
    let r = addManualBill(emptyBills(), {title: 'Trial', amount: '7.99', currency: 'GBP', cadence: 'monthly', nextDue: '2026-11-10'}, 't', now);
    r = setCancelNote(r, 't', 'Cancel before the trial ends', '2026-11-05');
    expect(cancelReminders(r, '2026-10-31')).toEqual([{billId: 't', title: 'Trial', cancelBy: '2026-11-05', note: 'Cancel before the trial ends'}]);
    r = setCancelNote(r, 't', '');
    expect(r.bills[0]!.cancelNote).toBeUndefined();
    expect(r.bills[0]!.cancelBy).toBeUndefined();
  });
});

describe('the Showcase bills and budgets', () => {
  test('valid, fictional and due within the windows', async () => {
    const {showcaseBills, showcaseBudgets} = await import('./showcase');
    const bills = showcaseBills('2026-10-31');
    expect(bills.bills.every(b => b.title.includes('SHOWCASE DATA'))).toBe(true);
    expect(billOccurrences(bills, '2026-10-31', 60).length).toBeGreaterThanOrEqual(4);
    expect(showcaseBudgets('2026-10-31').budgets).toHaveLength(3);
  });
});
