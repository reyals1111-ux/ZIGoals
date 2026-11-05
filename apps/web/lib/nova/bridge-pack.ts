import {buildPageContext} from '../ai/context/builders';
import type {Consent} from '../ai/context/consent';
import {AREA_LABELS} from '../ai/context/pages';
import type {PageContext} from '../ai/context/types';
import type {Gates} from '../ai/gates';
import type {PageArea} from '../ai/settings';
import type {ToolEnv, ToolSources} from '../ai/tools/env';
import {reviewWindow} from '../weekly-review/engine';
import {ZIGI_PAGE_PATHS} from './bridge';
import {novaToolEnv, scopeOpen, type NovaPackInput, type NovaPrivacy, type NovaScope, type NovaScopes} from '../ai/context-pack/nova';
import type {Handles} from '../ai/handles';
import {readNovaToolSources} from '../ai/tools/nova-sources';
import {sendDecision} from '../ai/privacy-mode';
import {readKey} from '../ai/keys';
import type {ProviderId} from '../ai/providers';
import type {NovaAgent} from '../../components/ai/use-chat-session';
import {HERMES_KEY_SLOT, hermesStatus, isHermesBase, localModelStillConfirmed, readHermes, type NovaHermes} from './hermes-record';
import {redactForSend} from './privacy-mode';
import {NOVA_SETUP, readPrivacyMode} from './setup';
import {isKnownCloudModel} from './cloud-models';
import {readDeviceRecord} from '../device-record';
import {readNovaScopes} from './scopes';

/**
 * A page's records for NOVA's chat and for a task NOVA hands to ZIGi (Session AK, owner follow-up 2 N1): the same text
 * ZIGi attaches on that page (lib/ai/context/builders.ts), built from the same stores at the moment of the send, under
 * the gates of the page the person is on. Nothing crosses a boundary: an area goes only when its own share switch is on
 * and ZIGi is connected (`gates.areas`), Health only through the three-part Health gate (`gates.health`), nothing on a
 * private screen (`gates.paused`) or without records (`sources` null). A closed area gives an empty pack with the reason,
 * exactly as that page's own context would.
 */
/**
 * Security review Z1A-4 (lane ZF): a task NOVA hands to ZIGi or to the person's Hermes also meets NOVA → Permissions:
 * the page only while its NOVA scope is open, Health only with both NOVA's Health scope and ZIGi's Health gate. Without
 * `nova` (ZIGi's own pages, the tests of ZIGi's text) the consent is ZIGi's alone, as before.
 */
export type NovaPermission = {scopes: NovaScopes; chainChosen: boolean};
const AREA_SCOPE: Partial<Record<PageArea, NovaScope>> = {today: 'today', goals: 'goals', habits: 'habits', health: 'health', wealth: 'wealth'};
export function packConsent(gates: Gates, area: PageArea, nova?: NovaPermission): Consent {
  if (gates.paused) return {page: false, health: false, reasons: ['Paused on this private screen: nothing is read.']};
  if (!gates.connected) return {page: false, health: false, reasons: ['ZIGi is not connected.']};
  const page = gates.areas[area] === true;
  if (!page) return {page: false, health: false, reasons: [`Sharing is off for ${AREA_LABELS[area]} in Settings → ZIGi · Your Personal AI Companion.`]};
  const scope = AREA_SCOPE[area];
  if (nova && scope && !scopeOpen(nova.scopes, scope, nova.chainChosen)) return {page: false, health: false, reasons: [`${AREA_LABELS[area]} is closed to NOVA in NOVA → Permissions: nothing from it goes with this task.`]};
  const novaHealth = !nova || nova.scopes.health === true;
  const health = gates.health === true && novaHealth;
  return {page, health, reasons: health ? [] : [novaHealth ? 'Health: not shared (Settings → ZIGi · Your Personal AI Companion → Include Health).' : 'Health is closed to NOVA in NOVA → Permissions: nothing from Health goes with this task.']};
}
export function pagePack({area, sources, gates, nova}: {area: PageArea; sources: ToolSources | null; gates: Gates; nova?: NovaPermission}): PageContext | null {
  if (!sources || gates.paused) return null;
  const consent = packConsent(gates, area, nova);
  const week = area === 'today' && sources.weekly ? (() => { const w = reviewWindow(sources.weekly!.weekday, sources.habitDay); return {weekStart: w.weekStart, weekEnd: w.weekEnd, review: sources.weekly!}; })() : null;
  return buildPageContext({area, pathname: ZIGI_PAGE_PATHS[area], consent, now: sources.now, habitDay: sources.habitDay, healthDay: sources.healthDay,
    habits: sources.habits, health: sources.health, fasting: sources.fasting, platform: sources.platform, localGoals: sources.localGoals, metadata: sources.metadata, quotes: sources.quotes,
    // A coin's price is attached only on the Portfolio page itself (as there); the page tasks name Wealth's overview.
    portfolio: null, week});
}
/**
 * Z1A-4: what ZIGi's lookups may read for a task NOVA handed it: ZIGi's provider gates narrowed by NOVA's scopes (lane NE's
 * `novaToolEnv`: Health only with its scope and gate, notes and the journal only with theirs), read at the moment of the send.
 */
export function taskToolEnv({sources, gates, nova, handles}: {sources: ToolSources | null; gates: Gates; nova: NovaPermission; handles?: Handles}): ToolEnv | null {
  if (!sources || gates.paused) return null;
  return novaToolEnv(sources, gates, nova.scopes, nova.chainChosen, handles);
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
  const hermesUnconfirmed = !!hermes && isHermesBase(target.baseUrl, hermes.data) && (hermes.unreadable || !localModelStillConfirmed(hermes.data));
  const knownCloud = target.provider === 'local' && !!mode && mode !== 'relaxed' && (() => { try { return isKnownCloudModel(readDeviceRecord(storage, NOVA_SETUP).data, target.model); } catch { return false; } })(); // Z1A-7
  const applies = sendDecision(mode, {provider: target.provider, model: target.model, hermesUnconfirmed, knownCloud}) === 'redact' ? 'guarded' as const : null;
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
