'use client';
import {NETWORK_WORDS, type StakingNetwork} from '@zigoals/chain-config/networks';

/**
 * Session AF (ADR-028 H46; L2 design §4): the network in big plain words. Practice (ZIGChain Testnet, no real value) is
 * drawn with a dashed amber ring on a striped backdrop; real (ZIGChain mainnet, real ZIG) with a solid gold badge and a
 * lock. The chosen network is repeated under every amount (NetworkLine), never abbreviated, wrapping rather than cut.
 * Session AF Gate C (design critique, money pages 11): the chosen tile carries a checked ring (a radio's mark), so the
 * choice shows on the tile itself; the line under the two tiles is a small note of the choice (NetworkBanner), not a
 * third, larger line that read like another option.
 */
export function NetworkSwitch({network, onChoose, disabled}: {network: StakingNetwork; onChoose: (network: StakingNetwork) => void; disabled?: boolean}) {
  return <div className="staking-network-switch" role="group" aria-label="Network">
    {(['practice', 'real'] as const).map(id => <button key={id} type="button" className={`staking-network-option is-${id}`} aria-pressed={network === id} disabled={disabled} onClick={() => { if (network !== id) onChoose(id); }}>
      <span className="staking-network-check" aria-hidden="true"/>
      <span className="staking-network-badge">{id === 'real' && <span aria-hidden="true">🔒 </span>}{NETWORK_WORDS[id].badge}</span>
      <span className="staking-network-label">{NETWORK_WORDS[id].label}</span>
      <span className="staking-network-chain">{NETWORK_WORDS[id].name} · {NETWORK_WORDS[id].chainId}</span>
    </button>)}
  </div>;
}
/** The chosen network, said once under the two tiles as a small note. */
export function NetworkBanner({network}: {network: StakingNetwork}) {
  return <p className={`staking-network-banner is-${network}`}><span className="staking-network-banner-lead">Chosen network: </span><strong>{NETWORK_WORDS[network].label}</strong> · {NETWORK_WORDS[network].name} ({NETWORK_WORDS[network].chainId})</p>;
}
export function NetworkLine({network}: {network: StakingNetwork}) {
  return <p className={`staking-network-line is-${network}`}>{NETWORK_WORDS[network].line}</p>;
}
