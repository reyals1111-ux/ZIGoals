'use client';
import {useState} from 'react';
import {readSleepCsv, csvNightDay, type SleepCsvPlan} from '../../../lib/health-sleep-csv';
import {deleteNight, saveNight} from '../../../lib/sleep/engine';
import type {Sleep} from '../../../lib/sleep/schema';
import {formatMinutes} from '../../../lib/zone-time';
import {formatDate, formatTime} from '../../../lib/visual-format';
import {plainErrorMessage} from '../../../lib/plain-error';
import {MAX_CSV_BYTES, CSV_TOO_LARGE} from '../../../lib/csv/parse';
import {showUndo} from '../../ui/undo-toast';

type Store = {sleep: Sleep; zone: string; update: (change: (current: Sleep) => Sleep) => Promise<unknown> | unknown};
/**
 * Session AL third pass (GAP-071, GAP-072): "Import nights from a file" on Sleep: Sleep Cycle's CSV, Oura's sleep rows, or
 * any start/end file, read on this device, previewed, then saved together with one Undo that takes exactly those nights
 * back out. A night that overlaps one you already have is kept as it is (yours wins).
 */
export function SleepCsvImport({store}: {store: Store}) {
  const [plan, setPlan] = useState<SleepCsvPlan | null>(null), [note, setNote] = useState(''), [busy, setBusy] = useState(false);
  async function confirm() {
    if (!plan?.nights.length) return;
    setBusy(true); setNote('');
    const at = new Date(), nights = plan.nights;
    let ids: string[] = [];
    try {
      // Each night goes through the log's own rules (overlaps, the future, 24 h); the new ids are noted so Undo removes exactly these.
      await store.update(current => { ids = []; return nights.reduce((acc, {line: _line, ...n}) => { void _line; const next = saveNight(acc, n, at), added = next.nights.find(x => !acc.nights.some(y => y.id === x.id)); if (added) ids.push(added.id); return next; }, current); });
      const n = nights.length, said = `${n} ${n === 1 ? 'night' : 'nights'} imported.`;
      setPlan(null); setNote(said);
      showUndo({message: said, undone: 'The imported nights are removed.', restore: () => { void store.update(current => ids.reduce((acc, id) => acc.nights.some(x => x.id === id) ? deleteNight(acc, id) : acc, current)); }});
    } catch (cause) { setNote(plainErrorMessage(cause, 'The nights were not imported. Nothing was changed.')); }
    finally { setBusy(false); }
  }
  return <details className="sleep-csv-import"><summary>Import nights from a file (Sleep Cycle, Oura or any start/end CSV)</summary>
    <p className="fine">Read on this device; nothing is saved until you confirm. A night that overlaps one you already logged keeps yours.</p>
    <label className="field"><span>Sleep file (CSV)</span><input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={async event => {
      const file = event.target.files?.[0]; event.target.value = ''; setNote('');
      if (!file) return;
      if (file.size > MAX_CSV_BYTES) { setPlan(null); setNote(CSV_TOO_LARGE); return; }
      try { setPlan(readSleepCsv(await file.text(), {zone: store.zone, nowMs: Date.now(), existing: store.sleep})); } catch (cause) { setPlan(null); setNote(plainErrorMessage(cause, 'This file could not be read.')); }
    }} /></label>
    {plan && <section className="health-preview" aria-label="Sleep import preview">
      {plan.note && <p className="notice" role="status">{plan.note}</p>}
      <p><strong>{plan.nights.length} {plan.nights.length === 1 ? 'night' : 'nights'} to add</strong>{plan.kept ? ` · ${plan.kept} already in your log (kept)` : ''}{plan.issues.length ? ` · ${plan.issues.length} ${plan.issues.length === 1 ? 'line' : 'lines'} not read` : ''}</p>
      {plan.nights.length > 0 && <ul className="fine">{plan.nights.slice(0, 10).map(n => { const inBed = Math.round((n.end - n.start) / 60_000), slept = inBed - (n.latencyMin ?? 0) - (n.awakeMin ?? 0); return <li key={n.line}>{n.kind === 'nap' ? 'Nap' : 'Night'} ending {formatDate(csvNightDay(n))} · {formatTime(new Date(n.start).toISOString(), {timeZone: n.timeZone})}–{formatTime(new Date(n.end).toISOString(), {timeZone: n.timeZone})} · {formatMinutes(n.awakeMin !== undefined ? slept : inBed)} {n.awakeMin !== undefined ? 'asleep' : 'in bed'}</li>; })}{plan.nights.length > 10 && <li>and {plan.nights.length - 10} more</li>}</ul>}
      {plan.issues.length > 0 && <ul className="field-error">{plan.issues.slice(0, 10).map(i => <li key={i.line}>{i.reason}</li>)}{plan.issues.length > 10 && <li>and {plan.issues.length - 10} more</li>}</ul>}
      <div className="actions"><button type="button" className="primary" disabled={busy || !plan.nights.length} onClick={() => void confirm()}>{plan.nights.length ? `Import ${plan.nights.length} ${plan.nights.length === 1 ? 'night' : 'nights'}` : 'Nothing to import'}</button><button type="button" className="quiet" onClick={() => setPlan(null)}>Cancel import</button></div>
    </section>}
    {note && <p role="status">{note}</p>}
  </details>;
}
