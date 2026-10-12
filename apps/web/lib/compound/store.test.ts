import {describe, expect, it} from 'vitest';
import {readDeviceRecord} from '../device-record';
import {DEFAULT_INPUT} from './engine';
import {CALCULATOR, CALCULATOR_KEY, MAX_SCENARIOS, emptyCalculator, rememberInput, removeScenario, restoreScenario, saveScenario} from './store';

const at = '2026-10-12T09:00:00.000Z';
const memory = (value: string | null) => ({getItem: (k: string) => (k === CALCULATOR_KEY ? value : null)});

describe('calculator scenarios (Session AA-Cloud Part 3), device-only zigoals:calculator:v1', () => {
  it('saves, replaces by name, removes and puts back in place', () => {
    let s = saveScenario(emptyCalculator(), {id: 'a', name: 'Steady', input: DEFAULT_INPUT, savedAt: at});
    s = saveScenario(s, {id: 'b', name: 'Bold', input: {...DEFAULT_INPUT, ratePercent: 7}, savedAt: at});
    s = saveScenario(s, {id: 'c', name: 'steady ', input: {...DEFAULT_INPUT, years: 30}, savedAt: at});
    expect(s.scenarios.map(x => x.id)).toEqual(['c', 'b']);
    const removed = s.scenarios[1]!;
    s = removeScenario(s, 'b');
    expect(s.scenarios.map(x => x.id)).toEqual(['c']);
    s = restoreScenario(s, removed, 1);
    expect(s.scenarios.map(x => x.id)).toEqual(['c', 'b']);
    expect(restoreScenario(s, removed, 0)).toBe(s);
  });
  it('keeps at most twelve and says so', () => {
    let s = emptyCalculator();
    for (let i = 0; i < MAX_SCENARIOS; i++) s = saveScenario(s, {id: `s${i}`, name: `Plan ${i}`, input: DEFAULT_INPUT, savedAt: at});
    expect(() => saveScenario(s, {id: 'x', name: 'One more', input: DEFAULT_INPUT, savedAt: at})).toThrow(/Up to 12/);
  });
  it('remembers the last inputs and refuses inputs the engine refuses', () => {
    expect(rememberInput(emptyCalculator(), DEFAULT_INPUT).last).toEqual(DEFAULT_INPUT);
    expect(() => rememberInput(emptyCalculator(), {...DEFAULT_INPUT, years: 0})).toThrow();
  });
  it('reads tolerantly: missing is empty, broken is empty and unreadable, unknown fields are kept', () => {
    expect(readDeviceRecord(memory(null), CALCULATOR)).toEqual({data: emptyCalculator(), unreadable: false});
    expect(readDeviceRecord(memory('{oops'), CALCULATOR).unreadable).toBe(true);
    expect(readDeviceRecord(memory(JSON.stringify({version: 2, scenarios: []})), CALCULATOR).unreadable).toBe(true);
    const later = {version: 1, scenarios: [{id: 'a', name: 'A', input: {...DEFAULT_INPUT, extra: 1}, savedAt: at, colour: 'x'}], note: 'later'};
    const read = readDeviceRecord(memory(JSON.stringify(later)), CALCULATOR);
    expect(read.unreadable).toBe(false);
    expect((read.data as Record<string, unknown>).note).toBe('later');
  });
});
