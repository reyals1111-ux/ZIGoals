'use client';
import Link from 'next/link';
import {useMemo} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {BILLS} from '../../lib/bills/schema';
import {BUDGETS} from '../../lib/budgets/schema';
import {MONEY_LOG} from '../../lib/money-log/schema';
import {MONEY_REVIEW} from '../../lib/money-review/review';
import {attentionPieces, moneyAttention} from '../../lib/money-attention';
import {localDate} from '../../lib/local-date';

/**
 * Session AV (owner follow-up 1, F-MONEY-ATTENTION; YNAB's Spotlight): one line on Today, beside "Tasks due today",
 * when something in Wealth asks for a look — entries to review, a budget over or near its limit, a bill due in the next three days — that
 * opens Wealth. Nothing shows when nothing asks, so Today stays as it is. Lazy; on this device only.
 */
export default function TodayMoneyAttention() {
  const log = useDeviceRecord(MONEY_LOG), review = useDeviceRecord(MONEY_REVIEW), budgets = useDeviceRecord(BUDGETS), bills = useDeviceRecord(BILLS), today = localDate();
  const ready = log.loaded && review.loaded && budgets.loaded && bills.loaded;
  const a = useMemo(() => ready ? moneyAttention({entries: log.unreadable ? [] : log.data.entries, review: review.unreadable ? null : review.data, budgets: budgets.unreadable ? null : budgets.data, bills: bills.unreadable ? null : bills.data, today}) : null,
    [ready, log.unreadable, log.data, review.unreadable, review.data, budgets.unreadable, budgets.data, bills.unreadable, bills.data, today]);
  if (!a || !a.count) return null;
  const pieces = attentionPieces(a), shown = pieces.slice(0, 3);
  return <section className="today-tasks-due today-money-attention" aria-label="Money that asks for a look">
    <p className="today-tasks-due-line"><Link className="text-link" href="/app/wealth"><span>
      <strong>Money:</strong> {shown.join(' · ')}{pieces.length > shown.length ? ` and ${pieces.length - shown.length} more` : ''} →</span></Link></p>
  </section>;
}
