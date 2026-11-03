import {alreadyLogged, noteOf, type BankTransaction} from '../bankfiles';
import type {MoneyEntry, MoneyLog} from '../money-log/schema';
import {applyRule, describeRule, firstMatch, subjectOf} from './engine';
import type {MoneyRule} from './schema';

/**
 * Session AK (lane M, item 1): the rules in the import preview (CSV and bank statement files). A row is shown with the
 * rule that will set it, and a row the rules renamed before is still recognised as already in the log.
 */
const probe = (t: BankTransaction): MoneyEntry => {
  const note = noteOf(t);
  return {id: 'probe', kind: t.direction === 'out' ? 'expense' : 'income', amount: t.amount, currency: t.currency, category: 'Other', ...(note ? {note} : {}), date: t.date, createdAt: '2000-01-01T00:00:00.000Z'};
};
/** The rule that will set this row, in words, or null. */
export function ruleHint(t: BankTransaction, rules: readonly MoneyRule[]): string | null {
  const p = probe(t), rule = firstMatch(rules, subjectOf(p));
  return rule ? `Rule: ${describeRule(rule).then}` : null;
}
/** Already in the log as the bank wrote it, or as the person's rules renamed it. */
export function loggedWithRules(t: BankTransaction, log: Pick<MoneyLog, 'entries'>, rules: readonly MoneyRule[]): boolean {
  if (alreadyLogged(t, log)) return true;
  const p = probe(t), rule = firstMatch(rules, subjectOf(p));
  if (!rule) return false;
  const note = applyRule(p, rule).note ?? '', amount = Number(t.amount);
  return log.entries.some(e => e.date === p.date && e.kind === p.kind && e.currency === p.currency && Number(e.amount) === amount && (e.note ?? '') === note);
}
