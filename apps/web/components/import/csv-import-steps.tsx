'use client';
import {useEffect, useRef, useState, type ReactNode} from 'react';
import {CSV_TOO_LARGE, MAX_CSV_BYTES, parseCsv, type CsvDelimiter, type ParsedCsv} from '../../lib/csv/parse';
import {guessMapping, type FieldSpec} from '../../lib/csv/mapping';
import {guessNumberStyle, type NumberStyle} from '../../lib/csv/numbers';
import {DATE_FORMAT_LABELS, guessDateFormat, type DateFormat} from '../../lib/csv/dates';
import type {ImportRecord} from '../../lib/import/undo-schema';
import type {ImportUndoStore} from './use-import-undo';
import {formatDate} from '../../lib/visual-format';
import './import.css';

/**
 * The shared pieces of the CSV import panels (Session P, PR 3, W3 and I1): the file step, the column matching step,
 * the step heading that takes focus, the refused-rows list, the page banner and the "Recent imports" rows. Each panel
 * (transactions, holdings, meals) adds its own preview and confirm steps on top. Everything runs on the device.
 */
export type CsvFile = {name: string; text: string};
export type Mapping = Partial<Record<string, number>>;
export type CsvSetup = {parsed: ParsedCsv; mapping: Mapping; numberStyle: NumberStyle; dateFormat: DateFormat; ambiguousDates: boolean};
export type SetupOptions = {fields: readonly FieldSpec[]; numberFields: readonly string[]; dateField?: string};
const DELIMITER_LABELS: Record<CsvDelimiter, string> = {',': 'Comma', ';': 'Semicolon', '\t': 'Tab'};
const column = (parsed: ParsedCsv, index: number | undefined) => index === undefined ? [] : parsed.rows.map(row => row[index] ?? '');
const samples = (cells: readonly string[], n = 3) => cells.map(c => c.trim()).filter(Boolean).slice(0, n);

/** Parses the text and guesses the mapping, the number style and the date format; throws the parser's plain messages. */
export function setupFromText(text: string, options: SetupOptions, delimiter?: CsvDelimiter): CsvSetup {
  const parsed = parseCsv(text, delimiter ? {delimiter} : {});
  const mapping = guessMapping(parsed.header, options.fields);
  return withGuesses({parsed, mapping, numberStyle: 'point', dateFormat: 'iso', ambiguousDates: false}, options, {numbers: true, dates: true});
}
/** Re-guesses the number style and the date format after the mapping changed. */
export function withGuesses(setup: CsvSetup, options: SetupOptions, what: {numbers?: boolean; dates?: boolean}): CsvSetup {
  let next = setup;
  if (what.numbers) next = {...next, numberStyle: guessNumberStyle(options.numberFields.flatMap(id => column(next.parsed, next.mapping[id])))};
  if (what.dates && options.dateField) { const guess = guessDateFormat(column(next.parsed, next.mapping[options.dateField])); next = {...next, dateFormat: guess.format, ambiguousDates: guess.ambiguous}; }
  return next;
}

/** Step 1: the file, read with File.text() on this device. */
export function FileStep({onFile}: {onFile: (file: CsvFile) => string | null}) {
  const [problem, setProblem] = useState('');
  return <div className="import-step">
    <label className="field import-file"><span>CSV file</span><input type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain" data-sheet-focus onChange={async event => {
      setProblem(''); const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
      if (file.size > MAX_CSV_BYTES) { setProblem(CSV_TOO_LARGE); return; }
      let text: string; try { text = await file.text(); } catch { setProblem('This file could not be read. Nothing was changed.'); return; }
      const refusal = onFile({name: file.name, text}); if (refusal) setProblem(refusal);
    }} /></label>
    <p className="fine">Read on this device only. Nothing is uploaded. The first row must name the columns.</p>
    {problem && <p role="alert">{problem}</p>}
  </div>;
}

/** The heading of a step; it takes focus when the step changes so keyboard and screen-reader users land on it. */
export function StepHeading({step, title}: {step: 1 | 2 | 3 | 4; title: string}) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => { ref.current?.focus({preventScroll: false}); }, [step]);
  return <h3 ref={ref} tabIndex={-1} className="import-step-heading"><span className="eyebrow">Step {step} of 4</span>{title}</h3>;
}

/** Step 2: one select per field, the delimiter, how numbers and dates are written, with examples from the file. */
export function MappingStep({setup, options, text, onChange, children}: {setup: CsvSetup; options: SetupOptions; text: string; onChange: (next: CsvSetup) => void; children?: ReactNode}) {
  const {parsed, mapping} = setup;
  const example = (index: number) => samples(column(parsed, index), 1)[0];
  const numberSamples = samples(options.numberFields.flatMap(id => column(parsed, mapping[id])));
  const dateSamples = options.dateField ? samples(column(parsed, mapping[options.dateField])) : [];
  return <div className="import-step import-mapping">
    <p className="fine">{parsed.rows.length} {parsed.rows.length === 1 ? 'row' : 'rows'} in {parsed.header.length} columns. Match each column; “Not in this file” leaves a field blank.</p>
    <label className="field"><span>Delimiter</span><select value={parsed.delimiter} onChange={event => { try { onChange(setupFromText(text, options, event.target.value as CsvDelimiter)); } catch { /* the first parse already succeeded; a worse delimiter keeps the current one */ } }}>{(Object.keys(DELIMITER_LABELS) as CsvDelimiter[]).map(d => <option key={d} value={d}>{DELIMITER_LABELS[d]}</option>)}</select></label>
    <div className="import-fields">{options.fields.map(field => <label key={field.id} className="field"><span>{field.label}{field.required ? ' · required' : ''}</span>
      <select value={mapping[field.id] ?? ''} aria-required={field.required || undefined} onChange={event => { const value = event.target.value, next = {...mapping}; if (value === '') delete next[field.id]; else next[field.id] = Number(value); onChange(withGuesses({...setup, mapping: next}, options, {numbers: options.numberFields.includes(field.id), dates: field.id === options.dateField})); }}>
        <option value="">Not in this file</option>{parsed.header.map((name, index) => <option key={index} value={index}>{name || `Column ${index + 1}`}{example(index) ? ` · e.g. ${example(index)!.slice(0, 24)}` : ''}</option>)}
      </select></label>)}</div>
    {options.numberFields.length > 0 && <label className="field"><span>Numbers use</span><select value={setup.numberStyle} onChange={event => onChange({...setup, numberStyle: event.target.value as NumberStyle})}><option value="point">Point for decimals · 1,234.56</option><option value="comma">Comma for decimals · 1.234,56</option></select>{numberSamples.length > 0 && <small>In this file: {numberSamples.join(' · ')}</small>}</label>}
    {options.dateField && <label className="field"><span>Dates are</span><select value={setup.dateFormat} onChange={event => onChange({...setup, dateFormat: event.target.value as DateFormat, ambiguousDates: false})}>{(Object.keys(DATE_FORMAT_LABELS) as DateFormat[]).map(f => <option key={f} value={f}>{DATE_FORMAT_LABELS[f]}</option>)}</select>{dateSamples.length > 0 && <small>In this file: {dateSamples.join(' · ')}</small>}</label>}
    {setup.ambiguousDates && <p role="status" className="import-ambiguous">These dates could be read both ways. Choose the order.</p>}
    {children}
    {parsed.warnings.length > 0 && <details className="import-warnings"><summary>{parsed.warnings.length} {parsed.warnings.length === 1 ? 'note' : 'notes'} about this file</summary><ul>{parsed.warnings.slice(0, 20).map(w => <li key={w}>{w}</li>)}</ul></details>}
  </div>;
}

/** Rows the plan refused, with their reasons; they are skipped, never a blocker unless nothing is ready. */
export function RefusedRows({refused}: {refused: readonly {row: number; reason: string}[]}) {
  if (!refused.length) return null;
  return <details className="import-refused"><summary>{refused.length} {refused.length === 1 ? 'row' : 'rows'} refused (skipped)</summary><ul>{refused.slice(0, 200).map(r => <li key={r.row}>{r.reason}</li>)}{refused.length > 200 && <li>… and {refused.length - 200} more.</li>}</ul></details>;
}

/** The Back/Next row of a step. */
export function StepActions({onBack, onNext, nextLabel = 'Next', nextDisabled, busy, primary}: {onBack?: () => void; onNext?: () => void; nextLabel?: string; nextDisabled?: boolean; busy?: boolean; primary?: boolean}) {
  return <div className="actions import-actions">
    {onNext && <button type="button" className={primary ? 'primary' : 'secondary'} disabled={nextDisabled || busy} onClick={onNext}>{busy ? 'Working…' : nextLabel}</button>}
    {onBack && <button type="button" className="quiet" disabled={busy} onClick={onBack}>Back</button>}
  </div>;
}

/** The newest live import of this page's kind, as a status banner with Undo, until undone, dismissed or expired. */
export function ImportBanner({imports, kind, onUndo}: {imports: ImportUndoStore; kind: ImportRecord['kind']; onUndo: (record: ImportRecord) => Promise<void>}) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const record = imports.live.find(r => r.kind === kind && !r.dismissed);
  if (!record) return null;
  return <div role="status" className="import-banner">
    <p>{record.label}.</p>
    <div className="actions"><button type="button" className="quiet" disabled={busy} onClick={() => { setBusy(true); setError(''); onUndo(record).catch(e => setError(e instanceof Error ? e.message : 'The import was not undone.')).finally(() => setBusy(false)); }}>Undo</button><button type="button" className="quiet" aria-label="Dismiss this notice" disabled={busy} onClick={() => { try { imports.dismiss(record.id); } catch (e) { setError(e instanceof Error ? e.message : 'Could not dismiss.'); } }}>Dismiss</button></div>
    {error && <p role="alert">{error}</p>}
  </div>;
}

/** The ledger rows of this page's kind, each with Undo; an unreadable ledger offers the explicit Start over. */
export function RecentImports({imports, kind, onUndo}: {imports: ImportUndoStore; kind: ImportRecord['kind']; onUndo: (record: ImportRecord) => Promise<void>}) {
  const [busy, setBusy] = useState<string | null>(null), [error, setError] = useState(''), [confirm, setConfirm] = useState(false);
  const rows = imports.live.filter(r => r.kind === kind);
  if (imports.unreadable) return <div className="import-recent"><p className="fine">Your recent imports on this device could not be read, so there is nothing to undo here. Imports still work.</p>
    {confirm ? <div className="actions"><button type="button" className="secondary" onClick={() => { try { imports.startOver(); setConfirm(false); } catch (e) { setError(e instanceof Error ? e.message : 'Could not start over.'); } }}>Replace the unreadable note</button><button type="button" className="quiet" onClick={() => setConfirm(false)}>Keep it</button></div> : <button type="button" className="quiet" onClick={() => setConfirm(true)}>Start over…</button>}
    {error && <p role="alert">{error}</p>}</div>;
  if (!rows.length) return null;
  return <section className="import-recent" aria-label="Recent imports"><h4>Recent imports</h4>
    <ul>{rows.map(r => <li key={r.id}><span>{r.label} · {formatDate(r.at)}</span><button type="button" className="quiet" disabled={busy !== null} onClick={() => { setBusy(r.id); setError(''); onUndo(r).catch(e => setError(e instanceof Error ? e.message : 'The import was not undone.')).finally(() => setBusy(null)); }}>{busy === r.id ? 'Undoing…' : 'Undo'}</button></li>)}</ul>
    <p className="fine">An import can be undone for seven days, as long as none of its records was changed.</p>
    {error && <p role="alert">{error}</p>}
  </section>;
}
