'use client';
import {useLayoutEffect, useRef, useState, type FormEvent} from 'react';
import {CoinPicker} from './coin-picker';
import {TX_LABEL} from './portfolio-sections';
import {localDate} from '../../lib/local-date';
import {readDecimal} from '../../lib/portfolio/math';
import {addTransaction, removeTransaction} from '../../lib/portfolio/store';
import {HoldingsBelowZero} from '../../lib/portfolio/math';
import type {Portfolio, PortfolioCoin, PortfolioData, PortfolioTransaction} from '../../lib/portfolio/schema';
import {plainErrorMessage} from '../../lib/plain-error';
import {amountIssue, dateIssue, feeWarning, LIMITS} from '../../lib/limits/plausibility';
import {CHECKIN_REASONS, checkinNote, type TradeCheckin} from '../../lib/portfolio/trade-checkin';
import {RECEIPTS, RECEIPT_KINDS, RECEIPT_LABEL, receiptOf, setReceipt, type ReceiptKind} from '../../lib/portfolio/receipts';
import {useDeviceRecord} from '../ai/use-device-record';
import {FieldError, useFormErrors} from '../primitives/field-error';

/**
 * Session AL (TK-024, P8; fourth pass): after a refused save the message opens under its field, which pushes Save down.
 * The page scrolls by exactly that much, so Save stays under the pointer, and the field takes the focus without a jump
 * (it is scrolled only when it would sit outside the window).
 */
export function holdSaveInPlace(save: HTMLElement | null, before: number | null, field: HTMLElement | null, win: Window = window): void {
  if (save && before !== null) { const shift = save.getBoundingClientRect().top - before; if (Math.abs(shift) >= 1) win.scrollBy({top: shift, left: 0, behavior: 'instant'}); }
  if (!field) return;
  const box = field.getBoundingClientRect();
  if (box.top < 0 || box.bottom > win.innerHeight) { try { field.scrollIntoView({block: 'nearest', inline: 'nearest'}); } catch { /* an old engine without options */ } }
  try { field.focus({preventScroll: true}); } catch { field.focus(); }
}

export type Run = (change: (data: PortfolioData) => PortfolioData, done: string, fallback: string, options?: {inline?: (message: string, cause: unknown) => void}) => boolean;
/** Record a buy, sell or transfer (Session I; Session W Part 15: a coin's page presets its coin and skips the picker). */
/** Session AH (WE2, N-146): `edit` reopens a recorded transaction, prefilled; saving replaces it (the history check still applies). */
export function TransactionForm({portfolio, run, coin: preset, edit}: {portfolio: Portfolio; run: Run; coin?: PortfolioCoin; edit?: {transaction: PortfolioTransaction; onDone: () => void}}) {
  const today = localDate();
  const [picked, setCoin] = useState<PortfolioCoin | null>(null), [kind, setKind] = useState<PortfolioTransaction['kind']>(edit?.transaction.kind ?? 'buy');
  const t0 = edit?.transaction;
  const [feeChecked, setFeeChecked] = useState<string | null>(null), [quantity, setQuantity] = useState(t0?.quantity ?? ''), [price, setPrice] = useState(t0?.price ?? ''), [fee, setFee] = useState(t0?.fee ?? ''), [date, setDate] = useState(t0?.date ?? today), [note, setNote] = useState(t0?.note ?? ''), form = useFormErrors();
  // The form, and with it the coin list request, appears only once the reader opens it.
  const [open, setOpen] = useState(!!edit || (!portfolio.transactions.length && !preset));
  // Session AI (G12): the optional 30-second check-in, written into the note of a new buy or sell.
  const [checkin, setCheckin] = useState<TradeCheckin>({});
  const coin = preset ?? picked, transfer = kind === 'transfer-in' || kind === 'transfer-out';
  // Session AI (J15): what a transfer in was (a staking reward, income, an airdrop), kept beside the transaction.
  const receipts = useDeviceRecord(RECEIPTS), [received, setReceived] = useState<ReceiptKind | ''>(t0 ? receiptOf(receipts.data, t0.id) ?? '' : '');
  // Session AL (TK-024, TK-041; P6, P8): every refusal is said under the field it is about (an oversell under Quantity),
  // the field is marked and focused, and Save never moves; a message about no single field sits beside Save.
  const saveRef = useRef<HTMLButtonElement>(null), held = useRef<{field: string; top: number | null} | null>(null);
  const failAt = (field: 'quantity' | 'price' | 'fee' | 'date', message: string) => {
    held.current = {field, top: saveRef.current?.getBoundingClientRect().top ?? null};
    form.clear(); form.set(field, message);
  };
  const {errors, field: fieldProps} = form;
  useLayoutEffect(() => {
    const hold = held.current; if (!hold || !errors[hold.field]) return; held.current = null;
    holdSaveInPlace(saveRef.current, hold.top, document.getElementById(fieldProps(hold.field).id));
  }, [errors, fieldProps]);
  function submit(event: FormEvent) {
    event.preventDefault(); form.clear();
    const at = failAt;
    let q: string | null, p: string | null, f: string | null;
    try { q = readDecimal(quantity); } catch (error) { return at('quantity', plainErrorMessage(error, 'Check the quantity.')); }
    try { p = price.trim() ? readDecimal(price) : null; } catch (error) { return at('price', plainErrorMessage(error, 'Check the price.')); }
    try { f = fee.trim() ? readDecimal(fee) : null; } catch (error) { return at('fee', plainErrorMessage(error, 'Check the fee.')); }
    if (!coin) return form.failForm('Choose a coin.');
    if (!q || !/[1-9]/.test(q)) return at('quantity', 'Enter a quantity above zero.');
    if (price.trim() && p === null) return at('price', 'Enter the price per coin as a number, or leave it empty for a transfer.');
    if (!transfer && p === null) return at('price', 'A buy or a sell needs its price per coin.');
    // Session AH (WE2, B-060): a buy or a sell at no price at all is a typing slip; a transfer may carry none.
    if (!transfer && p !== null && !/[1-9]/.test(p)) return at('price', 'A buy or a sell needs a price above zero.');
    if (fee.trim() && f === null) return at('fee', 'Enter the fee as a number, or leave it empty.');
    if (date > today) return at('date', 'Choose today or an earlier date.');
    // Session AH (VA2, B3; B-182, B-195, B-199): the shared limits — no trillion-coin buy, no 1900 date — and a fee larger than
    // the trade asks once before it is kept.
    for (const [field, v] of [['quantity', q], ['price', p], ['fee', f]] as const) if (v !== null) { const issue = amountIssue(Number(v)); if (issue) return at(field, issue); }
    if (q && p && Number(q) * Number(p) > LIMITS.amountMax) return at('quantity', 'That trade is worth more than a trillion. Check the quantity and the price.');
    { const issue = dateIssue(date, today); if (issue) return at('date', issue); }
    const feeNote = q && p && f ? feeWarning(Number(f), Number(q) * Number(p)) : null;
    if (feeNote && feeChecked !== f) { setFeeChecked(f); return at('fee', `${feeNote} Save again to keep it.`); }
    const txId = edit ? edit.transaction.id : crypto.randomUUID();
    if (run(data => addTransaction(edit ? removeTransaction(data, portfolio.id, edit.transaction.id) : data, portfolio.id, coin, {id: txId, kind, quantity: q!, ...(p === null ? {} : {price: p}), ...(f === null ? {} : {fee: f}), date, note: !edit && !transfer ? checkinNote(note, checkin) : note.trim(), createdAt: edit?.transaction.createdAt ?? new Date().toISOString()}), edit ? `${TX_LABEL[kind]} of ${coin.symbol} updated.` : `${TX_LABEL[kind]} of ${coin.symbol} recorded.`, 'The transaction was not saved.', {inline: (message, cause) => { if (cause instanceof HoldingsBelowZero) failAt('quantity', message); else form.failForm(message); }})) { try { const k = kind === 'transfer-in' && received ? received : null; if (k || receiptOf(receipts.data, txId)) receipts.update(r => setReceipt(r, txId, k)); } catch { /* the transaction stands; what it was can be named again */ } if (edit) { edit.onDone(); return; } setReceived(''); setQuantity(''); setPrice(''); setFee(''); setNote(''); setCheckin({}); }
  }
  return <details className="portfolio-add" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>{edit ? 'Edit this transaction' : preset ? `Record a ${preset.symbol} transaction` : 'Record a transaction'}</summary>
    {open && <form className="portfolio-form" aria-label={edit ? 'Edit a transaction' : 'Record a transaction'} onSubmit={submit} noValidate>
      {preset ? <p className="portfolio-coin-chosen">Coin: <strong>{preset.name}</strong> <span>{preset.symbol}</span> · in {portfolio.name}</p> : <CoinPicker value={picked} onChange={setCoin} />}
      <label className="field"><span>Type</span><select value={kind === 'transfer-in' && received ? `in:${received}` : kind} onChange={event => { const v = event.target.value; if (v.startsWith('in:')) { setKind('transfer-in'); setReceived(v.slice(3) as ReceiptKind); } else { setKind(v as PortfolioTransaction['kind']); if (v !== 'transfer-in') setReceived(''); } }}>{(Object.keys(TX_LABEL) as PortfolioTransaction['kind'][]).map(k => <option key={k} value={k}>{TX_LABEL[k]}</option>)}{/* Session AL (P5, N-TK-04): a reward, an airdrop or income is findable in the Type list (a transfer in, named) */}<optgroup label="Received (a transfer in)">{RECEIPT_KINDS.map(k => <option key={k} value={`in:${k}`}>{RECEIPT_LABEL[k]}</option>)}</optgroup></select></label>
      <div className="portfolio-form-grid">
        <div className="field-with-error"><label className="field"><span>Quantity</span><input inputMode="decimal" autoComplete="off" required value={quantity} onChange={event => setQuantity(event.target.value)} {...form.field('quantity')} /></label><FieldError {...form.message('quantity')} /></div>
        <div className="field-with-error"><label className="field"><span>Price per coin ({portfolio.currency}){transfer ? ' — optional' : ''}</span><input inputMode="decimal" autoComplete="off" value={price} onChange={event => setPrice(event.target.value)} {...form.field('price')} /></label><FieldError {...form.message('price')} /></div>
        <div className="field-with-error"><label className="field"><span>Fee ({portfolio.currency}) — optional</span><input inputMode="decimal" autoComplete="off" value={fee} onChange={event => setFee(event.target.value)} {...form.field('fee')} /></label><FieldError {...form.message('fee')} /></div>
        <div className="field-with-error"><label className="field"><span>Date</span><input type="date" required min="1990-01-01" max={today} value={date} onChange={event => setDate(event.target.value)} {...form.field('date')} /></label><FieldError {...form.message('date')} /></div>
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
      <button ref={saveRef} className="primary" type="submit">Save transaction</button>
      {form.formError && <p role="alert" className="field-error">{form.formError}</p>}
    </form>}
  </details>;
}
