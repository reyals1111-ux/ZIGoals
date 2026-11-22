import {describe, expect, test} from 'vitest';
import {HEALTH_EXTRAS_KEY, healthExtrasSchema} from './health-extras';
import {MORE_GOALS_KEY, moreGoalsSchema} from './health-goals/more';
import {CIRCUITS_KEY, circuitsSchema} from './workouts/circuits';
import {withR3HealthShowcase} from './r3-health-showcase';

/** Session AV lane 2 (health r3): the Showcase's labelled examples read with their own schemas and keep what was there. */
describe('the Showcase examples', () => {
  test('labelled, readable, and an existing extras record keeps its parts', () => {
    const r = withR3HealthShowcase({[HEALTH_EXTRAS_KEY]: JSON.stringify({version: 1, meals: {Breakfast: {name: 'Early'}}})}, '2026-11-17');
    const extras = healthExtrasSchema.parse(JSON.parse(r[HEALTH_EXTRAS_KEY]!));
    expect(extras.meals).toEqual({Breakfast: {name: 'Early'}});
    expect(extras.ownDrinks?.every(d => d.name.endsWith('(Showcase)'))).toBe(true);
    expect(extras.drinks).toBeUndefined();
    expect(moreGoalsSchema.parse(JSON.parse(r[MORE_GOALS_KEY]!)).goals[0]!.name).toContain('(Showcase)');
    expect(circuitsSchema.parse(JSON.parse(r[CIRCUITS_KEY]!)).circuits[0]!.name).toContain('(Showcase)');
  });
});
