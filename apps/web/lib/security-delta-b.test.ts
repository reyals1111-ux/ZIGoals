import {describe, expect, test} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {AL_ERASE_KEYS} from './al-device-keys';
import {calculatorCsv} from '../components/calculator/calculator-extras';
import {compound, DEFAULT_INPUT} from './compound/engine';

/** Session AL (security delta review B): SB-5, PRIVACY.md names every Session AL device key; SB-7, the calculator CSV's formula guard. */
describe('SB-5: PRIVACY.md names each Session AL device key', () => {
  const privacy = readFileSync(join(__dirname, '../../../docs/PRIVACY.md'), 'utf8');
  test.each([...AL_ERASE_KEYS])('%s', key => expect(privacy).toContain(`\`${key}\``));
  test('and says what Erase one area keeps, the recovery copies, the protected copy and the note photo grace', () => {
    for (const words of ['Erase one area', 'Recovery copies', 'The protected copy', 'A deleted note\'s photo', 'Unsaved forms in this tab']) expect(privacy).toContain(words);
  });
});
describe('SB-7: the calculator CSV keeps a formula as text and numbers as numbers', () => {
  test('an assumptions line that starts like a formula gets the apostrophe; the year rows stay plain decimals', () => {
    const r = compound(DEFAULT_INPUT), lines = calculatorCsv(DEFAULT_INPUT, r, '=HYPERLINK("http://example.invalid","x")').trim().split('\n');
    expect(lines[1]).toBe('"\'=HYPERLINK(""http://example.invalid"",""x"")"');
    expect(lines.at(-1)!.split(',')[5]).toBe(r.final);
    expect(lines.slice(4).every(l => !l.includes("'"))).toBe(true);
  });
});
