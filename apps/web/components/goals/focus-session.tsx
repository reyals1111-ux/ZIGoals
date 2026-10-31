'use client';
import {useEffect, useRef, useState} from 'react';
import {startSoundscape} from '../music/soundscape-start';
import {FOCUS_LENGTHS, focusNote, withFocusNote} from '../../lib/focus-session';
import {localDate} from '../../lib/local-date';
import {usePlatform} from '../platform/use-platform';

/**
 * Session AI (B3: a focus session tied to a goal): a timer of 15, 25 or 50 minutes on the goal's page; when it ends, or is
 * stopped after a minute or more, one tap adds "Focus session: N min (day)" to the goal's notes. Nothing is written
 * before that tap; the timer runs only while this page is open.
 */
export function FocusSession({goalId, writable}: {goalId: string; writable: boolean}) {
  const platform = usePlatform();
  const [length, setLength] = useState<number>(25), [startedAt, setStartedAt] = useState<number | null>(null), [now, setNow] = useState(() => Date.now());
  const [done, setDone] = useState<number | null>(null), [note, setNote] = useState('');
  const tick = useRef<number | null>(null);
  useEffect(() => () => { if (tick.current) window.clearInterval(tick.current); }, []);
  const elapsed = startedAt === null ? 0 : (now - startedAt) / 60000, left = Math.max(0, length - elapsed);
  useEffect(() => { if (startedAt !== null && left <= 0) finish(length); }); // eslint-disable-line react-hooks/exhaustive-deps
  const [sound, setSound] = useState(false);
  // Session AK (MUSIC): the focus sound starts inside the tap (iPhone and iPad allow sound only then).
  function start() { if (sound) void startSoundscape('focus'); setDone(null); setNote(''); const t = Date.now(); setStartedAt(t); setNow(t); tick.current = window.setInterval(() => setNow(Date.now()), 1000); }
  function finish(minutes: number) { if (tick.current) window.clearInterval(tick.current); tick.current = null; setStartedAt(null); setDone(minutes); }
  const add = () => {
    const line = done === null ? null : focusNote(done, localDate());
    if (!line) return;
    platform.update(s => ({...s, goals: s.goals.map(g => g.id === goalId ? {...g, notes: withFocusNote(g.notes, line)} : g)})).then(() => { setNote(`Added to the goal's notes: ${line}.`); setDone(null); }, cause => setNote(cause instanceof Error ? cause.message : 'The note could not be saved.'));
  };
  const mmss = `${Math.floor(left)}:${String(Math.floor((left % 1) * 60)).padStart(2, '0')}`;
  return <div className="goal-focus">
    {startedAt === null ? <>
      <div role="radiogroup" aria-label="Focus length" className="goal-focus-lengths">{FOCUS_LENGTHS.map(m => <label key={m}><input type="radio" name="focus-length" checked={length === m} onChange={() => setLength(m)} /> {m} min</label>)}</div>
      <label className="check"><input type="checkbox" checked={sound} onChange={e => setSound(e.target.checked)} /> Play a focus sound (made on this device)</label>
      <button type="button" className="primary" onClick={start}>Start a focus session</button>
    </> : <>
      <p className="goal-focus-clock" role="timer" aria-live="off">{mmss}</p>
      <button type="button" className="secondary" onClick={() => finish(elapsed)}>Stop</button>
    </>}
    {done !== null && (focusNote(done, localDate()) ? <p>Focused {Math.floor(done)} min. {writable ? <button type="button" className="text-link" onClick={add}>Add it to the goal&rsquo;s notes</button> : <span className="fine">Unlock or reopen the goal to note it.</span>}</p> : <p className="fine">Under a minute: nothing to note.</p>)}
    {note && <p role="status" className="fine">{note}</p>}
    <p className="fine">The timer runs while this page is open; nothing is written until you add the note.</p>
  </div>;
}
