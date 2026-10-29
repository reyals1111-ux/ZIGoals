'use client';
import {useEffect, useId, useRef, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {usePlatform} from '../platform/use-platform';
import {FOCUS_LENGTHS, focusNote, withFocusNote} from '../../lib/focus-session';
import {addSession, finishTally, gardenOf, newFocusId, onVisibility, startTally, tallyAt, type Tally} from '../../lib/focus-sessions/engine';
import {FOCUS_SESSIONS, type FocusSessionEntry} from '../../lib/focus-sessions/schema';
import {localDate} from '../../lib/local-date';
import {formatNumber} from '../../lib/visual-format';

/**
 * Session AJ (item 34; owner decision D13): Focus Sessions on My Universe, extending Session AI's goal timer. Choose 15, 25
 * or 50 minutes (and a goal, if you like); a sprout grows while this page stays open and in front. The web cannot block
 * other apps: ZIGoals only notices when this page is hidden and counts that time as away. A session that runs its length
 * with little time away grows; one ended early, or mostly away, withers — and is kept in the garden either way. Nothing is
 * written until the session ends; a finished session can add its line to the goal's notes on a tap (as on the goal page).
 * The sprout's growth is a size change only, smooth when motion is allowed and stepped with reduced motion or Motion Off.
 */
const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;
export function FocusGarden() {
  const record = useDeviceRecord(FOCUS_SESSIONS), platform = usePlatform(), id = useId();
  const [length, setLength] = useState<number>(25), [goalId, setGoalId] = useState(''), [tally, setTally] = useState<Tally | null>(null), [now, setNow] = useState(() => Date.now());
  const [last, setLast] = useState<FocusSessionEntry | null>(null), [status, setStatus] = useState('');
  const tick = useRef<number | null>(null);
  useEffect(() => {
    if (!tally) return;
    const visible = () => setTally(t => t ? onVisibility(t, document.visibilityState === 'hidden', Date.now()) : t);
    document.addEventListener('visibilitychange', visible);
    tick.current = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { document.removeEventListener('visibilitychange', visible); if (tick.current) window.clearInterval(tick.current); tick.current = null; };
  }, [tally === null]); // eslint-disable-line react-hooks/exhaustive-deps
  const finish = (endedEarly: boolean) => {
    if (!tally) return;
    const at = Date.now(), entry = finishTally(tally, at, endedEarly, localDate(), newFocusId(), goalId || undefined);
    setTally(null);
    if (!entry) { setStatus('Under a minute: nothing was kept.'); return; }
    setLast(entry);
    try { record.update(r => addSession(r, entry)); setStatus(entry.outcome === 'grown' ? 'It grew. It is in your garden.' : 'It withered, and it is kept in your garden. Every session counts.'); }
    catch { setStatus('The session could not be saved on this device.'); }
  };
  const progress = tally ? Math.min(1, tallyAt(tally, now).elapsed / (tally.plannedMinutes * 60)) : 0;
  useEffect(() => { if (tally && progress >= 1) finish(false); });
  const goals = platform.loaded && !platform.error ? platform.data.goals.filter(g => g.status !== 'closed' && !g.locked) : [];
  const addNote = () => {
    if (!last?.goalId) return;
    const line = focusNote(last.focusedSeconds / 60, last.day); if (!line) return;
    platform.update(s => ({...s, goals: s.goals.map(g => g.id === last.goalId ? {...g, notes: withFocusNote(g.notes, line)} : g)})).then(() => { setStatus(`Added to the goal's notes: ${line}.`); setLast(null); }, () => setStatus('The note was not saved.'));
  };
  const garden = record.loaded && !record.unreadable ? gardenOf(record.data, localDate()) : null;
  const left = tally ? Math.max(0, tally.plannedMinutes * 60 - tallyAt(tally, now).elapsed) : 0;
  return <section id="focus" className="panel focus-garden" aria-labelledby={`${id}-t`}>
    <p className="eyebrow">FOCUS SESSIONS</p>
    <h2 id={`${id}-t`}>Grow something while you focus</h2>
    <div className="focus-stage" data-state={tally ? 'growing' : last?.outcome ?? 'idle'}>
      <svg className="focus-sprout" viewBox="0 0 60 60" aria-hidden="true" style={{'--grow': tally ? 0.25 + progress * 0.75 : last?.outcome === 'grown' ? 1 : last ? 0.6 : 0.25} as React.CSSProperties}>
        <path d="M30 56 V30" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <path d="M30 36 C18 34 14 24 16 18 C26 20 30 28 30 36Z M30 30 C40 28 46 18 44 12 C34 14 30 22 30 30Z" fill="currentColor"/>
      </svg>
      <p role="status" className="focus-status">{tally ? `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')} left${tally.hiddenSince !== null ? ' · away' : ''}` : status}</p>
    </div>
    {!tally ? <div className="focus-controls">
      <div className="picker-tabs" role="group" aria-label="Length">{FOCUS_LENGTHS.map(m => <button key={m} type="button" aria-pressed={length === m} onClick={() => setLength(m)}>{m} min</button>)}</div>
      {goals.length > 0 && <label>For a goal (optional)<select value={goalId} onChange={e => setGoalId(e.target.value)}><option value="">No goal</option>{goals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>}
      <button type="button" className="primary" onClick={() => { setStatus(''); setLast(null); const t = Date.now(); setTally(startTally(t, length)); setNow(t); }}>Start {length} minutes</button>
      {last?.goalId && last.outcome && focusNote(last.focusedSeconds / 60, last.day) && <button type="button" className="secondary" onClick={addNote}>Add to the goal&rsquo;s notes</button>}
    </div> : <div className="focus-controls"><button type="button" className="secondary" onClick={() => finish(true)}>End early</button></div>}
    {garden && (garden.grown + garden.withered > 0) && <p className="focus-garden-line">Your garden: {plural(garden.grown, 'grown')}, {plural(garden.withered, 'withered')} (kept). This week: {plural(garden.weekMinutes, 'minute')} of focus in {plural(garden.weekSessions, 'session')}.</p>}
    <p className="fine">Honest note: a web page cannot block other apps or sites. ZIGoals only notices when this page is hidden and counts that time as away. Nothing is saved until a session ends.</p>
  </section>;
}
