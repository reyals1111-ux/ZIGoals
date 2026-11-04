'use client';
import {useMemo} from 'react';
import type {WidgetSize} from '../../../lib/nova/store';
import {kcalWeek} from '../../../lib/nova/holo/health';
import {formatDate, formatWeekday} from '../../../lib/visual-format';
import {HoloFigure, HoloHidden, HoloReading, HoloTable, HoloUnread, Hearts, Histogram, NotShared, SegMeter, Spark, TickRing} from '../holo/parts';
import {useHealthHud, useHealthShared, usePillarShown} from '../holo/use-hud-data';
import '../holo/holo-parts.css';

/**
 * Session AL Part 11 (lane L8): "Health HUD" in neon pink — the day's calories on a ring with its tick scale, segmented
 * meters for protein, carbs, fat, water, sleep and steps against the person's own targets, hearts that fill by each
 * target's share, a heart-rate line only when real heart data was brought in, and (large, second pass) the week's calories
 * as a histogram with the calorie target as the line through it (a day without meals is an empty slot, never 0). Every figure is the Health page's own
 * (lib/nova/holo/health.ts); an unknown says "—" and why.
 */
export default function HealthHudWidget({size}: {size: WidgetSize}) {
  const shown = usePillarShown('health'), shared = useHealthShared(), {hud, loaded, error, health, day} = useHealthHud();
  const week = useMemo(() => size === 'L' && health.loaded && !health.error ? (() => { try { return kcalWeek(health.data, day); } catch { return null; } })() : null, [size, health.loaded, health.error, health.data, day]);
  if (!shown) return <HoloHidden pillar="Health"/>;
  if (!loaded) return <HoloReading/>;
  if (error || !hud) return <HoloUnread what="Your Health journal"/>;
  const all = [...hud.macros, hud.water, hud.sleep, hud.steps], meters = size === 'S' ? [hud.water] : size === 'M' ? [hud.macros[0]!, hud.water, hud.sleep, hud.steps] : all;
  const k = hud.kcal;
  return <div className="holo-health" data-size={size}>
    <div className="holo-split">
      <TickRing share={k.share} size={size === 'S' ? 64 : size === 'M' ? 108 : 132} lens={size === 'L'}>
        <HoloFigure text={k.value === null ? '—' : k.text.replace(/ kcal$/, '')} className="holo-num-ring"/>
        <small>{k.value === null ? 'kcal' : k.targetText ? `of ${k.targetText}` : 'kcal'}</small>
      </TickRing>
      <div className="holo-meters">
        {size !== 'S' && k.value === null && <p className="holo-note holo-note-line">{k.note}</p>}
        {meters.map(m => <SegMeter key={m.key} label={m.label} share={m.share} text={m.text} targetText={m.targetText} note={m.value === null ? m.note : m.target ? null : m.note} compact={size !== 'L'}/>)}
      </div>
    </div>
    {size === 'L' && <Hearts hearts={hud.hearts}/>}
    {week && week.known > 0 && <div className="holo-week-kcal">
      <p className="holo-label">This week · kcal{week.targetText ? <span className="holo-ref-key"> · line: your target, {week.targetText}</span> : null}</p>
      <Histogram values={week.days.map(d => d.kcal)} line={week.target} labels={week.days.map(d => formatWeekday(d.date).slice(0, 2))}/>
    </div>}
    {size === 'L' && hud.heart && <div className="holo-heartline">
      <span className="holo-label">{hud.heart.kind === 'resting' ? 'Resting heart rate' : 'Average heart rate'} · <b className="holo-num">{hud.heart.latest} bpm</b> · {formatDate(hud.heart.points.at(-1)!.date, {year: false})}</span>
      <Spark values={hud.heart.points.map(p => p.bpm)} height={44}/>
    </div>}
    {!shared && size !== 'S' && <NotShared/>}
    <HoloTable caption="Health today, against your targets" rows={[[k.label, `${k.text}${k.targetText ? ` of ${k.targetText}` : ''}${k.note ? ` (${k.note})` : ''}`], ...all.map(m => [m.label, `${m.text}${m.targetText ? ` of ${m.targetText}` : ''}${m.note ? ` (${m.note})` : ''}`] as const),
      ...(week && week.known > 0 ? week.days.map(d => [`Calories ${formatDate(d.date, {weekday: true, year: false})}`, d.text] as const) : []),
      ...(hud.heart ? [[hud.heart.kind === 'resting' ? 'Resting heart rate' : 'Average heart rate', hud.heart.points.map(p => `${formatDate(p.date, {year: false})}: ${p.bpm} bpm`).join('; ')] as const] : [])]}/>
  </div>;
}
