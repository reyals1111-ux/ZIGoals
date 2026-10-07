'use client';
import {useState, type FormEvent} from 'react';
import {CoinPicker} from './coin-picker';
import {TX_LABEL} from './portfolio-sections';
import {localDate} from '../../lib/local-date';
import {readDecimal} from '../../lib/portfolio/math';
import {addTransaction} from '../../lib/portfolio/store';
import type {Portfolio, PortfolioCoin, PortfolioData, PortfolioTransaction} from '../../lib/portfolio/schema';

export type Run = (change: (data: PortfolioData) => PortfolioData, done: string, fallback: string) => boolean;
/** Record a buy, sell or transfer (Session I; Session W Part 15: a coin's page presets its coin and skips the picker). */
export function TransactionForm({portfolio, run, coin: preset}: {portfolio: Portfolio; run: Run; coin?: PortfolioCoin}) {
  const today = localDate();
  const [picked, setCoin] = useState<PortfolioCoin | null>(null), [kind, setKind] = useState<PortfolioTransaction['kind']>('buy');
  const [quantity, setQuantity] = useState(''), [price, setPrice] = useState(''), [fee, setFee] = useState(''), [date, setDate] = useState(today), [note, setNote] = useState(''), [problem, setProblem] = useState('');
  // The form, and with it the coin list request, appears only once the reader opens it.
  const [open, setOpen] = useState(!portfolio.transactions.length && !preset);
  const coin = preset ?? picked, transfer = kind === 'transfer-in' || kind === 'transfer-out';
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
    <summary>{preset ? `Record a ${preset.symbol} transaction` : 'Record a transaction'}</summary>
    {open && <form className="portfolio-form" aria-label="Record a transaction" onSubmit={submit}>
      {preset ? <p className="portfolio-coin-chosen">Coin: <strong>{preset.name}</strong> <span>{preset.symbol}</span> · in {portfolio.name}</p> : <CoinPicker value={picked} onChange={setCoin} />}
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
