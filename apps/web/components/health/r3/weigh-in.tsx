'use client';
import Link from 'next/link';
import {useId, useState} from 'react';
import type {HealthData} from '../../../lib/health';
import {NOTIFY_PREFS, typeOn} from '../../../lib/notify/prefs';
import {REMINDERS_PLAN, quietHours} from '../../../lib/reminders-plan/schema';
import {inQuiet} from '../../../lib/notify/zone';
import {DEFAULT_WEIGH_IN, weighedInOn, WEEKDAY_BITS, weighInOf, weighInWords, withWeighIn, type WeighIn} from '../../../lib/weigh-in';
import {formatClock} from '../../../lib/visual-format';
import {deviceSettingFailureMessage} from '../../../lib/storage-error-copy';
import {useDeviceRecord} from '../../ai/use-device-record';
import './health-r3.css';

/**
 * Session AV lane 2 (health r3; LEDGER #286, Carb Manager's weigh-in reminders): Health → Weight → "Weigh-in reminder":
 * off until set; every day, on chosen weekdays, or once a month, at a chosen time; skipped once a weight is logged that
 * day. It comes from this device's notifications, which the card says plainly when they are off; it never says a weight.
 */
export default function WeighInCard({data, today}: {data: HealthData; today: string}) {
  const prefs = useDeviceRecord(NOTIFY_PREFS), plan = useDeviceRecord(REMINDERS_PLAN), id = useId(), [said, setSaid] = useState('');
  const saved = weighInOf(prefs.data), [draft, setDraft] = useState<WeighIn | null>(null), w = draft ?? saved ?? DEFAULT_WEIGH_IN;
  if (!prefs.loaded) return null;
  const set = (patch: Partial<WeighIn>) => { setDraft({...w, ...patch}); setSaid(''); };
  const save = (next: WeighIn | null) => {
    try { prefs.update(p => withWeighIn(p, next)); setDraft(null); setSaid(next ? `Weigh-in reminder set: ${weighInWords(next, formatClock)}.` : 'Weigh-in reminder off.'); }
    catch (e) { setSaid(`Not kept on this device. ${deviceSettingFailureMessage(e)}`); }
  };
  const valid = /^\d\d:\d\d$/.test(w.time) && (w.repeat !== 'weekdays' || !!w.weekdays), quiet = inQuiet(w.time, quietHours(plan.data)), loggedToday = weighedInOn(data, today);
  return <section className="panel r3-weigh-in" aria-labelledby={`${id}-title`}>
    <p className="eyebrow">A GENTLE NUDGE</p><h2 id={`${id}-title`}>Weigh-in reminder</h2>
    <p>{saved ? <><strong>{weighInWords(saved, formatClock)}</strong>{loggedToday ? '. A weight is logged today, so today’s reminder stays quiet.' : '.'}</> : 'Off. Choose when you like to weigh in; the reminder is skipped on a day a weight is already logged, and never says a weight.'}</p>
    <fieldset className="r3-choices"><legend>How often</legend>
      {([['daily', 'Every day'], ['weekdays', 'On chosen days'], ['monthly', 'Once a month']] as const).map(([value, label]) => <label key={value} className="r3-choice"><input type="radio" name={`${id}-repeat`} value={value} checked={w.repeat === value} onChange={() => set({repeat: value, ...(value === 'weekdays' && !w.weekdays ? {weekdays: 1} : {}), ...(value === 'monthly' && !w.day ? {day: 1} : {})})}/><span>{label}</span></label>)}
    </fieldset>
    {w.repeat === 'weekdays' && <fieldset className="r3-choices" aria-describedby={!valid ? `${id}-days` : undefined}><legend>Days</legend>
      {WEEKDAY_BITS.map(([short, long, bit]) => <label key={bit} className="r3-choice"><input type="checkbox" checked={!!((w.weekdays ?? 0) & bit)} onChange={e => set({weekdays: e.target.checked ? (w.weekdays ?? 0) | bit : (w.weekdays ?? 0) & ~bit})}/><span aria-hidden="true">{short}</span><span className="sr-only">{long}</span></label>)}
    </fieldset>}
    {w.repeat === 'weekdays' && !w.weekdays && <p className="field-error" id={`${id}-days`} role="alert">Choose at least one day.</p>}
    <div className="health-form-grid">
      {w.repeat === 'monthly' && <label className="field"><span>Day of the month</span><select value={w.day ?? 1} onChange={e => set({day: Number(e.target.value)})}>{Array.from({length: 28}, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}</select></label>}
      <label className="field"><span>Time</span><input type="time" value={w.time} onChange={e => set({time: e.target.value})}/></label>
    </div>
    {quiet && <p className="fine">That time is inside your quiet hours, so the reminder would not be sent. Choose another time, or change quiet hours in <Link className="text-link" href="/app/settings#reminders">Settings → Reminders</Link>.</p>}
    <div className="actions"><button type="button" className="primary" disabled={!valid || (!draft && !!saved)} onClick={() => save(w)}>{saved ? 'Save the reminder' : 'Remind me to weigh in'}</button>{saved && <button type="button" className="quiet" onClick={() => save(null)}>Turn it off</button>}{draft && <button type="button" className="quiet" onClick={() => setDraft(null)}>Cancel</button>}</div>
    {saved && prefs.data.here !== true && <p className="fine">Notifications are off on this device, so the reminder cannot reach you yet. Turn them on in <Link className="text-link" href="/app/settings#notifications">Settings → Notifications</Link>.</p>}
    {saved && prefs.data.here === true && !typeOn(prefs.data, 'weighIn') && <p className="fine">&ldquo;Weigh-in&rdquo; is switched off in <Link className="text-link" href="/app/settings#notifications">Settings → Notifications</Link>.</p>}
    <p className="fine" role="status" aria-live="polite">{said}</p>
  </section>;
}
