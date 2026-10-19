'use client';
import {useCallback} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {useShowcase} from '../showcase-controls';
import {ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {getAppStorage, isShowcase} from '../../lib/showcase-storage';
import {LINKED_WALLETS, LinkedWalletError, linkWallet, linkedWalletsOf, writeLinkedWallets, type LinkInput, type LinkedWallet, type LinkedWallets} from '../../lib/linked-wallets';

export const SHOWCASE_WALLET_MESSAGE = 'The Showcase keeps its simulated wallet. Exit the Showcase to link a wallet.';
/**
 * Session AE (Part 6, ADR-027): the linked-wallets record in a component (the wallet menu, the phone's Status sheet and
 * Today's wallet card). It reads through the app storage like every device record and refreshes on a save anywhere, a
 * change in another tab or an account change; it writes only on the person's choice, never in the Showcase (which keeps
 * its simulated wallet) and never over a record it could not read.
 */
export function useLinkedWallets() {
  const record = useDeviceRecord(LINKED_WALLETS), showcase = useShowcase();
  const told = () => window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: LINKED_WALLETS.key}));
  const write = useCallback((change: (current: LinkedWallets) => LinkedWallets) => {
    if (isShowcase()) throw new LinkedWalletError(SHOWCASE_WALLET_MESSAGE);
    const next = writeLinkedWallets(getAppStorage(), change); told(); return next;
  }, []);
  const link = useCallback(async (input: LinkInput): Promise<LinkedWallet> => {
    if (isShowcase()) throw new LinkedWalletError(SHOWCASE_WALLET_MESSAGE);
    const entry = await linkWallet(getAppStorage(), input); told(); return entry;
  }, []);
  return {loaded: record.loaded, unreadable: record.unreadable, data: record.data, showcase, wallets: showcase ? [] : linkedWalletsOf(record.data), stored: showcase ? 0 : record.data.wallets?.length ?? 0, write, link};
}
