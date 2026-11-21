'use client';
import Link from 'next/link';
import {Fragment, useMemo} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {BILLS} from '../../lib/bills/schema';
import {BUDGETS} from '../../lib/budgets/schema';
import {MONEY_LOG} from '../../lib/money-log/schema';
import {MONEY_REVIEW} from '../../lib/money-review/review';
import {attentionLinks, moneyAttention} from '../../lib/money-attention';
import {localDate} from '../../lib/local-date';

/**
 * Session AV (owner follow-up 1, F-MONEY-ATTENTION; YNAB's Spotlight): one line on Today, beside "Tasks due today",
 * when something in Wealth asks for a look — entries to review, a budget over or near its limit, a bill due in the next three days — that
 * opens Wealth. Nothing shows when nothing asks, so Today stays as it is. Lazy; on this device only.
 * Session AV (fresh-agent check q2, rank 20; YNAB's Spotlight): each piece opens its own place — the review list,
 * Budgets by category, Upcoming bills — and a budget spent faster than the month, or a watched category well above last
 * month, is named too.
 */
export default function TodayMoneyAttention() {
  const log = useDeviceRecord(MONEY_LOG), review = useDeviceRecord(MONEY_REVIEW), budgets = useDeviceRecord(BUDGETS), bills = useDeviceRecord(BILLS), today = localDate();
  const ready = log.loaded && review.loaded && budgets.loaded && bills.loaded;
  const a = useMemo(() => ready ? moneyAttention({entries: log.unreadable ? [] : log.data.entries, review: review.unreadable ? null : review.data, budgets: budgets.unreadable ? null : budgets.data, bills: bills.unreadable ? null : bills.data, today}) : null,
    [ready, log.unreadable, log.data, review.unreadable, review.data, budgets.unreadable, budgets.data, bills.unreadable, bills.data, today]);
  if (!a || !a.count) return null;
  const pieces = attentionLinks(a), shown = pieces.slice(0, 3);
  return <section className="today-tasks-due today-money-attention" aria-label="Money that asks for a look">
    <p className="today-tasks-due-line"><span>
      <strong>Money:</strong> {shown.map((p, i) => <Fragment key={`${p.href}-${p.text}`}>{i > 0 && ' · '}<Link className="text-link" href={p.href}>{p.text}</Link></Fragment>)}{pieces.length > shown.length && <>{' and '}<Link className="text-link" href="/app/wealth">{pieces.length - shown.length} more</Link></>} <span aria-hidden="true">→</span></span></p>
  </section>;
}
