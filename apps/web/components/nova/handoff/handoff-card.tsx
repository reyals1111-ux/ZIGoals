'use client';
import {useId, useState, type MouseEvent} from 'react';
import {formatDate} from '../../../lib/visual-format';
import type {Handoff, HandoffLang} from '../../../lib/nova/handoff/handoff';
import {CARD_ACTION, CARD_PROMISE, CARD_TITLE, COPY_INSTEAD_ACTION, COPY_TEXT_ACTION, DONE_WORDS, FAILED_WORDS, NOT_NOW, OPEN_WITHOUT_TEXT, SHARE_FALLBACK, cardNotes} from '../../../lib/nova/handoff/words';
import {canShare, copyOut, openLink, openMail, saveCalendar, shareNow, shareText, type RunResult} from './run';
import './handoff.css';

/**
 * Session AM-2 (owner's step 4b): a hand-off's confirm card, in NOVA's conversation. It shows exactly what will leave and
 * to where — every address, the whole subject and text, the whole link with its real host, the event's day and time —
 * and does nothing until the person presses its button. The press must be a real one (`isTrusted`): a script, a model's
 * reply or a synthetic click cannot press it. After the press the card says what happened in plain words; it never says
 * anything was sent, because the person's own mail app, calendar app, share sheet or browser takes it from there.
 */
export type HandoffItem = {id: string; handoff: Handoff; lang: HandoffLang; by: 'device' | 'model'};
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
  const notes = cardNotes(h, lang), sheet = h.kind === 'share' ? canShare(h) : false;
  /** Runs one button's action, only for a real press. */
  const press = (how: 'handoff' | 'copy', run: () => RunResult | Promise<RunResult>) => (event: MouseEvent<HTMLButtonElement>) => {
    if (!event.nativeEvent.isTrusted || busy) return;
    setBusy(true);
    void Promise.resolve().then(run).catch((): RunResult => 'failed').then(result => {
      setBusy(false);
      if (result === 'cancelled') { setOutcome({result, words: FAILED_WORDS.share[lang]}); return; }
      const kind = how === 'copy' ? 'copy' : h.kind;
      setOutcome({result, words: (result === 'done' ? DONE_WORDS : FAILED_WORDS)[kind][lang]});
      onRun(item, result, how);
    });
  };
  const copyOf = h.kind === 'email' ? h.body : h.kind === 'share' ? shareText(h) : h.kind === 'link' ? h.href : h.kind === 'copy' ? h.text : '';
  const main = h.kind === 'email' ? press('handoff', () => openMail(h.href)) : h.kind === 'calendar' ? press('handoff', () => saveCalendar(h)) : h.kind === 'link' ? press('handoff', () => openLink(h.href))
    : h.kind === 'share' ? (sheet ? press('handoff', () => shareNow(h)) : press('copy', () => copyOut(copyOf))) : press('handoff', () => copyOut(h.text));
  const copy = press('copy', () => copyOut(copyOf));
  return <section className="nh-card" data-kind={h.kind} data-by={item.by} aria-labelledby={`${id}-t`} aria-describedby={`${id}-p`}>
    <span className="nh-card-inner" aria-hidden="true"/>
    <header className="nh-head">
      <h3 id={`${id}-t`} className="nh-title">{CARD_TITLE[h.kind][lang]}</h3>
      <p className="nh-by">{BY[item.by][lang]}</p>
    </header>
    <p id={`${id}-p`} className="nh-promise">{CARD_PROMISE[h.kind][lang]}</p>
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
      {notes.map(note => <li key={note} data-warn={h.kind === 'link' ? '' : undefined}>{note}</li>)}
      {h.kind === 'share' && !sheet && <li>{SHARE_FALLBACK[lang]}</li>}
    </ul>}
    <div className="nh-actions">
      {h.kind === 'email' && !h.bodyInLink
        ? <><button type="button" className="primary" disabled={busy} onClick={copy}>{COPY_TEXT_ACTION[lang]}</button><button type="button" className="secondary" disabled={busy} onClick={main}>{OPEN_WITHOUT_TEXT[lang]}</button></>
        : <button type="button" className="primary" disabled={busy} onClick={main}>{h.kind === 'share' && !sheet ? CARD_ACTION.copy[lang] : CARD_ACTION[h.kind][lang]}</button>}
      {h.kind === 'email' && h.bodyInLink && h.body && <button type="button" className="secondary" disabled={busy} onClick={copy}>{COPY_TEXT_ACTION[lang]}</button>}
      {h.kind === 'share' && sheet && <button type="button" className="secondary" disabled={busy} onClick={copy}>{COPY_INSTEAD_ACTION[lang]}</button>}
      {h.kind === 'link' && <button type="button" className="secondary" disabled={busy} onClick={copy}>{L(lang, 'Copy the address', 'Adres kopiëren')}</button>}
      <button type="button" className="text-link" onClick={onDismiss}>{outcome?.result === 'done' ? L(lang, 'Close', 'Sluiten') : NOT_NOW[lang]}</button>
    </div>
    <p className="nh-outcome" role="status" aria-live="polite" data-result={outcome?.result}>{outcome?.words ?? ''}</p>
  </section>;
}
