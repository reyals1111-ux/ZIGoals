import {parseLoopback} from './loopback';
import {toolAsks, type AgentServer} from './record';
import {plainLine} from './plain';
import {schemaSummary, type ListedTool} from './schema';

/**
 * Session AM-2 (step 4c): which tools of the person's own can be offered at all — the ones a server listed in this visit
 * AND that the person switched to "Ask every time". Small and free of the guard and the redaction module, so the two
 * lookups in ZIGi's tool registry (lib/ai/tools/nova-agent.ts) can read it without carrying those into every page.
 * The rules that turn an offered tool into a confirm card are in ./propose.ts.
 */
export const USE_TOOL = 'use_tool', MY_TOOLS = 'my_tools';
/** A server as the panel holds it for the visit: its stored row and the tools it listed just now. */
export type LiveServer = {server: AgentServer; tools: readonly ListedTool[]};
/** A tool a model may be told about: listed in this visit and on "Ask every time". */
export type OfferedTool = {serverId: string; label: string; origin: string; tool: ListedTool};
export function offeredTools(live: readonly LiveServer[]): OfferedTool[] {
  return live.flatMap(({server, tools}) => {
    const at = parseLoopback(server.address);
    return at.ok ? tools.filter(t => toolAsks(server, t.name)).map(tool => ({serverId: server.id, label: plainLine(server.label, 40) || at.origin, origin: at.origin, tool})) : [];
  });
}
/**
 * What a model is told about the offered tools (lib/ai/tools/nova-agent.ts `my_tools`): names and plain words. The
 * description AND the input (its field names and listed choices come from the server's schema) are marked as the
 * server's own words (security review, finding 3).
 */
export function toolsForModel(offered: readonly OfferedTool[], max = 30): {server: string; on: string; tool: string; described_by_server: string; input_described_by_server: string}[] {
  return offered.slice(0, max).map(o => ({server: o.serverId, on: `${o.label} (${o.origin})`, tool: o.tool.name, described_by_server: o.tool.description, input_described_by_server: schemaSummary(o.tool.schema)}));
}
