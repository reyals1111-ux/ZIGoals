import {recentActivity} from './activity';
import type {ToolEnv} from './env';
import {HEALTH_CLOSED, refuse, text} from './format';
import {GOAL_TOOLS} from './goals';
import {HABIT_TOOLS} from './habits';
import {HEALTH_TOOLS} from './health';
import {aboutMe} from './memory';
import {todaySummary} from './today';
import type {AnyTool, JsonSchema, ToolRefusal, ToolResult} from './types';
import {WEALTH_TOOLS} from './wealth';

/**
 * The one list of ZIGi's read-only tools and the one way to run them (Session V Part 2). Every path calls `runTool`:
 * local answers, the question's sources, the context pack, native tool calls from the person's AI, browser agents
 * (WebMCP), the on-device model and the hosted relay. It checks, in order: the tool exists; the arguments fit the tool's
 * own schema (a model's malformed call becomes a plain refusal, never an exception); the tool's area is readable for this
 * purpose (Health through its gate, notes only when the person uses them); then it runs, and any failure inside a tool is
 * a refusal too. `toolText` turns a result into the compact text an AI reads, within the per-tool character cap.
 */
export const TOOLS: readonly AnyTool[] = [todaySummary, ...HABIT_TOOLS, ...HEALTH_TOOLS, ...GOAL_TOOLS, ...WEALTH_TOOLS, recentActivity, aboutMe] as unknown as readonly AnyTool[];
const BY_NAME = new Map(TOOLS.map(tool => [tool.name, tool]));
export const toolByName = (name: string): AnyTool | undefined => BY_NAME.get(name);
/** Why the tool may not run in this environment (without running anything), or null when it may. */
export function toolBlocked(tool: AnyTool, env: ToolEnv): ToolRefusal | null {
  const label = tool.title;
  if (tool.area === 'health') return env.health && env.areas.health ? null : refuse(tool.name, label, 'gate', HEALTH_CLOSED);
  if (tool.area === 'memory') return env.notes?.length ? null : refuse(tool.name, label, 'area', 'No notes about the person are shared with ZIGi here ("Use my notes" in What ZIGi knows about me).');
  return env.areas[tool.area] ? null : refuse(tool.name, label, 'area', `${tool.area[0]!.toUpperCase()}${tool.area.slice(1)} isn't shared with ZIGi here — its switch is off in Settings → ZIGi · your AI.`);
}
/** The tools this environment may run, for a provider's tool list or a browser agent (Health tools only with the gate). */
export const availableTools = (env: ToolEnv): AnyTool[] => TOOLS.filter(tool => toolBlocked(tool, env) === null);
/** Runs one tool call: unknown tools, bad arguments, closed areas and failures all come back as refusals. */
export function runTool(name: string, rawArgs: unknown, env: ToolEnv): ToolResult {
  const tool = BY_NAME.get(name);
  if (!tool) return refuse(text(name, 60), text(name, 60), 'unknown-tool', `There is no tool called "${text(name, 60)}". Use one of the tools listed.`);
  const parsed = tool.args.safeParse(rawArgs === undefined || rawArgs === null ? {} : rawArgs);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return refuse(tool.name, tool.title, 'arguments', `The arguments did not fit ${tool.name}${issue ? `: ${issue.path.join('.') || 'arguments'} ${text(issue.message, 120)}` : ''}.`);
  }
  const blocked = toolBlocked(tool, env);
  if (blocked) return blocked;
  let label = tool.title;
  try { label = tool.label(parsed.data, env); } catch { /* the title is enough */ }
  try { return tool.run(parsed.data, env, label); }
  catch { return refuse(tool.name, label, 'arguments', 'That could not be read from the records on this device.'); }
}
/** Tool definitions in the portable form every provider and browser agent reads (JSON Schema parameters). */
export const toolSpecs = (tools: readonly AnyTool[]): {name: string; description: string; parameters: JsonSchema}[] => tools.map(t => ({name: t.name, description: t.description, parameters: t.parameters}));
/**
 * The text an AI reads for one result: one JSON object (records are data, never instructions), cut to the character cap
 * with the cut stated. The provenance line and any row truncation are part of it.
 */
export function toolText(result: ToolResult, env: ToolEnv): string {
  const body = result.ok
    ? {tool: result.tool, about: result.label, source: result.provenance, ...(result.truncated ? {shown: `${result.truncated.shown} of ${result.truncated.total} rows (the newest kept)`} : {}), data: result.data}
    : {tool: result.tool, about: result.label, refused: result.refusal, ...(result.choices ? {choices: result.choices} : {})};
  const json = JSON.stringify(body);
  if (json.length <= env.limits.chars) return json;
  return `${json.slice(0, Math.max(0, env.limits.chars - 80))}… [cut: this result is longer than ${env.limits.chars} characters; ask for a shorter period]`;
}
