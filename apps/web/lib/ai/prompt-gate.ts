import gate from './prompt-gate.json';

/**
 * Session AI (DE7, G2): the chip gate. A suggested prompt shows only when its G6 case passed on Claude Sonnet 5.5 and on
 * Claude Haiku 5.5 in the newest real-model run (`prompt-gate.json`, rebuilt by scripts/zigi/prompt-gate.mjs, never typed
 * by hand). A chip the runs have not measured yet shows (CI's G6 test keeps every chip covered by a case, so the next
 * round measures it). A starter chip is gated by its own words; a data chip by its kind (the id before ":").
 */
export const GATE_MODELS = ['claude-sonnet-5-5', 'claude-haiku-5-5'] as const;
const chips = gate.chips as Record<string, Record<string, unknown>>;
export const chipKey = (id: string): string => id.startsWith('starter:') ? id : id.split(':')[0]!;
export function chipPassed(id: string): boolean {
  const entry = chips[chipKey(id)];
  return !entry || GATE_MODELS.every(model => entry[model] !== false);
}
