import {pathColour, type PathColour} from './colours';
export type {PathColour} from './colours';

/**
 * The shared path engine's data model (Session AF, ADR-028; owner requests P7.1–P7.8). Pure: no React, no DOM, no storage.
 * The Checklist builds a model from the person's favourites; the Earn lane's Start-here path and the Academy's mini path
 * build theirs from lessons and detected states. `components/path/path.tsx` draws any model unchanged.
 *
 * Shape, in plain words:
 * - a path is a list of sections ("orbits"), each with a banner colour and its steps ("dots"), in the order they are drawn;
 * - a step is done, undone, running (a timer that has started) or locked (not yet reachable; it says why);
 * - a step may open a page (`href`), take a value (`value`: the stepper's range and the last value), or be ticked;
 * - milestones ("chests") sit half way, at the end, or after a named step;
 * - ZIGi stands beside the next step that still waits.
 * Nothing here decides what is true: the caller derives each state from the real record and passes it in.
 */
export const STEP_STATES = ['done', 'undone', 'running', 'locked'] as const;
export type StepState = (typeof STEP_STATES)[number];
/** What pressing a step asks for: tick it, open its page, or open the value stepper. */
export type StepIntent = 'tick' | 'open' | 'value';
/** A value step's stepper: the number shown first (the last value logged, else `suggested`), its range and unit. */
export type StepValue = {current: number | null; unit: string; suggested: number; min: number; max: number; step: number};
export type PathStep = {
  id: string;
  label: string;
  /** A short second line: "500 ml", "logged for 17 Oct", "Not today", "Detected". */
  note?: string;
  colour: PathColour;
  state: StepState;
  /** An `AppIcon` name drawn inside the dot. */
  glyph?: string;
  /** A step that opens a page (an Earn lesson, an "Open goal" dot). */
  href?: string;
  /** Overrides the derived intent (see `stepIntent`). */
  intent?: StepIntent;
  value?: StepValue;
  /** 0 < partial < 1: how far an undone step has come (a habit at 2 of 3); drawn as a ring, never counted as done. */
  partial?: number;
  /** The instant the record says the step was done. */
  doneAt?: string;
  /** false: drawn on the path but left out of the progress (an "Open goal" dot, a habit that rests today). Default true. */
  counted?: boolean;
  /** Why a locked step cannot be done yet, in plain words. */
  lockedReason?: string;
};
export type PathSection = {id: string; label: string; eyebrow?: string; colour: PathColour; steps: PathStep[]};
export type MilestoneAt = 'half' | 'end' | {afterStep: string};
export type PathMilestone = {id: string; at: MilestoneAt; label: string; reachedLabel?: string; reward?: {badge?: string; xp?: number}};
export type PathModel = {id: string; label?: string; sections: PathSection[]; milestones: PathMilestone[]};

export type PathProgress = {done: number; total: number; fraction: number};
export type PlacedMilestone = PathMilestone & {reached: boolean; /** The step the chest is drawn after; null when it cannot be placed (an unknown step id, an empty path). */ afterStepId: string | null};
export type PathSegment = {id: string; from: string; to: string; sectionId: string; /** Joins the last dot of one orbit to the first of the next. */ bridge: boolean; lit: boolean; locked: boolean};
export type ZigiMood = 'empty' | 'start' | 'going' | 'half' | 'done';
export type ZigiAnchor = {stepId: string | null; sectionId: string | null; mood: ZigiMood};

/** Every step in path order (sections in order, steps in order). */
export const pathSteps = (model: Pick<PathModel, 'sections'>): PathStep[] => model.sections.flatMap(s => s.steps);
/** A step counts toward the progress unless the caller says it does not (locked steps count: they are part of the way). */
export const isCounted = (step: PathStep) => step.counted !== false;
export const isDone = (step: PathStep) => step.state === 'done';
/** Pressing a locked step does nothing; otherwise the caller's intent, else value → stepper, href → open, else tick. */
export const stepIntent = (step: PathStep): StepIntent | null => step.state === 'locked' ? null : step.intent ?? (step.value ? 'value' : step.href ? 'open' : 'tick');

const progressOf = (steps: PathStep[]): PathProgress => {
  const counted = steps.filter(isCounted), done = counted.filter(isDone).length, total = counted.length;
  return {done, total, fraction: total ? done / total : 0};
};
export const pathProgress = (model: Pick<PathModel, 'sections'>): PathProgress => progressOf(pathSteps(model));
export const sectionProgress = (section: PathSection): PathProgress => progressOf(section.steps);

/** The first step in path order that still waits (undone or running, never locked, never a step left out of the count). */
export const nextStep = (model: Pick<PathModel, 'sections'>): PathStep | null => pathSteps(model).find(s => isCounted(s) && (s.state === 'undone' || s.state === 'running')) ?? null;

/** The lines: one between each pair of neighbouring dots, and a bridge from each orbit's last dot to the next orbit's first.
 *  A line is lit when both its dots are done; it is drawn as locked when either end is locked. */
export function pathSegments(model: Pick<PathModel, 'sections'>): PathSegment[] {
  const out: PathSegment[] = [];
  const seg = (a: PathStep, b: PathStep, sectionId: string, bridge: boolean): PathSegment => ({id: `${a.id}->${b.id}`, from: a.id, to: b.id, sectionId, bridge, lit: isDone(a) && isDone(b), locked: a.state === 'locked' || b.state === 'locked'});
  const sections = model.sections.filter(s => s.steps.length);
  sections.forEach((section, si) => {
    section.steps.forEach((a, i) => { const b = section.steps[i + 1]; if (b) out.push(seg(a, b, section.id, false)); });
    const last = section.steps.at(-1), first = sections[si + 1]?.steps[0];
    if (last && first) out.push(seg(last, first, section.id, true));
  });
  return out;
}
/** Within one section: segment i (between steps i and i + 1) is lit when both are done. */
export const litSegments = (section: PathSection): boolean[] => section.steps.slice(1).map((step, i) => section.steps[i]?.state === 'done' && isDone(step));

/**
 * Where each chest sits and whether it is reached. Half way: after the step at the half-way count (in path order), reached
 * once half the counted steps are done in any order. End: after the last step, reached when every counted step is done.
 * After a step: reached when that step and every counted step before it are done (the Earn path's chapters).
 */
export function milestoneState(model: Pick<PathModel, 'sections' | 'milestones'>): PlacedMilestone[] {
  const steps = pathSteps(model), counted = steps.filter(isCounted), {done, total} = progressOf(steps);
  return model.milestones.map(m => {
    if (m.at === 'half') {
      const half = Math.ceil(total / 2), anchor = total ? counted[half - 1] : undefined;
      return {...m, afterStepId: anchor?.id ?? null, reached: total > 0 && done >= half};
    }
    if (m.at === 'end') return {...m, afterStepId: steps.at(-1)?.id ?? null, reached: total > 0 && done === total};
    const afterStep = m.at.afterStep, index = steps.findIndex(s => s.id === afterStep);
    if (index < 0) return {...m, afterStepId: null, reached: false};
    const upTo = steps.slice(0, index + 1).filter(isCounted);
    return {...m, afterStepId: afterStep, reached: upTo.length > 0 && upTo.every(isDone)};
  });
}

/** ZIGi stands beside the next waiting step; its mood follows the progress (the renderer maps a mood to a ZIGi state). */
export function zigiAnchor(model: Pick<PathModel, 'sections'>): ZigiAnchor {
  const next = nextStep(model), {done, total} = pathProgress(model);
  const sectionId = next ? model.sections.find(s => s.steps.some(x => x.id === next.id))?.id ?? null : null;
  const mood: ZigiMood = total === 0 ? 'empty' : done === total ? 'done' : done === 0 ? 'start' : done * 2 >= total ? 'half' : 'going';
  return {stepId: next?.id ?? null, sectionId, mood};
}

/** The snake: each dot's sideways offset as a fraction of the swing (−1 left … 1 right), a gentle wave through every orbit. */
export const snakeOffset = (index: number) => Math.round(Math.sin((index * Math.PI) / 4) * 100) / 100 || 0;

/** The dot's accessible name: its label, its value or note, and its state in words. */
export function stepAriaLabel(step: PathStep): string {
  const state = step.state === 'done' ? 'done' : step.state === 'running' ? 'running' : step.state === 'locked' ? `locked${step.lockedReason ? ` (${step.lockedReason})` : ''}` : step.counted === false ? 'not counted today' : 'not done yet';
  return [step.label, step.note, state].filter(Boolean).join(': ');
}

/** A copy of the model with one step's state changed (an optimistic paint before the record confirms; the record still wins). */
export const withStepState = (model: PathModel, id: string, state: StepState): PathModel => ({...model, sections: model.sections.map(s => s.steps.some(x => x.id === id) ? {...s, steps: s.steps.map(x => x.id === id ? {...x, state} : x)} : s)});

/** A model a caller assembled by hand, made safe to draw: unknown colours fall back, duplicate step ids keep the first,
 *  empty sections stay (their banner says "nothing here yet"), partial is clamped to (0, 1). */
export function normalisePath(model: PathModel): PathModel {
  const seen = new Set<string>();
  return {...model, sections: model.sections.map(s => ({...s, colour: pathColour(s.colour), steps: s.steps.filter(x => !seen.has(x.id) && (seen.add(x.id), true)).map(x => ({...x, colour: pathColour(x.colour, pathColour(s.colour)), state: (STEP_STATES as readonly string[]).includes(x.state) ? x.state : 'undone', ...(x.partial === undefined ? {} : {partial: Math.min(0.99, Math.max(0.01, x.partial))})}))}))};
}
/** Problems a test or a dev build can assert on: duplicate ids and milestones that name a step the path does not have. */
export function pathProblems(model: PathModel): string[] {
  const problems: string[] = [], ids = new Set<string>(), sections = new Set<string>();
  for (const s of model.sections) { if (sections.has(s.id)) problems.push(`duplicate section ${s.id}`); sections.add(s.id); for (const x of s.steps) { if (ids.has(x.id)) problems.push(`duplicate step ${x.id}`); ids.add(x.id); } }
  for (const m of model.milestones) if (typeof m.at === 'object' && !ids.has(m.at.afterStep)) problems.push(`milestone ${m.id} names an unknown step ${m.at.afterStep}`);
  return problems;
}
