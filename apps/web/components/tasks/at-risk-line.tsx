'use client';
import {useMemo} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {CALENDAR_IMPORT} from '../../lib/ics/calendar';
import {eventAgendaItems} from '../../lib/agenda/time-items';
import {checklistZone} from '../../lib/checklist/zone';
import {addLocalDays} from '../../lib/local-date';
import {RISK_DAYS, deadlineAtRisk} from '../../lib/tasks/at-risk';
import {DEFAULT_BLOCK, toMin, type Busy} from '../../lib/tasks/layouts';
import {minutesWords} from '../../lib/tasks/minutes';
import {TASK_PLAN} from '../../lib/tasks/plan-record';
import type {Tasks} from '../../lib/tasks/schema';
import {formatDate, formatNumber} from '../../lib/visual-format';
import './tasks-r4.css';

/**
 * Session AV lane 2 (r4-plan, LEDGER #302; Motion's "could not fit", under the calm-design rule), its own chunk, at the top
 * of Tasks → Upcoming: one quiet line when the minutes of the open tasks due by a deadline are more than the free time in
 * the person's hours until it, naming the tasks, as a fact. Never red, never a sound, never a notification; nothing stored.
 */
export default function AtRiskLine({record, today, clock}: {record: Tasks; today: string; clock: string}) {
  const plan = useDeviceRecord(TASK_PLAN), calendars = useDeviceRecord(CALENDAR_IMPORT);
  const risk = useMemo(() => {
    const by = new Map<string, Busy[]>();
    if (calendars.loaded) for (const e of eventAgendaItems(calendars.data, today, addLocalDays(today, RISK_DAYS - 1), checklistZone())) if (e.time) by.set(e.date, [...(by.get(e.date) ?? []), {start: toMin(e.time), end: toMin(e.time) + (e.minutes || DEFAULT_BLOCK), title: e.title}]);
    return deadlineAtRisk({record, plan: plan.data, today, clock, extra: d => by.get(d) ?? []});
  }, [record, plan.data, today, clock, calendars.loaded, calendars.data]);
  if (!plan.loaded || !risk) return null;
  const when = risk.deadline === today ? 'today' : `by ${formatDate(risk.deadline, {weekday: true, year: false})}`, names = risk.tasks.slice(0, 4).map(t => `“${t.title}”`).join(', ');
  return <p className="fine tasks-at-risk" role="note">
    About {minutesWords(risk.need)} of tasks are due {when}, and {risk.free ? `about ${minutesWords(risk.free)} of your working hours are` : 'none of your working hours are'} free before then: {names}{risk.tasks.length > 4 ? ` and ${formatNumber(risk.tasks.length - 4)} more` : ''}.
    {risk.unsized ? ` ${formatNumber(risk.unsized)} more ${risk.unsized === 1 ? 'has' : 'have'} no length, so ${risk.unsized === 1 ? 'is' : 'are'} not counted.` : ''} Moving a deadline, more hours in Tasks → This week, or letting one go would make room.
  </p>;
}
