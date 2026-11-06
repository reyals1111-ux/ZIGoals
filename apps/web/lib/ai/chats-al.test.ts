import {expect, test} from 'vitest';
import {MAX_TURN_CHARS, newChat, sessionChatStore, storedChat, storedChatSchema, type Chat} from './chats';

// Session AL (lane L7; Berlin BN-045): one odd field never costs the whole conversation ("This chat could not be saved").
test('a chat with odd fields still saves: usage not a whole number, long title, long stop line, empty labels', async () => {
  const chat: Chat = {...newChat('local', 'local', 'qwen2.5:0.5b', new Date('2026-11-04T01:00:00Z'), 'c1'), title: 'x'.repeat(300), turns: [
    {id: 't1', role: 'user', text: 'Give me a long answer', at: '2026-11-04T01:00:00.000Z'},
    {id: 't2', role: 'assistant', text: 'taste evil '.repeat(3000).slice(0, MAX_TURN_CHARS), at: '2026-11-04T01:01:00.000Z', provider: 'local', model: 'qwen2.5:0.5b', usage: {input: 9278.5, output: -1}, stopped: `Interrupted: ${'y'.repeat(400)}`, records: ['', 'Habits: Read', 'z'.repeat(200)]},
  ]};
  const stored = storedChat(chat);
  expect(storedChatSchema.safeParse(stored).success).toBe(true);
  expect(stored.title.length).toBeLessThanOrEqual(120);
  const memory = new Map<string, string>(), storage = {getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v), removeItem: (k: string) => void memory.delete(k)};
  const store = sessionChatStore(storage, 'local');
  await store.save(chat);
  const back = await store.read('c1');
  expect(back?.turns).toHaveLength(2);
  expect(back?.turns[1]!.usage).toEqual({input: 9279, output: null});
  expect(back?.turns[1]!.records).toEqual(['Habits: Read', `${'z'.repeat(79)}…`]);
});
