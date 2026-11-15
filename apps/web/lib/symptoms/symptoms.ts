import {addLocalDays} from '../local-date';
import {MAX_SYMPTOM_DAYS, MAX_SYMPTOM_ITEMS, MAX_SYMPTOM_NAME, severitySchema, symptomsSchema, type SymptomItem, type Symptoms} from './schema';

/**
 * Session AP (feature 2): the symptom and factor tracker's writes and its plain counts. Pure. A level is the person's own
 * answer for one day; nothing is filled in for a day without one.
 */
const cleanName = (raw: string) => raw.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
/** An id from the name, unique in the record ("Stiff back" → "stiff-back", then "stiff-back-2"). */
function idFor(record: Symptoms, name: string): string {
  const base = name.toLocaleLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 34) || 'item';
  const taken = new Set(record.items.map(i => i.id));
  let id = base, n = 2;
  while (taken.has(id)) id = `${base}-${n++}`;
  return id;
}
/** Adds an item to follow; refused when the name is empty, too long or already kept, or when 40 are kept. */
export function addItem(record: Symptoms, rawName: string, kind: SymptomItem['kind'], at: string): Symptoms {
  const name = cleanName(rawName);
  if (!name) throw Error('Give it a name, such as “headache” or “pollen”.');
  if (name.length > MAX_SYMPTOM_NAME) throw Error(`A name is up to ${MAX_SYMPTOM_NAME} characters.`);
  if (record.items.some(i => i.name.toLocaleLowerCase() === name.toLocaleLowerCase())) throw Error(`“${name}” is already in your list.`);
  if (record.items.length >= MAX_SYMPTOM_ITEMS) throw Error(`You can follow up to ${MAX_SYMPTOM_ITEMS} things. Remove one first.`);
  return symptomsSchema.parse({...record, items: [...record.items, {id: idFor(record, name), name, kind, createdAt: at}]});
}
/** Removes an item and every level it had. */
export function removeItem(record: Symptoms, id: string): Symptoms {
  if (!record.items.some(i => i.id === id)) return record;
  const days: Symptoms['days'] = {};
  for (const [day, levels] of Object.entries(record.days)) { const {[id]: _gone, ...rest} = levels; void _gone; if (Object.keys(rest).length) days[day] = rest; }
  return symptomsSchema.parse({...record, items: record.items.filter(i => i.id !== id), days});
}
/** Sets a day's level for one item (0 = none, a real answer), or clears it (null = no answer). The oldest days drop past the cap. */
export function setLevel(record: Symptoms, day: string, id: string, level: number | null): Symptoms {
  if (!record.items.some(i => i.id === id)) throw Error('This item is no longer in your list.');
  const levels = {...record.days[day]};
  if (level === null) delete levels[id]; else levels[id] = severitySchema.parse(level);
  const days = {...record.days};
  if (Object.keys(levels).length) days[day] = levels; else delete days[day];
  const keys = Object.keys(days).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_SYMPTOM_DAYS))) delete days[k];
  return symptomsSchema.parse({...record, days});
}
export const levelOn = (record: Symptoms, day: string, id: string): number | undefined => record.days[day]?.[id];

export type ItemCounts = {id: string; name: string; answered: number; noted: number; strong: number};
/** Over the last `days` days: on how many the person answered, on how many the item was there (1–3), and strong (3). */
export function itemCounts(record: Symptoms, today: string, days = 30): ItemCounts[] {
  const start = addLocalDays(today, 1 - days);
  return record.items.map(item => {
    let answered = 0, noted = 0, strong = 0;
    for (const [day, levels] of Object.entries(record.days)) {
      if (day < start || day > today) continue;
      const v = levels[item.id]; if (v === undefined) continue;
      answered++; if (v >= 1) noted++; if (v === 3) strong++;
    }
    return {id: item.id, name: item.name, answered, noted, strong};
  });
}
/** The items with the most answered days (for the cross-pillar pairings): at most `max`, each with at least one answer. */
export function mostAnswered(record: Symptoms, today: string, window: number, max: number): SymptomItem[] {
  const counts = new Map(itemCounts(record, today, window).map(c => [c.id, c.answered]));
  return record.items.filter(i => (counts.get(i.id) ?? 0) > 0).sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) || a.name.localeCompare(b.name)).slice(0, max);
}
