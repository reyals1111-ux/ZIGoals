'use client';
import {useMemo} from 'react';
import {periodLabel, widgetPeriod} from '../../../lib/nova/cards/ax/calendar';
import {lifeRadar} from '../../../lib/nova/cards/ax/day-life';
import {deviceDay} from '../../../lib/tasks/device';
import {AxdKey} from '../cards/ax/day-key';
import {AxdRadar} from '../cards/ax/day-radar';
import {AxBody, AxHead, type AxProps} from '../cards/ax/kit';
import {CardFoot, CardNotice} from '../cards/kit';
import {HoloReading, HoloTable} from '../holo/parts';
import {useChecklistCounts, useDayRecords} from './ax/day-sources';

/**
 * Session AS (ADR-042 Part 2, family: radar; addition A3): "Life radar" — four spokes of what the records hold: the
 * share of due habit check-ins done, the tasks finished, the minutes focused and the share of Checklist dots done. This
 * period is the lit shape, the same days of the period before the dim dashed one. Facts and the person's own past only:
 * no score, no grade and no judgement, and each spoke is said in words. A spoke whose record is off, unread or empty for
 * the period is a dashed axis with no point (unknown, never zero). The period is the question's (`period`), else this
 * week. Habits are read only while their page is shown and NOVA may read them.
 */
export default function LifeRadar({size, params}: AxProps) {
  const records = useDayRecords(), {ready, checklist} = useChecklistCounts(records.today), {habits, tasks, focus, today} = records;
  const view = useMemo(() => records.ready && ready ? lifeRadar({habits, tasks, focus, checklist}, widgetPeriod(params?.period, today, 'this-week'), today, deviceDay) : null, [records.ready, ready, habits, tasks, focus, checklist, params?.period, today]);
  if (!view) return <HoloReading/>;
  const known = view.spokes.filter(s => s.now.share !== null), lead = known[0];
  if (!lead) return <CardNotice kind="empty" ghost="ring" title="Nothing recorded yet" href="/app/habits?add=habit" action="Add a habit">A habit, a task or a focus session draws its spoke here, beside the same days before.</CardNotice>;
  const label = periodLabel(view.period, today), short = (s: (typeof view.spokes)[number]) => s.now.share === null ? '—' : `${s.figure}${s.unit ? ` ${s.unit}` : ''}`;
  return <AxBody kind="life-radar" size={size}>
    <AxHead figure={lead.figure} unit={lead.unit} label={`${lead.words} · ${label}`} note={known.slice(1).map(s => s.now.text).join(' · ') || undefined}/>
    {size !== 'S' && <AxdRadar spokes={view.spokes.map(s => ({key: s.key, label: s.label, text: short(s), now: s.now.share, before: s.before.share, scale: s.full}))}/>}
    {size === 'L' && <AxdKey items={[['lit', label.replace(/^./, c => c.toUpperCase())], ['skipped', view.beforeWords ? `The period before (${view.beforeWords})` : 'The period before'], ['none', 'Nothing recorded']]}/>}
    <CardFoot source="Your records on this device" asOf={label}/>
    <HoloTable caption={`Your records, ${label} beside the period before`} rows={view.spokes.flatMap(s => [[`${s.label}, ${label}`, s.now.text] as const, [`${s.label}, the period before${view.beforeWords ? ` (${view.beforeWords})` : ''}`, s.before.text] as const])}/>
  </AxBody>;
}
