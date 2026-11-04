import {expect, test} from 'vitest';
import {clearDrafts, noteOpenChat, openChatFor, readDraft, writeDraft} from './composer-draft';

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
