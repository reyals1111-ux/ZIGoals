import {describe, expect, test} from 'vitest';
import {openTicks, setTick, tickCount, tickLines, tickNote} from './ticks';
import {insertTick, wrapHighlight} from './marks';
import {applyUndo} from './store';
import {notesSchema, type Notes} from './schema';
import {parseBlocks} from '../ai/safe-render';

/** Session AV lane 2 (r3-notes; LEDGER #264, #267): tick boxes in notes, gathered across notes, and the two mark buttons. */
const at = '2026-11-20T09:00:00.000Z', now = '2026-11-22T10:00:00.000Z';
const record = (): Notes => notesSchema.parse({version: 1, voice: false, notes: [
  {id: 'n-a', kind: 'topic', title: 'Fictional trip', body: 'Pack:\n- [ ] passport\n- [x] tickets\n\n```\n- [ ] not a box\n```\n* [ ] charger', createdAt: at, updatedAt: at},
  {id: 'n-b', kind: 'daily', title: '2026-11-21', day: '2026-11-21', body: '- [ ] call the fictional plumber', createdAt: '2026-11-21T08:00:00.000Z', updatedAt: '2026-11-21T08:00:00.000Z'},
  {id: 'n-c', kind: 'topic', title: 'No boxes', body: 'Just words.', createdAt: at}]});
describe('tick boxes', () => {
  test('the lines are the ones the reading view numbers (fenced code left out)', () => {
    const body = record().notes[0]!.body;
    expect(tickLines(body)).toEqual([{line: 1, checked: false, text: 'passport'}, {line: 2, checked: true, text: 'tickets'}, {line: 7, checked: false, text: 'charger'}]);
    const list = parseBlocks(body, {notes: true}).filter(b => b.type === 'list');
    expect(list.flatMap(b => b.type === 'list' ? b.lines ?? [] : [])).toEqual([1, 2, 7]);
    expect(tickCount(body)).toEqual({done: 1, total: 3});
  });
  test('ticking writes "[x]" into that line only, keeps the old words as a version, and Undo puts the note back', () => {
    const out = tickNote(record(), 'n-a', 1, true, now), note = out.record.notes.find(n => n.id === 'n-a')!;
    expect(note.body.split('\n')[1]).toBe('- [x] passport');
    expect(note.body.split('\n').slice(2).join('\n')).toBe(record().notes[0]!.body.split('\n').slice(2).join('\n'));
    expect(out.record.versions?.at(-1)).toMatchObject({noteId: 'n-a', body: record().notes[0]!.body});
    expect(applyUndo(out.record, out.undo).notes.find(n => n.id === 'n-a')!.body).toBe(record().notes[0]!.body);
    expect(setTick('- [x] done', 0, false)).toBe('- [ ] done');
    expect(() => setTick('plain line', 0, true)).toThrow('That tick box has changed');
  });
  test('Open tick boxes: unticked ones across notes, the most recently changed note first', () => {
    expect(openTicks(record().notes).map(t => `${t.noteId}:${t.line}:${t.text}`)).toEqual(['n-b:0:call the fictional plumber', 'n-a:1:passport', 'n-a:7:charger']);
    expect(openTicks(record().notes)[0]).toMatchObject({kind: 'daily', day: '2026-11-21', name: '2026-11-21'});
  });
});
describe('the mark buttons', () => {
  test('Tick box starts the caret’s line, after a list marker, and leaves a tick box alone', () => {
    expect(insertTick('one\ntwo', 5)).toEqual({text: 'one\n- [ ] two', start: 13, end: 13});
    expect(insertTick('- milk', 2).text).toBe('- [ ] milk');
    expect(insertTick('- [ ] milk', 3).text).toBe('- [ ] milk');
    expect(insertTick('', 0).text).toBe('- [ ] ');
  });
  test('Highlight wraps the chosen words (spaces left outside), with the colour circle; nothing chosen gives words to type over', () => {
    expect(wrapHighlight('a big day', 2, 6, 'yellow')).toEqual({text: 'a ==big== day', start: 4, end: 7});
    expect(wrapHighlight('a big day', 2, 6, 'green').text).toBe('a ==\u{1F7E2}big== day');
    const empty = wrapHighlight('x', 1, 1, 'red');
    expect(empty.text.slice(empty.start, empty.end)).toBe('highlighted words');
    expect(parseBlocks(wrapHighlight('a big day', 2, 6, 'blue').text, {notes: true})[0]).toMatchObject({children: [{type: 'text'}, {type: 'mark', colour: 'blue'}, {type: 'text'}]});
  });
});
