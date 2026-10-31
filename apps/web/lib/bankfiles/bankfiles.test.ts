import {describe, expect, test} from 'vitest';
import {emptyMoneyLog} from '../money-log/schema';
import {addEntries, alreadyLogged, decodeBankFile, duplicateKey, parseBankFile, sniffFormat, toMoneyEntries, type BankParseResult} from './index';
import {readInfo} from './mt940';
import {cleanText, readAmount} from './text';
import {MAX_BANK_TRANSACTIONS} from './types';

// Fictional statements written for these tests (no real account or person).
const camt = (entries: string, extra = '') => `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.02"><BkToCstmrStmt><GrpHdr><MsgId>T1</MsgId></GrpHdr>
<Stmt><Id>S1</Id><Acct><Id><IBAN>NL00TEST0000000001</IBAN></Id><Ccy>EUR</Ccy></Acct>
<Bal><Tp><CdOrPrtry><Cd>OPBD</Cd></CdOrPrtry></Tp><Amt Ccy="EUR">1000.00</Amt><CdtDbtInd>CRDT</CdtDbtInd><Dt><Dt>2026-10-01</Dt></Dt></Bal>
<Bal><Tp><CdOrPrtry><Cd>CLBD</Cd></CdOrPrtry></Tp><Amt Ccy="EUR">2387.01</Amt><CdtDbtInd>CRDT</CdtDbtInd><Dt><Dt>2026-10-31</Dt></Dt></Bal>
${entries}${extra}</Stmt></BkToCstmrStmt></Document>`;
const ntry = (amt: string, ind: 'CRDT' | 'DBIT', date: string, party: string, ref: string, ustrd = '', sts = 'BOOK') => `<Ntry><Amt Ccy="EUR">${amt}</Amt><CdtDbtInd>${ind}</CdtDbtInd><Sts>${sts}</Sts><BookgDt><Dt>${date}</Dt></BookgDt><ValDt><Dt>${date}</Dt></ValDt><AcctSvcrRef>${ref}</AcctSvcrRef>
<NtryDtls><TxDtls><Refs><EndToEndId>E2E-${ref}</EndToEndId></Refs><RltdPties><${ind === 'DBIT' ? 'Cdtr' : 'Dbtr'}><Nm>${party}</Nm></${ind === 'DBIT' ? 'Cdtr' : 'Dbtr'}></RltdPties><RmtInf><Ustrd>${ustrd}</Ustrd></RmtInf></TxDtls></NtryDtls></Ntry>`;
const ok = (r: BankParseResult) => { if (!r.ok) throw Error(r.error); return r; };
const failed = (r: BankParseResult) => { expect(r.ok).toBe(false); return r.ok ? '' : r.error; };

describe('text and amounts', () => {
  test('control, bidi and formula characters are removed and flagged', () => {
    expect(cleanText('=HYPERLINK("x")')).toEqual({text: 'HYPERLINK("x")', flagged: true});
    expect(cleanText('  @SUM(A1)')).toEqual({text: 'SUM(A1)', flagged: true});
    expect(cleanText('＝cmd')).toEqual({text: 'cmd', flagged: true});
    expect(cleanText('Shop‮gnp.exe\u0007  Amsterdam')).toEqual({text: 'Shopgnp.exe Amsterdam', flagged: false});
    expect(cleanText('x'.repeat(500)).text).toHaveLength(140);
  });
  test('amounts with either decimal mark, signs, brackets; nonsense refused', () => {
    expect(readAmount('1.234,56')).toEqual({amount: '1234.56', negative: false});
    expect(readAmount('-12.50')).toEqual({amount: '12.5', negative: true});
    expect(readAmount('12,', 'comma')).toEqual({amount: '12', negative: false});
    expect(readAmount('(3.00)')).toEqual({amount: '3', negative: true});
    expect(readAmount('7.25-')).toEqual({amount: '7.25', negative: true});
    for (const bad of ['', 'abc', '1e5', '1.2.3,4,5', '--', '1'.repeat(20)]) expect(readAmount(bad)).toBeNull();
  });
});

describe('CAMT.053', () => {
  const file = camt([ntry('12.99', 'DBIT', '2026-10-03', 'Streaming Service B.V.', 'REF1', 'October plan'), ntry('2400.00', 'CRDT', '2026-10-25', 'Example Employer', 'REF2', 'Salary October'), ntry('0.10', 'DBIT', '2026-10-26', 'Bank', 'REF3', '', 'PDNG')].join('\n'));
  test('entries, direction, payee, reference, balances and running balance', () => {
    const r = ok(parseBankFile(file));
    expect(r.format).toBe('camt053');
    expect(r.account).toBe('NL00TEST0000000001');
    expect(r.transactions).toEqual([
      {date: '2026-10-03', amount: '12.99', currency: 'EUR', direction: 'out', payee: 'Streaming Service B.V.', reference: 'REF1', description: 'October plan', balance: '987.01', index: 1},
      {date: '2026-10-25', amount: '2400', currency: 'EUR', direction: 'in', payee: 'Example Employer', reference: 'REF2', description: 'Salary October', balance: '3387.01', index: 2},
    ]);
    expect(r.refused).toEqual([{index: 3, reason: 'Pending at the bank, not booked yet.'}]);
    expect(r.balances).toEqual([{kind: 'opening', date: '2026-10-01', amount: '1000', currency: 'EUR'}, {kind: 'closing', date: '2026-10-31', amount: '2387.01', currency: 'EUR'}]);
  });
  test('any version namespace and a prefix read alike', () => {
    const v8 = file.replace('camt.053.001.02', 'camt.053.001.08').replace(/<(\/?)(\w)/g, '<$1c:$2').replace('<c:Document xmlns=', '<c:Document xmlns:c=');
    expect(ok(parseBankFile(v8)).transactions).toHaveLength(2);
  });
  test('a formula in a payee is removed and said', () => {
    const r = ok(parseBankFile(camt(ntry('5.00', 'DBIT', '2026-10-04', '=cmd|calc', 'R9'))));
    expect(r.transactions[0]!.payee).toBe('cmd|calc');
    expect(r.warnings.join(' ')).toMatch(/formula sign/);
  });
  test('rows with a bad amount, currency, indicator or date are refused with reasons', () => {
    const bad = [ntry('abc', 'DBIT', '2026-10-03', 'A', '1'), ntry('1.00', 'DBIT', '2026-13-03', 'B', '2'), ntry('1.00', 'DBIT', '2026-10-03', 'C', '3').replace('<CdtDbtInd>DBIT', '<CdtDbtInd>MAYBE'), ntry('1.00', 'DBIT', '2026-10-03', 'D', '4').replace('Ccy="EUR"', 'Ccy="euro"')];
    expect(ok(parseBankFile(camt(bad.join('')))).refused.map(r => r.reason)).toEqual(['The amount could not be read.', 'The booking date could not be read.', 'It does not say whether money came in or went out.', 'The currency could not be read.']);
  });
  test('entity bombs, external entities, a document type and truncated or nested-too-deep files are refused, never thrown', () => {
    const bomb = `<?xml version="1.0"?><!DOCTYPE lolz [<!ENTITY lol "lol"><!ENTITY lol2 "&lol;&lol;&lol;&lol;">]><Document><BkToCstmrStmt>&lol2;</BkToCstmrStmt></Document>`;
    const xxe = `<?xml version="1.0"?><!DOCTYPE d [<!ENTITY x SYSTEM "file:///etc/passwd">]><Document><BkToCstmrStmt><Stmt>&x;</Stmt></BkToCstmrStmt></Document>`;
    const plainDoctype = `<?xml version="1.0"?><!DOCTYPE Document SYSTEM "camt.dtd"><Document><BkToCstmrStmt><Stmt/></BkToCstmrStmt></Document>`;
    expect(failed(parseBankFile(bomb))).toMatch(/document type/);
    expect(failed(parseBankFile(xxe))).toMatch(/document type/);
    expect(failed(parseBankFile(plainDoctype))).toMatch(/document type/);
    expect(failed(parseBankFile(file.slice(0, Math.floor(file.length * 0.6))))).toMatch(/could not be read/);
    expect(failed(parseBankFile(`<Document><BkToCstmrStmt>${'<a>'.repeat(50_000)}${'</a>'.repeat(50_000)}</BkToCstmrStmt></Document>`))).toMatch(/./);
    expect(failed(parseBankFile('<Document><BkToCstmrStmt>&unknown;</BkToCstmrStmt></Document>'))).toMatch(/could not be read/);
    expect(failed(parseBankFile('<Document><BkToCstmrStmt></BkToCstmrStmt></Document>'))).toMatch(/no statement/);
  });
});

describe('OFX and QFX', () => {
  const v1 = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII

<OFX><SIGNONMSGSRSV1><SONRS><STATUS><CODE>0<SEVERITY>INFO</STATUS><DTSERVER>20261031120000<LANGUAGE>ENG</SONRS></SIGNONMSGSRSV1>
<BANKMSGSRSV1><STMTTRNRS><TRNUID>1<STMTRS><CURDEF>USD<BANKACCTFROM><BANKID>000000000<ACCTID>TEST-1234<ACCTTYPE>CHECKING</BANKACCTFROM>
<BANKTRANLIST><DTSTART>20261001<DTEND>20261031
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261003120000.000[-5:EST]<TRNAMT>-42.10<FITID>F1<NAME>Corner Grocery &amp; Deli<MEMO>Card purchase</STMTTRN>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261015<TRNAMT>1500.00<FITID>F2<NAME>Example Payroll</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261016<TRNAMT>-9.99<FITID>F3<NAME><MEMO>Music subscription<CURRENCY><CURRATE>1.0<CURSYM>EUR</CURRENCY></STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>2026-10-17<TRNAMT>-1.00<FITID>F4<NAME>Bad date</STMTTRN>
</BANKTRANLIST><LEDGERBAL><BALAMT>1447.91<DTASOF>20261031</LEDGERBAL></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
  test('version 1 SGML without closing tags', () => {
    const r = ok(parseBankFile(v1));
    expect(r.format).toBe('ofx');
    expect(r.account).toBe('TEST-1234');
    expect(r.transactions.map(t => [t.date, t.amount, t.currency, t.direction, t.payee, t.reference])).toEqual([
      ['2026-10-03', '42.1', 'USD', 'out', 'Corner Grocery & Deli', 'F1'], ['2026-10-15', '1500', 'USD', 'in', 'Example Payroll', 'F2'], ['2026-10-16', '9.99', 'EUR', 'out', 'Music subscription', 'F3'],
    ]);
    expect(r.transactions[2]!.description).toBe('Music subscription');
    expect(r.refused).toEqual([{index: 4, reason: 'The posting date could not be read.'}]);
    expect(r.balances).toEqual([{kind: 'closing', date: '2026-10-31', amount: '1447.91', currency: 'USD'}]);
  });
  test('version 2 XML, and a credit card statement', () => {
    const v2 = `<?xml version="1.0" encoding="UTF-8"?><?OFX OFXHEADER="200" VERSION="220" SECURITY="NONE"?>
<OFX><CREDITCARDMSGSRSV1><CCSTMTTRNRS><CCSTMTRS><CURDEF>GBP</CURDEF><CCACCTFROM><ACCTID>CARD-9</ACCTID></CCACCTFROM>
<BANKTRANLIST><STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20261002</DTPOSTED><TRNAMT>-3.20</TRNAMT><FITID>X1</FITID><NAME>Coffee Cart</NAME><MEMO></MEMO></STMTTRN></BANKTRANLIST>
</CCSTMTRS></CCSTMTTRNRS></CREDITCARDMSGSRSV1></OFX>`;
    const r = ok(parseBankFile(v2));
    expect(r.transactions).toEqual([{date: '2026-10-02', amount: '3.2', currency: 'GBP', direction: 'out', payee: 'Coffee Cart', reference: 'X1', description: '', index: 1}]);
    expect(r.account).toBe('CARD-9');
  });
  test('a declaration, a cut-off file and garbage are handled', () => {
    expect(failed(parseBankFile(`<?xml version="1.0"?><!DOCTYPE OFX [<!ENTITY a "b">]><OFX></OFX>`))).toMatch(/document type/);
    expect(ok(parseBankFile(v1.slice(0, v1.indexOf('<STMTTRN><TRNTYPE>CREDIT') + 30))).transactions).toHaveLength(1);
    expect(failed(parseBankFile('OFXHEADER:100\n<OFX><BANKMSGSRSV1></BANKMSGSRSV1></OFX>'))).toMatch(/no bank or card statement/);
    expect(failed(parseBankFile(`OFXHEADER:100\n<OFX>${'<A>'.repeat(200)}`))).toMatch(/too deeply/);
    expect(failed(parseBankFile('OFXHEADER:100\n<OFX><B@D>'))).toMatch(/tag/);
  });
});

describe('MT940', () => {
  const mt = `{1:F01TESTNL2AXXXX0000000000}{2:I940TESTNL2AXXXXN}{4:
:20:P231031000001
:25:NL00TEST0000000001
:28C:00000
:60F:C261001EUR1000,00
:61:2610031003D12,99NTRFNONREF//B26100300001
:86:/EREF/NOTPROVIDED//CNTP/NL00TEST0000000002/TESTNL2A/Streaming Service/AMSTERDAM/
/REMI/USTD//Monthly plan October/
:61:2612310102C2400,NTRFREF-SAL//B26123100002
:86:/NAME/Example Employer/REMI/USTD//Salary/
:61:261005D5,50NMSCNONREF
:86:166?00SEPA-LASTSCHRIFT?20EREF+ABC123?21Gym fee?32Fitness Club?33 GmbH
:61:26100XD1,00NTRF
:62F:C261231EUR3381,51
-}`;
  test('statements, entry dates across New Year, reversal-free D/C, code words and German subfields', () => {
    const r = ok(parseBankFile(mt));
    expect(r.format).toBe('mt940');
    expect(r.account).toBe('NL00TEST0000000001');
    expect(r.transactions.map(t => [t.date, t.amount, t.direction, t.payee, t.reference, t.balance])).toEqual([
      ['2026-10-03', '12.99', 'out', 'Streaming Service', 'B26100300001', '987.01'],
      ['2027-01-02', '2400', 'in', 'Example Employer', 'B26123100002', '3387.01'],
      ['2026-10-05', '5.5', 'out', 'Fitness Club GmbH', 'ABC123', '3381.51'],
    ]);
    expect(r.transactions[0]!.description).toBe('Monthly plan October');
    expect(r.refused).toEqual([{index: 4, reason: 'The :61: line could not be read.'}]);
    expect(r.balances.map(b => [b.kind, b.amount])).toEqual([['opening', '1000'], ['closing', '3381.51']]);
  });
  test('reversals: RD comes back in, RC goes out', () => {
    const r = ok(parseBankFile(':20:X\n:25:ACC\n:60F:C261001EUR0,00\n:61:261002RD3,00NTRFNONREF\n:61:261002RC2,00NTRFNONREF\n'));
    expect(r.transactions.map(t => t.direction)).toEqual(['in', 'out']);
  });
  test('without an opening balance the currency is unknown, so rows are refused, not guessed', () => {
    expect(ok(parseBankFile(':20:X\n:25:ACC\n:61:261002D3,00NTRFNONREF\n')).refused[0]!.reason).toMatch(/currency is unknown/);
  });
  test('free-text :86:', () => expect(readInfo('Albert Example  Groceries 12')).toEqual({payee: 'Albert Example', description: 'Albert Example  Groceries 12', reference: ''}));
});

describe('the file as bytes, limits and duplicates', () => {
  test('UTF-8, UTF-16 with a byte-order mark and Windows-1252 (Latin-1) decode', () => {
    const text = ':20:X\n:86:Café Zoë\n';
    expect(decodeBankFile(new TextEncoder().encode(`﻿${text}`))).toBe(text);
    const utf16 = new Uint8Array(2 + text.length * 2); utf16[0] = 0xff; utf16[1] = 0xfe; [...text].forEach((c, i) => { utf16[2 + i * 2] = c.charCodeAt(0); });
    expect(decodeBankFile(utf16)).toBe(text);
    const latin1 = Uint8Array.from([...text].map(c => c.charCodeAt(0)));
    expect(decodeBankFile(latin1)).toBe(text);
  });
  test('size and count caps; binary and unknown files', () => {
    expect(() => decodeBankFile(new Uint8Array(5_000_001))).toThrow(/5 MB/);
    expect(failed(parseBankFile('x'.repeat(5_000_001)))).toMatch(/5 MB/);
    const many = `:20:X\n:25:A\n:60F:C261001EUR0,00\n${':61:261002D1,00NTRFNONREF\n'.repeat(MAX_BANK_TRANSACTIONS + 1)}`;
    expect(failed(parseBankFile(many))).toMatch(/20,000/);
    expect(failed(parseBankFile('PK\u0003\u0004\u0000\u0000binary'))).toMatch(/not a text file/);
    expect(failed(parseBankFile('date,amount\n2026-10-01,5'))).toMatch(/CSV import/);
    expect(sniffFormat('{4:\n:20:X\n')).toBe('mt940');
  });
  test('random bytes and cut files never throw', () => {
    let seed = 7;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed; };
    const samples = [camt(ntry('1.00', 'DBIT', '2026-10-03', 'A', 'R')), ':20:X\n:25:A\n:60F:C261001EUR0,00\n:61:261002D1,00NTRFNONREF\n:86:/NAME/A/', 'OFXHEADER:100\n<OFX><STMTRS><CURDEF>EUR<BANKTRANLIST><STMTTRN><DTPOSTED>20261001<TRNAMT>-1<FITID>1</STMTTRN></BANKTRANLIST></STMTRS></OFX>'];
    for (let i = 0; i < 300; i++) {
      const base = samples[i % samples.length]!, cut = rnd() % base.length, chars = [...base.slice(0, cut)];
      for (let j = 0; j < 3; j++) chars[rnd() % Math.max(1, chars.length)] = String.fromCharCode(rnd() % 0x3000);
      expect(() => parseBankFile(chars.join(''))).not.toThrow();
    }
  });
  test('duplicates in a file are marked; the money log rows and their checks', () => {
    const file = camt([ntry('4.20', 'DBIT', '2026-10-03', 'Coffee', 'R1'), ntry('4.20', 'DBIT', '2026-10-03', 'Coffee', 'R1'), ntry('4.20', 'DBIT', '2026-10-03', 'Coffee', 'R2'), ntry('0.001', 'DBIT', '2026-10-04', 'Odd', 'R4'), ntry('0.00', 'DBIT', '2026-10-04', 'Zero', 'R5')].join(''));
    const r = ok(parseBankFile(file));
    expect(r.transactions.map(t => !!t.duplicate)).toEqual([false, true, false, false, false]);
    expect(duplicateKey(r.transactions[0]!)).toBe(duplicateKey(r.transactions[1]!));
    let id = 0;
    const out = toMoneyEntries(r.transactions.filter(t => !t.duplicate), emptyMoneyLog(), new Date('2026-10-31T10:00:00Z'), () => `bank-${id++}`);
    expect(out.entries.map(e => [e.kind, e.amount, e.currency, e.category, e.note, e.date])).toEqual([['expense', '4.20', 'EUR', 'Food & drink', 'Coffee', '2026-10-03'], ['expense', '4.20', 'EUR', 'Food & drink', 'Coffee', '2026-10-03']]);
    expect(out.refused.map(x => x.reason)).toEqual(['The amount has more than two decimals or is too large.', 'A zero amount is not kept.']);
    const log = addEntries(emptyMoneyLog(), out.entries.slice(0, 1));
    expect(alreadyLogged(r.transactions[0]!, log)).toBe(true);
    expect(alreadyLogged(r.transactions[3]!, log)).toBe(false);
    expect(log.currency).toBeUndefined();
  });
});
