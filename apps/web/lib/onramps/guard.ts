import type {LinkedWallet} from '../linked-wallets';
import {isEvmAddress, isSolanaAddress, addressShapeOk, decodeBech32} from '../wallet-address';
import {cosmosHubAddress} from '../wallets/balances/cosmos-hub';
import {NETWORKS, type NetworkId} from './assets';

/**
 * Session AF (L2b, Part 4, ADR-028 H83; A2.4, A2.10): the network-mismatch guard. The address a purchase goes to comes only
 * from a wallet the person linked whose kind matches the network (an EVM account for the Ethereum networks, a Solana
 * account for Solana, a watched Bitcoin address for Bitcoin, and for the Cosmos Hub the `cosmos1…` twin of a linked
 * ZIGChain key, same 20 bytes); an EVM wallet that tracks only some chains is offered for those. It is never typed, never
 * taken from a page, never a ZIGoals address (ZIGoals has none), and never a `zig1…` address (no provider delivers to
 * ZIGChain). `checkedAddress` refuses anything else, so a builder can never be handed an address of the wrong network.
 */
export class NetworkMismatch extends Error {}
export type Destination = {walletId: string; label: string; address: string; network: NetworkId};
/** The linked wallets that can receive on this network, with the address each would receive at. */
export function destinationsFor(network: NetworkId, wallets: readonly LinkedWallet[]): Destination[] {
  const n = NETWORKS[network];
  return wallets.flatMap(w => {
    if (w.kind !== n.walletKind) return [];
    if (w.kind === 'evm' && w.chains?.length && !w.chains.includes(n.chainId)) return [];
    try {
      const address = w.kind === 'cosmos' ? cosmosHubAddress(w.address) : w.address;
      return [{walletId: w.id, label: w.label, address: checkedAddress(network, address), network}];
    } catch { return []; }
  });
}
/** The address, if and only if it is a well-formed address of this network; throws NetworkMismatch otherwise. */
export function checkedAddress(network: NetworkId, address: string): string {
  const kind = NETWORKS[network].walletKind;
  if (typeof address !== 'string' || /^zig1/i.test(address)) throw new NetworkMismatch('ZIGoals never sends a purchase to a ZIGChain address.');
  const ok = kind === 'evm' ? isEvmAddress(address)
    : kind === 'solana' ? isSolanaAddress(address)
    : kind === 'btc' ? addressShapeOk('btc', address)
    : (() => { const d = decodeBech32(address); return !!d && d.hrp === 'cosmos' && d.encoding === 'bech32'; })();
  if (!ok) throw new NetworkMismatch(`That address is not a ${NETWORKS[network].name} address, so it is not offered.`);
  return address;
}
