import {describe, expect, it} from 'vitest';
import {addTask, editTask} from './engine';
import {emptyTasks} from './schema';
import {LOOK_HEX, taskLook} from './look';
import {SUGGESTION_WORDS, suggestTaskLook} from './look-words';
import {taskTimelineItems} from './timeline-source';
import {buildDayTimeline} from '../timeline/build';
import {emptyHabitData} from '../habits';

/** Session AV lane 2 (r3-plan, LEDGER #257; Structured's task icons and colours, Smart Task Icons without a model). */
const today = '2026-11-23', at = new Date('2026-11-23T08:00:00Z');
describe('a task’s symbol and colour', () => {
  it('reads only the habit-look set; anything else is no look', () => {
    expect(taskLook({look: {glyph: '★', colour: 'teal'}})).toEqual({glyph: '★', colour: 'teal'});
    expect(taskLook({look: {glyph: '☃', colour: 'teal'}})).toBeNull();
    expect(taskLook({look: {glyph: '★', colour: 'gold'}})).toBeNull();
    expect(taskLook({})).toBeNull();
  });
  it('is set and cleared with the task’s edit, keeping everything else', () => {
    let r = addTask(emptyTasks(), {title: 'Fictional dentist', due: today, time: '09:00'}, {id: 't1', at, today});
    r = editTask(r, 't1', {look: {glyph: '✚', colour: 'red'}}, today);
    expect(r.tasks[0]).toMatchObject({title: 'Fictional dentist', due: today, time: '09:00', look: {glyph: '✚', colour: 'red'}});
    r = editTask(r, 't1', {look: null}, today);
    expect(r.tasks[0]!.look).toBeUndefined();
  });
  it('a symbol is suggested from the title’s words, in English and Dutch; never from a part of a word', () => {
    expect(suggestTaskLook('Call the dentist about the fictional crown')).toEqual({look: {glyph: '✚', colour: 'red'}, word: 'dentist'});
    expect(suggestTaskLook('Tandarts bellen')).toEqual({look: {glyph: '✚', colour: 'red'}, word: 'tandarts'});
    expect(suggestTaskLook('Pay the fictional rent')?.look).toEqual({glyph: '◆', colour: 'green'});
    expect(suggestTaskLook('Huur betalen')?.word).toBe('betalen');
    expect(suggestTaskLook('Stofzuigen in de gang')?.look.glyph).toBe('⌂');
    expect(suggestTaskLook('Verjaardag van oma')?.look.glyph).toBe('✿');
    expect(suggestTaskLook('Scarlet')).toBeNull(); // "car" and "let" are not words here
    expect(suggestTaskLook('x')).toBeNull();
    expect(SUGGESTION_WORDS).toBeGreaterThan(150);
  });
  it('the Day Timeline shows the task with its symbol and colour', () => {
    let r = addTask(emptyTasks(), {title: 'Fictional run', due: today, time: '07:00'}, {id: 't1', at, today});
    r = editTask(r, 't1', {look: {glyph: '▲', colour: 'orange'}}, today);
    const items = taskTimelineItems(r, today, today, iso => iso.slice(0, 10));
    expect(items[0]).toMatchObject({title: 'Fictional run', glyph: '▲', colour: LOOK_HEX.orange, time: '07:00'});
    const day = buildDayTimeline({date: today, now: at, zone: 'UTC', habits: emptyHabitData(), extra: items.map(i => ({...i, id: `tasks:${i.id}`}))});
    expect(day.blocks[0]).toMatchObject({title: 'Fictional run', glyph: '▲', colour: LOOK_HEX.orange});
  });
});
