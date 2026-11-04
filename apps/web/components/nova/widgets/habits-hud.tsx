'use client';
import type {CSSProperties} from 'react';
import type {WidgetSize} from '../../../lib/nova/store';
import {streakWords} from '../../../lib/nova/holo/habits';
import {formatDate, formatWeekday} from '../../../lib/visual-format';
import {plural} from '../../../lib/plural';
import {Dial, HoloFigure, HoloHidden, HoloReading, HoloTable, HoloUnread, RingStack} from '../holo/parts';
import {useHabitsHud, usePillarShown} from '../holo/use-hud-data';
import {NovaEmpty} from './empty';
import '../holo/holo-parts.css';

/**
 * Session AL Part 11 (lane L8): "Habits HUD" in cyan — orbit rings for the longest current streaks (each against its own
 * best), today's habits done of those due in the centre, the last seven days as segmented columns of check-ins, and a
 * consistency dial: days with a check-in out of the last 30 (the Habits page's own counts, lib/nova/holo/habits.ts).
 */
export default function HabitsHudWidget({size}: {size: WidgetSize}) {
  const shown = usePillarShown('habits'), {hud, loaded, error} = useHabitsHud();
  if (!shown) return <HoloHidden pillar="Habits"/>;
  if (!loaded) return <HoloReading/>;
  if (error || !hud) return <HoloUnread what="Your habits"/>;
  if (!hud.count) return <NovaEmpty pillar="habits">No habits yet. Your streaks, your week and your consistency light up here.</NovaEmpty>;
  const max = Math.max(1, ...hud.week.map(d => d.checkins));
  return <div className="holo-habits" data-size={size}>
    <div className="holo-split">
      <div className="holo-ring" style={{'--ring': `${size === 'S' ? 64 : 112}px`} as CSSProperties}>
        <RingStack rings={hud.rings.map(r => ({key: r.id, share: r.share}))} size={size === 'S' ? 64 : 112}/>
        <div className="holo-ring-centre"><HoloFigure text={`${hud.done}/${hud.due}`} className="holo-num-ring"/><small>today</small></div>
      </div>
      {size !== 'S' && <div className="holo-stack-list">
        <ol className="holo-streaks" aria-label="Longest streaks now">{hud.rings.map((r, i) => <li key={r.id} style={{'--i': i} as CSSProperties}><span className="holo-dot" aria-hidden="true"/>{r.title}<b className="holo-num">{streakWords(r.streak, r.unit)}</b></li>)}</ol>
        {!hud.rings.length && <p className="holo-note holo-note-line">A streak starts with your next check-in.</p>}
      </div>}
    </div>
    {size !== 'S' && <div className="holo-week-row">
      <div className="holo-week" aria-hidden="true">{hud.week.map(d => <span key={d.date} className="holo-week-day">
        <span className="holo-col">{Array.from({length: 5}, (_, i) => <i key={i} data-lit={d.checkins > 0 && i < Math.ceil(d.checkins / max * 5) || undefined}/>)}</span>
        <small>{formatWeekday(d.date).slice(0, 2)}</small>
      </span>)}</div>
      <Dial share={hud.activeDays / 30} size={size === 'L' ? 104 : 84}><HoloFigure text={`${hud.activeDays}`} className="holo-num-ring"/><small>of 30 days</small></Dial>
    </div>}
    <HoloTable caption="Habits" rows={[['Done today', `${hud.done} of ${hud.due} due`], ...hud.rings.map(r => [`${r.title} streak`, `${streakWords(r.streak, r.unit)} (best ${streakWords(r.best, r.unit)})`] as const),
      ...hud.week.map(d => [formatDate(d.date, {weekday: true, year: false}), `${d.checkins} ${plural(d.checkins, 'check-in')}`] as const), ['Consistency', `${hud.activeDays} of the last 30 days with a check-in`]]}/>
  </div>;
}
