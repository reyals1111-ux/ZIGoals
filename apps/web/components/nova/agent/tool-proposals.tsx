'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {guardLanguage} from '../../../lib/ai/safety-guard';
import {toolByName} from '../../../lib/ai/tools/registry';
import {cardFromReply, type ToolCard} from '../../../lib/nova/agent-bridge/propose';
import {wrapToolResult, type ToolOutcome} from '../../../lib/nova/agent-bridge/untrusted';
import {privacyMode} from '../../../lib/nova/privacy-mode';
import type {ChatSession} from '../../ai/use-chat-session';
import {ToolCardDialog} from './tool-card';
import {offeredNow} from './live-store';
import {useAgentBridge} from './use-agent-bridge';
import './agent.css';

/**
 * Session AM-2 (step 4c, item 3): from a model's reply to the ONE confirm card, inside NOVA's conversation.
 *
 * When a model's reply arrives (the person's own model, or the browser's on-device model), its lookups are read (this visit's exact calls, as the stage's summoner
 * reads them). If the model proposed a tool (`use_tool`), lib/nova/agent-bridge/propose.ts decides: at most one card, never
 * for a reply to a handed-back tool result, never while the page is hidden, only for a tool that is listed and on "Ask
 * every time" now, with the arguments checked, guarded and held to the privacy mode. The card sends nothing until the
 * person presses it. A proposal that is dropped is said in one plain line.
 *
 * "Give this answer to my model" sends the result as the person's next message, wrapped as untrusted data
 * (`wrapToolResult`) and marked pasted, so no card of that reply is ever auto-accepted and no tool card can follow it.
 * Replies that were already in the conversation when it opened are history: they never bring a card.
 */
export function ToolProposals({session, connected, healthOpen, onAttention}: {session: ChatSession; /** A model is connected (only then can a result be handed to it). */ connected: boolean; /** NOVA's Health permission and this device's Health gate are both on. */ healthOpen: boolean;
  /** Opens the conversation when it is folded away, so a dropped proposal's line is read (the card itself is a dialog over the page). */ onAttention?: () => void}) {
  const bridge = useAgentBridge();
  const [pending, setPending] = useState<{card: ToolCard; typed: string; lang: 'en' | 'nl'} | null>(null), [notes, setNotes] = useState<string[]>([]);
  const seen = useRef<{chat: string; ids: Set<string>} | null>(null), health = useRef(healthOpen), attention = useRef(onAttention);
  useEffect(() => { health.current = healthOpen; attention.current = onAttention; }, [healthOpen, onAttention]);
  const turns = session.chat.turns, chatId = session.chat.id, status = session.status, lookupsFor = session.lookupsFor;
  useEffect(() => {
    if (seen.current?.chat !== chatId) { seen.current = {chat: chatId, ids: new Set(turns.map(t => t.id))}; setPending(null); setNotes([]); return; }
    if (status !== 'idle') return;
    const known = seen.current.ids, fresh = turns.filter(t => !known.has(t.id));
    if (!fresh.length) return;
    for (const t of fresh) known.add(t.id);
    const reply = [...fresh].reverse().find(t => t.role === 'assistant');
    if (!reply || reply.source === 'local') return; // only a model proposes; the device's own answers never do
    const lookups = lookupsFor(reply.id) ?? [];
    if (!lookups.length) return;
    // The person's own message this reply answers: the last one before it in the conversation.
    const at = turns.findIndex(t => t.id === reply.id), question = [...turns.slice(0, at < 0 ? turns.length : at)].reverse().find(t => t.role === 'user')?.text ?? '';
    const out = cardFromReply({
      calls: lookups.map(l => ({tool: l.result.tool, args: l.args, ok: l.result.ok})), question,
      hidden: document.visibilityState !== 'visible', offered: offeredNow(), mode: privacyMode(), healthOpen: health.current,
      healthLookup: lookups.some(l => l.result.ok && toolByName(l.result.tool)?.area === 'health'),
    });
    setNotes(out.dropped.map(d => d.message));
    if (out.dropped.length) attention.current?.();
    if (out.card) setPending({card: out.card, typed: question, lang: guardLanguage(question)});
  }, [turns, chatId, status, lookupsFor]);
  const handBack = useCallback((card: ToolCard, outcome: ToolOutcome) => {
    void session.send(wrapToolResult({origin: card.origin, tool: card.tool.name, text: outcome.text}), {area: 'today', pasted: true});
  }, [session]);
  return <>
    {notes.length > 0 && <div className="na-panel na-drop" role="status" data-tool-dropped="">{notes.map(n => <p key={n} className="na-fine">{n}</p>)}
      <div className="na-keys"><button type="button" className="na-key" data-quiet="" onClick={() => setNotes([])}>Dismiss</button></div></div>}
    {pending && <ToolCardDialog card={pending.card} lang={pending.lang} ctx={{mode: privacyMode(), healthOpen, typed: pending.typed}} run={(card, ctx) => bridge.run(card, ctx, {keep: session.kept})} onClose={() => setPending(null)} {...(connected ? {onHandBack: handBack} : {})}/>}
  </>;
}
export default ToolProposals;
