'use client';
import Link from 'next/link';
import {useMemo} from 'react';
import {checklistDay} from '../../../lib/checklist/day';
import {DAY_GOAL_RECORD} from '../../../lib/checklist/day-goal';
import {DAY_ENDS_RECORD} from '../../../lib/day-boundary';
import {dayRulesCard, dayRulesRows} from '../../../lib/nova/cards/life-insights';
import {formatDate} from '../../../lib/visual-format';
import {useDeviceRecord} from '../../ai/use-device-record';
import {CardFoot, Gauge, type CardProps} from '../cards/kit';
import {HoloReading, HoloTable} from '../holo/parts';
import {NxDots, NxInstrument} from './nx-parts';
import '../cards/connect-cards.css';

/**
 * Session AM-2 (step 3, "NOVA connected"; ADR-040 owner decision b, ADR-039 Part 4): "Your day’s rules" in ice — a
 * read-out of two settings of this device: "A day counts as done at N" (lib/checklist/day-goal.ts; the default is every
 * dot) and "My day ends at" (lib/day-boundary.ts; the default is midnight). Figures in lib/nova/cards/life-insights.ts.
 *
 * Read only, on purpose: both settings change the rule from that day on and neither has an Undo on its own page, so
 * NOVA does not change them from the stage. The widget's own link opens Settings at "My day ends at"; at Large each
 * read-out also has a key that opens its own setting. A setting that could not be read is said so, never shown as the
 * default.
 */
export default function DayRulesWidget({size = 'M'}: Partial<CardProps>) {
  const goal = useDeviceRecord(DAY_GOAL_RECORD), ends = useDeviceRecord(DAY_ENDS_RECORD), today = checklistDay();
  const card = useMemo(() => dayRulesCard(goal.unreadable ? null : goal.data, ends.unreadable ? null : ends.data, today), [goal.unreadable, goal.data, ends.unreadable, ends.data, today]);
  if (!goal.loaded || !ends.loaded) return <HoloReading/>;
  const g = card.goal, e = card.ends;
  const need = g?.need ?? null, lit = need === null ? 6 : Math.min(need, 8), of = need === null ? 6 : Math.max(6, Math.min(need, 8));
  const minutes = e?.minutes ?? 0, clock = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  return <div className="nc-body nx-card" data-size={size} data-lay="full">
    <div className="nx-duo">
      {/* A dot meter: the dots a day needs, lit (every dot by default). */}
      <NxInstrument art={<NxDots lit={g ? lit : 0} of={of}/>} label={size === 'S' ? 'Day done at' : 'A day counts as done at'} value={g ? g.words : '—'}
        sub={!g ? 'This setting could not be read on this device.' : g.need === null ? 'The default: every dot lit.' : `Or every dot on a shorter day${g.since ? ` · since ${formatDate(g.since, {year: g.since.slice(0, 4) !== today.slice(0, 4)})}` : ''}.`}/>
      {/* A 24-hour dial (midnight at the top): the lit point is where the day ends. */}
      <NxInstrument art={<Gauge share={e ? 1 : null} size={100} thick={13} bezel ticks={24} start={minutes / 1440 * 360} decor className="nx-ring"><span className="nx-dial-figure" data-len="l"><b>{e ? clock : '—'}</b></span></Gauge>}
        label={size === 'S' ? 'Day ends at' : 'My day ends at'} value={e ? e.words : '—'} sub={!e ? 'This setting could not be read on this device.' : e.minutes === 0 ? 'The default.' : 'Until then it counts for the day before.'}/>
    </div>
    {size === 'L' && <p className="nx-note">Your streak flame and your habits follow these two rules. A change applies from that day on and never recounts a past day, so they are changed in Settings, not from here.</p>}
    {size === 'L' && <div className="nx-keys">
      <Link className="nc-action" href="/app/settings#day-goal" prefetch={false}>Change when a day counts<span aria-hidden="true"> →</span></Link>
      <Link className="nc-action" href="/app/settings#day-ends" prefetch={false}>Change when my day ends<span aria-hidden="true"> →</span></Link>
    </div>}
    <CardFoot source="Your settings on this device" asOf="as they are now"/>
    <HoloTable caption="Your day’s rules" rows={dayRulesRows(card)}/>
  </div>;
}
