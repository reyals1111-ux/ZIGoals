'use client';
import Link from 'next/link';
import {useMemo} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {BILLS} from '../../lib/bills/schema';
import {BUDGETS} from '../../lib/budgets/schema';
import {MONEY_LOG} from '../../lib/money-log/schema';
import {MONEY_REVIEW} from '../../lib/money-review/review';
import {attentionLinks, moneyAttention} from '../../lib/money-attention';
import {localDate} from '../../lib/local-date';
// Session AV lane 2 (money): the low-balance line from the 60-day forecast, and what is left in each budget (opt-in).
import {ACCOUNTS} from '../../lib/accounts/schema';
import {cashForecast} from '../../lib/cash-forecast/model';
import {budgetsLeft, lowBalanceCross} from '../../lib/money-notices';
import {moneyCents} from './money-tools/format';
import {DEBT_PLANNER} from '../../lib/debt-planner/store';
import {trackedProgress} from '../../lib/debt-planner/wealth';
import {WEALTH_SHEET} from '../../lib/wealth-sheet/schema';
import {staleAccounts} from '../../lib/wealth-sheet/sheet';
// Session AV lane 2, round 2 (money; Emma, Wallet): unusual entries, balance lines, payee and own budgets, money lent and borrowed.
import {MONEY_MORE} from '../../lib/money-more/schema';
import {MONEY_TAGS_RECORD} from '../../lib/money-tags/schema';
import {todayExtras} from '../../lib/money-more/today';
import {isShowcase} from '../../lib/showcase-storage';

/**
 * Session AV (owner follow-up 1, F-MONEY-ATTENTION; YNAB's Spotlight): one line on Today, beside "Tasks due today",
 * when something in Wealth asks for a look — entries to review, a budget over or near its limit, a bill due in the next three days — that
 * opens Wealth. Nothing shows when nothing asks, so Today stays as it is. Lazy; on this device only.
 * Session AV (fresh-agent check q2, rank 20; YNAB's Spotlight): each piece opens its own place — the review list,
 * Budgets by category, Upcoming bills — and a budget spent faster than the month, or a watched category well above last
 * month, is named too.
 */
export default function TodayMoneyAttention() {
  const log = useDeviceRecord(MONEY_LOG), review = useDeviceRecord(MONEY_REVIEW), budgets = useDeviceRecord(BUDGETS), bills = useDeviceRecord(BILLS), accounts = useDeviceRecord(ACCOUNTS), planner = useDeviceRecord(DEBT_PLANNER), sheet = useDeviceRecord(WEALTH_SHEET), more = useDeviceRecord(MONEY_MORE), tags = useDeviceRecord(MONEY_TAGS_RECORD), today = localDate();
  const ready = log.loaded && review.loaded && budgets.loaded && bills.loaded && accounts.loaded && planner.loaded && sheet.loaded && more.loaded && tags.loaded;
  const a = useMemo(() => {
    if (!ready) return null;
    const entries = log.unreadable ? [] : log.data.entries, line = log.unreadable ? null : log.data.lowBalance;
    const low = line && !accounts.unreadable && !bills.unreadable ? lowBalanceCross(cashForecast({accounts: accounts.data, bills: bills.data, entries, ...(budgets.unreadable ? {} : {budgets: budgets.data}), today}).rows, line) : null;
    // Session AV lane 2 (money; Undebt.it): Today follows the kept debt plan and names it when what is owed is behind it.
    const kept = !accounts.unreadable && !planner.unreadable ? trackedProgress(accounts.data, planner.data, today) : null, debtsBehind = kept && kept.months > 0 && kept.ahead < 0n ? {cents: -kept.ahead, currency: kept.currency} : null;
    return moneyAttention({entries, review: review.unreadable ? null : review.data, budgets: budgets.unreadable ? null : budgets.data, bills: bills.unreadable ? null : bills.data, today, low, debtsBehind, stale: !accounts.unreadable && !sheet.unreadable ? staleAccounts(accounts.data, sheet.data, today) : [],
      // Session AV lane 2, round 2: left out of the Showcase, whose Today line is pinned as it is.
      extra: isShowcase() ? [] : todayExtras({entries, today, budgets: budgets.unreadable ? null : budgets.data, accounts: accounts.unreadable ? null : accounts.data, sheet: sheet.unreadable ? null : sheet.data, more: more.unreadable ? null : more.data, tags: tags.unreadable ? null : tags.data})});
  }, [more.unreadable, more.data, tags.unreadable, tags.data, sheet.unreadable, sheet.data, planner.unreadable, planner.data, ready, log.unreadable, log.data, review.unreadable, review.data, budgets.unreadable, budgets.data, bills.unreadable, bills.data, accounts.unreadable, accounts.data, today]);
  const left = useMemo(() => ready && !budgets.unreadable && !log.unreadable ? budgetsLeft(budgets.data, log.data.entries, today) : [], [ready, budgets.unreadable, budgets.data, log.unreadable, log.data.entries, today]);
  if (!a || (!a.count && !left.length)) return null;
  const pieces = attentionLinks(a), shown = pieces.slice(0, 3);
  // Session AV lane 2 (money; YNAB's home tab): what is left in each budget, as plain text (no Tab stop), only when the
  // person turned it on in Budgets — the Showcase and every device that did not keep Today as it was.
  const leftLine = left.length ? <p className="today-tasks-due-line today-budgets-left"><span><strong>Budgets left:</strong> {left.slice(0, 4).map(l => `${l.category} ${l.left < 0 ? `${moneyCents(-l.left, l.currency)} over` : moneyCents(l.left, l.currency)}`).join(' · ')}{left.length > 4 ? ` and ${left.length - 4} more` : ''}</span></p> : null;
  if (!pieces.length) return <section className="today-tasks-due today-money-attention" aria-label="Money that asks for a look">{leftLine}</section>;
  return <section className="today-tasks-due today-money-attention" aria-label="Money that asks for a look">
    <p className="today-tasks-due-line"><span>
      {/* One link, as Today's other glance lines (Showcase Today keeps its 90 Tab stops, D-028): it opens the place of the
          first piece it names (the review list, Budgets by category or Upcoming bills), not the top of Wealth. */}
      <strong>Money:</strong> <Link className="text-link" href={shown[0]!.href}>{shown.map(p => p.text).join(' · ')}{pieces.length > shown.length ? ` and ${pieces.length - shown.length} more` : ''} <span aria-hidden="true">→</span></Link></span></p>
    {leftLine}
  </section>;
}
