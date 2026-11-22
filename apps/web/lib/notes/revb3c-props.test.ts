import {describe, expect, test} from 'vitest';
import {propsFromFrontMatter, propsFrontMatter} from './props';
import {noteToMarkdown, parseFrontMatter, planImport} from './markdown';
import {MAX_PROPS, PROP_TEXT_MAX, emptyNotes, notesSchema, type NoteProp} from './schema';

/**
 * Session AV lane 2 (review B3C-6): a note's properties survive the Markdown round trip in full — names with spaces and
 * in other languages, a choice, "0042" as text, long texts with quotes, colons, "#" and line breaks — at ten properties
 * of the longest text. Fictional values.
 */
const AT = '2026-11-20T09:00:00.000Z', NOW = '2026-11-22T10:00:00.000Z';
const long = (seed: string) => `${seed} "quoted": a colon, it's here # not a comment\\ and a back\\slash; `.repeat(20).slice(0, PROP_TEXT_MAX);
const PROPS: NoteProp[] = [
  {k: 'Due date', t: 'date', v: '2026-12-01'},
  {k: 'Status', t: 'choice', v: 'In progress'},
  {k: 'Code', t: 'text', v: '0042'},
  {k: 'Budget', t: 'number', v: 1200.5},
  {k: 'Booked', t: 'tick', v: false},
  {k: 'Één naam', t: 'text', v: long('Lang')},
  {k: 'Notes for later', t: 'text', v: `${long('Line one')}`.slice(0, 200) + '\nLine two\n\nLine four'},
  {k: 'Rating_2', t: 'number', v: -3},
  {k: 'Looks like a day', t: 'text', v: '2026-01-01'},
  {k: 'Looks like a tick', t: 'text', v: 'true'},
];
const note = (props: NoteProp[]) => notesSchema.parse({version: 1, voice: false, notes: [{id: 'n1', kind: 'topic', title: 'A fictional plan', body: 'Words.', createdAt: AT, props}]}).notes[0]!;
const roundTrip = (props: NoteProp[]) => {
  const md = noteToMarkdown(note(props));
  return planImport(emptyNotes(), [{name: 'A fictional plan.md', data: new TextEncoder().encode(md)}], NOW, '2026-11-22').add[0]!;
};

describe('note properties through Markdown', () => {
  test('ten properties come back exactly: names with spaces, a choice, "0042" as text, long texts', () => {
    expect(PROPS).toHaveLength(MAX_PROPS);
    const back = roundTrip(PROPS);
    expect(back.title).toBe('A fictional plan');
    expect(back.body).toBe('Words.');
    expect(back.props).toEqual(PROPS);
  });
  test('ten of the longest texts still fit the front matter and come back', () => {
    const max = Array.from({length: MAX_PROPS}, (_, i): NoteProp => ({k: `Long text ${i}`, t: 'text', v: long(`T${i}`)}));
    expect(max.every(p => String(p.v).length === PROP_TEXT_MAX)).toBe(true);
    const back = roundTrip(max);
    expect(back.title).toBe('A fictional plan');
    expect(back.props).toEqual(max);
  });
  test('readable in Obsidian: one plain key per property, values once, zigoals-props only names and types', () => {
    const lines = propsFrontMatter(PROPS.slice(0, 3));
    expect(lines).toEqual(['Due date: 2026-12-01', 'Status: "In progress"', 'Code: "0042"', 'zigoals-props: "[[\\"Due date\\",\\"date\\"],[\\"Status\\",\\"choice\\"],[\\"Code\\",\\"text\\"]]"']);
    expect(propsFrontMatter([{k: 'Who', t: 'text', v: 'Say "hi" and "bye"'}])[0]).toBe('Who: \'Say "hi" and "bye"\'');
  });
  test('a round-3 export (the values inside zigoals-props) still reads back', () => {
    const old = `---\ntitle: "X"\nStatus: "Done"\nzigoals-props: ${JSON.stringify(JSON.stringify([{k: 'Status', t: 'choice', v: 'Done'}, {k: 'Code', t: 'text', v: '0042'}]))}\n---\nBody`;
    expect(propsFromFrontMatter(parseFrontMatter(old).data)).toEqual([{k: 'Status', t: 'choice', v: 'Done'}, {k: 'Code', t: 'text', v: '0042'}]);
  });
  test('another app’s keys with spaces become properties too; odd keys still dropped', () => {
    const {data} = parseFrontMatter('---\nDue date: 2026-12-01\n"quoted key": v\n!!js/function: x\n__proto__: y\n---\n');
    expect(Object.keys(data)).toEqual(['Due date']);
    expect(propsFromFrontMatter(data)).toEqual([{k: 'Due date', t: 'date', v: '2026-12-01'}]);
  });
  test('a value that does not fit its type is left out, not guessed', () => {
    const {data} = parseFrontMatter(`---\nBudget: lots\nStatus: ""\nzigoals-props: ${JSON.stringify(JSON.stringify([['Budget', 'number'], ['Status', 'choice'], ['Gone', 'text']]))}\n---\n`);
    expect(propsFromFrontMatter(data)).toEqual([]);
  });
});
