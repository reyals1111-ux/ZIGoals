'use client';
import {useMemo} from 'react';
import {ledger} from '../../../lib/ai/local-answers/exact/money';
import {widgetPeriod} from '../../../lib/nova/cards/ax/calendar';
import {spendTrack} from '../../../lib/nova/cards/ax/money-spend';
import type {MoneyEntry} from '../../../lib/money-log/schema';
import type {AxProps} from '../cards/ax/kit';
import {MoneyLogSource} from './ax/money-sources';
import {TrackCalendar} from './ax/track-calendar';

/**
 * Session AS (ADR-042 Part 2, Wealth): "Days with spending" — a period as a calendar with the days lit on which
 * something was logged as spent (in any currency). A past day with nothing logged is an unlit dashed cell (unknown,
 * never "spent nothing"); today is ringed and still open, since the day is not over. The period is the question's
 * (`period`), else this month. Each lit day's amount is the money log's own, in the leading currency.
 */
export default function SpendingDays({size, params}: AxProps) {
  return <MoneyLogSource kind="expense">{(entries, today) => <Days entries={entries} today={today} size={size} params={params}/>}</MoneyLogSource>;
}
function Days({entries, today, size, params}: {entries: readonly MoneyEntry[]; today: string} & AxProps) {
  const track = useMemo(() => spendTrack(entries, today, ledger(entries, 'expense', widgetPeriod(params?.period, today, 'this-month')).currency), [entries, params?.period, today]);
  return <TrackCalendar kind="spending-days" track={track} today={today} params={params} size={size} lit="done" source="Your money log"/>;
}
