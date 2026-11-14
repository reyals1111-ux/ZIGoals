'use client';
import {useMemo} from 'react';
import {readyToAssign} from '../../../lib/budgets/ready-to-assign';
import type {BudgetsRecord} from '../../../lib/budgets/schema';
import type {MoneyEntry} from '../../../lib/money-log/schema';
import {formatMonth} from '../../../lib/visual-format';
import {moneyCents} from '../money-tools/format';

/**
 * Session AP (feature 3): "Ready to assign" above the month's budgets, one currency at a time (never converted): the
 * month's logged income minus what the month's budgets hold, from records only, said plainly. Its own chunk.
 */
export default function ReadyToAssign({entries, record, month, current}: {entries: readonly MoneyEntry[]; record: BudgetsRecord; month: string; current: boolean}) {
  const rows = useMemo(() => readyToAssign(entries, record, month), [entries, record, month]), name = formatMonth(month), when = current ? 'this month' : `in ${name}`;
  if (!rows.length) return <p className="fine budgets-ready">Ready to assign: nothing logged as income {when}, and no budgets yet.</p>;
  return <div className="budgets-ready" role="group" aria-label={`Ready to assign in ${name}`}>
    {rows.map(r => r.status === 'ok'
      ? <p key={r.currency}><strong>Ready to assign: {r.ready < 0 ? `${moneyCents(-r.ready, r.currency)} more in budgets than logged as income` : moneyCents(r.ready, r.currency)}</strong>
        <span className="fine"> · {moneyCents(r.income, r.currency)} logged as income {when}, minus {moneyCents(r.held, r.currency)} your budgets hold</span></p>
      : <p key={r.currency}><strong>Ready to assign in {r.currency}: nothing logged as income {when}</strong><span className="fine"> · your budgets hold {moneyCents(r.held, r.currency)}</span></p>)}
    <p className="fine">From your money log and budgets only; what rolls over from earlier months is not counted again.</p>
  </div>;
}
