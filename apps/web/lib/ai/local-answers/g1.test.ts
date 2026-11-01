import {expect, test} from 'vitest';
import {toolEnv} from '../tools/env';
import {gatesFor, showcaseSources, withG1} from '../tools/fixtures';
import {HEALTH_CLOSED} from '../tools/format';
import {localAnswer} from './engine';

/**
 * Owner follow-up 2 (G8): BUILD list 2's plain questions answered on this device with no model, from the same read-only
 * tools: the last blood pressure (Health gate; numbers only), today's own scales, cash ahead (a model, per currency).
 * Advice, a change, Dutch and anything else stay the model's.
 */
const sources = withG1(showcaseSources('2026-10-31'));
const open = toolEnv(sources, gatesFor(true), 'local'), closed = toolEnv(sources, gatesFor(false), 'local');
test('the last blood pressure: the numbers and the day, not a diagnosis; refused with the Health gate closed', () => {
  const r = localAnswer('What was my last blood pressure reading?', open);
  expect(r).toMatchObject({kind: 'answer', calls: [{tool: 'your_numbers'}]});
  expect(r.kind === 'answer' && r.text).toMatch(/^Your last reading: 121\/76 mmHg, pulse 62 a minute, on .+\. 8 readings are kept\. Your readings, not a diagnosis\.$/);
  expect(r.kind === 'answer' && r.text).not.toMatch(/normal|healthy|high|low/i);
  expect(localAnswer('What was my last blood pressure reading?', closed)).toMatchObject({kind: 'refusal', text: HEALTH_CLOSED});
});
test('today\'s own scales and cash ahead', () => {
  const s = localAnswer('How did I rate my scales today?', open);
  expect(s.kind === 'answer' && s.text).toBe('Today, on your own scales:\n• Stress (Showcase): 3 (3 of 5)\n• Focus (Showcase): 3 (3 of 5)');
  const c = localAnswer('When is my cash at its lowest?', open);
  expect(c).toMatchObject({kind: 'answer', calls: [{tool: 'cash_forecast'}]});
  expect(c.kind === 'answer' && c.text).toMatch(/^A model from your own records, not a promise\. Per currency, never converted\.\n• /);
});
test('advice, a change, or Dutch is never answered here', () => {
  for (const q of ['Is my last blood pressure okay?', 'What was my last blood pressure and log a new one', 'Wat was mijn laatste bloeddruk?', 'Should I worry about my cash forecast?'])
    { const r = localAnswer(q, open); expect(('calls' in r ? r.calls : []).map(c => c.tool), q).not.toContain('your_numbers'); expect(r.kind === 'answer' && r.text.startsWith('Your last reading'), q).toBe(false); }
});
