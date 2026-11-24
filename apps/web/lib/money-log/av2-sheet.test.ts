// @vitest-environment jsdom
import {describe, expect, it} from 'vitest';
import {countedBetween} from './counted';
import {monthGrid, monthsBetween, rangeOf, sheetCsv, sheetRows, sheetWorkbook, sortRows} from './sheet';
import {buildXlsx, columnName, sheetName} from '../export/xlsx';
import {crc32} from '../export/zip';
import {moneyLogSchema, type MoneyEntry} from './schema';
import type {Accounts} from '../accounts/schema';

/**
 * Session AV lane 2, round 5 (money; Tiller's Foundation Template, LEDGER #389): the money log as a table, a CSV through
 * the export's guard and one .xlsx workbook written by hand — its parts well-formed XML, its months by the shared rule,
 * its totals working SUM formulas, and no text that a spreadsheet would run as a formula.
 */
const A = '2026-01-01T09:00:00.000Z', TODAY = '2026-11-14';
let n = 0;
const e = (over: Partial<MoneyEntry>): MoneyEntry => ({id: `s-${n++}`, kind: 'expense', amount: '10.00', currency: 'EUR', category: 'Groceries', date: '2026-11-03', createdAt: A, ...over});
const ENTRIES = [e({amount: '42.10', note: 'Market'}), e({amount: '90.00', share: '30.00', note: '=HYPERLINK("http://x")', account: 'ING'}), e({amount: '50.00', excluded: true}), e({amount: '1200.00', date: '2026-09-15', spread: 12, category: 'Bills'}),
  e({kind: 'income', amount: '2000.00', category: 'Salary', date: '2026-11-01'}), e({amount: '25.00', transfer: 's-x'}), e({amount: '8.00', currency: 'USD', date: '2026-10-02'}), e({amount: '5.00', date: '2025-12-30'})];
const LOG = moneyLogSchema.parse({version: 1, weekStartsOn: 'monday', entries: ENTRIES, own: {expense: ['Pets']}, subs: {Groceries: ['Market']}, archived: {expense: ['Gifts']}});
const ACCOUNTS: Accounts = {version: 1, items: [{id: '00000000-0000-4000-8000-0000000f0001', kind: 'cash', name: 'Current', currency: 'EUR', snapshots: [{id: '00000000-0000-4000-8000-0000000f0009', date: '2026-11-01', value: '123456', decimals: 2}], payments: [], createdAt: A, updatedAt: A}]};

/** A reader for stored (method 0) ZIPs, independent of the writer: each local header, its name and bytes, CRC checked. */
function unzip(bytes: Uint8Array): Map<string, string> {
  const out = new Map<string, string>(), view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), dec = new TextDecoder();
  let at = 0;
  while (view.getUint32(at, true) === 0x04034B50) {
    expect(view.getUint16(at + 8, true)).toBe(0);
    const crc = view.getUint32(at + 14, true), size = view.getUint32(at + 18, true), nameLength = view.getUint16(at + 26, true), extra = view.getUint16(at + 28, true);
    const name = dec.decode(bytes.subarray(at + 30, at + 30 + nameLength)), data = bytes.subarray(at + 30 + nameLength + extra, at + 30 + nameLength + extra + size);
    expect(crc32(data)).toBe(crc);
    out.set(name, dec.decode(data)); at += 30 + nameLength + extra + size;
  }
  return out;
}
const wellFormed = (xml: string) => new DOMParser().parseFromString(xml, 'application/xml').getElementsByTagName('parsererror').length === 0;

describe('the table and the CSV', () => {
  it('the range’s entries, newest first, with what the figures count', () => {
    const {from, to} = rangeOf('month', TODAY, ENTRIES), rows = sheetRows(ENTRIES, from, to);
    expect([from, to]).toEqual(['2026-11-01', TODAY]);
    expect(rows.map(r => [r.amount, r.counted, r.as])).toEqual([[4210, 4210, 'counted'], [9000, 3000, 'counted'], [5000, 0, 'left out'], [2500, 0, 'transfer'], [200000, 200000, 'counted']]);
    expect(sortRows(rows, 'amount', 'descending')[0]!.kind).toBe('income');
    expect(rangeOf('all', TODAY, ENTRIES).from).toBe('2025-12-30');
    expect(rangeOf('3m', TODAY, ENTRIES).from).toBe('2026-09-01');
  });
  it('the CSV quotes every cell and defuses a formula', () => {
    const csv = sheetCsv(sheetRows(ENTRIES, '2026-11-01', TODAY));
    expect(csv.split('\r\n')[0]).toBe('"Date","Kind","Category","Subcategory","Note","Account (bank file)","Paid with","Amount","Counted","Currency","Counted as","Spread over months","Entry id"');
    expect(csv).toContain('"\'=HYPERLINK(""http://x"")"');
    expect(csv).toContain('"90.00","30.00","EUR","counted"');
  });
  it('month by month by the shared rule: each month adds up to countedBetween', () => {
    const grid = monthGrid(ENTRIES, '2026-09-01', TODAY), eur = grid.find(g => g.currency === 'EUR')!;
    expect(eur.months).toEqual(['2026-09', '2026-10', '2026-11']);
    expect(eur.spending.find(r => r.category === 'Bills')!.cents).toEqual([10000, 10000, 0]); // its Nov share falls on the 15th, after today
    eur.months.forEach((m, i) => {
      const to = m === '2026-11' ? TODAY : `${m}-${m === '2026-09' ? '30' : '31'}`;
      expect(eur.spending.reduce((s, r) => s + r.cents[i]!, 0)).toBe(countedBetween(ENTRIES, `${m}-01`, to, {kind: 'expense', currency: 'EUR'}).get('EUR') ?? 0);
    });
    expect(eur.income).toEqual([{category: 'Salary', cents: [0, 0, 200000]}]);
    expect(grid.map(g => g.currency)).toEqual(['EUR', 'USD']);
    expect(monthsBetween('2025-11-30', '2026-02-01')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });
});

describe('the workbook', () => {
  const files = unzip(sheetWorkbook({log: LOG, accounts: ACCOUNTS, from: '2026-09-01', to: TODAY, today: TODAY, modified: new Date('2026-11-14T10:00:00Z')}));
  it('a valid package: content types, relationships, a workbook of four sheets, styles; all well-formed XML', () => {
    expect([...files.keys()]).toEqual(['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml', 'xl/worksheets/sheet3.xml', 'xl/worksheets/sheet4.xml']);
    for (const [name, xml] of files) expect(wellFormed(xml), name).toBe(true);
    expect(files.get('xl/workbook.xml')).toContain('<sheet name="Entries" sheetId="1" r:id="rId1"/><sheet name="Categories" sheetId="2" r:id="rId2"/><sheet name="Accounts" sheetId="3" r:id="rId3"/><sheet name="Month by month" sheetId="4" r:id="rId4"/>');
  });
  it('entries as text and numbers; a formula-looking note stays text; only the writer’s own formulas', () => {
    const entries = files.get('xl/worksheets/sheet1.xml')!;
    expect(entries).toContain('<t xml:space="preserve">&apos;=HYPERLINK(&quot;http://x&quot;)</t>');
    expect(entries).not.toContain('<f>');
    expect(entries).toContain('<v>90</v>'); expect(entries).toContain('<v>30</v>');
    const months = files.get('xl/worksheets/sheet4.xml')!;
    expect(months).toContain('<f>SUM(B3:D3)</f>');
    expect(months.match(/<f>SUM\(B\d+:B\d+\)<\/f>/)).not.toBeNull();
  });
  it('categories with their subcategories and marks; accounts with their latest balance and the bank-file names', () => {
    const cats = files.get('xl/worksheets/sheet2.xml')!, accounts = files.get('xl/worksheets/sheet3.xml')!;
    expect(cats).toContain('>Pets<'); expect(cats).toContain('>Market<'); expect(cats).toContain('>Gifts<');
    expect(accounts).toContain('>Current<'); expect(accounts).toContain('<v>1234.56</v>'); expect(accounts).toContain('>ING<');
  });
  it('the writer’s own rules: column names, sheet names, at least one sheet', () => {
    expect([columnName(0), columnName(25), columnName(26), columnName(701)]).toEqual(['A', 'Z', 'AA', 'ZZ']);
    expect(sheetName('a/b:c?', new Set())).toBe('a b c');
    expect(sheetName('Entries', new Set(['entries']))).toBe('Entries 2');
    expect(() => buildXlsx([], new Date())).toThrow();
  });
  it('review b5k #8: the business space’s workbook never holds the personal accounts', () => {
    const biz = unzip(sheetWorkbook({log: LOG, accounts: ACCOUNTS, from: '2026-09-01', to: TODAY, today: TODAY, modified: new Date('2026-11-14T10:00:00Z'), business: true})).get('xl/worksheets/sheet3.xml')!;
    expect(biz).not.toContain('>Current<'); expect(biz).not.toContain('1234.56');
    expect(biz).toContain('>ING<');
    expect(biz).toContain('kept in your personal space');
  });
});
