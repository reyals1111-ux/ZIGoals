'use client';
import type {ReactNode} from 'react';
import {followupsFor, type FollowupCall} from '../../lib/ai/followups';
import {ReplyIcon} from './reply-actions';
import {formatDateTime, formatTime} from '../../lib/visual-format';
import './chat-polish.css';

/**
 * The small controls around an answer (Session V Part 10): when it was said, a thumbs up or down kept on this device
 * for the person's own reference (never sent anywhere, never used to change ZIGi), who answered, and follow-up
 * questions made on the device from what the answer looked at. Copy as Markdown lives in the reply's "⋯" (round 2).
 */
export function TurnTime({at}: {at: string}) {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return null;
  return <time className="ai-turn-time" dateTime={at} title={formatDateTime(date)}>{formatTime(date)}</time>;
}
/** The person's own note on an answer: two icons, kept on this device and never sent (panel polish round 2). */
export function FeedbackButtons({value, onChange}: {value: 'up' | 'down' | undefined; onChange: (next: 'up' | 'down' | undefined) => void}) {
  return <span className="ai-feedback" role="group" aria-label="Your own note on this answer (kept on this device, never sent)">
    <ReplyIcon glyph="up" label="Useful" tip="Useful (kept on this device, never sent)" className="ai-feedback-button" pressed={value === 'up'} onClick={() => onChange(value === 'up' ? undefined : 'up')}/>
    <ReplyIcon glyph="down" label="Not useful" tip="Not useful (kept on this device, never sent)" className="ai-feedback-button" pressed={value === 'down'} onClick={() => onChange(value === 'down' ? undefined : 'down')}/>
  </span>;
}
/**
 * Who answered, as one short line (panel polish round 2: "From your AI · local server"). The full sentence is the
 * line's tooltip and what a screen reader reads (`.ai-turn-label`); `extra` adds hidden detail (the deep model).
 */
export function SourceLine({short, full, extra, deeper = false, time}: {short: string; full: string; extra?: ReactNode; deeper?: boolean; time?: ReactNode}) {
  // `time`: a narrow reply (panel-z.css, `zigi-reply`) shows its time here, first, instead of in the row of buttons.
  return <p className="ai-turn-source" title={full}>{time && <span className="ai-turn-source-time">{time}<span aria-hidden="true"> · </span></span>}<span aria-hidden="true">{short}{deeper ? ' · deeper' : ''}</span><span className="ai-turn-label ai-sr-only">{full}</span>{extra}</p>;
}
/**
 * Session AI (G1, ZI1): every reply says what it is. "Answer" for a reply that only tells; "Proposed change" above the
 * cards of one that proposes a change, which is saved only when the person adds it. One short eyebrow line, never a
 * colour alone (the words carry it).
 */
export function TurnKind({cards}: {cards: boolean}) {
  return <p className="ai-turn-kind" data-kind={cards ? 'change' : 'answer'}>{cards ? <>Proposed change<span className="ai-turn-kind-note"> · saved only when you add it</span></> : 'Answer'}</p>;
}
export function FollowupChips({calls, asked, onAsk}: {calls: readonly FollowupCall[]; asked: string; onAsk: (question: string) => void}) {
  const questions = followupsFor(calls, asked);
  if (!questions.length) return null;
  return <div className="ai-chips ai-followups" role="group" aria-label="Follow-up questions">{questions.map(q => <button key={q} type="button" className="ai-chip" title={q} onClick={() => onAsk(q)}>{q}</button>)}</div>;
}
