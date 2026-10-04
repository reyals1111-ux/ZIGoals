import 'fake-indexeddb/auto';
import {expect, test} from 'vitest';
import {forgetAiAccount} from './account';
import {indexedDbChatStore, newChat} from './chats';
import {FAKE_KEY} from './fixtures/mock-streams';
import {hasRememberedKey, holdKey, readKey, rememberKey} from './keys';

// ADR-012 decision 9: deleting or erasing an account removes its ZIGi keys and chats, and only its own.
test('forgetAiAccount removes the scope\'s remembered keys, in-memory keys and chats, and leaves other scopes alone', async () => {
  await rememberKey('acct-a', 'openai', FAKE_KEY); holdKey('acct-a', 'anthropic', FAKE_KEY);
  await rememberKey('acct-b', 'openai', FAKE_KEY);
  await indexedDbChatStore('acct-a').save(newChat('acct-a', 'openai', 'm', new Date(), 'c1'));
  await indexedDbChatStore('acct-b').save(newChat('acct-b', 'openai', 'm', new Date(), 'c2'));
  await forgetAiAccount('ACCT-A');
  expect(await hasRememberedKey('acct-a', 'openai')).toBe(false); expect(await readKey('acct-a', 'anthropic')).toBeNull();
  expect(await indexedDbChatStore('acct-a').list()).toEqual([]);
  expect(await hasRememberedKey('acct-b', 'openai')).toBe(true); expect((await indexedDbChatStore('acct-b').list()).map(c => c.id)).toEqual(['c2']);
  await expect(forgetAiAccount('never-seen')).resolves.toBeUndefined();
});
