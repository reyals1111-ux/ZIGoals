import * as z from 'zod';
import {ACCENT_LABEL, MAX_PERSONA_NAME, NOVA_ACCENTS, NOVA_LAYOUTS, PERSONA_AVATARS, WIDGET_SIZES, accentOf, itemId, layoutOf, novaRecordSchema, personaOf, widgetsFor, type NovaAccent, type NovaLayout, type NovaRecord} from './store';
import {DOCK, dockSpec} from './dock';
import {isWidgetId, widgetSpec} from './widgets/catalog';

/**
 * Session AK (owner follow-up 2, N2 "Make it yours"; lane NA): "Share my NOVA setup" and "Import a setup".
 *
 * The shared file says how a NOVA is ARRANGED and nothing about the person: the layout, the accent, the widgets and their
 * sizes in order, the dock's order and hidden entries, the persona (NOVA's own name and avatar) and saved workflows as a
 * title and the ids of their on-device steps. It is built field by field from a whitelist, never by copying a record:
 * custom instructions, records, amounts, names of goals or habits, chats, memory, keys, dates and device facts cannot
 * enter it (share-setup.test.ts proves it). The import is strict: the exact shape, bounded, at most 16 KB; ids this build
 * does not know are left out and counted; the person sees a preview before anything changes, and can undo it.
 */
export const SETUP_KIND = 'zigoals-nova-setup';
export const MAX_SETUP_BYTES = 16 * 1024, MAX_SHARED_WORKFLOWS = 12, MAX_WORKFLOW_STEPS = 12, MAX_WORKFLOW_TITLE = 60;
export const LAYOUT_LABEL: Record<NovaLayout, string> = {orbit: 'Orbit', bento: 'Bento', focus: 'Focus', minimal: 'Minimal'};
const noControl = (s: string) => !/[\u0000-\u001f\u007f]/.test(s);
const sharedWorkflow = z.strictObject({
  title: z.string().trim().min(1).max(MAX_WORKFLOW_TITLE).refine(noControl),
  steps: z.array(itemId).min(1).max(MAX_WORKFLOW_STEPS),
});
export type SharedWorkflow = z.infer<typeof sharedWorkflow>;
export const setupShareSchema = z.strictObject({
  kind: z.literal(SETUP_KIND),
  version: z.literal(1),
  layout: z.enum(NOVA_LAYOUTS),
  accent: z.enum(NOVA_ACCENTS),
  widgets: z.array(z.strictObject({id: itemId, size: z.enum(WIDGET_SIZES)})).max(24),
  dock: z.strictObject({order: z.array(itemId).max(32), hidden: z.array(itemId).max(32)}),
  persona: z.strictObject({name: z.string().trim().min(1).max(MAX_PERSONA_NAME).refine(noControl), avatar: z.enum(PERSONA_AVATARS)}),
  workflows: z.array(sharedWorkflow).max(MAX_SHARED_WORKFLOWS),
});
export type SetupShare = z.infer<typeof setupShareSchema>;

/** A workflow as NOVA may share it: only a title the person gave it and the ids of its steps (no prompt text, no results). */
export type WorkflowForShare = {title: string; steps: readonly string[]};

/** The shared setup, built from the whitelist only. */
export function buildSetupShare(r: NovaRecord, workflows: readonly WorkflowForShare[] = []): SetupShare {
  const persona = personaOf(r), order = (r.dock?.order ?? []).filter(id => !!dockSpec(id)), hidden = (r.dock?.hidden ?? []).filter(id => !!dockSpec(id));
  const share: SetupShare = {
    kind: SETUP_KIND, version: 1,
    layout: layoutOf(r), accent: accentOf(r),
    widgets: widgetsFor(r, isWidgetId).map(w => ({id: w.id, size: w.size})),
    dock: {order: [...new Set(order)], hidden: [...new Set(hidden)]},
    persona: {name: persona.name, avatar: persona.avatar},
    workflows: workflows.slice(0, MAX_SHARED_WORKFLOWS).flatMap(w => {
      const parsed = sharedWorkflow.safeParse({title: String(w.title).replace(/\s+/g, ' ').trim().slice(0, MAX_WORKFLOW_TITLE), steps: [...w.steps].slice(0, MAX_WORKFLOW_STEPS)});
      return parsed.success ? [parsed.data] : [];
    }),
  };
  return setupShareSchema.parse(share);
}
export const setupFileText = (share: SetupShare) => `${JSON.stringify(share, null, 2)}\n`;
export const SETUP_FILE_NAME = 'my-nova-setup.json';

export type SetupImport = {ok: true; share: SetupShare; leftOut: number} | {ok: false; error: string};
/** Reads a shared setup: size first, then JSON, then the exact shape; unknown widget and dock ids are left out and counted. */
export function parseSetupShare(text: string): SetupImport {
  if (typeof text !== 'string' || !text.trim()) return {ok: false, error: 'Choose a NOVA setup file, or paste its text.'};
  if (new TextEncoder().encode(text).length > MAX_SETUP_BYTES) return {ok: false, error: 'This file is larger than a NOVA setup can be (16 KB). Nothing was changed.'};
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return {ok: false, error: 'This is not a NOVA setup file (it is not readable JSON). Nothing was changed.'}; }
  if (!raw || typeof raw !== 'object' || (raw as {kind?: unknown}).kind !== SETUP_KIND) return {ok: false, error: 'This is not a NOVA setup file. Nothing was changed.'};
  if ((raw as {version?: unknown}).version !== 1) return {ok: false, error: 'This setup was made by a newer ZIGoals. Update the app, then import it again.'};
  const parsed = setupShareSchema.safeParse(raw);
  if (!parsed.success) return {ok: false, error: 'This setup file is damaged or was changed by hand in a way NOVA cannot read. Nothing was changed.'};
  const s = parsed.data, seen = new Set<string>();
  const widgets = s.widgets.filter(w => { const ok = isWidgetId(w.id) && !seen.has(w.id); seen.add(w.id); return ok; });
  const order = [...new Set(s.dock.order)].filter(id => !!dockSpec(id)), hidden = [...new Set(s.dock.hidden)].filter(id => !!dockSpec(id));
  const leftOut = (s.widgets.length - widgets.length) + (s.dock.order.length - order.length) + (s.dock.hidden.length - hidden.length);
  return {ok: true, share: {...s, widgets, dock: {order, hidden}}, leftOut};
}

/**
 * The record after an import: the setup's layout, accent, widgets, dock and persona; the person's own custom
 * instructions, opening-seen mark and shortcut choice stay as they are.
 */
export function applySetupShare(r: NovaRecord, s: SetupShare): NovaRecord {
  return novaRecordSchema.parse({
    ...r, layout: s.layout, accent: s.accent,
    widgets: s.widgets.map((w, slot) => ({id: w.id, size: w.size, slot})),
    dock: {order: s.dock.order, hidden: s.dock.hidden},
    persona: {...(s.persona.name !== 'NOVA' ? {name: s.persona.name} : {}), avatar: s.persona.avatar},
  });
}

/** The preview's lines, in plain words (also the setup card's lines). */
export function setupSummary(s: SetupShare): {title: string; lines: string[]} {
  const widgetNames = s.widgets.map(w => widgetSpec(w.id)?.title).filter(Boolean) as string[];
  const shownDock = (s.dock.order.length ? s.dock.order : DOCK.map(d => d.id)).filter(id => !s.dock.hidden.includes(id)).map(id => dockSpec(id)?.label).filter(Boolean) as string[];
  return {
    title: `${s.persona.name} · ${LAYOUT_LABEL[s.layout]} layout`,
    lines: [
      widgetNames.length ? `Widgets: ${widgetNames.join(', ')}.` : 'No widgets (a calm, empty sky).',
      shownDock.length ? `Dock: ${shownDock.slice(0, 10).join(', ')}${shownDock.length > 10 ? ` and ${shownDock.length - 10} more` : ''}.` : 'Dock: all hidden.',
      `Accent: ${ACCENT_LABEL[s.accent]}. Avatar: ${s.persona.avatar === 'zigi' ? 'ZIGi' : 'the NOVA orb'}.`,
      ...(s.workflows.length ? [`Workflows: ${s.workflows.map(w => w.title).join(', ')}.`] : []),
    ],
  };
}
/** The setup card's three accent colours (the share-image canvas takes plain colours; these are the app's nebula tokens' values). */
export const ACCENT_STOPS: Record<NovaAccent, readonly [string, string, string]> = {
  violet: ['#9273ff', '#63e7ff', '#f06dff'], cyan: ['#23eaff', '#9273ff', '#8fa6ff'], magenta: ['#f06dff', '#9273ff', '#63e7ff'],
  teal: ['#86f0d6', '#459dff', '#9273ff'], gold: ['#ffd27a', '#f06dff', '#9273ff'],
};
