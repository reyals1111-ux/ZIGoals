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
import {CHECKIN_REASONS, checkinNote, type TradeCheckin} from '../../lib/portfolio/trade-checkin';
import {RECEIPTS, RECEIPT_KINDS, RECEIPT_LABEL, receiptOf, setReceipt, type ReceiptKind} from '../../lib/portfolio/receipts';
import {useDeviceRecord} from '../ai/use-device-record';

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
  // Session AI (G12): the optional 30-second check-in, written into the note of a new buy or sell.
  const [checkin, setCheckin] = useState<TradeCheckin>({});
  const coin = preset ?? picked, transfer = kind === 'transfer-in' || kind === 'transfer-out';
  // Session AI (J15): what a transfer in was (a staking reward, income, an airdrop), kept beside the transaction.
  const receipts = useDeviceRecord(RECEIPTS), [received, setReceived] = useState<ReceiptKind | ''>(t0 ? receiptOf(receipts.data, t0.id) ?? '' : '');
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
    const txId = edit ? edit.transaction.id : crypto.randomUUID();
    if (run(data => addTransaction(edit ? removeTransaction(data, portfolio.id, edit.transaction.id) : data, portfolio.id, coin, {id: txId, kind, quantity: q!, ...(p === null ? {} : {price: p}), ...(f === null ? {} : {fee: f}), date, note: !edit && !transfer ? checkinNote(note, checkin) : note.trim(), createdAt: edit?.transaction.createdAt ?? new Date().toISOString()}), edit ? `${TX_LABEL[kind]} of ${coin.symbol} updated.` : `${TX_LABEL[kind]} of ${coin.symbol} recorded.`, 'The transaction was not saved.')) { try { const k = kind === 'transfer-in' && received ? received : null; if (k || receiptOf(receipts.data, txId)) receipts.update(r => setReceipt(r, txId, k)); } catch { /* the transaction stands; what it was can be named again */ } if (edit) { edit.onDone(); return; } setReceived(''); setQuantity(''); setPrice(''); setFee(''); setNote(''); setCheckin({}); }
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
      {!edit && !transfer && <details className="trade-checkin">
        <summary>A 30-second check-in — optional</summary>
        <p className="fine">Your own words, saved in this trade&rsquo;s note; ZIGi can read them back to you later. Nothing here is advice.</p>
        <fieldset className="trade-checkin-row"><legend>Why this trade?</legend>{CHECKIN_REASONS.map(r => <label key={r} className="trade-chip"><input type="radio" name="checkin-reason" checked={checkin.reason === r} onChange={() => setCheckin(c => ({...c, reason: r}))}/><span>{r}</span></label>)}</fieldset>
        <fieldset className="trade-checkin-row"><legend>How sure are you?</legend>{[1, 2, 3, 4, 5].map(n => <label key={n} className="trade-chip"><input type="radio" name="checkin-sure" checked={checkin.sure === n} onChange={() => setCheckin(c => ({...c, sure: n}))}/><span>{n}</span></label>)}<span className="fine">1 unsure · 5 very sure</span></fieldset>
        <label className="field"><span>When would you sell? — optional</span><input maxLength={120} value={checkin.exit ?? ''} onChange={event => setCheckin(c => ({...c, exit: event.target.value}))}/></label>
      </details>}
      {kind === 'transfer-in' && <label className="field"><span>Received as</span><select value={received} onChange={event => setReceived(event.target.value as ReceiptKind | '')}><option value="">A transfer</option>{RECEIPT_KINDS.map(k => <option key={k} value={k}>{RECEIPT_LABEL[k]}</option>)}</select></label>}
      {transfer && <p className="fine">A transfer without a price leaves the cost of what it brings unknown, so results stay unknown until it is sold or sent on.</p>}
      {problem && <p role="alert">{problem}</p>}
      <button className="primary" type="submit">Save transaction</button>
    </form>}
  </details>;
}
