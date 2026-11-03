import type {Gates} from '../gates';
import {Handles, type Handle} from '../handles';
import {toolEnv, type ToolEnv, type ToolSources} from '../tools/env';
import {runTool, toolText} from '../tools/registry';
import type {ToolCallRecord} from './engine';

/**
 * "Ask my AI for more" (Session V Part 3): the records a local answer used, recomputed now for the person's AI under the
 * gate that applies to anything leaving the device (the area switches, the Health gate, sensitive screens), with the
 * reply's handles continuing the page context's. A Health tool refuses here when the gate is closed, whatever it said
 * when the answer was made on the device.
 */
export const RECORDS_HEADING = '## Records for this question (from ZIGi\'s tools on this device)';
export function recordsForAi(calls: readonly ToolCallRecord[], sources: ToolSources, gates: Gates, pageHandles: readonly Handle[] = []): {text: string; handles: Handle[]} | null {
  if (!calls.length) return null;
  const handles = new Handles(pageHandles);
  return recordsIn(calls, toolEnv(sources, gates, 'provider', handles), handles);
}
/**
 * Release review 2 (lane RA): the same records from an environment the caller built with `handles` (NOVA's: ZIGi's gates
 * for what leaves the device, narrowed by NOVA → Permissions; components/ai/use-chat-session.ts `NovaSurface.moreEnv`).
 */
export function recordsIn(calls: readonly ToolCallRecord[], env: ToolEnv, handles: Handles): {text: string; handles: Handle[]} | null {
  if (!calls.length) return null;
  // Part 8: the person's notes go first, as with every message, while "Use my notes" is on (same gates).
  const all = env.notes?.length ? [{tool: 'about_me', args: {}}, ...calls] : calls;
  return {text: `${RECORDS_HEADING}\n${all.map(c => toolText(runTool(c.tool, c.args, env), env)).join('\n')}`, handles: [...handles.list]};
}
