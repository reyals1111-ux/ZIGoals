'use client';
import {useState, type FormEvent} from 'react';
import {CoinPicker} from './coin-picker';
import {TX_LABEL} from './portfolio-sections';
import {localDate} from '../../lib/local-date';
import {readDecimal} from '../../lib/portfolio/math';
import {addTransaction, removeTransaction} from '../../lib/portfolio/store';
import type {Portfolio, PortfolioCoin, PortfolioData, PortfolioTransaction} from '../../lib/portfolio/schema';
import {plainErrorMessage} from '../../lib/plain-error';
import {amountIssue, dateIssue, feeWarning, LIMITS} from '../../lib/limits/plausibility';

export type Run = (change: (data: PortfolioData) => PortfolioData, done: string, fallback: string) => boolean;
/** Record a buy, sell or transfer (Session I; Session W Part 15: a coin's page presets its coin and skips the picker). */
/** Session AH (WE2, N-146): `edit` reopens a recorded transaction, prefilled; saving replaces it (the history check still applies). */
export function TransactionForm({portfolio, run, coin: preset, edit}: {portfolio: Portfolio; run: Run; coin?: PortfolioCoin; edit?: {transaction: PortfolioTransaction; onDone: () => void}}) {
  const today = localDate();
  const [picked, setCoin] = useState<PortfolioCoin | null>(null), [kind, setKind] = useState<PortfolioTransaction['kind']>(edit?.transaction.kind ?? 'buy');
  const t0 = edit?.transaction;
  const [feeChecked, setFeeChecked] = useState<string | null>(null), [quantity, setQuantity] = useState(t0?.quantity ?? ''), [price, setPrice] = useState(t0?.price ?? ''), [fee, setFee] = useState(t0?.fee ?? ''), [date, setDate] = useState(t0?.date ?? today), [note, setNote] = useState(t0?.note ?? ''), [problem, setProblem] = useState('');
  // The form, and with it the coin list request, appears only once the reader opens it.
  const [open, setOpen] = useState(!!edit || (!portfolio.transactions.length && !preset));
  const coin = preset ?? picked, transfer = kind === 'transfer-in' || kind === 'transfer-out';
  function submit(event: FormEvent) {
    event.preventDefault(); setProblem('');
    let q: string | null, p: string | null, f: string | null;
    try { q = readDecimal(quantity); p = price.trim() ? readDecimal(price) : null; f = fee.trim() ? readDecimal(fee) : null; } catch (error) { setProblem(plainErrorMessage(error, 'Check the amounts.')); return; }
    if (!coin) return setProblem('Choose a coin.');
    if (!q || !/[1-9]/.test(q)) return setProblem('Enter a quantity above zero.');
    if (price.trim() && p === null) return setProblem('Enter the price per coin as a number, or leave it empty for a transfer.');
    if (!transfer && p === null) return setProblem('A buy or a sell needs its price per coin.');
    // Session AH (WE2, B-060): a buy or a sell at no price at all is a typing slip; a transfer may carry none.
    if (!transfer && p !== null && !/[1-9]/.test(p)) return setProblem('A buy or a sell needs a price above zero.');
    if (fee.trim() && f === null) return setProblem('Enter the fee as a number, or leave it empty.');
    if (date > today) return setProblem('Choose today or an earlier date.');
    // Session AH (VA2, B3; B-182, B-195, B-199): the shared limits — no trillion-coin buy, no 1900 date — and a fee larger than
    // the trade asks once before it is kept.
    for (const v of [q, p, f]) if (v !== null) { const issue = amountIssue(Number(v)); if (issue) return setProblem(issue); }
    if (q && p && Number(q) * Number(p) > LIMITS.amountMax) return setProblem('That trade is worth more than a trillion. Check the quantity and the price.');
    { const issue = dateIssue(date, today); if (issue) return setProblem(issue); }
    const feeNote = q && p && f ? feeWarning(Number(f), Number(q) * Number(p)) : null;
    if (feeNote && feeChecked !== f) { setFeeChecked(f); return setProblem(`${feeNote} Save again to keep it.`); }
    if (run(data => addTransaction(edit ? removeTransaction(data, portfolio.id, edit.transaction.id) : data, portfolio.id, coin, {id: edit ? edit.transaction.id : crypto.randomUUID(), kind, quantity: q!, ...(p === null ? {} : {price: p}), ...(f === null ? {} : {fee: f}), date, note: note.trim(), createdAt: edit?.transaction.createdAt ?? new Date().toISOString()}), edit ? `${TX_LABEL[kind]} of ${coin.symbol} updated.` : `${TX_LABEL[kind]} of ${coin.symbol} recorded.`, 'The transaction was not saved.')) { if (edit) { edit.onDone(); return; } setQuantity(''); setPrice(''); setFee(''); setNote(''); }
  }
  return <details className="portfolio-add" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>{edit ? 'Edit this transaction' : preset ? `Record a ${preset.symbol} transaction` : 'Record a transaction'}</summary>
    {open && <form className="portfolio-form" aria-label={edit ? 'Edit a transaction' : 'Record a transaction'} onSubmit={submit} noValidate>
      {preset ? <p className="portfolio-coin-chosen">Coin: <strong>{preset.name}</strong> <span>{preset.symbol}</span> · in {portfolio.name}</p> : <CoinPicker value={picked} onChange={setCoin} />}
      <label className="field"><span>Type</span><select value={kind} onChange={event => setKind(event.target.value as PortfolioTransaction['kind'])}>{(Object.keys(TX_LABEL) as PortfolioTransaction['kind'][]).map(k => <option key={k} value={k}>{TX_LABEL[k]}</option>)}</select></label>
      <div className="portfolio-form-grid">
        <label className="field"><span>Quantity</span><input inputMode="decimal" autoComplete="off" required value={quantity} onChange={event => setQuantity(event.target.value)} /></label>
        <label className="field"><span>Price per coin ({portfolio.currency}){transfer ? ' — optional' : ''}</span><input inputMode="decimal" autoComplete="off" value={price} onChange={event => setPrice(event.target.value)} /></label>
        <label className="field"><span>Fee ({portfolio.currency}) — optional</span><input inputMode="decimal" autoComplete="off" value={fee} onChange={event => setFee(event.target.value)} /></label>
        <label className="field"><span>Date</span><input type="date" required min="1990-01-01" max={today} value={date} onChange={event => setDate(event.target.value)} /></label>
      </div>
      <label className="field"><span>Note — optional</span><input maxLength={500} value={note} onChange={event => setNote(event.target.value)} /></label>
      {transfer && <p className="fine">A transfer without a price leaves the cost of what it brings unknown, so results stay unknown until it is sold or sent on.</p>}
      {problem && <p role="alert">{problem}</p>}
      <button className="primary" type="submit">Save transaction</button>
    </form>}
  </details>;
}
