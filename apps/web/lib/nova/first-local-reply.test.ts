import {expect, test} from 'vitest';
import {firstLocalReplyLine, noteFirstLocalReply, novaSetupSchema, stepCheck, stepDone} from './setup';

/** Session AK P4 (FIRST_RUN_REVIEW FR-22): the first answer from the person's own model is marked once, and lights planet 4. */
const now = new Date('2026-11-01T10:00:00Z');
test('the first local reply is noted once and lights "First conversation"', () => {
  const after = noteFirstLocalReply({version: 1}, 'turn-1', 'llama3.2:3b', now, '2026-11-01');
  expect(after.firstLocalReply).toBe('turn-1');
  expect(stepDone(after, 'first-chat')).toBe(true);
  expect(stepCheck(after, 'first-chat')).toMatchObject({ok: true, note: 'First answer from llama3.2:3b on your computer.'});
  // Once per device: a later reply changes nothing.
  expect(noteFirstLocalReply(after, 'turn-2', 'qwen3:8b', now, '2026-11-02')).toBe(after);
  expect(firstLocalReplyLine('llama3.2:3b')).toBe('This answer came from llama3.2:3b on your computer. Nothing left this device.');
});
test('a planet already checked keeps its own check; the field is optional and bounded', () => {
  const checked = {version: 1 as const, steps: {'first-chat': {doneOn: '2026-10-30', check: {ok: true, at: '2026-10-30T09:00:00.000Z', note: 'Saved.'}}}};
  expect(stepCheck(noteFirstLocalReply(checked, 't', 'm', now, '2026-11-01'), 'first-chat')?.note).toBe('Saved.');
  expect(novaSetupSchema.parse({version: 1}).firstLocalReply).toBeUndefined();
  expect(novaSetupSchema.parse({version: 1, firstLocalReply: 'x'.repeat(101)}).firstLocalReply).toBeUndefined();
});
