import {aiMemorySchema, HEALTH_NOTE_CATEGORIES, MAX_NOTE_CHARS, MAX_NOTES, MEMORY_CATEGORIES, MEMORY_KINDS, type AiMemory, type AiOptions, type MemoryNoteRecord} from './store/records';
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
/**
 * Session AF (L4, ADR-028 H30): whether ZIGi may offer and keep notes from its own "Remember this?" cards. The first card
 * the person confirms records their agreement (`consent: {given: true, at}`); turning "Notes from ZIGi's cards" off in
 * What ZIGi knows records `given: false`, after which every Remember card is refused in plain words (the person's own
 * notes in the panel are theirs and stay possible). A record from before this field reads through `memoryConsent`.
 */
export const MEMORY_DECLINED = 'You chose that ZIGi keeps no notes from its cards. Turn "Notes from ZIGi\'s cards" on in Settings → ZIGi · Your Personal AI Companion → What ZIGi knows about me, or write the note there yourself.';
export const MEMORY_FIRST = 'Your first note for ZIGi: it is kept only when you press Remember, on this device only, never synced, in Export everything; see, edit or forget each one in Settings → What ZIGi knows about me.';
export function withConsent(memory: AiMemory, given: boolean, now: Date): AiMemory { return aiMemorySchema.parse({...memory, consent: {given, at: now.toISOString()}}); }
/** The record after a confirmed Remember card: the first one also records the agreement. */
export const consentOnRemember = (memory: AiMemory, now: Date): AiMemory => memory.consent ? memory : withConsent(memory, true, now);
/** "Use my notes": on by default once a note exists; off only when the person turned it off. */
export const usingNotes = (options: AiOptions, memory: AiMemory) => (memory.notes?.length ?? 0) > 0 && options.useNotes !== false;
/** The notes ZIGi's paths may read (the gates filter Health-tagged ones per path), or null when none are in use. */
export function notesForAi(options: AiOptions, memory: AiMemory): MemoryNote[] | null {
  // Session AI (feature 3): a note the person paused stays here and goes to no AI.
  // Session AK (N7): pinned notes first (identical to newest first while nothing is pinned), so a cut keeps them.
  return usingNotes(options, memory) ? pinnedFirst(memory.notes ?? []).filter(n => n.paused !== true).map(n => ({text: n.text, category: n.category})) : null;
}
/**
 * Session AI (feature 3, TIER 3 (stored format): an optional `paused` on a note; the record is loose, so older builds keep
 * it on their writes): pausing keeps a note on this device without letting it shape ZIGi's answers.
 */
export function setNotePaused(memory: AiMemory, id: string, paused: boolean, now: Date): AiMemory {
  return aiMemorySchema.parse({...memory, notes: (memory.notes ?? []).map(n => n.id === id ? {...n, paused, updatedAt: now.toISOString()} : n)});
}
/** The notes as a file the person saves (JSON, their own words only). */
export function notesExport(memory: AiMemory, now: Date): string {
  return JSON.stringify({format: 'zigoals-zigi-notes', version: 1, exportedAt: now.toISOString(), notes: newestFirst(memory.notes ?? []).map(n => ({text: n.text, category: n.category, source: n.source, paused: n.paused === true, createdAt: n.createdAt, updatedAt: n.updatedAt}))}, null, 2);
}

/**
 * Session AK (NOVA long-term memory, owner follow-up 2 N7): one memory for ZIGi and NOVA, the same `zigoals:ai-memory:v1`
 * notes with optional fields (records.ts): a kind (preference, decision, person, context), a pin, who proposed it and
 * where, and the day it is about. Nothing is kept until the person accepts it (their own note, or a card they confirm);
 * nothing about their health is kept while Health is not shared with ZIGi and NOVA; a pinned note is kept first and sent
 * first. Every function returns a new record and leaves notes from older builds exactly as they were.
 */
export type MemoryKind = (typeof MEMORY_KINDS)[number];
export const MEMORY_KIND_LABELS: Record<MemoryKind, string> = {preference: 'Preferences', decision: 'Decisions', person: 'People', context: 'Context'};
/** The category a kind is filed under, so a build without kinds still shows and gates the note the right way. */
export const KIND_CATEGORY: Record<MemoryKind, MemoryCategory> = {preference: 'preferences', decision: 'goals', person: 'other', context: 'other'};
/** A note's kind: its own, or read from its category (a preference stays a preference; anything else is context). */
export const memoryKind = (note: Pick<MemoryNoteRecord, 'kind' | 'category'>): MemoryKind => note.kind ?? (note.category === 'preferences' || note.category === 'diet' ? 'preference' : note.category === 'goals' ? 'decision' : 'context');
/**
 * Words that describe a health condition, a treatment, a body measure or sleep. A note proposed while Health is not shared
 * is refused when it reads like this, whatever kind it was proposed as; the person's own note is kept as Health instead.
 */
const HEALTH_WORDS = /\b(?:diagnos\w*|medication|medicine|prescri\w*|doctor|therap\w*|symptom\w*|illness|disease|allerg\w*|blood (?:pressure|sugar)|cholesterol|diabet\w*|asthma|migraine|pregnan\w*|menstrua\w*|weight|weigh|kg|calorie\w*|kcal|diet|sleep\w*|insomnia|anxiety|depress\w*|mental health|injur\w*|surgery|hospital|pills?|dose|vitamin\w*|supplement\w*)\b/i;
export const looksHealth = (text: string) => HEALTH_WORDS.test(text);
export const HEALTH_HELD = 'This reads like something about your health. While Health is not shared with ZIGi and NOVA, nothing about it is kept.';
export type MemoryInput = {text: string; kind: MemoryKind; source: 'person' | 'zigi'; by: 'person' | 'zigi' | 'nova'; label?: string; about?: string; category?: MemoryCategory};
/** Why a proposed memory cannot be kept (the note rules first, then Health), or null. */
export function memoryProblem(input: Pick<MemoryInput, 'text' | 'by' | 'category'>, memory: AiMemory, healthShared: boolean): string | null {
  const problem = noteProblem(input.text, memory); if (problem) return problem;
  if (!healthShared && input.by !== 'person' && (looksHealth(input.text) || (input.category !== undefined && isHealthNote(input.category)))) return HEALTH_HELD;
  return null;
}
/**
 * Keeps one accepted memory: the person's own, or a proposal by ZIGi or NOVA they accepted. A person's note that reads
 * like health is filed under Health (so it travels only through the Health gate); a proposal like it is refused while
 * Health is not shared.
 */
export function addMemory(memory: AiMemory, input: MemoryInput, now: Date, healthShared: boolean, id = newNoteId()): AiMemory {
  const problem = memoryProblem(input, memory, healthShared); if (problem) throw Error(problem);
  const category: MemoryCategory = input.category ?? (looksHealth(input.text) ? 'health' : KIND_CATEGORY[input.kind]);
  const at = now.toISOString(), label = input.label?.trim().slice(0, 120);
  const note = {id, text: input.text.trim(), category, source: input.source, createdAt: at, updatedAt: at, kind: input.kind, from: {by: input.by, ...(label ? {label} : {})}, ...(input.about && /^\d{4}-\d{2}-\d{2}$/.test(input.about) ? {about: input.about} : {})};
  return aiMemorySchema.parse({...memory, notes: [...(memory.notes ?? []), note]});
}
/** Edits the words and the kind (the category follows the kind unless the note is filed under Health or Diet). */
export function editMemory(memory: AiMemory, id: string, change: {text: string; kind: MemoryKind; about?: string | null}, now: Date): AiMemory {
  const note = memory.notes?.find(n => n.id === id); if (!note) throw Error('This note is no longer here.');
  const category = isHealthNote(note.category) ? note.category : KIND_CATEGORY[change.kind];
  const edited = editNote(memory, id, {text: change.text, category}, now);
  return aiMemorySchema.parse({...edited, notes: (edited.notes ?? []).map(n => {
    if (n.id !== id) return n;
    const next = {...n, kind: change.kind};
    if (change.about === null) delete next.about; else if (change.about && /^\d{4}-\d{2}-\d{2}$/.test(change.about)) next.about = change.about;
    return next;
  })});
}
export function setPinned(memory: AiMemory, id: string, pinned: boolean, now: Date): AiMemory {
  if (!memory.notes?.some(n => n.id === id)) throw Error('This note is no longer here.');
  return aiMemorySchema.parse({...memory, notes: memory.notes.map(n => n.id === id ? {...n, pinned, updatedAt: now.toISOString()} : n)});
}
/** Pinned first, then newest change first: the panel's order. */
export const pinnedFirst = (notes: readonly MemoryNoteRecord[]) => { const sorted = newestFirst(notes); return [...sorted.filter(n => n.pinned === true), ...sorted.filter(n => n.pinned !== true)]; };
/** Where a note came from, in words: "Written by you", "From a ZIGi card you accepted", "Proposed by NOVA in Workflow: …". */
export function memorySource(note: Pick<MemoryNoteRecord, 'source' | 'from'>): string {
  const by = note.from?.by ?? (note.source === 'zigi' ? 'zigi' : 'person');
  const where = note.from?.label ? ` · ${note.from.label}` : '';
  return by === 'person' ? `Written by you${where}` : `${by === 'nova' ? 'Proposed by NOVA' : 'Proposed by ZIGi'}, accepted by you${where}`;
}
/** The notes grouped by kind for the panel (pinned ones in their own group first); empty groups are left out. */
export function memoryGroups(notes: readonly MemoryNoteRecord[]): {id: 'pinned' | MemoryKind; label: string; notes: MemoryNoteRecord[]}[] {
  const ordered = pinnedFirst(notes), pinned = ordered.filter(n => n.pinned === true);
  const groups: {id: 'pinned' | MemoryKind; label: string; notes: MemoryNoteRecord[]}[] = pinned.length ? [{id: 'pinned', label: 'Pinned', notes: pinned}] : [];
  for (const kind of MEMORY_KINDS) { const of = ordered.filter(n => n.pinned !== true && memoryKind(n) === kind); if (of.length) groups.push({id: kind, label: MEMORY_KIND_LABELS[kind], notes: of}); }
  return groups;
}
/** The whole memory as a file the person saves: their words with kind, pin, source and dates; never a key or a record. */
export function memoryExport(memory: AiMemory, now: Date): string {
  return JSON.stringify({format: 'zigoals-memory', version: 1, exportedAt: now.toISOString(), notes: pinnedFirst(memory.notes ?? []).map(n => ({text: n.text, kind: memoryKind(n), category: n.category, pinned: n.pinned === true, paused: n.paused === true, source: memorySource(n), ...(n.about ? {about: n.about} : {}), createdAt: n.createdAt, updatedAt: n.updatedAt}))}, null, 2);
}
