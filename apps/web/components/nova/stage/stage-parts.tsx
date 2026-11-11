'use client';
import {useEffect, useRef, useState, type ReactNode} from 'react';
import {plainText, parseBlocks} from '../../../lib/ai/safe-render';
import type {StageWidget} from '../../../lib/nova/stage/record';
import {ONE_TAP, widgetTitle} from '../../../lib/nova/summon/words';
import {widgetSpec, type WidgetGate} from '../../../lib/nova/widgets/catalog';
import {CardNotice} from '../cards/kit';
import type {StageAnswer} from './use-summoner';
import './stage.css';

/**
 * Session AM (ADR-038 D3, D5, D7; art direction §3, §4, §8): the visible parts of NOVA's stage besides the widgets — each
 * widget's own actions (Pin, Hide, Close), the dock where hidden widgets wait, NOVA's newest words under the star, the
 * one-tap requests above the command bar, and the locked state of a made widget whose switch is off. Every control is a
 * named button of 44 px; nothing here moves by itself.
 */
const I = {fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round'} as const;
const PinIcon = ({on}: {on: boolean}) => <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path {...I} fill={on ? 'currentColor' : 'none'} d="M9 4h6l-1 6 3.5 3.5h-11L10 10z"/><path {...I} d="M12 13.5V20"/></svg>;
const HideIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path {...I} d="M6 17.5h12"/><path {...I} d="m8.5 9.5 3.5 3.5 3.5-3.5"/></svg>;
const CloseIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path {...I} d="M7 7l10 10M17 7 7 17"/></svg>;
const MoreIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="currentColor"><circle cx="6" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="18" cy="12" r="1.7"/></g></svg>;

export type WidgetStage = {pinned: boolean; onPin: () => void; onUnpin: () => void; onHide: () => void; onClose: () => void};
/** A widget's stage actions: three icon buttons where the panel is wide enough, the same three under "More" where it is not. */
export function WidgetActions({title, stage}: {title: string; stage: WidgetStage}) {
  const [open, setOpen] = useState(false), box = useRef<HTMLSpanElement>(null), button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);
  const pin = stage.pinned ? {label: `Unpin ${title}`, words: 'Unpin', act: stage.onUnpin} : {label: `Pin ${title}`, words: 'Pin', act: stage.onPin};
  const run = (act: () => void) => () => { setOpen(false); act(); };
  return <>
    <span className="ns-actions" role="group" aria-label={`${title} on the stage`}>
      <button type="button" className="ns-act" aria-pressed={stage.pinned} aria-label={pin.label} title={stage.pinned ? 'Pinned · tap to unpin' : 'Pin: keep on the stage'} onClick={pin.act}><PinIcon on={stage.pinned}/></button>
      <button type="button" className="ns-act" aria-label={`Hide ${title} in the dock`} title="Hide in the dock" onClick={stage.onHide}><HideIcon/></button>
      <button type="button" className="ns-act" aria-label={`Close ${title}`} title="Close" onClick={stage.onClose}><CloseIcon/></button>
    </span>
    <span ref={box} className="ns-more" onKeyDown={e => { if (e.key === 'Escape' && open) { e.preventDefault(); e.stopPropagation(); setOpen(false); button.current?.focus(); } }}>
      <button ref={button} type="button" className="ns-act" aria-expanded={open} aria-haspopup="true" aria-label={`More for ${title}`} title="Pin, hide or close" onClick={() => setOpen(o => !o)}><MoreIcon/></button>
      {open && <span className="ns-more-list" role="group" aria-label={`${title} on the stage`}>
        <button type="button" className="ns-more-item" aria-pressed={stage.pinned} onClick={run(pin.act)}><PinIcon on={stage.pinned}/>{pin.words}</button>
        <button type="button" className="ns-more-item" onClick={run(stage.onHide)}><HideIcon/>Hide in the dock</button>
        <button type="button" className="ns-more-item" onClick={run(stage.onClose)}><CloseIcon/>Close</button>
      </span>}
    </span>
  </>;
}

const GATE_WORDS: Readonly<Record<WidgetGate, {title: string; text: string}>> = {
  health: {title: 'Health is off for NOVA', text: 'NOVA reads your Health records only when you allow it. Your Health page still shows everything.'},
  today: {title: 'Today’s page data is off', text: 'That switch decides what NOVA may read, so nothing is shown here. Your pages still show everything.'},
  goals: {title: 'Goals page data is off', text: 'That switch decides what NOVA may read, so nothing is shown here. Your Goals page still shows everything.'},
  habits: {title: 'Habits page data is off', text: 'That switch decides what NOVA may read, so nothing is shown here. Your Habits page still shows everything.'},
  wealth: {title: 'Wealth page data is off', text: 'That switch decides what NOVA may read, so nothing is shown here. Your Wealth page still shows everything.'},
};
/** A made widget whose switch is off (D5): which switch, and nothing else. */
export function WidgetLocked({id}: {id: string}) {
  const gate = widgetSpec(id)?.gate ?? 'today', words = GATE_WORDS[gate];
  return <CardNotice kind="locked" title={words.title} href="/app/nova#nova-permissions" action="Open Permissions">{words.text}</CardNotice>;
}

/** The dock: hidden widgets as chips; a tap brings one back to the stage. */
export function StageDock({docked, onShow}: {docked: readonly StageWidget[]; onShow: (id: string) => void}) {
  if (!docked.length) return null;
  return <div className="ns-dock" role="group" aria-label="Dock: hidden widgets">
    <span className="ns-dock-label" aria-hidden="true">Dock</span>
    {docked.map(w => <button key={w.id} type="button" className="ns-chip" data-pillar={widgetSpec(w.id)?.pillar} onClick={() => onShow(w.id)} aria-label={`Show ${widgetTitle(w.id)} again`} title="Bring back to the stage"><span className="ns-chip-dot" aria-hidden="true"/>{widgetTitle(w.id)}</button>)}
  </div>;
}

/** One-tap requests (art direction §3): each asks NOVA in the person's own words. */
export function OneTap({available, onAsk, more}: {available: (id: string) => boolean; onAsk: (ask: string) => void; more?: ReactNode}) {
  const taps = ONE_TAP.filter(t => available(t.widget)).slice(0, 6);
  if (!taps.length && !more) return null;
  return <div className="ns-onetap" role="group" aria-label="One-tap requests">
    {taps.map(t => <button key={t.id} type="button" className="ns-chip" data-pillar={widgetSpec(t.widget)?.pillar} onClick={() => onAsk(t.ask)} title={t.ask}><span className="ns-chip-dot" aria-hidden="true"/>{t.label}</button>)}
    {more}
  </div>;
}

/**
 * NOVA's newest words, under the star (D7). The whole reply is in the conversation; this line shows its beginning as
 * plain text, says who answered, and opens the conversation. It is the stage's polite live region for answers.
 */
export function StageAnswerLine({answer, persona, onOpen, onDismiss}: {answer: StageAnswer; persona: string; onOpen: () => void; onDismiss: () => void}) {
  let text = answer.text;
  try { text = plainText(parseBlocks(answer.text)); } catch { /* the words as they are */ }
  const short = text.replace(/\s+/g, ' ').trim(), cut = short.length > 320 ? `${short.slice(0, 317).replace(/\s+\S*$/, '')}…` : short;
  return <div className="ns-answer" data-by={answer.by}>
    {answer.question && <p className="ns-answer-asked"><span className="sr-only">You asked: </span>“{answer.question.length > 90 ? `${answer.question.slice(0, 88)}…` : answer.question}”</p>}
    <p className="ns-answer-text"><span className="sr-only">{persona}: </span>{cut}</p>
    <p className="ns-answer-meta">
      <span className="ns-answer-by">{answer.by === 'device' ? 'Answered on this device · no AI used' : 'From your AI'}</span>
      <button type="button" className="ns-link" onClick={onOpen}>{answer.decision ? 'Open to decide' : 'Open the conversation'}</button>
      <button type="button" className="ns-link" onClick={onDismiss} aria-label={`Dismiss ${persona}’s answer`}>Dismiss</button>
    </p>
  </div>;
}
