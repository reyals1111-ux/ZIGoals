import {expect, test} from 'vitest';
import {fitToBudget, estimateTokens} from './budget';
import type {ChatMessage} from '../types';

// Session X-Local Part 5c: the budget is question-aware. The latest question always goes, whole, even past the budget;
// earlier turns are dropped oldest first; a reply whose question was dropped goes with it.
const msg = (role: 'user' | 'assistant', content: string): ChatMessage => role === 'user' ? {role: 'user', content} : {role: 'assistant', content};
test('the latest question is never dropped, even when the fixed parts already exceed the budget', () => {
  const question = msg('user', 'x'.repeat(4000));
  const fit = fitToBudget({system: 's'.repeat(400), context: 'c'.repeat(400), turns: [msg('user', 'old'), msg('assistant', 'reply'), question], budgetTokens: 100});
  expect(fit.messages).toEqual([question]); expect(fit.dropped).toBe(2); expect(fit.overBudget).toBe(true);
  expect(fit.estimated.turns).toBe(estimateTokens(question.content) + 4);
});
test('earlier turns go oldest first, and a reply never leads the conversation', () => {
  const turns = [msg('user', 'q1'), msg('assistant', 'a'.repeat(400)), msg('user', 'q2'), msg('assistant', 'b'.repeat(40)), msg('user', 'q3')];
  const fit = fitToBudget({system: '', context: '', turns, budgetTokens: 40});
  expect(fit.messages.map(m => m.content)).toEqual(['q2', 'b'.repeat(40), 'q3']); expect(fit.dropped).toBe(2); expect(fit.overBudget).toBe(false);
  const tight = fitToBudget({system: '', context: '', turns, budgetTokens: 20});
  expect(tight.messages.map(m => m.content)).toEqual(['q3']);
  expect(fitToBudget({system: '', context: '', turns: [], budgetTokens: 10}).messages).toEqual([]);
});
