'use client';
import './platform.css';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { snapshotIsStale, type Position } from '../../lib/positions';
import { formatUnits } from '@zigoals/chain-config';
export const amount=(value:string,decimals=18)=>formatUnits(value,decimals);
export function PlatformNav(){return <nav className="tab-row view-tabs platform-nav" aria-label="Goal workspace"><Link href="/app/goals">Goals</Link><Link href="/app/goals/positions">Positions</Link></nav>;}
export function Freshness({at,sync}:{at:string;sync?:Position['sync']}){
 const [now,setNow]=useState(()=>Date.now());useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),60000);return ()=>clearInterval(timer);},[]);
 const label=sync==='ERROR'?'Refresh failed · previous snapshot':sync==='MANUAL'?'Manual observation':sync==='STALE'||snapshotIsStale(at,now)?'Stale snapshot':'Recent snapshot';
 return <span>{label} · <time dateTime={at}>{new Date(at).toLocaleString()}</time> · refresh to verify current state (verified snapshots age after 15 minutes)</span>;
}
