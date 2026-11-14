import {amountIssue, dateIssue} from '../limits/plausibility';
import {amountProblem, resolveAmountText} from '../money-calc/expression';
import {parseNumberInput} from '../numbers/parse';
import {amountText, type MoneyEntry, type MoneyLog} from './schema';

/**
 * PR-052: the money log's one form check, for a new entry and for an edit (moved out of spending-section.tsx unchanged).
 * The amount may be a sum ("12.50 + 3"); it is saved as two decimals. The same words for the same mistake either way.
 */
export const AMOUNT_HINT = 'Enter an amount above zero, with at most two decimals (for example 12.50).';
/** The typed amount as saved ("12.50"), or null when it cannot be saved. */
export function readMoneyAmount(raw: string): string | null {
  const resolved = resolveAmountText(raw);
  if (resolved === null) return null;
  const r = parseNumberInput(resolved), v = r.ok ? r.text : resolved.trim(); /* Session AL (PRIMITIVES 3f) */
  return amountText.safeParse(v).success ? Number(v).toFixed(2) : null;
}
export type MoneyFormCheck = {ok: true; amount: string} | {ok: false; problem: string};
/** Checks the form's amount and date (the day from 1990 to today). */
export function checkMoneyForm({amount, date, today}: {amount: string; date: string; today: string}): MoneyFormCheck {
  const value = readMoneyAmount(amount);
  if (!value) return {ok: false, problem: amountProblem(amount) ?? AMOUNT_HINT};
  const issue = amountIssue(Number(value)) ?? dateIssue(date, today);
  return issue ? {ok: false, problem: issue} : {ok: true, amount: value};
}
export type MoneyEdit = {amount: string; category: string; note: string; date: string};
export const SPLIT_AMOUNT_PROBLEM = 'This entry is split into parts. Change its parts in Money tools first, or keep the amount.';
/**
 * PR-052: an entry edited in place: the same id, kind, currency, source and creation time; only its amount, category,
 * note and date change. The form's own check runs first; an empty note removes it. A split entry keeps its amount
 * (its parts must add up to it), so a new amount for one is refused in words.
 */
export function checkMoneyEdit(entry: MoneyEntry, draft: MoneyEdit, today: string): {ok: true; entry: MoneyEntry} | {ok: false; problem: string} {
  const checked = checkMoneyForm({amount: draft.amount, date: draft.date, today});
  if (!checked.ok) return checked;
  if (entry.parts?.length && checked.amount !== Number(entry.amount).toFixed(2)) return {ok: false, problem: SPLIT_AMOUNT_PROBLEM};
  const category = draft.category.trim().slice(0, 40);
  if (!category) return {ok: false, problem: 'Choose a category.'};
  const {note: _old, ...rest} = entry; void _old;
  const note = draft.note.trim().slice(0, 200);
  return {ok: true, entry: {...rest, amount: entry.parts?.length ? entry.amount : checked.amount, category, ...(note ? {note} : {}), date: draft.date}};
}
/** Puts the edited entry in its own place in the latest log (the same id); a log without it is returned unchanged. */
export const replaceEntry = (log: MoneyLog, entry: MoneyEntry): MoneyLog => log.entries.some(e => e.id === entry.id) ? {...log, entries: log.entries.map(e => e.id === entry.id ? entry : e)} : log;
