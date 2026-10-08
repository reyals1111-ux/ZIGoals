'use client';
import Link from 'next/link';
import {useState} from 'react';
import {deleteSession} from '../../../lib/meditation/engine';
import {PATTERNS} from '../../../lib/meditation/breathing';
import {meditationSummary, minutesText, sessionDay, weeklyBars} from '../../../lib/meditation/stats';
import type {MeditationSession as Session} from '../../../lib/meditation/schema';
import {wallClock} from '../../../lib/zone-time';
import {NebulaFlow} from '../../nebula-flow';
import {MeditationWeeksChart} from './meditation-chart';
import {BeginForm, BellsForm, ManualForm, MeditationGoalForm} from './meditation-forms';
import {MeditationSession} from './meditation-session';
import {MeditationReminderSetting} from './meditation-reminder';
import {useMeditation} from './use-meditation';
import {AmbientPlayer} from '../../audio/ambient-player';
import '../sleep/sleep.css';
import './meditation.css';
import {sourceName} from '../../../lib/health-sources';

const KIND_WORDS: Record<Session['kind'], string> = {timer: 'Sitting', breathing: 'Breathing', manual: 'Mindful minutes', import: 'Imported'};
const sessionLine = (s: Session) => {
  const start = wallClock(Date.parse(s.startedAt), s.timeZone), length = s.seconds >= 60 ? minutesText(Math.round(s.seconds / 60)) : `${s.seconds} s`;
  return `${start.clock} · ${length}${s.pattern ? ` · ${PATTERNS[s.pattern].label}` : ''}${s.moodBefore !== undefined || s.moodAfter !== undefined ? ` · feeling ${s.moodBefore ?? '–'} → ${s.moodAfter ?? '–'} of 5` : ''}`;
};

/**
 * Meditation, the full view (Session W Part 5; /app/health?view=meditation, a view of Health so its document and camera
 * rule stay). Begin a sitting or a breathing guide; while it runs it is the whole view. Your week against your own goal,
 * minutes a week, mindful minutes from elsewhere, the bell, and recent sessions. No score; rest days are fine.
 */
export default function MeditationView() {
  const store = useMeditation(), [note, setNote] = useState(''), [saves, setSaves] = useState(0), [editing, setEditing] = useState<string | null>(null), [confirm, setConfirm] = useState<string | null>(null);
  if (!store.loaded) return <section className="panel"><h1>Meditation</h1><p>Opening your meditation log…</p></section>;
  if (store.error) return <section className="panel"><h1>Meditation</h1><p role="alert">Meditation lives in your Health journal, which could not be read. Nothing was changed.</p><Link className="text-link" href="/app/health">Back to Health</Link></section>;
  const {meditation, today} = store, run = store.run.data.run;
  const done = (text: string) => { setNote(text); setEditing(null); setSaves(n => n + 1); };
  if (run) return <div className="meditation-view meditation-focus">
    <p className="sr-only" role="status">{note}</p>
    <MeditationSession store={store} run={run} onDone={done}/>
  </div>;
  const summary = meditationSummary(meditation, today), weeks = weeklyBars(meditation, today, 8);
  const recent = [...meditation.sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 14);
  async function remove(id: string) {
    try { await store.update(m => deleteSession(m, id)); setConfirm(null); setNote('The session is deleted.'); } catch (error) { setNote(error instanceof Error ? error.message : 'Could not delete.'); }
  }
  return <div className="meditation-view">
    <div className="page-heading"><div>
      <p><Link className="text-link sleep-back" href="/app/health">← Health</Link></p>
      <p className="eyebrow page-eyebrow"><NebulaFlow identity="meditation-eyebrow">HEALTH · MEDITATION</NebulaFlow></p>
      <h1><NebulaFlow identity="meditation-title">Breathe. Be here.</NebulaFlow></h1>
      <p className="page-lede">A quiet timer, a breathing guide and your mindful minutes. Private to your Health journal; it syncs only with Health, under the same consent.</p>
    </div></div>
    {note && <p className="sleep-note" role="status">{note}</p>}
    {store.runUnreadable && <p className="notice" role="alert">This device’s running session could not be read. It was not changed; a new session replaces it.</p>}
    <section className="panel" aria-labelledby="meditation-begin-title"><h2 id="meditation-begin-title">Begin</h2><BeginForm key={`begin-${saves}`} store={store} onStarted={() => setNote('')}/></section>
    <section className="panel" aria-labelledby="meditation-week-title">
      <h2 id="meditation-week-title">Your practice</h2>
      <dl className="sleep-stats">
        <div><dt>This week</dt><dd>{minutesText(summary.thisWeek)}</dd><small>{summary.goal ? `of your goal of ${minutesText(summary.goal)} a week` : 'Set your own weekly goal below.'}</small></div>
        <div><dt>Days in a row</dt><dd>{summary.daysInARow}</dd><small>Rest days are fine.</small></div>
        <div><dt>All sessions</dt><dd>{summary.sessions}</dd><small>{minutesText(summary.totalMinutes)} in all</small></div>
        <div><dt>Longest</dt><dd>{summary.sessions ? minutesText(summary.longestMinutes) : 'Not yet'}</dd></div>
      </dl>
    </section>
    <section className="panel" aria-labelledby="meditation-weeks-title"><h2 id="meditation-weeks-title" className="sr-only">Over time</h2><MeditationWeeksChart weeks={weeks} goal={summary.goal}/></section>
    <div className="sleep-columns">
      <section className="panel" aria-labelledby="meditation-manual-title"><h2 id="meditation-manual-title">Log mindful minutes</h2><ManualForm key={`manual-${saves}`} store={store} onDone={done}/></section>
      <section className="panel" aria-labelledby="meditation-goal-title"><h2 id="meditation-goal-title">Your weekly goal</h2><MeditationGoalForm key={`goal-${meditation.goal?.updatedAt ?? 'none'}`} store={store} onDone={done}/><MeditationReminderSetting/></section>
    </div>
    <div className="panel meditation-sounds"><AmbientPlayer/></div>
    <section className="panel" aria-labelledby="meditation-bell-title"><h2 id="meditation-bell-title">Your bell</h2><BellsForm key={`bell-${meditation.bells?.updatedAt ?? 'none'}`} store={store} onDone={done}/></section>
    <section className="panel" aria-labelledby="meditation-recent-title">
      <h2 id="meditation-recent-title">Recent sessions</h2>
      {recent.length ? <ul className="sleep-nights">{recent.map(s => <li key={s.id}>
        {editing === s.id ? <ManualForm store={store} session={s} onDone={done} onCancel={() => setEditing(null)}/> : <>
          <div><strong>{KIND_WORDS[s.kind]} · {sessionDay(s)}</strong><span>{sessionLine(s)}</span>{s.note && <span className="fine">{s.note}</span>}{s.source !== 'manual' && s.source !== 'timer' && s.source !== 'breathing' && <span className="fine">From {sourceName(s.source)}</span>}</div>
          <div className="actions">
            {s.kind === 'manual' && <button type="button" className="secondary" onClick={() => setEditing(s.id)} aria-label={`Edit the session of ${sessionDay(s)} at ${wallClock(Date.parse(s.startedAt), s.timeZone).clock}`}>Edit</button>}
            {confirm === s.id ? <><button type="button" className="secondary" onClick={() => void remove(s.id)}>Delete it</button><button type="button" className="quiet" onClick={() => setConfirm(null)}>Keep it</button></>
              : <button type="button" className="quiet" onClick={() => setConfirm(s.id)} aria-label={`Delete the session of ${sessionDay(s)} at ${wallClock(Date.parse(s.startedAt), s.timeZone).clock}`}>Delete</button>}
          </div>
        </>}
      </li>)}</ul> : <p>No sessions yet. Begin one above, or log minutes you meditated elsewhere.</p>}
    </section>
    <p className="fine sleep-privacy">Nothing here is medical advice. Breathing patterns are common relaxation techniques; stop if you feel unwell.</p>
  </div>;
}
