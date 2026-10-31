import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, test} from 'vitest';
import {NOT_RECOVERY_WORDS_FOR_TEST, RUN, findSecrets, findingText, secretKinds} from './secrets';
import {addressIssue, printable, putRow, removeRow, setDocuments, setNote, sheetView} from './sheet';
import {MAX_SHEET_ROWS, emergencySheetSchema, emptyEmergencySheet} from './schema';
import type {Account} from '../accounts/schema';

// Every sample is built at run time, so no line of this file looks like a key to the repository's own secret scan.
const words = (n: number, w = 'apple') => Array.from({length: n}, () => w).join(' ');
const hex64 = 'ab'.repeat(32), b58 = (n: number) => 'H'.repeat(n);
const now = new Date('2026-10-31T10:00:00Z');

describe('the secret guard (Session AK lane M, item 17)', () => {
  test('twelve or more short words in a row, however they are separated or numbered', () => {
    expect(secretKinds(words(12))).toEqual(['recovery-words']);
    expect(secretKinds(words(24).toUpperCase())).toEqual(['recovery-words']);
    expect(secretKinds(Array.from({length: 12}, (_, i) => `${i + 1}. apple`).join('\n'))).toEqual(['recovery-words']);
    expect(secretKinds(Array.from({length: 12}, () => 'apple').join(', '))).toEqual(['recovery-words']);
    expect(secretKinds(words(RUN - 1))).toEqual([]);
  });
  test('a written sentence is not mistaken for recovery words', () => {
    expect(secretKinds('The papers are in the grey box in the attic. Call Anna at the bank first, then the notary about the house and the car.')).toEqual([]);
    expect(secretKinds('please phone uncle peter about pension forms kept inside blue folder under desk drawer near window today')).toEqual([]);
    expect(secretKinds('please phone uncle peter about pension forms inside blue box under desk near window today')).toEqual(['recovery-words']); // errs on the side of not printing
  });
  test('the words that break a run are never recovery words (checked against the standard list in scripts/)', () => {
    const list = readFileSync(join(__dirname, '../../../../scripts/bip39-english.txt'), 'utf8').trim().split('\n');
    expect(list).toHaveLength(2048);
    expect(list.every(w => /^[a-z]{3,8}$/.test(w))).toBe(true);
    for (const w of NOT_RECOVERY_WORDS_FOR_TEST) expect(list).not.toContain(w);
  });
  test('raw, extended, WIF and PEM private keys', () => {
    expect(secretKinds(hex64)).toEqual(['hex-key']);
    expect(secretKinds(`key 0x${hex64}.`)).toEqual(['hex-key']);
    expect(secretKinds(`${hex64}ab`)).toEqual([]); // 66 hex: not a 64-character key
    expect(secretKinds(`xprv${b58(107)}`)).toEqual(['extended-private-key']);
    expect(secretKinds(`5${b58(50)}`)).toEqual(['wif']);
    expect(secretKinds(`K${b58(51)}`)).toEqual(['wif']);
    expect(secretKinds(['-----BEGIN EC ', 'PRIVATE KEY-----'].join(''))).toEqual(['pem']);
  });
  test('public addresses pass', () => {
    for (const address of [`0x${'ab'.repeat(20)}`, `bc1q${'a'.repeat(38)}`, `zig1${'q'.repeat(38)}`, `1${b58(33)}`, `xpub${b58(107)}`]) expect(secretKinds(address), address).toEqual([]);
  });
  test('findings name the field and the reason', () => {
    const f = findSecrets([['The note', words(12)], ['Wallet 1 (Savings): address', hex64], ['Other', undefined]]);
    expect(f.map(findingText)).toEqual(['The note looks like recovery words (12 or more short words in a row).', 'Wallet 1 (Savings): address looks like a private key (64 hexadecimal characters).']);
  });
});

describe('the emergency sheet', () => {
  const account: Account = {id: '00000000-0000-4000-8000-000000000001', kind: 'savings', name: 'Rainy day', currency: 'EUR', institution: 'Example Bank', snapshots: [{id: '00000000-0000-4000-8000-000000000002', date: '2026-10-01', value: '1234500', decimals: 2}], payments: [], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z'};
  const archived: Account = {...account, id: '00000000-0000-4000-8000-000000000003', name: 'Old', archivedAt: '2026-02-01T00:00:00.000Z'};
  test('Wealth\'s accounts with their latest balance and where the documents are, then the typed rows', () => {
    let sheet = setDocuments(emptyEmergencySheet(), account.id, ' Grey box, attic ', now);
    sheet = putRow(sheet, 'accounts', {id: 'a1', name: 'Pension', institution: 'Example Fund', value: 'about 40,000'}, now);
    sheet = putRow(sheet, 'wallets', {id: 'w1', label: 'Savings wallet', network: 'Bitcoin', address: `bc1q${'a'.repeat(38)}`}, now);
    sheet = putRow(sheet, 'insurance', {id: 'i1', provider: 'Example Insurer', kind: 'Life', reference: 'POL-123'}, now);
    sheet = setNote(sheet, 'Call Anna first.', now);
    const view = sheetView(sheet, [account, archived], '2026-10-31', k => k === 'savings' ? 'Savings' : k);
    expect(view.accounts).toEqual([
      {name: 'Rainy day', institution: 'Example Bank', kind: 'Savings', value: 'about 12345.00 EUR (2026-10-01)', documents: 'Grey box, attic'},
      {name: 'Pension', institution: 'Example Fund', kind: '', value: 'about 40,000', documents: ''},
    ]);
    expect(printable(view)).toEqual({ok: true});
    expect(emergencySheetSchema.safeParse(sheet).success).toBe(true);
    expect(sheet.updatedAt).toBe(now.toISOString());
  });
  test('it refuses to print while any field looks like a key, and says where', () => {
    const sheet = putRow(emptyEmergencySheet(), 'wallets', {id: 'w1', label: 'Hot', address: hex64}, now);
    const out = printable(sheetView(setNote(sheet, words(12), now), [], '2026-10-31'));
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.findings.map(f => f.field)).toEqual(['Wallet 1 (Hot): address', 'The note']);
  });
  test('rows: replace, remove, bounded; documents removed when emptied; an address is one piece', () => {
    let sheet = putRow(emptyEmergencySheet(), 'insurance', {id: 'i1', provider: 'A'}, now);
    sheet = putRow(sheet, 'insurance', {id: 'i1', provider: 'B'}, now);
    expect(sheet.insurance.map(r => r.provider)).toEqual(['B']);
    expect(removeRow(sheet, 'insurance', 'i1', now).insurance).toEqual([]);
    const full = emergencySheetSchema.parse({version: 1, insurance: Array.from({length: MAX_SHEET_ROWS}, (_, i) => ({id: `i${i}`, provider: 'x'}))});
    expect(() => putRow(full, 'insurance', {id: 'new', provider: 'y'}, now)).toThrow(/Up to 50/);
    expect(setDocuments(setDocuments(emptyEmergencySheet(), 'abc', 'x', now), 'abc', ' ', now).documents).toEqual({});
    expect(addressIssue('bc1q abc')).toMatch(/one piece/);
    expect(addressIssue(`zig1${'q'.repeat(38)}`)).toBeNull();
    expect(emergencySheetSchema.parse({version: 1})).toEqual(emptyEmergencySheet());
  });
});
