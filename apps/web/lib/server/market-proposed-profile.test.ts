import {test,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {DurableMarketAccount,type AtomicMarketStorage} from './durable-market-account';
test('proposed activation profile is explicitly incomplete and cannot activate an unconfirmed provider budget',async()=>{
 const proposal=JSON.parse(readFileSync(new URL('../../../../docs/run11/MARKET_PROPOSED_PROFILE.json',import.meta.url),'utf8'));
 expect(proposal.status).toBe('PROPOSAL_ONLY_NOT_ACTIVATION_CONFIG');expect(Object.values(proposal.activation_prerequisites).every(v=>v===false)).toBe(true);expect(proposal.unresolved_do_not_default).toMatchObject({accounting_period:null,quoteCost:null,operationCosts:null,current_period_credits_already_used:null});
 const storage:AtomicMarketStorage={get:async()=>undefined,put:async()=>{throw Error('Proposal must never write');},delete:async()=>{throw Error('Proposal must never write');},transaction:async()=>{throw Error('Proposal must never reach admission');}};
 expect(await new DurableMarketAccount(storage,()=>Date.now(),JSON.stringify(proposal)).apply({action:'inspect'})).toEqual({ok:false,reason:'POLICY_UNAVAILABLE'});
 expect(await new DurableMarketAccount(storage,()=>Date.now(),JSON.stringify({policy:proposal.proposed_policy,...proposal.proposed_coordinator})).apply({action:'inspect'})).toEqual({ok:false,reason:'POLICY_UNAVAILABLE'});
 const p=proposal.proposed_policy;for(const unit of ['minute','monthly']){expect(p.operating[unit]).toBeLessThan(p[unit==='minute'?'providerMinuteLimit':'providerMonthlyLimit']);expect(p.monitoringMaximum[unit]).toBeGreaterThanOrEqual(p.monitoringReserve[unit]);expect(p.optionalCeiling[unit]).toBeLessThan(p.operating[unit]-p.monitoringReserve[unit]);}
});
