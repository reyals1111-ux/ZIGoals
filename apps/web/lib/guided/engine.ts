import {GUIDED_PROGRAMS, programById, type GuidedProgram, type GuidedStep, type ProgrammeDay, type ProgrammeStep} from './programs';
import {MAX_DONE, MAX_JOURNEYS, MAX_STEPS_DONE, type GuidedJourney, type GuidedJourneys} from './schema';

/**
 * Session AJ (item 34, D13): Guided journeys, pure. Dates are the person's local calendar dates ("YYYY-MM-DD", from
 * lib/local-date.ts); the arithmetic is on the calendar fields only (UTC midnights), so a daylight-saving change never
 * moves a step. Step i (from 0) opens on startedOn + i days (a written programme's day on its own offset, Session AW). Only an opened step can be ticked done or undone, and only
 * the person's own tap calls these. One active journey per program; at most three active at once.
 */
export const MAX_ACTIVE = 3;
/** A refusal the page shows as it is (plain words, nothing private in it). */
export class GuidedError extends Error { override name = 'GuidedError'; }

const DAY = 86_400_000;
function calendar(value: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const t = m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : NaN;
  if (!m || !Number.isFinite(t) || new Date(t).toISOString().slice(0, 10) !== value) throw new GuidedError('That date could not be read.');
  return t;
}
/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export const daysBetween = (from: string, to: string): number => Math.round((calendar(to) - calendar(from)) / DAY);
/** "YYYY-MM-DD" plus whole days. */
export const addCalendarDays = (day: string, n: number): string => new Date(calendar(day) + n * DAY).toISOString().slice(0, 10);

export const isActive = (j: GuidedJourney): boolean => !j.endedOn;
export const activeJourneyFor = (record: GuidedJourneys, programId: string): GuidedJourney | undefined => record.journeys.find(j => j.programId === programId && isActive(j));
/** The active journeys whose program this build still has, in the order they were started. */
export function activeJourneys(record: GuidedJourneys, programs: readonly GuidedProgram[] = GUIDED_PROGRAMS): {journey: GuidedJourney; program: GuidedProgram}[] {
  return record.journeys.flatMap(journey => { const program = programs.find(p => p.id === journey.programId); return isActive(journey) && program ? [{journey, program}] : []; });
}

/** Why a program cannot be started now, in plain words, or null when it can. */
export function startRefusal(record: GuidedJourneys, programId: string): string | null {
  if (!programById(programId)) return 'This journey is not available.';
  if (activeJourneyFor(record, programId)) return 'You are already on this journey.';
  if (activeJourneys(record).length >= MAX_ACTIVE) return 'You have three journeys going. End one to start another.';
  return null;
}
/** Starts a program today. When the list is full, the oldest ended journey makes room; active ones are never dropped. */
export function startJourney(record: GuidedJourneys, programId: string, today: string): GuidedJourneys {
  calendar(today);
  const refusal = startRefusal(record, programId);
  if (refusal) throw new GuidedError(refusal);
  let journeys = record.journeys;
  if (journeys.length >= MAX_JOURNEYS) {
    const oldest = journeys.findIndex(j => !isActive(j));
    if (oldest < 0) throw new GuidedError('Your list of journeys is full. End one to start another.');
    journeys = journeys.filter((_, i) => i !== oldest);
  }
  return {...record, journeys: [...journeys, {programId, startedOn: today, done: []}]};
}

/** The day (from 0, counted from the start date) step i opens on: i for a journey; a programme day's own offset (Session AW). */
export const opensAfter = (program: GuidedProgram, i: number): number => program.days?.[i]?.offset ?? i;
/** How many steps are open: step i opens on startedOn + opensAfter(i) days; an ended journey stops opening steps on its end date. */
export function unlockedCount(journey: GuidedJourney, program: GuidedProgram, today: string): number {
  const until = journey.endedOn && journey.endedOn < today ? journey.endedOn : today, elapsed = daysBetween(journey.startedOn, until);
  let n = 0;
  while (n < program.steps.length && opensAfter(program, n) <= elapsed) n++;
  return n;
}
export const unlockedSteps = (journey: GuidedJourney, program: GuidedProgram, today: string): readonly GuidedStep[] => program.steps.slice(0, unlockedCount(journey, program, today));

function changeActive(record: GuidedJourneys, programId: string, change: (j: GuidedJourney, program: GuidedProgram) => GuidedJourney): GuidedJourneys {
  const program = programById(programId), journey = activeJourneyFor(record, programId);
  if (!program || !journey) throw new GuidedError('This journey is not active.');
  return {...record, journeys: record.journeys.map(j => j === journey ? change(j, program) : j)};
}
function openStep(journey: GuidedJourney, program: GuidedProgram, stepId: string, today: string): void {
  if (!unlockedSteps(journey, program, today).some(s => s.id === stepId)) throw new GuidedError('This step is not open yet.');
}
/** A journey without the step ticks of one programme day (they are implied once the day is done). */
function withoutDayTicks(j: GuidedJourney, dayId: string): GuidedJourney {
  if (!j.stepsDone) return j;
  const kept = j.stepsDone.filter(k => !k.startsWith(`${dayId}/`));
  return kept.length === j.stepsDone.length ? j : {...j, stepsDone: kept};
}
function addDay(j: GuidedJourney, program: GuidedProgram, stepId: string): GuidedJourney {
  if (j.done.includes(stepId)) return withoutDayTicks(j, stepId);
  const done = program.steps.map(s => s.id).filter(id => id === stepId || j.done.includes(id));
  // Ids a later build no longer has are kept, after the known ones, within the record's limit.
  const rest = j.done.filter(id => !done.includes(id));
  return withoutDayTicks({...j, done: [...done, ...rest].slice(0, MAX_DONE)}, stepId);
}
/** The person ticks an open step done (kept in the program's order; ticking twice changes nothing). For a programme, the step is a whole day. */
export function markDone(record: GuidedJourneys, programId: string, stepId: string, today: string): GuidedJourneys {
  return changeActive(record, programId, (j, program) => {
    openStep(j, program, stepId, today);
    if (j.done.includes(stepId)) return j;
    return addDay(j, program, stepId);
  });
}
/** Takes a done tick back from an open step (for a programme: the whole day, its steps unticked too). */
export function undoDone(record: GuidedJourneys, programId: string, stepId: string, today: string): GuidedJourneys {
  return changeActive(record, programId, (j, program) => { openStep(j, program, stepId, today); return withoutDayTicks({...j, done: j.done.filter(id => id !== stepId)}, stepId); });
}

// Session AW (programmes): the steps inside a programme day. A day is done when each of its steps is ticked (or when the
// person marks the whole day done); its id then goes in `done` and its step ticks leave `stepsDone`.
export const stepKeyOf = (dayId: string, stepId: string): string => `${dayId}/${stepId}`;
function dayOf(program: GuidedProgram, dayId: string): ProgrammeDay {
  const day = program.days?.find(d => d.id === dayId);
  if (!day) throw new GuidedError('This day is not part of the programme.');
  return day;
}
/** Whether a step of a programme day is ticked: by its own tick, or because its whole day is done. */
export const isStepDone = (journey: GuidedJourney, day: ProgrammeDay, s: ProgrammeStep): boolean => journey.done.includes(day.id) || (journey.stepsDone ?? []).includes(stepKeyOf(day.id, s.id));
/** How many of a day's steps are ticked. */
export const dayProgress = (journey: GuidedJourney, day: ProgrammeDay): {done: number; total: number} => ({done: day.steps.filter(s => isStepDone(journey, day, s)).length, total: day.steps.length});
/** The person ticks one step of an open programme day; the last one makes the day done. */
export function tickStep(record: GuidedJourneys, programId: string, dayId: string, stepId: string, today: string): GuidedJourneys {
  return changeActive(record, programId, (j, program) => {
    const day = dayOf(program, dayId);
    if (!day.steps.some(s => s.id === stepId)) throw new GuidedError('This step is not part of the day.');
    openStep(j, program, dayId, today);
    if (isStepDone(j, day, day.steps.find(s => s.id === stepId)!)) return j;
    const key = stepKeyOf(dayId, stepId), ticked = [...(j.stepsDone ?? []), key];
    if (day.steps.every(s => ticked.includes(stepKeyOf(dayId, s.id)))) return addDay({...j, stepsDone: ticked}, program, dayId);
    if (ticked.length > MAX_STEPS_DONE) throw new GuidedError('Too many steps are ticked on days not yet done. Finish or untick a day first.');
    return {...j, stepsDone: ticked};
  });
}
/** Takes one step's tick back; on a done day, the day is no longer done and its other steps stay ticked. */
export function untickStep(record: GuidedJourneys, programId: string, dayId: string, stepId: string, today: string): GuidedJourneys {
  return changeActive(record, programId, (j, program) => {
    const day = dayOf(program, dayId), key = stepKeyOf(dayId, stepId);
    if (!day.steps.some(s => s.id === stepId)) throw new GuidedError('This step is not part of the day.');
    openStep(j, program, dayId, today);
    if (!j.done.includes(dayId)) return {...j, stepsDone: (j.stepsDone ?? []).filter(k => k !== key)};
    const others = day.steps.filter(s => s.id !== stepId).map(s => stepKeyOf(dayId, s.id));
    const ticked = [...(j.stepsDone ?? []).filter(k => !k.startsWith(`${dayId}/`)), ...others];
    if (ticked.length > MAX_STEPS_DONE) throw new GuidedError('Too many steps are ticked on days not yet done. Finish or untick a day first.');
    return {...j, done: j.done.filter(id => id !== dayId), stepsDone: ticked};
  });
}
/** Ends the program's active journey today (never before the day it started). Its ticks stay in the record. */
export function endJourney(record: GuidedJourneys, programId: string, today: string): GuidedJourneys {
  calendar(today);
  return changeActive(record, programId, j => ({...j, endedOn: today < j.startedOn ? j.startedOn : today}));
}

export type JourneyState = {
  /** 1 on the start day; 0 or less before it (a clock moved back). */
  day: number; total: number; unlocked: readonly GuidedStep[]; doneCount: number; complete: boolean;
  /** The step that opened today, if one did. */
  today: GuidedStep | null;
  /** The next step still closed: its number (from 1) and the date it opens. */
  next: {number: number; opensOn: string} | null;
};
export function journeyState(journey: GuidedJourney, program: GuidedProgram, today: string): JourneyState {
  const day = daysBetween(journey.startedOn, today) + 1, unlocked = unlockedSteps(journey, program, today), total = program.steps.length;
  const doneCount = program.steps.filter(s => journey.done.includes(s.id)).length;
  const nextIndex = unlocked.length < total ? unlocked.length : -1;
  // Session AW: a programme's step for today is the day that opens today (none on a rest day); a journey's is step `day`.
  const todayIndex = program.steps.findIndex((_, i) => opensAfter(program, i) === day - 1);
  return {day, total, unlocked, doneCount, complete: doneCount === total,
    today: day >= 1 && todayIndex >= 0 ? program.steps[todayIndex]! : null,
    next: nextIndex < 0 ? null : {number: nextIndex + 1, opensOn: addCalendarDays(journey.startedOn, opensAfter(program, nextIndex))}};
}
const plural = (n: number, word: string) => `${n} ${n === 1 ? word : `${word}s`}`;
/** One plain line: where the person is and what they ticked. */
export function progressLine(journey: GuidedJourney, program: GuidedProgram, today: string): string {
  const s = journeyState(journey, program, today);
  if (program.days) {
    // Session AW: a programme counts its days (sessions, runs), and a weekly plan says the week.
    const word = (program.dayWord ?? 'Day').toLowerCase(), done = `${s.doneCount} of ${plural(s.total, word)} done`;
    if (s.complete) return `All ${plural(s.total, word)} done`;
    if (s.day < 1) return `${program.dayWord ?? 'Day'} 1 has not opened yet · ${done}`;
    const last = opensAfter(program, s.total - 1) + 1;
    if (s.day > last) return `Every ${word} is open · ${done}`;
    return program.weeks ? `Week ${Math.min(program.weeks, Math.floor((s.day - 1) / 7) + 1)} of ${program.weeks} · ${done}` : `Day ${s.day} of ${s.total} · ${done}`;
  }
  const done = `${s.doneCount} of ${s.total} ${s.total === 1 ? 'step' : 'steps'} done`;
  if (s.complete) return `All ${s.total} steps done`;
  if (s.day < 1) return `Step 1 has not opened yet · ${done}`;
  if (s.day > s.total) return `Every step is open · ${done}`;
  return `Day ${s.day} of ${s.total} · ${done}`;
}
/** Session AW: today's programme day, or why there is none (a rest day, not open yet, every day done or past the plan). */
export type ProgrammeToday = {kind: 'day'; day: ProgrammeDay; number: number} | {kind: 'rest'; next: {day: ProgrammeDay; number: number; opensOn: string} | null} | {kind: 'before'; opensOn: string} | {kind: 'complete'} | {kind: 'after'};
export function programmeToday(journey: GuidedJourney, program: GuidedProgram, today: string): ProgrammeToday | null {
  if (!program.days) return null;
  const s = journeyState(journey, program, today);
  if (s.complete) return {kind: 'complete'};
  if (s.day < 1) return {kind: 'before', opensOn: journey.startedOn};
  if (s.today) { const i = program.days.findIndex(d => d.id === s.today!.id); return {kind: 'day', day: program.days[i]!, number: i + 1}; }
  if (s.next) return {kind: 'rest', next: {day: program.days[s.next.number - 1]!, number: s.next.number, opensOn: s.next.opensOn}};
  return {kind: 'after'};
}
