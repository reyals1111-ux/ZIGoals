import * as z from 'zod';
import {TASKS, type Tasks} from '../tasks/schema';
import {CHECKLIST, CHECKLIST_DAYS, checklistSchema, checklistDaysSchema, type Checklist, type ChecklistDays} from '../checklist/schema';
import {ZIGI_STORE_EVENT} from '../ai/store/keys';
import {replaceWithRecoveryCopy} from './recovery-copies';

/**
 * Session AL (P-LS-36, LS-025, LS-064; TIER 3 (stored format), additive): Tasks and the Checklist in the encrypted backup
 * ("Keep a protected copy"), as the two optional sections of format 3 (lib/vault/backup.ts).
 *
 * - `tasks` is the Tasks record (`zigoals:tasks:v1`) as stored.
 * - `checklist` holds the Checklist's path (`zigoals:checklist:v1`) and its day history (`zigoals:checklist-days:v1`). The
 *   Health quick inputs on the path (`healthItems`) are in it only when the person ticked "Include my Health records"
 *   (`health: true`), the rule the Checklist's sync section follows; today's tick receipts (`today`, which can name a
 *   Health entry) are never in it: they belong to this device and this day.
 *
 * A record this device does not hold, or that holds nothing yet, makes no section, so a person without Tasks or a
 * Checklist still gets a format 1 or 2 file that older apps read. A record that does not read is left out and named.
 * A restore replaces the record (as a module restore does), keeps the bytes it replaced as a recovery copy in this
 * browser, keeps this device's Health quick inputs when the file has none, and keeps today's ticks.
 */
export type ListSection = 'tasks' | 'checklist';
export const LIST_SECTIONS: readonly ListSection[] = ['tasks', 'checklist'];
export const isListSection = (name: string): name is ListSection => (LIST_SECTIONS as readonly string[]).includes(name);
export const LIST_LABELS: Record<ListSection, string> = {tasks: 'Tasks', checklist: 'Checklist'};
export const LIST_UNREADABLE = (label: string) => `${label} could not be read on this device, so they are not in this backup; they stay as they are here.`;
export const LIST_INVALID = 'This part of the backup did not read as expected, so nothing was changed.';

/** The checklist section as stored in the backup (strict outside; the records inside stay loose, as on the device). */
export const checklistSectionSchema = z.strictObject({
  format: z.literal('zigoals-checklist-backup'),
  version: z.literal(1),
  health: z.boolean(),
  checklist: checklistSchema.optional(),
  days: checklistDaysSchema.optional(),
});
export type ChecklistSection = z.infer<typeof checklistSectionSchema>;

const read = <T,>(storage: Pick<Storage, 'getItem'>, spec: {key: string; schema: z.ZodType<T>}): {value: T | null; unreadable: boolean} => {
  const raw = storage.getItem(spec.key);
  if (raw === null) return {value: null, unreadable: false};
  try { const parsed = spec.schema.safeParse(JSON.parse(raw)); return parsed.success ? {value: parsed.data, unreadable: false} : {value: null, unreadable: true}; } catch { return {value: null, unreadable: true}; }
};
const tasksHold = (t: Tasks) => t.tasks.length > 0 || (t.projects?.length ?? 0) > 0 || (t.filters?.length ?? 0) > 0;
const pathHolds = (c: Checklist, health: boolean) => c.items.length > 0 || (health && c.healthItems.length > 0) || (c.sections?.length ?? 0) > 0;
/** The path without its Health quick inputs, and without their places in the order. */
const withoutHealth = (c: Checklist): Checklist => { const ids = new Set(c.healthItems.map(i => i.id)); return {...c, healthItems: [], order: c.order.filter(id => !ids.has(id))}; };
const withoutToday = (d: ChecklistDays): ChecklistDays => { const {today, ...rest} = d; void today; return rest as ChecklistDays; };

/** The sections this device's Tasks and Checklist make, and a warning per record that could not be read. */
export function exportListSections(storage: Pick<Storage, 'getItem'>, {health}: {health: boolean}): {sections: Partial<Record<ListSection, string>>; warnings: string[]} {
  const sections: Partial<Record<ListSection, string>> = {}, warnings: string[] = [];
  const tasks = read(storage, TASKS);
  if (tasks.unreadable) warnings.push(LIST_UNREADABLE('Tasks'));
  else if (tasks.value && tasksHold(tasks.value)) sections.tasks = JSON.stringify(tasks.value);
  const path = read(storage, CHECKLIST), days = read(storage, CHECKLIST_DAYS);
  if (path.unreadable || days.unreadable) warnings.push(LIST_UNREADABLE('The Checklist’s path and day history'));
  const keepPath = !path.unreadable && path.value && pathHolds(path.value, health);
  const keepDays = !days.unreadable && days.value && Object.keys(days.value.days).length > 0;
  if (keepPath || keepDays) {
    const section: ChecklistSection = {format: 'zigoals-checklist-backup', version: 1, health,
      ...(keepPath ? {checklist: health ? path.value! : withoutHealth(path.value!)} : {}),
      ...(keepDays ? {days: withoutToday(days.value!)} : {})};
    sections.checklist = JSON.stringify(checklistSectionSchema.parse(section));
  }
  return {sections, warnings};
}

export type ListSummary = {counts: {label: string; count: number}[]; from: string | null; through: string | null};
const day = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
const range = (dates: (string | null)[]): {from: string | null; through: string | null} => { const d = dates.filter((x): x is string => !!x).sort(); return {from: d[0] ?? null, through: d.at(-1) ?? null}; };
/** The preview's counts for a validated section (never a title, a label or a value). Throws when it does not read. */
export function summarizeListSection(name: ListSection, raw: string): ListSummary {
  if (name === 'tasks') {
    const t = TASKS.schema.parse(JSON.parse(raw));
    return {counts: [{label: 'Open tasks', count: t.tasks.filter(x => !x.doneAt).length}, {label: 'Done tasks', count: t.tasks.filter(x => x.doneAt).length}, {label: 'Projects', count: t.projects?.length ?? 0}],
      ...range(t.tasks.flatMap(x => [day(x.createdAt), day(x.doneAt), day(x.updatedAt)]))};
  }
  const c = checklistSectionSchema.parse(JSON.parse(raw));
  return {counts: [{label: 'Path items', count: c.checklist?.items.length ?? 0}, ...(c.health ? [{label: 'Health quick inputs', count: c.checklist?.healthItems.length ?? 0}] : []), {label: 'Days recorded', count: Object.keys(c.days?.days ?? {}).length}],
    ...range(Object.keys(c.days?.days ?? {}).map(day))};
}

type RW = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;
const announce = (key: string) => { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: key})); };
/** Writes one record, keeping the bytes it replaces as `<key>:recovery:<uuid>` (lib/vault/recovery-copies.ts). */
function write(storage: RW, key: string, next: unknown) {
  const previous = storage.getItem(key), text = JSON.stringify(next);
  if (previous === null) storage.setItem(key, text);
  else if (previous !== text) {
    let prunable = false; try { JSON.parse(previous); prunable = true; } catch { /* an unreadable copy is never pruned away */ }
    replaceWithRecoveryCopy(storage as Storage, key, previous, text, prunable);
  }
}
/**
 * Restores one validated section on this device. Everything is validated before anything is written; a write that fails
 * puts back what was written before it, so the device holds either the restored records or its own.
 */
export function restoreListSection(storage: RW, name: ListSection, raw: string): void {
  let parsedRaw: unknown;
  try { parsedRaw = JSON.parse(raw); } catch { throw Error(LIST_INVALID); }
  if (name === 'tasks') {
    const tasks = TASKS.schema.safeParse(parsedRaw);
    if (!tasks.success) throw Error(LIST_INVALID);
    write(storage, TASKS.key, tasks.data); announce(TASKS.key);
    return;
  }
  const section = checklistSectionSchema.safeParse(parsedRaw);
  if (!section.success) throw Error(LIST_INVALID);
  const writes: [string, unknown][] = [];
  if (section.data.checklist) {
    const here = read(storage, CHECKLIST).value;
    // Without the Health choice the file holds no Health quick inputs: this device keeps its own.
    const kept = here?.healthItems ?? [], keptIds = new Set(kept.map(i => i.id));
    const next = section.data.health ? section.data.checklist : {...section.data.checklist, healthItems: kept, order: [...section.data.checklist.order, ...(here?.order ?? []).filter(id => keptIds.has(id) && !section.data.checklist!.order.includes(id))]};
    writes.push([CHECKLIST.key, CHECKLIST.schema.parse(next)]);
  }
  if (section.data.days) {
    const here = read(storage, CHECKLIST_DAYS).value;
    // Today's ticks belong to this device and this day: they stay.
    writes.push([CHECKLIST_DAYS.key, CHECKLIST_DAYS.schema.parse({...withoutToday(section.data.days), ...(here?.today ? {today: here.today} : {})})]);
  }
  const before = writes.map(([key]) => [key, storage.getItem(key)] as const);
  try { for (const [key, value] of writes) write(storage, key, value); }
  catch (error) {
    for (const [key, text] of before) try { if (text === null) storage.removeItem(key); else storage.setItem(key, text); } catch { /* left as written */ }
    throw error;
  }
  for (const [key] of writes) announce(key);
}
