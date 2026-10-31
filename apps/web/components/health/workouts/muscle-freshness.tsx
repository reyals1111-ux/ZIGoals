'use client';
import {useId, useMemo, useState} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {plural} from '../../../lib/plural';
import {MUSCLE_GROUPS, RECOVERY_DAYS, type MuscleGroup} from '../../../lib/workouts/depth';
import type {CATEGORIES, Workouts} from '../../../lib/workouts/schema';
import {BAND_WORDS, BODY_HEADS, BODY_VIEWBOX, BODY_VIEWS, MAX_RECOVERY_DAYS, MIN_RECOVERY_DAYS, MUSCLE_RECOVERY, bandOf, freshTodayLine, freshnessWithRecovery, recoveryDaysOf, setRecoveryDays} from '../../../lib/muscle-freshness/model';
import {deviceSettingFailureMessage} from '../../../lib/storage-error-copy';
import './muscle-freshness.css';

/**
 * Session AK (COMPETITORS.md T3, item 8): each muscle group's freshness, an estimate from the person's own sets, as a front
 * and back body diagram (each group named beside it with its percentage and a word, so colour is never the only signal)
 * and the list, with recovery days the person can change per group (`zigoals:muscle-recovery:v1`, on this device).
 * Part of the muscle-groups view, which loads only when shown.
 */
type Lookup = (exerciseId: string) => typeof CATEGORIES[number] | null;
export default function MuscleFreshness({w, lookup, today}: {w: Workouts; lookup: Lookup; today: string}) {
  const id = useId(), record = useDeviceRecord(MUSCLE_RECOVERY), recovery = record.loaded && !record.unreadable ? record.data : null;
  const rows = useMemo(() => freshnessWithRecovery(w, lookup, new Date(), today, recovery), [w, lookup, today, recovery]);
  const of = new Map(rows.map(r => [r.muscle, r])), line = freshTodayLine(rows);
  const [editing, setEditing] = useState(false), [note, setNote] = useState('');
  const shown = (m: MuscleGroup) => { const f = of.get(m)?.freshness ?? null; return f === null ? '?' : `${f}%`; };
  const summary = rows.map(r => `${r.muscle} ${r.freshness === null ? 'not in your log yet' : `about ${r.freshness}%, ${BAND_WORDS[bandOf(r.freshness)]}`}`).join('; ');
  const change = (m: MuscleGroup, value: string) => {
    try { record.update(r => setRecoveryDays(r, m, value === '' ? null : Number(value))); setNote(`${m}: ${value === '' || Number(value) === RECOVERY_DAYS ? `back to ${RECOVERY_DAYS} days` : `${value} ${plural(Number(value), 'day')} to recover`}, on this device.`); }
    catch (e) { setNote(`Not kept on this device. ${deviceSettingFailureMessage(e)}`); }
  };
  return <section className="muscle-freshness" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>Freshness <small className="fine">(an estimate)</small></h3>
    {line && <p>{line}.</p>}
    <svg className="muscle-freshness-body" viewBox={BODY_VIEWBOX} role="img" aria-label={`Front and back of a body, each muscle group shaded by its estimated freshness. ${summary}.`}>
      {BODY_HEADS.map((h, i) => <circle key={i} className="mf-head" cx={h.cx} cy={h.cy} r={h.r}/>)}
      {BODY_VIEWS.map(v => <g key={v.view}>
        <text className="mf-view" x={v.cx} y={226} textAnchor="middle">{v.view === 'front' ? 'Front' : 'Back'}</text>
        {v.shapes.map((s, i) => { const band = bandOf(of.get(s.muscle)?.freshness ?? null); return s.kind === 'rect'
          ? <rect key={i} className={`mf-region mf-${band}`} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r}/>
          : <ellipse key={i} className={`mf-region mf-${band}`} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry}/>; })}
        {v.labels.map(l => <g key={l.muscle}>
          <line className="mf-leader" x1={l.anchor === 'start' ? 66 : 274} y1={l.y - 3} x2={l.to.x} y2={l.to.y}/>
          <text className="mf-label" x={l.x} y={l.y - 4} textAnchor={l.anchor}>{l.muscle}</text>
          <text className="mf-value" x={l.x} y={l.y + 8} textAnchor={l.anchor}>{shown(l.muscle)}</text>
        </g>)}
      </g>)}
    </svg>
    <ul className="workouts-freshness">{rows.map(f => <li key={f.muscle}>
      <span className="workouts-freshness-name">{f.muscle}</span>
      {f.freshness === null ? <span className="fine">Not in your log yet</span> : <>
        <span className="workouts-freshness-track" aria-hidden="true"><span className="workouts-freshness-fill" style={{inlineSize: `${f.freshness}%`}}/></span>
        <span>About {f.freshness}% recovered, {BAND_WORDS[bandOf(f.freshness)]} · {f.daysSince === 0 ? 'trained today' : `${f.daysSince} ${plural(f.daysSince!, 'day')} since`}{recoveryDaysOf(recovery, f.muscle) !== RECOVERY_DAYS ? ` · your ${recoveryDaysOf(recovery, f.muscle)}-day recovery` : ''}</span>
      </>}
    </li>)}</ul>
    <details className="muscle-freshness-days" open={editing} onToggle={e => setEditing((e.currentTarget as HTMLDetailsElement).open)}>
      <summary>Recovery days per muscle group</summary>
      {editing && <div className="muscle-freshness-grid">{MUSCLE_GROUPS.map(m => <label key={m} className="field"><span>{m}</span>
        <select value={String(recoveryDaysOf(recovery, m))} onChange={e => change(m, e.target.value)} disabled={record.unreadable}>
          {Array.from({length: MAX_RECOVERY_DAYS - MIN_RECOVERY_DAYS + 1}, (_, i) => i + MIN_RECOVERY_DAYS).map(n => <option key={n} value={n}>{n} {plural(n, 'day')}{n === RECOVERY_DAYS ? ' (usual)' : ''}</option>)}
        </select></label>)}</div>}
      {record.unreadable && <p className="fine" role="alert">Your recovery days on this device could not be read, so the usual {RECOVERY_DAYS} days are used. Nothing was changed.</p>}
      {note && <p className="fine" role="status">{note}</p>}
    </details>
    <p className="fine">An estimate from your own sets, not a measurement: each working set counts as some effort for its muscle groups, recovering steadily over about {RECOVERY_DAYS} days unless you chose otherwise above. How you feel matters more. This is information, not advice.</p>
  </section>;
}
