import {csvSafeCell} from '../export/csv-safe';
import {addLocalDays} from '../local-date';
import type {HealthData} from '../health';
import type {groceryList} from '../health-daily';
import {groceryName, tickKey, type GroceryRecord} from './schema';

/**
 * Session AK (task 4.6): the week's grocery list as the person shops it, over Health's own `groceryList` rows (planned
 * ingredients and their corrections): rows with the same name and the same kind of measure become one item and their
 * amounts add up (grams with grams, millilitres with millilitres, pieces with pieces; a mass and a volume never mix, no
 * density is guessed), shown in g/kg, ml/l or pieces. Ticks come from the device record by item key, so they survive a
 * rebuilt plan; an older tick saved in Health's corrections still counts until the person changes it. Pantry items leave
 * the list. Added items (by hand or from "often logged") join it. Exports: plain text, CSV (every cell through
 * csvSafeCell) and a print page (escaped HTML, no script).
 */
export type GroceryRow = ReturnType<typeof groceryList>[number];
export type MeasureKind = 'mass' | 'volume' | 'pieces' | 'unknown';
export type GroceryItem = {key: string; name: string; kind: MeasureKind; amount: number | null; checked: boolean; planIds: string[]; rowKeys: string[]; added: boolean};
const measureOf = (row: GroceryRow): {kind: MeasureKind; amount: number | null} => {
  if (row.manual) return {kind: row.manual.unit === 'g' ? 'mass' : row.manual.unit === 'ml' ? 'volume' : 'pieces', amount: row.manual.quantityMilli / 1000};
  if (row.grams !== null) return {kind: 'mass', amount: row.grams};
  if (row.millilitres !== null) return {kind: 'volume', amount: row.millilitres};
  return {kind: 'unknown', amount: null};
};
export function groceryItems(rows: readonly GroceryRow[], record: GroceryRecord, weekStart: string): {items: GroceryItem[]; pantry: GroceryItem[]} {
  const byKey = new Map<string, GroceryItem & {legacy: boolean[]}>();
  for (const row of rows) {
    const m = measureOf(row), name = groceryName(row.name) || row.key, key = `${name}|${m.kind}`;
    const old = byKey.get(key);
    if (!old) { byKey.set(key, {key, name: row.name, kind: m.kind, amount: m.amount, checked: false, planIds: [...row.planIds], rowKeys: [row.key], added: false, legacy: [row.checked]}); continue; }
    old.amount = old.amount === null || m.amount === null ? null : old.amount + m.amount;
    old.planIds = [...new Set([...old.planIds, ...row.planIds])].sort(); old.rowKeys.push(row.key); old.legacy.push(row.checked);
  }
  for (const a of record.added?.[weekStart] ?? []) if (!byKey.has(a.key)) byKey.set(a.key, {key: a.key, name: a.name, kind: 'unknown', amount: null, checked: false, planIds: [], rowKeys: [], added: true, legacy: [false]});
  const items: GroceryItem[] = [], pantry: GroceryItem[] = [];
  for (const {legacy, ...item} of byKey.values()) {
    const tick = record.ticks?.[tickKey(weekStart, item.key)];
    const done = {...item, checked: tick ? tick.on : legacy.length > 0 && legacy.every(Boolean)};
    (record.pantry?.[groceryName(item.name)] ? pantry : items).push(done);
  }
  const order = (a: GroceryItem, b: GroceryItem) => a.name.localeCompare(b.name) || a.key.localeCompare(b.key);
  return {items: items.sort(order), pantry: pantry.sort(order)};
}
const round = (n: number, places: number) => { const f = 10 ** places; return Math.round(n * f) / f; };
/** The amount in the unit a shopper reads: g below 1 kg, kg from there (two decimals); ml and l the same; whole pieces. */
export function normalisedQuantity(kind: MeasureKind, amount: number | null): {value: number; unit: 'g' | 'kg' | 'ml' | 'l' | 'pieces'} | null {
  if (amount === null || kind === 'unknown') return null;
  if (kind === 'pieces') return {value: round(amount, 2), unit: 'pieces'};
  const big = amount >= 1000;
  return kind === 'mass' ? (big ? {value: round(amount / 1000, 2), unit: 'kg'} : {value: Math.round(amount), unit: 'g'}) : (big ? {value: round(amount / 1000, 2), unit: 'l'} : {value: Math.round(amount), unit: 'ml'});
}
export function quantityText(item: Pick<GroceryItem, 'kind' | 'amount'>): string {
  const q = normalisedQuantity(item.kind, item.amount);
  if (!q) return 'quantity unknown';
  return q.unit === 'pieces' ? `${q.value} ${q.value === 1 ? 'piece' : 'pieces'}` : `${q.value} ${q.unit}`;
}
/** Foods logged at least `min` times in the last 28 days that are not on the list, in the pantry or added: the most often first. */
export function frequentItems(data: Pick<HealthData, 'diary'>, today: string, onList: readonly string[], record: GroceryRecord, min = 3, limit = 8): {name: string; count: number}[] {
  const first = addLocalDays(today, -27), skip = new Set([...onList.map(groceryName), ...Object.keys(record.pantry ?? {})]);
  const counts = new Map<string, {name: string; count: number}>();
  for (const e of data.diary) {
    if (e.date < first || e.date > today) continue;
    const key = groceryName(e.snapshot.name); if (!key || skip.has(key)) continue;
    const c = counts.get(key) ?? {name: e.snapshot.name, count: 0}; c.count++; counts.set(key, c);
  }
  return [...counts.values()].filter(c => c.count >= min).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, limit);
}
export type GroceryGroup = {aisle: string; items: GroceryItem[]};
export function groceryText(title: string, groups: readonly GroceryGroup[]): string {
  const lines = [title, ''];
  for (const g of groups) { lines.push(g.aisle); for (const i of g.items) lines.push(`${i.checked ? '[x]' : '[ ]'} ${i.name}${i.kind === 'unknown' ? '' : ` — ${quantityText(i)}`}`); lines.push(''); }
  return lines.join('\n').trimEnd() + '\n';
}
export function groceryCsv(groups: readonly GroceryGroup[]): string {
  const rows: (string | number)[][] = [['aisle', 'item', 'quantity', 'unit', 'bought']];
  for (const g of groups) for (const i of g.items) { const q = normalisedQuantity(i.kind, i.amount); rows.push([g.aisle, i.name, q?.value ?? '', q?.unit ?? 'unknown', i.checked ? 'yes' : 'no']); }
  return rows.map(r => r.map(c => csvSafeCell(c)).join(',')).join('\r\n');
}
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]!);
/** A plain page to print: escaped text, one inline style, no script, no images. */
export function groceryPrintHtml(title: string, groups: readonly GroceryGroup[]): string {
  const body = groups.map(g => `<h2>${escapeHtml(g.aisle)}</h2><ul>${g.items.map(i => `<li>${i.checked ? '☑' : '☐'} ${escapeHtml(i.name)}${i.kind === 'unknown' ? '' : ` <small>${escapeHtml(quantityText(i))}</small>`}</li>`).join('')}</ul>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title><style>body{font:16px/1.5 system-ui,sans-serif;color:#111;background:#fff;margin:24px;max-width:40rem}h1{font-size:22px}h2{font-size:15px;text-transform:uppercase;letter-spacing:.06em;margin:18px 0 6px}ul{list-style:none;padding:0;margin:0}li{padding:4px 0;border-bottom:1px solid #ddd}small{color:#444}</style></head><body><h1>${escapeHtml(title)}</h1>${body || '<p>Nothing on the list.</p>'}<p><small>From ZIGoals, made on this device. Use your browser’s Print to print it.</small></p></body></html>`;
}
