'use client';
import {Suspense, lazy, useMemo, useState} from 'react';
import {HOLDINGS_FIELDS} from '../../lib/csv/mapping';
import {MONEY_FIELDS} from '../../lib/csv/templates/presets';
import {planMoneyRows} from '../../lib/csv/templates/money-rows';
import {addEntries, alreadyLogged, removeEntries, toMoneyEntries, type RefusedRow} from '../../lib/bankfiles';
import {MONEY_LOG} from '../../lib/money-log/schema';
import {useDeviceRecord} from '../ai/use-device-record';
import {formatDate} from '../../lib/visual-format';
import './bankfiles/bankfiles.css';
import {applyHoldingsImport, holdingImportId, planHoldingsImport} from '../../lib/import/holdings';
import type {Platform} from '../../lib/positions';
import type {ImportRecord} from '../../lib/import/undo-schema';
import {FileStep, MappingStep, RecentImports, RefusedRows, StepActions, StepHeading, setupFromText, type CsvFile, type CsvSetup, type SetupOptions} from './csv-import-steps';
import type {ImportUndoStore} from './use-import-undo';
import {plainErrorMessage} from '../../lib/plain-error';

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
    {step === 1 && <><StepHeading step={1} title="Choose a file" /><FileStep target="holdings" onFile={f => { try { setSetup(setupFromText(f.text, OPTIONS)); setFile(f); setStep(2); return null; } catch (cause) { return plainErrorMessage(cause, 'This file could not be read.'); } }} />
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

// Session AK (A14, 7.1): spending and income into the money log (Wealth → Spending), from a bank statement file or a CSV.
const BankFileImport = lazy(() => import('./bankfiles/bank-file-import'));
const MONEY_OPTIONS: SetupOptions = {fields: MONEY_FIELDS, numberFields: ['amount', 'debit', 'credit'], dateField: 'date'};
const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'] as const;
const PREVIEW_ROWS = 200;
const money = (amount: string, currency: string) => { try { return new Intl.NumberFormat('en-GB', {style: 'currency', currency}).format(Number(amount)); } catch { return `${amount} ${currency}`; } };
/** The money-log import sheet: a bank statement file (CAMT.053, OFX, MT940) or a CSV, each read on this device only. */
export function MoneyImportPanel({onClose}: {onClose: () => void}) {
  const [source, setSource] = useState<'bank' | 'csv'>('bank');
  return <section className="import-panel" aria-label="Import spending and income">
    <h2>Import spending and income</h2>
    <p className="fine">Into your money log on Wealth → Spending. Read on this device only: nothing is uploaded and no bank is connected. Nothing is added until you confirm.</p>
    <div className="picker-tabs" role="group" aria-label="What kind of file">
      {([['bank', 'Bank statement file'], ['csv', 'CSV file']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={source === value} onClick={() => setSource(value)}>{label}</button>)}
    </div>
    {source === 'bank' ? <Suspense fallback={<p className="fine">Loading…</p>}><BankFileImport/></Suspense> : <MoneyCsvImport onClose={onClose}/>}
    {source === 'bank' && <div className="actions"><button type="button" className="quiet" onClick={onClose}>Close</button></div>}
  </section>;
}

/**
 * A CSV into the money log, in the same four steps as the other CSV imports: the columns are matched (or a saved match
 * or a preset is used), every row is previewed with possible repeats and rows already in the log unticked, refused rows
 * say why, and nothing is added until the person confirms. Undo removes exactly what this import added.
 */
export function MoneyCsvImport({onClose}: {onClose: () => void}) {
  const log = useDeviceRecord(MONEY_LOG);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1), [file, setFile] = useState<CsvFile | null>(null), [setup, setSetup] = useState<CsvSetup | null>(null), [currency, setCurrency] = useState<string>('EUR');
  const [picked, setPicked] = useState<ReadonlySet<number> | null>(null), [error, setError] = useState('');
  const [done, setDone] = useState<{added: number; refused: RefusedRow[]; ids: ReadonlySet<string>; undone?: boolean} | null>(null);
  const plan = useMemo(() => setup ? planMoneyRows({rows: setup.parsed.rows, mapping: setup.mapping, numberStyle: setup.numberStyle, dateFormat: setup.dateFormat, currency}) : null, [setup, currency]);
  const logged = useMemo(() => new Set(plan && log.loaded ? plan.transactions.filter(t => alreadyLogged(t, log.data)).map(t => t.index) : []), [plan, log.loaded, log.data]);
  const included = picked ?? new Set(plan?.transactions.filter(t => !t.duplicate && !logged.has(t.index)).map(t => t.index) ?? []);
  const chosen = plan?.transactions.filter(t => included.has(t.index)) ?? [];
  const mappingReady = !!setup && setup.mapping.date !== undefined && ['amount', 'debit', 'credit'].some(f => setup.mapping[f] !== undefined);
  const toggle = (index: number) => setPicked(() => { const next = new Set(included); if (next.has(index)) next.delete(index); else next.add(index); return next; });
  function confirm() {
    setError('');
    try {
      const out = toMoneyEntries(chosen, log.data, new Date(), () => crypto.randomUUID());
      if (out.entries.length) log.update(current => addEntries(current, out.entries));
      setDone({added: out.entries.length, refused: out.refused, ids: new Set(out.entries.map(e => e.id))});
    } catch (cause) { setError(plainErrorMessage(cause, 'Nothing was added on this device.')); }
  }
  function undo() {
    if (!done) return;
    try { log.update(current => removeEntries(current, done.ids)); setDone({...done, undone: true}); }
    catch (cause) { setError(plainErrorMessage(cause, 'The import was not undone.')); }
  }
  if (!log.loaded) return <p className="fine">Loading your money log…</p>;
  if (log.unreadable) return <p role="alert">This device&rsquo;s money log could not be read, so nothing can be added to it now. Its bytes are kept.</p>;
  if (done) return <div className="import-step import-done">
    <p role="status">{done.undone ? 'The import was undone: the entries it added are removed.' : `${done.added} ${done.added === 1 ? 'entry' : 'entries'} added to your money log${done.refused.length ? `; ${done.refused.length} could not be added (listed below)` : ''}.`}</p>
    {!done.undone && done.refused.length > 0 && <RefusedRows refused={done.refused.map(r => ({row: r.index, reason: `Row ${r.index}: ${r.reason}`}))}/>}
    {error && <p role="alert">{error}</p>}
    <div className="actions">{!done.undone && done.added > 0 && <button type="button" className="secondary" onClick={undo}>Undo this import</button>}<button type="button" className="secondary" onClick={onClose}>Done</button></div>
  </div>;
  return <div className="import-step">
    {step === 1 && <><StepHeading step={1} title="Choose a file" /><FileStep target="money" onFile={f => { try { setSetup(setupFromText(f.text, MONEY_OPTIONS)); setFile(f); setPicked(null); setStep(2); return null; } catch (cause) { return plainErrorMessage(cause, 'This file could not be read.'); } }} /><StepActions onBack={onClose} /></>}
    {step === 2 && setup && file && <><StepHeading step={2} title="Match the columns" /><MappingStep setup={setup} options={MONEY_OPTIONS} text={file.text} onChange={next => { setSetup(next); setPicked(null); }}>
      {setup.mapping.currency === undefined && <label className="field"><span>Currency of this file</span><select value={currency} onChange={e => { setCurrency(e.target.value); setPicked(null); }}>{CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select></label>}
      <p className="fine">Choose the Date and either an Amount column (a minus sign is money out) or Money out and Money in. An &ldquo;In or out&rdquo; column, when the file has one, decides the direction.</p>
    </MappingStep><StepActions onBack={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={!mappingReady} /></>}
    {step === 3 && plan && <><StepHeading step={3} title="Preview" />
      <p className="import-summary" aria-live="polite">{plan.transactions.length} {plan.transactions.length === 1 ? 'row' : 'rows'} read · {chosen.length} ticked · {plan.refused.length} {plan.refused.length === 1 ? 'row' : 'rows'} refused</p>
      {plan.warnings.map(w => <p key={w} className="fine">{w}</p>)}
      {plan.transactions.length > 0 && <div className="bankfile-table-wrap"><table className="bankfile-table">
        <caption className="fine">Ticked rows are added. Possible repeats and rows already in your log start unticked.</caption>
        <thead><tr><th scope="col">Add</th><th scope="col">Date</th><th scope="col">Payee</th><th scope="col">Amount</th><th scope="col">Note</th></tr></thead>
        <tbody>{plan.transactions.slice(0, PREVIEW_ROWS).map(t => <tr key={t.index}>
          <td><input type="checkbox" checked={included.has(t.index)} onChange={() => toggle(t.index)} aria-label={`Add ${t.payee || 'row'} ${t.amount} ${t.currency} on ${formatDate(t.date)}`}/></td>
          <td>{formatDate(t.date)}</td>
          <td className="bankfile-payee">{t.payee || '—'}{t.description && t.description !== t.payee && <span className="fine"> · {t.description}</span>}</td>
          <td className={t.direction === 'in' ? 'bankfile-in' : undefined}>{t.direction === 'in' ? '+' : '−'}{money(t.amount, t.currency)}</td>
          <td className="fine">{t.duplicate ? 'Possible repeat in this file' : logged.has(t.index) ? 'Already in your log' : ''}</td>
        </tr>)}</tbody>
      </table></div>}
      {plan.transactions.length > PREVIEW_ROWS && <p className="fine">The first {PREVIEW_ROWS} rows are shown; the rest are added as ticked.</p>}
      <RefusedRows refused={plan.refused.map(r => ({row: r.index, reason: `Row ${r.index}: ${r.reason}`}))} />
      {plan.transactions.length === 0 && <p role="alert">Nothing to import: every row was refused.</p>}
      <StepActions onBack={() => setStep(2)} onNext={() => setStep(4)} nextDisabled={chosen.length === 0} />
    </>}
    {step === 4 && plan && <><StepHeading step={4} title="Confirm" />
      <p className="import-summary">{chosen.length} {chosen.length === 1 ? 'entry' : 'entries'} will be added to your money log: {chosen.filter(t => t.direction === 'out').length} spent, {chosen.filter(t => t.direction === 'in').length} received.</p>
      <p className="fine">The category is read from each payee and note, as the log&rsquo;s own form does; you can change any entry afterwards. You can undo this import right after it.</p>
      {error && <p role="alert">{error}</p>}
      <StepActions onBack={() => setStep(3)} onNext={confirm} nextLabel={`Add ${chosen.length} to my money log`} primary />
    </>}
  </div>;
}
