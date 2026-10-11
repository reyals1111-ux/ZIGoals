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
 return <span>{label} · <time dateTime={at}>{formatDateTime(at)}</time> · refresh to verify current state (verified snapshots age after 15 minutes)</span>;
}
