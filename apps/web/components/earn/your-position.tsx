'use client';
import {tokenAmount, zig} from '../../lib/earn/format';
import {nativeOwn, ownAsOf, valdoraOwn} from '../../lib/earn/your-position';
import {snapshotHeight} from '../../lib/position-reader';
import {formatDateTime} from '../../lib/visual-format';
import {Unavailable} from './live-figure';
import type {PositionRead} from './use-earn-positions';

/**
 * Session AF (L1c, ledger P1.23; ADR-028 H11, H16): "Your position" in an earning option's section, for each linked or
 * connected wallet: the stake and the rewards waiting (native staking) or the stZIG held (Valdora), each with the relay's
 * block and "as of". It uses the reads the Earn page already made for the summary and the Start-here path (one read per
 * wallet, components/earn/use-earn-positions.ts): nothing new is fetched by address. Without a wallet it shows nothing;
 * a practice wallet is labelled and never counted as money. Read-only: it signs and moves nothing.
 */
const short = (a: string) => `${a.slice(0, 10)}…${a.slice(-6)}`;
export function YourPosition({reads, kind}: {reads: readonly PositionRead[]; kind: 'native' | 'valdora'}) {
  if (!reads.length) return null;
  const id = `${kind}-mine`;
  return <div className="earn-mine" data-mine={kind}>
    <h3 className="earn-subhead">Your position</h3>
    <ul className="earn-summary-list">{reads.map(r => <li key={`${r.mode}:${r.address}`} data-mode={r.mode}>
      <p className="earn-summary-who"><b>{r.label}</b> <span className="earn-mono">{short(r.address)}</span> {r.mode === 'TESTNET_READ_ONLY' && <span className="earn-tag" data-tone="beta">Practice: no real value</span>}</p>
      {r.state.phase === 'loading' ? <p className="earn-reading" data-live-figure={id} data-state="loading">reading…</p>
        : r.state.phase === 'ok' ? (() => {
          const positions = r.state.positions, height = snapshotHeight(positions), at = ownAsOf(positions, r.state.at);
          const source = <p className="earn-source fine">ZIGoals’ read-only relay{height ? <> · block {height.toString()}</> : null} · as of <time dateTime={at}>{formatDateTime(at)}</time></p>;
          if (kind === 'native') {
            const own = nativeOwn(positions);
            return <dl className="earn-figures" data-live-figure={id} data-state="ok">
              <div className="earn-figure"><dt>Your stake{r.mode === 'TESTNET_READ_ONLY' ? ' (practice)' : ''}</dt><dd><strong className="earn-value">{zig(own.staked)}</strong></dd></div>
              <div className="earn-figure"><dt>Rewards waiting to be claimed</dt><dd><strong className="earn-value">{zig(own.rewards)}</strong></dd></div>
              {source}
            </dl>;
          }
          const own = valdoraOwn(positions);
          return own ? <dl className="earn-figures" data-live-figure={id} data-state="ok">
            <div className="earn-figure"><dt>Your stZIG{r.mode === 'TESTNET_READ_ONLY' ? ' (practice)' : ''}</dt><dd><strong className="earn-value">{tokenAmount(own.units, own.decimals, 'stZIG')}</strong></dd></div>
            {source}
          </dl> : <p className="earn-figure" data-live-figure={id} data-state="unavailable" data-reason="MALFORMED"><Unavailable reason="MALFORMED"/></p>;
        })()
        : <p className="earn-figure" data-live-figure={id} data-state="unavailable" data-reason={r.state.phase === 'refused' ? 'RELAY_REFUSED' : 'UPSTREAM_DOWN'}><Unavailable reason="UPSTREAM_DOWN" short/> · {r.state.message}</p>}
    </li>)}</ul>
    <p className="fine">The same read-only read as your Earn summary, at one block height; ZIGoals asks nothing more about your wallet here.</p>
  </div>;
}
