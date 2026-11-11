'use client';
import type {CSSProperties} from 'react';
import type {WidgetSize} from '../../../lib/nova/store';
import {streakWords} from '../../../lib/nova/holo/habits';
import {formatDate, formatWeekday} from '../../../lib/visual-format';
import {plural} from '../../../lib/plural';
import {Columns, Dial, GlowBar, HoloEmpty, HoloFigure, HoloHidden, HoloReading, HoloTable, HoloUnread, RingStack} from '../holo/parts';
import {useHabitsHud, usePillarShown} from '../holo/use-hud-data';
import '../holo/holo-parts.css';

/**
 * Session AL Part 11 (lane L8): "Habits HUD" in cyan — orbit rings for the longest current streaks (each against its own
 * best), today's habits done of those due in the centre, the last seven days as segmented columns of check-ins, and a
 * consistency dial: days with a check-in out of the last 30 (the Habits page's own counts, lib/nova/holo/habits.ts).
 * Review fixes (lane L8d): each day's column is scaled to the habits due that day (m7: a full column is "every habit due
 * was done", said in the table), the dial's words stay inside the panel (B1), and an empty panel is the instrument unlit (M8).
 * Session AM-2 (art direction D, Habits: cyan, streak rings): today is the outer ring — a thick gradient arc of the habits
 * done out of those due, its figure in the middle — with the streaks as fine orbit rings inside it; each streak is a row
 * with its lit node, its days and a bar against its own best; the week is seven glowing columns (today's slot outlined);
 * the 30-day dial closes the row. The same figures as before, in the same words and the same table.
 */
export default function HabitsHudWidget({size}: {size: WidgetSize}) {
  const shown = usePillarShown('habits'), {hud, loaded, error} = useHabitsHud();
  if (!shown) return <HoloHidden pillar="Habits"/>;
  if (!loaded) return <HoloReading/>;
  if (error || !hud) return <HoloUnread what="Your habits"/>;
  if (!hud.count) return <HoloEmpty kind="stack" href="/app/habits?add=habit" action="Add a habit">No habits yet. Your streaks, your week and your consistency light up here.</HoloEmpty>;
  // m7: a day's column against the habits due that day (a day with none due falls back to the week's busiest day).
  const busiest = Math.max(1, ...hud.week.map(d => d.checkins)), of = (d: (typeof hud.week)[number]) => d.scheduled > 0 ? d.scheduled : busiest;
  const ring = size === 'S' ? 64 : undefined;
  // AM-2: today's own ring (done of due) outside, the streak rings inside it. Nothing due today: today's ring is unknown (a hairline), never an empty 0.
  const rings = [{key: 'today', share: hud.due > 0 ? hud.done / hud.due : null, r: 47, lead: true}, ...hud.rings.slice(0, size === 'S' ? 0 : 3).map((r, i) => ({key: r.id, share: r.share, r: 39.6 - i * 4}))];
  return <div className="holo-habits" data-size={size}>
    <div className="holo-split">
      <div className="holo-ring holo-today" data-small={size === 'S' || undefined} style={ring ? {'--ring': `${ring}px`} as CSSProperties : undefined}>
        <RingStack rings={rings} size={ring ?? 120} segments={size === 'S' ? 0 : 36} bezel={size !== 'S'}/>
        <div className="holo-ring-centre"><HoloFigure text={`${hud.done}/${hud.due}`} className="holo-num-ring"/><small>today</small></div>
      </div>
      {size !== 'S' && <div className="holo-stack-list">
        <ol className="holo-streaks" aria-label="Longest streaks now">{hud.rings.map((r, i) => <li key={r.id} style={{'--i': i} as CSSProperties}><span className="holo-dot" aria-hidden="true"/><span className="holo-streak-name">{r.title}</span><b className="holo-num">{streakWords(r.streak, r.unit)}</b><GlowBar share={r.share}/></li>)}</ol>
        {!hud.rings.length && <p className="holo-note holo-note-line">A streak starts with your next check-in.</p>}
      </div>}
      {/* A small panel: today's ring and the week's columns (no words to fit; the table says them). */}
      {size === 'S' && <Columns shares={hud.week.map(d => d.checkins > 0 ? Math.min(1, d.checkins / of(d)) : null)} today={hud.week.length - 1}/>}
    </div>
    {size !== 'S' && <div className="holo-week-row">
      <Columns shares={hud.week.map(d => d.checkins > 0 ? Math.min(1, d.checkins / of(d)) : null)} labels={hud.week.map(d => formatWeekday(d.date).slice(0, 2))} today={hud.week.length - 1}/>
      <Dial share={hud.activeDays / 30}><HoloFigure text={`${hud.activeDays}`} className="holo-num-ring"/><small>of 30 days</small></Dial>
    </div>}
    <HoloTable caption="Habits (each day's column: its check-ins against the habits due that day)" rows={[['Done today', `${hud.done} of ${hud.due} due`], ...hud.rings.map(r => [`${r.title} streak`, `${streakWords(r.streak, r.unit)} (best ${streakWords(r.best, r.unit)})`] as const),
      ...hud.week.map(d => [formatDate(d.date, {weekday: true, year: false}), `${d.checkins} ${plural(d.checkins, 'check-in')}${d.scheduled ? ` of ${d.scheduled} ${plural(d.scheduled, 'habit')} due` : ''}`] as const), ['Consistency', `${hud.activeDays} of the last 30 days with a check-in`]]}/>
  </div>;
}
