'use client';
import {useMemo} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {ACCOUNTS, type Account} from '../../lib/accounts/schema';
import {cardStatement, onlyCreditCard} from '../../lib/accounts/card-statement';
import {MONEY_LOG} from '../../lib/money-log/schema';
import type {WealthSheet} from '../../lib/wealth-sheet/schema';
import {formatCurrencyAmount, formatDate} from '../../lib/visual-format';
import './card-statement.css';

/**
 * Session AW, round 7 X7 (money; Money Manager's card balance, LEDGER #464): on a credit card's row in What you owe, under
 * #293's limit line, "Next payment on 25 Nov: €412.30 (statement of 5 Nov) · So far this statement: €96.10" — worked out
 * from the person's own money-log entries on the card (lib/accounts/card-statement.ts), its own chunk. Unknown is said in
 * words, never as 0; a fact, not advice. Amounts blur with Hide amounts.
 */
const day = (d: string, today: string) => formatDate(d, {year: !d.startsWith(today.slice(0, 4))});
export default function CardStatementLine({account, sheet, today}: {account: Account; sheet: WealthSheet; today: string}) {
  const log = useDeviceRecord(MONEY_LOG), accounts = useDeviceRecord(ACCOUNTS), card = sheet.cards?.[account.id];
  const s = useMemo(() => log.loaded && !log.unreadable ? cardStatement(account, log.data.entries, {statementDay: card?.statementDay ?? null, dueDay: card?.dueDay ?? null, onlyCard: accounts.loaded && !accounts.unreadable ? onlyCreditCard(accounts.data, account) : false}, today) : null,
    [log.loaded, log.unreadable, log.data.entries, account, card?.statementDay, card?.dueDay, accounts.loaded, accounts.unreadable, accounts.data, today]);
  if (!s || s.state === 'no-day') return null;
  const m = (amount: string) => formatCurrencyAmount(amount, account.currency);
  if (s.state === 'no-entries') return <small className="accounts-card-statement fine">Next payment: not known yet, as no entry in your money log is on this card. Entries in {account.currency} from its bank file, or marked “Paid with: credit card” while it is your only card in {account.currency}, count towards its statement.</small>;
  const parts: string[] = [];
  if (s.next && !s.next.open && s.next.amount !== null) parts.push(`Next payment on ${day(s.next.due, today)}: ${m(s.next.amount)} (statement of ${day(s.next.statement, today)}${s.next.paid ? `; ${m(s.next.charged!)} less ${m(s.next.paid)} you recorded paid` : ''})`);
  else if (s.next?.open) parts.push(`Next payment on ${day(s.next.due, today)}: its statement of ${day(s.next.statement, today)} is still open`);
  parts.push(`So far this statement: ${m(s.soFar.amount)}`);
  return <small className="accounts-card-statement" data-private-amount>{parts.join(' · ')}. <span className="fine">From your own entries on this card; not advice.</span></small>;
}
