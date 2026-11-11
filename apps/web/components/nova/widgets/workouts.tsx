'use client';
import {useMemo} from 'react';
import {useHealth} from '../../health/use-health';
import {useHealthToday} from '../../health/use-health-today';
import {useWorkouts} from '../../health/workouts/use-workouts';
import {dailyData} from '../../../lib/health-daily';
import {workoutsCard, workoutsRows} from '../../../lib/nova/cards/workouts';
import {formatNumber} from '../../../lib/visual-format';
import {CardFoot, CardNotice, Columns, Hero, type CardProps} from '../cards/kit';
import {HoloHidden, HoloReading, HoloTable, HoloUnread, NotShared} from '../holo/parts';
import {useHealthShared, usePillarShown} from '../holo/use-hud-data';
import '../cards/health-cards.css';

/**
 * Session AM (ADR-038 D1–D5; art direction §4): "Workouts", made on request. The workouts logged in the range and their
 * minutes together; a field of columns, one per week (a week by day, a year by month), each as tall as the workouts
 * logged in it; and the last three workouts as lines (name, day, minutes). Every figure is the workout log's own
 * (lib/nova/cards/workouts.ts, with the Workouts view's engine); the days follow the Health journal's day. A column with
 * no workout is an empty slot. Small: the count. Medium: with the columns. Large: with the last three workouts.
 */
export default function WorkoutsWidget({size = 'M', params}: Partial<CardProps>) {
  const shown = usePillarShown('health'), shared = useHealthShared(), record = useWorkouts(), health = useHealth();
  // The Health journal's day (its own time zone when the journal has one); the workout log is its own record.
  const day = useHealthToday(health.loaded && !health.error ? dailyData(health.data).preferences.timezone : null), range = params?.range;
  const ready = record.loaded && !record.unreadable;
  const card = useMemo(() => { if (!ready) return null; try { return workoutsCard(record.data, day, range); } catch { return null; } }, [ready, record.data, day, range]);
  if (!shown) return <HoloHidden pillar="Health"/>;
  if (!record.loaded) return <HoloReading/>;
  if (record.unreadable || !card) return <HoloUnread what="Your workout log"/>;
  if (!card.all) return <CardNotice kind="empty" title="No workouts logged yet" href="/app/health?view=workouts" action="Log a workout">{size === 'S' ? null : 'Finish a workout on Health and your weeks show here.'}</CardNotice>;
  // A month's few weeks are each named by their Monday under the field; a quarter's many weeks only at its ends.
  const dated = card.by === 'week' && card.buckets.some(b => b.label);
  return <div className="nc-body nc-workouts">
    <div className="nc-workouts-top">
      <Hero value={formatNumber(card.count)} unit={card.countWord} label={card.window.words}/>
      <div className="nc-workouts-side"><p className="nc-workouts-note">{card.count ? `${card.minutesText} in total` : `Last one ${card.recent[0]?.dateText ?? '—'}`}</p></div>
    </div>
    {size !== 'S' && card.count > 0 && <div className="nc-workouts-chart">
      {size === 'L' && <p className="nc-workouts-cap">{dated ? 'Workouts in the week of' : `Workouts each ${card.by}`}</p>}
      <Columns values={card.buckets.map(b => b.count || null)} labels={card.buckets.map(b => b.label)} height={size === 'L' ? 96 : 52}/>
      {card.by === 'week' && !dated && <p className="nc-trend-dates" aria-hidden="true"><span>{card.edges[0]}</span><span>{card.edges[1]}</span></p>}
    </div>}
    {size === 'L' && card.recent.length > 0 && <ul className="nc-workouts-list" aria-label="Your last workouts">
      {card.recent.map(w => <li key={w.id} className="nc-workouts-row"><span className="nc-workouts-name" title={w.name}>{w.name}</span><span className="nc-workouts-date">{w.dateText}</span><span className="nc-workouts-minutes">{w.minutesText}</span></li>)}
    </ul>}
    {!shared && size !== 'S' && <NotShared/>}
    <HoloTable caption={`Your workouts, ${card.window.words}`} rows={workoutsRows(card)}/>
    <CardFoot source="Your Health records" asOf={card.asOf}/>
  </div>;
}
