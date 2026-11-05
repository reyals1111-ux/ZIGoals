import {DEFAULT_NOVA_SCOPES, NOVA_SCOPE_LABELS, PILLAR_SCOPE, scopeOpen, type NovaPack, type NovaPrivacyMode, type NovaScopes} from '../ai/context-pack/nova';
import {sendDecision} from '../ai/privacy-mode';
import type {ProviderId} from '../ai/providers';
import type {AiSettings} from '../ai/settings';
import type {CheckResult} from './setup-checks';
import type {PrivacyMode} from './setup';

/**
 * Session AK, owner follow-up 2 (N3 step 5, N4; lane NC): NOVA's scopes (lane NE's `NovaScopes`) as the person set them,
 * read from the same records NOVA → Permissions (lane ND) edits: ZIGi's per-area switches in `zigoals:ai:v1` (Today,
 * Goals, Habits, Wealth; Health only with "Include Health", and its three-part gate still applies inside the pack) and the
 * journal's own sharing switch. Notes and Earn keep NE's defaults (Notes off; Earn only once the chain is chosen).
 */
export function novaScopesFrom(settings: Pick<AiSettings, 'pageShare' | 'includeHealth'>, journalShared: boolean): NovaScopes {
  const share = settings.pageShare;
  return {...DEFAULT_NOVA_SCOPES, today: share.today, goals: share.goals, habits: share.habits, wealth: share.wealth, health: share.health && settings.includeHealth, journal: journalShared};
}
/**
 * The mode as it applies to this send's target, for the pack's own redaction: 'guarded' exactly when the engine's hook
 * (lib/ai/privacy-mode.ts `guardRequest`) would send the redacted copy, so "What NOVA can see" shows the very text that goes.
 */
export function packPrivacyMode(mode: PrivacyMode | null, target: {provider: ProviderId | null | undefined; hosted?: boolean; model?: string | null; hermesUnconfirmed?: boolean}): NovaPrivacyMode {
  return sendDecision(mode, target) === 'redact' ? 'guarded' : null;
}
/** Planet 5's check: every pillar in the pack belongs to an open scope, and no open scope's records were left out unread. */
/**
 * Session AL fourth pass (lane L7-4b; Lisbon LA-003, Denver DV-062, Moscow MO-058, X3-11, X3-23): with no model connected
 * nothing is sent, so the preview (the send's own input, security review Z1A-10) is empty; the check says that, and what
 * NOVA will read once a model is connected, instead of blaming page switches that are on.
 */
export function checkNovaScopes(scopes: NovaScopes, pack: Pick<NovaPack, 'included' | 'notShared'>, chainChosen: boolean, healthGate: boolean, connected = true): CheckResult {
  const leaked = pack.included.filter(p => !scopeOpen(scopes, PILLAR_SCOPE[p], chainChosen) || (PILLAR_SCOPE[p] === 'health' && !healthGate));
  if (!connected && !pack.included.length) {
    const will = (Object.keys(scopes) as (keyof NovaScopes)[]).filter(s => scopeOpen(scopes, s, chainChosen) && (s !== 'health' || healthGate)).map(s => NOVA_SCOPE_LABELS[s].split(':')[0]);
    return {ok: true, note: `No model is connected yet, so nothing is sent and the preview is empty. Once one is, NOVA reads ${will.length ? will.join('; ') : 'nothing (every area is off)'}. Health: ${scopes.health && healthGate ? 'on' : 'off'}.`};
  }
  if (leaked.length) return {ok: false, note: `The preview holds something you did not share (${leaked.join(', ')}). Reload and check again.`};
  const open = (Object.keys(scopes) as (keyof NovaScopes)[]).filter(s => scopeOpen(scopes, s, chainChosen) && (s !== 'health' || healthGate));
  // Session AL (lane L7; Lisbon LA-003, Denver DV-062, Moscow MO-058; P-LA-05, P-DV-91, P-MO-14): the check and the preview
  // read one state. A scope that is on while the preview reads nothing of it (its page switch in Settings → ZIGi is off) is
  // a disagreement and fails, saying which switch; "NOVA can see" names only what the preview really carries.
  const unread = open.filter(s => s !== 'health' && pack.notShared.some(p => PILLAR_SCOPE[p] === s) && !pack.included.some(p => PILLAR_SCOPE[p] === s));
  if (unread.length) return {ok: false, note: `NOVA → Permissions lets NOVA see ${unread.map(s => NOVA_SCOPE_LABELS[s].split(':')[0]).join('; ')}, but the preview reads nothing of it: its page switch under Settings → ZIGi · Your Personal AI Companion → What each page may share is off. Turn both on (or both off), then check again.`};
  const health = scopes.health ? healthGate ? 'Health: on.' : 'Health: chosen, but its gate is still closed (see the note).' : 'Health: off.';
  const seen = open.filter(s => pack.included.some(p => PILLAR_SCOPE[p] === s)), quiet = open.filter(s => !seen.includes(s));
  const none = quiet.length ? ` Nothing recorded yet in: ${quiet.map(s => NOVA_SCOPE_LABELS[s].split(':')[0]).join('; ')}.` : '';
  return {ok: true, note: seen.length ? `NOVA can see: ${seen.map(s => NOVA_SCOPE_LABELS[s].split(':')[0]).join('; ')}.${none} ${health}` : open.length ? `NOVA may read ${open.map(s => NOVA_SCOPE_LABELS[s].split(':')[0]).join('; ')}, but nothing there holds records yet. ${health}` : `NOVA sees no records. ${health}`};
}

