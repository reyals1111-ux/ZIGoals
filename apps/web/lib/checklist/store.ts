import {isPathColour, pathColour, type PathColour} from '../path/colours';
import {cleanPathLabel} from './path-label';
import {checklistSchema, knownInput, knownKind, type Checklist, type ChecklistHealthItem, type ChecklistItem, type ChecklistSection, type HealthInput} from './schema';

/**
 * Pure mutators of `zigoals:checklist:v1` (Session AF, L3): what is on the path, never what was done. Each returns a new
 * record validated by the schema, or the same record when nothing changes; a limit or a missing item throws with the
 * person-facing words, so the caller shows them and nothing is written.
 */
export const MAX_PATH_ITEMS = 60, MAX_HEALTH_ITEMS = 40, MAX_SECTIONS = 12, MAX_LABEL = 60, MAX_SECTION_LABEL = 30;
export const CHECKLIST_LIMIT_MESSAGE = `Your path holds up to ${MAX_PATH_ITEMS} items and ${MAX_HEALTH_ITEMS} Health inputs. Remove one first.`;
export const CHECKLIST_SECTION_LIMIT_MESSAGE = `Your path holds up to ${MAX_SECTIONS} orbits.`;
export const CUSTOM_LABEL_MESSAGE = `Give it a name of 1 to ${MAX_LABEL} characters.`;
export const ITEM_MISSING_MESSAGE = 'That item is no longer on your path.';
export class ChecklistError extends Error {}

/** The orbits a path starts with (P7.5): by time of day, plus Anytime. The person may rename, recolour, add or remove. */
export const DEFAULT_SECTIONS: readonly ChecklistSection[] = [
  {id: 'morning', label: 'Morning orbit', colour: 'cyan'},
  {id: 'afternoon', label: 'Afternoon orbit', colour: 'blue'},
  {id: 'evening', label: 'Evening orbit', colour: 'purple'},
  {id: 'anytime', label: 'Anytime', colour: 'pink'},
];
export const sectionsOf = (record: Checklist): ChecklistSection[] => (record.sections?.length ? record.sections : DEFAULT_SECTIONS).map(s => ({...s}));

/** What a favourite points at. A custom item is its own record. */
export type HealthRef = {input: Exclude<HealthInput, 'diary' | 'meal'>} | {input: 'diary'; sourceKind: string; sourceId: string} | {input: 'meal'; meal: string};
export type FavouriteRef = {kind: 'habit'; habitId: string} | {kind: 'goal'; goalId: string} | {kind: 'goal-step'; goalId: string; milestoneId: string} | ({kind: 'health'} & HealthRef);
export function isHealthItem(item: ChecklistItem | ChecklistHealthItem): item is ChecklistHealthItem { return item.kind === 'health' && typeof (item as {input?: unknown}).input === 'string'; }
/** One stable name per favourite, so the same habit (or the same glass of water) is never on the path twice. */
export function favouriteKey(ref: FavouriteRef): string {
  if (ref.kind === 'habit') return `habit:${ref.habitId}`;
  if (ref.kind === 'goal') return `goal:${ref.goalId}`;
  if (ref.kind === 'goal-step') return `goal-step:${ref.goalId}:${ref.milestoneId}`;
  if (ref.input === 'diary') return `health:diary:${ref.sourceKind}:${ref.sourceId}`;
  if (ref.input === 'meal') return `health:meal:${ref.meal}`;
  return `health:${ref.input}`;
}
/** The same name for a stored item (null for a custom item or an item this build does not know). */
export function itemKey(item: ChecklistItem | ChecklistHealthItem): string | null {
  if (item.kind === 'habit' && item.ref?.habitId) return `habit:${item.ref.habitId}`;
  if (item.kind === 'goal' && item.ref?.goalId) return `goal:${item.ref.goalId}`;
  if (item.kind === 'goal-step' && item.ref?.goalId && item.ref.milestoneId) return `goal-step:${item.ref.goalId}:${item.ref.milestoneId}`;
  if (isHealthItem(item)) {
    if (item.input === 'diary') return item.ref?.sourceKind && item.ref.sourceId ? `health:diary:${item.ref.sourceKind}:${item.ref.sourceId}` : null;
    if (item.input === 'meal') return item.ref?.meal ? `health:meal:${item.ref.meal}` : null;
    return knownInput(item.input) ? `health:${item.input}` : null;
  }
  return null;
}
const allItems = (record: Checklist): (ChecklistItem | ChecklistHealthItem)[] => [...record.items, ...record.healthItems];
export const findFavourite = (record: Checklist, ref: FavouriteRef) => { const key = favouriteKey(ref); return allItems(record).find(i => itemKey(i) === key) ?? null; };
export const isFavourite = (record: Checklist, ref: FavouriteRef) => findFavourite(record, ref) !== null;
export const findItem = (record: Checklist, id: string) => allItems(record).find(i => i.id === id) ?? null;

const save = (record: Checklist): Checklist => checklistSchema.parse(record);
const withOrder = (record: Checklist, id: string): string[] => [...record.order.filter(x => x !== id), id];
const sectionOrDefault = (record: Checklist, section: string | undefined, fallback = 'anytime') => { const ids = sectionsOf(record).map(s => s.id); return section && ids.includes(section) ? section : ids.includes(fallback) ? fallback : ids[ids.length - 1] ?? 'anytime'; };

export type AddOptions = {id: string; at: Date; label?: string; section?: string; colour?: PathColour; defaultValue?: number; unit?: string};
/** Stars an item (P7.2). Already a favourite: the record unchanged. */
export function addFavourite(record: Checklist, ref: FavouriteRef, options: AddOptions): Checklist {
  if (isFavourite(record, ref)) return record;
  const at = options.at.toISOString(), label = options.label?.trim().slice(0, 120) || undefined;
  // Session AH (TO5, T-111): a habit starred while a custom item of the same name is on the path takes that item's place
  // (as "Make this a habit" does), so the path never shows two planets with one name.
  if (ref.kind === 'habit' && label) {
    const same = record.items.find(i => i.kind === 'custom' && i.label?.trim().toLowerCase() === label.toLowerCase());
    if (same) return customToHabit(record, same.id, ref.habitId);
  }
  if (ref.kind === 'health') {
    if (record.healthItems.length >= MAX_HEALTH_ITEMS) throw new ChecklistError(CHECKLIST_LIMIT_MESSAGE);
    const {input} = ref, refPart = ref.input === 'diary' ? {ref: {sourceKind: ref.sourceKind, sourceId: ref.sourceId}} : ref.input === 'meal' ? {ref: {meal: ref.meal}} : {};
    const item: ChecklistHealthItem = {id: options.id, kind: 'health', input, ...refPart, ...(label ? {label} : {}), ...(options.colour ? {colour: options.colour} : {}), section: sectionOrDefault(record, options.section, input === 'sleep' || input === 'meditation' || input === 'fast' ? 'evening' : 'morning'), ...(options.defaultValue !== undefined ? {defaultValue: options.defaultValue} : {}), ...(options.unit ? {unit: options.unit} : {}), addedAt: at};
    return save({...record, healthItems: [...record.healthItems, item], order: withOrder(record, options.id)});
  }
  if (record.items.length >= MAX_PATH_ITEMS) throw new ChecklistError(CHECKLIST_LIMIT_MESSAGE);
  const refPart = ref.kind === 'habit' ? {habitId: ref.habitId} : ref.kind === 'goal' ? {goalId: ref.goalId} : {goalId: ref.goalId, milestoneId: ref.milestoneId};
  const item: ChecklistItem = {id: options.id, kind: ref.kind, ref: refPart, ...(label ? {label} : {}), ...(options.colour ? {colour: options.colour} : {}), section: sectionOrDefault(record, options.section), ...(options.defaultValue !== undefined ? {defaultValue: options.defaultValue} : {}), addedAt: at};
  return save({...record, items: [...record.items, item], order: withOrder(record, options.id)});
}
/** Takes an item off the path (its records stay untouched on their pages). Not on the path: the record unchanged. */
export function removeItem(record: Checklist, id: string): Checklist {
  if (!findItem(record, id)) return record;
  return save({...record, items: record.items.filter(i => i.id !== id), healthItems: record.healthItems.filter(i => i.id !== id), order: record.order.filter(x => x !== id)});
}
export function removeFavourite(record: Checklist, ref: FavouriteRef): Checklist { const found = findFavourite(record, ref); return found ? removeItem(record, found.id) : record; }
/** The star (P7.2): on when it was off, off when it was on. Returns the new record and whether it is now a favourite. */
export function toggleFavourite(record: Checklist, ref: FavouriteRef, options: AddOptions): {record: Checklist; starred: boolean} {
  return isFavourite(record, ref) ? {record: removeFavourite(record, ref), starred: false} : {record: addFavourite(record, ref, options), starred: true};
}

/** A custom item ("Play piano 15 minutes", P7.3): its own words, colour and orbit; ticked on the path only. */
export function addCustom(record: Checklist, input: {label: string; colour?: string; section?: string}, options: {id: string; at: Date}): Checklist {
  const label = input.label.trim();
  if (!label || label.length > MAX_LABEL) throw new ChecklistError(CUSTOM_LABEL_MESSAGE);
  // Session AH (TO5): one planet per name.
  if (record.items.some(i => i.kind === 'custom' && i.label?.trim().toLowerCase() === label.toLowerCase())) throw new ChecklistError(`“${label}” is already on your path.`);
  if (record.items.length >= MAX_PATH_ITEMS) throw new ChecklistError(CHECKLIST_LIMIT_MESSAGE);
  const item: ChecklistItem = {id: options.id, kind: 'custom', label, colour: pathColour(input.colour, 'gold'), section: sectionOrDefault(record, input.section), addedAt: options.at.toISOString()};
  return save({...record, items: [...record.items, item], order: withOrder(record, options.id)});
}
/** "Make this a habit" (P7.3): the custom item becomes a favourite of the habit just created, in the same place on the path. */
export function customToHabit(record: Checklist, id: string, habitId: string): Checklist {
  const item = record.items.find(i => i.id === id && i.kind === 'custom'); if (!item) throw new ChecklistError(ITEM_MISSING_MESSAGE);
  if (isFavourite(record, {kind: 'habit', habitId})) return removeItem(record, id);
  return save({...record, items: record.items.map(i => i.id === id ? {...i, kind: 'habit', ref: {habitId}, colour: undefined} : i)});
}
export type ItemPatch = {label?: string; colour?: string | null; section?: string; defaultValue?: number | null; pathLabel?: string | null};
export function updateItem(record: Checklist, id: string, patch: ItemPatch): Checklist {
  const item = findItem(record, id); if (!item) throw new ChecklistError(ITEM_MISSING_MESSAGE);
  if (patch.label !== undefined && item.kind === 'custom') { const label = patch.label.trim(); if (!label || label.length > MAX_LABEL) throw new ChecklistError(CUSTOM_LABEL_MESSAGE); }
  const apply = <T extends ChecklistItem | ChecklistHealthItem>(i: T): T => {
    if (i.id !== id) return i;
    const next = {...i} as T & {colour?: string; defaultValue?: number};
    if (patch.label !== undefined) next.label = patch.label.trim();
    if (patch.colour === null) delete next.colour; else if (patch.colour !== undefined && isPathColour(patch.colour)) next.colour = patch.colour;
    if (patch.section !== undefined) next.section = sectionOrDefault(record, patch.section);
    if (patch.defaultValue === null) delete next.defaultValue; else if (patch.defaultValue !== undefined && Number.isFinite(patch.defaultValue)) next.defaultValue = patch.defaultValue;
    // (The word on the path: one word, 12 letters; null or empty takes it off, so the suggestion shows again.)
    if (patch.pathLabel !== undefined) { const w = patch.pathLabel === null ? '' : cleanPathLabel(patch.pathLabel); if (w) (next as {pathLabel?: string}).pathLabel = w; else delete (next as {pathLabel?: string}).pathLabel; }
    return next;
  };
  return save({...record, items: record.items.map(apply), healthItems: record.healthItems.map(apply)});
}
/** The stepper remembers the last value logged (P7.12). */
export function rememberValue(record: Checklist, id: string, value: number): Checklist {
  if (!Number.isFinite(value)) return record;
  const item = findItem(record, id); if (!item || item.lastValue === value) return record;
  const apply = <T extends ChecklistItem | ChecklistHealthItem>(i: T): T => i.id === id ? {...i, lastValue: value} : i;
  return save({...record, items: record.items.map(apply), healthItems: record.healthItems.map(apply)});
}

/** The person's order (P7.4): `order` first, then anything missing from it by when it was added. Unknown kinds are kept
 *  in the record but left out here, so they are never drawn. */
export function orderedItems(record: Checklist): (ChecklistItem | ChecklistHealthItem)[] {
  const all = allItems(record).filter(i => isHealthItem(i) ? knownInput(i.input) : knownKind(i.kind)), byId = new Map(all.map(i => [i.id, i]));
  const placed = record.order.flatMap(id => byId.get(id) ?? []), seen = new Set(placed.map(i => i.id));
  return [...placed, ...all.filter(i => !seen.has(i.id)).sort((a, b) => a.addedAt.localeCompare(b.addedAt))];
}
/** Moves an item to a place in the whole path's order (drag), or by one place within its orbit (the keyboard and tap
 *  alternative: Move up / Move down). */
export function moveItem(record: Checklist, id: string, toIndex: number): Checklist {
  const ids = orderedItems(record).map(i => i.id), from = ids.indexOf(id); if (from < 0) throw new ChecklistError(ITEM_MISSING_MESSAGE);
  const to = Math.max(0, Math.min(ids.length - 1, Math.round(toIndex))); if (to === from) return record;
  ids.splice(from, 1); ids.splice(to, 0, id);
  const unknown = record.order.filter(x => !ids.includes(x));
  return save({...record, order: [...ids, ...unknown]});
}
export function moveWithinSection(record: Checklist, id: string, delta: -1 | 1): Checklist {
  const all = orderedItems(record), item = all.find(i => i.id === id); if (!item) throw new ChecklistError(ITEM_MISSING_MESSAGE);
  const section = sectionOrDefault(record, item.section), mates = all.filter(i => sectionOrDefault(record, i.section) === section), at = mates.findIndex(i => i.id === id), swap = mates[at + delta];
  if (!swap) return record;
  return moveItem(record, id, all.findIndex(i => i.id === swap.id));
}

/** Orbits (P7.5): rename, recolour, add, remove (its items move to the last remaining orbit). */
export function updateSection(record: Checklist, id: string, patch: {label?: string; colour?: string}): Checklist {
  const sections = sectionsOf(record); if (!sections.some(s => s.id === id)) throw new ChecklistError(ITEM_MISSING_MESSAGE);
  const label = patch.label?.trim();
  if (label !== undefined && (!label || label.length > MAX_SECTION_LABEL)) throw new ChecklistError(`Give the orbit a name of 1 to ${MAX_SECTION_LABEL} characters.`);
  return save({...record, sections: sections.map(s => s.id === id ? {...s, ...(label ? {label} : {}), ...(patch.colour && isPathColour(patch.colour) ? {colour: patch.colour} : {})} : s)});
}
export function addSection(record: Checklist, input: {label: string; colour?: string}, id: string): Checklist {
  const sections = sectionsOf(record), label = input.label.trim();
  if (sections.length >= MAX_SECTIONS) throw new ChecklistError(CHECKLIST_SECTION_LIMIT_MESSAGE);
  if (!label || label.length > MAX_SECTION_LABEL) throw new ChecklistError(`Give the orbit a name of 1 to ${MAX_SECTION_LABEL} characters.`);
  return save({...record, sections: [...sections, {id, label, colour: pathColour(input.colour, 'teal')}]});
}
export function removeSection(record: Checklist, id: string): Checklist {
  const sections = sectionsOf(record), rest = sections.filter(s => s.id !== id);
  if (rest.length === sections.length) return record;
  if (!rest.length) throw new ChecklistError('A path keeps at least one orbit.');
  const to = rest[rest.length - 1]!.id, move = <T extends ChecklistItem | ChecklistHealthItem>(i: T): T => i.section === id ? {...i, section: to} : i;
  return save({...record, sections: rest, items: record.items.map(move), healthItems: record.healthItems.map(move)});
}
/** The orbit an item is drawn in (an orbit removed by another device falls back to the last one). */
export const sectionOfItem = (record: Checklist, item: ChecklistItem | ChecklistHealthItem) => sectionOrDefault(record, item.section);
/** A new item id. */
export const newChecklistId = () => `ck_${crypto.randomUUID()}`;
