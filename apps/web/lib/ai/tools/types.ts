import {z} from 'zod';
import type {PageArea} from '../settings';
import type {ToolEnv} from './env';

/**
 * ZIGi's read-only data tools (Session V Part 2, ADR-014): typed functions over the person's own device records. One
 * definition serves every path: local answers, the question's sources, the context pack, native tool calling, WebMCP,
 * the on-device model and the hosted relay. The parameters are plain JSON Schema (type, properties, required, enum,
 * description) so every provider and browser agent reads the same thing; Zod checks the arguments again before a tool
 * runs. A tool never writes, never fetches, never sees an identifier (records are named by the reply's handles), and a
 * Health tool runs only when the Health gate is open: otherwise its environment holds no Health at all.
 */
export type JsonSchemaProperty = {type: 'string' | 'number' | 'integer' | 'boolean'; description: string; enum?: readonly string[]};
export type JsonSchema = {type: 'object'; properties: Record<string, JsonSchemaProperty>; required?: readonly string[]};
export type ToolChoice = {label: string; handle: string};
export type ToolOk = {ok: true; tool: string; label: string; provenance: string; data: Record<string, unknown>; truncated: {shown: number; total: number} | null};
export type ToolRefusal = {ok: false; tool: string; label: string; refusal: string; reason: 'gate' | 'area' | 'arguments' | 'not-found' | 'ambiguous' | 'range' | 'unknown-tool'; choices?: ToolChoice[]};
export type ToolResult = ToolOk | ToolRefusal;
/** Which switch decides whether a tool may run: an area of the app, Health's own gate, or the person's notes. */
export type ToolArea = Exclude<PageArea, 'help'> | 'memory';
export type ToolDefinition<A = Record<string, unknown>> = {
  name: string;
  /** A short human title for chips ("Habit stats"). */
  title: string;
  description: string;
  area: ToolArea;
  parameters: JsonSchema;
  args: z.ZodType<A>;
  /** The chip label for a call ("Meditate · this month"). */
  label(args: A, env: ToolEnv): string;
  /** Runs over the reply's environment; `label` is this call's chip label (the registry computes it once). */
  run(args: A, env: ToolEnv, label: string): ToolResult;
};
/** Any tool, for lists and the registry (the registry checks the arguments with the tool's own schema first). */
export type AnyTool = ToolDefinition<unknown>;
export const ROWS_DEFAULT = 31, ROWS_MAX = 62, CHARS_DEFAULT = 4000;
/** All the data one answer may carry from tools, whatever the number of calls (Part 6 enforces it in the tool loop). */
export const ANSWER_CHARS = 16_000;
/** The arguments of a tool that takes none (extra keys a model adds are ignored). */
export const NO_ARGS = z.object({}) as unknown as z.ZodType<Record<string, never>>;
