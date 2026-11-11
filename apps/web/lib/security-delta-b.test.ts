import {describe, expect, test} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {AL_ERASE_KEYS} from './al-device-keys';
import {AM_ERASE_KEYS} from './am-device-keys';
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
/** Session AM (ADR-038 A2, D12–D17): PRIVACY.md names the session's two device records and its one outside service. */
describe('Session AM: PRIVACY.md names each Session AM device key, and MET Norway with what it receives', () => {
  const privacy = readFileSync(join(__dirname, '../../../docs/PRIVACY.md'), 'utf8').replace(/\s+/g, ' ');
  test.each([...AM_ERASE_KEYS])('%s', key => expect(privacy).toContain(`\`${key}\``));
  test('weather is off until turned on, and the entry says who sees what, how often, the credit and what is not built', () => {
    for (const words of [
      'MET Norway** (`https://api.met.no`, Locationforecast 2.0 and Sunrise 3.0)',
      'It is off until you turn on "Weather (outside data)" in NOVA → Permissions and choose a place',
      'No geocoding service is asked, and the browser\'s location is never requested.',
      'only while a weather widget is on NOVA\'s stage and the page is visible, your own browser asks `api.met.no` directly',
      'rounded to two decimals (about 1 km)',
      'MET Norway therefore sees your network (IP) address and that rounded place, and keeps both in its logs',
      '(https://www.met.no/en/About-us/privacy)',
      'No account, no key, no cookie, no other data. ZIGoals has no server in between and receives nothing.',
      'at most one request per place per 10 minutes, and not before the previous reading\'s expiry time',
      'the browser\'s own HTTP cache until it expires',
      'Data from MET Norway, licence [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)',
      'only through NOVA\'s `weather` lookup. It cannot turn weather on, choose the place or fetch anything.',
      'a caching proxy that would hide your IP address from MET Norway. It is required before a wider launch.',
      'the requests you made to NOVA (your own words, at most 200), the widgets NOVA made, the dock and two choices',
      'With an account it travels end-to-end encrypted in a new optional sync section, together with NOVA\'s layout and pinned widgets.',
    ]) expect(privacy, words).toContain(words);
    // MET Norway's terms: the name of its consumer weather service is never used.
    expect(privacy).not.toMatch(/\bYr\b/);
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
