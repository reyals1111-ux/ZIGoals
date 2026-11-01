import {buildPageContext} from '../ai/context/builders';
import type {Consent} from '../ai/context/consent';
import {AREA_LABELS} from '../ai/context/pages';
import type {PageContext} from '../ai/context/types';
import type {Gates} from '../ai/gates';
import type {PageArea} from '../ai/settings';
import type {ToolSources} from '../ai/tools/env';
import {reviewWindow} from '../weekly-review/engine';
import {ZIGI_PAGE_PATHS} from './bridge';
import type {NovaPackInput, NovaPrivacy} from '../ai/context-pack/nova';
import {readNovaToolSources} from '../ai/tools/nova-sources';
import {sendDecision} from '../ai/privacy-mode';
import {readKey} from '../ai/keys';
import type {ProviderId} from '../ai/providers';
import type {NovaAgent} from '../../components/ai/use-chat-session';
import {HERMES_KEY_SLOT, hermesStatus, isHermesBase, readHermes, type NovaHermes} from './hermes-record';
import {redactForSend} from './privacy-mode';
import {readPrivacyMode} from './setup';
import {readNovaScopes} from './scopes';

/**
 * A page's records for NOVA's chat and for a task NOVA hands to ZIGi (Session AK, owner follow-up 2 N1): the same text
 * ZIGi attaches on that page (lib/ai/context/builders.ts), built from the same stores at the moment of the send, under
 * the gates of the page the person is on. Nothing crosses a boundary: an area goes only when its own share switch is on
 * and ZIGi is connected (`gates.areas`), Health only through the three-part Health gate (`gates.health`), nothing on a
 * private screen (`gates.paused`) or without records (`sources` null). A closed area gives an empty pack with the reason,
 * exactly as that page's own context would.
 */
export function packConsent(gates: Gates, area: PageArea): Consent {
  if (gates.paused) return {page: false, health: false, reasons: ['Paused on this private screen: nothing is read.']};
  if (!gates.connected) return {page: false, health: false, reasons: ['ZIGi is not connected.']};
  const page = gates.areas[area] === true;
  if (!page) return {page: false, health: false, reasons: [`Sharing is off for ${AREA_LABELS[area]} in Settings → ZIGi · Your Personal AI Companion.`]};
  const health = gates.health === true;
  return {page, health, reasons: health ? [] : ['Health: not shared (Settings → ZIGi · Your Personal AI Companion → Include Health).']};
}
export function pagePack({area, sources, gates}: {area: PageArea; sources: ToolSources | null; gates: Gates}): PageContext | null {
  if (!sources || gates.paused) return null;
  const consent = packConsent(gates, area);
  const week = area === 'today' && sources.weekly ? (() => { const w = reviewWindow(sources.weekly!.weekday, sources.habitDay); return {weekStart: w.weekStart, weekEnd: w.weekEnd, review: sources.weekly!}; })() : null;
  return buildPageContext({area, pathname: ZIGI_PAGE_PATHS[area], consent, now: sources.now, habitDay: sources.habitDay, healthDay: sources.healthDay,
    habits: sources.habits, health: sources.health, fasting: sources.fasting, platform: sources.platform, localGoals: sources.localGoals, metadata: sources.metadata, quotes: sources.quotes,
    // A coin's price is attached only on the Portfolio page itself (as there); the page tasks name Wealth's overview.
    portfolio: null, week});
}

/**
 * NOVA's own messages (lane NE, owner follow-up 2 N4): the input of NOVA's context pack at the moment of a send, the same
 * input "What NOVA can see" shows (`whatNovaCanSee`), so the preview is exactly what goes:
 * - sources: this page's tool sources with NOVA's own device records (`readNovaToolSources`; the notes only with the
 *   Notes scope);
 * - gates: this page's (aiGates on /app/nova); scopes: the person's NOVA permissions (lib/nova/scopes.ts, lane ND's panel);
 * - privacy: lane NC's mode as it applies to this send's target: 'guarded' exactly when the engine's guard would redact
 *   the request (a cloud model in Guarded, or a Hermes brain whose local model is not confirmed), so the pack carries the
 *   redacted text; otherwise the text as it is.
 */
export type NovaTarget = {provider: ProviderId | null; model: string | null; baseUrl: string | null};
export function novaPrivacy(storage: Pick<Storage, 'getItem'>, target: NovaTarget): NovaPrivacy {
  const mode = readPrivacyMode(storage);
  const hermes = target.provider === 'local' && target.baseUrl && mode && mode !== 'relaxed' ? readHermes(storage) : null;
  const hermesUnconfirmed = !!hermes && isHermesBase(target.baseUrl, hermes.data) && (hermes.unreadable || hermes.data.localModelConfirmed !== true);
  const applies = sendDecision(mode, {provider: target.provider, model: target.model, hermesUnconfirmed}) === 'redact' ? 'guarded' as const : null;
  return {mode: applies, redactForSend: (text, as) => redactForSend(text, as === 'guarded' ? 'guarded' : null).text};
}
export function novaPackInput({sources, gates, storage, target, chainChosen}: {sources: ToolSources | null; gates: Gates; storage: Pick<Storage, 'getItem'>; target: NovaTarget; chainChosen: boolean}): NovaPackInput | null {
  if (!sources || gates.paused) return null;
  const scopes = readNovaScopes(storage);
  let nova = sources.nova;
  try { nova = readNovaToolSources(storage, {notes: scopes.notes}); } catch { /* the tool sources' own read stands */ }
  return {sources: {...sources, nova}, gates, scopes, privacy: novaPrivacy(storage, target), chainChosen};
}
/**
 * The person's own Hermes Agent as NOVA's engine reaches it (owner follow-up 3 N11), from lane NC's connection record
 * (`zigoals:nova-hermes:v1`) and the key in the device's key store; null until a gateway is saved.
 */
export function hermesAgent(record: NovaHermes, scope: string): NovaAgent | null {
  const status = hermesStatus(record);
  if (!status.connected || !record.baseUrl) return null;
  return {name: 'Hermes Agent', baseUrl: record.baseUrl, model: status.model ?? 'hermes-agent', key: () => readKey(scope, HERMES_KEY_SLOT)};
}
