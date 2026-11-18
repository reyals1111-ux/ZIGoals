'use client';
import {useMemo} from 'react';
import {widgetPeriod} from '../../../lib/nova/cards/ax/calendar';
import {categoryRanks} from '../../../lib/nova/cards/ax/money-spend';
import type {MoneyEntry} from '../../../lib/money-log/schema';
import type {AxProps} from '../cards/ax/kit';
import {AxmRanksBody} from '../cards/ax/money-ranks';
import {MoneyLogSource} from './ax/money-sources';

/**
 * Session AS (ADR-042 Part 2, Wealth): "Where it came from" — the income logged in a period, by category, as ranked
 * bars with each one's share of the total. The period is the question's (`period`), else this month. Only what was
 * logged counts; each currency on its own.
 */
export default function IncomeRanks({size, params}: AxProps) {
  return <MoneyLogSource kind="income">{(entries, today) => <Ranks entries={entries} today={today} size={size} params={params}/>}</MoneyLogSource>;
}
function Ranks({entries, today, size, params}: {entries: readonly MoneyEntry[]; today: string} & AxProps) {
  const view = useMemo(() => categoryRanks(entries, 'income', widgetPeriod(params?.period, today, 'this-month')), [entries, params?.period, today]);
  return <AxmRanksBody id="income-ranks" view={view} today={today} size={size}/>;
}
