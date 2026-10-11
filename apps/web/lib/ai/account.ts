/**
 * Account hygiene for ZIGi (ADR-012 decision 9): when an account is deleted or erased on this device, its keys (memory
 * and the encrypted store) and its chats go with it. Called from the vault's own erase path with the account scope;
 * never touches another scope, the vault key, the wallet or the recovery secret. The key store and the chat store are
 * imported here, when the erase runs, so the Settings page does not ship them (follow-up part A).
 */
export async function forgetAiAccount(scope: string): Promise<void> {
  const [{dropMemoryKeys, forgetAiKeys}, {forgetChats}, {forgetLinkTokens}] = await Promise.all([import('./keys'), import('./chats'), import('../links/token-store')]);
  dropMemoryKeys();
  const key = scope.toLowerCase();
  // Session W: the account's linked services (Spotify, health links) go with it too, sealed tokens included.
  const results = await Promise.allSettled([forgetAiKeys(key), forgetChats(key), forgetLinkTokens(key)]);
  const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (failed) throw failed.reason instanceof Error ? failed.reason : Error('ZIGi\'s keys or chats, or this account\'s linked services, could not be removed.');
}
