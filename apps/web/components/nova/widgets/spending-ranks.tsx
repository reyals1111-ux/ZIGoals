'use client';
import {useMemo} from 'react';
import {widgetPeriod} from '../../../lib/nova/cards/ax/calendar';
import {categoryRanks} from '../../../lib/nova/cards/ax/money-spend';
import type {MoneyEntry} from '../../../lib/money-log/schema';
import type {AxProps} from '../cards/ax/kit';
import {AxmRanksBody} from '../cards/ax/money-ranks';
import {MoneyLogSource} from './ax/money-sources';

/**
 * Session AS (ADR-042 Part 2, Wealth): "Where it went" — what was logged as spent in a period, by category, as ranked
 * bars: the largest first, each with its amount and its share of the total. The period is the question's (`period`), else
 * this month. Every amount is the money log's own, in its own currency; nothing is converted, and nothing moves money.
 */
export default function SpendingRanks({size, params}: AxProps) {
  return <MoneyLogSource kind="expense">{(entries, today) => <Ranks entries={entries} today={today} size={size} params={params}/>}</MoneyLogSource>;
}
function Ranks({entries, today, size, params}: {entries: readonly MoneyEntry[]; today: string} & AxProps) {
  const view = useMemo(() => categoryRanks(entries, 'expense', widgetPeriod(params?.period, today, 'this-month')), [entries, params?.period, today]);
  return <AxmRanksBody id="spending-ranks" view={view} today={today} size={size}/>;
}
