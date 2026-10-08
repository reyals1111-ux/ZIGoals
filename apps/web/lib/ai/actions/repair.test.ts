import {expect, test} from 'vitest';
import {needsRepair, REPAIR_PROMPT, REPAIR_PROMPT_NO_BLOCK, repairPrompt} from './repair';

const rejected = [{raw: '{"kind":"log-water"}', reason: 'millilitres: a number.'}];
test('the repair round needs a card asked for; refused blocks alone do not trigger it (Phase 2: that path invented cards on lookups and refusals)', () => {
  expect(needsRepair({proposals: [], rejected: []}, {askedForCard: true})).toBe(true);
  expect(needsRepair({proposals: [], rejected}, {askedForCard: true})).toBe(true);
  expect(needsRepair({proposals: [], rejected}, {askedForCard: false})).toBe(false);
  expect(needsRepair({proposals: [], rejected})).toBe(false);
  expect(needsRepair({proposals: [{} as never], rejected}, {askedForCard: true})).toBe(false);
});
test('both repair prompts ask for only what the person asked for, never a list of everything', () => {
  for (const p of [REPAIR_PROMPT, REPAIR_PROMPT_NO_BLOCK]) expect(p).toMatch(/Only what the person asked for in that message, usually one item/);
  expect(repairPrompt({rejected})).toContain('millilitres: a number.');
  expect(repairPrompt({rejected: []})).toBe(REPAIR_PROMPT_NO_BLOCK);
});
