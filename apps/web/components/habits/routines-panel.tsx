'use client';
import {useState} from 'react';
import {NebulaFlow} from '../nebula-flow';
import {routines, liveRun} from '../../lib/routines/engine';
import {createRoutineFromTemplate, ROUTINE_TEMPLATES} from '../../lib/routines/templates';
import {ROUTINE_RUN} from '../../lib/routines/run-schema';
import {habitDay, type HabitData} from '../../lib/habits';
import {useDeviceRecord} from '../ai/use-device-record';
import type {HabitsStore} from './use-habits';

/**
 * H5: "Routines": every stack as a routine with Start (or Resume) and the four templates; a template creates its habits
 * through the journal's own createHabit with "stack after" links (lib/routines/templates.ts). The player itself opens
 * through `onPlay` (the page renders it as a sheet).
 */
export function RoutinesPanel({store, onPlay, onView}: {store: HabitsStore; onPlay: (headId: string) => void; onView: (id: string) => void}) {
  const list = routines(store.data), run = useDeviceRecord(ROUTINE_RUN);
  const live = run.loaded && !run.unreadable ? liveRun(run.data, store.data, store.today) : null;
  const [busy, setBusy] = useState<string | null>(null), [message, setMessage] = useState(''), [templates, setTemplates] = useState(list.length === 0);
  const done = (habits: HabitData['habits']) => habits.filter(h => habitDay(h, store.today, store.today).status === 'complete').length;
  async function add(id: (typeof ROUTINE_TEMPLATES)[number]['id']) {
    const template = ROUTINE_TEMPLATES.find(t => t.id === id)!; setBusy(id); setMessage('');
    try {
      let created = 0, reused = 0;
      await store.update(data => { const made = createRoutineFromTemplate(data, template, new Date(), () => crypto.randomUUID()); created = made.created.length; reused = made.reused.length; return made.data; });
      setMessage(`${template.title} ready: ${created} new ${created === 1 ? 'habit' : 'habits'}${reused ? `, ${reused} you already had` : ''}.`); setTemplates(false);
    } catch (e) { setMessage(e instanceof Error && e.message ? e.message : 'The routine was not created.'); } finally { setBusy(null); }
  }
  return <section className="panel habit-routines" aria-labelledby="habit-routines-title">
    <div className="habit-section-heading"><div><p className="eyebrow">One step at a time</p><h2 id="habit-routines-title"><NebulaFlow identity="habit-routines-title">Routines</NebulaFlow></h2></div>{list.length > 0 && <button type="button" className="quiet" aria-expanded={templates} onClick={() => setTemplates(t => !t)}>Templates</button>}</div>
    {list.length > 0 && <ul className="habit-routine-list">{list.map(r => { const n = done(r.habits); return <li key={r.headId}><div className="habit-routine-copy"><strong>{r.title}</strong><small>{r.habits.map(h => h.title).join(' → ')}</small><span className="habit-routine-progress"><span aria-hidden="true">{Array.from({length: r.habits.length}, (_, i) => <i key={i} data-done={i < n || undefined} />)}</span><span className="sr-only">{`${n} of ${r.habits.length} done today`}</span></span></div><div className="actions"><button type="button" className="primary" onClick={() => onPlay(r.headId)}>{live?.headId === r.headId ? 'Resume' : n === r.habits.length ? 'Play again' : 'Start'}</button><button type="button" className="quiet" onClick={() => onView(r.habits[0]!.id)}>View habits</button></div></li>; })}</ul>}
    {(templates || list.length === 0) && <div className="habit-routine-templates" role="group" aria-label="Routine templates">{list.length === 0 && <p className="habit-section-empty">A routine plays a habit stack one step at a time, with a timer where it helps. Start from a template, or stack habits in the editor.</p>}<ul>{ROUTINE_TEMPLATES.map(t => <li key={t.id}><div className="habit-routine-copy"><strong>{t.title}</strong><small>{t.blurb}</small><small className="habit-routine-steps">{t.steps.map(s => s.title).join(' → ')}</small></div><button type="button" className="secondary" disabled={busy !== null || !store.loaded || !!store.error} onClick={() => void add(t.id)}>{busy === t.id ? 'Adding…' : 'Add routine'}</button></li>)}</ul></div>}
    {message && <p role="status" className="fine">{message}</p>}
  </section>;
}
