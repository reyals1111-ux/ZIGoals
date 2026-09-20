'use client';
import {useState,type FormEvent} from 'react';
import Link from 'next/link';
import {parseUnits} from '@zigoals/chain-config';
import {allocate,allocationBalance,type Platform,type Position} from '../../lib/positions';
import {amount} from './common';
import {AssetPicker} from './asset-picker';
export function AllocationForm({data,goalId,positions,update,disabled}:{data:Platform;goalId:string;positions:Position[];update:(fn:(s:Platform)=>Platform)=>Promise<void>;disabled:boolean}){
 const [selected,setSelected]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const p=positions.find(p=>p.id===selected)??positions[0];if(!p)return null;
 const owners=data.allocations.filter(a=>a.positionId===p.id&&a.goalId!==goalId&&data.goals.some(g=>g.id===a.goalId&&g.status!=='closed'));
 const elsewhere=owners.reduce((sum,a)=>sum+BigInt(a.quantity),0n);
 const current=data.allocations.find(a=>a.positionId===p.id&&a.goalId===goalId)?.quantity??'0';
 const balance=allocationBalance(data,p.id);
 const available=BigInt(p.quantity)>elsewhere?BigInt(p.quantity)-elsewhere:0n;
 const ownership=owners.map(a=>`${amount(a.quantity,p.decimals)} ${p.asset} is allocated to ${data.goals.find(g=>g.id===a.goalId)!.name}`).join('. ');
 async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!p)return;setError('');setBusy(true);try{
  const quantity=parseUnits(String(new FormData(e.currentTarget).get('quantity')),p.decimals).toString();
  // Validate against displayed evidence for useful feedback, then recheck under the storage lock.
  try{allocate(data,goalId,p.id,quantity);}catch(e){if(BigInt(quantity)>available)throw Error(`Only ${amount(available.toString(),p.decimals)} ${p.asset} is available for this Goal. ${ownership}`);throw e;}
  await update(s=>allocate(s,goalId,p.id,quantity));
 }catch(e){setError(e instanceof Error?e.message:'Allocation could not be saved.');}finally{setBusy(false);}}
 return <form className="platform-form" onSubmit={save}><AssetPicker positions={positions} initialCategory="Existing assets" onExisting={p=>{setSelected(p.id);setError('');}}/><p className="picker-mode-note">Selected for allocation: <strong>{p.providerId}</strong></p><div className="fine" aria-live="polite"><p>Observed quantity: {amount(p.quantity,p.decimals)} {p.asset}</p><p>This Goal’s existing allocation: {amount(current,p.decimals)} {p.asset}</p><p>Unallocated across Goals: {amount(balance.unallocated,p.decimals)} {p.asset}</p><p>Available for this Goal: {amount(available.toString(),p.decimals)} {p.asset}</p><p>Already allocated elsewhere: {amount(elsewhere.toString(),p.decimals)} {p.asset}</p>{owners.map(a=><p key={a.goalId}>{amount(a.quantity,p.decimals)} {p.asset} is allocated to {data.goals.find(g=>g.id===a.goalId)!.name}. <Link className="text-link" href={`/app/goals/tracked/${a.goalId}#allocate`}>Manage allocation →</Link></p>)}{balance.deficit!=='0'&&<p>Allocation deficit. Reduce existing allocations to resolve it.</p>}</div><label className="field">Allocation quantity<input key={`${p.id}:${current}`} name="quantity" required inputMode="decimal" defaultValue={amount(current,p.decimals)}/></label><button className="primary" disabled={busy||disabled}>Save allocation</button>{error&&<p role="alert" className="notice fine">{error}</p>}<p className="fine">Sets this Goal’s allocation. Units cannot be allocated twice. This is not a transfer.</p></form>;
}
