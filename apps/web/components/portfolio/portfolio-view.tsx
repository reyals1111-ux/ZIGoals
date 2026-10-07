'use client';
import {useState} from 'react';
import Link from 'next/link';
import {NebulaFlow} from '../nebula-flow';
import {usePortfolios} from './use-portfolios';
import {usePortfolioMarket, type CoinMarket} from './use-portfolio-market';
import {AllTransactions, AllocationDonut, CoinSearch, HoldingsTable, KIND_LABEL, PortfolioSummary, rowsFor} from './portfolio-sections';
import {PortfolioValueChart} from './value-chart';
import {TransactionForm, type Run} from './transaction-form';
import {Watchlist} from '../platform/watchlist';
import {usePlatform} from '../platform/use-platform';
import {marketRefKey} from '../../lib/market-assets';
import {localDate} from '../../lib/local-date';
import {exportFileName} from '../../lib/showcase-detect';
import {storageMessageOr} from '../../lib/storage-error-copy';
import {type Portfolio, type PortfolioCoin, type PortfolioCurrency} from '../../lib/portfolio/schema';
import {HoldingsBelowZero, holdings, portfolioTotals} from '../../lib/portfolio/math';
import {allTimeResult, dayChange} from '../../lib/portfolio/performance';
import {PortfolioUnreadable, createPortfolio, deletePortfolio, exportPortfolios, parsePortfolioImport, removeTransaction, renamePortfolio} from '../../lib/portfolio/store';
import {usePhoneActive} from '../phone/use-phone-layout';
import {PhoneFormSheet} from '../phone/phone-form-sheet';
import {PhoneFold} from '../phone/phone-fold';
import {useImportUndo} from '../import/use-import-undo';
import {ImportBanner} from '../import/csv-import-steps';
import {TransactionImportPanel} from '../import/transaction-import';
import {UndoRefused, undoImport} from '../../lib/import/holdings';
import type {ImportRecord} from '../../lib/import/undo-schema';
import './portfolio.css';

const NO_COINS: PortfolioCoin[] = [];
/** Messages a reader can act on; storage refusals keep their Part 5 code. */
function failure(error: unknown, fallback: string) {
  if (error instanceof HoldingsBelowZero || error instanceof PortfolioUnreadable) return error.message;
  return storageMessageOr(error, fallback);
}

/**
 * Portfolio (Session I, Part 11): crypto portfolios kept on this device (synced only by the opt-in of ADR-013), each in USD or EUR and marked real or
 * hypothetical. Prices come only from the shared public quotes (or the Showcase's labelled fixture); without one, a
 * value is unknown, never zero. Nothing here is read by Wealth, Goals, Positions, Allocation, Activity or Today.
 */
export function PortfolioView() {
  const store = usePortfolios();
  const [selectedId, setSelectedId] = useState<string | null>(null), [creating, setCreating] = useState(false);
  const [message, setMessage] = useState(''), [error, setError] = useState('');
  // W3: transactions from a CSV (phone: a sheet; desktop: a panel below the files), with this device's undo ledger.
  const [importing, setImporting] = useState(false), phone = usePhoneActive(), imports = useImportUndo();
  const selected = store.data.portfolios.find(p => p.id === selectedId) ?? store.data.portfolios[0];
  const live = !store.showcase && !!selected;
  const market = usePortfolioMarket(selected?.coins ?? NO_COINS, selected?.currency ?? 'USD', store.showcase, !!selected);
  const run = (change: Parameters<typeof store.update>[0], done: string, fallback: string, options?: {replaceUnreadable?: boolean}) => {
    setError(''); setMessage('');
    try { store.update(change, options); setMessage(done); return true; } catch (cause) { setError(failure(cause, fallback)); return false; }
  };
  const undoRecord = async (record: ImportRecord) => {
    setError(''); setMessage('');
    try { store.update(data => undoImport(record, {portfolio: data}).portfolio!); } catch (cause) { throw Error(cause instanceof UndoRefused ? cause.message : failure(cause, 'The import was not undone.')); }
    imports.forget(record.id); setMessage('Import undone.');
  };
  const importPanel = importing && <TransactionImportPanel data={store.data} update={store.update} imports={imports} onUndo={undoRecord} onClose={() => setImporting(false)} />;
  const noPrices = live && selected!.coins.length > 0 && !market.loading && selected!.coins.every(c => !market.of(c).price);
  return <div className="dashboard portfolio-page">
    <section className="portfolio-hero" aria-labelledby="portfolio-title">
      <p className="eyebrow page-eyebrow"><NebulaFlow identity="portfolio-eyebrow">On this device</NebulaFlow></p>
      <h1 id="portfolio-title"><NebulaFlow identity="portfolio-title">Portfolio</NebulaFlow></h1>
      <p className="page-lede">Keep track of coins you hold, or a portfolio you are only considering. It stays apart from your Wealth and Goals.</p>
      {store.showcase && <p className="portfolio-note" role="note">Showcase: a fictional portfolio with fixture prices. These are not market prices.</p>}
      {noPrices && <p className="portfolio-note" role="status">No live price is available right now. Values and results stay unknown until one is.</p>}
    </section>
    {message && <p role="status" className="portfolio-message">{message}</p>}
    {error && <p role="alert" className="notice">{error}</p>}
    <ImportBanner imports={imports} kind="portfolio" onUndo={undoRecord} />
    {!store.loaded ? <p role="status">Loading your portfolios…</p>
      : store.unreadable ? <Unreadable onStartOver={() => run(() => ({version: 1, portfolios: []}), 'Started over. The unreadable portfolios were replaced.', 'Could not start over.', {replaceUnreadable: true})} />
      : <>
        <nav className="portfolio-switcher" aria-label="Your portfolios">
          {store.data.portfolios.map(p => <button key={p.id} type="button" className="secondary" aria-pressed={p.id === selected?.id} onClick={() => { setSelectedId(p.id); setMessage(''); setError(''); }}><strong>{p.name}</strong><small>{KIND_LABEL[p.kind]} · {p.currency}</small></button>)}
          <button type="button" className="primary" aria-expanded={creating || !store.data.portfolios.length} onClick={() => setCreating(!creating)}>+ New portfolio</button>
        </nav>
        {(creating || !store.data.portfolios.length) && <CreatePortfolio onCreate={input => { const id = crypto.randomUUID(); if (run(data => createPortfolio(data, {...input, id, createdAt: new Date().toISOString()}), `${input.name.trim()} created.`, 'This portfolio was not created.')) { setSelectedId(id); setCreating(false); } }} />}
        {selected && <PortfolioPanel key={selected.id} portfolio={selected} marketOf={market.of} attribution={!store.showcase && market.priced} run={run} showcase={store.showcase} />}
        <PortfolioWatch showcase={store.showcase} />
        <CoinSearch portfolioId={selected?.id} />
        <PortfolioFiles data={store.data} showcase={store.showcase} onImport={data => run(() => data, 'Portfolios replaced from the file.', 'The file was not imported.')} importing={importing} onImportCsv={() => setImporting(!importing)} />
        {importPanel && (phone ? <PhoneFormSheet title="Import transactions" onClose={() => setImporting(false)}>{importPanel}</PhoneFormSheet> : importPanel)}
      </>}
    <p className="fine portfolio-privacy">Stored on this device and not part of your private backups. With an account, it syncs, encrypted, only if you tick &ldquo;Also sync my Portfolio&rdquo; in Settings. Portfolio never changes your Wealth, Goals, Positions or Today.</p>
  </div>;
}

/** Session W Part 15: the shared Markets favourites (at most 8; no format of Portfolio's own). The Showcase lists its
 * fictional favourites without asking for prices, as Portfolio asks nothing in the Showcase. */
function PortfolioWatch({showcase}: {showcase: boolean}) {
  const platform = usePlatform();
  if (!showcase) return <Watchlist compact />;
  if (!platform.loaded || platform.error) return null;
  return <section className="panel market-watch compact-watch" aria-label="Favourite markets"><header className="wealth-section-heading"><div><p className="eyebrow">MARKETS THAT MATTER TO YOU</p><h2>Your market watch</h2></div></header>
    <ul className="portfolio-search-results">{platform.data.watchlist.map(f => <li key={marketRefKey(f.ref)}><Link href={`/app/wealth/asset/${encodeURIComponent(marketRefKey(f.ref))}`}><strong>{f.name}</strong><span>{f.symbol}</span></Link></li>)}</ul>
    <p className="fine">Showcase: the prices of your favourites are on Markets.</p></section>;
}

function Unreadable({onStartOver}: {onStartOver: () => void}) {
  const [confirm, setConfirm] = useState(false);
  return <section className="panel portfolio-unreadable" aria-label="Portfolios could not be read">
    <h2>Your saved portfolios could not be read.</h2>
    <p>They were not changed. If you have an export, you can import it below after starting over.</p>
    {confirm ? <div className="actions"><button type="button" className="secondary" onClick={onStartOver}>Replace them with an empty list</button><button type="button" className="quiet" onClick={() => setConfirm(false)}>Keep them</button></div>
      : <button type="button" className="quiet" onClick={() => setConfirm(true)}>Start over…</button>}
  </section>;
}

function CreatePortfolio({onCreate}: {onCreate: (input: {name: string; kind: Portfolio['kind']; currency: PortfolioCurrency}) => void}) {
  const [name, setName] = useState(''), [kind, setKind] = useState<Portfolio['kind']>('real'), [currency, setCurrency] = useState<PortfolioCurrency>('USD');
  return <form className="panel portfolio-form" aria-label="New portfolio" onSubmit={event => { event.preventDefault(); if (name.trim()) onCreate({name, kind, currency}); }}>
    <h2>New portfolio</h2>
    <label className="field"><span>Portfolio name</span><input required maxLength={80} value={name} onChange={event => setName(event.target.value)} placeholder="For example: long-term coins" /></label>
    <fieldset className="portfolio-choice"><legend>What it holds</legend>
      <label><input type="radio" name="portfolio-kind" checked={kind === 'real'} onChange={() => setKind('real')} />Real holdings</label>
      <label><input type="radio" name="portfolio-kind" checked={kind === 'hypothetical'} onChange={() => setKind('hypothetical')} />Hypothetical, for planning</label>
    </fieldset>
    <label className="field"><span>Currency</span><select value={currency} onChange={event => setCurrency(event.target.value as PortfolioCurrency)}><option value="USD">USD</option><option value="EUR">EUR</option></select></label>
    <p className="fine">Totals stay in this currency. Portfolios in other currencies are never added together.</p>
    <button className="primary" type="submit">Create portfolio</button>
  </form>;
}

function PortfolioPanel({portfolio, marketOf, attribution, run, showcase}: {portfolio: Portfolio; marketOf: (coin: PortfolioCoin) => CoinMarket; attribution: boolean; run: Run; showcase: boolean}) {
  const [sort, setSort] = useState<'value' | 'name' | 'result'>('value'), [renaming, setRenaming] = useState(false), [removing, setRemoving] = useState(false);
  const held = holdings(portfolio), rows = rowsFor(portfolio, held, marketOf), priceOf = (coin: string) => rows.find(r => r.holding.coin === coin)?.market.price?.value;
  const totals = portfolioTotals(portfolio, priceOf), day = dayChange(rows.map(r => ({quantity: r.holding.quantity, value: r.value, change24h: r.market.change24h}))), allTime = allTimeResult(portfolio, priceOf);
  const stale = rows.some(r => r.market.price?.stale && Number(r.holding.quantity) > 0);
  return <section className="panel portfolio-panel" aria-labelledby={`portfolio-${portfolio.id}-title`}>
    <header className="portfolio-panel-head">
      <div><p className="eyebrow">{KIND_LABEL[portfolio.kind]} · {portfolio.currency}</p><h2 id={`portfolio-${portfolio.id}-title`}>{portfolio.name}</h2></div>
      <div className="portfolio-panel-actions"><button type="button" className="quiet" onClick={() => setRenaming(!renaming)}>Rename</button><button type="button" className="quiet" onClick={() => setRemoving(true)}>Delete</button></div>
    </header>
    {renaming && <form className="portfolio-inline-form" aria-label="Rename portfolio" onSubmit={event => { event.preventDefault(); const name = String(new FormData(event.currentTarget).get('name') ?? ''); if (name.trim() && run(data => renamePortfolio(data, portfolio.id, name), 'Portfolio renamed.', 'The new name was not saved.')) setRenaming(false); }}><label className="field"><span>New name</span><input name="name" required maxLength={80} defaultValue={portfolio.name} /></label><button className="secondary" type="submit">Save name</button></form>}
    {removing && <div className="portfolio-confirm" role="alertdialog" aria-label="Delete portfolio"><p>Delete “{portfolio.name}” and its {portfolio.transactions.length} transactions from this device? Export it first to keep a copy.</p><div className="actions"><button type="button" className="secondary" onClick={() => run(data => deletePortfolio(data, portfolio.id), 'Portfolio deleted.', 'The portfolio was not deleted.')}>Delete portfolio</button><button type="button" className="quiet" onClick={() => setRemoving(false)}>Keep it</button></div></div>}
    <PortfolioSummary portfolio={portfolio} totals={totals} day={day} allTime={allTime} stale={stale} />
    {rows.length > 0 && <>
      {/* On a phone, allocation and the transaction list fold away under their names; elsewhere they stay open. */}
      <div className="portfolio-overview"><PortfolioValueChart portfolio={portfolio} showcase={showcase} />{rows.some(r => r.value !== undefined && Number(r.value) > 0) && <PhoneFold label="Allocation"><AllocationDonut portfolio={portfolio} rows={rows} /></PhoneFold>}</div>
      <HoldingsTable portfolio={portfolio} rows={rows} sort={sort} onSort={setSort} />
      {attribution && <p className="fine portfolio-attribution">Prices by CoinGecko, when available. A price that needs a refresh says so with its time.</p>}
      {showcase && <p className="fine portfolio-attribution">Showcase fixture prices, not market data.</p>}
      <PhoneFold label="Transactions"><AllTransactions portfolio={portfolio} onRemove={id => run(data => removeTransaction(data, portfolio.id, id), 'Transaction removed.', 'The transaction was not removed.')} /></PhoneFold>
    </>}
    <TransactionForm portfolio={portfolio} run={run} />
  </section>;
}

function PortfolioFiles({data, showcase, onImport, importing, onImportCsv}: {data: import('../../lib/portfolio/schema').PortfolioData; showcase: boolean; onImport: (data: import('../../lib/portfolio/schema').PortfolioData) => boolean; importing: boolean; onImportCsv: () => void}) {
  const [pending, setPending] = useState<import('../../lib/portfolio/schema').PortfolioData | null>(null), [problem, setProblem] = useState('');
  const download = () => { const url = URL.createObjectURL(new Blob([exportPortfolios(data)], {type: 'application/json'})); const link = document.createElement('a'); link.href = url; link.download = exportFileName(`zigoals-portfolio-${localDate()}.json`, showcase); link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  return <section className="panel portfolio-files" aria-label="Portfolio file">
    <h2>Keep a copy</h2>
    <p>Export your portfolios as a file, or replace them from one. The file holds only Portfolio.</p>
    <div className="actions"><button type="button" className="secondary" disabled={!data.portfolios.length} onClick={download}>Export portfolios</button>
      <button type="button" className="secondary" aria-expanded={importing} onClick={onImportCsv}>Import transactions from a CSV</button>
      <label className="secondary portfolio-file-input">Import from a file<input type="file" accept="application/json,.json" onChange={async event => { setProblem(''); setPending(null); const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; try { setPending(parsePortfolioImport(await file.text())); } catch (error) { setProblem(error instanceof Error ? error.message : 'The file was not imported. Nothing was changed.'); } }} /></label></div>
    {problem && <p role="alert">{problem}</p>}
    {pending && <div className="portfolio-confirm" role="alertdialog" aria-label="Replace portfolios"><p>Replace all {data.portfolios.length} portfolios on this device with the {pending.portfolios.length} in this file?</p><div className="actions"><button type="button" className="secondary" onClick={() => { if (onImport(pending)) setPending(null); }}>Replace my portfolios</button><button type="button" className="quiet" onClick={() => setPending(null)}>Cancel</button></div></div>}
  </section>;
}
