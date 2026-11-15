import {GRID_FIRST_HOUR, GRID_LAST_HOUR, hourClock, hourOf} from '../../agenda/hour-grid';
import type {LifeReviewRecord} from '../../life-review/store';
import {addLocalDays} from '../../local-date';
import type {Platform} from '../../positions';
import {openTasks} from '../../tasks/engine';
import {QUADRANTS, QUADRANT_WORDS, matrix, type Quadrant} from '../../tasks/matrix';
import type {Tasks} from '../../tasks/schema';
import {formatDate} from '../../visual-format';
import type {WeeklyReview} from '../../weekly-review/schema';
import {reviewState, reviewWindow, type ReviewState} from '../../weekly-review/window';

/**
 * Session AM-2 (step 3, round 2, "NOVA connected"): the figures of four more widgets NOVA makes on request, pure and
 * read only, each from its page's own rules: the "Priority matrix" (lib/tasks/matrix.ts), "Today by the hour" (the
 * Agenda's hour grid, lib/agenda/hour-grid.ts), "Reviews" (the weekly review's window and state,
 * lib/weekly-review/window.ts, and the Life review's focus, lib/life-review/store.ts) and "Goal milestones" (the
 * milestones a person ticked on their goals, lib/positions.ts).
 *
 * Unknown is not zero: a record that was not read is null; an hour with nothing in it is simply not a row. Nothing is
 * projected and nothing is written.
 */

/* ---- Priority matrix ---- */
export type MatrixTask = {id: string; title: string; due: string | null; dueText: string | null};
export type MatrixBox = {id: Quadrant; title: string; hint: string; count: number; top: MatrixTask[]};
export type MatrixCard = {/** 'empty': no open task. */ state: 'empty' | 'live'; open: number; boxes: MatrixBox[]; /** The busiest box, for the meters' scale. */ most: number};
export function matrixCard(record: Tasks, today: string, shown = 3): MatrixCard {
  const open = openTasks(record, today), boxes = matrix(open, today);
  const rows = QUADRANTS.map((id): MatrixBox => ({id, title: QUADRANT_WORDS[id].title, hint: QUADRANT_WORDS[id].hint, count: boxes[id].length,
    top: boxes[id].slice(0, shown).map(t => ({id: t.id, title: t.title, due: t.due ?? null, dueText: t.due ? formatDate(t.due, {year: t.due.slice(0, 4) !== today.slice(0, 4)}) : null}))}));
  return {state: open.length ? 'live' : 'empty', open: open.length, boxes: rows, most: Math.max(0, ...rows.map(r => r.count))};
}
export const matrixRows = (card: MatrixCard): [string, string][] => card.boxes.map(b => [b.title, b.count ? `${b.count} ${b.count === 1 ? 'task' : 'tasks'}${b.top.length ? `: ${b.top.map(t => t.title).join('; ')}${b.count > b.top.length ? `; and ${b.count - b.top.length} more` : ''}` : ''}` : 'None']);

/* ---- Today by the hour ---- */
export type HourItem = {id: string; title: string; time: string | null; state: 'done' | 'skipped' | 'open'; pillar?: string};
export type HourRow = {hour: number; clock: string; items: HourItem[]};
export type HourGridCard = {
  /** 'empty': nothing on today at all. */
  state: 'empty' | 'live';
  total: number; timed: number; untimed: number; done: number;
  /** Only the hours that hold something, in order. */
  rows: HourRow[];
  /** One count per hour of the grid (06:00 to 23:00, earlier when an item is earlier), for the columns; an empty hour is null. */
  load: {hour: number; label: string; count: number | null}[];
  /** The hour of `now` inside the grid (for the lit column), or null. */
  nowIndex: number | null;
  /** The next open item at or after now. */
  next: HourItem | null;
};
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;
export function hourGridCard(items: readonly HourItem[], now: string): HourGridCard {
  const timed = items.filter(i => i.time !== null && CLOCK.test(i.time)), clock = CLOCK.test(now) ? now : '00:00';
  const first = Math.min(GRID_FIRST_HOUR, ...timed.map(i => hourOf(i.time!))), hours = Array.from({length: GRID_LAST_HOUR - first + 1}, (_, k) => first + k);
  const at = (h: number) => timed.filter(i => hourOf(i.time!) === h).sort((a, b) => a.time!.localeCompare(b.time!));
  const nowHour = hourOf(clock), nowIndex = hours.indexOf(nowHour);
  return {
    state: items.length ? 'live' : 'empty', total: items.length, timed: timed.length, untimed: items.length - timed.length, done: items.filter(i => i.state === 'done').length,
    rows: hours.map(h => ({hour: h, clock: hourClock(h), items: at(h)})).filter(r => r.items.length > 0),
    load: hours.map(h => { const n = at(h).length; return {hour: h, label: h % 3 === 0 ? String(h).padStart(2, '0') : '', count: n || null}; }),
    nowIndex: nowIndex >= 0 ? nowIndex : null,
    next: [...timed].filter(i => i.state === 'open' && i.time! >= clock).sort((a, b) => a.time!.localeCompare(b.time!))[0] ?? null,
  };
}
export function hourGridRows(card: HourGridCard): [string, string][] {
  return [
    ['Today', `${card.total} ${card.total === 1 ? 'item' : 'items'}: ${card.timed} with a time, ${card.untimed} any time, ${card.done} done`],
    ...card.rows.map(r => [r.clock, r.items.map(i => `${i.time} ${i.title}${i.state === 'done' ? ' (done)' : i.state === 'skipped' ? ' (skipped)' : ''}`).join('; ')] as [string, string]),
  ];
}

/* ---- Reviews: the weekly review and the Life review ---- */
export type ReviewsCard = {
  /** null: the weekly review was not read. */
  weekly: {state: ReviewState; stateWords: string; weekStart: string; weekEnd: string; reviewDay: string; /** The next review day after this window's. */ nextDay: string; /** The day the newest finished review was finished. */ lastDone: string | null; finished: number} | null;
  /** null: the Life review was not read. `focus`: the newest focus the person chose, in their own words (shown on the screen only). */
  life: {period: 'week' | 'month'; focus: {text: string; setAt: string} | null; chosen: number} | null;
};
const STATE_WORDS: Readonly<Record<ReviewState, string>> = {due: 'Due', draft: 'Started', done: 'Done', skipped: 'Skipped'};
export function reviewsCard(weekly: WeeklyReview | null | undefined, life: LifeReviewRecord | null | undefined, today: string): ReviewsCard {
  const w = weekly ? reviewWindow(weekly.weekday, today) : null, state = weekly && w ? reviewState(weekly, w.weekStart) : null;
  const finished = (weekly?.reviews ?? []).filter(r => r.completedAt).sort((a, b) => b.completedAt!.localeCompare(a.completedAt!));
  const focus = life ? Object.values(life.focus).sort((a, b) => b.setAt.localeCompare(a.setAt))[0] ?? null : null;
  return {
    weekly: weekly && w && state ? {state, stateWords: STATE_WORDS[state], ...w, nextDay: addLocalDays(w.reviewDay, 7), lastDone: finished[0]?.completedAt?.slice(0, 10) ?? null, finished: finished.length} : null,
    life: life ? {period: life.period ?? 'week', focus: focus ? {text: focus.text, setAt: focus.setAt} : null, chosen: Object.keys(life.focus).length} : null,
  };
}
export function reviewsRows(card: ReviewsCard, day: (date: string) => string): [string, string][] {
  const w = card.weekly, l = card.life;
  return [
    ['Weekly review', !w ? 'Not read on this device' : `${w.stateWords} for the week of ${day(w.weekStart)} to ${day(w.weekEnd)}`],
    ...(w ? [['Next review day', day(w.nextDay)] as [string, string], ['Last finished', w.lastDone ? day(w.lastDone) : 'None finished yet'] as [string, string]] : []),
    ['Life review', !l ? 'Not read on this device' : l.focus ? `Your latest focus: ${l.focus.text}` : 'No focus chosen yet'],
  ];
}

/* ---- Goal milestones (the person's own ticks) ---- */
export type MilestoneGoal = {id: string; name: string; done: number; total: number; share: number; /** The first milestone not ticked yet. */ next: string | null};
export type MilestonesCard = {/** 'empty': no open goal; 'none': open goals, none has a milestone. */ state: 'empty' | 'none' | 'live'; goals: MilestoneGoal[]; done: number; total: number; /** The goal whose next milestone leads: the one closest to done that still has one open. */ lead: MilestoneGoal | null};
export function milestonesCard(platform: Pick<Platform, 'goals'>): MilestonesCard {
  const open = platform.goals.filter(g => g.status !== 'closed');
  const goals = open.filter(g => g.milestones.length > 0).map((g): MilestoneGoal => { const done = g.milestones.filter(m => m.done).length; return {id: g.id, name: g.name, done, total: g.milestones.length, share: done / g.milestones.length, next: g.milestones.find(m => !m.done)?.title ?? null}; })
    .sort((a, b) => (a.next ? 0 : 1) - (b.next ? 0 : 1) || b.share - a.share || a.name.localeCompare(b.name));
  return {state: !open.length ? 'empty' : goals.length ? 'live' : 'none', goals, done: goals.reduce((n, g) => n + g.done, 0), total: goals.reduce((n, g) => n + g.total, 0), lead: goals.find(g => g.next) ?? null};
}
export const milestonesRows = (card: MilestonesCard, shown = card.goals.length): [string, string][] => card.goals.length ? [
  ['Milestones ticked', `${card.done} of ${card.total}`],
  ...card.goals.slice(0, shown).map(g => [g.name, `${g.done} of ${g.total} ticked${g.next ? `; next: ${g.next}` : '; all ticked'}`] as [string, string]),
  ...(card.goals.length > shown ? [['More goals', `${card.goals.length - shown} more on Goals`] as [string, string]] : []),
] : [['Milestones', card.state === 'empty' ? 'No open goal yet' : 'No open goal has milestones yet']];
