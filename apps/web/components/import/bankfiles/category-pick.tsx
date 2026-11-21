'use client';
import {EXPENSE_CATEGORIES, INCOME_CATEGORIES} from '../../../lib/money-log/schema';
import type {BankTransaction} from '../../../lib/bankfiles';
import {formatDate} from '../../../lib/visual-format';

/**
 * Session AV (L-6, the rehearsal's Lina): each row's category in the import preview, as it will be added (read from the
 * payee and note, then the person's rules), changeable before anything is added. A rule's own category that is not one of
 * the log's names is offered as it is.
 */
export function CategoryPick({t, guess, chosen, onChoose}: {t: BankTransaction; guess: string; chosen?: string; onChoose: (category: string) => void}) {
  const names: readonly string[] = t.direction === 'out' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES, value = chosen ?? guess;
  const options = names.includes(value) ? names : [value, ...names];
  return <select className="bankfile-category" aria-label={`Category for ${t.payee || 'this row'} on ${formatDate(t.date)}`} value={value} onChange={e => onChoose(e.target.value)}>
    {options.map(name => <option key={name} value={name}>{name}</option>)}
  </select>;
}
