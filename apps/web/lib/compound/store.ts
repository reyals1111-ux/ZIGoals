import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {compoundInputSchema, type CompoundInput} from './engine';

/**
 * The calculator's saved scenarios (Session AA-Cloud Part 3, `[TIER 3] (storage)`): device-only, loose, versioned, in
 * its own key, never synced and never read by #32–#37. A scenario is the person's own inputs and a name; results are
 * always computed again, so a saved scenario never carries a stale number. `last` keeps the inputs the calculator showed
 * last, so the page opens where the person left it. Mutators are pure.
 */
export const CALCULATOR_KEY = 'zigoals:calculator:v1';
export const MAX_SCENARIOS = 12;
export const scenarioSchema = z.looseObject({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
  name: z.string().trim().min(1).max(60),
  input: compoundInputSchema,
  savedAt: z.iso.datetime(),
});
export const calculatorSchema = z.looseObject({
  version: z.literal(1),
  scenarios: z.array(scenarioSchema).max(MAX_SCENARIOS),
  last: compoundInputSchema.optional(),
});
export type Scenario = z.infer<typeof scenarioSchema>;
export type CalculatorRecord = z.infer<typeof calculatorSchema>;
export const emptyCalculator = (): CalculatorRecord => ({version: 1, scenarios: []});
export const CALCULATOR: DeviceRecordSpec<CalculatorRecord> = {key: CALCULATOR_KEY, schema: calculatorSchema, empty: emptyCalculator};

/** Saves the inputs under a name; a scenario with the same name is replaced, so saving twice never makes a copy. */
export function saveScenario(state: CalculatorRecord, scenario: Scenario): CalculatorRecord {
  const others = state.scenarios.filter(s => s.id !== scenario.id && s.name.toLowerCase() !== scenario.name.trim().toLowerCase());
  if (others.length >= MAX_SCENARIOS) throw Error(`Up to ${MAX_SCENARIOS} scenarios fit. Remove one first.`);
  return calculatorSchema.parse({...state, scenarios: [scenarioSchema.parse(scenario), ...others]});
}
export function removeScenario(state: CalculatorRecord, id: string): CalculatorRecord {
  return calculatorSchema.parse({...state, scenarios: state.scenarios.filter(s => s.id !== id)});
}
/** Puts a removed scenario back where it was (Undo). */
export function restoreScenario(state: CalculatorRecord, scenario: Scenario, index: number): CalculatorRecord {
  if (state.scenarios.some(s => s.id === scenario.id)) return state;
  const scenarios = [...state.scenarios];
  scenarios.splice(Math.max(0, Math.min(index, scenarios.length)), 0, scenario);
  return calculatorSchema.parse({...state, scenarios: scenarios.slice(0, MAX_SCENARIOS)});
}
export function rememberInput(state: CalculatorRecord, input: CompoundInput): CalculatorRecord {
  return calculatorSchema.parse({...state, last: input});
}
