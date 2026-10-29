'use client';
import {useState} from 'react';
import {formatDate, formatNumber} from '../../../lib/visual-format';
import {plainErrorMessage} from '../../../lib/plain-error';
import {plural} from '../../../lib/plural';
import type {ImportSummary} from '../../../lib/workouts/import-file';
import type {Workouts} from '../../../lib/workouts/schema';
import {clock} from './units';

/**
 * Session AJ (item 27, D12): import a GPX or TCX file on this device. The file is read here, a preview shows its summary,
 * and only that summary is kept. The reader loads when a file is chosen, so the view does not carry it before then.
 */
export type ImportChoice = {summary: ImportSummary; day: string};
export function WorkoutsImport({w, dayOf, onAdd}: {w: Workouts; dayOf: (iso: string) => string; onAdd: (list: ImportChoice[]) => Promise<string>}) {
  const [found, setFound] = useState<ImportChoice[] | null>(null), [problem, setProblem] = useState(''), [said, setSaid] = useState(''), [busy, setBusy] = useState(false), [inputKey, setInputKey] = useState(0);
  const done = new Set(w.workouts.map(x => x.imported?.importId).filter(Boolean));
  const fresh = found?.filter(c => !done.has(c.summary.importId)) ?? [];
  const reset = () => { setFound(null); setInputKey(k => k + 1); };

  async function choose(file: File | undefined) {
    setProblem(''); setSaid(''); setFound(null);
    if (!file) return;
    setBusy(true);
    try {
      const [{IMPORT_MAX_CHARS, readWorkoutFile}, {miniXmlParser}] = await Promise.all([import('../../../lib/workouts/import-file'), import('../../../lib/workouts/mini-xml')]);
      if (file.size > IMPORT_MAX_CHARS) throw new Error('This file is larger than 5 MB. Export one workout at a time, then try again.');
      const list = readWorkoutFile(await file.text(), miniXmlParser);
      setFound(list.map(summary => ({summary, day: dayOf(summary.startedAt)})));
    } catch (e) { setProblem(plainErrorMessage(e, 'This file could not be read. Choose a GPX or TCX file.')); setInputKey(k => k + 1); }
    finally { setBusy(false); }
  }
  async function add() {
    setBusy(true);
    try { setProblem(''); setSaid(await onAdd(fresh)); reset(); } catch (e) { setProblem(plainErrorMessage(e, 'The workout could not be saved on this device.')); }
    finally { setBusy(false); }
  }

  return <details className="workouts-import">
    <summary>Import a GPX or TCX file</summary>
    <div className="workouts-import-body">
      <p className="fine">Choose a file from your watch, phone or fitness app. It is read on this device. Only the summary is kept; the route’s points are not stored.</p>
      <label className="field"><span>GPX or TCX file</span>
        <input key={inputKey} type="file" accept=".gpx,.tcx,application/gpx+xml,application/vnd.garmin.tcx+xml" disabled={busy} onChange={e => void choose(e.target.files?.[0])}/></label>
      {busy && !found && <p className="fine" role="status">Reading the file…</p>}
      {said && <p className="fine" role="status">{said}</p>}
      {problem && <p className="workouts-import-problem" role="alert">{problem}</p>}
      {found && <div className="workouts-import-preview" role="group" aria-label="What this file holds">
        {found.map(({summary: s, day}) => <article key={s.importId} className="workouts-import-item">
          <h3>{s.name}</h3>
          {done.has(s.importId) && <p className="fine">Already imported. It is in your workouts below.</p>}
          <dl className="workouts-stats">
            <div><dt>Type</dt><dd>{s.label}</dd></div>
            <div><dt>Date</dt><dd>{formatDate(day)}</dd></div>
            <div><dt>Duration</dt><dd>{clock(s.durationSeconds)}</dd></div>
            <div><dt>Distance</dt><dd>{s.distanceKm === null ? '—' : `${formatNumber(s.distanceKm, {maximumFractionDigits: 2})} km`}</dd></div>
            <div><dt>Climb</dt><dd>{s.elevationM === null ? '—' : `${formatNumber(s.elevationM)} m`}</dd></div>
            <div><dt>Average heart rate</dt><dd>{s.avgHr === null ? '—' : `${s.avgHr} bpm`}</dd></div>
          </dl>
        </article>)}
        <div className="workouts-row-actions">
          {fresh.length > 0 && <button className="primary" type="button" disabled={busy} onClick={() => void add()}>{fresh.length === 1 ? 'Add workout' : `Add ${fresh.length} ${plural(fresh.length, 'workout')}`}</button>}
          <button className="quiet" type="button" disabled={busy} onClick={reset}>Cancel</button>
        </div>
      </div>}
    </div>
  </details>;
}

/** "Imported from GPX · 5.02 km · 40 m climb · average heart rate 148 bpm" for a workout in the list. */
export function importedLine(x: Workouts['workouts'][number]): string | null {
  const i = x.imported; if (!i) return null;
  return [`Imported from ${i.source.toUpperCase()}`, i.distanceKm !== undefined ? `${formatNumber(i.distanceKm, {maximumFractionDigits: 2})} km` : '',
    i.elevationM !== undefined ? `${formatNumber(i.elevationM)} m climb` : '', i.avgHr !== undefined ? `average heart rate ${i.avgHr} bpm` : ''].filter(Boolean).join(' · ');
}
