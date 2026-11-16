import {AiError} from '../../ai/errors';
import {listModels} from '../../ai/models';
import type {PrivacyMode} from '../setup';
import {baseOf, parseLoopback} from './loopback';

/**
 * Session AM-2 (owner's step 4c, item 6): "any OpenAI-compatible agent on this computer" as a first-class choice beside
 * Hermes Agent. Nothing new is spoken here: the live check is ZIGi's own model listing (lib/ai/models.ts `listModels`,
 * `GET <address>/v1/models`, the connection test the setup has always used), and an agent the person makes NOVA's brain
 * is ZIGi's existing local OpenAI-compatible connection (the same wire LM Studio, llama.cpp and Hermes use). This module
 * adds the stricter address rule (./loopback.ts), the plain words, and the rule at the moment of connecting.
 *
 * An agent is more than a model: it may itself ask a cloud model and use tools with its own accounts. So, as for Hermes
 * (lib/nova/hermes-record.ts), in Strict and Guarded it becomes NOVA's brain only after the person confirms that it
 * answers with a model on this computer; otherwise the panel says which two ways are open. ZIGoals never sees the
 * agent's accounts, and nothing goes through a ZIGoals server.
 */
export const OWN_AGENT_WORDS = {
  what: 'Any agent on this computer that speaks the OpenAI-compatible API (it answers at /v1/models and /v1/chat/completions).',
  acts: 'Your agent acts with its own accounts and tools, outside ZIGoals: what it sends, and to whom, is decided by the agent you run. ZIGoals never sees or stores its passwords or tokens, and nothing goes through a ZIGoals server.',
  confirm: 'My agent answers with a model on this computer (it does not pass my words to a cloud model).',
  brain: 'As NOVA’s brain it receives what you share with NOVA (NOVA → Permissions), as any model you connect does.',
} as const;
export type AgentBase = {ok: true; base: string} | {ok: false; message: string};
/** The agent's base address: one of the loopback forms a browser can reach, without the trailing /v1. */
export function agentBase(input: string): AgentBase {
  const at = parseLoopback(input);
  if (!at.ok) return {ok: false, message: at.message};
  if (at.host === '[::1]') return {ok: false, message: 'For an agent, use http://127.0.0.1 or http://localhost with the same port: browsers cannot let a site reach an IPv6 address such as [::1].'};
  return {ok: true, base: baseOf(at)};
}
export type AgentCheck = {ok: true; base: string; models: string[]; model: string; ms: number} | {ok: false; message: string; ms: number};
export const AGENT_CHECK_MS = 15_000;
/** The live check: `GET <base>/v1/models` through ZIGi's own listing. The key, when the agent wants one, goes only to that address. */
export async function checkOwnAgent(input: string, key: string | null, deps: {fetcher?: typeof fetch; signal?: AbortSignal; now?: () => number; ms?: number} = {}): Promise<AgentCheck> {
  const now = deps.now ?? (() => Date.now()), started = now(), took = () => Math.max(0, Math.round(now() - started));
  const at = agentBase(input);
  if (!at.ok) return {ok: false, message: at.message, ms: 0};
  const control = new AbortController(), timer = setTimeout(() => control.abort(), deps.ms ?? AGENT_CHECK_MS), stop = () => control.abort();
  deps.signal?.addEventListener('abort', stop, {once: true});
  try {
    const list = await listModels({provider: 'local', baseUrl: at.base, localServer: 'openai-compatible', key, signal: control.signal, ...(deps.fetcher ? {fetcher: deps.fetcher} : {})});
    const models = list.filter(m => m.kind === 'chat').map(m => m.id).slice(0, 50);
    if (!models.length) return {ok: false, message: 'An agent answered at that address, but its /v1/models lists no model to talk to.', ms: took()};
    return {ok: true, base: at.base, models, model: models[0]!, ms: took()};
  } catch (cause) {
    const kind = cause instanceof AiError ? cause.kind : 'local-unreachable';
    const message = kind === 'bad-key' ? (key ? 'The agent refused the key. Check it in your agent’s own settings and type it again.' : 'The agent is running and asks for a key (token). Type the key your agent shows; it is sent only to that address.')
      : kind === 'cors' || kind === 'blocked' ? 'Something answered at that address, but it does not allow this site. In your agent’s own settings, allow this site’s address (its CORS or allowed-origins setting), then check again.'
      : kind === 'unreadable' ? 'Something answered at that address, but its /v1/models could not be read. Is this the agent’s OpenAI-compatible address?'
      : kind === 'aborted' ? (deps.signal?.aborted ? 'Stopped.' : 'The agent did not answer in time.')
      : 'Nothing answered at that address, or the browser hid the answer. Start your agent, check the port, and allow this site’s address in the agent’s settings. (On Safari a secure site cannot reach this computer: use Chrome, Edge or Firefox.)';
    return {ok: false, message, ms: took()};
  } finally { clearTimeout(timer); deps.signal?.removeEventListener('abort', stop); }
}
export const agentCheckLine = (check: AgentCheck): string => check.ok ? `Your agent answered on this computer in ${check.ms} ms: ${check.models.length} model${check.models.length === 1 ? '' : 's'} (${check.models.slice(0, 3).join(', ')}${check.models.length > 3 ? ', …' : ''}).` : check.message;
/**
 * Whether the agent may become NOVA's brain now. No mode chosen, or Relaxed: yes (the person's informed choice). Strict
 * or Guarded: only once they confirmed, for this address, that it answers with a model on this computer.
 */
export function brainAllowed(mode: PrivacyMode | null, confirmedLocal: boolean): {ok: true} | {ok: false; message: string} {
  if (mode !== 'strict' && mode !== 'guarded') return {ok: true};
  if (confirmedLocal) return {ok: true};
  return {ok: false, message: `${mode === 'strict' ? 'Strict' : 'Guarded'}: an agent may pass your words on to a cloud model. Confirm above that yours answers with a model on this computer, or choose Relaxed in NOVA → Privacy if you want to use it as it is.`};
}
