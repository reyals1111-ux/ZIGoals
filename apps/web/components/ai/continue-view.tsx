'use client';
import {useMemo, useState} from 'react';
import {launcherApp, SUBSCRIPTION_APPS} from '../../lib/ai/apps';
import {continuePrompt} from '../../lib/ai/continue';
import type {AiSettings} from '../../lib/ai/settings';
import {openSideBySide} from './side-by-side';
import type {AiContextState} from './use-ai-context';
import type {ChatSession} from './use-chat-session';
import './chat-polish.css';

/**
 * "Continue in my AI" (Session V Part 10): the conversation so far, and this page's records if the person keeps them,
 * as one text for their own AI app. The exact text is shown before it is copied; the person pastes it themselves, like
 * the subscription bridge. Nothing is sent from here. Answers made on this device are left out, as they are for a
 * provider; the page's records are the ones the page may share (its switch, Health only with its gate, nothing on
 * Settings or a private screen).
 */
export function ContinueView({settings, session, context, attach, sensitive, phone, onBack}: {settings: AiSettings; session: ChatSession; context: AiContextState; attach: boolean; sensitive: boolean; phone: boolean; onBack: () => void}) {
  const records = sensitive ? null : context.context, [withRecords, setWithRecords] = useState(attach), [status, setStatus] = useState('');
  const text = useMemo(() => continuePrompt({turns: session.chat.turns, context: withRecords ? records : null, customInstructions: settings.customInstructions}), [session.chat.turns, withRecords, records, settings.customInstructions]);
  const leftOut = session.chat.turns.filter(t => t.source === 'local' && t.role === 'assistant').length, app = launcherApp(settings);
  const copy = () => { navigator.clipboard?.writeText(text).then(() => setStatus(`Copied. Paste it into ${app?.name ?? 'your AI app'}.`)).catch(() => setStatus('Copying was not allowed here; select the text below and copy it yourself.')); };
  return <section className="ai-continue" aria-label="Continue in my AI">
    <p className="ai-greeting-text">Take this chat to your own AI app: ZIGoals writes it out as one text, you copy it and paste it there. Nothing is sent from here.</p>
    {records && <label className="ai-check"><input type="checkbox" checked={withRecords} onChange={e => setWithRecords(e.target.checked)}/> Include this page’s records</label>}
    {leftOut > 0 && <p className="ai-note">{leftOut === 1 ? 'One answer made on this device is' : `${leftOut} answers made on this device are`} left out, as they are when you ask your AI.</p>}
    <div className="ai-card-actions">
      <button type="button" className="primary" onClick={copy}>Copy for my AI</button>
      {app && <a className="secondary" href={app.url} target="_blank" rel="noopener noreferrer">Open {app.name} ↗</a>}
      {app && !phone && <button type="button" className="secondary" onClick={() => openSideBySide(app.url)}>Open {app.name} side by side</button>}
      <button type="button" className="text-link" onClick={onBack}>Back to the chat</button>
    </div>
    {!app && <p className="ai-note">Your AI app: {SUBSCRIPTION_APPS.map((a, i) => <span key={a.id}>{i ? ' · ' : ''}<a href={a.url} target="_blank" rel="noopener noreferrer">{a.name} ↗</a></span>)}</p>}
    {status && <p className="ai-note" role="status">{status}</p>}
    <h3 className="ai-history-heading">What will be copied</h3>
    <pre tabIndex={0} aria-label="What will be copied">{text}</pre>
  </section>;
}
