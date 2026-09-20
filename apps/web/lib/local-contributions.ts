import {TESTNET} from '@zigoals/chain-config';
import {parseLocalLedger,type LocalLedger} from './local-ledger';
import type {Platform} from './positions';
import {appendContribution} from './goal-intelligence';
/** Replay only the validated, persisted simulation journal. Preview state is never passed here.
 * Stable chronological indexes distinguish even same-millisecond confirmations. Retrying a
 * interrupted private-store write is idempotent; the original receipt remains authoritative. */
export function syncConfirmedLocalContributions(store:Platform,ledger:LocalLedger):Platform{
 const confirmed=parseLocalLedger(JSON.stringify(ledger));
 let next=store;
 for(const [index,event] of [...confirmed.activity].reverse().entries()){
  if(event.action!=='Added funds'&&event.action!=='Withdrew funds')continue;
  const origin=confirmed.goals.find(g=>g.id===event.goalId)?.created_at;
  const ref=`local:${origin}:${event.goalId}:${index}:${event.timestamp}`;
  if(next.contributions.some(e=>e.transactionRef===ref))continue;
  next=appendContribution(next,{id:ref,goalId:event.goalId,goalScope:'local',direction:event.action==='Added funds'?'IN':'OUT',quantity:event.amount,asset:'ZIG',decimals:TESTNET.nativeAsset.decimals,occurredAt:event.timestamp,provenance:'LOCAL_CONFIRMED',transactionRef:ref});
 }
 return next;
}
