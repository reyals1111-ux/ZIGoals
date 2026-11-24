'use client';
import {Suspense, lazy, useId, useMemo, useRef, useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {CARD_FORMATS, STORE_CARDS, type CardFormat, type StoreCard} from '../../../lib/store-cards/schema';
import {FORMAT_WORDS, addCard, cardIssue, removeCard} from '../../../lib/store-cards/cards';
import {barRuns, encodeBars, formatFromScan, guessFormat} from '../../../lib/store-cards/barcode';
import {removeWithUndo} from '../../ui/remove-with-undo';
import {PhoneFold} from '../../phone/phone-fold';
import './store-cards.css';
const QrCode = lazy(() => import('../../qr/qr-code'));

/**
 * Session AV lane 2, round 2 (money; Wallet's loyalty and club cards): store and club cards kept on this device — a name
 * and the number on the card, typed or read from a photo of its barcode (the scanner already in ZIGoals: the browser's
 * own BarcodeDetector, else the installed ZXing reader) — and shown full screen as the barcode the card uses (drawn by
 * ZIGoals' own encoder, lib/store-cards/barcode.ts) or a QR code. Black on white whatever the theme, so a till can read
 * it. Nothing is sent anywhere. Adding a card to Apple or Google Wallet is native-only. Its own chunk.
 */
export function CardBars({card, label, wide = false}: {card: Pick<StoreCard, 'number' | 'format'>; label: string; wide?: boolean}) {
  const drawn = useMemo(() => card.format === 'qr' ? null : encodeBars(card.number, card.format), [card.number, card.format]);
  if (card.format === 'qr') return <Suspense fallback={<p className="fine">Drawing…</p>}><QrCode value={card.number} label={label} size={wide ? 'min(80vw, 360px)' : 160} className="store-card-qr"/></Suspense>;
  if (!drawn?.ok) return <p className="fine">{drawn?.problem}</p>;
  const quiet = 10, w = drawn.bars.modules.length + quiet * 2, h = wide ? Math.round(w * 0.35) : Math.round(w * 0.3);
  return <svg className={`store-card-bars${wide ? ' is-wide' : ''}`} role="img" aria-label={label} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" shapeRendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
    <rect width={w} height={h} fill="#fff"/>
    {barRuns(drawn.bars.modules).map(([x, width]) => <rect key={x} x={x + quiet} y={0} width={width} height={h} fill="#000"/>)}
  </svg>;
}
type Detector = {detect: (source: ImageBitmap) => Promise<{rawValue: string; format: string}[]>};
type DetectorConstructor = (new (options: {formats: string[]}) => Detector) & {getSupportedFormats?: () => Promise<string[]>};
/** Reads one barcode or QR code from a photo, on this device; null when none is found. */
async function readPhoto(file: File): Promise<{number: string; format: CardFormat} | null> {
  const formats = ['ean_13', 'ean_8', 'upc_a', 'code_128', 'qr_code'], C = (window as unknown as {BarcodeDetector?: DetectorConstructor}).BarcodeDetector;
  let native = false;
  try { if (C?.getSupportedFormats) native = (await C.getSupportedFormats()).some(f => formats.includes(f)); } catch { native = false; }
  if (native && C) {
    const bitmap = await createImageBitmap(file);
    try { const found = (await new C({formats}).detect(bitmap))[0]; if (found?.rawValue) return {number: found.rawValue, format: formatFromScan(found.format) ?? guessFormat(found.rawValue)}; } finally { bitmap.close(); }
  }
  const [{BrowserMultiFormatReader}, {BarcodeFormat}] = await Promise.all([import('@zxing/browser'), import('@zxing/library')]);
  const url = URL.createObjectURL(file);
  try { const result = await new BrowserMultiFormatReader().decodeFromImageUrl(url); const text = result.getText(); return text ? {number: text, format: formatFromScan(BarcodeFormat[result.getBarcodeFormat()] ?? '') ?? guessFormat(text)} : null; }
  catch { return null; } finally { URL.revokeObjectURL(url); }
}
export default function StoreCards() {
  const id = useId(), cards = useDeviceRecord(STORE_CARDS), dialog = useRef<HTMLDialogElement>(null), opener = useRef<HTMLButtonElement | null>(null), heading = useRef<HTMLHeadingElement>(null), photo = useRef<HTMLInputElement>(null);
  const [shown, setShown] = useState<StoreCard | null>(null), [adding, setAdding] = useState(false), [problem, setProblem] = useState(''), [said, setSaid] = useState(''), [reading, setReading] = useState(false);
  const [draft, setDraft] = useState<{name: string; number: string; format: CardFormat; note: string}>({name: '', number: '', format: 'code128', note: ''});
  if (!cards.loaded) return null;
  if (cards.unreadable) return <p role="alert">Your store cards on this device could not be read; nothing was changed.</p>;
  const show = (card: StoreCard, button: HTMLButtonElement) => { opener.current = button; setShown(card); requestAnimationFrame(() => dialog.current?.showModal()); };
  const save = (event: FormEvent) => {
    event.preventDefault();
    const issue = cardIssue(draft); if (issue) { setProblem(issue); return; }
    try { cards.update(r => addCard(r, draft, `card_${crypto.randomUUID().slice(0, 12)}`, new Date().toISOString())); setSaid(`${draft.name.trim()} kept on this device.`); setAdding(false); setDraft({name: '', number: '', format: 'code128', note: ''}); setProblem(''); requestAnimationFrame(() => heading.current?.focus()); }
    catch (e) { setProblem(e instanceof Error ? e.message : 'Not kept on this device.'); }
  };
  const fromPhoto = async (file: File) => {
    setReading(true); setProblem('');
    try { const found = await readPhoto(file); if (!found) setProblem('No barcode was found on this photo. Try again closer, in good light, or type the number.'); else { setDraft(d => ({...d, number: found.number, format: found.format})); setSaid(`Read from the photo: ${found.number} (${FORMAT_WORDS[found.format]}). The photo is not kept.`); } }
    catch { setProblem('This browser could not read the photo. Type the number instead.'); }
    finally { setReading(false); if (photo.current) photo.current.value = ''; }
  };
  const list = cards.data.cards;
  // Session AV lane 2 (phone-length): on a phone one row of Spending that says what it holds and opens in place (Wealth's
  // pinned screens, tests/pillar-phone-length.spec.ts); elsewhere as it was. The till dialog opens from Show, inside it.
  const holds = list.length ? `${list.length} ${list.length === 1 ? 'card' : 'cards'} to show at the till` : 'Loyalty and club cards, shown at the till';
  return <PhoneFold label="Store and club cards" detail={holds}><section className="store-cards" aria-labelledby={`${id}-t`}>
    <h3 id={`${id}-t`} ref={heading} tabIndex={-1}>Store and club cards</h3>
    {list.length ? <ul className="store-cards-list">{list.map(c => <li key={c.id}>
      <span className="store-cards-what"><strong>{c.name}</strong> <span className="fine">· {FORMAT_WORDS[c.format]}{c.note ? ` · ${c.note}` : ''}</span></span>
      <span className="store-cards-actions">
        <button type="button" className="secondary" aria-haspopup="dialog" aria-label={`Show ${c.name} at the till`} onClick={e => show(c, e.currentTarget)}>Show</button>
        <button type="button" className="quiet" aria-label={`Remove ${c.name}`} onClick={() => { void removeWithUndo(cards.update, r => removeCard(r, c.id), `${c.name} removed.`, `${c.name} is back.`).then(() => { setSaid(`${c.name} removed.`); heading.current?.focus(); }, () => setProblem('Not saved on this device.')); }}>Remove</button>
      </span>
    </li>)}</ul> : <p className="fine">Keep your loyalty and club cards here: type the number on the card, or read it from a photo of its barcode. “Show” puts the barcode on the whole screen for the till. Kept on this device only.</p>}
    {!adding ? <p><button type="button" className="secondary" aria-expanded={false} onClick={() => { setAdding(true); setSaid(''); }}>+ Add a card</button></p>
    : <form className="store-cards-form" onSubmit={save} aria-label="Add a store card" noValidate>
      <label className="field"><span>Name</span><input value={draft.name} maxLength={40} autoComplete="off" placeholder="Albert Heijn Bonus" onChange={e => setDraft(d => ({...d, name: e.target.value}))}/></label>
      <label className="field"><span>Card number</span><input value={draft.number} maxLength={80} autoComplete="off" inputMode="text" spellCheck={false} onChange={e => { const v = e.target.value; setDraft(d => ({...d, number: v, format: d.format === 'qr' ? 'qr' : guessFormat(v)})); }}/></label>
      <label className="store-cards-photo secondary"><input ref={photo} type="file" accept="image/*" capture="environment" onChange={e => { const f = e.target.files?.[0]; if (f) void fromPhoto(f); }}/><span>{reading ? 'Reading the photo…' : 'Read it from a photo'}</span></label>
      <label className="field"><span>Shown as</span><select value={draft.format} onChange={e => setDraft(d => ({...d, format: e.target.value as CardFormat}))}>{CARD_FORMATS.map(f => <option key={f} value={f}>{FORMAT_WORDS[f]}</option>)}</select></label>
      <label className="field"><span>Note — optional</span><input value={draft.note} maxLength={80} onChange={e => setDraft(d => ({...d, note: e.target.value}))}/></label>
      {draft.number.trim() && !cardIssue({...draft, name: draft.name || 'x'}) && <div className="store-cards-preview" aria-hidden="true"><CardBars card={draft} label="Preview"/></div>}
      {problem && <p role="alert">{problem}</p>}
      <div className="budgets-form-actions"><button type="submit" className="secondary">Keep the card</button><button type="button" className="quiet" onClick={() => { setAdding(false); setProblem(''); }}>Cancel</button></div>
    </form>}
    <p className="fine">Adding a card to Apple Wallet or Google Wallet needs a phone app; here it stays in ZIGoals.</p>
    <p className="fine" role="status">{said}</p>
    <dialog ref={dialog} className="store-card-dialog" aria-labelledby={`${id}-d`} onClose={() => { setShown(null); requestAnimationFrame(() => opener.current?.focus()); }}>
      {shown && <div className="store-card-full">
        <h2 id={`${id}-d`}>{shown.name}</h2>
        <CardBars card={shown} label={`${shown.name}: ${FORMAT_WORDS[shown.format]} of ${shown.number}`} wide/>
        <p className="store-card-number">{shown.number}</p>
        <p className="store-card-tip">Turn your screen brightness up if the till does not read it.</p>
        <form method="dialog"><button type="submit" className="primary" autoFocus>Done</button></form>
      </div>}
    </dialog>
  </section></PhoneFold>;
}
