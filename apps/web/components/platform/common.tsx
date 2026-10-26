'use client';
import './platform.css';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { snapshotIsStale, type Position } from '../../lib/positions';
import { formatUnits } from '@zigoals/chain-config';
import { formatDateTime, formatExactNumber } from '../../lib/visual-format';
export const amount=(value:string,decimals=18)=>formatUnits(value,decimals);
/** An amount as display text in the person's locale: grouped ("300,000 ZIG", Session Z-Cloud Part 4.8), every digit kept,
 *  the locale's decimal sign (lib/visual-format.ts). Inputs keep `amount`, ungrouped: a grouped amount typed in is refused. */
export const shownAmount=(value:string,decimals=18)=>formatExactNumber(formatUnits(value,decimals));
export function PlatformNav(){return <nav className="tab-row view-tabs platform-nav" aria-label="Goal workspace"><Link href="/app/goals">Goals</Link><Link href="/app/staking#positions">Positions</Link></nav>;}
export function Freshness({at,sync}:{at:string;sync?:Position['sync']}){
 const [now,setNow]=useState(()=>Date.now());useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),60000);return ()=>clearInterval(timer);},[]);
 const label=sync==='ERROR'?'Refresh failed · previous snapshot':sync==='MANUAL'?'Manual observation':sync==='STALE'||snapshotIsStale(at,now)?'Stale snapshot':'Recent snapshot';
 // Session AF Gate C (design critique, copy): a value the person typed is theirs; only a read snapshot is refreshed to verify.
 // Session AH (ST1, B-052): a time ahead of this device's clock is never shown as if it were fine.
 if(Date.parse(at)>now+60000)return <span>{label} · <time dateTime={at}>{formatDateTime(at)}</time> · this time is ahead of this device&rsquo;s clock, so check the device&rsquo;s date and time</span>;
 if(sync==='MANUAL')return <span>{label} · <time dateTime={at}>{formatDateTime(at)}</time> · the value you entered</span>;
 return <span>{label} · <time dateTime={at}>{formatDateTime(at)}</time> · refresh to verify current state (verified snapshots age after 15 minutes)</span>;
}
