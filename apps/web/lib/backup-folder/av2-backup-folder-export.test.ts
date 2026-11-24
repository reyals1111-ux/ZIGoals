import {describe, expect, test} from 'vitest';
import {BACKUP_REMINDER_KEY, backupReminderSchema, type BackupReminder} from '../backup-reminder';
import {buildEverythingZip, collectEverything} from '../export/everything';
import {openBackup} from '../restore/read-backup';
import {nextValue, planParts, type PlannedPart} from '../restore/plan';

// Session AV lane 2 (N6 #193; TIER 3 (stored format)): the schedule is part of the backup reminder's record, so Export
// everything carries it and a restore gives it back. (The folder itself is a browser handle and stays on the device.)
const r = (more: Partial<BackupReminder> = {}): BackupReminder => backupReminderSchema.parse({version: 1, ...more});
describe('Export everything keeps the schedule; a restore leaves it to the device, as before', () => {
  const NOW = new Date('2026-11-22T09:00:00.000Z'), APP = {now: NOW, version: '0.0.0-test', commit: 'abc1234', localSimulation: null};
  test('the file holds the record field for field; "Restore from a backup" brings back no reminder or schedule (a device choice, unchanged)', async () => {
    const rec = r({savedOn: '2026-11-20', schedule: {every: 'week', folder: 'Backups', lastOn: '2026-11-20'}});
    const zip = buildEverythingZip(collectEverything({[BACKUP_REMINDER_KEY]: JSON.stringify(rec)}, APP), {date: '2026-11-22', showcase: false, now: NOW});
    const backup = await openBackup(new Blob([zip.bytes as Uint8Array<ArrayBuffer>]));
    const found: unknown[] = [];
    const walk = (v: unknown) => { if (!v || typeof v !== 'object') return; if ((v as {schedule?: unknown}).schedule !== undefined && (v as {version?: unknown}).version === 1) found.push(v); for (const x of Object.values(v)) walk(x); };
    walk(backup.json);
    expect(found.map(v => backupReminderSchema.parse(v))).toEqual([rec]);
    const parts: PlannedPart[] = planParts(backup.json);
    expect(parts.filter(p => p.kind === 'device' && p.key === BACKUP_REMINDER_KEY)).toEqual([]);
    void nextValue;
  });
});
