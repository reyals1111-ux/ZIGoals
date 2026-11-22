import {CANVAS_LABEL_MAX, CANVAS_SPAN, CANVAS_TEXT_MAX, MAX_CANVASES, MAX_CANVAS_EDGES, MAX_CANVAS_NODES, canvasSchema, noteName, type CanvasEdge, type CanvasNode, type Note, type NoteCanvas, type Notes} from './schema';
import {checked} from './store';

/**
 * Session AV lane 2 (r3-notes; LEDGER #273, Obsidian's Canvas): boards of cards placed by hand — text cards, note cards
 * (a link to a note), photos and named groups — joined by labelled lines, kept in the notes record (`canvases`), and
 * exported and imported as a .canvas file in the open JSON Canvas format (jsoncanvas.org, MIT): nodes of type text, file
 * and group with x, y, width, height and a preset colour "1"–"6", and edges fromNode → toNode with a label. Every change
 * here is pure and checked against the caps (10 boards, 200 cards and 400 lines each, 200,000 characters of card text
 * in all), so a change that would break one throws a plain sentence and changes nothing.
 */
export const MAX_CANVAS_CHARS = 200_000, GRID = 10, NUDGE = 10, NUDGE_FAR = 50;
export const COLOUR_NAMES: Record<NonNullable<CanvasNode['color']>, string> = {'1': 'Red', '2': 'Orange', '3': 'Yellow', '4': 'Green', '5': 'Cyan', '6': 'Purple'};
const rid = (prefix: string) => `${prefix}${(globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`).replace(/[^A-Za-z0-9]/g, '').slice(0, 16)}`;
export const newCanvasId = () => rid('cv-'), newCardId = () => rid('c'), newLineId = () => rid('l');
export const canvasesOf = (record: Pick<Notes, 'canvases'>): NoteCanvas[] => record.canvases ?? [];
export const canvasOf = (record: Pick<Notes, 'canvases'>, id: string | null | undefined) => canvasesOf(record).find(c => c.id === id) ?? null;
const clampCoord = (n: number) => Math.max(-CANVAS_SPAN, Math.min(CANVAS_SPAN, Math.round(n)));
const chars = (cs: readonly NoteCanvas[]) => cs.reduce((t, c) => t + c.nodes.reduce((n, x) => n + (x.text?.length ?? 0) + (x.label?.length ?? 0), 0) + c.edges.reduce((n, e) => n + (e.label?.length ?? 0), 0), 0);
/** The record with one board changed (or added); validated and within the caps (also how an imported board joins). */
export function withCanvas(record: Notes, canvas: NoteCanvas): Notes {
  const list = canvasesOf(record), at = list.findIndex(c => c.id === canvas.id);
  if (at < 0 && list.length >= MAX_CANVASES) throw new Error(`Up to ${MAX_CANVASES} boards. Delete one first.`);
  if (canvas.nodes.length > MAX_CANVAS_NODES) throw new Error(`A board holds up to ${MAX_CANVAS_NODES} cards.`);
  if (canvas.edges.length > MAX_CANVAS_EDGES) throw new Error(`A board holds up to ${MAX_CANVAS_EDGES} lines.`);
  const canvases = at < 0 ? [...list, canvas] : list.map((c, i) => i === at ? canvas : c);
  if (chars(canvases) > MAX_CANVAS_CHARS) throw new Error('Your boards would hold too many words for this browser. Shorten or delete some cards first.');
  const parsed = canvasSchema.safeParse(canvas);
  if (!parsed.success || parsed.data.nodes.length !== canvas.nodes.length || parsed.data.edges.length !== canvas.edges.length) throw new Error('This card could not be kept on the board.');
  return checked({...record, canvases});
}
const edit = (record: Notes, id: string, now: string, fn: (c: NoteCanvas) => NoteCanvas): Notes => {
  const c = canvasOf(record, id);
  if (!c) throw new Error('This board is no longer on this device.');
  return withCanvas(record, {...fn(c), updatedAt: now});
};
const nameOk = (raw: string) => { const n = raw.trim().replace(/\s+/g, ' ').slice(0, CANVAS_LABEL_MAX); if (!n) throw new Error('Give the board a name.'); return n; };
export function addCanvas(record: Notes, name: string, now: string, id = newCanvasId()): {record: Notes; canvas: NoteCanvas} {
  const canvas: NoteCanvas = {id, name: nameOk(name), nodes: [], edges: [], updatedAt: now};
  return {record: withCanvas(record, canvas), canvas};
}
export const renameCanvas = (record: Notes, id: string, name: string, now: string) => edit(record, id, now, c => ({...c, name: nameOk(name)}));
/** Deletes a board; the board comes back with `putCanvasBack`. */
export function removeCanvas(record: Notes, id: string): {record: Notes; removed: NoteCanvas; at: number} {
  const list = canvasesOf(record), at = list.findIndex(c => c.id === id);
  if (at < 0) throw new Error('This board is no longer on this device.');
  const rest = list.filter(c => c.id !== id), next: Notes = {...record};
  if (rest.length) next.canvases = rest; else delete next.canvases;
  return {record: checked(next), removed: list[at]!, at};
}
/** Undo: a board as it was (replacing the one of the same id, or back in its place). */
export function putCanvasBack(record: Notes, canvas: NoteCanvas, at?: number): Notes {
  const list = canvasesOf(record).filter(c => c.id !== canvas.id), i = Math.max(0, Math.min(at ?? list.length, list.length));
  return checked({...record, canvases: [...list.slice(0, i), canvas, ...list.slice(i)].slice(0, MAX_CANVASES)});
}

/* ---- Cards and lines ------------------------------------------------------------------------------------------- */
export const CARD_SIZE: Record<CanvasNode['type'], {w: number; h: number}> = {text: {w: 240, h: 120}, note: {w: 260, h: 120}, photo: {w: 220, h: 180}, group: {w: 560, h: 340}};
/** A free place for a new card: right of the last one, wrapping into rows, on the 10-point grid. */
export function freeSpot(canvas: NoteCanvas, type: CanvasNode['type']): {x: number; y: number} {
  const cards = canvas.nodes.filter(n => n.type !== 'group');
  if (type === 'group') return {x: 20, y: canvas.nodes.length ? Math.max(...canvas.nodes.map(n => n.y + n.h)) + 40 : 20};
  if (!cards.length) return {x: 40, y: 40};
  const last = cards[cards.length - 1]!, x = last.x + last.w + 40;
  return x + CARD_SIZE[type].w > 1200 ? {x: 40, y: Math.max(...cards.map(n => n.y + n.h)) + 40} : {x, y: last.y};
}
export type NewCard = {type: 'text'; text: string} | {type: 'note'; note: string} | {type: 'photo'; photo: string} | {type: 'group'; label: string};
export function addCard(record: Notes, canvasId: string, card: NewCard, now: string, id = newCardId()): {record: Notes; node: CanvasNode} {
  const c = canvasOf(record, canvasId);
  if (!c) throw new Error('This board is no longer on this device.');
  if (card.type === 'note' && !record.notes.some(n => n.id === card.note)) throw new Error('That note is no longer on this device.');
  const spot = freeSpot(c, card.type), size = CARD_SIZE[card.type];
  const node: CanvasNode = {id, type: card.type, x: spot.x, y: spot.y, w: size.w, h: size.h,
    ...(card.type === 'text' ? {text: card.text.slice(0, CANVAS_TEXT_MAX)} : card.type === 'note' ? {note: card.note} : card.type === 'photo' ? {photo: card.photo} : {label: card.label.trim().slice(0, CANVAS_LABEL_MAX) || 'Group'})};
  return {record: edit(record, canvasId, now, b => ({...b, nodes: card.type === 'group' ? [node, ...b.nodes] : [...b.nodes, node]})), node};
}
/** Moves a card by (dx, dy), on the 10-point grid. */
export const moveCard = (record: Notes, canvasId: string, id: string, dx: number, dy: number, now: string) => edit(record, canvasId, now, b => ({...b, nodes: b.nodes.map(n => n.id === id ? {...n, x: clampCoord(Math.round((n.x + dx) / GRID) * GRID), y: clampCoord(Math.round((n.y + dy) / GRID) * GRID)} : n)}));
/** A card's size changed by (dw, dh), from 40 to 4000 points. */
export const resizeCard = (record: Notes, canvasId: string, id: string, dw: number, dh: number, now: string) => edit(record, canvasId, now, b => ({...b, nodes: b.nodes.map(n => n.id === id ? {...n, w: Math.max(40, Math.min(4000, n.w + dw)), h: Math.max(40, Math.min(4000, n.h + dh))} : n)}));
export function editCard(record: Notes, canvasId: string, id: string, patch: {text?: string; label?: string; color?: CanvasNode['color'] | null}, now: string): Notes {
  return edit(record, canvasId, now, b => ({...b, nodes: b.nodes.map(n => { if (n.id !== id) return n; const next: CanvasNode = {...n, ...(patch.text !== undefined ? {text: patch.text.slice(0, CANVAS_TEXT_MAX)} : {}), ...(patch.label !== undefined ? {label: patch.label.slice(0, CANVAS_LABEL_MAX)} : {})}; if (patch.color === null) delete next.color; else if (patch.color) next.color = patch.color; return next; })}));
}
/** Removes a card and the lines that touch it. */
export const removeCard = (record: Notes, canvasId: string, id: string, now: string) => edit(record, canvasId, now, b => ({...b, nodes: b.nodes.filter(n => n.id !== id), edges: b.edges.filter(e => e.from !== id && e.to !== id)}));
export function connect(record: Notes, canvasId: string, from: string, to: string, label: string, now: string, id = newLineId()): Notes {
  if (from === to) throw new Error('Choose another card to join it to.');
  return edit(record, canvasId, now, b => {
    if (!b.nodes.some(n => n.id === from) || !b.nodes.some(n => n.id === to)) throw new Error('That card is no longer on the board.');
    if (b.edges.some(e => e.from === from && e.to === to)) throw new Error('These two cards are already joined that way.');
    const l = label.trim().slice(0, CANVAS_LABEL_MAX);
    return {...b, edges: [...b.edges, {id, from, to, ...(l ? {label: l} : {})}]};
  });
}
export const relabel = (record: Notes, canvasId: string, lineId: string, label: string, now: string) => edit(record, canvasId, now, b => ({...b, edges: b.edges.map(e => { if (e.id !== lineId) return e; const l = label.trim().slice(0, CANVAS_LABEL_MAX), {label: _l, ...rest} = e; void _l; return l ? {...rest, label: l} : rest; })}));
export const removeLine = (record: Notes, canvasId: string, lineId: string, now: string) => edit(record, canvasId, now, b => ({...b, edges: b.edges.filter(e => e.id !== lineId)}));
/** The groups a card sits in (its centre inside the group), the smallest first. */
export const groupsOf = (canvas: NoteCanvas, node: CanvasNode) => canvas.nodes.filter(g => g.type === 'group' && g.id !== node.id && node.x + node.w / 2 >= g.x && node.x + node.w / 2 <= g.x + g.w && node.y + node.h / 2 >= g.y && node.y + node.h / 2 <= g.y + g.h).sort((a, b) => a.w * a.h - b.w * b.h);
/** A card in words, for its name and the lines list. */
export function cardWords(node: CanvasNode, notes: readonly Note[]): string {
  if (node.type === 'group') return `Group “${node.label || 'Group'}”`;
  if (node.type === 'photo') return 'Photo';
  if (node.type === 'note') { const n = notes.find(x => x.id === node.note); return n ? `Note “${n.kind === 'daily' && n.day ? n.day : noteName(n)}”` : 'A note no longer on this device'; }
  const t = (node.text ?? '').replace(/\s+/g, ' ').trim();
  return t ? `Text “${t.length > 40 ? `${t.slice(0, 39)}…` : t}”` : 'Empty text card';
}
/** The size the surface needs to show every card, with room to move. */
export function bounds(canvas: NoteCanvas): {minX: number; minY: number; width: number; height: number} {
  const xs = canvas.nodes.flatMap(n => [n.x, n.x + n.w]), ys = canvas.nodes.flatMap(n => [n.y, n.y + n.h]);
  const minX = Math.min(0, ...xs) - 40, minY = Math.min(0, ...ys) - 40;
  return {minX, minY, width: Math.max(1200, Math.max(0, ...xs) - minX + 400), height: Math.max(700, Math.max(0, ...ys) - minY + 300)};
}

/* ---- JSON Canvas (.canvas) ----------------------------------------------------------------------------------- */
type JsonNode = {id: string; type: 'text' | 'file' | 'link' | 'group'; x: number; y: number; width: number; height: number; text?: string; file?: string; url?: string; label?: string; color?: string};
type JsonEdge = {id: string; fromNode: string; toNode: string; label?: string; fromSide?: string; toSide?: string; color?: string};
/**
 * A board as JSON Canvas: text cards as text nodes, note cards as file nodes naming the note's file in the notes'
 * Markdown export (`paths`, so a vault holding both opens it), photos as file nodes in attachments/, groups as group nodes.
 */
export function toJsonCanvas(canvas: NoteCanvas, paths: ReadonlyMap<string, string>, photoFile: (photoId: string) => string = id => `attachments/${id}.webp`): {nodes: JsonNode[]; edges: JsonEdge[]} {
  const nodes: JsonNode[] = canvas.nodes.map(n => ({id: n.id, type: n.type === 'text' ? 'text' : n.type === 'group' ? 'group' : 'file', x: n.x, y: n.y, width: n.w, height: n.h,
    ...(n.type === 'text' ? {text: n.text ?? ''} : n.type === 'group' ? {label: n.label ?? ''} : n.type === 'note' ? {file: paths.get(n.note ?? '') ?? 'Notes/Missing note.md'} : {file: photoFile(n.photo ?? '')}), ...(n.color ? {color: n.color} : {})}));
  const edges: JsonEdge[] = canvas.edges.map(e => ({id: e.id, fromNode: e.from, toNode: e.to, ...(e.label ? {label: e.label} : {})}));
  return {nodes, edges};
}
const num = (v: unknown, d: number) => typeof v === 'number' && Number.isFinite(v) ? v : d;
/**
 * A .canvas file read as a new board, without running anything: text nodes are text cards; a file node naming a .md file
 * is a card for the note of that name when there is one (else a text card naming the file); an image file, a link or
 * any other node is a text card that says what it was; groups stay groups; lines keep their labels. Caps apply; what is
 * left out is said.
 */
export function fromJsonCanvas(text: string, notes: readonly Note[], name: string, now: string, id = newCanvasId()): {canvas: NoteCanvas; skipped: number} {
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new Error('This is not a .canvas file ZIGoals can read.'); }
  const raw = data && typeof data === 'object' ? data as {nodes?: unknown; edges?: unknown} : null;
  if (!raw || !Array.isArray(raw.nodes)) throw new Error('This file holds no canvas (no "nodes" list).');
  const byName = new Map(notes.map(n => [(n.kind === 'daily' && n.day ? n.day : noteName(n)).toLowerCase(), n.id]));
  const ids = new Map<string, string>(), nodes: CanvasNode[] = [];
  let skipped = 0;
  for (const x of raw.nodes as unknown[]) {
    if (!x || typeof x !== 'object' || nodes.length >= MAX_CANVAS_NODES) { skipped++; continue; }
    const n = x as Partial<JsonNode>, sid = typeof n.id === 'string' ? n.id : '';
    const base = {id: newCardId(), x: clampCoord(num(n.x, 0)), y: clampCoord(num(n.y, 0)), w: Math.max(40, Math.min(4000, Math.round(num(n.width, 240)))), h: Math.max(40, Math.min(4000, Math.round(num(n.height, 120)))), ...(typeof n.color === 'string' && /^[1-6]$/.test(n.color) ? {color: n.color as CanvasNode['color']} : {})};
    let node: CanvasNode;
    if (n.type === 'group') node = {...base, type: 'group', label: String(n.label ?? '').slice(0, CANVAS_LABEL_MAX)};
    else if (n.type === 'file' && typeof n.file === 'string' && /\.md$/i.test(n.file) && byName.has(n.file.split('/').pop()!.replace(/\.md$/i, '').toLowerCase())) node = {...base, type: 'note', note: byName.get(n.file.split('/').pop()!.replace(/\.md$/i, '').toLowerCase())!};
    else if (n.type === 'file' && typeof n.file === 'string') node = {...base, type: 'text', text: `${/\.(?:png|jpe?g|webp|gif|avif|heic)$/i.test(n.file) ? 'Photo' : 'File'}: ${n.file} (not in this browser)`.slice(0, CANVAS_TEXT_MAX)};
    else if (n.type === 'link' && typeof n.url === 'string') node = {...base, type: 'text', text: n.url.slice(0, CANVAS_TEXT_MAX)};
    else if (typeof n.text === 'string') node = {...base, type: 'text', text: n.text.slice(0, CANVAS_TEXT_MAX)};
    else { skipped++; continue; }
    if (sid) ids.set(sid, node.id);
    nodes.push(node);
  }
  const edges: CanvasEdge[] = [];
  for (const x of Array.isArray(raw.edges) ? raw.edges as unknown[] : []) {
    const e = x && typeof x === 'object' ? x as Partial<JsonEdge> : null, from = e && typeof e.fromNode === 'string' ? ids.get(e.fromNode) : undefined, to = e && typeof e.toNode === 'string' ? ids.get(e.toNode) : undefined;
    if (!from || !to || from === to || edges.length >= MAX_CANVAS_EDGES) { skipped++; continue; }
    const label = typeof e!.label === 'string' ? e!.label.trim().slice(0, CANVAS_LABEL_MAX) : '';
    edges.push({id: newLineId(), from, to, ...(label ? {label} : {})});
  }
  const canvas = canvasSchema.parse({id, name: nameOk(name), nodes, edges, updatedAt: now});
  return {canvas, skipped: skipped + (nodes.length - canvas.nodes.length)};
}
