'use client';
import Link from 'next/link';
import {useShowcase} from '../showcase-controls';
import { AppIcon } from '../app-icon';
import { usePlatform } from './use-platform';
import { amount } from './common';
import { rescaleUnits, positionSync } from '../../lib/positions';
import { readAprAssumption, watchScope } from '../../lib/owner-preview';
export function StakingCard(){
 const showcase=useShowcase();
 const store=usePlatform(),scope=watchScope(store.data);
 const positions=store.data.positions.filter(p=>p.network===scope?.network&&p.account===scope.account&&p.providerId==='native-zig'&&p.sourceType==='NATIVE_STAKING');
 const total=positions.reduce((n,p)=>n+BigInt(rescaleUnits(p.quantity,p.decimals,18)),0n).toString();
 const apr=scope?readAprAssumption(store.data,scope.network,scope.account):'';
 const needsRefresh=positions.some(p=>positionSync(p)!=='CURRENT');
 return <section className="staking-card" aria-label="Staked ZIG overview"><div className="section-heading"><h2><AppIcon name="future" luminous/> {showcase?'ZIG reward reserve':'Staked ZIG'}</h2><span className="pill">Read-only</span></div>
 {store.error?<p role="alert">Private snapshot unavailable. Review Wallet &amp; data.</p>:!store.loaded?<p role="status">Loading private snapshot…</p>:showcase?<><strong className="stake-card-value nebula-number">{amount(store.data.positions.find(p=>p.id==='showcase-zig')?.quantity??'0',6)} <span>ZIG</span></strong><p className="fine">SHOWCASE DATA · fictional reward quantity, no wallet observation</p></>:scope?<><strong className="stake-card-value nebula-number">{amount(total)} <span>ZIG</span></strong><p className="fine">{scope.network==='zigchain-1'?'Mainnet':'Testnet'} · {needsRefresh?'Snapshot needs refresh':'Saved snapshot'}</p></>:<p>Give your existing stake a place in your plans. Add a public address in Positions.</p>}
 <div className="staking-apr"><small>Net APR assumption</small><strong>{apr===''?'Not set':`${apr}%`}</strong></div><Link className="secondary" href="/app/goals/positions">View stake / positions →</Link></section>;
}
