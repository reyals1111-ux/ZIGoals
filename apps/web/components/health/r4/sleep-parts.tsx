'use client';
import {useEffect, useId, useRef, useState} from 'react';
import {formatMinutes} from '../../../lib/zone-time';
import {formatClock, formatTime} from '../../../lib/visual-format';
import {clockFromMidnight, deleteNight} from '../../../lib/sleep/engine';
import type {Sleep} from '../../../lib/sleep/schema';
import {EARLIER_BEFORE, LATER_AFTER, shiftWords, sleepTiming, TIMING_DAYS, TIMING_MIN_NIGHTS, TIMING_WORDS} from '../../../lib/sleep/timing';
import {sleepTipOf} from '../../../lib/sleep-tips';
import {beginNap, bellChoice, logNap, NAP_CHOICES, napClock, napEndsAt, napLeft, type NapRun} from '../../../lib/sleep/nap';
import {HEALTH_EXTRAS, healthExtrasSchema} from '../../../lib/health-extras';
import {ring, wakeAudio} from '../../../lib/meditation/bells';
import {deviceSettingFailureMessage} from '../../../lib/storage-error-copy';
import {useDeviceRecord} from '../../ai/use-device-record';
import {showUndo} from '../../ui/undo-toast';
import {useMotionAllowed} from '../meditation/breathing-visual';
import type {SleepStore} from '../sleep/use-sleep';
import '../r3/health-r3.css';
import './health-r4.css';

/**
 * Session AV lane 2, round 4 (health; Pillow, LEDGER #333, #334, #335): three parts of Health → Sleep, each in this lazy
 * chunk — "Your timing" (weekend nights beside weekday nights, an estimate), a sleep tip a day on the Sleep card (off
 * unless chosen) and the nap timer (a bell at the end while the page is open; the nap logged when it ends).
 */
const at = (m: number) => formatClock(clockFromMidnight(Math.round(m)));

/** "Your timing" (LEDGER #333): the middle of sleep on weekend and weekday nights over 30 days, and a word from it. */
export function SleepTiming({sleep, today}: {sleep: Sleep; today: string}) {
  const t = sleepTiming(sleep, today);
  return <section className="panel r4-timing" aria-labelledby="r4-timing-title">
    <h2 id="r4-timing-title">Your timing</h2>
    {!t ? <p className="health-empty-inline">Your timing shows once the last {TIMING_DAYS} days hold {TIMING_MIN_NIGHTS} weekend nights and {TIMING_MIN_NIGHTS} weekday nights. It sets the middle of your sleep on free days beside work days.</p> : <>
      <dl className="r4-facts">
        <div><dt>Middle of sleep, weekend nights</dt><dd>{at(t.free.mid)} <small className="fine">({t.free.nights} nights)</small></dd></div>
        <div><dt>Middle of sleep, weekday nights</dt><dd>{at(t.work.mid)} <small className="fine">({t.work.nights} nights)</small></dd></div>
      </dl>
      <p>{shiftWords(t, formatMinutes)}</p>
      <p>From your weekend nights you look like <strong>{TIMING_WORDS[t.word]}</strong>. <span className="health-estimate-tag">an estimate from your own nights</span></p>
      <details><summary>How this is worked out</summary><p className="fine">The middle of each night is halfway between going to sleep and waking. Weekend nights are the nights before Saturday and Sunday, when most people wake without an alarm; the middle of sleep on free days is the measure the Munich ChronoType Questionnaire uses (Roenneberg, Wirz-Justice and Merrow, 2003). A weekend middle before {at(EARLIER_BEFORE)} reads earlier, after {at(LATER_AFTER)} later, in between the middle. It describes your log, not a type to change, and it is not medical advice.</p></details>
    </>}
  </section>;
}

/** A sleep tip a day on Health's Sleep card (LEDGER #334): off unless chosen; English or Dutch. */
export function SleepTipCard({today}: {today: string}) {
  const rec = useDeviceRecord(HEALTH_EXTRAS), on = rec.loaded && !rec.unreadable && rec.data.sleepTips === true, id = useId();
  const [step, setStep] = useState(0), [lang, setLang] = useState<'en' | 'nl'>('en'), [said, setSaid] = useState('');
  if (!rec.loaded) return null;
  const tip = sleepTipOf(today, step);
  const set = (next: boolean) => { try { rec.update(r => healthExtrasSchema.parse({...r, sleepTips: next || undefined})); setSaid(next ? 'A sleep tip shows here each day.' : 'Sleep tips are off.'); } catch (e) { setSaid(`Not kept on this device. ${deviceSettingFailureMessage(e)}`); } };
  return <div className="r4-sleep-tip">
    {on && <section className="r3-tip" aria-labelledby={`${id}-tip`}>
      <h3 id={`${id}-tip`} lang={lang}>{lang === 'en' ? 'A sleep tip' : 'Een slaaptip'}</h3>
      <p lang={lang} aria-live="polite">{tip[lang]}</p>
      <div className="actions"><button type="button" className="quiet" lang={lang} onClick={() => setStep(n => n + 1)}>{lang === 'en' ? 'Another tip' : 'Nog een tip'}</button><button type="button" className="quiet" lang={lang === 'en' ? 'nl' : 'en'} onClick={() => setLang(lang === 'en' ? 'nl' : 'en')}>{lang === 'en' ? 'In het Nederlands' : 'In English'}</button></div>
    </section>}
    <div className="r3-toggle"><button type="button" className="quiet" aria-pressed={on} aria-describedby={`${id}-note`} disabled={rec.unreadable} onClick={() => set(!on)}>Show a sleep tip each day</button><span className="fine" id={`${id}-note`}>Small habits for the evening and the morning. Off unless you choose it.</span></div>
    <p className="fine" role="status" aria-live="polite">{said}</p>
  </div>;
}

type WakeLock = {release: () => Promise<void>};
/** "Start a nap" (LEDGER #335): 20, 30 or 90 minutes, a soft bell at the end while this page is open, the nap logged. */
export function NapTimer({store}: {store: SleepStore}) {
  const [run, setRun] = useState<NapRun | null>(null), [now, setNow] = useState(() => Date.now()), [bell, setBell] = useState(true), [said, setSaid] = useState('');
  const motion = useMotionAllowed(), lock = useRef<WakeLock | null>(null), heading = useRef<HTMLHeadingElement>(null), id = useId();
  const canWake = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  useEffect(() => { if (!run) return; const t = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(t); }, [run]);
  useEffect(() => () => { void lock.current?.release().catch(() => undefined); }, []);
  const left = run ? napLeft(run, now) : 0;
  async function finish(r: NapRun, endMs: number, rang: boolean) {
    setRun(null); void lock.current?.release().catch(() => undefined); lock.current = null;
    const made: {id: string | null} = {id: null};
    try {
      await store.update(s => { const next = logNap(s, r, endMs, store.zone, new Date()); if (!next) return s; made.id = next.nights.find(n => n.kind === 'nap' && Date.parse(n.start) === r.startedAt)?.id ?? null; return next; });
    } catch (e) { setSaid(e instanceof Error ? e.message : 'The nap could not be logged.'); return; }
    if (!made.id) { setSaid('Under ten minutes, so nothing was logged.'); return; }
    const end = Math.min(endMs, napEndsAt(r)), mins = Math.round((end - r.startedAt) / 60_000), line = `${formatTime(new Date(r.startedAt).toISOString(), {timeZone: store.zone})}–${formatTime(new Date(end).toISOString(), {timeZone: store.zone})}`;
    const text = `${rang ? 'Time to wake up. ' : ''}Nap logged: ${line}, ${mins} min.`;
    setSaid(text);
    const napId = made.id;
    showUndo({message: text, undone: 'The nap is no longer logged.', restore: () => store.update(s => s.nights.some(n => n.id === napId) ? deleteNight(s, napId) : s)});
    requestAnimationFrame(() => document.getElementById(`${id}-start`)?.focus());
  }
  useEffect(() => {
    if (!run || left > 0) return;
    if (bell) void ring('bowl', 50);
    void finish(run, napEndsAt(run), true);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once when the countdown reaches zero
  }, [left, run]);
  async function start(minutes: number) {
    const r = beginNap(minutes, bell, new Date().getTime(), () => void wakeAudio()); // the tap that starts the nap wakes the audio (review B4E-3)
    setRun(r); setNow(r.startedAt); setSaid('');
    if (canWake) { try { lock.current = await (navigator as unknown as {wakeLock: {request: (type: 'screen') => Promise<WakeLock>}}).wakeLock.request('screen'); } catch { lock.current = null; } }
    requestAnimationFrame(() => heading.current?.focus());
  }
  return <section className="r4-nap" aria-labelledby={`${id}-title`} data-motion={motion ? 'on' : 'off'}>
    <h3 id={`${id}-title`} ref={heading} tabIndex={-1}>{run ? `Napping: ${run.minutes} minutes` : 'Start a nap'}</h3>
    {!run ? <>
      <p className="fine">A soft bell rings at the end while this page stays open, and the nap is logged. {canWake ? 'The screen stays on while it runs.' : 'Keep the screen on: this browser may let it sleep.'} With the screen locked or the app closed it cannot ring.</p>
      <div className="actions" role="group" aria-label="Nap length">{NAP_CHOICES.map((c, i) => <button key={c.minutes} id={i === 0 ? `${id}-start` : undefined} type="button" className="secondary" onClick={() => void start(c.minutes)}>{c.en}: {c.minutes} min</button>)}</div>
      <div className="r3-toggle"><button type="button" className="quiet" aria-pressed={bell} onClick={() => setBell(bellChoice(!bell, () => void wakeAudio()))}>Bell at the end</button></div>
    </> : <>
      <p className="r4-nap-count" role="timer" aria-live="off" aria-label={`${napClock(left)} left`}>{napClock(left)}</p>
      <div className="r3-player-bar" role="progressbar" aria-label="The nap so far" aria-valuemin={0} aria-valuemax={run.minutes * 60} aria-valuenow={run.minutes * 60 - left}><i style={{width: `${(1 - left / (run.minutes * 60)) * 100}%`}}/></div>
      <p className="fine">Ends at {formatTime(new Date(napEndsAt(run)).toISOString(), {timeZone: store.zone})}.</p>
      <div className="actions"><button type="button" className="primary" onClick={() => void finish(run, Date.now(), false)}>I’m up: log the nap</button><button type="button" className="quiet" onClick={() => { setRun(null); void lock.current?.release().catch(() => undefined); lock.current = null; setSaid('The nap timer is stopped. Nothing was logged.'); requestAnimationFrame(() => document.getElementById(`${id}-start`)?.focus()); }}>Stop without logging</button></div>
    </>}
    <p className="fine" role="status" aria-live="polite">{said}</p>
  </section>;
}
