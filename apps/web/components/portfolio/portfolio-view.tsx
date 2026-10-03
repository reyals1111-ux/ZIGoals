'use client';
import {useMemo, useState, type FormEvent} from 'react';
import {formatUnits} from '@zigoals/chain-config';
import {NebulaFlow} from '../nebula-flow';
import {useMarketQuotes} from '../platform/use-market-quotes';
import {useMarketInsights} from '../platform/use-market-insights';
import {usePortfolios} from './use-portfolios';
import {CoinPicker} from './coin-picker';
import {marketRequestKey} from '../../lib/market-assets';
import {quoteIsStale} from '../../lib/market-quotes';
import {referenceQuote} from '../../lib/product-insights';
import {formatDate, formatDateTime, formatExactNumber, formatMoney, formatNumber, formatPrice, formatSignedMoney} from '../../lib/visual-format';
import {localDate} from '../../lib/local-date';
import {exportFileName} from '../../lib/showcase-detect';
import {storageMessageOr} from '../../lib/storage-error-copy';
import {coinKey, type Portfolio, type PortfolioCoin, type PortfolioCurrency, type PortfolioTransaction} from '../../lib/portfolio/schema';
import {HoldingsBelowZero, holdings, ordered, portfolioTotals, readDecimal, valueHolding} from '../../lib/portfolio/math';
import {PortfolioUnreadable, addTransaction, createPortfolio, deletePortfolio, exportPortfolios, parsePortfolioImport, removeTransaction, renamePortfolio} from '../../lib/portfolio/store';
import {SHOWCASE_PRICES} from '../../lib/portfolio/showcase';
import './portfolio.css';

type Price = {value: string; source: string; at?: string; stale: boolean};
const KIND_LABEL = {real: 'Real holdings', hypothetical: 'Hypothetical'} as const;
const TX_LABEL: Record<PortfolioTransaction['kind'], string> = {buy: 'Buy', sell: 'Sell', 'transfer-in': 'Transfer in', 'transfer-out': 'Transfer out'};
/** Messages a reader can act on; storage refusals keep their Part 5 code. */
function failure(error: unknown, fallback: string) {
  if (error instanceof HoldingsBelowZero || error instanceof PortfolioUnreadable) return error.message;
  return storageMessageOr(error, fallback);
}
const signed = (value: string, currency: string) => formatSignedMoney(value, currency);
const percent = (value: string) => `${value.startsWith('-') ? '−' : '+'}${formatNumber(Math.abs(Number(value)), {maximumFractionDigits: 2})}%`;

/**
 * Portfolio (Session I, Part 11): crypto portfolios kept on this device only, each in USD or EUR and marked real or
 * hypothetical. Prices come only from the shared public quotes (or the Showcase's labelled fixture); without one, a
 * value is unknown, never zero. Nothing here is read by Wealth, Goals, Positions, Allocation, Activity or Today.
 */
export function PortfolioView() {
  const store = usePortfolios();
  const [selectedId, setSelectedId] = useState<string | null>(null), [creating, setCreating] = useState(false);
  const [message, setMessage] = useState(''), [error, setError] = useState('');
  const selected = store.data.portfolios.find(p => p.id === selectedId) ?? store.data.portfolios[0];
  const live = !store.showcase && !!selected;
  const requests = useMemo(() => live && selected ? selected.coins.map(c => ({marketRef: c.ref, currency: selected.currency})) : [], [live, selected]);
  const market = useMarketQuotes(requests.length ? requests : false);
  const insights = useMarketInsights(live && selected ? selected.coins.map(c => c.ref) : [], selected?.currency ?? 'USD');
  const priceOf = (coin: PortfolioCoin, currency: PortfolioCurrency): Price | undefined => {
    if (store.showcase) { const value = currency === 'USD' ? SHOWCASE_PRICES[coinKey(coin.ref)] : undefined; return value ? {value, source: 'Showcase fixture price', stale: false} : undefined; }
    const quote = referenceQuote(coin.ref, currency, market.quotes, market.now);
    return quote ? {value: formatUnits(quote.price, quote.priceDecimals), source: quote.source, at: quote.observedAt ?? quote.fetchedAt, stale: quoteIsStale(quote, market.now)} : undefined;
  };
  const run = (change: Parameters<typeof store.update>[0], done: string, fallback: string, options?: {replaceUnreadable?: boolean}) => {
    setError(''); setMessage('');
    try { store.update(change, options); setMessage(done); return true; } catch (cause) { setError(failure(cause, fallback)); return false; }
  };
  const noPrices = live && requests.length > 0 && !market.loading && !market.quotes.some(q => selected!.coins.some(c => referenceQuote(c.ref, selected!.currency, [q], market.now)));
  return <div className="dashboard portfolio-page">
    <section className="portfolio-hero" aria-labelledby="portfolio-title">
      <p className="eyebrow page-eyebrow"><NebulaFlow identity="portfolio-eyebrow">On this device only</NebulaFlow></p>
      <h1 id="portfolio-title"><NebulaFlow identity="portfolio-title">Portfolio</NebulaFlow></h1>
      <p className="page-lede">Keep track of coins you hold, or a portfolio you are only considering. It stays apart from your Wealth and Goals.</p>
      {store.showcase && <p className="portfolio-note" role="note">Showcase: a fictional portfolio with fixture prices. These are not market prices.</p>}
      {noPrices && <p className="portfolio-note" role="status">Live prices aren’t connected yet. Values and results stay unknown until a price is available.</p>}
    </section>
    {message && <p role="status" className="portfolio-message">{message}</p>}
    {error && <p role="alert" className="notice">{error}</p>}
    {!store.loaded ? <p role="status">Loading your portfolios…</p>
      : store.unreadable ? <Unreadable onStartOver={() => run(() => ({version: 1, portfolios: []}), 'Started over. The unreadable portfolios were replaced.', 'Could not start over.', {replaceUnreadable: true})} />
      : <>
        <nav className="portfolio-switcher" aria-label="Your portfolios">
          {store.data.portfolios.map(p => <button key={p.id} type="button" className="secondary" aria-pressed={p.id === selected?.id} onClick={() => { setSelectedId(p.id); setMessage(''); setError(''); }}><strong>{p.name}</strong><small>{KIND_LABEL[p.kind]} · {p.currency}</small></button>)}
          <button type="button" className="primary" aria-expanded={creating || !store.data.portfolios.length} onClick={() => setCreating(!creating)}>+ New portfolio</button>
        </nav>
        {(creating || !store.data.portfolios.length) && <CreatePortfolio onCreate={input => { const id = crypto.randomUUID(); if (run(data => createPortfolio(data, {...input, id, createdAt: new Date().toISOString()}), `${input.name.trim()} created.`, 'This portfolio was not created.')) { setSelectedId(id); setCreating(false); } }} />}
        {selected && <PortfolioPanel key={selected.id} portfolio={selected} priceOf={coin => priceOf(coin, selected.currency)} change24h={coin => insights.results[marketRequestKey({marketRef: coin.ref, currency: selected.currency})]?.insight?.change24h ?? null} attribution={!store.showcase && market.quotes.length > 0} run={run} showcase={store.showcase} />}
        <PortfolioFiles data={store.data} showcase={store.showcase} onImport={data => run(() => data, 'Portfolios replaced from the file.', 'The file was not imported.')} />
      </>}
    <p className="fine portfolio-privacy">Stored on this device only, never synced and not part of your private backups. Portfolio never changes your Wealth, Goals, Positions or Today.</p>
  </div>;
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

type Run = (change: (data: import('../../lib/portfolio/schema').PortfolioData) => import('../../lib/portfolio/schema').PortfolioData, done: string, fallback: string) => boolean;
function PortfolioPanel({portfolio, priceOf, change24h, attribution, run, showcase}: {portfolio: Portfolio; priceOf: (coin: PortfolioCoin) => Price | undefined; change24h: (coin: PortfolioCoin) => string | null; attribution: boolean; run: Run; showcase: boolean}) {
  const [sort, setSort] = useState<'value' | 'name' | 'result'>('value'), [open, setOpen] = useState<string | null>(null), [renaming, setRenaming] = useState(false), [removing, setRemoving] = useState(false);
  const coins = new Map(portfolio.coins.map(c => [coinKey(c.ref), c]));
  const rows = [...holdings(portfolio).values()].map(h => { const coin = coins.get(h.coin)!, price = priceOf(coin); return {holding: h, coin, price, ...valueHolding(h, price?.value)}; });
  const sorted = [...rows].sort((a, b) => sort === 'name' ? a.coin.name.localeCompare(b.coin.name) : Number((sort === 'value' ? b.value : b.unrealized) ?? -Infinity) - Number((sort === 'value' ? a.value : a.unrealized) ?? -Infinity) || a.coin.name.localeCompare(b.coin.name));
  const totals = portfolioTotals(portfolio, coin => priceOf(coins.get(coin)!)?.value), currency = portfolio.currency;
  const stale = rows.some(r => r.price?.stale && Number(r.holding.quantity) > 0);
  return <section className="panel portfolio-panel" aria-labelledby={`portfolio-${portfolio.id}-title`}>
    <header className="portfolio-panel-head">
      <div><p className="eyebrow">{KIND_LABEL[portfolio.kind]} · {currency}</p><h2 id={`portfolio-${portfolio.id}-title`}>{portfolio.name}</h2></div>
      <div className="portfolio-panel-actions"><button type="button" className="quiet" onClick={() => setRenaming(!renaming)}>Rename</button><button type="button" className="quiet" onClick={() => setRemoving(true)}>Delete</button></div>
    </header>
    {renaming && <form className="portfolio-inline-form" aria-label="Rename portfolio" onSubmit={event => { event.preventDefault(); const name = String(new FormData(event.currentTarget).get('name') ?? ''); if (name.trim() && run(data => renamePortfolio(data, portfolio.id, name), 'Portfolio renamed.', 'The new name was not saved.')) setRenaming(false); }}><label className="field"><span>New name</span><input name="name" required maxLength={80} defaultValue={portfolio.name} /></label><button className="secondary" type="submit">Save name</button></form>}
    {removing && <div className="portfolio-confirm" role="alertdialog" aria-label="Delete portfolio"><p>Delete “{portfolio.name}” and its {portfolio.transactions.length} transactions from this device? Export it first to keep a copy.</p><div className="actions"><button type="button" className="secondary" onClick={() => run(data => deletePortfolio(data, portfolio.id), 'Portfolio deleted.', 'The portfolio was not deleted.')}>Delete portfolio</button><button type="button" className="quiet" onClick={() => setRemoving(false)}>Keep it</button></div></div>}
    <dl className="portfolio-totals" aria-label={`${portfolio.name} totals`}>
      <div><dt>{totals.unpriced ? 'Known value' : 'Value'}</dt><dd>{totals.held ? formatMoney(totals.knownValue, currency) : 'Nothing held yet'}</dd>{totals.unpriced > 0 && <small>{totals.unpriced} {totals.unpriced === 1 ? 'coin has' : 'coins have'} no price yet and {totals.unpriced === 1 ? 'is' : 'are'} not counted.</small>}</div>
      <div><dt>Cost basis</dt><dd>{!totals.held ? '—' : totals.costKnown ? formatMoney(totals.cost, currency) : 'Unknown'}</dd>{totals.held > 0 && !totals.costKnown && <small>A transfer in without a price has no known cost.</small>}</div>
      <div><dt>Unrealized result</dt><dd>{totals.unrealized === undefined ? 'Unknown' : `${signed(totals.unrealized, currency)}${totals.unrealizedPct ? ` (${percent(totals.unrealizedPct)})` : ''}`}</dd>{stale && <small>Includes prices that need a refresh.</small>}</div>
    </dl>
    {rows.length > 0 && <>
      <div className="portfolio-sort"><label className="field"><span>Sort holdings</span><select value={sort} onChange={event => setSort(event.target.value as typeof sort)}><option value="value">By value</option><option value="result">By result</option><option value="name">By name</option></select></label></div>
      <ul className="portfolio-holdings" aria-label={`${portfolio.name} holdings`}>{sorted.map(row => {
        const key = row.holding.coin, change = change24h(row.coin);
        return <li key={key} className="portfolio-holding">
          <div className="portfolio-holding-main">
            <div><strong>{row.coin.name}</strong><small>{formatExactNumber(row.holding.quantity)} {row.coin.symbol}</small></div>
            <div className="portfolio-holding-value"><strong>{row.value === undefined ? 'Value unknown' : formatMoney(row.value, currency)}</strong><small>{row.unrealized === undefined ? row.holding.cost === undefined ? 'Result unknown (cost unknown)' : 'Result unknown (no price)' : `${signed(row.unrealized, currency)}${row.unrealizedPct ? ` · ${percent(row.unrealizedPct)}` : ''}`}</small></div>
          </div>
          <dl className="portfolio-holding-facts">
            <div><dt>Price</dt><dd>{row.price ? <>{formatPrice(row.price.value, currency)} <small data-stale={row.price.stale || undefined}>{row.price.stale ? 'Needs refresh' : row.price.source}{row.price.at ? ` · ${formatDateTime(row.price.at)}` : ''}</small></> : 'No price yet'}</dd></div>
            <div><dt>Average cost</dt><dd>{row.holding.averageCost === undefined ? Number(row.holding.quantity) > 0 ? 'Unknown' : '—' : formatPrice(row.holding.averageCost, currency)}</dd></div>
            <div><dt>24h</dt><dd>{change === null ? 'Unavailable' : percent(change)}</dd></div>
          </dl>
          <button type="button" className="text-link" aria-expanded={open === key} aria-controls={`holding-${portfolio.id}-${row.coin.ref.id}`} onClick={() => setOpen(open === key ? null : key)}>{open === key ? 'Hide transactions' : `Transactions (${row.holding.transactions})`}</button>
          {open === key && <CoinTransactions id={`holding-${portfolio.id}-${row.coin.ref.id}`} portfolio={portfolio} coin={key} currency={currency} run={run} />}
        </li>;
      })}</ul>
      {attribution && <p className="fine portfolio-attribution">Prices by CoinGecko, when available. A price that needs a refresh says so with its time.</p>}
      {showcase && <p className="fine portfolio-attribution">Showcase fixture prices, not market data.</p>}
    </>}
    <TransactionForm portfolio={portfolio} run={run} />
  </section>;
}

function CoinTransactions({id, portfolio, coin, currency, run}: {id: string; portfolio: Portfolio; coin: string; currency: PortfolioCurrency; run: Run}) {
  const list = ordered(portfolio.transactions.filter(t => t.coin === coin)).reverse();
  return <ol className="portfolio-transactions" id={id}>{list.map(t => <li key={t.id}>
    <span><strong>{TX_LABEL[t.kind]}</strong> {formatExactNumber(t.quantity)}{t.price !== undefined ? ` at ${formatPrice(t.price, currency)}` : ' · no price'}{t.fee ? ` · fee ${formatMoney(t.fee, currency)}` : ''}</span>
    <small><time dateTime={t.date}>{formatDate(`${t.date}T12:00:00`)}</time>{t.note ? ` · ${t.note}` : ''}</small>
    <button type="button" className="quiet" onClick={() => run(data => removeTransaction(data, portfolio.id, t.id), 'Transaction removed.', 'The transaction was not removed.')}>Remove</button>
  </li>)}</ol>;
}

function TransactionForm({portfolio, run}: {portfolio: Portfolio; run: Run}) {
  const today = localDate();
  const [coin, setCoin] = useState<PortfolioCoin | null>(null), [kind, setKind] = useState<PortfolioTransaction['kind']>('buy');
  const [quantity, setQuantity] = useState(''), [price, setPrice] = useState(''), [fee, setFee] = useState(''), [date, setDate] = useState(today), [note, setNote] = useState(''), [problem, setProblem] = useState('');
  // The form, and with it the coin list request, appears only once the reader opens it.
  const [open, setOpen] = useState(!portfolio.transactions.length);
  const transfer = kind === 'transfer-in' || kind === 'transfer-out';
  function submit(event: FormEvent) {
    event.preventDefault(); setProblem('');
    let q: string | null, p: string | null, f: string | null;
    try { q = readDecimal(quantity); p = price.trim() ? readDecimal(price) : null; f = fee.trim() ? readDecimal(fee) : null; } catch (error) { setProblem(error instanceof Error ? error.message : 'Check the amounts.'); return; }
    if (!coin) return setProblem('Choose a coin.');
    if (!q || !/[1-9]/.test(q)) return setProblem('Enter a quantity above zero.');
    if (price.trim() && p === null) return setProblem('Enter the price per coin as a number, or leave it empty for a transfer.');
    if (!transfer && p === null) return setProblem('A buy or a sell needs its price per coin.');
    if (fee.trim() && f === null) return setProblem('Enter the fee as a number, or leave it empty.');
    if (date > today) return setProblem('Choose today or an earlier date.');
    if (run(data => addTransaction(data, portfolio.id, coin, {id: crypto.randomUUID(), kind, quantity: q!, ...(p === null ? {} : {price: p}), ...(f === null ? {} : {fee: f}), date, note: note.trim(), createdAt: new Date().toISOString()}), `${TX_LABEL[kind]} of ${coin.symbol} recorded.`, 'The transaction was not saved.')) { setQuantity(''); setPrice(''); setFee(''); setNote(''); }
  }
  return <details className="portfolio-add" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>Record a transaction</summary>
    {open && <form className="portfolio-form" aria-label="Record a transaction" onSubmit={submit}>
      <CoinPicker value={coin} onChange={setCoin} />
      <label className="field"><span>Type</span><select value={kind} onChange={event => setKind(event.target.value as PortfolioTransaction['kind'])}>{(Object.keys(TX_LABEL) as PortfolioTransaction['kind'][]).map(k => <option key={k} value={k}>{TX_LABEL[k]}</option>)}</select></label>
      <div className="portfolio-form-grid">
        <label className="field"><span>Quantity</span><input inputMode="decimal" autoComplete="off" required value={quantity} onChange={event => setQuantity(event.target.value)} /></label>
        <label className="field"><span>Price per coin ({portfolio.currency}){transfer ? ' — optional' : ''}</span><input inputMode="decimal" autoComplete="off" value={price} onChange={event => setPrice(event.target.value)} /></label>
        <label className="field"><span>Fee ({portfolio.currency}) — optional</span><input inputMode="decimal" autoComplete="off" value={fee} onChange={event => setFee(event.target.value)} /></label>
        <label className="field"><span>Date</span><input type="date" required max={today} value={date} onChange={event => setDate(event.target.value)} /></label>
      </div>
      <label className="field"><span>Note — optional</span><input maxLength={500} value={note} onChange={event => setNote(event.target.value)} /></label>
      {transfer && <p className="fine">A transfer without a price leaves the cost of what it brings unknown, so results stay unknown until it is sold or sent on.</p>}
      {problem && <p role="alert">{problem}</p>}
      <button className="primary" type="submit">Save transaction</button>
    </form>}
  </details>;
}

function PortfolioFiles({data, showcase, onImport}: {data: import('../../lib/portfolio/schema').PortfolioData; showcase: boolean; onImport: (data: import('../../lib/portfolio/schema').PortfolioData) => boolean}) {
  const [pending, setPending] = useState<import('../../lib/portfolio/schema').PortfolioData | null>(null), [problem, setProblem] = useState('');
  const download = () => { const url = URL.createObjectURL(new Blob([exportPortfolios(data)], {type: 'application/json'})); const link = document.createElement('a'); link.href = url; link.download = exportFileName(`zigoals-portfolio-${localDate()}.json`, showcase); link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  return <section className="panel portfolio-files" aria-label="Portfolio file">
    <h2>Keep a copy</h2>
    <p>Export your portfolios as a file, or replace them from one. The file holds only Portfolio.</p>
    <div className="actions"><button type="button" className="secondary" disabled={!data.portfolios.length} onClick={download}>Export portfolios</button>
      <label className="secondary portfolio-file-input">Import from a file<input type="file" accept="application/json,.json" onChange={async event => { setProblem(''); setPending(null); const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; try { setPending(parsePortfolioImport(await file.text())); } catch (error) { setProblem(error instanceof Error ? error.message : 'The file was not imported. Nothing was changed.'); } }} /></label></div>
    {problem && <p role="alert">{problem}</p>}
    {pending && <div className="portfolio-confirm" role="alertdialog" aria-label="Replace portfolios"><p>Replace all {data.portfolios.length} portfolios on this device with the {pending.portfolios.length} in this file?</p><div className="actions"><button type="button" className="secondary" onClick={() => { if (onImport(pending)) setPending(null); }}>Replace my portfolios</button><button type="button" className="quiet" onClick={() => setPending(null)}>Cancel</button></div></div>}
  </section>;
}
