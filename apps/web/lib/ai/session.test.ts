import {expect, test} from 'vitest';
import {MAX_TURNS, newChat} from './chats';
import {appendTurn, assistantTurn, isFull, messagesFor, regenerateTarget, stopReason, userTurn} from './session';

// ADR-012, Part 6: a conversation is a list of validated turns; the helpers never invent text.
const now = new Date('2026-10-04T10:00:00Z');
test('the first question names the chat, turns append in order, and a full chat refuses more', () => {
  let chat = newChat('local', 'openai', 'gpt-x', now, 'c1');
  chat = appendTurn(chat, userTurn('  Which habits are still open today?  ', now, 'u1'), now);
  expect(chat.title).toBe('Which habits are still open today?'); expect(chat.turns[0]).toEqual({id: 'u1', role: 'user', text: 'Which habits are still open today?', at: now.toISOString()});
  chat = appendTurn(chat, assistantTurn({text: 'Two: Read and Walk.', provider: 'openai', model: 'gpt-x', usage: {input: 120, output: 9}, now, id: 'a1'}), now);
  expect(chat.turns[1]).toMatchObject({role: 'assistant', provider: 'openai', model: 'gpt-x', usage: {input: 120, output: 9}}); expect(chat.turns[1]).not.toHaveProperty('stopped');
  chat = appendTurn(chat, userTurn('And tomorrow?', now), now);
  expect(chat.title).toBe('Which habits are still open today?');
  expect(messagesFor(chat.turns)).toEqual([{role: 'user', content: 'Which habits are still open today?'}, {role: 'assistant', content: 'Two: Read and Walk.'}, {role: 'user', content: 'And tomorrow?'}]);
  const full = {...chat, turns: Array.from({length: MAX_TURNS}, (_, i) => userTurn(`q${i}`, now, `u${i}`))};
  expect(isFull(full)).toBe(true); expect(() => appendTurn(full, userTurn('more', now), now)).toThrow(/limit/);
});
test('regenerate drops the trailing reply and asks the last question again; a stopped reply says so', () => {
  let chat = newChat('local', 'anthropic', 'claude-x', now);
  chat = appendTurn(chat, userTurn('Summarise my week', now), now);
  chat = appendTurn(chat, assistantTurn({text: 'Half a', provider: 'anthropic', model: 'claude-x', usage: null, stopped: 'Stopped', now}), now);
  const target = regenerateTarget(chat, now);
  expect(target?.question).toBe('Summarise my week'); expect(target?.chat.turns).toHaveLength(1);
  expect(regenerateTarget(newChat('local', null, null, now), now)).toBeNull();
  expect(stopReason(null, true)).toBe('Stopped'); expect(stopReason('stop', false)).toBeUndefined(); expect(stopReason('end_turn', false)).toBeUndefined();
  expect(stopReason('length', false)).toMatch(/output cap/); expect(stopReason('max_tokens', false)).toMatch(/output cap/); expect(stopReason('SAFETY', false)).toMatch(/content filter/); expect(stopReason('weird', false)).toBe('Stopped by the provider (weird)');
  expect(messagesFor([userTurn('   ', now), userTurn('ok', now)])).toEqual([{role: 'user', content: 'ok'}]);
});
test('Session V Part 3: questions answered on the device and their answers never reach a provider later', () => {
  const now = new Date('2026-10-05T10:00:00Z');
  const turns = [{...userTurn('How many minutes did I meditate this month?', now), source: 'local' as const}, {...assistantTurn({text: 'You logged 45 minutes of Meditate this month.', provider: null, model: null, usage: null, now}), source: 'local' as const, tools: [{tool: 'habit_stats', args: {habit: 'Meditate'}, label: 'Meditate · this month'}]},
    userTurn('How many minutes did I meditate this month?', now), assistantTurn({text: 'MOCK answer with the records.', provider: 'openai', model: 'mock-chat', usage: null, now})];
  expect(messagesFor(turns)).toEqual([{role: 'user', content: 'How many minutes did I meditate this month?'}, {role: 'assistant', content: 'MOCK answer with the records.'}]);
});
test('Session V Part 15: exchanges with Chrome\'s on-device model stay on the device too', () => {
  const now = new Date('2026-10-06T10:00:00Z');
  const turns = [{...userTurn('what is a gentle way to start stretching', now), source: 'on-device' as const}, {...assistantTurn({text: 'A short stretch after a walk is a good start.', provider: null, model: null, usage: null, now}), source: 'on-device' as const},
    userTurn('And for my back?', now)];
  expect(messagesFor(turns)).toEqual([{role: 'user', content: 'And for my back?'}]);
});
