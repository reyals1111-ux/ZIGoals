'use client';
import {useMemo} from 'react';
import {dayScan} from '../../../lib/nova/cards/ax/day-life';
import {formatClock} from '../../../lib/visual-format';
import {AxdKey} from '../cards/ax/day-key';
import {AxdScan} from '../cards/ax/day-radar';
import {AxBody, AxHead, type AxProps} from '../cards/ax/kit';
import {CardFoot, CardNotice} from '../cards/kit';
import {HoloReading, HoloTable} from '../holo/parts';
import {useAgendaToday} from '../holo/use-agenda-today';
import {useDayRecords} from './ax/day-sources';

/**
 * Session AS (ADR-042 Part 2, family: scanner; addition A3): "Day scan" — today across what the Today switch covers, a
 * lane each: habits done and open, tasks open and overdue, the minutes focused and the agenda's items left; one beam
 * crosses the lanes. Facts only: no score. A part that is off, unread or empty is left out, never shown as zero. Habits
 * are read only while their page is shown and NOVA may read them; the overdue rule is the Tasks page's own.
 */
export default function DayScan({size}: AxProps) {
  const records = useDayRecords(), {items} = useAgendaToday(), {habits, tasks, focus, today, clock} = records;
  const lanes = useMemo(() => records.ready && items ? dayScan({habits, tasks, focus, agenda: items}, today, clock) : null, [records.ready, items, habits, tasks, focus, today, clock]);
  if (!lanes) return <HoloReading/>;
  const lead = lanes[0];
  if (!lead) return <CardNotice kind="empty" ghost="rows" title="Nothing on today yet" href="/app/habits?add=habit" action="Add a habit">A habit, a task, a focus session or an agenda item lights its lane here.</CardNotice>;
  return <AxBody kind="day-scan" size={size}>
    <AxHead figure={lead.figure} unit={lead.unit} label={lead.words} note={lanes.slice(1, 3).map(l => `${l.label}: ${l.text.replace(/^./, c => c.toLowerCase())}`).join(' · ') || undefined}/>
    {size !== 'S' && <AxdScan lanes={lanes} more={hidden => `+${hidden} more on Today`}/>}
    {size === 'L' && <AxdKey items={[['lit', 'Done'], ['ring', 'Open'], ['missed', 'Overdue']]}/>}
    <CardFoot source="Your records on this device" asOf={`today, ${formatClock(clock)}`}/>
    <HoloTable caption="Today, part by part" rows={lanes.map(l => [l.label, l.text] as const)}/>
  </AxBody>;
}
