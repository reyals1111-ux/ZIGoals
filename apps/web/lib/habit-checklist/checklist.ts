import * as z from 'zod';
import {habitExtrasSchema, type HabitExtras} from '../habits-extras/schema';

/**
 * Session AL Part 15 (AL-COMPETITOR-GAP-105; C-NB-11, C-NB-35): a checklist inside a habit, "Morning routine: make the
 * bed, stretch, glass of water". The steps are the person's own words, kept in the habit extras record's optional
 * `checklists` map (TIER 3 (stored format): additive in that loose record, so it travels with the habit extras section as
 * `intentions` does; older builds keep it through a read-modify-write and simply do not show it). Each entry is
 * `{items: [{id, text}], day?, ticked?}`: the ticks belong to `day` only, so a new day starts with every step open and no
 * history of ticks is kept. An entry that does not read is left out where it is read (never guessed), so one odd entry
 * never makes the whole record unreadable. Pure: nothing here writes or checks a habit in.
 */
export const CHECKLIST_MAX_ITEMS = 12, CHECKLIST_TEXT_MAX = 80, CHECKLIST_HABITS_MAX = 400;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const itemSchema = z.looseObject({id: z.string().min(1).max(40), text: z.string().trim().min(1).max(CHECKLIST_TEXT_MAX)});
export const habitChecklistSchema = z.looseObject({
  items: z.array(itemSchema).min(1).max(CHECKLIST_MAX_ITEMS),
  day: z.string().regex(DAY).optional(),
  ticked: z.array(z.string().min(1).max(40)).max(CHECKLIST_MAX_ITEMS).optional(),
}).refine(c => new Set(c.items.map(i => i.id)).size === c.items.length, 'Each step has its own id.');
export type HabitChecklist = z.infer<typeof habitChecklistSchema>;
export type ChecklistItem = HabitChecklist['items'][number];
export type ChecklistToday = {items: ChecklistItem[]; ticked: ReadonlySet<string>; done: number; total: number; all: boolean};

/** One line of plain text: control characters out, runs of spaces as one, at most CHECKLIST_TEXT_MAX characters. */
export function cleanStepText(text: string): string {
  return text.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, CHECKLIST_TEXT_MAX).trim();
}
/** "One step per line" into steps: blank lines dropped, a repeated step kept once. Throws with the reason past the limit. */
export function stepsFromLines(text: string): string[] {
  const seen = new Set<string>(), steps: string[] = [];
  for (const line of text.split(/\r\n|\r|\n/)) {
    const step = cleanStepText(line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, ''));
    if (!step || seen.has(step.toLowerCase())) continue;
    seen.add(step.toLowerCase()); steps.push(step);
  }
  if (steps.length > CHECKLIST_MAX_ITEMS) throw new RangeError(`A habit holds at most ${CHECKLIST_MAX_ITEMS} steps; this list has ${steps.length}.`);
  return steps;
}
const rawEntry = (extras: unknown, habitId: string): unknown => {
  const map = extras && typeof extras === 'object' ? (extras as {checklists?: unknown}).checklists : undefined;
  return map && typeof map === 'object' && !Array.isArray(map) ? (map as Record<string, unknown>)[habitId] : undefined;
};
/** The habit's checklist as stored, or null when it has none or its entry does not read. */
export function habitChecklist(extras: unknown, habitId: string): HabitChecklist | null {
  const parsed = habitChecklistSchema.safeParse(rawEntry(extras, habitId));
  return parsed.success ? parsed.data : null;
}
/** The steps with today's ticks (ticks from another day count as none). */
export function checklistToday(extras: unknown, habitId: string, today: string): ChecklistToday | null {
  const list = habitChecklist(extras, habitId);
  if (!list) return null;
  const ids = new Set(list.items.map(i => i.id)), ticked = new Set(list.day === today ? (list.ticked ?? []).filter(id => ids.has(id)) : []);
  return {items: list.items, ticked, done: ticked.size, total: list.items.length, all: ticked.size === list.items.length};
}
const writeEntry = (extras: HabitExtras, habitId: string, entry: HabitChecklist | null, keep: ReadonlySet<string> | null): HabitExtras => {
  const current = extras.checklists && typeof extras.checklists === 'object' ? {...(extras.checklists as Record<string, unknown>)} : {};
  if (entry) current[habitId] = entry; else delete current[habitId];
  const next = Object.fromEntries(Object.entries(current).filter(([id]) => !keep || keep.has(id) || id === habitId));
  if (Object.keys(next).length > CHECKLIST_HABITS_MAX) throw new RangeError('Too many habits have a checklist on this device.');
  const {checklists: _old, ...rest} = extras; void _old;
  return habitExtrasSchema.parse(Object.keys(next).length ? {...rest, checklists: next} : rest);
};
const newId = () => `s_${(globalThis.crypto?.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/-/g, '').slice(0, 16)}`;
/**
 * Sets the habit's steps (an empty list removes its checklist). A step kept from before keeps its id, so today's tick on
 * it stays; a removed step's tick goes with it. `keep` is the journal's habit ids (entries of habits it no longer has are
 * pruned on this write).
 */
export function setChecklistSteps(extras: HabitExtras, habitId: string, steps: readonly string[], today: string, keep: ReadonlySet<string> | null = null): HabitExtras {
  const clean = steps.map(cleanStepText).filter(Boolean);
  if (clean.length > CHECKLIST_MAX_ITEMS) throw new RangeError(`A habit holds at most ${CHECKLIST_MAX_ITEMS} steps.`);
  if (!clean.length) return writeEntry(extras, habitId, null, keep);
  const before = checklistToday(extras, habitId, today), pool = [...(before?.items ?? [])];
  const items = clean.map(text => {
    const at = pool.findIndex(i => i.text.toLowerCase() === text.toLowerCase());
    return at >= 0 ? {id: pool.splice(at, 1)[0]!.id, text} : {id: newId(), text};
  });
  const ticked = items.filter(i => before?.ticked.has(i.id)).map(i => i.id);
  return writeEntry(extras, habitId, habitChecklistSchema.parse({items, ...(ticked.length ? {day: today, ticked} : {})}), keep);
}
/** Ticks or unticks one step for today. Throws when the habit has no such step. */
export function tickStep(extras: HabitExtras, habitId: string, stepId: string, today: string, on: boolean): HabitExtras {
  const now = checklistToday(extras, habitId, today);
  if (!now || !now.items.some(i => i.id === stepId)) throw new Error('This step is no longer in the habit’s checklist.');
  const ticked = new Set(now.ticked);
  if (on) ticked.add(stepId); else ticked.delete(stepId);
  const list = habitChecklist(extras, habitId)!;
  return writeEntry(extras, habitId, habitChecklistSchema.parse({...list, day: today, ticked: now.items.map(i => i.id).filter(id => ticked.has(id))}), null);
}
/** The card's short line: "2 of 3 steps today", "All 3 steps done today". */
export function checklistLine(now: Pick<ChecklistToday, 'done' | 'total'>): string {
  return now.done === now.total ? `All ${now.total} ${now.total === 1 ? 'step' : 'steps'} done today` : `${now.done} of ${now.total} ${now.total === 1 ? 'step' : 'steps'} today`;
}
