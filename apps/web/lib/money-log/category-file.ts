import * as z from 'zod';
import {addSub, subsOf} from '../money-more/quick';
import {MAX_RULES, MAX_RULE_TEXT, RULE_DIRECTIONS, RULE_FIELDS, RULE_OPS, tagText, type MoneyRule, type MoneyRules} from '../money-rules/schema';
import {addOwnCategory, allCategories} from './counted';
import {amountText, MAX_OWN_CATEGORIES, MAX_SUBS, type MoneyEntry, type MoneyLog} from './schema';
import {removeStarterAdds, type StarterAdded} from './starter-sets';

/**
 * Session AV lane 2, round 5 (money; PocketSmith's category backup and restore, LEDGER #390): "Save categories and rules"
 * as one small file, and "Read categories and rules" from one — from another device or from a friend. The file holds the
 * person's own categories, the subcategories and the rules (their match words and what they set) — never an entry, an
 * amount spent, a Goal link or an id. Reading it is data only: nothing in a file runs; it is read under caps (256 KB,
 * the money log's own limits: 30 own categories of a kind, 20 subcategories each, 200 rules) and every field through the
 * same rules as the records. A plan says what is new and what is already there; only what is new is added (nothing is
 * removed or changed), through the money log's own `addOwnCategory` and `addSub`, and Undo takes out exactly what was
 * added. Pure.
 */
export const CATEGORY_FILE_KIND = 'zigoals-categories-and-rules', CATEGORY_FILE_MAX_BYTES = 256 * 1024;
const name = z.string().trim().min(1).max(40);
const fileRule = z.object({
  field: z.enum(RULE_FIELDS).catch('either'), op: z.enum(RULE_OPS).catch('contains'), text: z.string().trim().min(1).max(MAX_RULE_TEXT), direction: z.enum(RULE_DIRECTIONS).catch('any'),
  min: amountText.optional().catch(undefined), max: amountText.optional().catch(undefined), category: name.optional().catch(undefined),
  renameTo: z.string().trim().min(1).max(80).optional().catch(undefined), tag: tagText.optional().catch(undefined), enabled: z.boolean().catch(true),
});
export type FileRule = z.infer<typeof fileRule>;
// Review b5k #5: the file's shape is read loosely, then each list is checked against its limit (refused in words when over)
// and each item on its own (an item this build cannot read is left out and counted), so no list is ever emptied silently.
const fileSchema = z.object({
  kind: z.literal(CATEGORY_FILE_KIND), version: z.literal(1),
  categories: z.object({expense: z.array(z.unknown()).optional(), income: z.array(z.unknown()).optional()}).optional(),
  subs: z.record(z.string(), z.array(z.unknown())).optional(),
  rules: z.array(z.unknown()).optional(),
});
export type CategoryFile = {categories: {expense: string[]; income: string[]}; subs: Record<string, string[]>; rules: FileRule[]; dropped: number};
/** The file's text: the person's own categories, the subcategories and the rules (no ids, no Goal links), pretty JSON. */
export function categoryFile(log: Pick<MoneyLog, 'own' | 'subs'>, rules: MoneyRules | null | undefined, savedAt: string): string {
  const out = {kind: CATEGORY_FILE_KIND, version: 1, saved: savedAt,
    categories: {expense: [...(log.own?.expense ?? [])], income: [...(log.own?.income ?? [])]}, subs: {...(log.subs ?? {})},
    rules: (rules?.rules ?? []).map(r => ({field: r.field, op: r.op, text: r.text, direction: r.direction, ...(r.min ? {min: r.min} : {}), ...(r.max ? {max: r.max} : {}), ...(r.category ? {category: r.category} : {}), ...(r.renameTo ? {renameTo: r.renameTo} : {}), ...(r.tag ? {tag: r.tag} : {}), enabled: r.enabled}))};
  return `${JSON.stringify(out, null, 2)}\n`;
}
/** Reads a file's text as data only: a list over its limit is refused in words; an item this build cannot read is left out and counted. */
export function readCategoryFile(text: string): {ok: true; file: CategoryFile} | {ok: false; problem: string} {
  if (new TextEncoder().encode(text).length > CATEGORY_FILE_MAX_BYTES) return {ok: false, problem: 'That file is larger than a categories and rules file can be (256 KB). Nothing was read.'};
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return {ok: false, problem: 'That is not a categories and rules file from ZIGoals. Nothing was read.'}; }
  const parsed = fileSchema.safeParse(raw);
  if (!parsed.success) return {ok: false, problem: 'That is not a categories and rules file from ZIGoals. Nothing was read.'};
  const {categories = {}, subs = {}, rules: rawRules = []} = parsed.data;
  const over = (what: string, count: number, limit: number) => ({ok: false as const, problem: `That file holds ${count} ${what}; ZIGoals keeps up to ${limit}. Nothing was read.`});
  for (const kind of ['expense', 'income'] as const) { const n = categories[kind]?.length ?? 0; if (n > MAX_OWN_CATEGORIES) return over(`of your own categories for ${kind === 'expense' ? 'spending' : 'money received'}`, n, MAX_OWN_CATEGORIES); }
  if (Object.keys(subs).length > 40) return over('categories with subcategories', Object.keys(subs).length, 40);
  for (const [category, list] of Object.entries(subs)) if (list.length > MAX_SUBS) return over(`subcategories under ${category.slice(0, 40)}`, list.length, MAX_SUBS);
  if (rawRules.length > MAX_RULES) return over('rules', rawRules.length, MAX_RULES);
  let dropped = 0;
  const names = (list: readonly unknown[] = []) => list.flatMap(x => { const one = name.safeParse(x); if (one.success) return [one.data]; dropped++; return []; });
  const outSubs: Record<string, string[]> = {};
  for (const [category, list] of Object.entries(subs)) { const key = name.safeParse(category); if (!key.success) { dropped += list.length; continue; } const kept = names(list); if (kept.length) outSubs[key.data] = kept; }
  const rules: FileRule[] = [];
  for (const r of rawRules) { const one = fileRule.safeParse(r); if (one.success) rules.push(one.data); else dropped++; }
  return {ok: true, file: {categories: {expense: names(categories.expense), income: names(categories.income)}, subs: outSubs, rules, dropped}};
}
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const ruleKey = (r: Pick<MoneyRule, 'field' | 'op' | 'text' | 'direction' | 'min' | 'max' | 'category' | 'renameTo' | 'tag'>) => JSON.stringify([r.field, r.op, r.text.toLowerCase(), r.direction, r.min ?? '', r.max ?? '', (r.category ?? '').toLowerCase(), r.renameTo ?? '', r.tag ?? '']);
export type CategoryPlan = {own: {kind: MoneyEntry['kind']; name: string; isNew: boolean}[]; subs: {category: string; name: string; isNew: boolean}[]; rules: {rule: FileRule; isNew: boolean}[]; fresh: number};
/** What reading the file would add: each category, subcategory and rule, new or already there. */
export function planCategoryFile(log: MoneyLog, rules: MoneyRules | null | undefined, file: CategoryFile): CategoryPlan {
  const own = (['expense', 'income'] as const).flatMap(kind => file.categories[kind].map(n => ({kind, name: n, isNew: !allCategories(log, kind).some(c => same(c, n))})));
  const subs = Object.entries(file.subs).flatMap(([category, list]) => list.map(n => ({category, name: n, isNew: !subsOf(log, category).some(s => same(s, n)) && !same(n, category)})));
  const have = new Set((rules?.rules ?? []).map(ruleKey)), seen = new Set<string>();
  const ruleRows = file.rules.map(rule => { const k = ruleKey(rule), isNew = !have.has(k) && !seen.has(k); seen.add(k); return {rule, isNew}; });
  return {own, subs, rules: ruleRows, fresh: own.filter(x => x.isNew).length + subs.filter(x => x.isNew).length + ruleRows.filter(x => x.isNew).length};
}
export type CategoryAdded = StarterAdded & {ruleIds: string[]};
/** Adds what is new: own categories, then subcategories, then rules (after the person's own, at the end). Past a limit it is counted in `full`. */
export function applyCategoryFile(log: MoneyLog, rules: MoneyRules, file: CategoryFile, newId: () => string, at: string): {log: MoneyLog; rules: MoneyRules; added: CategoryAdded; full: number} {
  const plan = planCategoryFile(log, rules, file), added: CategoryAdded = {own: [], subs: [], ruleIds: []};
  let next = log, full = 0;
  for (const c of plan.own) if (c.isNew) { try { next = addOwnCategory(next, c.kind, c.name); added.own.push({kind: c.kind, name: c.name}); } catch { full++; } }
  for (const s of plan.subs) if (s.isNew) {
    const parent = [...allCategories(next, 'expense'), ...allCategories(next, 'income')].find(c => same(c, s.category)) ?? s.category;
    try { next = addSub(next, parent, s.name); added.subs.push({category: parent, name: s.name}); } catch { full++; }
  }
  const list = [...rules.rules];
  for (const r of plan.rules) if (r.isNew) {
    if (list.length >= MAX_RULES) { full++; continue; }
    const id = newId();
    list.push({id, field: r.rule.field, op: r.rule.op, text: r.rule.text, direction: r.rule.direction, ...(r.rule.min ? {min: r.rule.min} : {}), ...(r.rule.max ? {max: r.rule.max} : {}), ...(r.rule.category ? {category: r.rule.category} : {}), ...(r.rule.renameTo ? {renameTo: r.rule.renameTo} : {}), ...(r.rule.tag ? {tag: r.rule.tag} : {}), enabled: r.rule.enabled, createdAt: at});
    added.ruleIds.push(id);
  }
  return {log: next, rules: {...rules, rules: list}, added, full};
}
/** Undo: takes out exactly what the file added (a name or rule changed since stays as it is now). */
export const undoCategoryLog = (log: MoneyLog, added: CategoryAdded) => removeStarterAdds(log, added);
export const undoCategoryRules = (rules: MoneyRules, added: CategoryAdded): MoneyRules => ({...rules, rules: rules.rules.filter(r => !added.ruleIds.includes(r.id))});
export const categoryFileName = (day: string) => `zigoals-categories-and-rules-${day}.json`;
