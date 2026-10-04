'use client';
import {useMemo, useState} from 'react';
import {HOLDINGS_FIELDS} from '../../lib/csv/mapping';
import {applyHoldingsImport, holdingImportId, planHoldingsImport} from '../../lib/import/holdings';
import type {Platform} from '../../lib/positions';
import type {ImportRecord} from '../../lib/import/undo-schema';
import {FileStep, MappingStep, RecentImports, RefusedRows, StepActions, StepHeading, setupFromText, type CsvFile, type CsvSetup, type SetupOptions} from './csv-import-steps';
import type {ImportUndoStore} from './use-import-undo';

const OPTIONS: SetupOptions = {fields: HOLDINGS_FIELDS, numberFields: ['quantity', 'value']};
const REQUIRED = ['name', 'currency'];
/**
 * W3: holdings from a CSV into Wealth, as ordinary manual assets. A row without a value keeps no valuation ("Needs
 * valuation", never zero). One Wealth write applies every row; a refusal anywhere leaves the record unchanged.
 */
export function HoldingsImportPanel({update, imports, onUndo, onClose}: {platform: Platform; update: (fn: (s: Platform) => Platform) => Promise<void>; imports: ImportUndoStore; onUndo: (record: ImportRecord) => Promise<void>; onClose: () => void}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1), [file, setFile] = useState<CsvFile | null>(null), [setup, setSetup] = useState<CsvSetup | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [done, setDone] = useState<{count: number; note: string} | null>(null);
  const plan = useMemo(() => setup ? planHoldingsImport({rows: setup.parsed.rows, mapping: setup.mapping, numberStyle: setup.numberStyle}) : null, [setup]);
  const mappingReady = !!setup && REQUIRED.every(id => setup.mapping[id] !== undefined);
  async function confirm() {
    if (!plan) return;
    setBusy(true); setError('');
    const importId = crypto.randomUUID(), at = new Date().toISOString(), ready = plan.ready;
    try { await update(s => applyHoldingsImport(s, ready, {importId, at})); }
    catch (cause) { setError(cause instanceof Error && cause.message ? cause.message : 'The file was not imported. Nothing was changed.'); setBusy(false); return; }
    let note = '';
    try { imports.record({id: importId, kind: 'wealth', at, label: `${ready.length} ${ready.length === 1 ? 'asset' : 'assets'} added to Wealth`, createdIds: ready.map(r => holdingImportId(importId, r.row))}); }
    catch { note = 'The import went through, but the undo note could not be saved on this device.'; }
    setDone({count: ready.length, note}); setBusy(false);
  }
  if (done) return <section className="import-panel import-done" aria-label="Import holdings">
    <p role="status">{done.count} {done.count === 1 ? 'asset' : 'assets'} added to Wealth.</p>
    {done.note && <p className="notice">{done.note}</p>}
    <RecentImports imports={imports} kind="wealth" onUndo={onUndo} />
    <div className="actions"><button type="button" className="secondary" onClick={onClose}>Done</button></div>
  </section>;
  return <section className="import-panel" aria-label="Import holdings">
    <h2>Import holdings</h2>
    {step === 1 && <><StepHeading step={1} title="Choose a file" /><FileStep onFile={f => { try { setSetup(setupFromText(f.text, OPTIONS)); setFile(f); setStep(2); return null; } catch (cause) { return cause instanceof Error ? cause.message : 'This file could not be read.'; } }} />
      <RecentImports imports={imports} kind="wealth" onUndo={onUndo} /><StepActions onBack={onClose} /></>}
    {step === 2 && setup && file && <><StepHeading step={2} title="Match the columns" /><MappingStep setup={setup} options={OPTIONS} text={file.text} onChange={setSetup}>
      <p className="fine">“Kind of asset” is read as cash, crypto, stablecoins, stocks, precious metals or property; anything else becomes a custom asset. A row without a value is added without a valuation.</p>
    </MappingStep><StepActions onBack={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={!mappingReady} /></>}
    {step === 3 && plan && <><StepHeading step={3} title="Preview" />
      <p className="import-summary" aria-live="polite">{plan.ready.length} rows ready · {plan.refused.length} rows refused</p>
      {plan.ready.length > 0 && <div className="import-preview"><table><caption className="sr-only">The first rows that will be added</caption><thead><tr><th scope="col">Row</th><th scope="col">Name</th><th scope="col">Asset</th><th scope="col">Quantity</th><th scope="col">Kind</th><th scope="col">Value</th></tr></thead>
        <tbody>{plan.ready.slice(0, 50).map(r => <tr key={r.row}><td className="num">{r.row}</td><td>{r.input.name}</td><td>{r.input.symbol ?? ''}</td><td className="num">{r.input.quantity || '1'}</td><td>{r.input.category}</td><td className="num">{r.input.value ? `${r.input.value} ${r.input.currency}` : r.input.category === 'Cash' ? `${r.input.quantity} ${r.input.currency}` : 'Needs valuation'}</td></tr>)}</tbody></table>
        {plan.ready.length > 50 && <p className="fine">… and {plan.ready.length - 50} more rows.</p>}</div>}
      <RefusedRows refused={plan.refused} />
      {plan.ready.length === 0 && <p role="alert">Nothing to import: every row was refused.</p>}
      <StepActions onBack={() => setStep(2)} onNext={() => setStep(4)} nextDisabled={plan.ready.length === 0} />
    </>}
    {step === 4 && plan && <><StepHeading step={4} title="Confirm" />
      <p className="import-summary">{plan.ready.length} {plan.ready.length === 1 ? 'asset' : 'assets'} will be added to Wealth as manual assets.</p>
      <p className="fine">You can undo this import from the banner until you change any of these assets or use one for a Goal.</p>
      {error && <p role="alert">{error}</p>}
      <StepActions onBack={() => setStep(3)} onNext={() => void confirm()} nextLabel={`Add ${plan.ready.length} ${plan.ready.length === 1 ? 'asset' : 'assets'} to Wealth`} busy={busy} primary />
    </>}
  </section>;
}
