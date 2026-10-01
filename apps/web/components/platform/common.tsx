'use client';
import './platform.css';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { snapshotIsStale, type Position } from '../../lib/positions';
import { formatUnits } from '@zigoals/chain-config';
import { formatDateTime, formatPlainDecimal } from '../../lib/visual-format';
export const amount=(value:string,decimals=18)=>formatUnits(value,decimals);
/** An amount as display text: the locale's decimal sign, never grouped (lib/visual-format.ts). Inputs keep `amount`. */
export const shownAmount=(value:string,decimals=18)=>formatPlainDecimal(formatUnits(value,decimals));
export function PlatformNav(){return <nav className="tab-row view-tabs platform-nav" aria-label="Goal workspace"><Link href="/app/goals">Goals</Link><Link href="/app/goals/positions">Positions</Link></nav>;}
export function Freshness({at,sync}:{at:string;sync?:Position['sync']}){
 const [now,setNow]=useState(()=>Date.now());useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),60000);return ()=>clearInterval(timer);},[]);
 const label=sync==='ERROR'?'Refresh failed · previous snapshot':sync==='MANUAL'?'Manual observation':sync==='STALE'||snapshotIsStale(at,now)?'Stale snapshot':'Recent snapshot';
 return <span>{label} · <time dateTime={at}>{formatDateTime(at)}</time> · refresh to verify current state (verified snapshots age after 15 minutes)</span>;
}
