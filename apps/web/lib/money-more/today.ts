import type {Accounts} from '../accounts/schema';
import type {BudgetsRecord} from '../budgets/schema';
import type {MoneyEntry} from '../money-log/schema';
import type {MoneyTags} from '../money-tags/schema';
import type {WealthSheet} from '../wealth-sheet/schema';
import {ATTENTION_HREF} from '../money-attention';
import {limitStates, unusualEntries} from './alerts';
import {ownBudgetRows, payeeBudgets} from './own-budgets';
import type {MoneyMore} from './schema';
import {loansDue} from './people';
import {fromMinor} from '../money-split/parts';
import {formatCurrencyAmount} from '../visual-format';

/**
 * Session AV lane 2, round 2 (money; Emma, Wallet): the pieces round 2 adds to Today's one money line (still one link,
 * so no Tab stop is added), each with the place it opens — an entry well above its usual, an account past its own line,
 * a payee budget or one of your own budgets near or over, and money lent or borrowed due within three days or past due.
 * Pure; the caller holds the records (components/wealth/today-money-attention.tsx), and leaves these out in the Showcase.
 */
export type Piece = {text: string; href: string};
type Sources = {entries: readonly MoneyEntry[]; today: string; budgets?: BudgetsRecord | null; accounts?: Accounts | null; sheet?: WealthSheet | null; more?: MoneyMore | null; tags?: MoneyTags | null};
export function todayExtras(s: Sources): Piece[] {
  const out: Piece[] = [];
  for (const u of unusualEntries(s.entries, s.today).slice(0, 2)) out.push({text: `${u.name} above its usual`, href: ATTENTION_HREF.review});
  for (const l of limitStates(s.accounts, s.sheet, s.today)) out.push({text: `${l.name} ${l.side} your line`, href: '/app/wealth'});
  if (s.budgets?.payees?.some(p => p.amount)) for (const p of payeeBudgets(s.budgets, s.entries, s.today)) if (p.over || p.near) out.push({text: p.over ? `${p.payee} over its budget` : `${p.payee} near its budget`, href: ATTENTION_HREF.budgets});
  if (s.more?.budgets?.length) {
    const tagged = (tag: string) => new Set(Object.entries(s.tags?.tags ?? {}).filter(([, list]) => list.includes(tag)).map(([id]) => id));
    for (const r of ownBudgetRows(s.more, s.entries, tagged, s.today)) if (r.state === 'running' && (r.over || r.share >= 0.8)) out.push({text: r.over ? `${r.budget.name} over its budget` : `${r.budget.name} near its budget`, href: ATTENTION_HREF.budgets});
  }
  for (const r of loansDue(s.more, s.today)) out.push({text: `${r.loan.kind === 'lent' ? `${r.loan.name} owes you` : `You owe ${r.loan.name}`} ${formatCurrencyAmount(fromMinor(r.left), r.loan.currency)}, ${r.state === 'overdue' ? 'past due' : r.days === 0 ? 'due today' : r.days === 1 ? 'due tomorrow' : `due in ${r.days} days`}`, href: '/app/wealth#spending'});
  return out;
}
