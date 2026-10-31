import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, test} from 'vitest';
import {GUARD_KEY_LINE, GUARD_MIN_CHARS, GUARD_WORDS_LINE, ZIGI_SECRET_STEPS, ZIGI_SECRET_TITLE, guardText, looksSecret, mayHoldSecret, messagesHoldSecret} from './guard';
import {GUARD_MIN_CHARS as WRAPPER_MIN} from './min';

// Every sample is built at run time, so no line of this file looks like a key to the repository's own secret scan.
const list = readFileSync(join(__dirname, '../../../../scripts/bip39-english.txt'), 'utf8').trim().split('\n');
const phrase = (n = 12) => list.slice(100, 100 + n).join(' ');
const hex64 = 'ab'.repeat(32), b58 = (n: number) => 'H'.repeat(n);
const web = join(__dirname, '../..');

describe('the recovery-words guard (Session AK, BUILD list 2 #1)', () => {
  test('recovery words, in any layout, get the words line', () => {
    for (const text of [phrase(), phrase(24), list.slice(0, 12).map((w, i) => `${i + 1}. ${w}`).join('\n'), `my words: ${phrase()}`]) {
      const found = guardText(text);
      expect(found?.kind, text).toBe('words');
      expect(found?.line).toBe(GUARD_WORDS_LINE);
    }
  });
  test('private keys get the key line', () => {
    for (const text of [hex64, `key 0x${hex64}.`, `xprv${b58(107)}`, `5${b58(50)}`, ['-----BEGIN EC ', 'PRIVATE KEY-----'].join(''), `nsec1${'q'.repeat(58)}`, ['AGE', 'SECRET', 'KEY', '1'].join('-')]) {
      const found = guardText(text);
      expect(found?.kind, text).toBe('key');
      expect(found?.line).toBe(GUARD_KEY_LINE);
    }
  });
  test('ordinary text is never flagged (the emergency sheet detector\'s own false-positive corpus, and everyday notes)', () => {
    for (const text of [
      'The papers are in the grey box in the attic. Call Anna at the bank first, then the notary about the house and the car.',
      'please phone uncle peter about pension forms kept inside blue folder under desk drawer near window today',
      'Call Ann about the house insurance on Monday morning',
      'Mum: phone 0612 345 678. Dad: 0698-765-432. Will is at the notary office. Pension number 1234-5678-90.',
      'IBAN DE89 3704 0044 0532 0130 00, BIC COBADEFFXXX. Second account NL91 ABNA 0417 1643 00.',
      'Querida familia, los papeles están en la caja gris del ático. Llamad primero a Ana, luego al notario por la casa y el coche.',
      'Scores: [1, 2, 3] and [10, 20, 30, 40].',
      'Calm start, a long walk before work. Grateful for the sunshine and a quiet coffee.',
      'Tired after a late night; the meeting ran long and I skipped the gym. Tomorrow I will go to bed at ten.',
      'How much did I spend on groceries last month compared with the month before?',
      'Hoeveel heb ik deze maand uitgegeven aan boodschappen, en is dat meer dan vorige maand?',
      'Lunch with Sam',
      `0x${'ab'.repeat(20)}`, `bc1q${'a'.repeat(38)}`, `zig1${'q'.repeat(38)}`, `xpub${b58(107)}`,
    ]) expect(guardText(text), text).toBeNull();
  });
  test('short or empty text is not read at all; the wrapper\'s own cut-off is the same number', () => {
    expect(WRAPPER_MIN).toBe(GUARD_MIN_CHARS);
    expect(mayHoldSecret('')).toBe(false); expect(mayHoldSecret(null)).toBe(false); expect(mayHoldSecret(undefined)).toBe(false);
    expect(mayHoldSecret('x'.repeat(GUARD_MIN_CHARS - 1))).toBe(false);
    // The shortest shape the detector knows is exactly GUARD_MIN_CHARS long, so no secret is shorter than the cut-off.
    const age = ['AGE', 'SECRET', 'KEY', '1'].join('-');
    expect(age).toHaveLength(GUARD_MIN_CHARS);
    expect(looksSecret(age)).toBe(true);
    expect(looksSecret(age.slice(1))).toBe(false);
  });
  test('ZIGi\'s transport check reads only the person\'s own messages', () => {
    expect(messagesHoldSecret([{role: 'user', content: 'How did I sleep?'}, {role: 'assistant', content: 'About 7 h.'}])).toBe(false);
    expect(messagesHoldSecret([{role: 'user', content: 'Hello'}, {role: 'user', content: phrase()}])).toBe(true);
    expect(messagesHoldSecret([{role: 'assistant', content: phrase()}, {role: 'tool', content: hex64}])).toBe(false);
  });
  test('calm words: no exclamation, no blame', () => {
    for (const line of [GUARD_WORDS_LINE, GUARD_KEY_LINE, ZIGI_SECRET_TITLE, ...ZIGI_SECRET_STEPS]) {
      expect(line).not.toMatch(/!|fail|wrong|stupid|careless|should have/i);
      expect(line.length).toBeLessThan(140);
    }
  });
  test('every listed field path carries the shared guard line', () => {
    const fields: Record<string, number> = {
      'components/journal/journal-compose.tsx': 2, // the entry and the answer to ZIGi's question
      'components/habits/today-note.tsx': 1,
      'components/goals/goal-plan.tsx': 4, // why, obstacle, if-then, the story
      'components/wealth/spending/spending-section.tsx': 1, // the money note
      'components/help/send-feedback.tsx': 1,
      'components/point-tell/point-tell.tsx': 2, // a new note and an edited one
      'components/ai/ai-chat.tsx': 1, // ZIGi's composer
    };
    for (const [file, count] of Object.entries(fields)) {
      const source = readFileSync(join(web, file), 'utf8');
      expect(source, file).toMatch(/import \{SecretGuard\} from '(\.\.\/)+secret-guard\/secret-guard';/);
      expect(source.match(/<SecretGuard /g)?.length, file).toBe(count);
    }
    const chat = readFileSync(join(web, 'components/ai/use-chat-session.ts'), 'utf8');
    expect(chat.match(/if \(looksSecret\(text\)\) \{ setFailure/g)).toHaveLength(2); // send and ask, before anything is kept or sent
    expect(chat).toMatch(/if \(messagesHoldSecret\(r\.messages\)\) throw new AiError\('blocked', ZIGI_SECRET_TITLE\)/);
  });
});
