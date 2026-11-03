import {describe, expect, test} from 'vitest';
import {parseCsv} from '../parse';
import {TRANSACTION_FIELDS, HOLDINGS_FIELDS} from '../mapping';
import {planTransactionImport} from '../../import/holdings';
import {CSV_TEMPLATES, MONEY_FIELDS, mappingComplete, matchTemplate, templateCsv, templateMapping, type CsvTemplate} from './presets';
import {CSV_MAPPINGS_KEY, applySaved, csvMappingsSchema, emptyCsvMappings, findSaved, removeMapping, saveMapping} from './saved';
import {planMoneyRows} from './money-rows';
import {toMoneyEntries} from '../../bankfiles';
import {emptyMoneyLog} from '../../money-log/schema';

const byId = (id: string) => CSV_TEMPLATES.find(t => t.id === id)!;
const now = new Date('2026-10-31T10:00:00Z');

describe('CSV presets (Session AK 7.1)', () => {
  test('six presets, each mapping only to fields the importers know', () => {
    expect(CSV_TEMPLATES.map(t => t.id)).toEqual(['eu-bank', 'us-bank', 'camt-csv', 'ofx-csv', 'brokerage', 'exchange-trades']);
    const known = {money: MONEY_FIELDS, transactions: TRANSACTION_FIELDS, holdings: HOLDINGS_FIELDS};
    for (const t of CSV_TEMPLATES) for (const field of Object.keys(t.columns)) expect(known[t.target].map(f => f.id), `${t.id}.${field}`).toContain(field);
  });
  test.each(CSV_TEMPLATES.map(t => [t.id, t] as [string, CsvTemplate]))('the %s template file reads back with its own preset, complete', (_, template) => {
    const text = templateCsv(template), parsed = parseCsv(text, {delimiter: template.delimiter});
    expect(parsed.rows).toHaveLength(template.example.length);
    const mapping = templateMapping(parsed.header, template);
    expect(Object.keys(mapping).sort()).toEqual(Object.keys(template.columns).sort());
    expect(mappingComplete(mapping, template.target)).toBe(true);
    expect(matchTemplate(parsed.header, template.target)?.id).toBe(template.id);
  });
  test('template cells are formula-safe', () => {
    const evil: CsvTemplate = {...byId('eu-bank'), example: [['=1+1', '@SUM(A1)', '-3', '+x', 'EUR', 'ok']]};
    const line = templateCsv(evil).split('\r\n')[1]!;
    expect(line).toBe(`"'=1+1";"'@SUM(A1)";"'-3";"'+x";"EUR";"ok"`);
  });
  test('a bank\'s own header finds its preset; an unrelated header none', () => {
    expect(matchTemplate(['Datum', 'Naam / Omschrijving', 'Rekening', 'Af Bij', 'Bedrag (EUR)', 'Mededelingen'])?.id).toBe('eu-bank');
    expect(matchTemplate(['Posting Date', 'Description', 'Withdrawals', 'Deposits', 'Balance'])?.id).toBe('us-bank');
    expect(matchTemplate(['Date(UTC)', 'Base Asset', 'Side', 'Executed', 'Price', 'Fee'])?.id).toBe('exchange-trades');
    expect(matchTemplate(['colour', 'size'])).toBeNull();
  });
  test('the exchange preset feeds the existing trade importer', () => {
    const t = byId('exchange-trades'), parsed = parseCsv(templateCsv(t));
    const coin = {ref: {kind: 'coin' as const, id: 'bitcoin'}, name: 'Bitcoin', symbol: 'BTC'};
    const plan = planTransactionImport({rows: parsed.rows, mapping: templateMapping(parsed.header, t), numberStyle: 'point', dateFormat: 'iso', today: '2026-10-31', resolveCoin: () => coin as never});
    expect(plan.ready.map(r => [r.kind, r.quantity, r.date])).toEqual([['buy', '0.01', '2026-10-01'], ['sell', '0.005', '2026-10-20']]);
  });
});

describe('money rows from a CSV', () => {
  test('a European file: decimal comma, day/month/year, Debit/Credit', () => {
    const t = byId('eu-bank'), parsed = parseCsv(templateCsv(t));
    const plan = planMoneyRows({rows: parsed.rows, mapping: templateMapping(parsed.header, t), numberStyle: t.numberStyle, dateFormat: t.dateFormat});
    expect(plan.transactions.map(x => [x.date, x.amount, x.direction, x.payee, x.currency])).toEqual([['2026-10-01', '42.1', 'out', 'Example Supermarket', 'EUR'], ['2026-10-25', '2400', 'in', 'Example Employer', 'EUR']]);
    expect(plan.refused).toEqual([]);
    const entries = toMoneyEntries(plan.transactions, emptyMoneyLog(), now, () => 'x1').entries;
    expect(entries[0]).toMatchObject({kind: 'expense', amount: '42.10', category: 'Groceries', note: 'Example Supermarket · Weekly shop'});
  });
  test('a US file with money out and in columns, a signed amount, refusals and the all-positive warning', () => {
    const t = byId('us-bank'), parsed = parseCsv(templateCsv(t));
    expect(planMoneyRows({rows: parsed.rows, mapping: templateMapping(parsed.header, t), numberStyle: 'point', dateFormat: 'mdy', currency: 'USD'}).transactions.map(x => [x.direction, x.amount, x.currency])).toEqual([['out', '42.1', 'USD'], ['in', '1500', 'USD']]);
    const rows = [['2026-10-01', '-5.00', 'Cafe'], ['2026-10-02', '7.00', 'Refund'], ['bad', '1', 'x'], ['2026-10-03', 'abc', 'y'], ['2026-10-04', '0', 'z'], ['2026-10-01', '-5.00', 'Cafe']];
    const signed = planMoneyRows({rows, mapping: {date: 0, amount: 1, payee: 2}, numberStyle: 'point', dateFormat: 'iso'});
    expect(signed.transactions.map(x => [x.direction, !!x.duplicate])).toEqual([['out', false], ['in', false], ['out', true]]);
    expect(signed.refused.map(r => r.index)).toEqual([3, 4, 5]);
    expect(planMoneyRows({rows: [['2026-10-01', '5', 'A']], mapping: {date: 0, amount: 1, payee: 2}, numberStyle: 'point', dateFormat: 'iso'}).warnings.join(' ')).toMatch(/money in/);
    expect(planMoneyRows({rows: [['2026-10-01', '-5', 'POS']], mapping: {date: 0, amount: 1, direction: 2}, numberStyle: 'point', dateFormat: 'iso'})).toMatchObject({transactions: [{direction: 'out'}], warnings: [expect.stringMatching(/sign decided/)]});
  });
});

describe('saved mappings (zigoals:csv-mappings:v1)', () => {
  test('kept by column name, applied to a reordered header, refused when a column is missing', () => {
    expect(CSV_MAPPINGS_KEY).toBe('zigoals:csv-mappings:v1');
    const header = ['Date', 'Amount', 'Payee'];
    let r = saveMapping(emptyCsvMappings(), {name: 'My bank', target: 'money', header, mapping: {date: 0, amount: 1, payee: 2}, numberStyle: 'comma', dateFormat: 'dmy', delimiter: ';'}, 'm1', now);
    expect(r.mappings[0]).toMatchObject({columns: {date: 'Date', amount: 'Amount', payee: 'Payee'}, numberStyle: 'comma'});
    expect(applySaved(['payee', 'DATE', 'amount', 'extra'], r.mappings[0]!)).toEqual({date: 1, amount: 2, payee: 0});
    expect(applySaved(['Date', 'Payee'], r.mappings[0]!)).toBeNull();
    expect(findSaved(r, ['Payee', 'Amount', 'Date'], 'money')?.saved.id).toBe('m1');
    expect(findSaved(r, header, 'holdings')).toBeNull();
    r = saveMapping(r, {name: 'my bank', target: 'money', header, mapping: {date: 0}}, 'm2', now);
    expect(r.mappings.map(m => m.id)).toEqual(['m2']);
    expect(removeMapping(r, 'm2').mappings).toEqual([]);
    expect(() => saveMapping(r, {name: 'x', target: 'money', header, mapping: {}}, 'm3', now)).toThrow(/at least one/);
    expect(csvMappingsSchema.safeParse({...emptyCsvMappings(), later: 1}).success).toBe(true);
  });
  test('at most fifty, the oldest go', () => {
    let r = emptyCsvMappings();
    for (let i = 0; i < 55; i++) r = saveMapping(r, {name: `m${i}`, target: 'money', header: ['Date'], mapping: {date: 0}}, `id${i}`, now);
    expect(r.mappings).toHaveLength(50);
    expect(r.mappings[0]!.id).toBe('id5');
  });
});
