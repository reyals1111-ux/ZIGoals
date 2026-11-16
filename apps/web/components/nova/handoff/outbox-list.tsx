'use client';
import {useState} from 'react';
import {MAX_OUTBOX, NOVA_OUTBOX, clearOutbox, outboxOf, type OutboxEntry} from '../../../lib/nova/outbox/record';
import {formatRelativeDay, formatTime} from '../../../lib/visual-format';
import {useDeviceRecord} from '../../ai/use-device-record';
import './handoff.css';

/**
 * Session AM-2 (owner's step 4b): "Sent out from this device" — the history of what the person approved to leave
 * through NOVA (lib/nova/outbox/record.ts): a hand-off card's button, or a call to a tool of their own agent. Each line
 * says when, what kind of thing and the address or host the card showed; never the text. NOVA sent none of it: the
 * person did. The history is on this device only and can be forgotten here.
 */
const SHOWN = 12;
const KIND: Readonly<Record<OutboxEntry['kind'], string>> = {handoff: 'Hand-off', tool: 'Your own tool'};
export function OutboxHistory({persona = 'NOVA'}: {persona?: string}) {
  const outbox = useDeviceRecord(NOVA_OUTBOX), [all, setAll] = useState(false), [note, setNote] = useState(''), [now, setNow] = useState(() => new Date());
  const entries = outbox.loaded && !outbox.unreadable ? outboxOf(outbox.data) : [], shown = all ? entries : entries.slice(0, SHOWN);
  const forget = () => { try { outbox.update(clearOutbox); setNote('The history is forgotten on this device.'); setAll(false); } catch { setNote('The history could not be changed on this device.'); } };
  return <details className="ai-context-preview nova-see nh-outbox" onToggle={event => { if (event.currentTarget.open) setNow(new Date()); }}>
    <summary>Sent out from this device{entries.length ? ` (${entries.length})` : ''}</summary>
    <p className="ai-note">{persona} sends nothing by itself. This lists what you approved with a card’s button: when, what kind, and the address or site the card showed, never the text. It stays on this device (at most {MAX_OUTBOX} lines).</p>
    {!outbox.loaded ? <p className="ai-note" role="status">Reading the history…</p>
      : outbox.unreadable ? <p className="ai-note" role="status">The history on this device could not be read. Nothing was changed.</p>
      : !entries.length ? <p className="ai-note">Nothing yet.</p>
      : <>
        <ol className="nh-outbox-list" aria-label="What you approved, newest first">{shown.map((e, i) => <li key={`${e.at}-${i}`} className="nh-outbox-item" data-ok={e.ok ? '' : undefined}>
          <span className="nh-outbox-what">{e.what}</span>
          <span className="nh-outbox-target">{e.target || '—'}</span>
          <span className="nh-outbox-meta">{formatRelativeDay(e.at, now)} · {formatTime(e.at)} · {KIND[e.kind]}{e.ok ? '' : ' · did not go through'}</span>
        </li>)}</ol>
        <div className="nh-outbox-actions">
          {entries.length > SHOWN && <button type="button" className="secondary nova-chat-tool" aria-expanded={all} onClick={() => setAll(a => !a)}>{all ? 'Show fewer' : `Show all ${entries.length}`}</button>}
          <button type="button" className="text-link" onClick={forget}>Forget this history</button>
        </div>
      </>}
    <p className="ai-sr-only" role="status" aria-live="polite">{note}</p>
  </details>;
}
