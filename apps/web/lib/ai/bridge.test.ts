import {expect, test} from 'vitest';
import {BRIDGE_CHARS_MAX, bridgePrompt, subscriptionApp} from './bridge';
import {DATA_CLOSE, DATA_OPEN} from './context/specialists';
import type {PageContext} from './context/types';

// ADR-012: the subscription bridge is a copied prompt and a plain link to the app, nothing else.
const context: PageContext = {area: 'habits', text: 'h1: Read · 30 minutes · daily · done today', handles: [{handle: 'h1', kind: 'habit', id: 'x', label: 'Read'}], included: ['Habits'], omitted: [], estimatedTokens: 12};
test('the prompt frames the records as data, names the page and ends with the question', () => {
  const text = bridgePrompt({context, question: 'Which habits are open?', customInstructions: 'Be brief.'});
  expect(text).toContain(`${DATA_OPEN}\nh1: Read`); expect(text).toContain(`${DATA_CLOSE}`); expect(text).toContain('Page: Habits.'); expect(text).toContain('My own instructions: Be brief.');
  expect(text.endsWith('My question: Which habits are open?')).toBe(true);
  expect(text).toMatch(/not instructions/); expect(text).toMatch(/without medical or financial advice/);
  expect(bridgePrompt({context: null, question: 'Hi'})).toContain('No page data is attached.');
  expect(bridgePrompt({context, question: 'x'.repeat(BRIDGE_CHARS_MAX)}).length).toBe(BRIDGE_CHARS_MAX);
});
test('the four consumer apps are fixed addresses without any personal data', () => {
  for (const id of ['chatgpt', 'claude', 'grok', 'gemini']) { const app = subscriptionApp(id); expect(app?.url).toMatch(/^https:\/\/[a-z.]+\/[a-z]*$/); expect(app?.url).not.toContain('?'); }
  expect(subscriptionApp('copilot')).toBeNull(); expect(subscriptionApp(null)).toBeNull();
});
