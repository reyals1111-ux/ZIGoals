'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {guardLanguage} from '../../../lib/ai/safety-guard';
import type {ToolEnv} from '../../../lib/ai/tools/env';
import {dueOnOrAfter} from '../../../lib/bills/cadence';
import {localDate} from '../../../lib/local-date';
import {HANDOFF_WHAT, handoffTarget, type HandoffLang} from '../../../lib/nova/handoff/handoff';
import {healthReadOver, heldOutsideText} from '../../../lib/nova/handoff/health';
import {HAND_OFF_TOOL, handoffFromCalls} from '../../../lib/nova/handoff/model';
import {handoffFor, type HandoffContext, type HandoffRecord} from '../../../lib/nova/handoff/phrases';
import {noteOutbox} from '../../../lib/nova/outbox/record';
import {privacyMode} from '../../../lib/nova/privacy-mode';
import {getAppStorage} from '../../../lib/showcase-storage';
import type {ChatSession} from '../../ai/use-chat-session';
import type {HandoffItem} from './handoff-card';
import type {RunResult} from './run';

/**
 * Session AM-2 (owner's step 4b): hand-offs in NOVA's conversation. Two ways a card comes to be, one card at a time:
 * - `direct(text)`: the person's own words, read on the device (lib/nova/handoff/phrases.ts) before the engine. A
 *   hand-off phrase makes a card (or a plain sentence about what is missing) and NOVA says so; anything else returns
 *   false and goes to the engine exactly as before. Pasted words are never read as a hand-off.
 * - a model's reply that ran the `hand_off` lookup (lib/ai/tools/hand-off.ts): when the reply arrives, the first such
 *   call that ran and builds becomes the card; a refused call never does, and a second call is dropped.
 * Either way nothing happens until the person presses the card's button. When they do, one line goes to the "Sent out
 * from this device" history (when, what kind, the address or host; never the text), unless this chat is not kept.
 * The card lives in memory only: a reload or another conversation never brings one back.
 */
const newId = (): string => { try { return crypto.randomUUID(); } catch { return `h${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`; } };
/** The person's open tasks with a day and their bills' next due days, from the environment NOVA's on-device answers read under (its permissions). */
export function handoffRecords(env: ToolEnv | null, today: string): HandoffContext['records'] {
  if (!env) return null;
  const tasks: HandoffRecord[] = [], bills: HandoffRecord[] = [];
  try {
    // The same switches the `tasks` and `bills` lookups run under (lib/ai/tools/registry.ts `toolBlocked`).
    if (env.areas.today && (!env.todayTools || env.todayTools.has('tasks'))) for (const t of env.nova?.tasks?.tasks ?? []) if (t.due && !t.doneAt) tasks.push({title: t.title, date: t.due, ...(t.time ? {time: t.time} : {})});
    if (env.areas.wealth) for (const b of env.ak?.bills?.bills ?? []) { try { bills.push({title: b.title, date: dueOnOrAfter(b.nextDue, b.cadence, today)}); } catch { /* a bill without a readable day is left out */ } }
  } catch { /* what cannot be read is not offered */ }
  return {tasks: tasks.slice(0, 500), bills: bills.slice(0, 200)};
}
export function useHandoffs({session, say, healthOpen, paused, localEnv}: {
  session: ChatSession; say: (shown: string, text: string) => void;
  /** NOVA's Health permission and this device's Health gate are both on (Q14, Q16). */
  healthOpen: boolean;
  /** A private screen: nothing is read from the conversation or the records. */
  paused: boolean;
  /** The environment NOVA's on-device answers read under right now (null while paused or before the records are read). */
  localEnv: () => ToolEnv | null;
}) {
  const [item, setItem] = useState<HandoffItem | null>(null), [notice, setNotice] = useState(''), [acted, setActed] = useState<string | null>(null);
  const typed = useRef<string[]>([]), pasted = useRef(new Set<string>()), seen = useRef<{chat: string; ids: Set<string>} | null>(null), kept = useRef(session.kept);
  useEffect(() => { kept.current = session.kept; }, [session.kept]);
  const turns = session.chat.turns, chatId = session.chat.id, status = session.status, parsed = session.parsed, lookupsFor = session.lookupsFor;
  // Another conversation: its card and the words typed for the last one are gone.
  useEffect(() => { setItem(null); setNotice(''); typed.current = []; pasted.current = new Set(); }, [chatId]);
  /**
   * Security review (finding 4): ONE Health rule for every path — whether ANY turn of the conversation read Health
   * (lib/nova/handoff/health.ts `healthReadOver`), so an answer that restates an earlier Health answer does not leave either.
   * Finding 11: whether any turn held text from outside (a tool's result, a lookup of someone else's words, a paste of this visit).
   */
  const outsideNow = useCallback(() => heldOutsideText(turns.map(t => ({text: t.text, tools: t.tools, pasted: t.role === 'user' && pasted.current.has(t.text)}))), [turns]);
  const direct = useCallback((text: string, wasPasted = false): boolean => {
    if (wasPasted) { pasted.current.add(text); return false; }
    const today = localDate(), lastTurn = paused ? undefined : [...turns].reverse().find(t => t.role === 'assistant');
    let records: HandoffContext['records'] = null;
    if (!paused) { try { records = handoffRecords(localEnv(), today); } catch { records = null; } }
    const plan = handoffFor(text, {today, now: new Date(), healthOpen, paused, records,
      last: lastTurn ? {text: (parsed.get(lastTurn.id)?.text ?? lastTurn.text).trim(), health: healthReadOver(turns)} : null});
    if (plan.kind === 'none') { typed.current = [...typed.current, text].slice(-40); return false; }
    setNotice('');
    if (plan.kind === 'say') { setItem(null); say(text, plan.words); return true; }
    setItem({id: newId(), handoff: plan.handoff, lang: plan.lang, by: 'device', outside: outsideNow()});
    say(text, plan.say);
    return true;
  }, [turns, parsed, outsideNow, healthOpen, paused, localEnv, say]);

  // A model's reply that asked for a card: made when the reply has arrived, from the lookups that ran.
  useEffect(() => {
    // The turns that were already there when this conversation opened are history, not new replies.
    if (seen.current?.chat !== chatId) { seen.current = {chat: chatId, ids: new Set(turns.map(t => t.id))}; return; }
    if (status !== 'idle') return;
    const known = seen.current.ids, fresh = turns.filter(t => !known.has(t.id));
    if (!fresh.length) return;
    for (const t of fresh) known.add(t.id);
    const reply = [...fresh].reverse().find(t => t.role === 'assistant'), asked = [...fresh].reverse().find(t => t.role === 'user');
    if (!reply || reply.source === 'local' || reply.source === 'on-device') return;
    const calls = (lookupsFor(reply.id) ?? []).map(l => ({tool: l.result.tool, args: l.args, ok: l.result.ok}));
    if (!calls.some(c => c.tool === HAND_OFF_TOOL)) return;
    const lang: HandoffLang = asked ? guardLanguage(asked.text) : 'en';
    let mode: ReturnType<typeof privacyMode> = 'strict';
    try { mode = privacyMode(); } catch { mode = 'strict'; /* a mode that cannot be read is the careful one */ }
    const made = handoffFromCalls(calls, {now: new Date(), lang, typed: typed.current, healthOpen, healthRead: healthReadOver(turns), mode});
    if (made.handoff) { setNotice(''); setItem({id: newId(), handoff: made.handoff, lang, by: 'model', outside: outsideNow()}); }
    else if (made.refused) { setItem(null); setNotice(made.refused); }
  }, [turns, chatId, status, lookupsFor, outsideNow, healthOpen]);

  /** The person pressed a card's button: one line for the history (never the content), unless this chat is not kept. */
  const ran = useCallback((done: HandoffItem, result: RunResult, how: 'handoff' | 'copy') => {
    setActed(done.id);
    if (result === 'cancelled' || !kept.current) return;
    const copied = how === 'copy' && done.handoff.kind !== 'copy';
    try { noteOutbox(getAppStorage(), {at: new Date().toISOString(), kind: 'handoff', what: copied ? HANDOFF_WHAT.copy : HANDOFF_WHAT[done.handoff.kind], target: copied ? 'Clipboard' : handoffTarget(done.handoff), ok: result === 'done'}); } catch { /* the history is a convenience */ }
  }, []);
  const dismiss = useCallback(() => { setItem(null); setNotice(''); }, []);
  /** A card nobody has pressed yet (or a plain reason one was not made) waits for the person; once a button was pressed it no longer asks for attention. */
  const waiting = (!!item && acted !== item.id) || !!notice;
  return {item, notice, waiting, direct, ran, dismiss};
}
