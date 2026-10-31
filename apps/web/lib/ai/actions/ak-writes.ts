import {setAutoRule} from '../../auto-rules/engine';
import {AUTO_RULES, AUTO_RULES_KEY, validAutoRuleSchema, type AutoRules} from '../../auto-rules/schema';
import {addManualBill, setCancelNote} from '../../bills/store';
import {BILLS, BILLS_KEY, BILL_CADENCES, type BillsRecord} from '../../bills/schema';
import {GROCERY_KEY, GROCERY_RECORD, addGroceryItem, type GroceryRecord} from '../../grocery/schema';
import {HABIT_HEALTH_LINKS_KEY} from '../../habit-health-links/schema';
import {getAppStorage} from '../../showcase-storage';
import {registerDeviceWrite, type Entry} from './device-writes';
import {MAX_AK_GROCERY_ITEMS} from './schema-ak';

/**
 * Session AK (Part 12): three of this session's device records join the ones a ZIGi card may change, each through its
 * owner's own functions and with one fixed patch shape, checked again here (a card's patch can never widen what it does):
 * - `zigoals:auto-rules:v1` `{set: rule}`: one rule, validated by the rules' own schema, added or replacing the rule of
 *   that id (the one rule per source the card named); a Health-source rule on a habit with a Health link is refused;
 * - `zigoals:bills:v1` `{add: bill}` (a hand-written bill, the bills' own checks) or `{note: {billId, note, cancelBy}}`;
 * - `zigoals:grocery:v1` `{add: {weekStart, names, at}}`: items added to that week's list (duplicates kept once).
 * Removing any of them happens where it is listed (the habit's rules, Wealth → Bills, the grocery list). Registered by the
 * planner chunk (plan-ak.ts) before any of these cards can exist.
 */
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const NOT_A_CARD = 'That change is not one a card can make.';
const day = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const stamp = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v));
/** The habits that already tick themselves off from Health on this device (an AH link), read when the card is added. */
export function healthLinkedHabitIds(read: () => string | null = () => getAppStorage().getItem(HABIT_HEALTH_LINKS_KEY)): Set<string> {
  try { const raw = read(); const links = raw ? (JSON.parse(raw) as {links?: unknown}).links : null; return new Set(object(links) ? Object.keys(links) : []); } catch { return new Set(); }
}
export const autoRulesEntry: Entry<AutoRules> = {spec: AUTO_RULES, apply: (record, patch) => {
  if (!object(patch) || Object.keys(patch).length !== 1 || !object(patch.set)) throw new Error(NOT_A_CARD);
  const rule = validAutoRuleSchema.safeParse(patch.set);
  if (!rule.success) throw new Error('This rule cannot be set as proposed; set it in the habit itself.');
  return setAutoRule(record, rule.data, {healthLinkedHabitIds: healthLinkedHabitIds()});
}};
export const billsEntry: Entry<BillsRecord> = {spec: BILLS, apply: (record, patch) => {
  if (!object(patch) || Object.keys(patch).length !== 1) throw new Error(NOT_A_CARD);
  if (object(patch.add)) {
    const a = patch.add;
    if (typeof a.id !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(a.id) || !stamp(a.createdAt) || typeof a.title !== 'string' || typeof a.amount !== 'string' || typeof a.currency !== 'string'
      || !(BILL_CADENCES as readonly unknown[]).includes(a.cadence) || !day(a.nextDue) || (a.category !== undefined && typeof a.category !== 'string')) throw new Error(NOT_A_CARD);
    let next = addManualBill(record, {title: a.title, amount: a.amount, currency: a.currency, cadence: a.cadence as (typeof BILL_CADENCES)[number], nextDue: a.nextDue, ...(a.category ? {category: a.category.slice(0, 40)} : {})}, a.id, new Date(a.createdAt));
    if (typeof a.note === 'string' && a.note.trim()) next = setCancelNote(next, a.id, a.note, day(a.cancelBy) ? a.cancelBy : undefined);
    return next;
  }
  if (object(patch.note)) {
    const n = patch.note;
    if (typeof n.billId !== 'string' || typeof n.note !== 'string' || (n.cancelBy !== undefined && !day(n.cancelBy))) throw new Error(NOT_A_CARD);
    if (!record.bills.some(b => b.id === n.billId)) throw new Error('That bill is no longer on this device.');
    return setCancelNote(record, n.billId, n.note, n.cancelBy as string | undefined);
  }
  throw new Error(NOT_A_CARD);
}};
export const groceryEntry: Entry<GroceryRecord> = {spec: GROCERY_RECORD, apply: (record, patch) => {
  if (!object(patch) || Object.keys(patch).length !== 1 || !object(patch.add)) throw new Error(NOT_A_CARD);
  const {weekStart, names, at} = patch.add;
  if (!day(weekStart) || !stamp(at) || !Array.isArray(names) || !names.length || names.length > MAX_AK_GROCERY_ITEMS || !names.every(n => typeof n === 'string' && n.trim().length > 0 && n.length <= 120)) throw new Error(NOT_A_CARD);
  return (names as string[]).reduce((r, name) => addGroceryItem(r, weekStart, name, at), record);
}};
registerDeviceWrite(AUTO_RULES_KEY, autoRulesEntry);
registerDeviceWrite(BILLS_KEY, billsEntry);
registerDeviceWrite(GROCERY_KEY, groceryEntry);
