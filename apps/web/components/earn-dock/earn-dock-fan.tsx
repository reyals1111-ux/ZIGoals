'use client';
import Image from 'next/image';
import Link from 'next/link';
import {useMemo} from 'react';
import {DOCK_APPS, dockBadges, dockHref} from '../../lib/earn/dock';
import {tokenAmount, zig} from '../../lib/earn/format';
import {EarnGlyphMark} from '../earn/earn-glyph';
import {useEarnWallets, usePositionReads, useStakingFacts} from '../earn/use-earn-positions';

/**
 * Session AF chunk 2 (Part 5: P5.1, P5.2): the dock's fan, its own chunk (loaded on the first press). Round buttons for the
 * live ecosystem apps with their official logos, each opening that app's section of the Earn page; a badge shows the
 * person's own position where ZIGoals can read one (linked or connected ZIGChain wallets, read-only through the relay;
 * never a rate, never practice stake). The buttons come out once per opening (CSS, `data-i` staggers them); still under
 * reduced motion and Motion Off.
 */
export default function EarnDockFan({onPick}: {onPick: () => void}) {
  const wallets = useEarnWallets(), {journal} = useStakingFacts();
  const real = useMemo(() => wallets.filter(w => w.mode === 'MAINNET_READ_ONLY'), [wallets]);
  const reads = usePositionReads(real, journal);
  const ok = reads.filter(r => r.state.phase === 'ok');
  const badges = ok.length ? dockBadges(ok.flatMap(r => r.state.phase === 'ok' ? r.state.positions : [])) : null;
  return <div id="earn-dock-fan" className="earn-dock-fan" role="group" aria-label="Ways to earn">
    {DOCK_APPS.map((app, i) => {
      const value = !badges || !app.badge ? null : app.badge === 'staked' ? badges.staked > 0n ? zig(badges.staked.toString(), {compact: true}) : null : badges.stzig > 0n ? tokenAmount(badges.stzig.toString(), 6, 'stZIG', {compact: true}) : null;
      return <Link key={app.id} href={dockHref(app.id)} className="earn-dock-app" data-i={i} data-app={app.id} onClick={onPick}
        aria-label={`${app.label}${value ? `: you hold ${value}` : ''}. Opens its part of the Earn page`}>
        <span className="earn-dock-app-face" aria-hidden="true">{app.logo ? <Image src={app.logo} alt="" width={30} height={30} unoptimized/> : <EarnGlyphMark/>}</span>
        <span className="earn-dock-app-label" aria-hidden="true">{app.label}</span>
        {value && <span className="earn-dock-badge" aria-hidden="true" data-badge={app.badge}>{value}</span>}
      </Link>;
    })}
  </div>;
}
