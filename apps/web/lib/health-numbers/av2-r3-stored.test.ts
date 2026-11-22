import {describe, expect, test} from 'vitest';
import {collectEverything} from '../export/everything';
import {nextValue, planParts} from '../restore/plan';
import {HEALTH_NUMBERS_KEY, healthNumbersSchema} from './store';

/**
 * Session AV lane 2 (health r3; LEDGER #284; TIER 3 (stored format), additive): a reading's meal, before or after, and its
 * time. A record written by an earlier release reads as before; an unreadable new value is dropped alone; Export
 * everything → erase → Restore keeps them.
 */
const AT = '2026-11-22T08:00:00.000Z';
const OLD = {version: 1, entries: [{id: 'n1', date: '2026-11-20', kind: 'lab', name: 'Glucose', value: 5.4, unit: 'mmol/L'}]};
const NEW = {version: 1, entries: [...OLD.entries, {id: 'n2', date: '2026-11-20', kind: 'lab', name: 'Glucose', value: 7.8, unit: 'mmol/L', meal: 'Lunch', mealWhen: 'after', time: '13:45'}]};
describe('your numbers: a reading beside a meal', () => {
  test('older records read as before; the new fields as written', () => {
    expect(healthNumbersSchema.parse(OLD)).toEqual(OLD);
    expect(healthNumbersSchema.parse(NEW)).toEqual(NEW);
  });
  test('an unreadable new value is dropped alone, the reading kept', () => {
    const r = healthNumbersSchema.parse({...OLD, entries: [{...NEW.entries[1], meal: 'Brunch', mealWhen: 'during', time: '25:00'}]});
    expect(r.entries[0]).toEqual({id: 'n2', date: '2026-11-20', kind: 'lab', name: 'Glucose', value: 7.8, unit: 'mmol/L'});
    expect(r.entries[0]!.meal).toBeUndefined();
  });
  test('Export everything → erase → Restore keeps them', () => {
    const collected = collectEverything({[HEALTH_NUMBERS_KEY]: JSON.stringify(NEW)}, {now: new Date(AT), version: '0.1.0', commit: 'a'.repeat(40), localSimulation: null});
    const part = planParts(JSON.parse(JSON.stringify(collected.json))).find(p => p.kind === 'device' && p.key === HEALTH_NUMBERS_KEY);
    expect(part).toBeDefined();
    const back = nextValue(part!, 'replace', undefined);
    expect('value' in back ? back.value : undefined).toEqual(NEW);
  });
});
