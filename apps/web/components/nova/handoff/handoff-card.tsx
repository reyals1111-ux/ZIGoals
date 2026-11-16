'use client';
import {useEffect, useId, useRef, useState, type MouseEvent} from 'react';
import {formatDate} from '../../../lib/visual-format';
import type {Handoff, HandoffLang} from '../../../lib/nova/handoff/handoff';
import {ARM_MS, mayPress} from '../../../lib/nova/handoff/press';
import {CARD_ACTION, CARD_PROMISE, CARD_TITLE, COPY_INSTEAD_ACTION, COPY_TEXT_ACTION, DONE_KEY, DONE_WORDS, FAILED_WORDS, NOT_NOW, OPEN_WITHOUT_TEXT, OUTSIDE_TEXT_LINE, SHARE_FALLBACK, cardNotes} from '../../../lib/nova/handoff/words';
import {canShare, copyOut, openLink, openMail, saveCalendar, shareNow, shareText, type RunResult} from './run';
import './handoff.css';

/**
 * Session AM-2 (owner's step 4b): a hand-off's confirm card, in NOVA's conversation. It shows exactly what will leave and
 * to where — every address, the whole subject and text, the whole link with its real host, the event's day and time —
 * and does nothing until the person presses its button. The press must be a real one (`isTrusted`): a script, a model's
 * reply or a synthetic click cannot press it. After the press the card says what happened in plain words; it never says
 * anything was sent, because the person's own mail app, calendar app, share sheet or browser takes it from there.
 * Security review (finding 7): the buttons arm half a second after the card appears, a button that did its work stays
 * locked ("Done"), a second press while one runs is ignored at once (lib/nova/handoff/press.ts), and the card never
 * moves the focus onto a button by itself. Finding 11: a card made after the conversation read text from outside says so.
 */
export type HandoffItem = {id: string; handoff: Handoff; lang: HandoffLang; by: 'device' | 'model';
  /** Earlier in this conversation NOVA read text from outside: a tool's result, someone else's words, a paste (lib/nova/handoff/health.ts `heldOutsideText`). */
  outside?: boolean};
type Key = 'main' | 'copy';
type Outcome = {result: RunResult; words: string} | null;
const BY: Readonly<Record<HandoffItem['by'], Readonly<Record<HandoffLang, string>>>> = {
  device: {en: 'Made on this device from your request', nl: 'Op dit apparaat gemaakt van je verzoek'},
  model: {en: 'Prepared by your AI model · read every word before you approve', nl: 'Voorbereid door je AI-model · lees elk woord voor je goedkeurt'},
};
const L = (lang: HandoffLang, en: string, nl: string) => lang === 'nl' ? nl : en;
function day(date: string): string {
  try { return `${formatDate(new Date(`${date}T12:00:00`), {weekday: true})} (${date})`; } catch { return date; }
}
export function HandoffCard({item, onRun, onDismiss}: {item: HandoffItem;
  /** The person pressed a button and this happened (the history is written from here; "cancelled" leaves no trace). */
  onRun: (item: HandoffItem, result: RunResult, how: 'handoff' | 'copy') => void;
  onDismiss: () => void}) {
  const {handoff: h, lang} = item, id = useId(), [outcome, setOutcome] = useState<Outcome>(null), [busy, setBusy] = useState(false);
  // Finding 7: the moment the card appeared, what runs and what is done, in refs (a second click in the same moment reads them at once).
  const [shownAt] = useState(() => Date.now()), [armed, setArmed] = useState(false), [done, setDone] = useState<ReadonlySet<Key>>(new Set());
  const running = useRef(false), finished = useRef(new Set<Key>());
  useEffect(() => { const timer = window.setTimeout(() => setArmed(true), ARM_MS); return () => window.clearTimeout(timer); }, []);
  const notes = cardNotes(h, lang), sheet = h.kind === 'share' ? canShare(h) : false;
  /** Runs one button's action, only for a press that counts (the person's own, on an armed card, not a second one). */
  const press = (key: Key, how: 'handoff' | 'copy', run: () => RunResult | Promise<RunResult>) => (event: MouseEvent<HTMLButtonElement>) => {
    if (!mayPress({trusted: event.nativeEvent.isTrusted, now: Date.now(), shownAt, running: running.current, done: finished.current.has(key)})) return;
    running.current = true; setBusy(true);
    void Promise.resolve().then(run).catch((): RunResult => 'failed').then(result => {
      if (result === 'done') { finished.current.add(key); setDone(new Set(finished.current)); }
      running.current = false; setBusy(false);
      if (result === 'cancelled') { setOutcome({result, words: FAILED_WORDS.share[lang]}); return; }
      const kind = how === 'copy' ? 'copy' : h.kind;
      setOutcome({result, words: (result === 'done' ? DONE_WORDS : FAILED_WORDS)[kind][lang]});
      onRun(item, result, how);
    });
  };
  const copyOf = h.kind === 'email' ? h.body : h.kind === 'share' ? shareText(h) : h.kind === 'link' ? h.href : h.kind === 'copy' ? h.text : '';
  const main = h.kind === 'email' ? press('main', 'handoff', () => openMail(h.href)) : h.kind === 'calendar' ? press('main', 'handoff', () => saveCalendar(h)) : h.kind === 'link' ? press('main', 'handoff', () => openLink(h.href))
    : h.kind === 'share' ? (sheet ? press('main', 'handoff', () => shareNow(h)) : press('main', 'copy', () => copyOut(copyOf))) : press('main', 'handoff', () => copyOut(h.text));
  const copy = press('copy', 'copy', () => copyOut(copyOf));
  const off = (key: Key) => !armed || busy || done.has(key), name = (key: Key, words: string) => done.has(key) ? DONE_KEY[lang] : words;
  return <section className="nh-card" data-kind={h.kind} data-by={item.by} aria-labelledby={`${id}-t`} aria-describedby={`${id}-p`}>
    <span className="nh-card-inner" aria-hidden="true"/>
    <header className="nh-head">
      <h3 id={`${id}-t`} className="nh-title">{CARD_TITLE[h.kind][lang]}</h3>
      <p className="nh-by">{BY[item.by][lang]}</p>
    </header>
    <p id={`${id}-p`} className="nh-promise">{CARD_PROMISE[h.kind][lang]}</p>
    {item.outside && <p className="nh-outside">{OUTSIDE_TEXT_LINE[lang]}</p>}
    <dl className="nh-fields">
      {h.kind === 'email' && <>
        <div><dt>{L(lang, 'To', 'Aan')}</dt><dd className="nh-target">{h.to.length ? h.to.map(a => <span key={a} className="nh-address">{a}</span>) : <span className="nh-none">{h.named ? L(lang, `${h.named} (no address yet)`, `${h.named} (nog geen adres)`) : L(lang, 'No address yet', 'Nog geen adres')}</span>}</dd></div>
        <div><dt>{L(lang, 'Subject', 'Onderwerp')}</dt><dd>{h.subject || <span className="nh-none">{L(lang, 'No subject', 'Geen onderwerp')}</span>}</dd></div>
        <div><dt>{L(lang, 'Text', 'Tekst')}</dt><dd>{h.body ? <pre className="nh-text" tabIndex={0}>{h.body}</pre> : <span className="nh-none">{L(lang, 'Empty: write it in your mail app', 'Leeg: schrijf het in je mailapp')}</span>}</dd></div>
      </>}
      {h.kind === 'calendar' && <>
        <div><dt>{L(lang, 'Event', 'Afspraak')}</dt><dd>{h.title}</dd></div>
        <div><dt>{L(lang, 'Day', 'Dag')}</dt><dd className="nh-target">{day(h.date)}</dd></div>
        <div><dt>{L(lang, 'Time', 'Tijd')}</dt><dd>{h.time ? `${h.time} · ${h.minutes} min` : L(lang, 'All day', 'Hele dag')}</dd></div>
        {h.note && <div><dt>{L(lang, 'Note', 'Notitie')}</dt><dd><pre className="nh-text" tabIndex={0}>{h.note}</pre></dd></div>}
        <div><dt>{L(lang, 'File', 'Bestand')}</dt><dd className="nh-mono">{h.fileName}</dd></div>
      </>}
      {h.kind === 'share' && <>
        {h.title && <div><dt>{L(lang, 'Title', 'Titel')}</dt><dd>{h.title}</dd></div>}
        {h.text && <div><dt>{L(lang, 'Text', 'Tekst')}</dt><dd><pre className="nh-text" tabIndex={0}>{h.text}</pre></dd></div>}
        {h.url && <div><dt>{L(lang, 'Link', 'Link')}</dt><dd className="nh-mono nh-target">{h.url}</dd></div>}
      </>}
      {h.kind === 'link' && <>
        <div><dt>{L(lang, 'Site', 'Site')}</dt><dd className="nh-target nh-host">{h.host}</dd></div>
        <div><dt>{L(lang, 'Whole address', 'Hele adres')}</dt><dd className="nh-mono">{h.href}</dd></div>
      </>}
      {h.kind === 'copy' && <div><dt>{L(lang, 'Text', 'Tekst')}</dt><dd><pre className="nh-text" tabIndex={0}>{h.text}</pre></dd></div>}
    </dl>
    {(notes.length > 0 || (h.kind === 'share' && !sheet)) && <ul className="nh-notes">
      {notes.map((note, i) => <li key={note} data-warn={h.kind === 'link' || (h.kind === 'email' && !!h.unverified?.length && i === 0) ? '' : undefined}>{note}</li>)}
      {h.kind === 'share' && !sheet && <li>{SHARE_FALLBACK[lang]}</li>}
    </ul>}
    <div className="nh-actions">
      {h.kind === 'email' && !h.bodyInLink
        ? <><button type="button" className="primary" disabled={off('copy')} data-done={done.has('copy') ? '' : undefined} onClick={copy}>{name('copy', COPY_TEXT_ACTION[lang])}</button><button type="button" className="secondary" disabled={off('main')} data-done={done.has('main') ? '' : undefined} onClick={main}>{name('main', OPEN_WITHOUT_TEXT[lang])}</button></>
        : <button type="button" className="primary" disabled={off('main')} data-done={done.has('main') ? '' : undefined} onClick={main}>{name('main', h.kind === 'share' && !sheet ? CARD_ACTION.copy[lang] : CARD_ACTION[h.kind][lang])}</button>}
      {h.kind === 'email' && h.bodyInLink && h.body && <button type="button" className="secondary" disabled={off('copy')} data-done={done.has('copy') ? '' : undefined} onClick={copy}>{name('copy', COPY_TEXT_ACTION[lang])}</button>}
      {h.kind === 'share' && sheet && <button type="button" className="secondary" disabled={off('copy')} data-done={done.has('copy') ? '' : undefined} onClick={copy}>{name('copy', COPY_INSTEAD_ACTION[lang])}</button>}
      {h.kind === 'link' && <button type="button" className="secondary" disabled={off('copy')} data-done={done.has('copy') ? '' : undefined} onClick={copy}>{name('copy', L(lang, 'Copy the address', 'Adres kopiëren'))}</button>}
      <button type="button" className="text-link" onClick={onDismiss}>{done.size ? L(lang, 'Close', 'Sluiten') : NOT_NOW[lang]}</button>
    </div>
    <p className="nh-outcome" role="status" aria-live="polite" data-result={outcome?.result}>{outcome?.words ?? ''}</p>
  </section>;
}
