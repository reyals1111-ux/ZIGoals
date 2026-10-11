import {aiMemorySchema, HEALTH_NOTE_CATEGORIES, MAX_NOTE_CHARS, MAX_NOTES, MEMORY_CATEGORIES, type AiMemory, type AiOptions, type MemoryNoteRecord} from './store/records';
import type {MemoryNote} from './tools/env';

/**
 * "What ZIGi knows about me" (Session V Part 8, ADR-014): the person's own notes for ZIGi in `zigoals:ai-memory:v1`
 * (defined with the storage foundation): at most 100 notes of 500 characters, on this device only, in "Export
 * everything", never synced. A note is written only by the person, in the notes panel, or when they confirm a
 * "Remember this?" card; ZIGi keeps nothing by itself and infers nothing about them. Notes go to the person's AI only
 * while "Use my notes" is on (on by default once a note exists; an "off" is kept until they turn it on again), and notes
 * about health or diet only through the Health gate, like Health itself. Nothing shaped like a key, a password or a
 * recovery phrase is kept, because notes travel with messages.
 */
export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];
export const CATEGORY_LABELS: Record<MemoryCategory, string> = {goals: 'Goals', preferences: 'Preferences', constraints: 'Constraints', diet: 'Diet style', schedule: 'Schedule', health: 'Health', other: 'Other'};
/** The kinds a "Remember this?" card may keep: never Health (ZIGi does not keep notes about health conditions by itself). */
export const REMEMBER_CATEGORIES = ['goals', 'preferences', 'constraints', 'diet', 'schedule', 'other'] as const satisfies readonly MemoryCategory[];
export const isHealthNote = (category: string) => HEALTH_NOTE_CATEGORIES.includes(category);
/**
 * Shapes of provider keys, bearer tokens, 32-byte secrets and labelled passwords or recovery phrases. Word boundaries and
 * long minimums keep ordinary words ("task-tracker") out.
 */
const SECRET_SHAPES: readonly RegExp[] = [
  /\b(?:sk|rk|pk)-[A-Za-z0-9_-]{20,}/, /\bAIza[0-9A-Za-z_-]{30,}/, /\bxai-[A-Za-z0-9_-]{20,}/, /\bgsk_[A-Za-z0-9]{20,}/, /\bBearer\s+[A-Za-z0-9._~+/=-]{20,}/i,
  /\b(?:0x)?[0-9a-fA-F]{64}\b/,
  /\b(?:password|passcode|pin|seed phrase|recovery phrase|recovery secret|secret phrase|mnemonic|private key|wachtwoord|mot de passe|passwort|contraseña)\s*(?:is\b|:|=)/i,
];
export const SECRET_REFUSAL = 'This looks like a key, a password or a recovery phrase. ZIGi never keeps those: notes go to your AI with your messages.';
export const looksSecret = (text: string) => SECRET_SHAPES.some(shape => shape.test(text));
const normal = (text: string) => text.trim().replace(/\s+/g, ' ').toLowerCase();
export const newNoteId = () => `note_${crypto.randomUUID()}`;
/** Why a note cannot be kept as it stands (empty, too long, secret-shaped, already there, or the list is full), or null. */
export function noteProblem(text: string, memory: AiMemory, except?: string): string | null {
  const clean = text.trim(), notes = memory.notes ?? [];
  if (!clean) return 'Write the note first.';
  if (clean.length > MAX_NOTE_CHARS) return `A note is at most ${MAX_NOTE_CHARS} characters; this one has ${clean.length}.`;
  if (looksSecret(clean)) return SECRET_REFUSAL;
  if (notes.some(n => n.id !== except && normal(n.text) === normal(clean))) return 'This is already in What ZIGi knows about me.';
  if (except === undefined && notes.length >= MAX_NOTES) return `You have ${MAX_NOTES} notes, the most ZIGi keeps. Delete one in What ZIGi knows about me first.`;
  return null;
}
export function addNote(memory: AiMemory, input: {text: string; category: MemoryCategory; source: 'person' | 'zigi'}, now: Date, id = newNoteId()): AiMemory {
  const problem = noteProblem(input.text, memory); if (problem) throw Error(problem);
  const at = now.toISOString();
  return aiMemorySchema.parse({...memory, notes: [...(memory.notes ?? []), {id, text: input.text.trim(), category: input.category, source: input.source, createdAt: at, updatedAt: at}]});
}
export function editNote(memory: AiMemory, id: string, change: {text: string; category: MemoryCategory}, now: Date): AiMemory {
  if (!memory.notes?.some(n => n.id === id)) throw Error('This note is no longer here.');
  const problem = noteProblem(change.text, memory, id); if (problem) throw Error(problem);
  return aiMemorySchema.parse({...memory, notes: memory.notes.map(n => n.id === id ? {...n, text: change.text.trim(), category: change.category, updatedAt: now.toISOString()} : n)});
}
export const deleteNote = (memory: AiMemory, id: string): AiMemory => ({...memory, notes: (memory.notes ?? []).filter(n => n.id !== id)});
/** A deleted note put back where it was (the panel's Undo); refused when an equal note was added since. */
export function restoreNote(memory: AiMemory, note: MemoryNoteRecord): AiMemory {
  const notes = memory.notes ?? [];
  if (notes.some(n => n.id === note.id)) return memory;
  if (notes.some(n => normal(n.text) === normal(note.text))) throw Error('This is already in What ZIGi knows about me.');
  if (notes.length >= MAX_NOTES) throw Error(`You have ${MAX_NOTES} notes, the most ZIGi keeps.`);
  return aiMemorySchema.parse({...memory, notes: [...notes, note].sort((a, b) => a.createdAt.localeCompare(b.createdAt))});
}
/** Newest change first: the order the panel lists them and the order they reach the AI (so a cut keeps the newest). */
export const newestFirst = (notes: readonly MemoryNoteRecord[]) => [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt));
/** "Use my notes": on by default once a note exists; off only when the person turned it off. */
export const usingNotes = (options: AiOptions, memory: AiMemory) => (memory.notes?.length ?? 0) > 0 && options.useNotes !== false;
/** The notes ZIGi's paths may read (the gates filter Health-tagged ones per path), or null when none are in use. */
export function notesForAi(options: AiOptions, memory: AiMemory): MemoryNote[] | null {
  return usingNotes(options, memory) ? newestFirst(memory.notes ?? []).map(n => ({text: n.text, category: n.category})) : null;
}
