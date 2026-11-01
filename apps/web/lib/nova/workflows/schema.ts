import * as z from 'zod';
import type {DeviceRecordSpec} from '../../device-record';
import {PROVIDER_IDS, type ProviderId} from '../../ai/providers';
import {looksSecret} from '../../ai/memory';
import {WORKFLOW_IDS, templateOf, type WorkflowId, type WorkflowTemplate} from './templates';

/**
 * NOVA's own workflows and its model per task (Session AK, owner follow-up 2 N6, N2), a new device key
 * `zigoals:nova-workflows:v1` (TIER 3 (stored format): loose, versioned, every field optional, bounded): the person's saved
 * workflows (a template, their title and instruction, the steps they left out; at most 30), when each workflow last ran
 * (at most 40; for the setup guide's check), and which model of their connected provider writes the briefs and the
 * workflows' words. Device-only, never synced; in Export everything (the lead wires export, restore, erase, catalog).
 * Nothing here is a record of the person's life: no habit, goal, amount or journal word is ever kept in it.
 */
export const NOVA_WORKFLOWS_KEY = 'zigoals:nova-workflows:v1';
export const MAX_CUSTOM = 30, MAX_TITLE = 80, MAX_INSTRUCTION = 1000, MAX_RUNS = 40;
const stamp = z.iso.datetime();
const modelId = z.string().min(1).max(200);
export const customWorkflowSchema = z.looseObject({
  id: z.string().regex(/^wf_[a-z0-9-]{1,40}$/),
  from: z.enum(WORKFLOW_IDS),
  title: z.string().trim().min(1).max(MAX_TITLE),
  instruction: z.string().trim().max(MAX_INSTRUCTION),
  skip: z.array(z.string().min(1).max(40)).max(10).default([]),
  createdAt: stamp,
  updatedAt: stamp,
});
export type CustomWorkflow = z.infer<typeof customWorkflowSchema>;
export const novaWorkflowsSchema = z.looseObject({
  version: z.literal(1),
  custom: z.array(customWorkflowSchema).max(MAX_CUSTOM).optional().catch(undefined),
  runs: z.record(z.string().min(1).max(60), stamp).refine(r => Object.keys(r).length <= MAX_RUNS).optional().catch(undefined),
  /** The model per task on the connected provider; another provider's choice is ignored (the chat's model is ZIGi's own). */
  taskModels: z.looseObject({provider: z.enum(PROVIDER_IDS), briefs: modelId.optional(), workflows: modelId.optional()}).optional().catch(undefined),
});
export type NovaWorkflows = z.infer<typeof novaWorkflowsSchema>;
export const emptyNovaWorkflows = (): NovaWorkflows => ({version: 1});
export const NOVA_WORKFLOWS: DeviceRecordSpec<NovaWorkflows> = {key: NOVA_WORKFLOWS_KEY, schema: novaWorkflowsSchema, empty: emptyNovaWorkflows};

/** A runnable workflow: a template, or the person's own made from one (their title and instruction, their steps). */
export type WorkflowDef = WorkflowTemplate & {customId?: string};
export function resolveWorkflow(custom: CustomWorkflow): WorkflowDef {
  const base = templateOf(custom.from), skip = new Set(custom.skip);
  const steps = base.steps.filter(s => !skip.has(s.id));
  return {...base, title: custom.title, instruction: custom.instruction || base.instruction, steps: steps.some(s => s.kind === 'read') ? steps : base.steps, customId: custom.id};
}
export type WorkflowEdit = {title: string; instruction: string; skip: readonly string[]};
/** Why an edit cannot be saved (empty title, every reading step left out, a secret), or null. */
export function editProblem(from: WorkflowId, edit: WorkflowEdit): string | null {
  if (!edit.title.trim()) return 'Give the workflow a name.';
  if (edit.title.trim().length > MAX_TITLE) return `A name is at most ${MAX_TITLE} characters.`;
  if (edit.instruction.trim().length > MAX_INSTRUCTION) return `The instruction is at most ${MAX_INSTRUCTION} characters.`;
  if (looksSecret(edit.title) || looksSecret(edit.instruction)) return 'This looks like a key or a password. Workflows never keep those.';
  if (!templateOf(from).steps.some(s => s.kind === 'read' && !edit.skip.includes(s.id))) return 'Keep at least one step that reads your records.';
  return null;
}
const slug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'workflow';
export function saveCustom(record: NovaWorkflows, from: WorkflowId, edit: WorkflowEdit, now: Date, id?: string): NovaWorkflows {
  const problem = editProblem(from, edit); if (problem) throw Error(problem);
  const custom = record.custom ?? [], at = now.toISOString(), was = id ? custom.find(c => c.id === id) : undefined;
  if (!was && custom.length >= MAX_CUSTOM) throw Error(`You have ${MAX_CUSTOM} workflows of your own, the most kept. Delete one first.`);
  const skip = [...new Set(edit.skip)].filter(s => templateOf(from).steps.some(t => t.id === s)).slice(0, 10);
  const next: CustomWorkflow = {id: was?.id ?? `wf_${slug(edit.title)}-${now.getTime().toString(36)}`.slice(0, 43), from, title: edit.title.trim(), instruction: edit.instruction.trim(), skip, createdAt: was?.createdAt ?? at, updatedAt: at};
  return novaWorkflowsSchema.parse({...record, custom: was ? custom.map(c => c.id === was.id ? next : c) : [...custom, next]});
}
export const deleteCustom = (record: NovaWorkflows, id: string): NovaWorkflows => novaWorkflowsSchema.parse({...record, custom: (record.custom ?? []).filter(c => c.id !== id)});
export const restoreCustom = (record: NovaWorkflows, custom: CustomWorkflow): NovaWorkflows => (record.custom ?? []).some(c => c.id === custom.id) ? record : novaWorkflowsSchema.parse({...record, custom: [...(record.custom ?? []), custom]});
/** Notes when a workflow ran (template id or custom id); the oldest go after 40. */
export function noteRun(record: NovaWorkflows, id: string, now: Date): NovaWorkflows {
  const runs = {...(record.runs ?? {}), [id]: now.toISOString()};
  return novaWorkflowsSchema.parse({...record, runs: Object.fromEntries(Object.entries(runs).sort((a, b) => b[1].localeCompare(a[1])).slice(0, MAX_RUNS))});
}
/** The setup guide's step 9 (lane NC): "Review my week" has run, and one workflow of the person's own is saved. */
export const setupChecks = (record: NovaWorkflows) => ({ranReview: !!record.runs?.['review-week'], savedOwn: (record.custom?.length ?? 0) > 0});
export function taskModel(record: NovaWorkflows, provider: ProviderId | null, task: 'briefs' | 'workflows'): string | null {
  return provider && record.taskModels?.provider === provider ? record.taskModels[task] ?? null : null;
}
export function setTaskModel(record: NovaWorkflows, provider: ProviderId, task: 'briefs' | 'workflows', model: string | null): NovaWorkflows {
  const was = record.taskModels?.provider === provider ? record.taskModels : {provider};
  const next: Record<string, unknown> = {...was, provider}; if (model) next[task] = model; else delete next[task];
  return novaWorkflowsSchema.parse({...record, taskModels: next});
}

/**
 * The workflows as shared in "Share my NOVA setup" (lane NA) and in "Export my workflows": a whitelist — the template,
 * the title, the instruction and the steps left out. Words that may be personal (an email address, a link, a run of
 * digits, something shaped like a key) are never shared: that title or instruction falls back to the template's own.
 * No record of the person's life is in a workflow, and none is added here.
 */
export type SharedWorkflow = {from: WorkflowId; title: string; instruction: string; skip: string[]};
const PERSONAL = /@|https?:\/\/|www\.|\d{3,}/i;
export const mayShare = (text: string) => !PERSONAL.test(text) && !looksSecret(text);
export function shareWorkflows(record: NovaWorkflows): {workflows: SharedWorkflow[]; heldBack: number} {
  let heldBack = 0;
  const workflows = (record.custom ?? []).map(c => {
    const base = templateOf(c.from), title = mayShare(c.title) ? c.title : (heldBack++, base.title), instruction = mayShare(c.instruction) ? c.instruction : (heldBack++, base.instruction);
    return {from: c.from, title, instruction, skip: [...c.skip]};
  });
  return {workflows, heldBack};
}
export const WORKFLOWS_FILE_FORMAT = 'zigoals-nova-workflows';
export function workflowsFile(record: NovaWorkflows, now: Date): string {
  return JSON.stringify({format: WORKFLOWS_FILE_FORMAT, version: 1, exportedAt: now.toISOString(), workflows: shareWorkflows(record).workflows}, null, 2);
}
const sharedSchema = z.strictObject({from: z.enum(WORKFLOW_IDS), title: z.string().trim().min(1).max(MAX_TITLE), instruction: z.string().trim().max(MAX_INSTRUCTION), skip: z.array(z.string().min(1).max(40)).max(10).default([])});
/** Adds shared workflows (from a file or a setup) as the person's own; invalid ones are left out and counted. */
export function importWorkflows(record: NovaWorkflows, input: unknown, now: Date): {record: NovaWorkflows; added: number; refused: number} {
  const list = Array.isArray(input) ? input : typeof input === 'object' && input && Array.isArray((input as {workflows?: unknown}).workflows) ? (input as {workflows: unknown[]}).workflows : null;
  if (!list) return {record, added: 0, refused: 1};
  let next = record, added = 0, refused = 0;
  for (const [i, raw] of list.slice(0, MAX_CUSTOM).entries()) {
    const parsed = sharedSchema.safeParse(raw);
    if (!parsed.success || !mayShare(parsed.data.title)) { refused++; continue; }
    try { next = saveCustom(next, parsed.data.from, parsed.data, new Date(now.getTime() + i)); added++; } catch { refused++; }
  }
  return {record: next, added, refused};
}
/**
 * The same whitelist in the shape of "Share my NOVA setup" (lib/nova/share-setup.ts, lane NA: `{title, steps}` with step
 * ids only): the first step id is the template's id, then the steps kept. No instruction text travels in a setup.
 */
export function workflowsForSetupShare(record: NovaWorkflows): {title: string; steps: string[]}[] {
  return shareWorkflows(record).workflows.map(w => ({title: w.title, steps: [w.from, ...templateOf(w.from).steps.filter(s => !w.skip.includes(s.id)).map(s => s.id)]}));
}
/** Reads workflows back from a shared setup's `{title, steps}` list: a known template id first, its steps after. */
export function importSetupWorkflows(record: NovaWorkflows, list: readonly {title: string; steps: readonly string[]}[], now: Date): {record: NovaWorkflows; added: number; refused: number} {
  const shared = list.map(w => {
    const from = w.steps[0] as WorkflowId, base = (WORKFLOW_IDS as readonly string[]).includes(from) ? templateOf(from) : null;
    return base ? {from, title: w.title, instruction: base.instruction, skip: base.steps.filter(s => !w.steps.slice(1).includes(s.id)).map(s => s.id)} : {from: 'unknown', title: w.title, instruction: '', skip: []};
  });
  return importWorkflows(record, shared, now);
}
