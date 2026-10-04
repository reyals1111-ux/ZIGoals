import {forgetChats} from './chats';
import {dropMemoryKeys, forgetAiKeys} from './keys';

/**
 * Account hygiene for ZIGi (ADR-012 decision 9): when an account is deleted or erased on this device, its keys (memory
 * and the encrypted store) and its chats go with it. Called from the vault's own erase path with the account scope;
 * never touches another scope, the vault key, the wallet or the recovery secret.
 */
export async function forgetAiAccount(scope: string): Promise<void> {
  dropMemoryKeys();
  const key = scope.toLowerCase();
  const results = await Promise.allSettled([forgetAiKeys(key), forgetChats(key)]);
  const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (failed) throw failed.reason instanceof Error ? failed.reason : Error('ZIGi\'s keys or chats for this account could not be removed.');
}
