/**
 * Session AV (follow-up 2, 1b; zigi-voice-z:199): the page's WebMCP model context on its own, without the tools. Settings'
 * ZIGi body asks only whether the browser offers it; importing lib/ai/webmcp.ts for that pulled the whole tools registry
 * and action planner into Settings' ZIGi chunk. lib/ai/webmcp.ts re-exports these unchanged.
 */
export type WebMcpAnnotations = {readOnlyHint?: boolean; untrustedContentHint?: boolean; consequentialHint?: boolean};
export type WebMcpTool = {name: string; title: string; description: string; inputSchema: object; annotations: WebMcpAnnotations; execute: (input: unknown, options?: {signal?: AbortSignal}) => Promise<string>};
export type ModelContext = {registerTool: (tool: WebMcpTool, options?: {signal?: AbortSignal}) => unknown; unregisterTool?: (name: string) => unknown};
/** `zigoals_` and an underscore, not a dot: the draft allows dots, but several providers' function names do not. */
export const TOOL_PREFIX = 'zigoals_';
export const PROPOSE_TOOL = `${TOOL_PREFIX}propose_changes`;
export const PAUSED = 'ZIGoals paused its tools on this screen; nothing was read.';
export const TAKEN_AWAY = 'This ZIGoals tool was taken away (the page changed or the person turned browser agents off); nothing was read.';
/** The page's model context: the draft's `document.modelContext`, else an older `navigator.modelContext` that registers tools. */
export function modelContext(doc: unknown = typeof document === 'undefined' ? null : document, nav: unknown = typeof navigator === 'undefined' ? null : navigator): ModelContext | null {
  for (const host of [doc, nav]) {
    const found = (host as {modelContext?: Partial<ModelContext>} | null)?.modelContext;
    if (found && typeof found.registerTool === 'function') return found as ModelContext;
  }
  return null;
}
