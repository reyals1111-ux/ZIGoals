'use client';
import {explorerLinksFor} from '@zigoals/ecosystem-registry/links';
import type {StakingNetwork} from '@zigoals/chain-config/networks';
import {NetworkLine} from './network-switch';

/**
 * Session AF (L2 design §4): after the Sign press, the transaction's own progress in plain words — waiting for the
 * signature, sending, confirming, confirmed (with the verified explorer links and the block) or stopped (the plain-words
 * reason, whether anything moved, and the explorer links whenever a hash exists).
 */
export type Progress = {state: 'AWAITING_SIGNATURE' | 'BROADCASTING' | 'CONFIRMING' | 'SUCCESS' | 'FAILED' | 'REJECTED'; hash?: string; height?: number; message?: string; uncertain?: boolean; refreshed?: string};
const WORDS: Record<Progress['state'], string> = {
  AWAITING_SIGNATURE: 'Waiting for your signature in Keplr…',
  BROADCASTING: 'Sending it to the network…',
  CONFIRMING: 'Sent. Waiting for the network to confirm it…',
  SUCCESS: 'Confirmed on the network.',
  FAILED: 'This did not go through.',
  REJECTED: 'Stopped in your wallet.',
};
export function TxProgress({progress, network, chainId, onClose}: {progress: Progress; network: StakingNetwork; chainId: string; onClose?: () => void}) {
  const links = progress.hash ? explorerLinksFor(chainId, 'transaction', progress.hash) : [];
  const done = progress.state === 'SUCCESS' || progress.state === 'FAILED' || progress.state === 'REJECTED';
  return <section className={`panel staking-progress is-${progress.state.toLowerCase()}`} aria-labelledby="staking-progress-title" aria-live="polite">
    <h3 id="staking-progress-title">{WORDS[progress.state]}</h3>
    <NetworkLine network={network}/>
    {progress.state === 'SUCCESS' && progress.height !== undefined && <p>Included at block {progress.height}.</p>}
    {progress.message && <p role={progress.state === 'FAILED' || progress.state === 'REJECTED' ? 'alert' : undefined}>{progress.message}</p>}
    {progress.uncertain && <p className="notice">It may still be confirmed. Check the transaction below before trying again; ZIGoals never sends it twice.</p>}
    {progress.hash && <p className="fine staking-hash">Transaction <code>{progress.hash}</code></p>}
    {links.length > 0 && <p className="staking-explorer-links">{links.map(link => <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">Check it on {link.name} ↗</a>)}</p>}
    {progress.refreshed && <p className="fine">{progress.refreshed}</p>}
    {done && onClose && <button type="button" className="secondary" onClick={onClose}>Done</button>}
  </section>;
}
