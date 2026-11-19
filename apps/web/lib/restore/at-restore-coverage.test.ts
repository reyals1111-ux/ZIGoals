import {expect, test} from 'vitest';
import {DEVICE_KEYS} from '../export/everything';
import {RESTORE_KEYS} from './apply';

/**
 * Session AT (ADR-043 D12, trust pass 2(a)): every record Export everything writes is either one "Restore from a backup"
 * brings back (and the encrypted backup carries: lib/vault/backup-records.ts uses the same plan), or one Session AL's plan
 * deliberately leaves on the device, named here by why. A new record in neither list fails this test, so a friend's new
 * kind of record can never be silently left out of their backup.
 */
const NOT_RESTORED: Record<string, readonly string[]> = {
  'keys, secrets and linked addresses': ['zigoals:linked-wallets:v1', 'zigoals:wallet-names:v1', 'zigoals:wallet-balances:v1', 'zigoals:push:v1', 'zigoals:notify:v1'],
  'ZIGi and NOVA settings, usage and working state': ['zigoals:ai:v1', 'zigoals:ai-options:v1', 'zigoals:ai-usage:v1', 'zigoals:ai-actions:v1', 'zigoals:zigi:v1', 'zigoals:zigi-reminders:v1', 'zigoals:zigi-knock:v1', 'zigoals:zigi-suggestions:v1', 'zigoals:zigi-voice:v1', 'zigoals:zigi-cards:v1', 'zigoals:zigi-metrics:v1', 'zigoals:zigi-plans:v1', 'zigoals:nova-hud:v1', 'zigoals:point-tell:v1', 'zigoals:guide:v1'],
  'an import\'s undo, a run in progress': ['zigoals:import-undo:v1', 'zigoals:import-batches:v1', 'zigoals:meditation-run:v1', 'zigoals:routine-run:v1', 'zigoals:onboarding-setup:v1'],
  'display choices and device preferences': ['zigoals:today-folds:v1', 'zigoals:pages-view:v1', 'zigoals:ui-prefs:v1', 'zigoals:music:v1', 'zigoals:apps:v1', 'zigoals:celebrations:v1', 'zigoals:backup-reminder:v1', 'zigoals:w-reminders:v1', 'zigoals:stablecoins-as-cash:v1', 'zigoals:earn-prefs:v1', 'zigoals:staking-prefs:v1'],
  'caches and recent searches (read again from their source)': ['zigoals:chess-cache:v1', 'zigoals:search-recent:v1', 'zigoals:eco-tvl-history:v1', 'zigoals:chess-puzzle:v1'],
  'Earn progress and the staking journal (AL\'s plan)': ['zigoals:earn-path:v1', 'zigoals:earn-academy:v1', 'zigoals:staking-journal:v1', 'zigoals:validator-alerts:v1', 'zigoals:goal-vaults:v1', 'zigoals:chess-puzzle-log:v1'],
  'derived views (made again from the restored records)': ['zigoals:universe:v1', 'zigoals:day-timeline:v1', 'zigoals:stories:v1'],
};

test('D12: every exported record is restorable or deliberately left on the device, by name', () => {
  const excluded = Object.values(NOT_RESTORED).flat();
  const unaccounted = Object.entries(DEVICE_KEYS as Record<string, string>).filter(([, key]) => !RESTORE_KEYS.includes(key) && !excluded.includes(key)).map(([name, key]) => `${name} (${key})`);
  expect(unaccounted, 'add each to DEVICE_PARTS (lib/restore/plan.ts) or, with the owner, to NOT_RESTORED here').toEqual([]);
  // No exclusion names a record that has since become restorable, or one Export everything no longer writes.
  const exported = Object.values(DEVICE_KEYS as Record<string, string>);
  expect(excluded.filter(key => RESTORE_KEYS.includes(key) || !exported.includes(key))).toEqual([]);
});

test('D12: every record kind added since Session AL is restorable', () => {
  for (const key of ['zigoals:networth-history:v1', 'zigoals:day-goal:v1', 'zigoals:day-ends:v1', 'zigoals:task-when:v1', 'zigoals:countdowns:v1', 'zigoals:money-tags:v1', 'zigoals:mood-tags:v1', 'zigoals:symptoms:v1', 'zigoals:workout-splits:v1', 'zigoals:today-orbits:v1', 'zigoals:nova-stage:v1', 'zigoals:nova-world:v1'])
    expect(RESTORE_KEYS, key).toContain(key);
});
