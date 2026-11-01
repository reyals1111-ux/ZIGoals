import {parseLinks} from './links';
import {noteName, type Note} from './schema';

/**
 * Session AK (B5, "Chat with my notes"): what NOVA's context packer (lane NE) needs from the notes — plain lines within a
 * character budget, the most relevant first (pinned, then the notes whose words match the question, then the newest),
 * each cut to a few hundred characters. The lines are DATA, never instructions: the packer wraps them as such (N9), and
 * the packer applies the person's scopes and privacy mode before anything leaves the device. Inbox captures are included
 * only when asked (they are often half-thoughts). Pure.
 */
export type NotesPackOptions = {budget?: number; perNote?: number; question?: string; includeInbox?: boolean};
export function notesPackLines(notes: readonly Note[], {budget = 4000, perNote = 400, question = '', includeInbox = false}: NotesPackOptions = {}): {lines: string[]; included: number; total: number} {
  const words = question.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w => w.length > 2);
  const pool = notes.filter(n => includeInbox || n.kind !== 'inbox');
  const rel = (n: Note) => { const text = `${noteName(n)} ${n.body}`.toLowerCase(); return words.reduce((s, w) => s + (text.includes(w) ? 1 : 0), 0); };
  const ranked = [...pool].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || rel(b) - rel(a) || (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt));
  const lines: string[] = [];
  let used = 0;
  for (const n of ranked) {
    const kind = n.kind === 'daily' ? `Daily note ${n.day ?? ''}`.trim() : n.kind === 'inbox' ? 'Inbox capture' : 'Note';
    const links = [...new Set(parseLinks(n.body).map(l => l.target))].slice(0, 8);
    const body = n.body.replace(/\s+/g, ' ').trim();
    const line = `- ${kind}: ${n.kind === 'daily' ? '' : `“${noteName(n)}” `}${body.length > perNote ? `${body.slice(0, perNote - 1)}…` : body}${links.length ? ` (links: ${links.join(', ')})` : ''}`;
    if (used + line.length > budget) break;
    lines.push(line); used += line.length + 1;
  }
  return {lines, included: lines.length, total: pool.length};
}
