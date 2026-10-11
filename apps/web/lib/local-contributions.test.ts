import {describe,it,expect} from 'vitest';
import {applyLocal,initialLedger} from './local-ledger';
import {emptyPlatform} from './positions';
import {syncConfirmedLocalContributions} from './local-contributions';
const at='2026-09-19T10:00:00.000Z';
describe('confirmed Local Demo contribution evidence',()=>{
 it('records no contribution for a preview or an empty ledger',()=>{
  const ledger=applyLocal(initialLedger(),{kind:'create'},at),store=emptyPlatform();
  applyLocal(ledger,{kind:'deposit',id:'1',amount:'5000000000000000000'},at);
  expect(syncConfirmedLocalContributions(store,ledger).contributions).toEqual([]);
 });
 it('imports each confirmed deposit/withdrawal once, with an independent Goal namespace',()=>{
  let ledger=applyLocal(initialLedger(),{kind:'create'},at);
  ledger=applyLocal(ledger,{kind:'deposit',id:'1',amount:'5000000000000000000'},at);
  ledger=applyLocal(ledger,{kind:'withdraw',id:'1',amount:'2000000000000000000'},at);
  const store=syncConfirmedLocalContributions(emptyPlatform(),ledger);
  expect(store.contributions.map(e=>[e.goalScope,e.quantity,e.direction,e.provenance])).toEqual([
   ['local','5000000000000000000','IN','LOCAL_CONFIRMED'],['local','2000000000000000000','OUT','LOCAL_CONFIRMED']]);
  expect(syncConfirmedLocalContributions(store,ledger)).toBe(store);
 });
 it('rejects forged or damaged simulation evidence',()=>{
  expect(()=>syncConfirmedLocalContributions(emptyPlatform(),{...initialLedger(),activity:[{action:'Added funds',goalId:'1',amount:'5',timestamp:at,local:true}]})).toThrow();
 });
});
