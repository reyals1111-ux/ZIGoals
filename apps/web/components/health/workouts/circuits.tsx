'use client';
import {useEffect, useId, useMemo, useRef, useState, type FormEvent} from 'react';
import {newHealthId, saveActivity} from '../../../lib/health';
import {withActivity} from '../../../lib/workouts/engine';
import {CIRCUIT_MOVES, CIRCUITS, circuitLine, circuitWorkout, LIMITS, MAX_MOVES, moveName, phaseWords, positionAt, removeCircuit, restoreCircuit, saveCircuit, timeline, totalSeconds, type Circuit, type CircuitDraft, type CircuitIssue} from '../../../lib/workouts/circuits';
import {ring} from '../../../lib/meditation/bells';
import {deviceSettingFailureMessage} from '../../../lib/storage-error-copy';
import {useDeviceRecord} from '../../ai/use-device-record';
import {showUndo} from '../../ui/undo-toast';
import {useHealth} from '../use-health';
import {useMotionAllowed} from '../meditation/breathing-visual';
import {useWorkouts} from './use-workouts';
import '../r3/health-r3.css';

/**
 * Session AV lane 2 (health r3; LEDGER #289, Nike Training Club's timed workouts): Health → Workouts → "Timed circuits":
 * make a circuit of the library's own moves (work seconds, rest seconds, rounds, rest between rounds), play it with a
 * countdown, the next move named and a bell at each change, and log it as a workout with its minutes (written to Health's
 * activity, as a finished workout is). Never calories. The countdown is a timer the screen reader is not made to read
 * every second: each change is said once. With Motion Off or reduced motion the progress bar does not glide. Its own chunk.
 */
const BLANK: CircuitDraft = {name: '', moves: [], work: '40', rest: '20', rounds: '3', roundRest: '60'};
const draftOf = (c: Circuit): CircuitDraft => ({name: c.name, moves: c.moves.map(m => m.exerciseId), work: String(c.workSeconds), rest: String(c.restSeconds), rounds: String(c.rounds), roundRest: String(c.roundRestSeconds)});
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

export default function Circuits({logDay}: {logDay: string}) {
  const rec = useDeviceRecord(CIRCUITS), [editing, setEditing] = useState<string | 'new' | null>(null), [playing, setPlaying] = useState<Circuit | null>(null), [said, setSaid] = useState('');
  if (!rec.loaded) return null;
  const keep = (change: Parameters<typeof rec.update>[0], text: string) => { try { rec.update(change); setSaid(text); return true; } catch (e) { setSaid(`Not kept on this device. ${deviceSettingFailureMessage(e)}`); return false; } };
  if (playing) return <Player circuit={playing} logDay={logDay} onClose={() => { setPlaying(null); requestAnimationFrame(() => document.getElementById(`circuit-play-${playing.id}`)?.focus()); }}/>;
  return <div className="r3-circuits">
    <p className="fine">Timed moves from the exercise library: work, rest and rounds, with a countdown, the next move named and a bell. Logged as a workout with its minutes. No calories are counted.</p>
    {rec.unreadable ? <p className="fine" role="alert">Your circuits on this device could not be read, so they cannot be changed here now.</p> : <>
      {rec.data.circuits.length ? <ul className="r3-list">{rec.data.circuits.map((c, at) => <li key={c.id}><span><strong>{c.name}</strong> <small className="fine">{circuitLine(c)}</small></span>
        <span className="r3-row-actions"><button type="button" className="secondary" id={`circuit-play-${c.id}`} onClick={() => setPlaying(c)} aria-label={`Play ${c.name}`}>Play</button>
          <button type="button" className="quiet" aria-label={`Edit ${c.name}`} aria-expanded={editing === c.id} onClick={() => setEditing(editing === c.id ? null : c.id)}>Edit</button>
          <button type="button" className="quiet" aria-label={`Remove ${c.name}`} onClick={() => { if (keep(r => removeCircuit(r, c.id), `${c.name} removed.`)) showUndo({message: `${c.name} removed.`, undone: `${c.name} is back.`, restore: () => rec.update(r => restoreCircuit(r, c, at))}); }}>Remove</button></span>
        {editing === c.id && <CircuitForm key={c.id} initial={draftOf(c)} editingId={c.id} onSave={(d, done) => { const r = saveCircuit(rec.data, d, new Date().toISOString(), c.id); if (!r.ok) return r.issue; if (keep(() => r.value, `${r.circuit.name} saved.`)) { setEditing(null); done(); } return null; }} onCancel={() => setEditing(null)}/>}
      </li>)}</ul> : <p className="health-empty-inline">No circuit yet. Pick a few moves — squats, push-ups, a plank — and how long each goes: 40 seconds on and 20 off, three rounds, is a good start.</p>}
      {editing === 'new' ? <CircuitForm initial={BLANK} onSave={(d, done) => { const r = saveCircuit(rec.data, d, new Date().toISOString()); if (!r.ok) return r.issue; if (keep(() => r.value, `${r.circuit.name} saved: Play starts it.`)) { setEditing(null); done(); } return null; }} onCancel={() => setEditing(null)}/>
        : <div className="actions"><button type="button" className="secondary" onClick={() => setEditing('new')}>+ New circuit</button></div>}
    </>}
    <p className="fine" role="status" aria-live="polite">{said}</p>
  </div>;
}

function CircuitForm({initial, editingId, onSave, onCancel}: {initial: CircuitDraft; editingId?: string; onSave: (d: CircuitDraft, done: () => void) => CircuitIssue | null; onCancel: () => void}) {
  const id = useId(), [d, setD] = useState(initial), [issue, setIssue] = useState<CircuitIssue | null>(null), [pick, setPick] = useState(CIRCUIT_MOVES[0]!.id);
  const set = (patch: Partial<CircuitDraft>) => { setD(x => ({...x, ...patch})); setIssue(null); };
  const submit = (e: FormEvent) => { e.preventDefault(); const problem = onSave(d, () => setD(BLANK)); if (problem) { setIssue(problem); document.getElementById(`${id}-${problem.field}`)?.focus(); } };
  const field = (key: 'work' | 'rest' | 'rounds' | 'roundRest', label: string) => <div><label className="field"><span>{label}</span><input id={`${id}-${key}`} type="text" inputMode="numeric" autoComplete="off" value={d[key]} aria-invalid={issue?.field === key ? true : undefined} aria-describedby={issue?.field === key ? `${id}-${key}-issue` : undefined} onChange={e => set({[key]: e.target.value})}/></label>{issue?.field === key && <p className="field-error" id={`${id}-${key}-issue`} role="alert">{issue.message}</p>}</div>;
  const total = useMemo(() => { const c = {moves: d.moves.map(exerciseId => ({exerciseId})), workSeconds: Number(d.work) || 0, restSeconds: Number(d.rest) || 0, rounds: Number(d.rounds) || 0, roundRestSeconds: Number(d.roundRest) || 0}; return d.moves.length ? totalSeconds(c) : 0; }, [d]);
  return <form className="health-form r3-circuit-form" aria-label={editingId ? 'Edit the circuit' : 'Make a circuit'} noValidate onSubmit={submit}>
    <div><label className="field"><span>Name</span><input id={`${id}-name`} type="text" maxLength={60} value={d.name} aria-invalid={issue?.field === 'name' ? true : undefined} aria-describedby={issue?.field === 'name' ? `${id}-name-issue` : undefined} onChange={e => set({name: e.target.value})}/></label>{issue?.field === 'name' && <p className="field-error" id={`${id}-name-issue`} role="alert">{issue.message}</p>}</div>
    <fieldset className="r3-moves" aria-describedby={issue?.field === 'moves' ? `${id}-moves-issue` : undefined}><legend>Moves, in order ({d.moves.length} of {MAX_MOVES})</legend>
      {d.moves.length > 0 && <ol className="r3-list">{d.moves.map((m, i) => <li key={`${m}-${i}`}><span>{moveName(m)}</span><span className="r3-row-actions">
        <button type="button" className="quiet" aria-label={`Move ${moveName(m)} earlier`} disabled={i === 0} onClick={() => { const x = [...d.moves]; [x[i - 1], x[i]] = [x[i]!, x[i - 1]!]; set({moves: x}); }}>↑</button>
        <button type="button" className="quiet" aria-label={`Move ${moveName(m)} later`} disabled={i === d.moves.length - 1} onClick={() => { const x = [...d.moves]; [x[i + 1], x[i]] = [x[i]!, x[i + 1]!]; set({moves: x}); }}>↓</button>
        <button type="button" className="quiet" aria-label={`Take out ${moveName(m)}`} onClick={() => set({moves: d.moves.filter((_, j) => j !== i)})}>Take out</button></span></li>)}</ol>}
      <div className="r3-toggle"><label className="field"><span>A move from the library</span><select id={`${id}-moves`} value={pick} onChange={e => setPick(e.target.value)}>{CIRCUIT_MOVES.map(e => <option key={e.id} value={e.id}>{e.name} ({e.category})</option>)}</select></label>
        <button type="button" className="secondary" disabled={d.moves.length >= MAX_MOVES} onClick={() => set({moves: [...d.moves, pick]})}>Add the move</button></div>
      {issue?.field === 'moves' && <p className="field-error" id={`${id}-moves-issue`} role="alert">{issue.message}</p>}
    </fieldset>
    <div className="health-form-grid">{field('work', `Work (seconds, ${LIMITS.work[0]}–${LIMITS.work[1]})`)}{field('rest', 'Rest after a move (seconds)')}{field('rounds', 'Rounds')}{field('roundRest', 'Rest between rounds (seconds)')}</div>
    {total > 0 && <p className="fine">About {Math.max(1, Math.round(total / 60))} min in all.</p>}
    <div className="actions"><button type="submit" className="primary">Save the circuit</button><button type="button" className="quiet" onClick={onCancel}>Cancel</button></div>
  </form>;
}

function Player({circuit, logDay, onClose}: {circuit: Circuit; logDay: string; onClose: () => void}) {
  const phases = useMemo(() => timeline(circuit), [circuit]), total = phases.length ? phases.at(-1)!.startsAt + phases.at(-1)!.seconds : 0;
  const workouts = useWorkouts(), health = useHealth(), motion = useMotionAllowed(), heading = useRef<HTMLHeadingElement>(null);
  const [run, setRun] = useState<{startedAt: number; base: number; since: number | null}>(() => ({startedAt: Date.now(), base: 0, since: Date.now()}));
  const [now, setNow] = useState(() => Date.now()), [bell, setBell] = useState(true), [announce, setAnnounce] = useState(''), [logged, setLogged] = useState<string | null>(null);
  const elapsed = Math.min(total, run.base + (run.since === null ? 0 : (now - run.since) / 1000)), done = elapsed >= total, at = positionAt(phases, elapsed);
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => { if (run.since === null || done) return; const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, [run.since, done]);
  const lastIndex = useRef(-1);
  useEffect(() => {
    const index = done ? phases.length : at?.index ?? -1;
    if (index === lastIndex.current) return;
    lastIndex.current = index;
    if (bell) void ring('chime', 55);
    queueMicrotask(() => setAnnounce(done ? `Circuit done: ${circuit.name}. Log it as a workout if you like.` : at ? phaseWords(at.phase, circuit.rounds, at.next) : ''));
  }, [at, done, phases.length, bell, circuit]);
  const paused = run.since === null;
  const pause = () => { const t = Date.now(); setRun(r => r.since === null ? {...r, since: t} : {...r, base: r.base + (t - r.since) / 1000, since: null}); setNow(t); };
  const skip = () => { if (!at) return; const t = Date.now(); setRun(r => ({...r, base: at.phase.startsAt + at.phase.seconds, since: r.since === null ? null : t})); setNow(t); };
  async function log() {
    setRun(r => ({...r, base: elapsed, since: null}));
    try {
      let made: ReturnType<typeof circuitWorkout> | undefined;
      workouts.update(w => { made = circuitWorkout(w, circuit, {date: logDay, startedAt: new Date(run.startedAt), playedSeconds: elapsed}); return made.workouts; });
      const minutes = Math.min(1440, Math.max(1, Math.round(elapsed / 60))), activityId = newHealthId();
      try { await health.update(h => saveActivity(h, {id: activityId, date: logDay, name: `Timed circuit: ${circuit.name}`.slice(0, 80), steps: 0, minutes}, new Date().toISOString())); workouts.update(w => withActivity(w, made!.workout.id, activityId)); setLogged(`Logged: ${circuit.name}, ${minutes} min, in your workouts and Health’s activity. No calories are counted.`); }
      catch { setLogged(`Logged in your workouts: ${circuit.name}, ${minutes} min. Its minutes could not be added to Health.`); }
    } catch (e) { setLogged(e instanceof Error ? e.message : 'The circuit was not logged.'); }
  }
  const share = total ? elapsed / total : 0;
  return <section className="r3-player" aria-labelledby={`player-${circuit.id}`} data-motion={motion ? 'on' : 'off'}>
    <h4 id={`player-${circuit.id}`} ref={heading} tabIndex={-1}>{circuit.name}</h4>
    {done ? <p className="r3-player-now">Done. {clock(Math.round(total))} in all.</p> : at && <>
      <p className="r3-player-kind">{at.phase.kind === 'work' ? `Round ${at.phase.round} of ${circuit.rounds} · move ${at.phase.move + 1} of ${circuit.moves.length}` : at.phase.kind === 'round-rest' ? 'Rest between rounds' : 'Rest'}</p>
      <p className="r3-player-now">{at.phase.kind === 'work' ? moveName(at.phase.exerciseId) : 'Rest'}</p>
      <p className="r3-player-count" role="timer" aria-live="off" aria-label={`${at.left} seconds left`}>{at.left}</p>
      <p className="fine">{at.phase.kind === 'work' ? (at.next ? `Next: ${moveName(at.next.exerciseId)}` : 'The last move') : `Next: ${moveName(at.phase.exerciseId)}`}{paused ? ' · paused' : ''}</p>
    </>}
    <div className="r3-player-bar" role="progressbar" aria-label="The circuit so far" aria-valuemin={0} aria-valuemax={Math.round(total)} aria-valuenow={Math.round(elapsed)} aria-valuetext={`${clock(Math.round(elapsed))} of ${clock(Math.round(total))}`}><i style={{width: `${share * 100}%`}}/></div>
    <div className="actions">
      {!done && <button type="button" className="primary" onClick={pause}>{paused ? 'Resume' : 'Pause'}</button>}
      {!done && <button type="button" className="secondary" onClick={skip}>Skip this part</button>}
      <button type="button" className="quiet" aria-pressed={bell} onClick={() => setBell(b => !b)}>Bell</button>
      {!logged && elapsed > 0 && <button type="button" className={done ? 'primary' : 'quiet'} onClick={() => void log()}>{done ? 'Log as a workout' : 'Stop and log what I did'}</button>}
      <button type="button" className="quiet" onClick={onClose}>{logged || done ? 'Close' : 'Stop without logging'}</button>
    </div>
    <p className="sr-only" role="status" aria-live="polite">{announce}</p>
    {logged && <p className="fine" role="status">{logged}</p>}
  </section>;
}
