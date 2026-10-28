import {expect, test} from 'vitest';
import gate from './prompt-gate.json';
import {chipKey, chipPassed, GATE_MODELS} from './prompt-gate';
import {chipsFor} from './proactive/chips';
import {toolEnv} from './tools/env';
import {gatesFor, showcaseSources} from './tools/fixtures';

/** Session AI (DE7, G2): a chip that failed its real-model case on either model never shows; an unmeasured one does. */
const chips = gate.chips as Record<string, Record<string, unknown>>;
test('the gate reads both models; a chip failed on either is hidden, and the page shows only passed or unmeasured chips', () => {
  for (const [key, entry] of Object.entries(chips)) expect(chipPassed(key)).toBe(GATE_MODELS.every(m => entry[m] !== false));
  expect(chipKey('streak:h1')).toBe('streak'); expect(chipKey('starter:Log a glass of water')).toBe('starter:Log a glass of water');
  expect(chipPassed('never-measured')).toBe(true);
  const sources = showcaseSources();
  for (const area of ['today', 'goals', 'habits', 'health', 'wealth', 'help'] as const) {
    const shown = chipsFor({area, env: toolEnv(sources, gatesFor(true, area), 'provider'), day: sources.habitDay});
    for (const chip of shown) expect(chipPassed(chip.id), chip.id).toBe(true);
  }
});
