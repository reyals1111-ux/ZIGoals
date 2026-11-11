'use client';
import {useCallback, useEffect, useRef} from 'react';
import type {HudPreset} from '../../../lib/nova/layout';
import type {AskDevice, MakeRequest} from '../../../lib/nova/stage/record';
import {mergeSummons, stageCalls, summonFor, summonForTools, type StageCommand, type SummonContext, type SummonPlan} from '../../../lib/nova/summon/summon';
import {commandWords, madeWords} from '../../../lib/nova/summon/words';
import type {ChatSession} from '../../ai/use-chat-session';
import type {StageAsk, StageGates} from './use-stage';

/**
 * Session AM (ADR-038 D4–D7, A4): the summon step inside NOVA's chat engine. Every request still goes through ZIGi's one
 * engine on NOVA's surface (the safety guard first, then on-device answers, then the person's model); this hook adds only
 * *which widgets* a request makes, and tells the stage:
 * - a stage command ("clear the stage", "pin the weather") or a plain "show me …" is answered on the stage itself, on the
 *   device, at once (`direct`): NOVA says what is on the stage and the widgets are made;
 * - any other question is answered by the engine; when its reply arrives, the question's own widgets and the lookups the
 *   reply used (the on-device answer's calls, or the tools the person's model ran) are made (`resolve`).
 * A message the safety guard answers makes nothing (lib/nova/summon/summon.ts checks it first). The figures are never
 * here: a widget reads the person's records itself, under the stage's gates.
 */
export type StageAnswer = {id: string; question: string; text: string; by: 'device' | 'model'; decision: boolean};
export type StageBridge = {
  device: AskDevice;
  available: (id: string) => boolean;
  make: (requests: readonly MakeRequest[], ask?: StageAsk) => boolean;
  command: (command: Exclude<StageCommand, {kind: 'arrangement'}>) => boolean;
  arrangement: (preset: HudPreset) => void;
  noteAsk: (ask: StageAsk, widgets?: readonly MakeRequest[]) => void;
  setGates: (gates: StageGates | null) => void;
  /** The newest reply, for the stage's own line under the star (null: nothing to show). */
  answer: (answer: StageAnswer | null) => void;
  /** Something in the conversation needs the person (a failure, a size or spend question): the stage opens it. */
  attention: () => void;
};
type Turn = ChatSession['chat']['turns'][number];
export function useSummoner({bridge, session, say, goals}: {
  bridge: StageBridge | undefined; session: ChatSession; say: (shown: string, text: string) => void;
  /** The person's goals on this device (ids and names), so "am I on track for Japan" finds its goal. */
  goals: () => SummonContext['goals'];
}) {
  const pending = useRef<{question: string; plan: SummonPlan} | null>(null), seen = useRef<{chat: string; ids: Set<string>} | null>(null), kept = useRef(session.kept);
  useEffect(() => { kept.current = session.kept; }, [session.kept]);
  const context = useCallback((): SummonContext => ({goals: goals(), ...(bridge ? {available: bridge.available} : {})}), [bridge, goals]);
  /** Before the engine: true when the stage answered the words itself (a command, or a plain "show me …"). */
  const direct = useCallback((text: string): boolean => {
    if (!bridge) return false;
    const plan = summonFor(text, context()), ask: StageAsk = {text, by: 'device', device: bridge.device, kept: kept.current};
    pending.current = null;
    if (plan.command) {
      let done = true;
      if (plan.command.kind === 'arrangement') bridge.arrangement(plan.command.preset); else done = bridge.command(plan.command);
      bridge.noteAsk(ask);
      say(text, commandWords(plan.command, plan.lang, done));
      return true;
    }
    if (plan.direct && plan.widgets.length) {
      bridge.make(plan.widgets, ask);
      say(text, madeWords(plan.widgets, plan.lang));
      return true;
    }
    pending.current = {question: text, plan};
    return false;
  }, [bridge, context, say]);
  /** A question that reaches the engine by another way (a welcome chip, "ask this instead"): its widgets wait for the reply too. */
  const note = useCallback((text: string) => { if (bridge && pending.current?.question !== text) pending.current = {question: text, plan: summonFor(text, context())}; }, [bridge, context]);

  // When a reply arrives: make what the question and the reply's lookups ask for, and hand the reply to the stage's line.
  const turns = session.chat.turns, chatId = session.chat.id, status = session.status, localFor = session.localFor, parsed = session.parsed;
  useEffect(() => {
    if (!bridge) return;
    // The turns that were already there when this conversation opened are history, not new replies.
    if (seen.current?.chat !== chatId) { seen.current = {chat: chatId, ids: new Set(turns.map(t => t.id))}; return; }
    if (status !== 'idle') return;
    const known = seen.current.ids, fresh = turns.filter(t => !known.has(t.id));
    if (!fresh.length) return;
    for (const t of fresh) known.add(t.id);
    const reply = [...fresh].reverse().find((t: Turn) => t.role === 'assistant'), asked = [...fresh].reverse().find((t: Turn) => t.role === 'user');
    if (!reply) return;
    const local = localFor(reply.id), by = reply.source === 'local' || reply.source === 'on-device' ? 'device' as const : 'model' as const;
    const wait = pending.current; pending.current = null;
    const question = asked?.text ?? wait?.question ?? '';
    if (wait && wait.question === question) {
      const calls = (local?.reply && 'calls' in local.reply ? local.reply.calls : (reply.tools ?? [])).map(c => ({tool: c.tool, args: c.args ?? null}));
      // A4: what the person's model asked the stage for explicitly comes first; then the question's own widgets and the lookups'.
      const asked = by === 'model' ? stageCalls(calls, context()) : {show: [], commands: []};
      const widgets = mergeSummons(asked.show, mergeSummons(wait.plan.widgets, summonForTools(calls, context())));
      const ask: StageAsk = {text: question, by, device: bridge.device, kept: kept.current};
      if (widgets.length) bridge.make(widgets, ask); else bridge.noteAsk(ask);
      for (const command of asked.commands) bridge.command(command);
    }
    const p = parsed.get(reply.id), decision = !!(p && p.proposals.length) || local?.reply.kind === 'choices';
    bridge.answer({id: reply.id, question, text: p?.text ?? reply.text, by, decision});
  }, [bridge, turns, chatId, status, localFor, parsed, context]);
  return {direct, note};
}
