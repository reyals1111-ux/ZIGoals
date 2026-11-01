'use client';
import {useMemo} from 'react';
import {buildContextPack, type ContextPack} from '../../../lib/ai/context-pack/build';
import {buildNovaPack, DEFAULT_NOVA_SCOPES, type NovaPack, type NovaScopes} from '../../../lib/ai/context-pack/nova';
import type {AiSettings} from '../../../lib/ai/settings';
import {hermesNeedsRedaction, isHermesBase, NOVA_HERMES} from '../../../lib/nova/hermes-record';
import {previewFor, type PrivacyMode} from '../../../lib/nova/privacy-mode';
import {novaPackInput} from '../../../lib/nova/bridge-pack';
import {scopesOf} from '../../../lib/nova/scopes';
import {NOVA_SETUP} from '../../../lib/nova/setup';
import {getAppStorage} from '../../../lib/showcase-storage';
import {useChainChoice} from '../../chain/use-chain-choice';
import {useAiContext} from '../../ai/use-ai-context';
import {useDeviceRecord} from '../../ai/use-device-record';

/**
 * The pack's areas from ZIGi's own per-area switches (Health only with "Include Health" and its gate; notes stay out),
 * narrowed by NOVA → Permissions (security review Z1A-4: Hermes's first run and summary meet NOVA's scopes too).
 */
export const packScopeOf = (settings: AiSettings, scopes: NovaScopes = DEFAULT_NOVA_SCOPES) => ({habits: settings.pageShare.habits && scopes.habits, goals: settings.pageShare.goals && scopes.goals, wealth: settings.pageShare.wealth && scopes.wealth, health: settings.pageShare.health && settings.includeHealth && scopes.health, notes: false, days: 30 as const});
/** The exportable context pack of the areas the person shares (lib/ai/context-pack/build), for Hermes's summary and first run. */
export function useContextPack(settings: AiSettings): {pack: ContextPack | null; healthGate: boolean} {
  const context = useAiContext(settings, 'your AI', false), setup = useDeviceRecord(NOVA_SETUP);
  const sources = useMemo(() => context.toolSources(), [context]);
  const scope = useMemo(() => packScopeOf(settings, scopesOf(setup.unreadable ? {version: 1} : setup.data)), [settings, setup.data, setup.unreadable]);
  const pack = useMemo(() => sources ? buildContextPack({sources, gates: context.gates, scope}) : null, [sources, context.gates, scope]);
  return {pack, healthGate: context.gates.localHealth};
}
export type NovaSees = {pack: NovaPack | null; scopes: NovaScopes; chainChosen: boolean; healthGate: boolean; line: string; refused: boolean};
/**
 * "What NOVA can see" (N3 step 5, N4): lane NE's NOVA pack (lib/ai/context-pack/nova.ts `buildNovaPack`, whose text is
 * `whatNovaCanSee`). Security review Z1A-10 (lane ZF): built from the very input the send uses (lib/nova/bridge-pack.ts
 * `novaPackInput`: NOVA → Permissions with ZIGi's gates, and the privacy mode as it applies to the connected model), so the
 * guide's preview is exactly what goes; nothing at all for a cloud in Strict.
 */
export function useNovaSees(settings: AiSettings, mode: PrivacyMode | null): NovaSees {
  const context = useAiContext(settings, 'your AI', false), hermes = useDeviceRecord(NOVA_HERMES), chain = useChainChoice(), setup = useDeviceRecord(NOVA_SETUP);
  const provider = settings.enabled && settings.mode !== 'subscription' ? settings.provider : null;
  const hermesUnconfirmed = provider === 'local' && isHermesBase(settings.baseUrl, hermes.data) && hermesNeedsRedaction(mode, hermes.data.localModelConfirmed === true);
  const input = useMemo(() => { try { return novaPackInput({sources: context.toolSources(), gates: context.gates, storage: getAppStorage(), target: {provider, model: settings.model, baseUrl: settings.baseUrl}, chainChosen: chain.chosen}); } catch { return null; } },
    // The record's scopes and mode, Hermes's confirmation and the chain choice are read again whenever one changes.
    [context, provider, settings.model, settings.baseUrl, chain.chosen, setup.data, hermes.data, mode]); // eslint-disable-line react-hooks/exhaustive-deps
  const pack = useMemo(() => input ? buildNovaPack(input) : null, [input]);
  const scopes = input?.scopes ?? scopesOf(setup.unreadable ? {version: 1} : setup.data);
  const preview = previewFor({message: '', mode, provider, model: settings.model, hermesUnconfirmed});
  return {pack, scopes, chainChosen: chain.chosen, healthGate: context.gates.localHealth, line: preview.line, refused: preview.decision === 'refuse'};
}
export function WhatNovaSees({sees}: {sees: NovaSees}) {
  const {pack} = sees;
  if (!pack) return <p className="ai-note" role="status">Reading your records…</p>;
  return <div className="nova-sees nova-guide-send" data-decision={sees.refused ? 'refuse' : undefined}>
    <p className="ai-note">About {pack.estimatedTokens.toLocaleString('en-US')} tokens (an estimate) · {pack.included.length ? `${pack.included.length} part${pack.included.length === 1 ? '' : 's'} of your life` : 'nothing attached'}{pack.overBudget.length ? ' · some read only when asked, to keep it short' : ''}.</p>
    <p className="nova-guide-send-line"><b>{sees.line}</b></p>
    {!sees.refused && <pre className="nova-guide-send-text" tabIndex={0} aria-label="Exactly what NOVA's prompt carries">{pack.text}</pre>}
  </div>;
}
