import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {describe, expect, test} from 'vitest';
import {habitBullDay, readHabitBull, readTickmate} from './habit-apps';
import {SqliteFile, tableColumns} from './sqlite-read';
import {previewHabits, undoHabits} from './loop';
import {emptyHabitData, habitDataSchema, habitDay, type HabitData} from '../../habits';
import type {ImportBatch} from '../batches-schema';

/** Session AV lane 2 (habits; LEDGER #194): HabitBull's CSV and Tickmate's database, as Loop's open-source importers read them. Fictional data. */
const NOW = Date.parse('2026-11-22T10:00:00Z'), ctx = {now: NOW, zone: 'Europe/Amsterdam'};

/** A Tickmate-shaped SQLite file, made with Node's own SQLite (tests only), returned as its bytes. */
function tickmateFile(build: (db: DatabaseSync) => void, pageSize = 4096): Uint8Array {
  const dir = mkdtempSync(join(tmpdir(), 'zigoals-tickmate-')), path = join(dir, 'tickmate.db');
  try {
    const db = new DatabaseSync(path);
    db.exec(`PRAGMA page_size=${pageSize}; PRAGMA journal_mode=DELETE;`);
    db.exec('CREATE TABLE tracks (_id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, enabled INTEGER DEFAULT 1, description TEXT, icon TEXT, "order" INTEGER, multiple_entries_enabled INTEGER DEFAULT 0)');
    db.exec('CREATE TABLE ticks (_id INTEGER PRIMARY KEY AUTOINCREMENT, _track_id INTEGER, year INTEGER, month INTEGER, day INTEGER, hour INTEGER, minute INTEGER, second INTEGER, has_time_info INTEGER DEFAULT 0)');
    db.exec('CREATE TABLE groups (_id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, description TEXT, "order" INTEGER)');
    db.exec('CREATE TABLE track2groups (_id INTEGER PRIMARY KEY AUTOINCREMENT, _track_id INTEGER, _group_id INTEGER)');
    build(db);
    db.close();
    return new Uint8Array(readFileSync(path));
  } finally { rmSync(dir, {recursive: true, force: true}); }
}

describe('HabitBull CSV', () => {
  const CSV = ['HabitName,HabitDescription,HabitCategory,CalendarDate,Value,CommentText',
    'Fictional reading,Ten pages,Mind,2026-11-01,1,a good chapter', 'Fictional reading,Ten pages,Mind,2026-11-02,0,', 'Fictional reading,Ten pages,Mind,11/03/2026,1,',
    'Fictional push-ups,,Body,2026-11-02,25,', 'Fictional push-ups,,Body,2026-11-03,1,', 'Fictional push-ups,,Body,2026-12-30,10,', 'Fictional push-ups,,Body,03.11.2026,10,'].join('\n');
  test('habits with description and category; done days with notes; amounts make a habit count times', async () => {
    const plan = await readHabitBull(CSV, ctx);
    expect(plan.format).toBe('habitbull');
    const [reading, push] = plan.habits;
    expect(reading).toMatchObject({title: 'Fictional reading', description: 'Ten pages', category: 'Mind', startDate: '2026-11-01'});
    expect(reading!.rules[0]).toMatchObject({schedule: {kind: 'daily'}, type: 'build', measurement: {kind: 'boolean'}, target: 1});
    expect(reading!.entries.map(e => [e.date, e.count, e.note])).toEqual([['2026-11-01', 1, 'a good chapter'], ['2026-11-03', 1, '']]);
    expect(push!.rules[0]!.measurement).toEqual({kind: 'count', unit: 'times'});
    expect(push!.entries.map(e => [e.date, e.count])).toEqual([['2026-11-02', 25], ['2026-11-03', 1]]);
    expect(plan.warnings).toEqual(['HabitBull keeps no schedule in this file, so each habit comes in as every day. Change a habit’s repeat in Habits after the import if it is not daily.',
      '1 row has a date ZIGoals cannot read (it reads 2026-11-03 and 11/03/2026) and was left out.', '1 day is after today and was left out.']);
    expect(plan.summarised[0]).toBe('Habits with their description and category; each done day with its note; amounts for 1 habit that counts times. 1 day marked not done stays without a check-in.');
    // The same file gives the same ids (a second import adds nothing new).
    expect((await readHabitBull(CSV, ctx)).habits.map(h => h.id)).toEqual(plan.habits.map(h => h.id));
  });
  test('dates, and files that are not HabitBull’s', async () => {
    expect([habitBullDay('2026-1-5'), habitBullDay('01/05/2026'), habitBullDay('2026-02-30'), habitBullDay('5 Jan 2026')]).toEqual(['2026-01-05', '2026-01-05', null, null]);
    await expect(readHabitBull('Date,Mood\n2026-11-01,good', ctx)).rejects.toThrow('This is not HabitBull’s CSV export');
    await expect(readHabitBull('', ctx)).rejects.toThrow('This file is empty');
    await expect(readHabitBull('HabitName,HabitDescription,HabitCategory,CalendarDate,Value,CommentText\n,,,2026-11-01,1,', ctx)).rejects.toThrow('no habits ZIGoals can read');
  });
  test('previewed, imported and undone like the other habit imports', async () => {
    const plan = await readHabitBull(CSV, ctx);
    const r = previewHabits(emptyHabitData(), plan.habits);
    const next: HabitData = habitDataSchema.parse(r.next);
    expect(next.habits.map(h => h.title)).toEqual(['Fictional reading', 'Fictional push-ups']);
    expect(habitDay(next.habits[0]!, '2026-11-01', '2026-11-22').status).toBe('complete');
    const note = {id: crypto.randomUUID(), format: 'loop', label: 'HabitBull', at: new Date(NOW).toISOString(), counts: {}, refs: {habits: {habitIds: r.created, entries: r.entries}}} as ImportBatch;
    expect(undoHabits(next, note).habits).toEqual([]);
  });
});

describe('Tickmate database', () => {
  test('tracks become habits; each ticked day once (the month counted from 0); future, odd and orphan ticks left out', () => {
    const bytes = tickmateFile(db => {
      db.prepare('INSERT INTO tracks (name, description, "order") VALUES (?, ?, ?)').run('Fictional stretch', 'Morning', 1);
      db.prepare('INSERT INTO tracks (name, description, "order") VALUES (?, ?, ?)').run('Fictional water', null, 2);
      const tick = db.prepare('INSERT INTO ticks (_track_id, year, month, day) VALUES (?, ?, ?, ?)');
      tick.run(1, 2026, 10, 1); tick.run(1, 2026, 10, 1); tick.run(1, 2026, 10, 3); tick.run(1, 2026, 11, 25); tick.run(1, 2026, 1, 30); tick.run(9, 2026, 10, 2); tick.run(2, 2025, 0, 31);
    });
    const plan = readTickmate(bytes, ctx);
    expect(plan.habits.map(h => [h.title, h.description, h.category, h.startDate])).toEqual([['Fictional stretch', 'Morning', 'Tickmate', '2026-11-01'], ['Fictional water', '', 'Tickmate', '2025-01-31']]);
    expect(plan.habits[0]!.entries.map(e => e.date)).toEqual(['2026-11-01', '2026-11-03']);
    expect(plan.warnings.slice(1)).toEqual(['1 tick has a date ZIGoals cannot read and was left out.', '1 tick is after today and was left out.', '1 tick belongs to no track and was left out.']);
    expect(readTickmate(bytes, ctx).habits.map(h => h.id)).toEqual(plan.habits.map(h => h.id));
  });
  test('many rows across pages, long text on overflow pages, small pages too', () => {
    const long = 'A fictional, very long description. '.repeat(400);
    for (const pageSize of [512, 4096]) {
      const bytes = tickmateFile(db => {
        db.prepare('INSERT INTO tracks (name, description) VALUES (?, ?)').run('Fictional long one', long);
        const tick = db.prepare('INSERT INTO ticks (_track_id, year, month, day) VALUES (?, ?, ?, ?)');
        db.exec('BEGIN'); for (let i = 0; i < 3000; i++) { const d = new Date(Date.UTC(2018, 0, 1) + i * 86_400_000); tick.run(1, d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); } db.exec('COMMIT');
      }, pageSize);
      const db = new SqliteFile(bytes);
      expect(db.pageSize).toBe(pageSize);
      const plan = readTickmate(bytes, ctx);
      expect(plan.habits[0]!.description).toBe(long.trim().slice(0, 500).trim());
      expect(plan.habits[0]!.entries).toHaveLength(3000);
      expect(plan.habits[0]!.entries.at(-1)!.date).toBe('2026-03-19');
    }
  });
  test('not a Tickmate file, not a database, a broken one', () => {
    expect(() => readTickmate(new TextEncoder().encode('HabitName,HabitDescription'), ctx)).toThrow('This file is not an SQLite database.');
    const other = (() => { const dir = mkdtempSync(join(tmpdir(), 'zigoals-sqlite-')), path = join(dir, 'x.db'); try { const db = new DatabaseSync(path); db.exec('CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT)'); db.close(); return new Uint8Array(readFileSync(path)); } finally { rmSync(dir, {recursive: true, force: true}); } })();
    expect(() => readTickmate(other, ctx)).toThrow('This database is not a Tickmate backup');
    const cut = tickmateFile(db => { db.prepare('INSERT INTO tracks (name) VALUES (?)').run('Fictional'); }).slice(0, 4096);
    expect(() => readTickmate(cut, ctx)).toThrow(/outside the file|cannot read/);
  });
  test('a damaged file says so in plain words, every time', () => {
    const good = tickmateFile(db => { db.prepare('INSERT INTO tracks (name, description) VALUES (?, ?)').run('Fictional', 'x'.repeat(5000)); for (let i = 1; i <= 200; i++) db.prepare('INSERT INTO ticks (_track_id, year, month, day) VALUES (1, 2026, 9, ?)').run(1 + i % 28); }, 512);
    let seed = 7;
    const rand = () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };
    for (let run = 0; run < 300; run++) {
      const bad = good.slice();
      for (let k = 0; k < 6; k++) bad[100 + Math.floor(rand() * (bad.length - 100))] = Math.floor(rand() * 256);
      try { readTickmate(bad, ctx); } catch (error) { expect(error).toBeInstanceOf(Error); expect(error).not.toBeInstanceOf(RangeError); expect((error as Error).message).toMatch(/^This (?:database|file|Tickmate backup) /); }
    }
  });
  test('column names from CREATE TABLE', () => {
    expect(tableColumns('CREATE TABLE "t" (_id INTEGER PRIMARY KEY AUTOINCREMENT, [name] TEXT, "order" INTEGER, x DEFAULT (1, 2), PRIMARY KEY (x))')).toEqual({columns: ['_id', 'name', 'order', 'x'], rowidAlias: 0});
    expect(tableColumns('CREATE TABLE t (a TEXT, b INT PRIMARY KEY)')).toEqual({columns: ['a', 'b'], rowidAlias: -1});
    expect(() => tableColumns('CREATE TABLE t (a TEXT PRIMARY KEY) WITHOUT ROWID')).toThrow();
  });
});
