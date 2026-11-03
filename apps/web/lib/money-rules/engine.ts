import {addLocalDays} from '../local-date';
import {EXPENSE_CATEGORIES, INCOME_CATEGORIES, amountText, type MoneyEntry, type MoneyLog} from '../money-log/schema';
import {minorUnits} from '../money-split/parts';
import {MAX_RULES, MAX_RULE_TEXT, moneyRulesSchema, tagText, type MoneyRule, type MoneyRules} from './schema';

/**
 * Session AK (lane M, item 1): the rules, pure. Matching is plain text, lower-cased with spaces folded — `includes`,
 * `===` and `startsWith` only, so a rule's text is never a pattern (nothing to inject). Amounts compare in exact minor
 * units. The first enabled rule that matches wins; an entry it would not change is not a change.
 */
export type RuleSubject = {payee: string; memo: string; whole: string; kind: 'expense' | 'income'; cents: number};
export const fold = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim();
const SEP = ' · ';
/** The note as payee and memo: a bank row's note is "payee · description" (lib/bankfiles noteOf); a typed one is all payee. */
export function subjectOf(entry: Pick<MoneyEntry, 'note' | 'kind' | 'amount'>): RuleSubject {
  const whole = entry.note ?? '', at = whole.indexOf(SEP);
  return {payee: at < 0 ? whole : whole.slice(0, at), memo: at < 0 ? '' : whole.slice(at + SEP.length), whole, kind: entry.kind, cents: minorUnits(entry.amount)};
}
export function ruleMatches(rule: MoneyRule, s: RuleSubject): boolean {
  if (rule.enabled === false) return false;
  if (rule.direction === 'out' && s.kind !== 'expense' || rule.direction === 'in' && s.kind !== 'income') return false;
  if (rule.min && s.cents < minorUnits(rule.min) || rule.max && s.cents > minorUnits(rule.max)) return false;
  const needle = fold(rule.text);
  if (!needle) return false;
  const hay = (rule.field === 'payee' ? [s.payee] : rule.field === 'memo' ? [s.memo] : [s.whole, s.payee, s.memo]).map(fold);
  return hay.some(h => rule.op === 'equals' ? h === needle : rule.op === 'starts-with' ? h.startsWith(needle) : h.includes(needle));
}
export const firstMatch = (rules: readonly MoneyRule[], s: RuleSubject): MoneyRule | undefined => rules.find(r => ruleMatches(r, s));
/** The entry as the rule leaves it (the same object when nothing would change). */
export function applyRule(entry: MoneyEntry, rule: MoneyRule): MoneyEntry {
  let next: MoneyEntry = entry;
  if (rule.category && rule.category !== entry.category) next = {...next, category: rule.category};
  let note = next.note ?? '';
  if (rule.renameTo) { const s = subjectOf(next); note = s.memo ? `${rule.renameTo}${SEP}${s.memo}` : rule.renameTo; }
  if (rule.tag && !` ${note} `.includes(` #${rule.tag} `)) { const tag = `#${rule.tag}`; note = note ? `${note.slice(0, 200 - tag.length - 1).trimEnd()} ${tag}` : tag; }
  note = note.slice(0, 200).trim();
  if (note !== (next.note ?? '')) next = note ? {...next, note} : (({note: _n, ...rest}) => { void _n; return rest; })(next);
  // A Goal links the whole entry (one part); an entry already split keeps its own parts.
  if (rule.goalId && !(entry.parts && entry.parts.length >= 2) && !(entry.parts?.length === 1 && entry.parts[0]!.goalId === rule.goalId && entry.parts[0]!.amount === entry.amount)) next = {...next, parts: [{amount: entry.amount, goalId: rule.goalId}]};
  return next;
}
export type RuleChange = {id: string; ruleId: string; before: MoneyEntry; after: MoneyEntry};
/** Every entry through the rules, in order, first match wins. Pure: the entries are new objects only where they change. */
export function applyRules(entries: readonly MoneyEntry[], rules: readonly MoneyRule[]): {entries: MoneyEntry[]; changes: RuleChange[]} {
  const changes: RuleChange[] = [];
  const out = entries.map(e => {
    const rule = firstMatch(rules, subjectOf(e));
    if (!rule) return e;
    const after = applyRule(e, rule);
    if (after !== e) changes.push({id: e.id, ruleId: rule.id, before: e, after});
    return after;
  });
  return {entries: out, changes};
}
/** "Apply to the past 90 days": what the rules would change among the entries dated in the last `days` days up to today. */
export function previewPast(log: Pick<MoneyLog, 'entries'>, rules: readonly MoneyRule[], today: string, days = 90): RuleChange[] {
  const from = addLocalDays(today, -(days - 1));
  return applyRules(log.entries.filter(e => e.date >= from && e.date <= today), rules).changes;
}
const same = (a: MoneyEntry, b: MoneyEntry) => JSON.stringify(a) === JSON.stringify(b);
/** Applies the previewed changes to entries that are still exactly as previewed; the others are left as they are now. */
export function applyChanges(log: MoneyLog, changes: readonly RuleChange[]): {log: MoneyLog; applied: RuleChange[]} {
  const by = new Map(changes.map(c => [c.id, c])), applied: RuleChange[] = [];
  const entries = log.entries.map(e => { const c = by.get(e.id); if (!c || !same(e, c.before)) return e; applied.push(c); return c.after; });
  return {log: {...log, entries}, applied};
}
/** Undo: each changed entry back as it was, if nobody changed it since; returns how many came back. */
export function undoChanges(log: MoneyLog, changes: readonly RuleChange[]): {log: MoneyLog; restored: number} {
  const by = new Map(changes.map(c => [c.id, c]));
  let restored = 0;
  const entries = log.entries.map(e => { const c = by.get(e.id); if (!c || !same(e, c.after)) return e; restored++; return c.before; });
  return {log: {...log, entries}, restored};
}

export type RuleDraft = {field: MoneyRule['field']; op: MoneyRule['op']; text: string; direction: MoneyRule['direction']; min?: string; max?: string; category?: string; renameTo?: string; tag?: string; goalId?: string; enabled?: boolean};
/** Why a rule cannot be saved, in plain words, or null. */
export function ruleIssue(d: RuleDraft): string | null {
  if (!d.text.trim()) return 'Enter the text to look for.';
  if (d.text.trim().length > MAX_RULE_TEXT) return `The text to look for has at most ${MAX_RULE_TEXT} characters.`;
  if (d.min && !amountText.safeParse(d.min).success || d.max && !amountText.safeParse(d.max).success) return 'Enter amounts above zero, with at most two decimals.';
  if (d.min && d.max && minorUnits(d.min) > minorUnits(d.max)) return 'The lowest amount is above the highest.';
  if (!d.category && !d.renameTo?.trim() && !d.tag && !d.goalId) return 'Choose what the rule does: a category, a new name, a tag or a Goal.';
  if (d.renameTo && d.renameTo.trim().length > 80) return 'A new name has at most 80 characters.';
  if (d.tag && !tagText.safeParse(d.tag).success) return 'A tag is up to 24 small letters, digits or dashes, such as "holiday".';
  return null;
}
const clean = (d: RuleDraft) => ({field: d.field, op: d.op, text: d.text.trim(), direction: d.direction,
  ...(d.min ? {min: d.min} : {}), ...(d.max ? {max: d.max} : {}), ...(d.category ? {category: d.category} : {}),
  ...(d.renameTo?.trim() ? {renameTo: d.renameTo.trim()} : {}), ...(d.tag ? {tag: d.tag} : {}), ...(d.goalId ? {goalId: d.goalId} : {}), enabled: d.enabled ?? true});
/** Adds a rule at the end (lowest priority), or replaces the one with `id`. Throws with the reason. */
export function saveRule(record: MoneyRules, draft: RuleDraft, id: string, now: Date, replace = false): MoneyRules {
  const issue = ruleIssue(draft); if (issue) throw Error(issue);
  if (replace) {
    if (!record.rules.some(r => r.id === id)) throw Error('This rule is no longer here.');
    return moneyRulesSchema.parse({...record, rules: record.rules.map(r => r.id === id ? {...r, ...clean(draft), id} : r)});
  }
  if (record.rules.length >= MAX_RULES) throw Error(`Up to ${MAX_RULES} rules. Remove one to add another.`);
  return moneyRulesSchema.parse({...record, rules: [...record.rules, {id, ...clean(draft), createdAt: now.toISOString()}]});
}
export const removeRule = (record: MoneyRules, id: string): MoneyRules => ({...record, rules: record.rules.filter(r => r.id !== id)});
/** Moves a rule one place up (earlier: wins first) or down. */
export function moveRule(record: MoneyRules, id: string, by: -1 | 1): MoneyRules {
  const i = record.rules.findIndex(r => r.id === id), j = i + by;
  if (i < 0 || j < 0 || j >= record.rules.length) return record;
  const rules = [...record.rules]; [rules[i], rules[j]] = [rules[j]!, rules[i]!];
  return {...record, rules};
}
/** "Make a rule" from an entry: its payee, its direction and its (perhaps just corrected) category, ready to check. */
export function ruleFromEntry(entry: MoneyEntry): RuleDraft {
  const s = subjectOf(entry), text = (s.payee || entry.category).trim().slice(0, MAX_RULE_TEXT);
  return {field: 'payee', op: 'contains', text, direction: entry.kind === 'expense' ? 'out' : 'in', category: entry.category};
}
/** The categories offered for a direction (both lists when a rule matches either). */
export const categoriesFor = (direction: MoneyRule['direction']): readonly string[] => direction === 'out' ? EXPENSE_CATEGORIES : direction === 'in' ? INCOME_CATEGORIES : [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
/** One rule in words: "Payee contains "albert heijn", money out, 10.00 to 50.00 → Groceries, renamed "AH"". */
export function describeRule(r: MoneyRule, goalName?: (id: string) => string | undefined): {when: string; then: string} {
  const where = r.field === 'payee' ? 'Payee' : r.field === 'memo' ? 'Memo' : 'Payee or memo', how = r.op === 'equals' ? 'is' : r.op === 'starts-with' ? 'starts with' : 'contains';
  const range = r.min && r.max ? `, ${r.min} to ${r.max}` : r.min ? `, ${r.min} or more` : r.max ? `, up to ${r.max}` : '';
  const dir = r.direction === 'out' ? ', money out' : r.direction === 'in' ? ', money in' : '';
  const then = [r.category && `category ${r.category}`, r.renameTo && `renamed “${r.renameTo}”`, r.tag && `tag #${r.tag}`, r.goalId && `Goal ${goalName?.(r.goalId) ?? r.goalId}`].filter(Boolean).join(', ');
  return {when: `${where} ${how} “${r.text}”${dir}${range}`, then};
}
