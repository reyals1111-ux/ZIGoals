import type {Gates} from '../ai/gates';
import {novaToolEnv, type NovaScopes} from '../ai/context-pack/nova';
import {markNovaEnv} from '../ai/local-answers/nova-env';
import type {ToolEnv, ToolSources} from '../ai/tools/env';
import {readNovaToolSources} from '../ai/tools/nova-sources';
import {getAppStorage} from '../showcase-storage';

/**
 * Release review 2 (R2-2): what NOVA's on-device answers may read. ZIGi's local gates (every area open on this device except
 * Health, which keeps its three-part gate; nothing on a private screen) narrowed by NOVA → Permissions exactly as NOVA's
 * pack and NOVA's tasks for ZIGi are (lane NE's `novaToolEnv`, the same narrowing), and marked as NOVA's, so the local
 * answers speak NOVA's words and point to NOVA → Permissions. Nothing leaves the device on this path.
 */
export function novaLocalEnv({sources, gates, scopes, chainChosen}: {sources: ToolSources | null; gates: Gates; scopes: NovaScopes; chainChosen: boolean}): ToolEnv | null {
  if (!sources) return null;
  // Session AS (found by tests/nova-families-as.spec.ts): the app's shared context reads the tool sources without the notes
  // (components/ai/use-ai-context.ts: ZIGi has no Notes permission), so NOVA refused every notes question even with its
  // own Notes permission on. With that permission on and the screen not private, NOVA's on-device answers read the notes
  // from this device's storage, as NOVA's pack for a model already does (lib/nova/bridge-pack.ts).
  if (scopes.notes && !gates.paused && sources.nova && !('notes' in sources.nova)) {
    try { sources = {...sources, nova: {...sources.nova, notes: readNovaToolSources(getAppStorage(), {notes: true}).notes}}; } catch { /* the notes stay unread */ }
  }
  // The local view of the gates through the same narrowing: on this device every area answers, Health only with its gate.
  const local: Gates = {...gates, areas: gates.local, health: gates.localHealth, notes: !gates.paused};
  // Session AS (ADR-042): this environment's results are shown on the device only, whatever the narrowing built it as.
  const env = novaToolEnv(sources, local, scopes, chainChosen);
  env.purpose = 'local';
  return markNovaEnv(env, {healthScope: scopes.health, healthGate: gates.localHealth, todayScope: scopes.today, ...(!gates.localHealth && gates.healthBlock ? {healthBlock: gates.healthBlock} : {})});
}
