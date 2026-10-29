import {GUIDED_PROGRAMS, programById, type GuidedProgram, type GuidedStep} from './programs';
import {MAX_DONE, MAX_JOURNEYS, type GuidedJourney, type GuidedJourneys} from './schema';

/**
 * Session AJ (item 34, D13): Guided journeys, pure. Dates are the person's local calendar dates ("YYYY-MM-DD", from
 * lib/local-date.ts); the arithmetic is on the calendar fields only (UTC midnights), so a daylight-saving change never
 * moves a step. Step i (from 0) opens on startedOn + i days. Only an opened step can be ticked done or undone, and only
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

/** How many steps are open: step i opens on startedOn + i days; an ended journey stops opening steps on its end date. */
export function unlockedCount(journey: GuidedJourney, program: GuidedProgram, today: string): number {
  const until = journey.endedOn && journey.endedOn < today ? journey.endedOn : today;
  return Math.max(0, Math.min(program.steps.length, daysBetween(journey.startedOn, until) + 1));
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
/** The person ticks an open step done (kept in the program's order; ticking twice changes nothing). */
export function markDone(record: GuidedJourneys, programId: string, stepId: string, today: string): GuidedJourneys {
  return changeActive(record, programId, (j, program) => {
    openStep(j, program, stepId, today);
    if (j.done.includes(stepId)) return j;
    const done = program.steps.map(s => s.id).filter(id => id === stepId || j.done.includes(id));
    // Ids a later build no longer has are kept, after the known ones, within the record's limit.
    const rest = j.done.filter(id => !done.includes(id));
    return {...j, done: [...done, ...rest].slice(0, MAX_DONE)};
  });
}
/** Takes a done tick back from an open step. */
export function undoDone(record: GuidedJourneys, programId: string, stepId: string, today: string): GuidedJourneys {
  return changeActive(record, programId, (j, program) => { openStep(j, program, stepId, today); return {...j, done: j.done.filter(id => id !== stepId)}; });
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
  return {day, total, unlocked, doneCount, complete: doneCount === total,
    today: day >= 1 && day <= total ? program.steps[day - 1]! : null,
    next: nextIndex < 0 ? null : {number: nextIndex + 1, opensOn: addCalendarDays(journey.startedOn, nextIndex)}};
}
/** One plain line: where the person is and what they ticked. */
export function progressLine(journey: GuidedJourney, program: GuidedProgram, today: string): string {
  const s = journeyState(journey, program, today), done = `${s.doneCount} of ${s.total} ${s.total === 1 ? 'step' : 'steps'} done`;
  if (s.complete) return `All ${s.total} steps done`;
  if (s.day < 1) return `Step 1 has not opened yet · ${done}`;
  if (s.day > s.total) return `Every step is open · ${done}`;
  return `Day ${s.day} of ${s.total} · ${done}`;
}
