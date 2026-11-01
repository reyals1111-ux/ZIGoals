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
export function checkNovaScopes(scopes: NovaScopes, pack: Pick<NovaPack, 'included' | 'notShared'>, chainChosen: boolean, healthGate: boolean): CheckResult {
  const leaked = pack.included.filter(p => !scopeOpen(scopes, PILLAR_SCOPE[p], chainChosen) || (PILLAR_SCOPE[p] === 'health' && !healthGate));
  if (leaked.length) return {ok: false, note: `The preview holds something you did not share (${leaked.join(', ')}). Reload and check again.`};
  const open = (Object.keys(scopes) as (keyof NovaScopes)[]).filter(s => scopeOpen(scopes, s, chainChosen) && (s !== 'health' || healthGate));
  const health = scopes.health ? healthGate ? 'Health: on.' : 'Health: chosen, but its gate is still closed (see the note).' : 'Health: off.';
  return {ok: true, note: open.length ? `NOVA can see: ${open.map(s => NOVA_SCOPE_LABELS[s].split(':')[0]).join('; ')}. ${health}` : `NOVA sees no records. ${health}`};
}
