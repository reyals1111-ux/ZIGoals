'use client';
import {useState} from 'react';
import {formatDate, formatNumber} from '../../../lib/visual-format';
import {plainErrorMessage} from '../../../lib/plain-error';
import {plural} from '../../../lib/plural';
import {importInfo, type ImportSummary} from '../../../lib/workouts/import-file';
import type {LiftsPlan} from '../../../lib/workouts/import-lifts';
import type {Workouts} from '../../../lib/workouts/schema';
import {clock} from './units';

/**
 * Session AJ (item 27, D12), widened in Session AK (4.7, A15): import a workout file on this device — GPX, TCX, FIT
 * (or `.fit.gz`), Strava's whole-account ZIP, or a Strong or Hevy workouts CSV. The file is read here, a preview shows
 * what it holds, and only summaries (or, from Strong and Hevy, the sets themselves) are kept; a route's points never are.
 * The readers load when a file is chosen, so the view does not carry them before then.
 */
export type ImportChoice = {summary: ImportSummary; day: string};
type Found = {kind: 'summaries'; list: ImportChoice[]; notes: string[]} | {kind: 'lifts'; plan: LiftsPlan};
const SHOWN = 20;
const SOURCE_WORDS: Record<string, string> = {gpx: 'GPX', tcx: 'TCX', fit: 'FIT', strava: 'Strava', strong: 'Strong', hevy: 'Hevy'};
export const sourceWord = (source: string) => SOURCE_WORDS[source] ?? source.toUpperCase();

export function WorkoutsImport({w, dayOf, zone, unit, onAdd, onAddLifts}: {w: Workouts; dayOf: (iso: string) => string; zone: string; unit: 'kg' | 'lb';
  onAdd: (list: ImportChoice[]) => Promise<string>; onAddLifts: (plan: LiftsPlan) => Promise<string>}) {
  const [found, setFound] = useState<Found | null>(null), [problem, setProblem] = useState(''), [said, setSaid] = useState(''), [busy, setBusy] = useState(false), [inputKey, setInputKey] = useState(0);
  const done = new Set(w.workouts.map(x => importInfo(x)?.importId).filter(Boolean));
  const fresh = found?.kind === 'summaries' ? found.list.filter(c => !done.has(c.summary.importId)) : [];
  const reset = () => { setFound(null); setInputKey(k => k + 1); };
  const summaries = (list: ImportSummary[], notes: string[] = []): Found => ({kind: 'summaries', list: list.map(summary => ({summary, day: dayOf(summary.startedAt)})), notes});

  async function read(file: File): Promise<Found> {
    const name = file.name.toLowerCase();
    if (/\.zip$/.test(name) || file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
      const [{filesFrom}, strava] = await Promise.all([import('../../../lib/import/switch/source'), import('../../../lib/import/switch/strava')]);
      const files = await filesFrom([file]);
      if (!strava.isStravaExport(files)) throw new Error('This ZIP is not a Strava export (it has no activities.csv). Choose the ZIP from Strava’s “Download your account” e-mail, or a single workout file.');
      const plan = await strava.readStrava(files), {fresh: left, duplicates} = strava.notInLog(w, plan.summaries);
      if (!left.length) throw new Error(`Every activity in this export is already in your workouts (${plan.summaries.length} checked).`);
      return summaries(left, [...plan.warnings, ...(duplicates ? [`${duplicates} ${plural(duplicates, 'activity', 'activities')} already in your workouts ${duplicates === 1 ? 'is' : 'are'} left out.`] : [])]);
    }
    if (/\.fit(\.gz)?$/.test(name)) { const {readFitBlob} = await import('../../../lib/import/fit/gzip'); return summaries(await readFitBlob(file)); }
    if (/\.(gpx|tcx)(\.gz)?$/.test(name) || /xml/.test(file.type)) {
      const [{IMPORT_MAX_CHARS, readWorkoutFile}, {miniXmlParser}, {fileBytes}] = await Promise.all([import('../../../lib/workouts/import-file'), import('../../../lib/workouts/mini-xml'), import('../../../lib/import/fit/gzip')]);
      const bytes = await fileBytes(file, 30 * 1024 * 1024);
      if (bytes.length > IMPORT_MAX_CHARS) throw new Error('This file is larger than 5 MB. Export one workout at a time, then try again.');
      return summaries(readWorkoutFile(new TextDecoder('utf-8').decode(bytes), miniXmlParser));
    }
    if (/\.(csv|txt)$/.test(name) || /csv/.test(file.type)) {
      if (file.size > 20 * 1024 * 1024) throw new Error('This file is larger than 20 MB, more than ZIGoals reads from one export.');
      const text = await file.text(), first = text.slice(0, 2000).split(/\r?\n/, 1)[0] ?? '';
      const [strong, hevy] = await Promise.all([import('../../../lib/import/switch/strong'), import('../../../lib/import/switch/hevy')]);
      if (strong.isStrongHeader(first)) return {kind: 'lifts', plan: await strong.readStrong(text, {zone, weightUnit: unit})};
      if (hevy.isHevyHeader(first)) return {kind: 'lifts', plan: await hevy.readHevy(text, {zone})};
      throw new Error('This CSV is not a Strong or Hevy workouts export. In Strong: Settings → Export Strong Data. In Hevy: Settings → Export & Import Data → Export Workouts.');
    }
    throw new Error('Choose a GPX, TCX or FIT file, a Strava export ZIP, or a Strong or Hevy CSV.');
  }
  async function choose(file: File | undefined) {
    setProblem(''); setSaid(''); setFound(null);
    if (!file) return;
    setBusy(true);
    try { setFound(await read(file)); }
    catch (e) { setProblem(plainErrorMessage(e, 'This file could not be read. Choose a GPX, TCX or FIT file, a Strava ZIP, or a Strong or Hevy CSV.')); setInputKey(k => k + 1); }
    finally { setBusy(false); }
  }
  async function add() {
    if (!found) return;
    setBusy(true);
    try { setProblem(''); setSaid(found.kind === 'lifts' ? await onAddLifts(found.plan) : await onAdd(fresh)); reset(); }
    catch (e) { setProblem(plainErrorMessage(e, 'The workouts could not be saved on this device.')); }
    finally { setBusy(false); }
  }

  return <details className="workouts-import">
    <summary>Import a GPX or TCX file, a FIT file, or another app’s export</summary>
    <div className="workouts-import-body">
      <p className="fine">A GPX, TCX or FIT file from your watch, bike computer or app; Strava’s whole-account ZIP; or a Strong or Hevy workouts CSV. It is read on this device. Only the summary is kept; the route’s points are not stored. From Strong and Hevy, your sets come in as well.</p>
      <label className="field"><span>GPX or TCX file, FIT file, Strava ZIP, or Strong or Hevy CSV</span>
        <input key={inputKey} type="file" accept=".gpx,.tcx,.fit,.gz,.zip,.csv,application/gpx+xml,application/vnd.garmin.tcx+xml,application/zip,text/csv" disabled={busy} onChange={e => void choose(e.target.files?.[0])}/></label>
      {busy && !found && <p className="fine" role="status">Reading the file…</p>}
      {said && <p className="fine" role="status">{said}</p>}
      {problem && <p className="workouts-import-problem" role="alert">{problem}</p>}
      {found?.kind === 'summaries' && <div className="workouts-import-preview" role="group" aria-label="What this file holds">
        {found.notes.length > 0 && <ul className="workouts-import-notes">{found.notes.map(n => <li key={n} className="fine">{n}</li>)}</ul>}
        {found.list.length > SHOWN && <p className="fine">{found.list.length} workouts, from {formatDate(found.list[0]!.day)} to {formatDate(found.list.at(-1)!.day)}. The first {SHOWN} are shown.</p>}
        {found.list.slice(0, SHOWN).map(({summary: s, day}) => <article key={s.importId} className="workouts-import-item">
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
      {found?.kind === 'lifts' && <LiftsPreview plan={found.plan} dayOf={dayOf} busy={busy} onAdd={() => void add()} onCancel={reset}/>}
    </div>
  </details>;
}

function LiftsPreview({plan, dayOf, busy, onAdd, onCancel}: {plan: LiftsPlan; dayOf: (iso: string) => string; busy: boolean; onAdd: () => void; onCancel: () => void}) {
  const list = plan.workouts, sets = list.reduce((t, x) => t + x.exercises.reduce((n, e) => n + e.sets.length, 0), 0);
  const day = (ms: number) => dayOf(new Date(ms).toISOString());
  return <div className="workouts-import-preview" role="group" aria-label={`What this ${plan.label} export holds`}>
    <p>{plan.label}: {list.length} {plural(list.length, 'workout')} with {formatNumber(sets)} {plural(sets, 'set')}, from {formatDate(day(list[0]!.startMs))} to {formatDate(day(list.at(-1)!.startMs))}.</p>
    {plan.warnings.length > 0 && <ul className="workouts-import-notes">{plan.warnings.map(n => <li key={n} className="fine">{n}</li>)}</ul>}
    <ul className="workouts-import-lifts">{list.slice(-SHOWN).reverse().map(x => <li key={`${x.startMs}-${x.name}`}><strong>{x.name}</strong> <span>{formatDate(day(x.startMs))} · {x.exercises.length} {plural(x.exercises.length, 'exercise')}</span></li>)}</ul>
    {list.length > SHOWN && <p className="fine">The latest {SHOWN} are shown.</p>}
    <p className="fine">Exercises ZIGoals does not know yet are added as your own, with a muscle group guessed from the name. A workout already in your log is skipped.</p>
    <div className="workouts-row-actions">
      <button className="primary" type="button" disabled={busy} onClick={onAdd}>{list.length === 1 ? 'Add workout' : `Add ${list.length} ${plural(list.length, 'workout')}`}</button>
      <button className="quiet" type="button" disabled={busy} onClick={onCancel}>Cancel</button>
    </div>
  </div>;
}

/** "Imported from GPX · 5.02 km · 40 m climb · average heart rate 148 bpm" for a workout in the list. */
export function importedLine(x: Workouts['workouts'][number]): string | null {
  const i = importInfo(x); if (!i) return null;
  return [`Imported from ${sourceWord(i.source)}`, i.distanceKm !== undefined ? `${formatNumber(i.distanceKm, {maximumFractionDigits: 2})} km` : '',
    i.elevationM !== undefined ? `${formatNumber(i.elevationM)} m climb` : '', i.avgHr !== undefined ? `average heart rate ${i.avgHr} bpm` : ''].filter(Boolean).join(' · ');
}
