import {describe, expect, test} from 'vitest';
import {MAX_CANVAS_CHARS, addCanvas, addCard, bounds, canvasOf, cardWords, connect, editCard, fromJsonCanvas, groupsOf, moveCard, putCanvasBack, relabel, removeCanvas, removeCard, removeLine, renameCanvas, resizeCard, toJsonCanvas} from './canvas';
import {exportPaths, notesExportEntries} from './markdown';
import {notesSchema, type Notes} from './schema';

/** Session AV lane 2 (r3-notes; LEDGER #273, Obsidian's Canvas): boards of cards and labelled lines, and the .canvas file. */
const AT = '2026-11-20T09:00:00.000Z', NOW = '2026-11-22T10:00:00.000Z';
const base = (): Notes => notesSchema.parse({version: 1, voice: false, notes: [{id: 'n1', kind: 'topic', title: 'Fictional trip', body: 'Kyoto.', createdAt: AT}, {id: 'n2', kind: 'daily', title: '2026-11-21', day: '2026-11-21', body: 'A day.', createdAt: AT}]});
function board() {
  let r = addCanvas(base(), 'Fictional plan', NOW, 'cv-plan0001').record;
  r = addCard(r, 'cv-plan0001', {type: 'note', note: 'n1'}, NOW, 'a').record;
  r = addCard(r, 'cv-plan0001', {type: 'text', text: 'Book the train'}, NOW, 'b').record;
  r = addCard(r, 'cv-plan0001', {type: 'photo', photo: 'ph-1'}, NOW, 'p').record;
  r = connect(r, 'cv-plan0001', 'a', 'b', 'next', NOW, 'l1');
  return r;
}
describe('boards and cards', () => {
  test('a board with cards placed in a row, a line with its label', () => {
    const c = canvasOf(board(), 'cv-plan0001')!;
    expect(c.nodes.map(n => [n.id, n.type, n.x, n.y])).toEqual([['a', 'note', 40, 40], ['b', 'text', 340, 40], ['p', 'photo', 620, 40]]);
    expect(c.edges).toEqual([{id: 'l1', from: 'a', to: 'b', label: 'next'}]);
    expect(cardWords(c.nodes[0]!, base().notes)).toBe('Note “Fictional trip”');
    expect(cardWords(c.nodes[1]!, base().notes)).toBe('Text “Book the train”');
  });
  test('moved by the arrow keys on the 10-point grid; resized; edited; coloured', () => {
    let r = moveCard(board(), 'cv-plan0001', 'b', 10, -50, NOW);
    expect(canvasOf(r, 'cv-plan0001')!.nodes[1]).toMatchObject({x: 350, y: -10});
    r = moveCard(r, 'cv-plan0001', 'b', 13, 4, NOW); // a drag lands on the grid
    expect(canvasOf(r, 'cv-plan0001')!.nodes[1]).toMatchObject({x: 360, y: -10});
    r = resizeCard(r, 'cv-plan0001', 'b', -500, 40, NOW);
    expect(canvasOf(r, 'cv-plan0001')!.nodes[1]).toMatchObject({w: 40, h: 160});
    r = editCard(r, 'cv-plan0001', 'b', {text: 'Book the fictional train', color: '4'}, NOW);
    expect(canvasOf(r, 'cv-plan0001')!.nodes[1]).toMatchObject({text: 'Book the fictional train', color: '4'});
    expect(canvasOf(editCard(r, 'cv-plan0001', 'b', {color: null}, NOW), 'cv-plan0001')!.nodes[1]!.color).toBeUndefined();
  });
  test('a group gathers the cards whose centre is inside it', () => {
    let r = addCard(board(), 'cv-plan0001', {type: 'group', label: 'Fictional spring'}, NOW, 'g').record;
    r = moveCard(r, 'cv-plan0001', 'g', 0, -240, NOW);
    const c = canvasOf(r, 'cv-plan0001')!;
    expect(c.nodes[0]).toMatchObject({id: 'g', x: 20, y: 20, w: 560, h: 340}); // placed below the cards, moved up; drawn behind them
    expect(groupsOf(c, c.nodes.find(n => n.id === 'a')!).map(x => x.id)).toEqual(['g']);
    expect(groupsOf(c, c.nodes.find(n => n.id === 'p')!).map(x => x.id)).toEqual([]); // its centre (730, 130) is outside
  });
  test('a card removed takes its lines; a line removed, relabelled; joins checked', () => {
    expect(canvasOf(removeCard(board(), 'cv-plan0001', 'a', NOW), 'cv-plan0001')!.edges).toEqual([]);
    expect(canvasOf(removeLine(board(), 'cv-plan0001', 'l1', NOW), 'cv-plan0001')!.edges).toEqual([]);
    expect(canvasOf(relabel(board(), 'cv-plan0001', 'l1', '', NOW), 'cv-plan0001')!.edges[0]).toEqual({id: 'l1', from: 'a', to: 'b'});
    expect(() => connect(board(), 'cv-plan0001', 'a', 'a', '', NOW)).toThrow('another card');
    expect(() => connect(board(), 'cv-plan0001', 'a', 'b', '', NOW)).toThrow('already joined');
    expect(() => addCard(board(), 'cv-plan0001', {type: 'note', note: 'gone'}, NOW)).toThrow('no longer on this device');
  });
  test('rename, delete and its Undo; the caps', () => {
    expect(canvasOf(renameCanvas(board(), 'cv-plan0001', ' New  name ', NOW), 'cv-plan0001')!.name).toBe('New name');
    const out = removeCanvas(board(), 'cv-plan0001');
    expect(out.record.canvases).toBeUndefined();
    expect(putCanvasBack(out.record, out.removed, out.at).canvases).toEqual(board().canvases);
    let r = base();
    for (let i = 0; i < 10; i++) r = addCanvas(r, `Board ${i}`, NOW).record;
    expect(() => addCanvas(r, 'One more', NOW)).toThrow('Up to 10 boards');
    expect(() => addCard(board(), 'cv-plan0001', {type: 'text', text: 'x'.repeat(2000)}, NOW)).not.toThrow();
    let big = board();
    expect(() => { for (let i = 0; i < 101; i++) big = addCard(big, 'cv-plan0001', {type: 'text', text: 'y'.repeat(2000)}, NOW).record; }).toThrow(`too many words`);
    expect(MAX_CANVAS_CHARS).toBe(200_000);
  });
  test('the surface is big enough for every card, with room to move', () => {
    expect(bounds(canvasOf(board(), 'cv-plan0001')!)).toMatchObject({minX: -40, minY: -40, width: 1280, height: 700}); // the right edge 840, plus 40 and 400 to move into
  });
});
describe('the .canvas file (JSON Canvas)', () => {
  test('export: text, file (the note’s Markdown path, the photo in attachments/) and edges', () => {
    const r = board(), json = toJsonCanvas(canvasOf(r, 'cv-plan0001')!, exportPaths(r.notes));
    expect(json.nodes).toEqual([
      {id: 'a', type: 'file', x: 40, y: 40, width: 260, height: 120, file: 'Notes/Fictional trip.md'},
      {id: 'b', type: 'text', x: 340, y: 40, width: 240, height: 120, text: 'Book the train'},
      {id: 'p', type: 'file', x: 620, y: 40, width: 220, height: 180, file: 'attachments/ph-1.webp'}]);
    expect(json.edges).toEqual([{id: 'l1', fromNode: 'a', toNode: 'b', label: 'next'}]);
    const zip = notesExportEntries(r, {goals: [], habits: []}, {now: new Date(NOW)});
    expect(zip.find(e => e.name === 'Canvas/Fictional plan.canvas')!.data).toBe(JSON.stringify(json, null, 2));
  });
  test('import: a note found by its file name, a photo or link said in words, groups kept, lines joined; nothing run', () => {
    const file = JSON.stringify({nodes: [
      {id: '1', type: 'file', file: 'Notes/Fictional trip.md', x: 0, y: 0, width: 250, height: 100},
      {id: '2', type: 'text', text: '<script>alert(1)</script> words', x: 300, y: 0, width: 250, height: 100, color: '2'},
      {id: '3', type: 'file', file: 'pics/sea.png', x: 0, y: 200, width: 200, height: 200},
      {id: '4', type: 'link', url: 'https://example.com', x: 300, y: 200, width: 200, height: 80},
      {id: '5', type: 'group', label: 'Fictional', x: -20, y: -20, width: 600, height: 500},
      {id: '6', type: 'weird'}],
      edges: [{id: 'e', fromNode: '1', toNode: '2', label: 'then'}, {id: 'x', fromNode: '1', toNode: 'missing'}]});
    const out = fromJsonCanvas(file, base().notes, 'Imported', NOW, 'cv-imp00001');
    expect(out.canvas.nodes.map(n => [n.type, n.note ?? n.text ?? n.label])).toEqual([['note', 'n1'], ['text', '<script>alert(1)</script> words'], ['text', 'Photo: pics/sea.png (not in this browser)'], ['text', 'https://example.com'], ['group', 'Fictional']]);
    expect(out.canvas.nodes[1]!.color).toBe('2');
    expect(out.canvas.edges.map(e => e.label)).toEqual(['then']);
    expect(out.skipped).toBe(2);
    expect(() => fromJsonCanvas('nope', [], 'x', NOW)).toThrow('not a .canvas file');
    expect(() => fromJsonCanvas('{"edges": []}', [], 'x', NOW)).toThrow('no canvas');
  });
});
