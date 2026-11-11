'use client';
import {type ReactNode} from 'react';
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
const HideIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path {...I} strokeWidth={2.2} d="M6.5 16.5h11"/></svg>;
const CloseIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path {...I} d="M7 7l10 10M17 7 7 17"/></svg>;

export type WidgetStage = {pinned: boolean; onPin: () => void; onUnpin: () => void; onHide: () => void; onClose: () => void};
/**
 * Design review AM-D29: the pinned mark — a small filled pin beside the title with the words "Pinned" for assistive
 * technology (it was a 6 px dot that read as a status light). It shows where the Pin button itself is folded away (a
 * narrow panel, or while arranging); where the button is in view, its filled glyph and pressed state say the same.
 */
export const PinnedMark = () => <span className="ns-pinned" title="Pinned"><PinIcon on/><span className="sr-only">Pinned</span></span>;
/**
 * A widget's stage actions (Session AM-2, ADR-038 "AM-2" F2): Pin, Hide and Close as three named 44 px keys in the head's
 * one right-aligned group, on every widget at every width. (Session AM folded them under a "More" button on a panel
 * narrower than 312 px; the owner could not close or hide a widget, so the menu is gone.)
 */
export function WidgetActions({title, stage}: {title: string; stage: WidgetStage}) {
  const pin = stage.pinned ? {label: `Unpin ${title}`, act: stage.onUnpin} : {label: `Pin ${title}`, act: stage.onPin};
  return <span className="ns-actions" role="group" aria-label={`${title} on the stage`}>
    <button type="button" className="ns-act" data-act="pin" aria-pressed={stage.pinned} aria-label={pin.label} title={stage.pinned ? 'Pinned · press to unpin' : 'Pin: keep on the stage'} onClick={pin.act}><PinIcon on={stage.pinned}/></button>
    <button type="button" className="ns-act" data-act="hide" aria-label={`Hide ${title} in the dock`} title="Hide in the dock" onClick={stage.onHide}><HideIcon/></button>
    <button type="button" className="ns-act" data-act="close" aria-label={`Close ${title}`} title="Close" onClick={stage.onClose}><CloseIcon/></button>
  </span>;
}

const GATE_WORDS: Readonly<Record<WidgetGate, {title: string; text: string}>> = {
  health: {title: 'Health is off for NOVA', text: 'NOVA reads your Health records only when you allow it. Your Health page still shows everything.'},
  today: {title: 'Today’s page data is off', text: 'That switch decides what NOVA may read, so nothing is shown here. Your pages still show everything.'},
  goals: {title: 'Goals page data is off', text: 'That switch decides what NOVA may read, so nothing is shown here. Your Goals page still shows everything.'},
  habits: {title: 'Habits page data is off', text: 'That switch decides what NOVA may read, so nothing is shown here. Your Habits page still shows everything.'},
  wealth: {title: 'Wealth page data is off', text: 'That switch decides what NOVA may read, so nothing is shown here. Your Wealth page still shows everything.'},
  notes: {title: 'Notes are off for NOVA', text: 'NOVA reads your notes only when you allow it. Your Notes page still shows everything.'},
  journal: {title: 'The journal is off for NOVA', text: 'NOVA reads your journal only when you allow it. Your Journal page still shows everything.'},
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

/** The figures in a line of words (a number with its separators, a currency sign before it, a percent sign after it), lit; the characters are unchanged. */
const FIGURE = /((?:[$€£]\s?)?\d(?:[\d.,:]*\d)?(?:\s?%)?)/;
const lit = (words: string): ReactNode[] => words.split(FIGURE).map((part, i) => i % 2 ? <b key={i} className="ns-fig">{part}</b> : part);

/**
 * NOVA's newest words, under the star (D7). The whole reply is in the conversation; this line shows its beginning as
 * plain text, says who answered, and opens the conversation. It is the stage's polite live region for answers.
 */
export function StageAnswerLine({answer, persona, onOpen, onDismiss, widget, onGoTo}: {answer: StageAnswer; persona: string; onOpen: () => void; onDismiss: () => void;
  /** Design review AM-D18: the widget this answer made, one keypress away (the widgets come before the command bar in the page's order). */
  widget?: {id: string; title: string} | null; onGoTo?: (id: string) => void}) {
  let text = answer.text;
  try { text = plainText(parseBlocks(answer.text)); } catch { /* the words as they are */ }
  const short = text.replace(/\s+/g, ' ').trim(), cut = short.length > 320 ? `${short.slice(0, 317).replace(/\s+\S*$/, '')}…` : short;
  // Session AM-2: a holographic read-out. Its head strip carries NOVA's mark and who answered (it stood under the words);
  // the figures in the words are lit (the same characters, marked up for the eye only); its links are keys.
  return <div className="ns-answer" data-by={answer.by}>
    <span className="ns-answer-glow" aria-hidden="true"/><span className="sh-inner" aria-hidden="true"/>
    {/* The way to put the answer away sits in the card's corner (its links then fit one row). */}
    <button type="button" className="ns-answer-close" onClick={onDismiss} aria-label={`Dismiss ${persona}’s answer`} title="Dismiss"><CloseIcon/></button>
    <p className="ns-answer-head"><svg className="ns-answer-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2.5c1.1 6.6 2.9 8.4 9.5 9.5-6.6 1.1-8.4 2.9-9.5 9.5-1.1-6.6-2.9-8.4-9.5-9.5 6.6-1.1 8.4-2.9 9.5-9.5z"/></svg>
      <span className="ns-answer-by">{answer.by === 'device' ? 'Answered on this device · no AI used' : 'From your AI'}</span></p>
    {answer.question && <p className="ns-answer-asked"><span className="sr-only">You asked: </span>“{answer.question.length > 90 ? `${answer.question.slice(0, 88)}…` : answer.question}”</p>}
    <p className="ns-answer-text"><span className="sr-only">{persona}: </span>{lit(cut)}</p>
    <p className="ns-answer-meta">
      {widget && onGoTo && <button type="button" className="ns-link" onClick={() => onGoTo(widget.id)}>Go to {widget.title}</button>}
      <button type="button" className="ns-link" onClick={onOpen}>{answer.decision ? 'Open to decide' : 'Open the conversation'}</button>

    </p>
  </div>;
}
