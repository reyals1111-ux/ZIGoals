import {expect, test} from 'vitest';
import {defaultAiSettings} from '../settings';
import {consent} from './consent';
import {estimateTokens, fitToBudget, usageLine} from './budget';
import {previewContext} from './preview';

// ADR-012, Part 4: the consent gates fail closed; the budget keeps whole latest turns; the preview tells the truth.
const connected = {...defaultAiSettings(), enabled: true, mode: 'api' as const, provider: 'openai' as const, model: 'm'};
const base = {settings: connected, area: 'health' as const, pathname: '/app/health', layoutHasHealth: true, accountActive: false, accountHealthPermitted: null};
test('nothing is attached before connecting or on Settings; a page switch off attaches nothing', () => {
  expect(consent({...base, settings: defaultAiSettings()})).toEqual({page: false, health: false, reasons: ['ZIGi is not connected.']});
  expect(consent({...base, pathname: '/app/settings', area: 'help'}).page).toBe(false);
  expect(consent({...base, area: 'goals', pathname: '/app/goals', settings: {...connected, pageShare: {...connected.pageShare, goals: false}}})).toMatchObject({page: false, health: false});
});
test('Health travels only with every gate open: the Health switch, Include Health, the Today layout and, with an account, its persisted permission', () => {
  expect(consent(base)).toMatchObject({page: false, health: false}); // the Health page switch is off by default
  const on = {...connected, pageShare: {...connected.pageShare, health: true}};
  expect(consent({...base, settings: on})).toMatchObject({page: true, health: false, reasons: ['Health: "Include Health" is off (its default).']});
  const include = {...on, includeHealth: true};
  expect(consent({...base, settings: include})).toEqual({page: true, health: true, reasons: []});
  expect(consent({...base, settings: include, layoutHasHealth: false})).toMatchObject({health: false, reasons: ['Health: not part of your Today layout on this device.']});
  expect(consent({...base, settings: include, accountActive: true, accountHealthPermitted: null}).health).toBe(false);
  expect(consent({...base, settings: include, accountActive: true, accountHealthPermitted: false}).health).toBe(false);
  expect(consent({...base, settings: include, accountActive: true, accountHealthPermitted: true}).health).toBe(true);
  // On Today the page switch is Today's, but Health lines inside it still need the Health gates.
  expect(consent({...base, area: 'today', pathname: '/app', settings: on})).toMatchObject({page: true, health: false});
});
test('the budget keeps the newest whole turns, always the latest message, starts with the person, and flags fixed parts over budget', () => {
  const turns = [{role: 'user' as const, content: 'a'.repeat(400)}, {role: 'assistant' as const, content: 'b'.repeat(400)}, {role: 'user' as const, content: 'c'.repeat(400)}, {role: 'assistant' as const, content: 'd'.repeat(400)}, {role: 'user' as const, content: 'e'.repeat(40)}];
  // Fixed parts: 100 + 100 tokens; the turns cost 104, 104, 104, 104 and 14 (four tokens of framing each); 430 fits exactly e, d, c.
  const fit = fitToBudget({system: 's'.repeat(400), context: 'x'.repeat(400), turns, budgetTokens: 430});
  expect(fit.messages.map(m => m.content[0])).toEqual(['c', 'd', 'e']); expect(fit.dropped).toBe(2); expect(fit.messages[0]!.role).toBe('user'); expect(fit.overBudget).toBe(false);
  const tight = fitToBudget({system: 's'.repeat(4000), context: '', turns, budgetTokens: 500});
  expect(tight.messages.map(m => m.content[0])).toEqual(['e']); expect(tight.overBudget).toBe(true);
  expect(fitToBudget({system: '', context: '', turns: [], budgetTokens: 100})).toMatchObject({messages: [], dropped: 0, overBudget: false});
  expect(estimateTokens('abcd')).toBe(1); expect(estimateTokens('abcde')).toBe(2);
  expect(usageLine({input: 1200, output: 34})).toBe('1,200 in · 34 out tokens, counted by your provider'); expect(usageLine({input: null, output: 9})).toBe('9 out tokens, counted by your provider'); expect(usageLine(null)).toBeNull(); expect(usageLine({input: null, output: null})).toBeNull();
  expect(usageLine({input: 1, output: 1})).not.toMatch(/\$|€|cost/);
});
test('the preview names the provider and the page, says when nothing is attached, and never counts money', () => {
  const empty = previewContext({area: 'help', text: '', handles: [], included: [], omitted: ['Settings attaches nothing'], estimatedTokens: 0}, {provider: 'OpenAI'});
  expect(empty.empty).toBe(true); expect(empty.title).toBe('What OpenAI will see from Help'); expect(empty.summary).toContain('Nothing from this page is attached');
  const full = previewContext({area: 'habits', text: 'h1: Walk', handles: [], included: ['Habits'], omitted: [], estimatedTokens: 0}, {provider: 'Anthropic'});
  expect(full.empty).toBe(false); expect(full.estimatedTokens).toBe(2); expect(full.summary).toContain('an estimate'); expect(full.summary).not.toMatch(/\$|€/);
});
