'use client';
import {useEffect, useId, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import type {CardContext, ToolCard} from '../../../lib/nova/agent-bridge/propose';
import {CARD_WORDS, type CardLang} from '../../../lib/nova/agent-bridge/words';
import type {ToolOutcome} from '../../../lib/nova/agent-bridge/untrusted';
import type {RunResult} from './use-agent-bridge';
import './agent.css';

/**
 * Session AM-2 (step 4c, items 3 and 4): the confirm card for ONE call to a tool of the person's own — a modal dialog.
 * It shows which server (its address on this computer), which tool, the exact arguments as readable fields and, on
 * request, the raw JSON, the guard's notes and the plain warning. Nothing is sent until the person presses "Run this tool
 * once"; "Not now" and Escape close it with nothing sent. It is the same card whether a model proposed the call or the
 * person filled it in by hand.
 *
 * After the press it shows what the tool answered in a quoted, labelled box: plain text only (React text nodes: no
 * markup is ever made from it, a link in it is not clickable), cut to a size. The person may then hand that text to
 * their model (`onHandBack`), wrapped as untrusted data; a reply to it can never bring another tool card.
 */
export function ToolCardDialog({card, ctx, run, onClose, onHandBack, lang = 'en'}: {
  card: ToolCard; ctx: CardContext; run: (card: ToolCard, ctx: CardContext) => Promise<RunResult>; onClose: () => void;
  /** Present only where a model is connected: gives the result to it as untrusted data. */
  onHandBack?: (card: ToolCard, outcome: ToolOutcome) => void;
  /** The language of the person's request (a model's card); English by hand. */
  lang?: CardLang;
}) {
  const w = CARD_WORDS[lang];
  const ref = useRef<HTMLDialogElement>(null), id = useId(), close = useRef(onClose);
  close.current = onClose;
  const [raw, setRaw] = useState(false), [state, setState] = useState<'ask' | 'running' | 'done'>('ask'), [result, setResult] = useState<RunResult | null>(null);
  useEffect(() => {
    const dialog = ref.current, back = document.activeElement as HTMLElement | null;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => { if (dialog.open) dialog.close(); requestAnimationFrame(() => back?.isConnected && back.focus({preventScroll: true})); };
  }, []);
  const go = async () => {
    if (state !== 'ask') return; // one press, one call
    setState('running');
    let out: RunResult;
    try { out = await run(card, ctx); } catch { out = {ok: false, message: 'The tool could not be asked. Nothing more was sent.', sent: false, noted: false}; }
    setResult(out); setState('done');
  };
  const busy = state === 'running';
  // `data-ai-dialog`: NOVA's own dialog, so the sensitive-screen check does not take it for a page's private sheet.
  // Drawn under <body>: NOVA's conversation may be folded away (hidden) while a reply arrives, and a card must still show.
  return createPortal(<dialog ref={ref} data-ai-dialog="" className="na-card" data-tool-card={card.tool.name} data-state={state} aria-labelledby={`${id}-t`} aria-describedby={`${id}-w`}
    onCancel={e => { e.preventDefault(); if (!busy) close.current(); }}>
    <div className="na-card-body">
      <header className="na-card-head"><div>
        <p className="na-eyebrow">{card.source === 'model' ? w.fromModel : w.byHand}</p>
        <h2 id={`${id}-t`} className="na-card-title">{w.title(card.tool.name)}</h2>
      </div></header>
      <div className="na-card-where">
        <span><b>{w.server}</b> {card.label}</span>
        <span>{w.at} <span className="na-address">{card.origin}</span></span>
        <span><b>{w.tool}</b> <span className="na-tool-name">{card.tool.name}</span></span>
      </div>
      {card.tool.description && <figure className="na-quote"><figcaption className="na-quote-label">{w.described}</figcaption><p className="na-quote-text">{card.tool.description}</p></figure>}
      <section aria-labelledby={`${id}-a`} className="na-section">
        <h3 id={`${id}-a`} className="na-h">{w.sent}</h3>
        {card.fields.length ? <dl className="na-fields">{card.fields.map(f => <div key={f.name}><dt>{f.name}</dt><dd>{f.value === '' ? <span className="na-fine">{w.empty}</span> : f.value}</dd></div>)}</dl> : <p className="na-fine">{w.noArgs}</p>}
        <div className="na-keys"><button type="button" className="na-key" data-quiet="" aria-expanded={raw} aria-controls={`${id}-j`} onClick={() => setRaw(v => !v)}>{raw ? w.hideJson : w.showJson}</button></div>
        {raw && <pre id={`${id}-j`} className="na-json" tabIndex={0} aria-label={w.jsonLabel}>{card.json}</pre>}
      </section>
      {card.notices.map(n => <p key={n} className="na-notice">{n}</p>)}
      <p id={`${id}-w`} className="na-warn"><span>{w.warning}</span></p>
      <div aria-live="polite" role="status" className="na-section">
        {busy && <p className="na-status">{w.asking}</p>}
        {result && !result.ok && <p className="na-status" data-ok="false"><span><b>{w.notDone}</b> {result.message}{result.noted ? w.listedFailed : ''}</span></p>}
        {result?.ok && <>
          <p className="na-status" data-ok={String(!result.outcome.failed)}><span><b>{result.outcome.failed ? w.problem : w.answered}</b> {result.noted ? w.listed : w.notListed}</span></p>
          <figure className="na-quote" data-result=""><figcaption className="na-quote-label">{w.fromTool}{result.outcome.cut ? w.cut : ''}</figcaption><pre className="na-quote-text" tabIndex={0}>{result.outcome.text}</pre></figure>
          <p className="na-fine">{w.asItIs}</p>
        </>}
      </div>
    </div>
    <div className="na-card-foot">
      {state !== 'done' ? <>
        <button type="button" className="na-key" data-primary="" disabled={busy} onClick={() => void go()}>{busy ? w.running : w.run}</button>
        <button type="button" className="na-key" disabled={busy} onClick={() => close.current()}>{w.notNow}</button>
      </> : <>
        {result?.ok && onHandBack && <button type="button" className="na-key" onClick={() => { onHandBack(card, result.outcome); close.current(); }}>{w.handBack}</button>}
        <button type="button" className="na-key" data-primary="" onClick={() => close.current()}>{w.close}</button>
      </>}
    </div>
  </dialog>, document.body);
}
