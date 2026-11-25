import {describe, expect, it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {HabitSections, foldedRoom} from '../components/habits/habit-sections';
import {HabitConsistency} from '../components/habits/habit-consistency';
import {HabitTrendList, hasTrend} from '../components/habits/habit-trend-list';
import {groupByTimeOfDay} from './habits-extras/sections';
import {createHabit, emptyHabitData, logHabitValue, HABITS_KEY, habitDataSchema, type HabitData} from './habits';
import {addLocalDays} from './local-date';
import {buildShowcase} from './showcase-data';

/**
 * Session AW (habits-tj7; owner decision 1e, FR-TJ-7): on Habits, today's habits and their Complete buttons come first.
 * Empty Morning / Afternoon / Evening groups fold into one "Add a habit" line after the groups that hold habits; a
 * consistency card with nothing to show yet ("Your last 30 days" with no check-in, "Your week in motion" at all 0, "Trend
 * per habit" while every habit reads "Not enough days yet") stays hidden, one teaching line in its place. Fictional data.
 */
// Habits made today or 25 days ago have under 5 scheduled days in the 30 days before the last 30, so no trend yet.
const TODAY = '2026-11-23', AT = new Date('2026-11-23T07:00:00Z'), SINCE = new Date('2026-10-29T07:00:00Z'), NOW = new Date('2026-11-23T18:00:00Z');
const WALK = 'aaaaaaaa-0000-4000-8000-0000000000a1', READ = 'aaaaaaaa-0000-4000-8000-0000000000a2';
const habit = (d: HabitData, id: string, title: string, timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'anytime', made = AT) =>
  createHabit(d, {title, category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'boolean'}, target: 1, ...(timeOfDay ? {timeOfDay} : {})} as never, made, id);
const sections = (d: HabitData, onNew?: () => void, compact = false) => renderToStaticMarkup(createElement(HabitSections, {sections: groupByTimeOfDay(d.habits, TODAY), extras: null, hour: 9, compact, onNew, render: section => createElement('div', {className: 'cards'}, section.habits.map(h => h.title).join(','))}));
const consistency = (d: HabitData) => renderToStaticMarkup(createElement(HabitConsistency, {habits: d.habits, today: TODAY}));
const count = (html: string, needle: string) => html.split(needle).length - 1;

describe('FR-TJ-7: empty time-of-day groups fold into one "Add a habit" line', () => {
  it('names only the empty Morning, Afternoon and Evening, in day order, with the right article', () => {
    const g = (ids: string[]) => groupByTimeOfDay(ids.reduce((d, t, i) => habit(d, `aaaaaaaa-0000-4000-8000-00000000000${i}`, `H${i}`, t as never), emptyHabitData()).habits, TODAY);
    expect(foldedRoom(g(['anytime']))).toEqual({words: 'Room for a morning, afternoon or evening habit.', first: 'morning'});
    expect(foldedRoom(g(['morning']))).toEqual({words: 'Room for an afternoon or evening habit.', first: 'afternoon'});
    expect(foldedRoom(g(['morning', 'afternoon']))).toEqual({words: 'Room for an evening habit.', first: 'evening'});
    expect(foldedRoom(g(['afternoon']))).toEqual({words: 'Room for a morning or evening habit.', first: 'morning'});
    // Nothing empty among the three (Anytime is never named), and no habit at all: no folded line.
    expect(foldedRoom(g(['morning', 'afternoon', 'evening']))).toBeNull();
    expect(foldedRoom(g([]))).toBeNull();
  });
  it('one Anytime habit: its group alone, then the one line with its Add a habit button; no empty group and no per-group invitation', () => {
    const html = sections(habit(emptyHabitData(), WALK, 'Fictional walk'), () => undefined);
    expect(count(html, '<details')).toBe(1);
    expect(html).toContain('habit-section-anytime');
    expect(html).not.toMatch(/habit-section-(morning|afternoon|evening)/);
    expect(html).not.toMatch(/No (morning|afternoon|evening) habit yet|Nothing here yet|>Add one</);
    expect(count(html, 'habit-sections-room')).toBe(1);
    expect(html).toContain('Room for a morning, afternoon or evening habit. <button type="button" class="text-link">Add a habit</button>');
    // The line follows the group and its cards: the cards (and their Complete buttons) come first.
    expect(html.indexOf('Fictional walk')).toBeLessThan(html.indexOf('habit-sections-room'));
  });
  it('no habit in any group: one teaching line with Add a habit, never four invitations', () => {
    const html = sections(emptyHabitData(), () => undefined);
    expect(count(html, '<details')).toBe(0);
    expect(count(html, 'habit-section-empty')).toBe(1);
    expect(html).toContain('No habits yet: start with one small action you want to return to. <button type="button" class="text-link">Add a habit</button>');
  });
  it('without an add action (a view that is not for adding) the line stays away; Today\'s compact widget never shows it', () => {
    expect(sections(habit(emptyHabitData(), WALK, 'Fictional walk'))).not.toContain('habit-sections-room');
    expect(sections(habit(emptyHabitData(), WALK, 'Fictional walk'), () => undefined, true)).not.toContain('habit-sections-room');
  });
});

describe('FR-TJ-7: a consistency card with nothing to show yet waits; one teaching line stands in for it', () => {
  it('a habit without a check-in: no card at all, and three teaching lines', () => {
    const html = consistency(habit(emptyHabitData(), WALK, 'Fictional walk'));
    expect(html).not.toMatch(/class="habit-consistency[ "]/);
    expect(html).not.toMatch(/habit-consistency-month|habit-week-momentum|habit-trend-list/);
    expect(html).toContain('<strong>Your last 30 days</strong> · No check-ins in the last 30 days yet.');
    expect(html).toContain('<strong>Your week in motion</strong> · No check-ins in the last seven days yet.');
    expect(html).toContain('<strong>Trend per habit</strong> · Not enough days yet.');
    expect(count(html, 'habit-teach-line')).toBe(3);
  });
  it('check-ins 10 to 20 days ago: the 30 days take the row; the week (all 0) and the trend are teaching lines', () => {
    let d = habit(emptyHabitData(), WALK, 'Fictional walk', undefined, SINCE);
    for (let i = 10; i <= 20; i++) d = logHabitValue(d, WALK, addLocalDays(TODAY, -i), 1, {}, NOW);
    const html = consistency(d);
    expect(html).toContain('class="habit-consistency habit-consistency-lone"');
    expect(html).toContain('habit-consistency-month');
    expect(html).not.toContain('habit-week-momentum');
    expect(html).not.toContain('Keep finding your rhythm.');
    expect(html).not.toContain('habit-trend-list');
    expect(html).toContain('data-teach="week"');
    expect(html).toContain('data-teach="trend"');
    expect(html).not.toContain('data-teach="month"');
  });
  it('two months of check-ins: every card, no teaching line', () => {
    const first = addLocalDays(TODAY, -59);
    let d = createHabit(emptyHabitData(), {title: 'Fictional walk', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'boolean'}, target: 1}, new Date(`${first}T08:00:00Z`), WALK);
    d = createHabit(d, {title: 'Fictional reading', category: 'Mind', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'boolean'}, target: 1}, new Date(`${first}T08:00:00Z`), READ);
    for (let i = 0; i < 59; i++) { const day = addLocalDays(first, i); if (i >= 30 || i % 2 === 0) d = logHabitValue(d, WALK, day, 1, {}, NOW); if (i < 30 || i % 3 === 0) d = logHabitValue(d, READ, day, 1, {}, NOW); }
    const html = consistency(d);
    expect(html).toContain('class="habit-consistency"');
    for (const part of ['habit-consistency-month', 'habit-week-momentum', 'habit-trend-list', 'More often', 'Less often']) expect(html).toContain(part);
    expect(html).not.toContain('habit-teach-line');
  });
  it('the Trend per habit card is never all "Not enough days yet"', () => {
    const d = logHabitValue(habit(emptyHabitData(), WALK, 'Fictional walk', undefined, SINCE), WALK, TODAY, 1, {}, NOW);
    expect(renderToStaticMarkup(createElement(HabitTrendList, {habits: d.habits, today: TODAY}))).toBe('');
    expect(hasTrend([{word: null}, {word: null}])).toBe(false);
    expect(hasTrend([{word: null}, {word: 'same'}])).toBe(true);
  });
  it('the Showcase: the 30 days and the week have data and show; no week teaching line', () => {
    const fixture = buildShowcase('2026-09-21');
    const html = renderToStaticMarkup(createElement(HabitConsistency, {habits: habitDataSchema.parse(JSON.parse(fixture.records[HABITS_KEY]!)).habits, today: fixture.day}));
    expect(html).toContain('habit-consistency-month');
    expect(html).toContain('habit-week-momentum');
    expect(html).not.toContain('data-teach="month"');
    expect(html).not.toContain('data-teach="week"');
    // A trend card shows only with a word in it; otherwise its teaching line does.
    expect(html.includes('habit-trend-list') !== html.includes('data-teach="trend"')).toBe(true);
  });
});

describe('FR-TJ-7: the Habits page puts today\'s habits first (source order)', () => {
  const src = readFileSync(join(__dirname, '..', 'components', 'habits', 'habits-workspace.tsx'), 'utf8');
  it('both default orders: your habits, Routines (the owner\'s S4: right after them), Today\'s rhythm, consistency, weekday rhythm', () => {
    expect(src).toContain('const PHONE_ORDER = ["habits:list", "habits:routines", "habits:overview", "habits:consistency", "habits:rhythm"];');
    const at = (id: string) => src.indexOf(`{id: "${id}"`);
    const ids = ['habits:list', 'habits:routines', 'habits:overview', 'habits:consistency', 'habits:rhythm'];
    for (const id of ids) expect(at(id), id).toBeGreaterThan(0);
    expect(ids.map(at)).toEqual([...ids.map(at)].sort((a, b) => a - b));
    // The consistency block comes with the first habit; each card inside waits for its own data.
    expect(src).toMatch(/store\.data\.habits\.length > 0 && \{id: "habits:consistency"/);
  });
  it('inside your habits: the filters, then the cards; yesterday\'s list, Habit ideas and Reorder / Cards / Compact after them', () => {
    const list = src.slice(src.indexOf('{id: "habits:list"'), src.indexOf('{id: "habits:routines"'));
    const cards = list.indexOf('<HabitSections'), filters = list.indexOf('className="habit-filter-bar"');
    expect(filters).toBeGreaterThan(0);
    expect(cards).toBeGreaterThan(filters);
    for (const after of ['<YesterdayOpen', 'className="habit-phone-ideas"', 'className="habit-list-tools"', '<HabitReorderList']) {
      expect(list.indexOf(after), after).toBeGreaterThan(cards);
      expect(list.split(after).length - 1, after).toBe(1);
    }
  });
});
