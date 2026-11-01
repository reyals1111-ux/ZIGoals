import {buildNovaPack, type NovaScopes} from '../context-pack/nova';
import {buildNovaSystemParts} from '../context-pack/nova-prompt';
import type {SystemParts} from '../context/specialists';
import type {Gates} from '../gates';
import {Handles} from '../handles';
import type {ToolEnv, ToolSources} from '../tools/env';
import type {ModelCase} from './corpus';

/**
 * Owner follow-up 2 (N10): a case asked on NOVA's surface (`surface: 'nova'`) gets what NOVA's chat sends: NOVA's own
 * system prompt with its context pack (every scope granted except Health when the case closes it; the chain chosen; the
 * privacy mode Relaxed, so the figures are the records' own) and the tools narrowed to those scopes. The harness
 * (real-model.test.ts) uses it instead of a page's prompt; nothing else about the run changes.
 */
export function novaPromptFor(c: ModelCase, sources: ToolSources, gates: Gates, {providerName, tools, today}: {providerName: string; tools: boolean; today: string}, handles = new Handles()): {parts: SystemParts; env: ToolEnv} {
  const health = c.health !== 'closed';
  const scopes: NovaScopes = {today: true, goals: true, habits: true, health, wealth: true, notes: true, journal: true, earn: true};
  const pack = buildNovaPack({sources, gates, scopes, chainChosen: true, privacy: {mode: 'relaxed', redactForSend: text => text}, handles});
  return {parts: buildNovaSystemParts({pack: pack.text, customInstructions: '', providerName, tools, today, healthShared: health}), env: pack.env};
}
