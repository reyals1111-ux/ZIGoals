import {expect, test} from 'vitest';
import {clearDrafts, forgetOpenChatsInMemory, noteOpenChat, OPEN_CHAT_KEY, openChatFor, readDraft, writeDraft} from './composer-draft';

// Session AL (lane L7; AK's D7, Professor PR-025): the composer's words and the open chat outlive a remount, per scope.
test('a draft survives a new composer, per scope; an empty box clears it', () => {
  clearDrafts();
  writeDraft('local', 'How was my week');
  expect(readDraft('local')).toBe('How was my week');
  expect(readDraft('acct-2')).toBe('');
  writeDraft('local', '');
  expect(readDraft('local')).toBe('');
});
test('the open chat is noted per scope and forgotten on a new chat', () => {
  noteOpenChat('local', 'chat-1');
  expect(openChatFor('local')).toBe('chat-1'); expect(openChatFor('other')).toBeNull();
  noteOpenChat('local', null);
  expect(openChatFor('local')).toBeNull();
});
test('PR-041: after a full reload (memory gone) the tab still reopens the chat for 30 minutes; never another scope', () => {
  const kept = new Map<string, string>(), store = {getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => { kept.set(k, v); }, removeItem: (k: string) => { kept.delete(k); }};
  const t0 = Date.parse('2026-11-04T03:12:00Z');
  noteOpenChat('local', 'chat-9', t0, store);
  forgetOpenChatsInMemory();
  expect(openChatFor('local', t0 + 10 * 60_000, store)).toBe('chat-9');
  expect(openChatFor('acct-2', t0 + 10 * 60_000, store)).toBeNull();
  expect(openChatFor('local', t0 + 31 * 60_000, store)).toBeNull();
  // Only an id and a time are kept, nothing of the conversation.
  expect(JSON.parse(kept.get(OPEN_CHAT_KEY)!)).toEqual({local: {id: 'chat-9', at: t0}});
  noteOpenChat('local', null, t0, store);
  expect(kept.has(OPEN_CHAT_KEY)).toBe(false);
});
