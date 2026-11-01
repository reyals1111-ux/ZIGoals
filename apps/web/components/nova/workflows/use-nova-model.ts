'use client';
import {useCallback, useMemo, useState} from 'react';
import {collectReply, streamChat} from '../../../lib/ai/chat';
import {guardRequest} from '../../../lib/ai/privacy-mode';
import {readKey} from '../../../lib/ai/keys';
import {looksSecret} from '../../../lib/ai/memory';
import {PROVIDERS, type ProviderId} from '../../../lib/ai/providers';
import {currentAiScope} from '../../../lib/ai/scope';
import {AI_OPTIONS} from '../../../lib/ai/store/records';
import {AI_USAGE_KEY, ZIGI_STORE_EVENT} from '../../../lib/ai/store/keys';
import {capNote, capState, monthKey, needsSpendConfirmation, readUsage, recordUsage} from '../../../lib/ai/usage';
import type {ChatEvent} from '../../../lib/ai/types';
import {rewordRoute, type PrivacyModeName} from '../../../lib/nova/briefs';
import {redactText, totalRedactions} from '../../../lib/nova/redact';
import {NOVA_SETUP, readPrivacyMode} from '../../../lib/nova/setup';
import {NOVA_WORKFLOWS, taskModel} from '../../../lib/nova/workflows/schema';
import type {ModelAsk} from '../../../lib/nova/workflows/run';
import {getAppStorage} from '../../../lib/showcase-storage';
import {useAiSettings} from '../../ai/use-ai-settings';
import {useDeviceRecord} from '../../ai/use-device-record';

/**
 * The person's model for NOVA's briefs or workflows (Session AK, owner follow-up 2 N2/N6), on ZIGi's one engine: the same
 * connection, key store, adapters, usage meter and caps. Words only, one request, a short answer. A local model always;
 * a cloud model only in the Guarded or Relaxed privacy mode (never chosen reads as Strict here), and in Guarded the text is
 * redacted on the device first (lib/nova/redact.ts) and what went out is kept for the person to see. Never ZIGoals hosted
 * (nothing of NOVA goes through a ZIGoals server). The model per task is the person's choice (Models), else the chat's.
 */
export type NovaModel = {route: 'local' | 'cloud' | null; provider: ProviderId | null; model: string | null; mode: PrivacyModeName; label: string; why: string; ask: ModelAsk | null; sent: {text: string; redactions: number} | null};
const currentMode = (): PrivacyModeName => { try { return readPrivacyMode(getAppStorage()) ?? 'strict'; } catch { return 'strict'; } };
export const providerLabel = (provider: ProviderId) => provider === 'local' ? 'your local model' : PROVIDERS[provider].name;
export function useNovaModel(task: 'briefs' | 'workflows'): NovaModel {
  const settings = useAiSettings(), options = useDeviceRecord(AI_OPTIONS), workflows = useDeviceRecord(NOVA_WORKFLOWS), setup = useDeviceRecord(NOVA_SETUP);
  const [sent, setSent] = useState<{text: string; redactions: number} | null>(null);
  const data = settings.data, provider = data.enabled && data.mode !== 'subscription' ? data.provider : null;
  const mode: PrivacyModeName = setup.unreadable ? 'strict' : setup.data.privacyMode ?? 'strict';
  const model = provider ? taskModel(workflows.data, provider, task) ?? data.model : null;
  const hosted = options.data.route === 'hosted';
  const route = hosted || !model ? null : rewordRoute(provider, mode);
  const ask = useCallback<ModelAsk>(async ({system, user, signal}) => {
    if (!provider || !model) throw new Error('No model is connected.');
    const now = currentMode(), path = rewordRoute(provider, now);
    if (!path) throw new Error('Your privacy mode keeps this on the device.');
    if (looksSecret(user)) throw new Error('This holds something shaped like a key or a password, so nothing was sent.');
    const out = path === 'cloud' && now === 'guarded' ? redactText(user) : {text: user, found: {}};
    if (path === 'cloud') { let cap = null; try { cap = capState(readUsage(getAppStorage()).data, monthKey(new Date())); } catch { cap = null; } if (needsSpendConfirmation(cap)) throw new Error(`${capNote(cap) ?? 'Your cap is reached.'} You asked to be asked first, so nothing was sent.`); }
    let key: string | null = null; try { key = await readKey(currentAiScope(), provider); } catch { key = null; }
    if (provider !== 'local' && !key) throw new Error('Your key is not on this device.');
    setSent({text: out.text, redactions: totalRedactions(out.found)});
    let requests = 0;
    const counted = async function* (): AsyncGenerator<ChatEvent> { for await (const event of streamChat(await guardRequest({provider, localServer: data.localServer ?? undefined, model, system, messages: [{role: 'user', content: out.text}], maxOutputTokens: Math.min(data.maxOutputTokens, 900), key, baseUrl: data.baseUrl ?? undefined, appOrigin: window.location.origin, ...(signal ? {signal} : {})}))) { requests = 1; yield event; } }; // the engine's privacy guard too (Ollama cloud models, an unconfirmed Hermes)
    let reply: Awaited<ReturnType<typeof collectReply>> | null = null;
    try { reply = await collectReply(counted()); return reply.text; }
    finally {
      // A request counts once the provider answered (a refused one costs nothing), as in ZIGi's chat.
      if (requests) { try { recordUsage(getAppStorage(), provider, reply?.usage ?? {input: null, output: null}, 1); window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: AI_USAGE_KEY})); } catch { /* the meter is a convenience */ } }
    }
  }, [provider, model, data.localServer, data.maxOutputTokens, data.baseUrl]);
  return useMemo(() => {
    const where = provider ? providerLabel(provider) : null;
    const why = hosted ? 'NOVA does not use ZIGoals hosted: connect your own local model or key.' : !provider || !model ? 'No model is connected, so NOVA words everything on this device.'
      : route ? '' : `Your privacy mode is Strict, so ${where} is not used for this: NOVA words it on this device.`;
    return {route, provider, model, mode, label: route && where ? `${route === 'local' ? 'Local' : 'Cloud'} · ${where} · ${model}` : 'On this device', why, ask: route ? ask : null, sent};
  }, [route, provider, model, mode, hosted, ask, sent]);
}
