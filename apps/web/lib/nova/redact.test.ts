import {readFileSync} from 'node:fs';
import {describe, expect, test} from 'vitest';
import {ibanValid, knownNamesFrom, luhnValid, namesIn, parseAmount, PLACEHOLDERS, redactionSummary, redactText, roundAmount} from './redact';
// Built at run time from the repository's word list (scripts/secret-patterns.mjs scans source text for literal seeds and keys).
const FIRST_12_WORDS = readFileSync(new URL('../../../../scripts/bip39-english.txt', import.meta.url), 'utf8').trim().split('\n').slice(0, 12).join(' ');

const r = (text: string, knownNames: string[] = []) => redactText(text, {knownNames});
const same = (text: string) => expect(r(text).text).toBe(text);

describe('secrets (the emergency sheet detector, reused)', () => {
  const words = FIRST_12_WORDS;
  test('twelve recovery words on one line, in a sentence, numbered one per line', () => {
    expect(r(`my words: ${words}`).text).not.toContain('abandon');
    expect(r(words).found.secret).toBeGreaterThan(0);
    const numbered = words.split(' ').map((w, i) => `${i + 1}. ${w}`).join('\n');
    const out = r(`Saved on 2026-11-01:\n${numbered}\nThank you, that is all.`);
    expect(out.text).not.toMatch(/abandon|accident|absurd|access/);
    expect(out.text).toBe(`Saved on 2026-11-01:\n${PLACEHOLDERS.secret}\nThank you, that is all.`);
  });
  test('a raw private key, an xprv, a PEM block', () => {
    const hex = 'e9873d79c6d87dc0fb6a5778633389f4453213303da61f20bd67fc233aa33262';
    const out = r(`key ${hex} done`);
    expect(out.text).toBe(`key ${PLACEHOLDERS.secret} done`);
    const pem = [`-----${'BEGIN'} PRIVATE ${'KEY'}-----`, 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASC', `-----${'END'} PRIVATE ${'KEY'}-----`].join('\n');
    expect(r(`here:\n${pem}\nend`).text).toBe(`here:\n${PLACEHOLDERS.secret}\nend`);
  });
  test('ordinary sentences and a public sentence of short words stay', () => {
    same('I walked the dog and then made dinner for the kids.');
    same('Habit: Morning run · daily · streak 4 · done today');
  });
});

describe('account numbers, cards, wallets, e-mail, phones', () => {
  test('IBANs with and without spaces (checksum verified), and a labelled one', () => {
    expect(ibanValid('BE68 5390 0754 7034')).toBe(true);
    expect(ibanValid('GB82WEST12345698765432')).toBe(true);
    expect(ibanValid('BE68 5390 0754 7035')).toBe(false);
    expect(r('Pay to BE68 5390 0754 7034 today').text).toBe(`Pay to ${PLACEHOLDERS.iban} today`);
    expect(r('NL91ABNA0417164300').text).toBe(PLACEHOLDERS.iban);
    expect(r('IBAN: DE00 1234 5678 9012 3456 78').text).toBe(`IBAN: ${PLACEHOLDERS.iban}`);
  });
  test('card numbers pass Luhn; a 16-digit run that fails Luhn is still an account number', () => {
    expect(luhnValid('4111111111111111')).toBe(true);
    expect(luhnValid('1111111111111111')).toBe(false);
    expect(r('card 4111 1111 1111 1111 exp').text).toBe(`card ${PLACEHOLDERS.card} exp`);
    expect(r('ref 1234 5678 9012 3456').text).toBe(`ref ${PLACEHOLDERS.account}`);
  });
  test('long digit runs are account numbers; dates, times and short numbers are not', () => {
    expect(r('account 12345678').text).toBe(`account ${PLACEHOLDERS.account}`);
    same('On 2026-11-01 and 2026-11-02 I logged 3 runs');
    same('Logged 2026-10-30 2026-10-31 2026-11-01');
    same('at 2026-11-01T19:00:00.000Z, 7 of 10 habits, 12,500 steps');
    same('Born 01/11/1990, moved 1.11.2026');
    same('Version 2.4.1 runs at 19:00');
  });
  test('wallet addresses and e-mail', () => {
    expect(r('send to 0x52908400098527886E0F7030069857D2E4169EE7 now').text).toBe(`send to ${PLACEHOLDERS.wallet} now`);
    expect(r('zig1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc5lzv7xu is mine').text).toBe(`${PLACEHOLDERS.wallet} is mine`);
    expect(r('write to anna.devries+goals@example.be please').text).toBe(`write to ${PLACEHOLDERS.email} please`);
  });
  test('phone numbers, international and national', () => {
    expect(r('call +32 470 12 34 56').text).toBe(`call ${PLACEHOLDERS.phone}`);
    expect(r('ring 0470 12 34 56 later').text).toBe(`ring ${PLACEHOLDERS.phone} later`);
    expect(r('office (020) 7946 0958').text).toContain(PLACEHOLDERS.phone);
    expect(r('US +1 415-555-0132').text).toBe(`US ${PLACEHOLDERS.phone}`);
    same('Drink 0.5 litres, 3 times');
  });
});

describe('exact amounts become rounded', () => {
  test('the rounding rule', () => {
    expect(roundAmount(0)).toBe('0');
    expect(roundAmount(0.4)).toBe('less than 1');
    expect(roundAmount(7.6)).toBe('8');
    expect(roundAmount(47)).toBe('50');
    expect(roundAmount(847)).toBe('850');
    expect(roundAmount(1234.56)).toBe('1,200');
    expect(roundAmount(98765)).toBe('99,000');
    expect(roundAmount(1_234_567)).toBe('1,200,000');
    expect(roundAmount(-2500)).toBe('-2,500');
  });
  test('written numbers in every common style', () => {
    expect(parseAmount('1234.56')).toBe(1234.56);
    expect(parseAmount('1,234.56')).toBe(1234.56);
    expect(parseAmount('1.234,56')).toBe(1234.56);
    expect(parseAmount('1 234,56')).toBe(1234.56);
    expect(parseAmount('12,50')).toBe(12.5);
    expect(parseAmount('1,234')).toBe(1234);
    expect(parseAmount('-25')).toBe(-25);
  });
  test('symbols and codes before or after, the size kept', () => {
    expect(r('Rent €1,234.56 paid').text).toBe('Rent about €1,200 paid');
    expect(r('now 1234.56 EUR of 5000 EUR').text).toBe('now about 1,200 EUR of about 5,000 EUR');
    expect(r('USD 847.10 left').text).toBe('about USD 850 left');
    expect(r('£12.30 lunch').text).toBe('about £10 lunch');
    expect(r('1 234,56 € spent').text).toBe('about 1,200 € spent');
    expect(r('staked 1234.5 ZIG').text).toBe('staked about 1,200 ZIG');
    expect(r('20 euros for Tom').found.amount).toBe(1);
  });
  test('redacting twice changes nothing more, and an "about" figure is only rounded', () => {
    const once = r('balance 4321.99 EUR').text;
    expect(r(once).text).toBe(once);
    expect(r('about €1,234.56').text).toBe('about €1,200');
  });
  test('numbers without a currency stay exact (steps, kilos, percent, counts)', () => {
    same('12,500 steps, 72.4 kg, 85% done, 3 of 4 habits');
    same('Goal "Save 10k" is at 40%');
  });
});

describe('addresses', () => {
  test('English, Dutch, German, French and US shapes', () => {
    expect(r('I live at 12 Abbey Road, London').text).toBe(`I live at ${PLACEHOLDERS.address}, London`);
    expect(r('221B Baker Street').text).toBe(PLACEHOLDERS.address);
    expect(r('Kerkstraat 12, 1000 Brussel is home').text).toBe(`${PLACEHOLDERS.address} is home`);
    expect(r('Hauptstraße 5a').text).toBe(PLACEHOLDERS.address);
    expect(r('office Rue de la Loi 16, 1040 Etterbeek').text).toBe(`office ${PLACEHOLDERS.address}`);
    expect(r('16 rue de la Loi').text).toBe(PLACEHOLDERS.address);
    expect(r('Springfield, IL 62704').text).toBe(PLACEHOLDERS.address);
    expect(r('postcode SW1A 1AA').text).toBe(`postcode ${PLACEHOLDERS.address}`);
  });
  test('no address in ordinary words with numbers', () => {
    same('Spring 2026 marathon, 3 Way split, via Email 2 times');
    same('Walked 5 km on the ring road, 2 laps');
    same('Habit Morning Walk: 30 minutes');
  });
});

describe('names: cues and known names, never a capital alone', () => {
  test('relations, titles, verbs, greetings, possessives and "is my"', () => {
    expect(r('Dinner with my sister Anna on Friday').text).toBe(`Dinner with my sister ${PLACEHOLDERS.name} on Friday`);
    expect(r('my best friend, Tom Baker, called').text).toBe(`my best friend, ${PLACEHOLDERS.name}, called`);
    expect(r('Appointment with Dr. Patel at 9').text).toBe(`Appointment with Dr. ${PLACEHOLDERS.name} at 9`);
    expect(r('call Tom tomorrow').text).toBe(`call ${PLACEHOLDERS.name} tomorrow`);
    expect(r('Met Sarah for coffee').text).toBe(`Met ${PLACEHOLDERS.name} for coffee`);
    expect(r('dinner with Lena').text).toBe(`dinner with ${PLACEHOLDERS.name}`);
    expect(r('Dear Anna, thank you').text).toBe(`Dear ${PLACEHOLDERS.name}, thank you`);
    expect(r("Buy Anna's birthday gift").text).toBe(`Buy ${PLACEHOLDERS.name}’s birthday gift`);
    expect(r('Lena is my coach').text).toBe(`${PLACEHOLDERS.name} is my coach`);
    expect(r('mijn vrouw Els').text).toBe(`mijn vrouw ${PLACEHOLDERS.name}`);
    expect(r('my friend Anna van der Berg').text).toBe(`my friend ${PLACEHOLDERS.name}`);
  });
  test('a name word followed by a weekday keeps the weekday', () => {
    expect(r('my friend Tom Saturday').text).toBe(`my friend ${PLACEHOLDERS.name} Saturday`);
  });
  test('known names (from the person\'s notes) anywhere, as whole words', () => {
    expect(r('Anna said yes; Annabel did not', ['Anna']).text).toBe(`${PLACEHOLDERS.name} said yes; Annabel did not`);
    expect(r('Ask Jean-Luc', ['Jean-Luc']).text).toContain(PLACEHOLDERS.name);
  });
  test('false positives: titles, brands, places, the app\'s words, relation words, headings', () => {
    same('Goal: Emergency Fund · saving with Emergency Fund rules');
    same('Habit: Morning Run · Evening Walk · Read Before Bed');
    same('Synced with Spotify and Apple Health; call Mom; text Dad');
    same('Meeting Notes from Monday; Email Template; Call Center');
    same('Weekly Review on Sunday with The team');
    same('Visited Paris in May; flew from London to New York');
    same('Today, Goals, Habits, Health and Wealth on NOVA and ZIGi');
    same('Paid Rent and Electricity; Amazon order; Netflix');
    same('Running is my favourite habit');
    same('Hello World');
  });
  test('namesIn and knownNamesFrom read names from the person\'s notes, bounded and without stop words', () => {
    expect(namesIn('My sister Anna lives near Dr Patel. Tom is my coach.')).toEqual(['Anna', 'Patel', 'Tom']);
    expect(knownNamesFrom(['my wife Els van Damme', 'call Mom'])).toEqual(['Els van Damme', 'Damme', 'Els']);
    const many = Array.from({length: 400}, (_, i) => `my friend ${String.fromCharCode(65 + (i % 26))}${'abcdefghij'.slice(0, 2 + (i % 8))}${'xyz'[i % 3]}`);
    expect(knownNamesFrom(many).length).toBeLessThanOrEqual(200);
  });
});

describe('summary and bounds', () => {
  test('the summary names each kind once, in order', () => {
    const out = r('my sister Anna paid €1,234 from BE68 5390 0754 7034');
    expect(out.found).toEqual({iban: 1, amount: 1, name: 1});
    expect(redactionSummary(out.found)).toBe('1 IBAN, 1 exact amount (rounded) and 1 name');
    expect(redactionSummary({})).toBe('');
  });
  test('empty and plain text', () => {
    expect(r('')).toEqual({text: '', found: {}});
    same('Nothing private here.');
  });
  test('a big system prompt is handled quickly', () => {
    const line = 'h12: Goal Emergency Fund · savings · active · progress 40% · now 1200 EUR of 3000 EUR · target date 2027-01-01\n';
    const text = line.repeat(400);
    const t = performance.now(), out = r(text);
    expect(performance.now() - t).toBeLessThan(2000);
    expect(out.found.amount).toBe(800);
    expect(out.text).toContain('target date 2027-01-01');
  });
});
