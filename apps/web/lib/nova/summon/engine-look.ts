import {parseReply} from '../../ai/actions/parse';
import {localAnswer, type LocalReply} from '../../ai/local-answers/engine';
import {followUpQuestion} from '../../ai/local-answers/followup';
import {noModelReply} from '../../ai/local-answers/no-model';
import type {ToolEnv} from '../../ai/tools/env';
import type {EngineLookKind} from './summon';

/**
 * Session AM (lead's rule: the engine comes first): what NOVA's on-device engine would answer to these words, read from
 * the engine itself and in its own order (components/ai/use-chat-session.ts `ask`: the device's lookups, then the same
 * question as a follow-up of the last one, then a connected model, then the no-model replies). The stage reads only the
 * kind of reply, to decide whether it answers by itself (lib/nova/summon/summon.ts `stageOwns`); nothing is said, kept
 * or sent here, and the engine still writes its own reply afterwards.
 *
 * `model`: a model answers what the device cannot (the person's own model, Chrome's on-device model, hosted answers).
 */
export type EngineLook = {kind: EngineLookKind; calls: readonly {tool: string; args?: Record<string, unknown> | null}[]};
export function replyLook(reply: LocalReply): EngineLook {
  if (reply.kind === 'examples') return {kind: 'fallback', calls: []};
  if (reply.kind !== 'answer' || !reply.calls.length) return {kind: 'other', calls: []};
  let card = false;
  try { card = parseReply(reply.text).proposals.length > 0; } catch { card = true; }
  return card ? {kind: 'other', calls: []} : {kind: 'records', calls: reply.calls.map(c => ({tool: c.tool, args: c.args ?? null}))};
}
export function engineLook(text: string, env: ToolEnv | null, {previous = null, model = false}: {previous?: string | null; model?: boolean} = {}): EngineLook {
  let reply: LocalReply = {kind: 'none'};
  try { if (env) reply = localAnswer(text, env); } catch { reply = {kind: 'none'}; }
  if (reply.kind === 'none' && env) { const again = followUpQuestion(text, previous); if (again) { try { const r = localAnswer(again, env); if (r.kind === 'answer' || r.kind === 'choices') reply = r; } catch { /* the question as typed stands */ } } }
  if (reply.kind === 'none' && model) return {kind: 'model', calls: []};
  if (reply.kind === 'none') { try { reply = noModelReply(text, env, previous); } catch { return {kind: 'other', calls: []}; } }
  return reply.kind === 'none' ? {kind: 'other', calls: []} : replyLook(reply);
}
