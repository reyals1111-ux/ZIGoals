import {expect, test} from 'vitest';
import {backupDue, backupReminderSchema, emptyBackupReminder} from './backup-reminder';
test('a calm monthly reminder: only with records, never when off, quiet for 30 days after a copy or an ask', () => {
  const r = emptyBackupReminder();
  expect(backupDue(r, '2026-10-31', false)).toBe(false);
  expect(backupDue(r, '2026-10-31', true)).toBe(true);
  expect(backupDue({...r, off: true}, '2026-10-31', true)).toBe(false);
  expect(backupDue({...r, savedOn: '2026-10-10'}, '2026-10-31', true)).toBe(false);
  expect(backupDue({...r, savedOn: '2026-09-20'}, '2026-10-31', true)).toBe(true);
  expect(backupDue({...r, askedOn: '2026-10-20'}, '2026-10-31', true)).toBe(false);
  expect(backupReminderSchema.parse({version: 1, savedOn: '2026-10-01', later: 1})).toMatchObject({later: 1});
});
