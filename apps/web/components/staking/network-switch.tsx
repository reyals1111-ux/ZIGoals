'use client';
import {NETWORK_WORDS, type StakingNetwork} from '@zigoals/chain-config/networks';

/**
 * Session AF (ADR-028 H46; L2 design §4): the network in big plain words. Practice (ZIGChain Testnet, no real value) is
 * drawn with a dashed amber ring on a striped backdrop; real (ZIGChain mainnet, real ZIG) with a solid gold badge and a
 * lock. The chosen network is repeated under every amount (NetworkLine), never abbreviated, wrapping rather than cut.
 */
export function NetworkSwitch({network, onChoose, disabled}: {network: StakingNetwork; onChoose: (network: StakingNetwork) => void; disabled?: boolean}) {
  return <div className="staking-network-switch" role="group" aria-label="Network">
    {(['practice', 'real'] as const).map(id => <button key={id} type="button" className={`staking-network-option is-${id}`} aria-pressed={network === id} disabled={disabled} onClick={() => { if (network !== id) onChoose(id); }}>
      <span className="staking-network-badge">{id === 'real' && <span aria-hidden="true">🔒 </span>}{NETWORK_WORDS[id].badge}</span>
      <span className="staking-network-label">{NETWORK_WORDS[id].label}</span>
      <span className="staking-network-chain">{NETWORK_WORDS[id].name} · {NETWORK_WORDS[id].chainId}</span>
    </button>)}
  </div>;
}
export function NetworkLine({network}: {network: StakingNetwork}) {
  return <p className={`staking-network-line is-${network}`}>{NETWORK_WORDS[network].line}</p>;
}
