import {writeFileSync} from 'node:fs';
import {expect, test} from 'vitest';
import {platformSchema} from '../positions';
import {accountsSchema} from '../accounts/schema';
import {ACCOUNT, financeV4} from './format-fixtures';
import {emptyFinanceHomesMarker, reconcileFinanceHomes} from './finance-homes';
import {GOAL_EXTRAS_KEY, goalExtrasSchema} from '../goal-extras/store';

/**
 * Session AB-Cloud (ADR-023): the records this build writes, for the frozen-reader proof (scripts/frozen-readers.mjs
 * runs scripts/frozen-readers/reader.frozen.ts against them inside worktrees of #37, #38 and #39). With FROZEN_OUT set
 * the fixture is written there; without it this test only proves that this build reads its own fixture.
 * Each part of the session adds the records it changes, with the reader module and spec an older release would use.
 */
export function frozenFixture() {
  const v4 = platformSchema.parse({...financeV4(), goals: financeV4().goals.map(g => ({...g, milestones: [{id: 'm1', title: 'Flights booked', done: false, target: '150000'}]}))});
  // Part 1: finance as the finance-homes switch writes it (v5, one account, one milestone date).
  const finance = reconcileFinanceHomes(v4, {accounts: accountsSchema.parse({version: 1, items: [ACCOUNT]}), dates: {version: 1, dates: {'1': {m1: '2026-12-01'}}}}, emptyFinanceHomesMarker()).platform;
  // Part 1: a goal-extras record with this session's `cardArt` (ADR-023 C7) beside AA-Cloud's fields.
  const extras = goalExtrasSchema.parse({version: 1, areas: [{id: 'custom-music', label: 'Music', color: '#aa66ff'}],
    goals: {'private:1': {area: 'fun', why: 'See the sea', cardArt: 'nebula-1', updatedAt: '2026-10-13T08:00:00.000Z'}}});
  const records: Record<string, string> = {'zigoals:platform:v1': JSON.stringify(finance), [GOAL_EXTRAS_KEY]: JSON.stringify(extras)};
  const checks = [
    {key: GOAL_EXTRAS_KEY, module: './goal-extras/store', spec: 'GOAL_EXTRAS', expect: {'goals.private:1.why': 'See the sea', 'goals.private:1.cardArt': 'nebula-1', 'areas': extras.areas}},
  ];
  return {records, checks, finance: {accounts: 1, dates: 1}};
}

test('the frozen-reader fixture is read by this build', () => {
  const fixture = frozenFixture();
  expect(platformSchema.parse(JSON.parse(fixture.records['zigoals:platform:v1']!)).schemaVersion).toBe(5);
  expect(goalExtrasSchema.parse(JSON.parse(fixture.records[GOAL_EXTRAS_KEY]!)).goals['private:1']!.cardArt).toBe('nebula-1');
  if (process.env.FROZEN_OUT) writeFileSync(process.env.FROZEN_OUT, JSON.stringify(fixture));
});
