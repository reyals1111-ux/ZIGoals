import {describe, expect, test} from 'vitest';
import {emptyNotes, MAX_BODY, MAX_NOTES, noteName, notesSchema, type Note, type Notes} from './schema';
import {addTopic, applyUndo, captureInto, dailyNoteOf, ensureDaily, fileNote, inboxOf, removeNote, updateNote, NOTES_FULL, NOTES_TOO_BIG} from './store';
import {backlinks, backlinkSnippet, completeLink, linkIndex, linkQueryAt, outgoing, parseLinks, resolveLink, suggestLinks} from './links';
import {buildGraph, layoutStarSystem, neighbours, MAX_DRAWN} from './graph';
import {showcaseNotes} from './showcase';
import {notesPackLines} from './pack';

const NOW = '2026-11-01T10:00:00.000Z', DAY = '2026-11-01';
const goals = [{id: '9203', name: 'Japan adventure', href: '/app/goals/tracked/9203'}, {id: '9201', name: 'Emergency fund', href: '/app/goals/tracked/9201'}];
const habits = [{id: 'h-read', title: 'Read'}, {id: 'h-walk', title: 'Walk'}, {id: 'h-med', title: 'Meditate'}];
const topic = (r: Notes, title: string, body = '') => addTopic(r, {title, body, now: NOW});

describe('capture inbox (B1)', () => {
  test('words, a photo, or both land in the inbox; nothing empty', () => {
    const a = captureInto(emptyNotes(), {text: '  Buy a rail pass \r\n', day: DAY, now: NOW});
    expect(a.note).toMatchObject({kind: 'inbox', body: 'Buy a rail pass', day: DAY, source: 'text'});
    const b = captureInto(a.record, {photoId: 'p-1', day: DAY, now: NOW});
    expect(b.note).toMatchObject({source: 'photo', photoId: 'p-1', body: ''});
    expect(noteName(b.note)).toBe('Photo or empty capture');
    expect(() => captureInto(b.record, {text: '   ', day: DAY, now: NOW})).toThrow(/a few words/);
    expect(() => captureInto(b.record, {text: 'x'.repeat(MAX_BODY + 1), day: DAY, now: NOW})).toThrow(/at most/);
    expect(inboxOf(b.record)).toHaveLength(2);
  });
  test('caps: count and total size refuse with a plain sentence, nothing written', () => {
    const full: Notes = {...emptyNotes(), notes: Array.from({length: MAX_NOTES}, (_, i) => ({id: `n${i}`, kind: 'topic' as const, title: `T${i}`, body: '', createdAt: NOW}))};
    expect(() => captureInto(full, {text: 'one more', day: DAY, now: NOW})).toThrow(NOTES_FULL);
    const big: Notes = {...emptyNotes(), notes: Array.from({length: 80}, (_, i) => ({id: `b${i}`, kind: 'topic' as const, title: `B${i}`, body: 'y'.repeat(19_000), createdAt: NOW}))};
    expect(() => captureInto(big, {text: 'z'.repeat(5000), day: DAY, now: NOW})).toThrow(NOTES_TOO_BIG);
  });
  test('filing into a daily note appends and removes the capture; Undo brings it back and removes the new daily', () => {
    const c = captureInto(emptyNotes(), {text: 'Rail pass in March', day: DAY, now: NOW});
    const f = fileNote(c.record, c.note.id, {kind: 'daily', day: DAY}, NOW);
    expect(inboxOf(f.record)).toHaveLength(0);
    expect(dailyNoteOf(f.record, DAY)?.body).toBe('Rail pass in March');
    const back = applyUndo(f.record, f.undo);
    expect(inboxOf(back).map(n => n.id)).toEqual([c.note.id]);
    expect(dailyNoteOf(back, DAY)).toBeNull();
  });
  test('filing into an existing note keeps its words first; to a goal or habit it becomes a linked topic note', () => {
    let r = topic(emptyNotes(), 'Japan trip ideas', 'Kyoto').record;
    const target = r.notes[0]!;
    const c = captureInto(r, {text: 'Rail pass', day: DAY, now: NOW}); r = c.record;
    const f = fileNote(r, c.note.id, {kind: 'note', id: target.id}, NOW);
    expect(f.record.notes.find(n => n.id === target.id)?.body).toBe('Kyoto\n\nRail pass');
    expect(applyUndo(f.record, f.undo).notes.find(n => n.id === target.id)?.body).toBe('Kyoto');
    const g = captureInto(f.record, {text: 'Save 50 a week', day: DAY, now: NOW});
    const toGoal = fileNote(g.record, g.note.id, {kind: 'goal', name: 'Japan adventure'}, NOW);
    const filed = toGoal.record.notes.find(n => n.id === g.note.id)!;
    expect(filed).toMatchObject({kind: 'topic', title: 'Save 50 a week'});
    expect(filed.body.startsWith('[[Japan adventure]]')).toBe(true);
    const index = linkIndex({notes: toGoal.record.notes, goals, habits});
    expect(backlinks(toGoal.record.notes, {kind: 'goal', id: '9203'}, index).map(n => n.id)).toContain(g.note.id);
    expect(applyUndo(toGoal.record, toGoal.undo).notes.find(n => n.id === g.note.id)?.kind).toBe('inbox');
  });
  test('a photo capture filed into a note that has a photo stays its own note, linked from there (no photo lost)', () => {
    let r = topic(emptyNotes(), 'Trip').record;
    r = updateNote(r, r.notes[0]!.id, {photoId: 'p-old'}, NOW);
    const c = captureInto(r, {text: 'Station map', photoId: 'p-new', day: DAY, now: NOW});
    const f = fileNote(c.record, c.note.id, {kind: 'note', id: r.notes[0]!.id}, NOW);
    expect(f.record.notes.find(n => n.id === c.note.id)).toMatchObject({kind: 'topic', photoId: 'p-new'});
    expect(f.record.notes.find(n => n.title === 'Trip')?.body).toContain('[[Station map]]');
  });
  test('delete with Undo; a daily note keeps its day as its title', () => {
    const d = ensureDaily(emptyNotes(), DAY, NOW);
    expect(ensureDaily(d.record, DAY, NOW).created).toBe(false);
    const renamed = updateNote(d.record, d.note.id, {title: 'Something else', body: 'Hello'}, NOW);
    expect(renamed.notes[0]).toMatchObject({title: DAY, body: 'Hello'});
    const removed = removeNote(renamed, d.note.id);
    expect(removed.record.notes).toHaveLength(0);
    expect(applyUndo(removed.record, removed.undo).notes[0]?.body).toBe('Hello');
  });
});

describe('[[links]], autocomplete and backlinks (B3)', () => {
  test('parses plain, aliased, heading and embed links; ignores broken ones', () => {
    const links = parseLinks('See [[Japan adventure]], [[Read|reading]], [[Books to read#2024]] and ![[photo.webp]]; not [[ ]] or [[a\nb]].');
    expect(links.map(l => [l.target, l.alias, l.heading, l.embed])).toEqual([['Japan adventure', null, null, false], ['Read', 'reading', null, false], ['Books to read', null, '2024', false], ['photo.webp', null, null, true]]);
  });
  test('resolves by name, case and spaces aside: notes, then goals, then habits; open links stay open', () => {
    const r = topic(topic(emptyNotes(), 'Read').record, 'Ideas', 'About [[read]] and [[JAPAN  adventure]] and [[Walk]] and [[Nowhere]]').record;
    const index = linkIndex({notes: r.notes, goals, habits});
    expect(resolveLink(index, 'read')?.kind).toBe('note');
    const out = outgoing(r.notes[1]!, index);
    expect(out.targets.map(t => t.kind)).toEqual(['note', 'goal', 'habit']);
    expect(out.open).toEqual(['Nowhere']);
  });
  test('a daily note is reached by its day', () => {
    const d = ensureDaily(emptyNotes(), DAY, NOW).record;
    const r = topic(d, 'Plan', `Back on [[${DAY}]]`).record;
    const index = linkIndex({notes: r.notes});
    expect(backlinks(r.notes, {kind: 'note', id: r.notes[0]!.id}, index).map(n => n.title)).toEqual(['Plan']);
  });
  test('backlinks never list the note itself; the snippet is the linking line', () => {
    const r = topic(topic(emptyNotes(), 'A', 'self [[A]]').record, 'B', 'intro\nwhy [[A]] matters\nend').record;
    const index = linkIndex({notes: r.notes});
    const a = r.notes[0]!;
    expect(backlinks(r.notes, {kind: 'note', id: a.id}, index).map(n => n.title)).toEqual(['B']);
    expect(backlinkSnippet(r.notes[1]!, {kind: 'note', id: a.id}, index)).toBe('why [[A]] matters');
  });
  test('autocomplete: the query after an open [[, suggestions ranked, completion closes the link', () => {
    expect(linkQueryAt('Saving for [[Jap', 16)).toEqual({query: 'Jap', start: 11});
    expect(linkQueryAt('Done [[Japan]] now', 18)).toBeNull();
    expect(linkQueryAt('[[a\nb', 5)).toBeNull();
    const index = linkIndex({notes: topic(emptyNotes(), 'Japan trip ideas').record.notes, goals, habits});
    expect(suggestLinks(index, 'jap').map(t => t.name)).toEqual(['Japan trip ideas', 'Japan adventure']);
    expect(suggestLinks(index, 'fund').map(t => t.name)).toEqual(['Emergency fund']);
    expect(suggestLinks(index, '', 3)).toHaveLength(3);
    expect(completeLink('Saving for [[Jap]] soon', 11, 16, 'Japan adventure')).toEqual({text: 'Saving for [[Japan adventure]] soon', caret: 30});
    expect(completeLink('x [[Re', 2, 6, 'Re|ad]]')).toEqual({text: 'x [[Re ad]]', caret: 11});
  });
});

describe('graph as a star system (B3)', () => {
  test('the most linked name is the star; neighbours orbit on ring 1; the unlinked sit on the outer belt; all inside', () => {
    const s = showcaseNotes(DAY);
    const index = linkIndex({notes: s.notes, goals, habits});
    const g = buildGraph(s.notes, index);
    expect(g.nodes.some(n => n.kind === 'goal' && n.name === 'Japan adventure')).toBe(true);
    expect(g.nodes.some(n => n.name === 'Emergency fund')).toBe(true);
    const layout = layoutStarSystem(g, 600);
    const star = layout.nodes[0]!;
    expect(star).toMatchObject({x: 300, y: 300, ring: 0});
    expect(star.degree).toBe(Math.max(...g.nodes.map(n => n.degree)));
    for (const n of layout.nodes) { expect(n.x - n.r).toBeGreaterThanOrEqual(0); expect(n.x + n.r).toBeLessThanOrEqual(600); expect(n.y - n.r).toBeGreaterThanOrEqual(0); expect(n.y + n.r).toBeLessThanOrEqual(600); }
    for (const n of neighbours(g, star.key)) expect(layout.nodes.find(p => p.key === n.key)!.ring).toBe(1);
    const lone = layout.nodes.filter(n => n.degree === 0);
    for (const n of lone) expect(n.ring).toBe(layout.rings.length);
    // Same notes, same sky.
    expect(layoutStarSystem(buildGraph(s.notes, index), 600)).toEqual(layout);
  });
  test('nothing to draw is an empty layout; past 300 bodies the rest are counted, not drawn', () => {
    expect(layoutStarSystem({nodes: [], edges: []}).nodes).toEqual([]);
    const notes: Note[] = Array.from({length: MAX_DRAWN + 5}, (_, i) => ({id: `x${i}`, kind: 'topic', title: `N${i}`, body: '', createdAt: NOW}));
    const l = layoutStarSystem(buildGraph(notes, linkIndex({notes})));
    expect(l.nodes).toHaveLength(MAX_DRAWN);
    expect(l.cut).toBe(5);
  });
});

describe('Showcase and NOVA packing', () => {
  test('the Showcase notes parse, are labelled, and have an inbox to file', () => {
    const s = showcaseNotes(DAY);
    expect(notesSchema.safeParse(s).success).toBe(true);
    expect(s.notes.every(n => n.example && n.body.includes('SHOWCASE DATA'))).toBe(true);
    expect(inboxOf(s)).toHaveLength(2);
    expect(dailyNoteOf(s, DAY)).not.toBeNull();
  });
  test('pack lines fit the budget, put matching notes first and leave the inbox out unless asked', () => {
    const s = showcaseNotes(DAY);
    const p = notesPackLines(s.notes, {budget: 600, question: 'What did I write about books?'});
    expect(p.lines.join('\n').length).toBeLessThanOrEqual(600);
    expect(p.lines[0]).toMatch(/Japan trip ideas/); // pinned first
    expect(p.lines.some(l => l.includes('Books to read'))).toBe(true);
    expect(p.lines.some(l => l.startsWith('- Inbox'))).toBe(false);
    expect(notesPackLines(s.notes, {includeInbox: true, budget: 99_999}).lines.some(l => l.startsWith('- Inbox'))).toBe(true);
  });
});
