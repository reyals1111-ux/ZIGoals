import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {KEYS, PHOTO_WEBP_BASE64, TARGETS, buildHeavyProfile, everythingJson, heavyProfileZip, type HeavyRecordName} from './generate.mjs';
import {platformSchema} from '../../apps/web/lib/positions';
import {habitDataSchema} from '../../apps/web/lib/habits';
import {healthSchema} from '../../apps/web/lib/health';
import {portfolioDataSchema} from '../../apps/web/lib/portfolio/schema';
import {moneyLogSchema, MAX_ENTRIES as MAX_MONEY_ENTRIES} from '../../apps/web/lib/money-log/schema';
import {accountsSchema} from '../../apps/web/lib/accounts/schema';
import {budgetsSchema} from '../../apps/web/lib/budgets/schema';
import {billsSchema} from '../../apps/web/lib/bills/schema';
import {MAX_TASKS, tasksSchema} from '../../apps/web/lib/tasks/schema';
import {journalSchema} from '../../apps/web/lib/journal/schema';
import {MAX_JOURNAL_MEDIA} from '../../apps/web/lib/journal/media';
import {energySchema} from '../../apps/web/lib/energy/schema';
import {workoutsSchema} from '../../apps/web/lib/workouts/schema';
import {notesSchema} from '../../apps/web/lib/notes/schema';
import {averageGoalsSchema} from '../../apps/web/lib/average-goals/store';
import {PRIVATE_MAX_BYTES, parsePrivateData} from '../../apps/web/lib/private-storage';
import {EVERYTHING_KEYS} from '../../apps/web/lib/export/everything';
import {openBackup} from '../../apps/web/lib/restore/read-backup';
import {MAX_DEVICE_PART_CHARS, planParts} from '../../apps/web/lib/restore/plan';
import {indexMedia, mediaTarget, bytesMatch} from '../../apps/web/lib/restore/media';
import {imageSize} from '../../apps/web/lib/image-header';

// Session AX (heavy profile, test-only): the generator is deterministic, meets its counts, and writes only records the
// app's own schemas, private-store reader and restore reader accept; nothing the app ships imports it.
const END = '2026-11-26';
const profile = buildHeavyProfile({end: END});
/** The app's zod schema type, named without importing zod (not resolvable from scripts/). */
type Schema = Parameters<typeof parsePrivateData>[1];
const SCHEMAS: Record<HeavyRecordName, Schema> = {
  platform: platformSchema as Schema, habits: habitDataSchema as Schema, health: healthSchema as Schema, portfolio: portfolioDataSchema,
  moneyLog: moneyLogSchema, accounts: accountsSchema, budgets: budgetsSchema, bills: billsSchema, tasks: tasksSchema, journal: journalSchema, energy: energySchema,
  workouts: workoutsSchema, notes: notesSchema, averageGoals: averageGoalsSchema,
};

describe('heavy profile generator', () => {
  test('is deterministic: the same seed and end day give the same bytes; another seed does not', () => {
    const again = buildHeavyProfile({end: END});
    expect(again.storage).toEqual(profile.storage);
    expect(heavyProfileZip(again).equals(heavyProfileZip(profile))).toBe(true);
    expect(buildHeavyProfile({end: END, seed: 7}).storage[KEYS.moneyLog]).not.toBe(profile.storage[KEYS.moneyLog]);
  });

  test('spans two years ending on the run day, with the counts asked for (tasks at the app cap)', () => {
    const c = profile.counts;
    expect(profile.start).toBe('2024-11-27');
    expect(c.moneyEntries).toBeGreaterThanOrEqual(9500); expect(c.moneyEntries).toBeLessThanOrEqual(MAX_MONEY_ENTRIES);
    expect(c.importedMoneyEntries).toBeGreaterThan(1000); expect(c.accounts).toBeGreaterThanOrEqual(4); expect(c.budgets).toBeGreaterThan(5); expect(c.bills).toBeGreaterThan(5);
    expect(c.tasks).toBe(MAX_TASKS); expect(c.doneTasks).toBeGreaterThan(50); expect(c.repeatingTasks).toBeGreaterThan(20); expect(c.taskComments).toBeGreaterThan(10); expect(c.projects).toBeGreaterThan(3);
    expect(c.journalEntries).toBe(TARGETS.journalEntries); expect(c.journalPhotos).toBe(TARGETS.journalPhotos); expect(c.journalPhotos).toBeLessThanOrEqual(MAX_JOURNAL_MEDIA);
    expect(c.foodLogs).toBe(TARGETS.foodLogs); expect(c.sleepNights).toBe(365); expect(c.moodDays).toBe(365); expect(c.workouts).toBe(TARGETS.workouts);
    expect(c.habits).toBe(8); expect(c.habitCheckIns).toBeGreaterThan(1500); expect(c.notes).toBe(TARGETS.notes); expect(c.markdownNotes).toBeGreaterThan(50); expect(c.goals).toBe(6);
    const money = profile.records.moneyLog.entries as {date: string}[];
    expect(money[0]!.date >= profile.start && money.at(-1)!.date <= END).toBe(true);
    expect((profile.records.journal.entries as {date: string}[]).at(-1)!.date <= END).toBe(true);
  });

  test('every record passes the app’s own schema, nothing is dropped on read, and the private modules fit their 2 MB', () => {
    for (const [name, schema] of Object.entries(SCHEMAS) as [HeavyRecordName, Schema][]) {
      const raw = profile.storage[KEYS[name]]!;
      const parsed = schema.safeParse(JSON.parse(raw));
      expect(parsed.success, `${name}: ${parsed.success ? '' : JSON.stringify(parsed.error.issues.slice(0, 3))}`).toBe(true);
      expect(EVERYTHING_KEYS).toContain(KEYS[name]);
    }
    // Lists the tolerant schemas filter (tasks, notes, journal) keep every generated item.
    expect(tasksSchema.parse(profile.records.tasks).tasks).toHaveLength(profile.counts.tasks!);
    expect(notesSchema.parse(profile.records.notes).notes).toHaveLength(profile.counts.notes!);
    expect(journalSchema.parse(profile.records.journal).entries.flatMap(e => e.photos ?? [])).toHaveLength(profile.counts.journalPhotos!);
    for (const name of ['platform', 'habits', 'health'] as const) {
      expect(new TextEncoder().encode(profile.storage[KEYS[name]]!).byteLength).toBeLessThanOrEqual(PRIVATE_MAX_BYTES);
      expect(() => parsePrivateData(profile.storage[KEYS[name]]!, SCHEMAS[name])).not.toThrow();
    }
    // Chromium keeps about 5.2 million characters of localStorage per origin (measured, Session AX).
    expect(profile.chars).toBeLessThan(5_200_000);
  });

  test('the ZIP is an Export everything that Restore opens and plans without a problem, photos included', async () => {
    const zip = heavyProfileZip(profile);
    const opened = await openBackup(new Blob([new Uint8Array(zip)]));
    expect(opened.demo).toBe(false);
    expect(opened.json).toEqual(JSON.parse(JSON.stringify(everythingJson(profile))));
    const planned = planParts(opened.json);
    const ours = planned.filter(p => p.value !== undefined || p.problem);
    expect(ours.filter(p => p.problem).map(p => `${p.name}: ${p.problem}`)).toEqual([]);
    expect(ours.map(p => p.name).sort()).toEqual(['accounts', 'averageGoals', 'bills', 'budgets', 'energy', 'finance', 'habits', 'health', 'journal', 'moneyLog', 'notes', 'portfolio', 'tasks', 'workouts'].sort());
    for (const p of ours) expect(JSON.stringify(p.value).length).toBeLessThanOrEqual(MAX_DEVICE_PART_CHARS);
    expect(opened.media).toHaveLength(profile.photoIds.length);
    const index = indexMedia({journal: journalSchema.parse(profile.records.journal)});
    const photo = new Uint8Array(Buffer.from(PHOTO_WEBP_BASE64, 'base64'));
    expect(imageSize(photo)).toEqual({width: 1, height: 1, type: 'image/webp'});
    for (const entry of opened.media ?? []) {
      const target = mediaTarget(entry.name, index);
      expect(target, entry.name).toMatchObject({store: 'journal', kind: 'photo', type: 'image/webp'});
      expect(bytesMatch(photo, target!.type)).toBe(true);
    }
  });

  test('artifact check: nothing the app ships imports scripts/heavy-profile (only the Playwright helper does)', () => {
    const web = resolve(fileURLToPath(new URL('../../apps/web', import.meta.url)));
    const skip = new Set(['node_modules', '.next', '.open-next', '.wrangler', 'test-results', 'playwright-report']);
    const importers: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (skip.has(name)) continue;
        const path = join(dir, name), stat = statSync(path);
        if (stat.isDirectory()) walk(path);
        else if (/\.(?:[cm]?[jt]sx?)$/.test(name) && /heavy-profile\/generate|scripts\/heavy-profile/.test(readFileSync(path, 'utf8'))) importers.push(relative(web, path));
      }
    };
    walk(web);
    expect(importers).toEqual(['tests/helpers/heavy-profile.ts']);
  });
});
