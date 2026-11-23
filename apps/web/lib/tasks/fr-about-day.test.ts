import {describe, expect, test} from 'vitest';
import {parseTaskLine} from './parse';

// FR-MAX-13 (known M-11): a day right after "about" is what the task is about, so its words stay in the title.
const p = (s: string) => parseTaskLine(s, '2026-11-24');
describe('a day after "about" stays words', () => {
  test('"Email Sam about the weekend" keeps every word and gets no day', () => {
    expect(p('Email Sam about the weekend')).toEqual({title: 'Email Sam about the weekend', labels: [], spans: []});
    expect(p('Ask Jo about next Friday')).toEqual({title: 'Ask Jo about next Friday', labels: [], spans: []});
    expect(p('Read about the weekend trip').title).toBe('Read about the weekend trip');
    expect(p('Mail Sam over het weekend')).toMatchObject({title: 'Mail Sam over het weekend', spans: []});
    expect(p('Talk to Ann regarding Monday').due).toBeUndefined();
  });
  test('a day anywhere else is still read, with "about" in the title untouched', () => {
    expect(p('Plan the weekend')).toMatchObject({title: 'Plan', due: '2026-11-28'});
    expect(p('Relax over the weekend')).toMatchObject({title: 'Relax', due: '2026-11-28'});
    expect(p('Klussen in het weekend')).toMatchObject({title: 'Klussen', due: '2026-11-28'});
    expect(p('Email Sam about the trip tomorrow')).toMatchObject({title: 'Email Sam about the trip', due: '2026-11-25'});
    expect(p('over 3 dagen bellen')).toMatchObject({title: 'bellen', due: '2026-11-27'});
  });
});
