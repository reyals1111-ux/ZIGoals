import {describe, expect, test} from 'vitest';
import {createHabit, emptyHabitData, logHabitValue} from '../habits';
import type {HealthData} from '../health';
import type {MoneyLog} from '../money-log/schema';
import type {Platform} from '../positions';
import type {Workouts} from '../workouts/schema';
import {thisDay} from './this-day';
import {showcaseNotes} from './showcase';
import {noteSearchItems, searchNotes, snippetFor, NOTE_ACTIONS} from '../search/notes';
import {search, SEARCH_KINDS} from '../search/engine';
import {searchActions} from '../search/actions';
import {searchEverythingIn} from '../search/notes-everything';

const DAY = '2026-10-31', TODAY = '2026-11-01', READ = '92000000-0000-4000-8000-000000000001';

describe('"This day" strip (B2): links to that day’s records, never copies; unknown is not zero', () => {
  const now = new Date(`${DAY}T08:00:00Z`);
  let habits = createHabit(emptyHabitData(), {title: 'Read', category: 'Learning', description: '', notes: '', schedule: {kind: 'daily'}, target: 1, measurement: {kind: 'count', unit: 'times'}}, now, READ);
  habits = createHabit(habits, {title: 'Walk', category: 'Wellbeing', description: '', notes: '', schedule: {kind: 'daily'}, target: 1, measurement: {kind: 'count', unit: 'times'}}, now, '92000000-0000-4000-8000-000000000002');
  habits = logHabitValue(habits, READ, DAY, 1, {}, new Date(`${DAY}T20:00:00Z`));
  const health = {diary: [{date: DAY}, {date: DAY}, {date: TODAY}], weights: [{date: DAY}], activity: [], daily: {water: [{date: DAY, amountMilli: 250000, unit: 'ml'}]}} as unknown as HealthData;
  const workouts = {workouts: [{id: 'w1', name: 'Leg day', date: DAY, startedAt: `${DAY}T07:00:00Z`, endedAt: `${DAY}T08:00:00Z`}, {id: 'w2', name: 'Unfinished', date: DAY, startedAt: `${DAY}T09:00:00Z`}]} as unknown as Workouts;
  const money = {entries: [{id: 'm1', kind: 'expense', amount: '12.50', category: 'Groceries', date: DAY}, {id: 'm2', kind: 'income', amount: '900', category: 'Salary', date: DAY}]} as unknown as MoneyLog;
  const platform = {goals: [{id: '9203', name: 'Japan adventure'}], contributions: [{goalId: '9203', direction: 'IN', occurredAt: `${DAY}T12:00:00Z`}, {goalId: '9203', direction: 'IN', occurredAt: `${DAY}T13:00:00Z`}, {goalId: '9203', direction: 'OUT', occurredAt: `${DAY}T14:00:00Z`}]} as unknown as Platform;
  test('each pillar appears with a link to where it lives; money shows counts, never amounts', () => {
    const {items, unread} = thisDay({day: DAY, today: TODAY, habits, health, workouts, money, platform, journal: {entries: [{id: 'j', date: DAY}]}, dayOf: at => at.slice(0, 10)});
    expect(unread).toEqual([]);
    expect(items.map(i => [i.pillar, i.title, i.detail, i.href])).toEqual([
      ['habits', 'Read', 'Done', `/app/habits#habit-${READ}`],
      ['health', 'Food diary', '2 items logged', `/app/health?date=${DAY}`],
      // Session AL (COPY_AUDIT, deliberate; DV-191c): water in millilitres, the one water vocabulary.
      ['health', 'Water', '250 mL logged', `/app/health?date=${DAY}`],
      ['health', 'Weight', 'Logged', `/app/health?date=${DAY}`],
      ['health', 'Leg day', 'Workout', '/app/health?view=workouts'],
      ['wealth', 'Money log', '1 spending entry · 1 income entry', '/app/wealth#spending'],
      ['goals', 'Japan adventure', 'Contribution', '/app/goals/tracked/9203'],
      ['journal', 'Journal', '1 entry', '/app/journal'],
    ]);
    expect(JSON.stringify(items)).not.toMatch(/12\.50|900/);
  });
  test('a source not read is named, never shown as nothing; a source not asked for is simply absent', () => {
    const {items, unread} = thisDay({day: DAY, today: TODAY, habits: null, health: null, money});
    expect(unread).toEqual(['habits', 'health']);
    expect(items.map(i => i.pillar)).toEqual(['wealth']);
    expect(thisDay({day: '2020-01-01', today: TODAY, habits, health, workouts, money, platform, dayOf: at => at.slice(0, 10)}).items).toEqual([]);
  });
});

describe('search across notes and the pillars (B4)', () => {
  const notes = showcaseNotes(TODAY).notes;
  test('notes are search items in the palette, found by title and words; actions name capture and the rest', () => {
    expect(SEARCH_KINDS).toContain('note');
    const items = noteSearchItems(notes);
    expect(search(items, 'japan trip')[0]).toMatchObject({kind: 'note', title: 'Japan trip ideas', href: '/app/notes?note=showcase-note-japan'});
    expect(search(items, 'ryokan').map(h => h.title)).toEqual(['Japan trip ideas']);
    expect(searchActions(NOTE_ACTIONS, 'capture note')[0]!.href).toBe('/app/notes?capture=1');
    expect(searchActions(NOTE_ACTIONS, 'obsidian')[0]!.id).toBe('action:notes-export');
  });
  test('full-text search: every word somewhere, title first, a snippet around the match', () => {
    const hits = searchNotes(notes, 'rail pass');
    expect(hits.map(h => h.note.id)).toEqual(expect.arrayContaining(['showcase-note-japan', 'showcase-note-inbox-1']));
    expect(searchNotes(notes, 'rail nothinglikethis')).toEqual([]);
    expect(snippetFor(`${'a '.repeat(100)}needle here`, 'needle')).toMatch(/^….*needle here$/);
  });
  test('searchEverything finds a note, a goal, a habit, a food, a workout and money (no amount), and respects scopes', () => {
    const src = {notes, journal: [{id: 'j1', date: DAY, text: 'Japan dreams again'}], goals: [{id: '9203', name: 'Japan adventure', href: '/app/goals/tracked/9203'}], habits: [{id: 'h1', title: 'Walk', description: 'Japan prep'}],
      foods: [{id: 'f1', name: 'Japanese curry'}], workouts: [{id: 'w1', name: 'Japan hike training', date: DAY}], money: [{id: 'm1', kind: 'expense', category: 'Travel', note: 'Japan rail pass deposit', date: DAY}], assets: [{id: 'a1', name: 'Japan ETF', asset: 'EWJ'}]};
    const hits = searchEverythingIn('japan', src);
    expect(new Set(hits.map(h => h.kind))).toEqual(new Set(['note', 'journal', 'goal', 'habit', 'food', 'workout', 'money', 'asset']));
    expect(hits.find(h => h.kind === 'money')).toMatchObject({title: 'Japan rail pass deposit', detail: `Spending · Travel · ${DAY}`});
    const scoped = searchEverythingIn('japan', src, {pillars: ['notes', 'goals']});
    expect(new Set(scoped.map(h => h.pillar))).toEqual(new Set(['notes', 'goals']));
    expect(searchEverythingIn('   ', src)).toEqual([]);
  });
});
