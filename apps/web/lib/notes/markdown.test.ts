import {deflateRawSync} from 'node:zlib';
import {describe, expect, test} from 'vitest';
import {buildStoredZip, crc32} from '../export/zip';
import {readStoredZip} from '../export/zip-reader';
import {applyImport, exportPaths, notesExportEntries, noteToMarkdown, parseFrontMatter, planImport, safeFileBase} from './markdown';
import {emptyNotes, notesSchema} from './schema';
import {showcaseNotes} from './showcase';
import {applyUndo, ensureDaily} from './store';
import {NOTE_ZIP_CAPS, readZip, safeEntryName} from './zip-read';

const NOW = '2026-11-01T10:00:00.000Z', DAY = '2026-11-01';
const goals = [{id: '9203', name: 'Japan adventure', href: '/app/goals/tracked/9203'}, {id: '9201', name: 'Emergency fund', href: '/app/goals/tracked/9201'}];
const habits = [{id: 'h-read', title: 'Read'}, {id: 'h-walk', title: 'Walk'}, {id: 'h-med', title: 'Meditate'}];
const enc = new TextEncoder(), dec = new TextDecoder();

/** A ZIP whose entries are deflated (method 8), as an operating system or Obsidian makes them. */
function deflatedZip(files: {name: string; text?: string; data?: Uint8Array; lie?: number}[]): Uint8Array {
  const parts: number[] = [], central: number[] = [];
  const u16 = (a: number[], n: number) => a.push(n & 255, (n >>> 8) & 255), u32 = (a: number[], n: number) => a.push(n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255);
  for (const f of files) {
    const raw = f.data ?? enc.encode(f.text ?? ''), comp = deflateRawSync(raw), name = enc.encode(f.name), offset = parts.length, size = f.lie ?? raw.length;
    u32(parts, 0x04034B50); u16(parts, 20); u16(parts, 0x0800); u16(parts, 8); u16(parts, 0); u16(parts, 0); u32(parts, crc32(raw)); u32(parts, comp.length); u32(parts, size); u16(parts, name.length); u16(parts, 0); parts.push(...name, ...comp);
    u32(central, 0x02014B50); u16(central, 20); u16(central, 20); u16(central, 0x0800); u16(central, 8); u16(central, 0); u16(central, 0); u32(central, crc32(raw)); u32(central, comp.length); u32(central, size); u16(central, name.length); u16(central, 0); u16(central, 0); u16(central, 0); u16(central, 0); u32(central, 0); u32(central, offset); central.push(...name);
  }
  const out = [...parts], cdOffset = out.length; out.push(...central);
  u32(out, 0x06054B50); u16(out, 0); u16(out, 0); u16(out, files.length); u16(out, files.length); u32(out, central.length); u32(out, cdOffset); u16(out, 0);
  return new Uint8Array(out);
}

describe('front-matter is read as plain text, never run', () => {
  test('strings, quoted strings, inline and block lists', () => {
    const {data, body} = parseFrontMatter('---\ntitle: "Japan: \\"ideas\\""\ntags: [travel, "big trip"]\naliases:\n  - JP\n  - Nippon\nday: 2026-11-01 # a comment\nwho: \'it\'\'s me\'\n---\nBody [[Link]]\n');
    expect({...data}).toEqual({title: 'Japan: "ideas"', tags: ['travel', 'big trip'], aliases: ['JP', 'Nippon'], day: '2026-11-01', who: "it's me"});
    expect(body).toBe('Body [[Link]]\n');
  });
  test('no prototype pollution, no YAML tags or code: values stay strings; odd keys are dropped', () => {
    const {data} = parseFrontMatter('---\n__proto__: {"polluted": true}\nconstructor: x\nprototype: y\n!!js/function: "function(){}"\nnow: !!js/eval process.exit()\nanchor: &a value\nref: *a\n"quoted key": v\n---\n');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(data)).toBeNull();
    expect(Object.keys(data).sort()).toEqual(['anchor', 'now', 'ref']);
    expect(data.now).toBe('!!js/eval process.exit()');
    expect(data.ref).toBe('*a');
  });
  test('a huge or unclosed front-matter is not front-matter; text without it is all body', () => {
    const huge = `---\n${'k: v\n'.repeat(3000)}---\nBody`;
    expect(parseFrontMatter(huge).body).toBe(huge);
    expect(parseFrontMatter('---\ntitle: x\nno close').body).toBe('---\ntitle: x\nno close');
    expect(parseFrontMatter('Just words').body).toBe('Just words');
    expect(Object.keys(parseFrontMatter(`---\n${Array.from({length: 100}, (_, i) => `k${i}: v`).join('\n')}\n---\n`).data)).toHaveLength(60);
  });
});

describe('Markdown export is Obsidian-friendly (B5)', () => {
  test('safe file names on every system', () => {
    expect(safeFileBase('a/b\\c:d*e?f"g<h>i|j#k^l[m]n')).toBe('a b c d e f g h i j k l m n');
    expect(safeFileBase('...hidden. ')).toBe('hidden');
    expect(safeFileBase('CON')).toBe('CON note');
    expect(safeFileBase('')).toBe('Untitled note');
    expect(safeFileBase('x'.repeat(300))).toHaveLength(100);
  });
  test('folders by kind, daily notes by their day, repeated names numbered', () => {
    const s = showcaseNotes(DAY);
    const paths = [...exportPaths(s.notes).values()];
    expect(paths).toContain(`Daily/${DAY}.md`);
    expect(paths).toContain('Notes/Japan trip ideas.md');
    expect(paths.filter(p => p.startsWith('Inbox/'))).toHaveLength(2);
    const twice = exportPaths([...s.notes.slice(0, 1), {...s.notes[0]!, id: 'other'}]);
    expect([...twice.values()]).toEqual(['Notes/Japan trip ideas.md', 'Notes/Japan trip ideas 2.md']);
  });
  test('front-matter, links kept as [[…]], photos as attachments, goal and habit stubs; a stored ZIP every reader opens', () => {
    const s = showcaseNotes(DAY);
    const withPhoto = {...s, notes: s.notes.map(n => n.id === 'showcase-note-books' ? {...n, photoId: 'ph-1'} : n)};
    const entries = notesExportEntries(withPhoto, {goals, habits}, {now: new Date(NOW), photos: new Map([['ph-1', {data: new Uint8Array([1, 2, 3]), type: 'image/webp'}]])});
    const zip = readStoredZip(buildStoredZip(entries));
    const names = zip.map(e => e.name);
    expect(names).toContain('attachments/ph-1.webp');
    expect(names).toContain('ZIGoals/Goals/Japan adventure.md');
    expect(names).toContain('ZIGoals/Habits/Walk.md');
    const japan = dec.decode(zip.find(e => e.name === 'Notes/Japan trip ideas.md')!.data);
    expect(japan.startsWith('---\ntitle: "Japan trip ideas"\nzigoals-id: showcase-note-japan\ntype: topic\n')).toBe(true);
    expect(japan).toContain('For [[Japan adventure]].');
    expect(japan).toContain('tags: ["travel"]');
    const books = dec.decode(zip.find(e => e.name === 'Notes/Books to read.md')!.data);
    expect(books).toContain('photo: "ph-1.webp"');
    expect(books.trimEnd().endsWith('![[ph-1.webp]]')).toBe(true);
  });
  test('round trip: export, wipe, import gives back every note with its words, links, kind, day and tags', () => {
    const s = showcaseNotes(DAY);
    const files = readStoredZip(buildStoredZip(notesExportEntries(s, {goals, habits}, {now: new Date(NOW)}))).map(f => ({name: f.name, data: f.data}));
    const plan = planImport(emptyNotes(), files, NOW, DAY);
    expect(plan.skipped.filter(x => x.reason.includes('stub'))).toHaveLength(5);
    expect(plan.add).toHaveLength(s.notes.length);
    const back = applyImport(emptyNotes(), plan, NOW).record;
    const strip = (n: (typeof s.notes)[number]) => ({kind: n.kind, title: n.kind === 'inbox' ? '' : n.title, body: n.body, day: n.day, tags: n.tags, createdAt: n.createdAt});
    expect(back.notes.map(n => ({...strip(n), title: n.kind === 'inbox' ? '' : n.title})).sort((a, b) => a.body.localeCompare(b.body))).toEqual(s.notes.map(strip).sort((a, b) => a.body.localeCompare(b.body)));
    // Importing the same files onto the notes they came from adds nothing.
    expect(planImport(s, files, NOW, DAY).add).toHaveLength(0);
  });
  test('a single note survives a round trip with a tricky title', () => {
    const note = {id: 'n1', kind: 'topic' as const, title: 'Plan: "A" & [B] #1', body: 'line\n---\nmore', createdAt: NOW};
    const plan = planImport(emptyNotes(), [{name: 'x.md', data: enc.encode(noteToMarkdown(note))}], NOW, DAY);
    expect(plan.add[0]).toMatchObject({title: 'Plan: "A" & [B] #1', body: 'line\n---\nmore\n'.trimEnd()});
  });
});

describe('Markdown import is careful (B5)', () => {
  test('plain .md files: the name is the title; an ISO name is a daily note; a day already noted gets the words added', () => {
    const start = ensureDaily(emptyNotes(), DAY, NOW).record;
    const plan = planImport(start, [{name: 'Ideas.md', data: enc.encode('# Ideas\nSee [[Japan adventure]]')}, {name: `${DAY}.md`, data: enc.encode('From Obsidian')}, {name: '2026-10-30.md', data: enc.encode('Older day')}], NOW, DAY);
    expect(plan.add.map(n => [n.kind, n.title])).toEqual([['topic', 'Ideas'], ['daily', '2026-10-30']]);
    expect(plan.append).toEqual([{id: start.notes[0]!.id, name: DAY, text: 'From Obsidian'}]);
    const done = applyImport(start, plan, NOW);
    expect(done.record.notes.find(n => n.day === DAY)?.body).toBe('From Obsidian');
    const undone = applyUndo(done.record, done.undo);
    expect(undone.notes).toHaveLength(1);
    expect(undone.notes[0]!.body).toBe('');
  });
  test('skips what it should, with a reason: not text, too large, too long, a stub, a bad day; a clash gets "(imported)"', () => {
    const start = {...emptyNotes(), notes: [{id: 'a', kind: 'topic' as const, title: 'Ideas', body: 'mine', createdAt: NOW}]};
    const plan = planImport(start, [
      {name: 'pic.png', data: new Uint8Array([1])},
      {name: 'big.md', data: new Uint8Array(600 * 1024)},
      {name: 'long.md', data: enc.encode('x'.repeat(20_001))},
      {name: 'stub.md', data: enc.encode('---\nzigoals-stub: goal\n---\n')},
      {name: 'bad.md', data: enc.encode('---\ntype: daily\nday: someday\n---\nx')},
      {name: 'Ideas.md', data: enc.encode('theirs')},
    ], NOW, DAY);
    expect(plan.skipped.map(s => s.name)).toEqual(['pic.png', 'big.md', 'long.md', 'stub.md', 'bad.md']);
    expect(plan.add.map(n => n.title)).toEqual(['Ideas (imported)']);
  });
  test('control characters are removed and a script stays plain words', () => {
    const plan = planImport(emptyNotes(), [{name: 'x.md', data: enc.encode('a\u0000b\u0007c <script>alert(1)</script>')}], NOW, DAY);
    expect(plan.add[0]!.body).toBe('abc <script>alert(1)</script>');
    expect(notesSchema.safeParse(applyImport(emptyNotes(), plan, NOW).record).success).toBe(true);
  });
  test('the note cap holds: only the room left is filled', () => {
    const full = {...emptyNotes(), notes: Array.from({length: 1999}, (_, i) => ({id: `n${i}`, kind: 'topic' as const, title: `T${i}`, body: '', createdAt: NOW}))};
    const plan = planImport(full, [{name: 'a.md', data: enc.encode('a')}, {name: 'b.md', data: enc.encode('b')}], NOW, DAY);
    expect(plan.add).toHaveLength(1);
    expect(plan.skipped[0]!.reason).toMatch(/full/);
  });
});

describe('the ZIP reader holds its caps (B5)', () => {
  test('reads deflated and stored entries; skips folders, hidden files, __MACOSX and names that leave the archive', async () => {
    const z = deflatedZip([{name: 'Vault/Ideas.md', text: '# Ideas'}, {name: 'Vault/.obsidian/app.md', text: 'x'}, {name: '__MACOSX/Vault/._Ideas.md', text: 'x'}, {name: '../evil.md', text: 'x'}, {name: 'Vault/pic.png', text: 'x'}]);
    const out = await readZip(z, n => n.endsWith('.md'));
    expect(out.files.map(f => [f.name, dec.decode(f.data)])).toEqual([['Vault/Ideas.md', '# Ideas']]);
    const stored = await readZip(buildStoredZip([{name: 'A.md', data: 'stored', modified: new Date(NOW)}]), () => true);
    expect(dec.decode(stored.files[0]!.data)).toBe('stored');
    expect(['/abs.md', 'C:/x.md', 'a/../b.md', 'a//b.md', 'dir/'].map(safeEntryName)).toEqual([null, null, null, null, null]);
  });
  test('a zip bomb is refused by ratio, by declared size and by REAL size while inflating', async () => {
    const zeros = new Uint8Array(5 * 1024 * 1024);
    const bomb = await readZip(deflatedZip([{name: 'bomb.md', data: zeros}]), () => true);
    expect(bomb.files).toHaveLength(0);
    expect(bomb.skipped[0]!.reason).toMatch(/larger than|compressed more/);
    // It lies about its size: the declared size passes, the inflation stops at the cap.
    const liar = await readZip(deflatedZip([{name: 'liar.md', data: zeros, lie: 1000}]), () => true, {caps: {...NOTE_ZIP_CAPS, maxRatio: 1e9}});
    expect(liar.files).toHaveLength(0);
    expect(liar.skipped[0]!.reason).toMatch(/larger than/);
  });
  test('caps on the archive, the entry count, and damage', async () => {
    await expect(readZip(new Uint8Array(NOTE_ZIP_CAPS.maxArchive + 1), () => true)).rejects.toThrow(/over 25 MB/);
    await expect(readZip(enc.encode('not a zip at all, just words'), () => true)).rejects.toThrow(/not a ZIP/);
    const many = buildStoredZip(Array.from({length: 30}, (_, i) => ({name: `n${i}.md`, data: 'x', modified: new Date(NOW)})));
    await expect(readZip(many, () => true, {caps: {...NOTE_ZIP_CAPS, maxEntries: 10}})).rejects.toThrow(/more than 10/);
    const z = buildStoredZip([{name: 'a.md', data: 'hello', modified: new Date(NOW)}]);
    z[30 + 'a.md'.length] = 'j'.charCodeAt(0); // a changed byte: the CRC no longer matches
    expect((await readZip(z, () => true)).skipped[0]!.reason).toMatch(/damaged/);
  });
});
