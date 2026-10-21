'use client';
import type {Position} from '../../lib/positions';
import {zig} from '../../lib/earn/format';
import {snapshotHeight} from '../../lib/position-reader';
import {formatDate, formatDateTime} from '../../lib/visual-format';
import {useEarnWallets, type EarnWallet, type PositionRead} from './use-earn-positions';
import {Unavailable} from './live-figure';
import {SectionHeading} from '../ui/section-heading';

/**
 * Session AF (L1, ADR-028 H11, H16): "your Earn summary" for a linked or connected ZIGChain wallet, read through ZIGoals'
 * read-only positions relay (/api/positions: one block height, no address logged). While a public build still refuses
 * mainnet addresses (until the relay change of lane L2a), the summary says so with the relay's own sentence, never a
 * guess. Practice (testnet) stake is shown apart and never counts toward money totals (H11). Kept in memory only.
 */
type Read = PositionRead;
/** The block time the relay read at (the newest observation), else the time of the read. */
const asOf = (positions: Position[], at: string) => positions.map(p => p.observedAt).filter((t): t is string => !!t).sort().at(-1) ?? at;
const short = (a: string) => `${a.slice(0, 10)}…${a.slice(-6)}`;
function totals(positions: Position[]) {
  const sum = (type: Position['sourceType']) => positions.filter(p => p.sourceType === type).reduce((n, p) => n + BigInt(p.quantity) * 10n ** BigInt(18 - Math.min(18, p.decimals)), 0n).toString();
  const exits = positions.filter(p => p.sourceType === 'NATIVE_UNBONDING' && p.exitDate).map(p => p.exitDate!).sort();
  return {staked: sum('NATIVE_STAKING'), rewards: sum('NATIVE_REWARDS'), unbonding: sum('NATIVE_UNBONDING'), nextExit: exits[0] ?? null};
}
/** Session AF chunk 2: the wallets and their reads come from the page (components/earn/use-earn-positions.ts), shared with
 *  the Start-here path, so each wallet is read once. */
export {useEarnWallets};
export function LiveSummary({wallets, reads}: {wallets: EarnWallet[]; reads: Read[]}) {
  if (!wallets.length) return null;
  return <section id="summary" className="earn-summary panel" aria-labelledby="summary-title">
    <SectionHeading id="summary-title" eyebrow="Your wallets, read-only" title="Your Earn summary" lede="Read through ZIGoals’ read-only relay at one block height. ZIGoals never holds your keys."/>
    <ul className="earn-summary-list">{reads.map(r => <li key={`${r.mode}:${r.address}`} data-mode={r.mode}>
      <p className="earn-summary-who"><b>{r.label}</b> <span className="earn-mono">{short(r.address)}</span> {r.mode === 'TESTNET_READ_ONLY' && <span className="earn-tag" data-tone="beta">Practice: no real value</span>}</p>
      {r.state.phase === 'loading' ? <p className="earn-reading">reading…</p>
        : r.state.phase === 'ok' ? (() => { const t = totals(r.state.positions); return <dl className="earn-figures" data-live-figure="summary" data-state="ok">
          <div className="earn-figure"><dt>Staked{r.mode === 'TESTNET_READ_ONLY' ? ' (practice)' : ''}</dt><dd><strong className="earn-value">{zig(t.staked)}</strong></dd></div>
          <div className="earn-figure"><dt>Rewards waiting to be claimed</dt><dd><strong className="earn-value">{zig(t.rewards)}</strong></dd></div>
          <div className="earn-figure"><dt>Next unbonding ends</dt><dd><strong className="earn-value">{t.nextExit ? formatDate(t.nextExit) : 'Nothing unbonding'}</strong></dd></div>
          <p className="earn-source fine">ZIGoals’ read-only relay{(() => { const h = snapshotHeight(r.state.positions); return h ? <> · block {h.toString()}</> : null; })()} · as of <time dateTime={asOf(r.state.positions, r.state.at)}>{formatDateTime(asOf(r.state.positions, r.state.at))}</time></p>
        </dl>; })()
        : <p className="earn-figure" data-live-figure="summary" data-state="unavailable" data-reason={r.state.phase === 'refused' ? 'RELAY_REFUSED' : 'UPSTREAM_DOWN'}><Unavailable reason="UPSTREAM_DOWN" short/> · {r.state.message}</p>}
    </li>)}</ul>
  </section>;
}
