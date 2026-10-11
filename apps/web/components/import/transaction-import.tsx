'use client';
import {useEffect, useMemo, useState} from 'react';
import {createCatalogLoader} from '../../lib/market-catalog-client';
import type {MarketCatalogAsset} from '../../lib/market-assets';
import {CoinPicker, FEATURED_COINS} from '../portfolio/coin-picker';
import {TRANSACTION_FIELDS} from '../../lib/csv/mapping';
import {addedCoinIds, applyTransactionImport, planTransactionImport, resolveCoinWith, transactionImportId} from '../../lib/import/holdings';
import {createPortfolio} from '../../lib/portfolio/store';
import {type Portfolio, type PortfolioCoin, type PortfolioCurrency, type PortfolioData, type PortfolioTransaction} from '../../lib/portfolio/schema';
import type {ImportRecord} from '../../lib/import/undo-schema';
import {localDate} from '../../lib/local-date';
import {saveFailureMessage, storageUiCode} from '../../lib/storage-error-copy';
import {FileStep, MappingStep, RecentImports, RefusedRows, StepActions, StepHeading, setupFromText, type CsvFile, type CsvSetup, type SetupOptions} from './csv-import-steps';
import type {ImportUndoStore} from './use-import-undo';

const loadCatalog = createCatalogLoader();
const OPTIONS: SetupOptions = {fields: TRANSACTION_FIELDS, numberFields: ['quantity', 'price', 'fee'], dateField: 'date'};
const KIND_LABEL: Record<PortfolioTransaction['kind'], string> = {buy: 'Buy', sell: 'Sell', 'transfer-in': 'Transfer in', 'transfer-out': 'Transfer out'};
const REQUIRED = ['coin', 'quantity', 'date'];
/** A storage refusal keeps its coded message; anything else is the engine's own plain sentence. */
export const importFailure = (error: unknown, fallback: string) => storageUiCode(error) === 'SAVE_FAILED' ? (error instanceof Error && error.message ? error.message : fallback) : saveFailureMessage(error);
type Target = {kind: 'existing'; id: string} | {kind: 'new'; name: string; portfolioKind: Portfolio['kind']; currency: PortfolioCurrency};

/**
 * W3: transactions from a CSV into a Portfolio. Four steps (file, columns, preview, confirm); the coin list resolves
 * symbols exactly or leaves them to the person; the apply is one Portfolio write, so a history that would go below
 * zero refuses the whole import. Nothing is uploaded; the undo ledger remembers exactly what was created.
 */
export function TransactionImportPanel({data, update, imports, onUndo, onClose}: {data: PortfolioData; update: (change: (current: PortfolioData) => PortfolioData) => PortfolioData; imports: ImportUndoStore; onUndo: (record: ImportRecord) => Promise<void>; onClose: () => void}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1), [file, setFile] = useState<CsvFile | null>(null), [setup, setSetup] = useState<CsvSetup | null>(null);
  const [target, setTarget] = useState<Target>(() => data.portfolios[0] ? {kind: 'existing', id: data.portfolios[0].id} : {kind: 'new', name: '', portfolioKind: 'real', currency: 'USD'});
  const [choices, setChoices] = useState<Record<string, PortfolioCoin | 'skip'>>({}), [picking, setPicking] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<MarketCatalogAsset[] | null | undefined>(undefined);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [done, setDone] = useState<{count: number; name: string; note: string} | null>(null);
  useEffect(() => { let active = true; void loadCatalog().then(assets => { if (active) setCatalog(assets); }).catch(() => { if (active) setCatalog(null); }); return () => { active = false; }; }, []);
  const resolveCoin = useMemo(() => resolveCoinWith(catalog ?? null, FEATURED_COINS), [catalog]);
  const today = localDate();
  const plan = useMemo(() => setup ? planTransactionImport({rows: setup.parsed.rows, mapping: setup.mapping, numberStyle: setup.numberStyle, dateFormat: setup.dateFormat, today, resolveCoin, choices}) : null, [setup, today, resolveCoin, choices]);
  const unknown = useMemo(() => { const groups = new Map<string, {text: string; rows: number[]}>(); for (const u of plan?.unknownCoins ?? []) { const key = u.text.trim().toLowerCase(); const g = groups.get(key) ?? {text: u.text, rows: []}; g.rows.push(u.row); groups.set(key, g); } return [...groups.entries()]; }, [plan]);
  const targetName = target.kind === 'new' ? target.name.trim() : data.portfolios.find(p => p.id === target.id)?.name ?? '';
  const mappingReady = !!setup && REQUIRED.every(id => setup.mapping[id] !== undefined) && !setup.ambiguousDates && targetName.length > 0;
  function confirm() {
    if (!plan || !setup) return;
    setBusy(true); setError('');
    const importId = crypto.randomUUID(), at = new Date().toISOString(), portfolioId = target.kind === 'new' ? crypto.randomUUID() : target.id, ready = plan.ready;
    let coinIds: string[] = [];
    try {
      update(current => { const base = target.kind === 'new' ? createPortfolio(current, {id: portfolioId, name: targetName, kind: target.portfolioKind, currency: target.currency, createdAt: at}) : current; const next = applyTransactionImport(base, portfolioId, ready, {importId, at}); coinIds = addedCoinIds(base, next, portfolioId); return next; });
    } catch (cause) { setError(importFailure(cause, 'The file was not imported. Nothing was changed.')); setBusy(false); return; }
    let note = '';
    try { imports.record({id: importId, kind: 'portfolio', at, label: `${ready.length} ${ready.length === 1 ? 'transaction' : 'transactions'} imported into ${targetName}`, portfolioId, createdIds: [...ready.map(r => transactionImportId(importId, r.row)), ...coinIds]}); }
    catch { note = 'The import went through, but the undo note could not be saved on this device.'; }
    setDone({count: ready.length, name: targetName, note}); setBusy(false);
  }
  if (done) return <section className="panel import-panel import-done" aria-label="Import transactions">
    <p role="status">{done.count} {done.count === 1 ? 'transaction' : 'transactions'} imported into {done.name}.</p>
    {done.note && <p className="notice">{done.note}</p>}
    <RecentImports imports={imports} kind="portfolio" onUndo={onUndo} />
    <div className="actions"><button type="button" className="secondary" onClick={onClose}>Done</button></div>
  </section>;
  return <section className="panel import-panel" aria-label="Import transactions">
    <h2>Import transactions</h2>
    {step === 1 && <><StepHeading step={1} title="Choose a file" /><FileStep onFile={f => { try { const next = setupFromText(f.text, OPTIONS); setFile(f); setSetup(next); setChoices({}); setStep(2); return null; } catch (cause) { return cause instanceof Error ? cause.message : 'This file could not be read.'; } }} />
      <RecentImports imports={imports} kind="portfolio" onUndo={onUndo} /><StepActions onBack={onClose} /></>}
    {step === 2 && setup && file && <><StepHeading step={2} title="Match the columns" /><MappingStep setup={setup} options={OPTIONS} text={file.text} onChange={setSetup}>
      <fieldset className="import-target"><legend>Into portfolio</legend>
        <label className="field"><span>Portfolio</span><select value={target.kind === 'new' ? 'new' : target.id} onChange={event => setTarget(event.target.value === 'new' ? {kind: 'new', name: '', portfolioKind: 'real', currency: 'USD'} : {kind: 'existing', id: event.target.value})}>{data.portfolios.map(p => <option key={p.id} value={p.id}>{p.name} · {p.currency}</option>)}<option value="new">New portfolio</option></select></label>
        {target.kind === 'new' && <div className="import-new-portfolio"><label className="field"><span>Portfolio name</span><input required maxLength={80} value={target.name} onChange={event => setTarget({...target, name: event.target.value})} placeholder="For example: long-term coins" /></label>
          <label className="field"><span>What it holds</span><select value={target.portfolioKind} onChange={event => setTarget({...target, portfolioKind: event.target.value as Portfolio['kind']})}><option value="real">Real holdings</option><option value="hypothetical">Hypothetical, for planning</option></select></label>
          <label className="field"><span>Currency</span><select value={target.currency} onChange={event => setTarget({...target, currency: event.target.value as PortfolioCurrency})}><option value="USD">USD</option><option value="EUR">EUR</option></select></label></div>}
        <p className="fine">Prices and fees are read in the portfolio’s currency. Leave “Fee” unmatched if the file gives fees in coins.</p>
      </fieldset>
    </MappingStep><StepActions onBack={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={!mappingReady} /></>}
    {step === 3 && plan && <><StepHeading step={3} title="Preview" />
      <p className="import-summary" aria-live="polite">{plan.ready.length} rows ready · {plan.unknownCoins.length} unknown {plan.unknownCoins.length === 1 ? 'coin' : 'coins'} · {plan.refused.length} rows refused</p>
      {catalog === undefined && <p className="fine" role="status">Loading the coin list…</p>}
      {catalog === null && <p className="fine" role="status">The full coin list is unavailable right now. Symbols are matched against the featured coins only.</p>}
      {unknown.length > 0 && <ul className="import-unknown" aria-label="Unrecognised coins">{unknown.map(([key, group]) => <li key={key}>
        <span>{group.rows.length === 1 ? `Row ${group.rows[0]}` : `Rows ${group.rows.slice(0, 5).join(', ')}${group.rows.length > 5 ? '…' : ''}`}: “{group.text}” is not recognised; choose a coin from the list or skip the {group.rows.length === 1 ? 'row' : 'rows'}.</span>
        <div className="actions"><button type="button" className="secondary" aria-expanded={picking === key} onClick={() => setPicking(picking === key ? null : key)}>Choose a coin</button><button type="button" className="quiet" onClick={() => { setChoices({...choices, [key]: 'skip'}); if (picking === key) setPicking(null); }}>Skip {group.rows.length === 1 ? 'row' : 'rows'}</button></div>
        {picking === key && <CoinPicker value={null} onChange={coin => { setChoices({...choices, [key]: coin}); setPicking(null); }} />}
      </li>)}</ul>}
      {plan.ready.length > 0 && <div className="import-preview"><table><caption className="sr-only">The first rows that will be imported</caption><thead><tr><th scope="col">Row</th><th scope="col">Coin</th><th scope="col">Type</th><th scope="col">Quantity</th><th scope="col">Price per coin</th><th scope="col">Fee</th><th scope="col">Date</th><th scope="col">Note</th></tr></thead>
        <tbody>{plan.ready.slice(0, 50).map(r => <tr key={r.row}><td className="num">{r.row}</td><td>{r.coin.name} <small>{r.coin.symbol}</small></td><td>{KIND_LABEL[r.kind]}</td><td className="num">{r.quantity}</td><td className="num">{r.price ?? (r.kind.startsWith('transfer') ? 'no price' : '')}</td><td className="num">{r.fee ?? ''}</td><td>{r.date}</td><td>{r.note.slice(0, 40)}</td></tr>)}</tbody></table>
        {plan.ready.length > 50 && <p className="fine">… and {plan.ready.length - 50} more rows.</p>}</div>}
      {plan.ready.some(r => r.kind.startsWith('transfer') && !r.price) && <p className="fine">Transfers without a price: the cost of what they bring stays unknown.</p>}
      <RefusedRows refused={plan.refused} />
      {plan.ready.length === 0 && unknown.length === 0 && <p role="alert">Nothing to import: every row was refused.</p>}
      <StepActions onBack={() => setStep(2)} onNext={() => setStep(4)} nextDisabled={plan.ready.length === 0 || unknown.length > 0} />
      {unknown.length > 0 && <p className="fine">Choose a coin or skip the rows for each unrecognised coin to continue.</p>}
    </>}
    {step === 4 && plan && <><StepHeading step={4} title="Confirm" />
      <p className="import-summary">{plan.ready.length} {plan.ready.length === 1 ? 'transaction' : 'transactions'} into {targetName}{target.kind === 'new' ? ' (a new portfolio)' : ''}.</p>
      <p className="fine">You can undo this import from the banner until you change any of these records. Repeated coins extend the portfolio’s coin list once each.</p>
      {error && <p role="alert">{error}</p>}
      <StepActions onBack={() => setStep(3)} onNext={confirm} nextLabel={`Import ${plan.ready.length} ${plan.ready.length === 1 ? 'transaction' : 'transactions'} into ${targetName}`} busy={busy} primary />
    </>}
  </section>;
}
