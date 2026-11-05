'use client';
import {useMemo} from 'react';
import type {LayoutAttrs} from './layout-edit';
import type {HabitData} from '../lib/habits';
import {habitRhythm} from '../lib/bottom-week';
import {plural, unitFor} from '../lib/plural';
import {ArtNote} from './illustrations/art-note';
import {Shell} from './bottom-section-frame';

/** Habits: check-ins by weekday over 4 weeks, and best streaks. */
export function HabitRhythmSection({habits,today,...layout}:LayoutAttrs&{habits:HabitData;today:string}){
 const r=useMemo(()=>habitRhythm(habits,today),[habits,today]),max=Math.max(1,...r.byWeekday.map(d=>d.checkins));
 return <Shell layout={layout} id="bottom-habit-rhythm" eyebrow="YOUR RHYTHM" title={<>Consistency by weekday.</>} lede="Check-ins recorded over the last four weeks, and your best streaks.">
  <div className="bottom-two">
   <div className="bottom-weekday-bars" role="list" aria-label="Check-ins by weekday, last 4 weeks">{r.byWeekday.map(d=><div role="listitem" key={d.label} aria-label={`${d.label}: ${d.checkins} ${plural(d.checkins,'check-in')}`}><span className="bottom-bar-track" aria-hidden="true"><i style={{height:`${d.checkins/max*100}%`}}/></span><strong aria-hidden="true">{d.checkins}</strong><small aria-hidden="true">{d.label}</small></div>)}</div>
   <div className="bottom-streaks"><h3>Best streaks</h3>{r.streaks.length?<><ol>{r.streaks.map(s=><li key={s.title}><span>{s.title}</span><strong>{s.best} {unitFor(s.best,s.unit)}</strong><small>Now {s.current} {unitFor(s.current,s.unit)}</small></li>)}</ol>{/* Session AF Gate C (design critique): a card's 28 days can show blank (skipped) days beside an unbroken streak. */}<p className="bottom-note">Skipped days are rest days: a streak runs on through them.</p></>:<ArtNote pillar="habits"><p className="bottom-empty">Your first completed check-in starts a streak.</p></ArtNote>}</div>
  </div>
  {!r.total&&<p className="bottom-note">No check-ins in the last four weeks yet.</p>}
 </Shell>;
}
