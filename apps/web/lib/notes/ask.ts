import {MAX_INPUT_CHARS} from '../ai/chats';
import type {PrivacyMode} from '../nova/setup';

/**
 * Session AK WA (owner follow-up 2 B5, "Chat with my notes"; WIRING_AUDIT_2 B5): the Notes page's own way into NOVA's
 * chat about the notes. Nothing new reads the notes: the question goes to NOVA's chat (lib/nova/bridge.ts `sendToNova`),
 * which reads them through NOVA's pack and its `search_notes` tool (lib/ai/tools/nova-tools.ts) only while NOVA →
 * Permissions → Notes is on (off by default), under the person's privacy mode, with their own model. Pure.
 * - `empty`: no note yet (teach what it will do);
 * - `permission`: Notes is off for NOVA (the switch lives in NOVA → Permissions; this page never turns it on);
 * - `brain`: no model of the person's own is connected (NOVA's on-device answers do not read notes; Search does);
 * - `ready`: ask.
 */
export type NotesAskState = 'empty' | 'permission' | 'brain' | 'ready';
export function notesAskState({notes, scopeOn, connected}: {notes: number; scopeOn: boolean; connected: boolean}): NotesAskState {
  if (notes <= 0) return 'empty';
  if (!scopeOn) return 'permission';
  return connected ? 'ready' : 'brain';
}
/** The words NOVA's chat shows and sends: the person's question, marked as being about their notes. */
export const NOTES_ASK_PREFIX = 'About my notes: ';
export function notesQuestion(text: string): string | null {
  const clean = text.trim().replace(/\s+/g, ' ');
  return clean ? `${NOTES_ASK_PREFIX}${clean}`.slice(0, MAX_INPUT_CHARS) : null;
}
/** Where NOVA → Permissions opens (NOVA's panel hash). */
export const NOVA_PERMISSIONS_HREF = '/app/nova#nova-permissions';
/** One line on what leaves the device with the question, in the person's privacy mode. */
export function notesPrivacyLine(mode: PrivacyMode | null, persona: string): string {
  if (mode === 'strict') return `Privacy mode Strict: only a model on this computer reads your notes; ${persona} refuses to send them to a cloud.`;
  if (mode === 'guarded') return 'Privacy mode Guarded: before a cloud model gets anything, names, account numbers, addresses and exact amounts are taken out, and you see what is sent.';
  if (mode === 'relaxed') return 'Privacy mode Relaxed: the notes your question needs go to your own model as they are, local or cloud.';
  return `The notes your question needs go only to your own model, with your question. Choose a privacy mode in ${persona}’s setup guide.`;
}
/** Showcase only: an example of the exchange, labelled, never sent and never answered by a model. */
export const NOTES_ASK_SHOWCASE = {
  question: 'About my notes: what helps me stay calm?',
  answer: 'Example answer. Your note “What helps me stay calm” says meditating before work beats meditating at night, and a walk at lunch helps on busy days.',
  label: 'Showcase example: written for the Showcase, no AI ran and nothing was sent.',
} as const;
