'use client';
import {useMemo} from 'react';
import {buildContextPack, type ContextPack} from '../../../lib/ai/context-pack/build';
import {buildNovaPack, type NovaPack} from '../../../lib/ai/context-pack/nova';
import {noteTexts} from '../../../lib/ai/privacy-mode';
import type {AiSettings} from '../../../lib/ai/settings';
import {JOURNAL} from '../../../lib/journal/schema';
import {hermesNeedsRedaction, isHermesBase, NOVA_HERMES} from '../../../lib/nova/hermes-record';
import {previewFor, redactForSend, type PrivacyMode} from '../../../lib/nova/privacy-mode';
import {knownNamesFrom} from '../../../lib/nova/redact';
import {novaScopesFrom, packPrivacyMode} from '../../../lib/nova/setup-scopes';
import {useChainChoice} from '../../chain/use-chain-choice';
import {useAiContext} from '../../ai/use-ai-context';
import {useDeviceRecord} from '../../ai/use-device-record';

/** The pack's areas from ZIGi's own per-area switches (Health only with "Include Health" and its gate; notes stay out). */
export const packScopeOf = (settings: AiSettings) => ({habits: settings.pageShare.habits, goals: settings.pageShare.goals, wealth: settings.pageShare.wealth, health: settings.pageShare.health && settings.includeHealth, notes: false, days: 30 as const});
/** The exportable context pack of the areas the person shares (lib/ai/context-pack/build), for Hermes's summary and first run. */
export function useContextPack(settings: AiSettings): {pack: ContextPack | null; healthGate: boolean} {
  const context = useAiContext(settings, 'your AI', false);
  const sources = useMemo(() => context.toolSources(), [context]);
  const scope = useMemo(() => packScopeOf(settings), [settings]);
  const pack = useMemo(() => sources ? buildContextPack({sources, gates: context.gates, scope}) : null, [sources, context.gates, scope]);
  return {pack, healthGate: context.gates.localHealth};
}
export type NovaSees = {pack: NovaPack | null; scopes: ReturnType<typeof novaScopesFrom>; chainChosen: boolean; healthGate: boolean; line: string; refused: boolean};
/**
 * "What NOVA can see" (N3 step 5, N4): lane NE's NOVA pack (lib/ai/context-pack/nova.ts `buildNovaPack`, whose text is
 * `whatNovaCanSee`), built from the scopes NOVA → Permissions edits, and redacted exactly as the send path would for the
 * connected model: 'guarded' only when the engine's hook would send the redacted copy (a cloud in Guarded; an unconfirmed
 * Hermes in Strict or Guarded); nothing at all for a cloud in Strict.
 */
export function useNovaSees(settings: AiSettings, mode: PrivacyMode | null): NovaSees {
  const context = useAiContext(settings, 'your AI', false), journal = useDeviceRecord(JOURNAL), hermes = useDeviceRecord(NOVA_HERMES), chain = useChainChoice();
  const sources = useMemo(() => context.toolSources(), [context]);
  const scopes = useMemo(() => novaScopesFrom(settings, journal.loaded && !journal.unreadable && journal.data.shareWithAi === true), [settings, journal.loaded, journal.unreadable, journal.data.shareWithAi]);
  const provider = settings.enabled && settings.mode !== 'subscription' ? settings.provider : null;
  const hermesUnconfirmed = provider === 'local' && isHermesBase(settings.baseUrl, hermes.data) && hermesNeedsRedaction(mode, hermes.data.localModelConfirmed === true);
  const target = useMemo(() => ({provider, model: settings.model, hermesUnconfirmed}), [provider, settings.model, hermesUnconfirmed]);
  const knownNames = useMemo(() => knownNamesFrom(noteTexts()), []);
  const pack = useMemo(() => sources ? buildNovaPack({sources, gates: context.gates, scopes, chainChosen: chain.chosen, privacy: {mode: packPrivacyMode(mode, target), redactForSend: (text, m) => redactForSend(text, m === 'guarded' ? 'guarded' : null, knownNames)}}) : null, [sources, context.gates, scopes, chain.chosen, mode, target, knownNames]);
  const preview = previewFor({message: '', mode, ...target});
  return {pack, scopes, chainChosen: chain.chosen, healthGate: context.gates.localHealth, line: preview.line, refused: preview.decision === 'refuse'};
}
export function WhatNovaSees({sees}: {sees: NovaSees}) {
  const {pack} = sees;
  if (!pack) return <p className="ai-note" role="status">Reading your records…</p>;
  return <div className="nova-sees nova-send" data-decision={sees.refused ? 'refuse' : undefined}>
    <p className="ai-note">About {pack.estimatedTokens.toLocaleString('en-US')} tokens (an estimate) · {pack.included.length ? `${pack.included.length} part${pack.included.length === 1 ? '' : 's'} of your life` : 'nothing attached'}{pack.overBudget.length ? ' · some read only when asked, to keep it short' : ''}.</p>
    <p className="nova-send-line"><b>{sees.line}</b></p>
    {!sees.refused && <pre className="nova-send-text" tabIndex={0} aria-label="Exactly what NOVA's prompt carries">{pack.text}</pre>}
  </div>;
}
