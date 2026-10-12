// Gate B (temporary, never committed): 32cb9c5's own readers (Alpha #37) read Session AA-Cloud's records and keys.
import {expect, test} from 'vitest';
import {readFileSync} from 'node:fs';
import {platformSchema, PLATFORM_KEY} from './positions';
import {habitDataSchema, HABITS_KEY} from './habits';
import {healthSchema, HEALTH_STORAGE_KEY} from './health';
import {dashboardSettingsSchema, DASHBOARD_SETTINGS_KEY} from './dashboard-settings';
import {collectEverything, EVERYTHING_KEYS} from './export/everything';
import {healthGroupIn} from './vault/w-homes';
import {dailySeries} from './sleep/engine';
const records = JSON.parse(readFileSync('/tmp/claude-0/-home-user-ZIGoals/9bf8d9d6-f7e3-5142-a87e-02ce840546f5/scratchpad/frozen/records.json', 'utf8')) as Record<string, string>;
test('#37 parses every synced record of this branch (the Showcase with its earlier season) without a refusal', () => {
  expect(platformSchema.safeParse(JSON.parse(records[PLATFORM_KEY]!)).success).toBe(true);
  expect(habitDataSchema.safeParse(JSON.parse(records[HABITS_KEY]!)).success).toBe(true);
  const health = healthSchema.safeParse(JSON.parse(records[HEALTH_STORAGE_KEY]!));
  expect(health.success).toBe(true);
  const sleep = healthGroupIn(health.data!, 'sleep')!;
  expect(sleep.nights.filter(n => n.id.startsWith('health_sleep-earlier-'))).toHaveLength(29);
  expect(dailySeries(sleep, '2026-10-12', 90).filter(p => p.asleep !== null).length).toBeGreaterThan(50);
  expect(dashboardSettingsSchema.safeParse(JSON.parse(records[DASHBOARD_SETTINGS_KEY]!)).success).toBe(true);
});
test('#37 Export everything over a device holding this branch\'s keys: everything it knows is readable, the new keys are not read', () => {
  const newKeys = Object.keys(records).filter(k => !EVERYTHING_KEYS.includes(k));
  console.log('keys #37 does not know:', newKeys.join(', '));
  for (const k of ['zigoals:goal-extras:v1', 'zigoals:average-goals:v1', 'zigoals:calculator:v1', 'zigoals:life-review:v1', 'zigoals:today-cards:v1', 'zigoals:search-recent:v1']) expect(newKeys).toContain(k);
  const texts = Object.fromEntries(EVERYTHING_KEYS.map(k => [k, records[k] ?? null]));
  const collected = collectEverything(texts, {now: new Date('2026-10-12T10:00:00Z'), version: '37', commit: '32cb9c5', localSimulation: null});
  expect(collected.unreadable).toEqual([]);
  expect(collected.warnings).toEqual([]);
});
