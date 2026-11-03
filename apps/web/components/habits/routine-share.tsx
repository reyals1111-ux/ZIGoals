'use client';
import {useId, useState} from 'react';
import type {Routine} from '../../lib/routines/engine';
import {createImportedRoutine, exportRoutineStructure, importRoutineStructure, importedSteps, routineShareFileName, routineShareText, MAX_SHARE_BYTES, type RoutineShare} from '../../lib/routines/share';
import {plainErrorMessage} from '../../lib/plain-error';
import type {HabitsStore} from './use-habits';

/**
 * Session AK (5.4): share a routine's structure as a small file, or add one someone shared (lib/routines/share.ts). The
 * file holds the steps, their minutes and the time of day; step names only when "Include step names" is ticked (off by
 * default). An import is checked strictly and previewed; it only ever adds new habits, stacked one after another, through
 * the journal's own createHabit. Its own chunk, opened from the Routines section.
 */
export function RoutineSharePanel({routines, store, onClose}: {routines: readonly Routine[]; store: Pick<HabitsStore, 'today' | 'update' | 'loaded' | 'error'>; onClose: () => void}) {
  const id = useId();
  const [chosen, setChosen] = useState(routines[0]?.headId ?? ''), [names, setNames] = useState(false);
  const [incoming, setIncoming] = useState<RoutineShare | null>(null), [error, setError] = useState(''), [said, setSaid] = useState(''), [busy, setBusy] = useState(false);
  const routine = routines.find(r => r.headId === chosen) ?? routines[0];
  function save() {
    if (!routine) return;
    setError(''); setSaid('');
    try {
      const share = exportRoutineStructure(routine, store.today, {includeNames: names}), name = routineShareFileName(share);
      const url = URL.createObjectURL(new Blob([routineShareText(share)], {type: 'application/json'})), a = document.createElement('a');
      a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setSaid(`Saved as ${name}: ${share.steps.length} ${share.steps.length === 1 ? 'step' : 'steps'}${names ? ', with their names' : ', without their names'}.`);
    } catch (cause) { setError(plainErrorMessage(cause, 'The routine file was not made.')); }
  }
  async function read(file: File | undefined) {
    setError(''); setSaid(''); setIncoming(null);
    if (!file) return;
    if (file.size > MAX_SHARE_BYTES) { setError('This file is too large for a routine (16 KB at most).'); return; }
    const result = importRoutineStructure(await file.text());
    if (result.ok) setIncoming(result.routine); else setError(result.error);
  }
  async function add() {
    if (!incoming) return;
    setBusy(true); setError('');
    try {
      let made = 0;
      await store.update(data => { const out = createImportedRoutine(data, incoming, new Date(), () => crypto.randomUUID()); made = out.created.length; return out.data; });
      setSaid(`Routine added: ${made} new ${made === 1 ? 'habit' : 'habits'}, one after another. Rename or edit them in your habits.`); setIncoming(null);
    } catch (cause) { setError(plainErrorMessage(cause, 'The routine was not added. Nothing was changed.')); } finally { setBusy(false); }
  }
  return <section className="habit-routine-share" aria-labelledby={`${id}-title`}>
    <div className="habit-section-heading"><h3 id={`${id}-title`}>Share or add a routine</h3><button type="button" className="quiet" onClick={onClose}>Done</button></div>
    {routine && <fieldset><legend>Share a routine</legend>
      {routines.length > 1 && <label className="field">Routine<select value={routine.headId} onChange={e => setChosen(e.target.value)}>{routines.map(r => <option key={r.headId} value={r.headId}>{r.title}</option>)}</select></label>}
      <label className="checkbox"><input type="checkbox" checked={names} onChange={e => setNames(e.target.checked)}/>Include step names</label>
      <p className="fine">The file holds the number of steps, their minutes and the time of day. Nothing else: no history, notes or dates{names ? '' : ', and no names ("Step 1", "Step 2"…)'}.</p>
      <div className="actions"><button type="button" className="secondary" onClick={save}>Save routine file</button></div>
    </fieldset>}
    <fieldset><legend>Add a shared routine</legend>
      <label className="field">Routine file<input type="file" accept=".json,application/json" onChange={e => void read(e.target.files?.[0])}/></label>
      {incoming && <div className="habit-routine-import">
        <p>{incoming.title ?? 'A routine'}: {importedSteps(incoming).map(s => s.minutes ? `${s.title} (${s.minutes} min)` : s.title).join(' → ')}</p>
        <p className="fine">Adds {incoming.steps.length} new {incoming.steps.length === 1 ? 'habit' : 'habits'}, each daily and stacked after the one before. Habits you already have are not changed.</p>
        <div className="actions"><button type="button" className="primary" disabled={busy || !store.loaded || !!store.error} onClick={() => void add()}>{busy ? 'Adding…' : `Add ${incoming.steps.length} ${incoming.steps.length === 1 ? 'habit' : 'habits'}`}</button><button type="button" className="quiet" disabled={busy} onClick={() => setIncoming(null)}>Cancel</button></div>
      </div>}
    </fieldset>
    {said && <p role="status" className="fine">{said}</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
export default RoutineSharePanel;
