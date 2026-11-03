'use client';
import * as z from 'zod';
import {useDeviceRecord} from '../ai/use-device-record';
import {useGoals} from '../goal-provider';
import {useShowcase} from '../showcase-controls';
import {usePagesView} from '../pages/use-pages-view';
import {EARN_PREFS} from '../../lib/earn/records';
import {LINKED_WALLETS_KEY} from '../../lib/linked-wallets-key';
import {chainChosen, chainLinked, earnShown, walletInUse, type EarnChoice} from '../../lib/chain-choice';
import {isShown} from '../../lib/pages/visibility';
import {syncedPagesState} from '../../lib/pages/view-store';
import type {DeviceRecordSpec} from '../../lib/device-record';
import type {PagesView} from '../../lib/pages/schema';

/**
 * Session AK X1: the linked-wallets record read only for "does it hold a wallet" (lib/linked-wallets.ts owns the record and
 * its full checks; this loose read never writes, so it ships no address checks with the shell).
 */
const LINKED_WALLETS_PRESENCE: DeviceRecordSpec<{version: 1; wallets?: unknown[]}> = {
  key: LINKED_WALLETS_KEY,
  schema: z.looseObject({version: z.literal(1), wallets: z.array(z.unknown()).max(1000).optional()}),
  empty: () => ({version: 1}),
};
export type ChainChoice = {chosen: boolean; linked: boolean; wallet: boolean; linkedWallets: number; showcase: boolean; earn: EarnChoice; earnShown: boolean; view: PagesView};

/**
 * Whether this person chose the chain (lib/chain-choice.ts, RELEASE_REVIEW R2–R5): read from the goal provider's wallet
 * state, the linked wallets and the Earn switches on this device, and the pages view. Every surface that would show a
 * wallet, a network or ZIG asks this one hook.
 */
export function useChainChoice(): ChainChoice {
  const showcase = useShowcase(), s = useGoals(), view = usePagesView();
  const wallets = useDeviceRecord(LINKED_WALLETS_PRESENCE), prefs = useDeviceRecord(EARN_PREFS);
  const wallet = walletInUse(s), linkedWallets = showcase ? 0 : wallets.data.wallets?.length ?? 0;
  const earn: EarnChoice = prefs.loaded && !prefs.unreadable ? {pageShown: prefs.data.pageShown, governanceShown: prefs.data.governanceShown} : {};
  const linked = chainLinked({showcase, wallet, linkedWallets});
  // Unreadable settings show every page (the safe fallback); that is not the person choosing the chain.
  const chosen = chainChosen({linked, view, earn, viewIsChoice: syncedPagesState() !== 'unreadable'});
  return {chosen, linked, wallet, linkedWallets, showcase, earn, earnShown: earnShown({wealthShown: isShown(view, 'wealth'), chosen, earn}), view};
}
