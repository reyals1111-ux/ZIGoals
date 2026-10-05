import type {Gates} from '../gates';
import {Handles, type Handle} from '../handles';
import {toolEnv, type ToolSources} from '../tools/env';
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
  const handles = new Handles(pageHandles), env = toolEnv(sources, gates, 'provider', handles);
  return {text: `${RECORDS_HEADING}\n${calls.map(c => toolText(runTool(c.tool, c.args, env), env)).join('\n')}`, handles: [...handles.list]};
}
