'use client';
import {useEffect, useRef, useState} from 'react';
import {minutesMoved, moveStep, pauseMove, resumeMove, startMove, stepLeft, STRETCH_PREFIX, stretchById, stretchMinutes, STRETCHES, tickMove, type MoveRun} from '../../../lib/calm/stretches';
import {newHealthId, saveActivity} from '../../../lib/health';
import {DEFAULT_BELLS} from '../../../lib/meditation/engine';
import {ring} from '../../../lib/meditation/bells';
import {minutesText} from '../../../lib/meditation/stats';
import {plainErrorMessage} from '../../../lib/plain-error';
import {useHealth} from '../use-health';
import {useWakeLock} from './meditation-session';
import type {MeditationStore} from './use-meditation';
import './calm.css';

/**
 * Session AV lane 2 (habits pillar; LEDGER #81, Calm's Daily Move): "Move gently" — five short stretch sequences written
 * for ZIGoals (lib/calm/stretches.ts), in English or Dutch, played one step at a time: the step's name and written cue,
 * its seconds left, Back / Next / Pause, a soft bell between steps (your meditation bell) and the screen kept on. At the
 * end the minutes actually moved can be saved to Health's activity log ("Stretch: …"), where Today, the weekly review
 * and a linked exercise habit count them. Minutes only: no calorie figure, ever. A reload ends the sequence (nothing
 * half-saved).
 */
export default function DailyMove({store, today}: {store: MeditationStore; today: string}) {
  const health = useHealth();
  const [chosen, setChosen] = useState(STRETCHES[0]!.id), [lang, setLang] = useState<'en' | 'nl'>('en'), [run, setRun] = useState<MoveRun | null>(null), [now, setNow] = useState(() => Date.now());
  const [note, setNote] = useState(''), [busy, setBusy] = useState(false), [said, setSaid] = useState('');
  const seq = stretchById(run?.seq ?? chosen) ?? STRETCHES[0]!, bells = store.meditation.bells ?? {...DEFAULT_BELLS, updatedAt: ''};
  const active = !!run && !run.finished && run.pausedAt === undefined;
  useWakeLock(active);
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => { const t = Date.now(); setNow(t); setRun(r => r ? tickMove(r, t) : r); }, 250);
    return () => window.clearInterval(timer);
  }, [active]);
  // A soft bell and a polite announcement each time the step changes (and at the end); never every second.
  const lastStep = useRef<string>('');
  useEffect(() => {
    if (!run) { lastStep.current = ''; return; }
    const key = run.finished ? 'end' : String(run.step);
    if (lastStep.current && lastStep.current !== key) void ring(bells.sound, bells.volume);
    if (lastStep.current !== key) setSaid(run.finished ? (lang === 'nl' ? 'Klaar.' : 'Done.') : `${run.step + 1} / ${seq.steps.length}: ${seq.steps[run.step]![lang].name}`);
    lastStep.current = key;
  }, [run, bells.sound, bells.volume, lang, seq]);
  const heading = useRef<HTMLHeadingElement>(null), begin = useRef<HTMLButtonElement>(null), wasRunning = useRef(false);
  useEffect(() => {
    if (run && !wasRunning.current) heading.current?.focus();
    if (!run && wasRunning.current) begin.current?.focus();
    wasRunning.current = !!run;
  }, [run]);
  useEffect(() => { if (run?.finished) heading.current?.focus(); }, [run?.finished]);
  const at = () => Date.now();
  function start() { setNote(''); setNow(Date.now()); setRun(startMove(chosen, Date.now())); void ring(bells.sound, bells.volume); }
  async function save() {
    if (!run) return;
    const minutes = minutesMoved(run, at());
    if (minutes < 1) { setRun(null); setNote('Less than a minute: nothing to save.'); return; }
    setBusy(true);
    try {
      await health.update(h => saveActivity(h, {id: newHealthId(), date: today, name: `${STRETCH_PREFIX}${seq.en}`, steps: 0, minutes}, new Date().toISOString()));
      setRun(null); setNote(`Saved to Health’s activity: ${minutesText(minutes)} of stretching.`);
    } catch (error) { setNote(plainErrorMessage(error, 'Could not save. Try again.')); }
    finally { setBusy(false); }
  }
  const T = (en: string, nl: string) => lang === 'nl' ? nl : en;
  if (run) {
    const moved = minutesMoved(run, now);
    if (run.finished) return <section className="move-run" aria-labelledby="move-done-title" lang={lang}>
      <h3 id="move-done-title" tabIndex={-1} ref={heading}>{T(`${seq.en}: done`, `${seq.nl}: klaar`)}</h3>
      <p lang="en">{moved >= 1 ? `${minutesText(moved)} of gentle stretching. Save the minutes to Health’s activity, or let them go.` : 'Less than a minute: nothing to save.'}</p>
      <p className="meditation-today-actions" lang="en">
        {moved >= 1 && <button type="button" className="primary" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : `Save ${minutesText(moved)}`}</button>}
        <button type="button" className="secondary" disabled={busy} onClick={() => { setRun(null); setNote(moved >= 1 ? 'Not saved.' : ''); }}>{moved >= 1 ? 'Don’t save' : 'Close'}</button>
      </p>
      {note && <p role="alert" lang="en">{note}</p>}
      <p className="sr-only" aria-live="polite">{said}</p>
    </section>;
    const step = seq.steps[run.step]!, left = stepLeft(run, now), paused = run.pausedAt !== undefined;
    return <section className="move-run" aria-labelledby="move-step-title" lang={lang}>
      <p className="eyebrow">{T(seq.en, seq.nl)} · {T('step', 'stap')} {run.step + 1} / {seq.steps.length}{paused ? ` · ${T('paused', 'gepauzeerd')}` : ''}</p>
      <h3 id="move-step-title" tabIndex={-1} ref={heading}>{step[lang].name}</h3>
      <p className="move-cue">{step[lang].cue}</p>
      <p className="move-left" role="timer" aria-label={T(`${left} seconds left of this step`, `nog ${left} seconden van deze stap`)}><strong aria-hidden="true">{left}</strong><span aria-hidden="true"> s</span></p>
      <div className="move-bar" aria-hidden="true"><span style={{width: `${Math.round(((step.seconds - left) / step.seconds) * 100)}%`}}/></div>
      <ol className="move-steps" aria-label={T('The steps', 'De stappen')}>{seq.steps.map((x, i) => <li key={x.en.name} aria-current={i === run.step ? 'step' : undefined} data-done={i < run.step ? 'yes' : undefined}>{x[lang].name}</li>)}</ol>
      <p className="meditation-today-actions" lang="en">
        {paused ? <button type="button" className="primary" onClick={() => setRun(r => r && resumeMove(r, at()))}>Resume</button> : <button type="button" className="secondary" onClick={() => setRun(r => r && pauseMove(r, at()))}>Pause</button>}
        <button type="button" className="quiet" onClick={() => setRun(r => r && moveStep(r, at(), -1))} disabled={run.step === 0}>Back</button>
        <button type="button" className="quiet" onClick={() => setRun(r => r && moveStep(r, at(), 1))}>{run.step + 1 === seq.steps.length ? 'Finish' : 'Next step'}</button>
        <button type="button" className="quiet" onClick={() => setRun(r => r && moveStep({...r, step: seq.steps.length - 1}, at(), 1))}>End now</button>
      </p>
      <p className="fine" lang="en">Move gently and never into pain. Stop if anything hurts or you feel unwell. {moved >= 1 ? `${minutesText(moved)} so far.` : ''}</p>
      <p className="sr-only" aria-live="polite">{said}</p>
    </section>;
  }
  return <div className="move-pick" lang={lang}>
    <fieldset className="calm-choices"><legend>{T('Choose a stretch', 'Kies een rekoefening')}</legend>
      {STRETCHES.map(q => <label key={q.id} className="calm-choice"><input type="radio" name="move-sequence" checked={chosen === q.id} onChange={() => setChosen(q.id)}/><span><strong>{q[lang]}</strong><small>{stretchMinutes(q)} min · {q.steps.length} {T('stretches', 'oefeningen')}</small></span></label>)}
    </fieldset>
    <ol className="meditation-today-steps">{seq.steps.map(x => <li key={x.en.name}><strong>{x[lang].name}</strong> · {x[lang].cue} <small>({x.seconds} s)</small></li>)}</ol>
    <p className="meditation-today-actions" lang="en">
      <button ref={begin} type="button" className="primary" onClick={start}>Begin · {stretchMinutes(seq)} min</button>
      <button type="button" className="quiet" lang={lang === 'en' ? 'nl' : 'en'} onClick={() => setLang(l => l === 'en' ? 'nl' : 'en')}>{lang === 'en' ? 'In het Nederlands' : 'In English'}</button>
    </p>
    <p role="status" className="fine" lang="en">{note}</p>
    <p className="fine" lang="en">Written cues with a timer, saved as activity minutes in Health (no calorie figure). Gentle movement, not medical advice: stop if anything hurts.</p>
  </div>;
}
