import {expect, test} from 'vitest';
import {allocate, emptyPlatform, platformSchema, privateGoalSchema, type Platform} from './positions';
import {manualSourcePosition} from './manual-source';
import {archiveAsset, changeManualUnit, metalUnitOf, saveAsset, unitLocked} from './asset-management';

/**
 * Session Y Part 8 (owner-approved; ADR-018 Y26): a precious metal's weight unit can change while nothing stored would
 * be re-labelled; otherwise the reason is plain and the unit stays. The result is the same schema (#32–#34 read it).
 */
const AT = '2026-10-01T10:00:00.000Z', LATER = '2026-10-02T10:00:00.000Z';
function withGold(): {s: Platform; id: string} {
  const p = manualSourcePosition({category: 'Precious metals', name: 'Grandma’s coins', quantity: '100', currency: 'EUR', metal: 'Gold', unit: 'grams', value: '7000'}, undefined, AT);
  return {s: saveAsset(emptyPlatform(), p), id: p.id};
}
const units = (n: string) => (BigInt(n) * 10n ** 18n).toString();

test('a new metal changes grams to troy ounces with its quantity in the new unit; nothing else moves', () => {
  const {s, id} = withGold(), before = s.positions[0]!;
  expect(metalUnitOf(before)).toEqual({metal: 'Gold', unit: 'grams'});
  expect(unitLocked(s, before)).toBeNull();
  const next = changeManualUnit(s, id, 'troy ounces', units('3'), LATER), after = next.positions[0]!;
  expect(after).toMatchObject({asset: 'Gold troy ounces', denom: 'manual:Gold troy ounces', quantity: units('3'), decimals: 18, providerId: before.providerId, valuation: before.valuation});
  expect(next.snapshots.filter(x => x.positionId === id)).toEqual([{positionId: id, quantity: units('3'), observedAt: LATER}]);
  expect(next.assetEvents.at(-1)).toMatchObject({positionId: id, kind: 'edited'});
  expect(platformSchema.parse(next)).toEqual(next);
  expect(() => changeManualUnit(next, id, 'troy ounces', units('3'), LATER)).toThrow('already the asset’s unit');
});

test('the unit stays, with its reason, once anything stored counts in it', () => {
  const {s, id} = withGold(), p = () => s.positions[0]!;
  // A second quantity on record (an ordinary edit).
  const edited = saveAsset(s, {...p(), quantity: units('120'), observedAt: LATER});
  expect(unitLocked(edited, edited.positions[0]!)).toMatch(/quantity history/);
  expect(() => changeManualUnit(edited, id, 'kilograms', units('1'), LATER)).toThrow(/quantity history/);
  // A Goal counting in this unit, and one funded by it.
  const goal = privateGoalSchema.parse({id: '1', name: 'Gold reserve', type: 'QUANTITY', status: 'active', asset: 'Gold grams', denom: 'manual:Gold grams', decimals: 18, target: units('500'), notes: '', createdAt: AT, milestones: []});
  const counted = platformSchema.parse({...s, goals: [goal]});
  expect(unitLocked(counted, counted.positions[0]!)).toMatch(/A Goal counts/);
  const funded = allocate(counted, '1', id, units('10'));
  expect(unitLocked(funded, funded.positions[0]!)).toMatch(/funds a Goal/);
  // A recorded valuation (Wealth's daily snapshot keeps the quantity in the asset's unit).
  const valued = platformSchema.parse({...s, valuationSnapshots: [{id: `valuation:${id}:1`, positionId: id, quantity: units('100'), quantityDecimals: 18, capturedAt: LATER, value: '700000', decimals: 2, currency: 'EUR', source: 'MANUAL', observedAt: AT}]});
  expect(unitLocked(valued, valued.positions[0]!)).toMatch(/funding or valuation records/);
  expect(() => changeManualUnit(valued, id, 'kilograms', units('1'), LATER)).toThrow(/funding or valuation records/);
  // Archived, market-linked, and anything that is not a metal.
  const archived = archiveAsset(s, id, false, Date.parse(LATER));
  expect(unitLocked(archived, archived.positions[0]!)).toMatch(/Restore this asset/);
  const cash = manualSourcePosition({category: 'Cash', name: 'Savings', quantity: '10', currency: 'EUR'}, undefined, AT);
  expect(unitLocked(s, cash)).toMatch(/Only a precious metal/);
  expect(() => changeManualUnit(s, id, 'pounds' as 'grams', units('1'), LATER)).toThrow();
  expect(() => changeManualUnit(s, id, 'kilograms', '0', LATER)).toThrow('Enter a positive quantity.');
});
