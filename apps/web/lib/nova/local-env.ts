import type {Gates} from '../ai/gates';
import {novaToolEnv, type NovaScopes} from '../ai/context-pack/nova';
import {markNovaEnv} from '../ai/local-answers/nova-env';
import type {ToolEnv, ToolSources} from '../ai/tools/env';

/**
 * Release review 2 (R2-2): what NOVA's on-device answers may read. ZIGi's local gates (every area open on this device except
 * Health, which keeps its three-part gate; nothing on a private screen) narrowed by NOVA → Permissions exactly as NOVA's
 * pack and NOVA's tasks for ZIGi are (lane NE's `novaToolEnv`, the same narrowing), and marked as NOVA's, so the local
 * answers speak NOVA's words and point to NOVA → Permissions. Nothing leaves the device on this path.
 */
export function novaLocalEnv({sources, gates, scopes, chainChosen}: {sources: ToolSources | null; gates: Gates; scopes: NovaScopes; chainChosen: boolean}): ToolEnv | null {
  if (!sources) return null;
  // The local view of the gates through the same narrowing: on this device every area answers, Health only with its gate.
  const local: Gates = {...gates, areas: gates.local, health: gates.localHealth, notes: !gates.paused};
  return markNovaEnv(novaToolEnv(sources, local, scopes, chainChosen), {healthScope: scopes.health, healthGate: gates.localHealth, todayScope: scopes.today});
}
