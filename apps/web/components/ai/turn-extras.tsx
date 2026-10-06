'use client';
import {useState} from 'react';
import {copyText} from '../../lib/ai/chat-window';
import {followupsFor, type FollowupCall} from '../../lib/ai/followups';
import './chat-polish.css';

/**
 * The small controls around an answer (Session V Part 10): when it was said, a thumbs up or down kept on this device
 * for the person's own reference (never sent anywhere, never used to change ZIGi), copy as Markdown, and follow-up
 * questions made on the device from what the answer looked at.
 */
export function TurnTime({at}: {at: string}) {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return null;
  return <time className="ai-turn-time" dateTime={at} title={date.toLocaleString()}>{date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</time>;
}
export function FeedbackButtons({value, onChange}: {value: 'up' | 'down' | undefined; onChange: (next: 'up' | 'down' | undefined) => void}) {
  return <span className="ai-feedback" role="group" aria-label="Your own note on this answer (kept on this device, never sent)">
    <button type="button" className="text-link ai-feedback-button" aria-pressed={value === 'up'} title="Kept on this device for you; never sent" onClick={() => onChange(value === 'up' ? undefined : 'up')}>Useful</button>
    <button type="button" className="text-link ai-feedback-button" aria-pressed={value === 'down'} title="Kept on this device for you; never sent" onClick={() => onChange(value === 'down' ? undefined : 'down')}>Not useful</button>
  </span>;
}
export function CopyMarkdown({text}: {text: string}) {
  const [done, setDone] = useState(false);
  const copy = () => { copyText(text).then(() => { setDone(true); window.setTimeout(() => setDone(false), 1500); }).catch(() => undefined); };
  return <button type="button" className="text-link" onClick={copy}>{done ? 'Copied as Markdown' : 'Copy as Markdown'}</button>;
}
export function FollowupChips({calls, asked, onAsk}: {calls: readonly FollowupCall[]; asked: string; onAsk: (question: string) => void}) {
  const questions = followupsFor(calls, asked);
  if (!questions.length) return null;
  return <div className="ai-chips ai-followups" role="group" aria-label="Follow-up questions">{questions.map(q => <button key={q} type="button" className="ai-chip" onClick={() => onAsk(q)}>{q}</button>)}</div>;
}
