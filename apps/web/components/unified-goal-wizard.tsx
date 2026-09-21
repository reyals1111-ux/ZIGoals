'use client';
import {createAllocatedGoal} from '../lib/wealth';
import {AssetPicker} from './platform/asset-picker';
import {saveAsset} from '../lib/asset-management';
import {useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {parseUnits} from '@zigoals/chain-config';
import {CATEGORIES,validateMetadata,type GoalMetadata} from '@zigoals/shared-types';
import {SceneArt} from './scene-art';
import {useGoals} from './goal-provider';
import {wealthMarketRequests} from '../lib/wealth';
import {useMarketQuotes} from './platform/use-market-quotes';
import {usePlatform} from './platform/use-platform';
import {useHabits} from './habits/use-habits';
import {amount} from './platform/common';
import {allocate,allocationBalance,assetMatches,contributionSchema,goalProgress,privateGoalSchema,rescaleUnits,type PrivateGoal,type Platform} from '../lib/positions';
import {availableNativeStake,quickAllocateStake,watchScope} from '../lib/owner-preview';
import {contributionTemplate} from '../lib/contribution-habit';
import {createHabit} from '../lib/habits';
import {localDate} from '../lib/local-date';
type Funding='wealth'|'future'|'local'|'project';
export function UnifiedGoalWizard({positionId}:{positionId?:string}){
 const store=usePlatform(),legacy=useGoals(),habits=useHabits(),router=useRouter();
 const source=store.data.positions.find(p=>p.id===positionId);
 const [step,setStep]=useState(0),[name,setName]=useState(''),[type,setType]=useState<PrivateGoal['type']>('QUANTITY');
 const [assetInput,setAsset]=useState(''),[networkInput,setNetwork]=useState(''),[target,setTarget]=useState(''),[date,setDate]=useState(''),[notes,setNotes]=useState(''),[milestones,setMilestones]=useState('');
 const [category,setCategory]=useState<GoalMetadata['category']>('Emergency Fund'),[funding,setFunding]=useState<Funding>('wealth');
 const [pickerVersion,setPickerVersion]=useState(0),[sourceBusy,setSourceBusy]=useState(false);
 const [included,setIncluded]=useState<Record<string,string>>({});
 const [allocation,setAllocation]=useState<'none'|'stake'|'position'>('none'),[selectedInput,setSelected]=useState(''),[quantity,setQuantity]=useState('');
 const [withPlan,setWithPlan]=useState(false),[planAmount,setPlanAmount]=useState(''),[planAsset,setPlanAsset]=useState('ZIG'),[cadence,setCadence]=useState<'weekly'|'monthly'|'yearly'|'irregular'>('monthly'),[nextDate,setNextDate]=useState(localDate),[endDate,setEndDate]=useState(''),[price,setPrice]=useState(''),[withHabit,setWithHabit]=useState(false);
 const [starting,setStarting]=useState('0'),[monthly,setMonthly]=useState('100'),[risk,setRisk]=useState<GoalMetadata['riskPreference']>('Conservative'),[liquidity,setLiquidity]=useState<GoalMetadata['liquidityPreference']>('Anytime');
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);const [savedId,setSavedId]=useState('');const habitId=useRef('');
 const asset=assetInput||(type==='VALUE'?'USD':source?.asset??'ZIG');
 const network=(networkInput||(source?.network==='zig-test-2'?'zig-test-2':'zigchain-1')) as PrivateGoal['network'];
 const market=useMarketQuotes(type==='VALUE'&&funding==='wealth'?wealthMarketRequests(store.data):false);
 const precision=type==='VALUE'?2:type==='PROJECT'?0:source&&source.asset===asset?source.decimals:18;
 const selected=selectedInput||source?.id||'';
 const isProject=type==='PROJECT',isLocal=funding==='local'&&!isProject;
 const wantsPlan=!isProject&&!isLocal&&(withPlan||funding==='future');
 const previewId=Array.from({length:store.data.goals.length+1},(_,i)=>String(i)).find(id=>!store.data.goals.some(g=>g.id===id))!;
 function draft(id=previewId):PrivateGoal{
  const pDecimals=['USD','EUR'].includes(planAsset)?2:18;
  const plan=wantsPlan?contributionSchema.parse({amount:parseUnits(planAmount,pDecimals).toString(),asset:planAsset,decimals:pDecimals,cadence,nextDate,endDate:endDate||undefined,active:true,price:price?{value:parseUnits(price,18).toString(),decimals:18,currency:planAsset}:undefined}):undefined;
  if(plan&&BigInt(plan.amount)===0n)throw Error('Enter a positive planned amount.');
  if(plan&&plan.asset!==asset&&!plan.price)throw Error('Enter a price per Goal unit in the contribution currency.');
  const goal=privateGoalSchema.parse({id,name,category,network,type,status:'active',asset,denom:type==='VALUE'?asset:source&&source.asset===asset?source.denom:asset==='ZIG'?'azig':`manual:${asset}`,decimals:precision,target:isProject?'1':parseUnits(target,precision).toString(),notes,createdAt:new Date().toISOString(),targetDate:date||undefined,plan,milestones:isProject?milestones.split('\n').filter(x=>x.trim()).map((title,i)=>({id:String(i),title:title.trim(),done:false})):[]});
  if(isProject&&!goal.milestones.length)throw Error('Add at least one milestone.');
  return goal;
 }
 // Eligibility can be shown before a complete target/plan exists.
 const identity={type,asset,network,denom:type==='VALUE'?asset:source&&source.asset===asset?source.denom:asset==='ZIG'?'azig':`manual:${asset}`,decimals:precision} as PrivateGoal;
 const scope=source&&source.network===network?{network,account:source.account}:watchScope(store.data,network);
 const nativeAccounts=[...new Set(store.data.positions.filter(p=>p.providerId==='native-zig'&&p.network===network).map(p=>p.account))];
 const eligible=store.data.positions.filter(p=>!p.archivedAt&&(p.network==='manual'||p.network===network)&&(p.providerId!=='native-zig'||(scope?p.account===scope.account:nativeAccounts.length<=1))&&(type==='VALUE'||assetMatches(identity,p)&&(type!=='REWARD'||p.sourceType==='NATIVE_REWARDS')));
 const stake=availableNativeStake(store.data,identity).filter(p=>eligible.some(e=>e.id===p.id));
 const availableStake=stake.reduce((n,p)=>n+BigInt(rescaleUnits(allocationBalance(store.data,p.id).unallocated,p.decimals,18)),0n).toString();
 function preparePrivate(data:Platform,goal:PrivateGoal){
  if(funding==='wealth'&&type==='VALUE')return createAllocatedGoal(data,goal,Object.entries(included).map(([positionId,quantity])=>{const p=eligible.find(p=>p.id===positionId);if(!p)throw Error('A selected Position is no longer eligible. Remove it or restore its wealth scope.');return {positionId,quantity:parseUnits(quantity,p.decimals).toString()};}));
  let result={...data,goals:[...data.goals,goal]};
  if(funding==='wealth'&&allocation==='stake'){
   result=quickAllocateStake(result,goal.id,stake.map(p=>p.id));
  }
  if(funding==='wealth'&&allocation==='position'){
   const p=eligible.find(p=>p.id===selected);if(!p)throw Error('Select an eligible Position.');
   result=allocate(result,goal.id,p.id,parseUnits(quantity,p.decimals).toString());
  }
  return result;
 }
 function legacyPlan(){return validateMetadata({name,category,targetValue:target,currency:asset,targetDate:date||new Date(new Date().setFullYear(new Date().getFullYear()+1)).toISOString().slice(0,10),startingAmount:starting,monthlyContribution:monthly,riskPreference:risk,liquidityPreference:liquidity,deadlineFlexible:false,notes});}
 function next(){try{
  if(!name.trim())throw Error('Give your Goal a name.');
  if(date&&date<localDate())throw Error('Choose today or a future target date.');
  if(step===0){if(isProject){if(!milestones.trim())throw Error('Add at least one milestone.');}else if(BigInt(parseUnits(target,precision))<=0n)throw Error('Enter a positive target.');}
  if(step>=1){if(isLocal)legacyPlan();else preparePrivate(store.data,draft());}
  setError('');setStep(step+1);
 }catch(e){setError(e instanceof Error?e.message:'Check your Goal details.');}}
 async function save(){setBusy(true);setError('');let committedId=savedId;try{
  if(isLocal){if(legacy.mode!=='local')throw Error('Select Local demo to continue.');await legacy.prepare({kind:'create'},legacyPlan());return;}
  const id=savedId||BigInt('0x'+crypto.randomUUID().replaceAll('-','')).toString();
  let goal=draft(id);const template=contributionTemplate(goal,habits.today);
  if(withHabit&&template){habitId.current ||= crypto.randomUUID();goal={...goal,plan:{...goal.plan!,habitId:habitId.current}};}
  await store.update(data=>data.goals.some(g=>g.id===id)?data:preparePrivate(data,goal));setSavedId(id);committedId=id;
  if(withHabit&&template)await habits.update(data=>data.habits.some(h=>h.id===habitId.current)?data:createHabit(data,template,new Date(),habitId.current));
  router.push(`/app/goals/tracked/${id}`);
 }catch(e){setError(`${e instanceof Error?e.message:'Could not save.'}${committedId?' Your Goal is saved; retry to finish the supporting Habit.':''}`);}finally{setBusy(false);}}
 let review:ReturnType<typeof goalProgress>|undefined,reviewGoal:PrivateGoal|undefined,reviewError='';
 if(step===3&&!isLocal)try{reviewGoal=savedId?store.data.goals.find(g=>g.id===savedId):draft();if(reviewGoal)review=goalProgress(savedId?store.data:preparePrivate(store.data,reviewGoal),reviewGoal.id,market.now,market.quotes);}catch(e){reviewError=e instanceof Error?e.message:'Review allocations.';}
 return <section className="wizard wizard-v2 unified-wizard">
 <ol className="steps" aria-label="Goal creation progress">{['Purpose','Sources','Supporting Habit','Review'].map((label,i)=><li key={label} aria-current={step===i?'step':undefined}><span>{i+1}</span>{label}</li>)}</ol>
 <div className="wizard-story" aria-hidden="true"><SceneArt scene={category==='Travel'?'mountains':category==='First Home'?'home':'horizon'}/><div><small>YOUR NEXT CHAPTER</small><strong>{name||'It starts with a destination.'}</strong><span>One clear plan. A little progress, often.</span></div></div>
 <div className="wizard-content"><p className="eyebrow">Step {step+1} of 4</p>
 {step===0&&<><h2>What are you working toward?</h2><div className="form-grid">
 <label className="span-two">Goal name<input value={name} onChange={e=>setName(e.target.value)} maxLength={80} required/></label>
 <label>Goal type<select value={type} onChange={e=>{const v=e.target.value as PrivateGoal['type'];setType(v);setAsset('');setAllocation('none');setFunding(v==='PROJECT'?'project':'wealth');}}><option value="QUANTITY">Quantity · accumulate ZIG</option><option value="VALUE">Value · current wealth</option><option value="REWARD">Reward · unclaimed rewards</option><option value="PROJECT">Project / milestones</option></select></label>
 <label>Category / artwork<select value={category} onChange={e=>setCategory(e.target.value as GoalMetadata['category'])}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label>
 {isProject?<label className="span-two">Milestones, one per line<textarea value={milestones} onChange={e=>setMilestones(e.target.value)} rows={4}/></label>:<><label>Target amount<input inputMode="decimal" value={target} onChange={e=>setTarget(e.target.value)}/></label><label>{type==='VALUE'?'Goal currency':'Goal asset'}<input value={asset} onChange={e=>{setAsset(e.target.value.toUpperCase());setAllocation('none');}} maxLength={30}/></label></>}
 <label>Target date (optional)<input type="date" min={localDate()} value={date} onChange={e=>setDate(e.target.value)}/></label><label>Goal notes<textarea value={notes} onChange={e=>setNotes(e.target.value)} maxLength={2000}/></label></div></>}
 {step===1&&<><h2>What counts toward this Goal?</h2>{isProject?<p>Project / milestones. Only completed milestones count toward progress.</p>:<><fieldset className="funding-choices"><legend>Choose how you will build it</legend>{[['wealth','Use wealth I already have'],['future','Build it with future contributions'],['local','ZIGoals funding / Local simulation']].map(([value,label])=><label className="checkbox" key={value}><input type="radio" name="funding" checked={funding===value} disabled={value==='local'&&(type==='REWARD'||!['ZIG','USD','EUR'].includes(asset))} onChange={()=>{setFunding(value as Funding);setAllocation('none');if(value==='local')legacy.useLocal();}}/>{label}</label>)}<p className="fine">Goal Manager: Not deployed. Real contract funding is unavailable.</p></fieldset>
 {!isLocal&&<label className="field">Wealth scope<select value={network} onChange={e=>{setNetwork(e.target.value);setAllocation('none');setSelected('');}}><option value="zigchain-1">Mainnet + manual</option><option value="zig-test-2">Testnet + manual</option></select></label>}
 {funding==='wealth'&&<div className="setup-next"><h3>Existing wealth</h3>{source&&<p>From {source.validator?.name??source.providerId} · {source.asset}. Choose an allocation below; nothing is reserved yet.</p>}{scope&&<p className="fine">Snapshot account: {scope.account}</p>}<p>Available stake: <strong className="nebula-number">{amount(availableStake)} ZIG</strong></p>{type!=='VALUE'&&stake.length>0&&<label className="checkbox"><input type="checkbox" checked={allocation==='stake'} onChange={e=>setAllocation(e.target.checked?'stake':'none')}/>Allocate available stake up to Goal target</label>}
 {type!=='VALUE'&&<label className="checkbox"><input type="checkbox" checked={allocation==='position'} onChange={e=>setAllocation(e.target.checked?'position':'none')}/>Allocate a specific Position</label>}
 <fieldset disabled={sourceBusy} style={{border:0,padding:0,minWidth:0}}><AssetPicker key={pickerVersion} positions={eligible} initialCategory="Existing assets" onExisting={p=>{setSelected(p.id);setQuantity(amount(allocationBalance(store.data,p.id).unallocated,p.decimals));setAllocation('position');}} onDraft={p=>{if(sourceBusy)return;setSourceBusy(true);void store.update(s=>saveAsset(s,p)).then(()=>{setPickerVersion(v=>v+1);if(type==='VALUE')setIncluded(old=>({...old,[p.id]:amount(p.quantity,p.decimals)}));setSelected(p.id);setQuantity(amount(p.quantity,p.decimals));setAllocation(type==='VALUE'||assetMatches(identity,p)?'position':'none');}).catch(e=>setError(e instanceof Error?e.message:'Asset could not be saved.')).finally(()=>setSourceBusy(false));}} submitLabel="Save asset for this Goal"/></fieldset>
 {selected&&<p className="picker-mode-note">Selected: {eligible.find(p=>p.id===selected)?.providerId}. Set how much to include below.</p>}
 {type==='VALUE'&&<><button type="button" className="secondary" disabled={!selected||included[selected]!==undefined} onClick={()=>{const p=eligible.find(p=>p.id===selected);if(p)setIncluded(old=>({...old,[p.id]:amount(allocationBalance(store.data,p.id).unallocated,p.decimals)}));}}>Include selected source</button><section className="included-wealth" aria-label="Wealth included in this Goal"><h3>Wealth included in this Goal</h3>{!Object.keys(included).length&&<p>No sources selected yet.</p>}{Object.entries(included).map(([id,q])=>{const p=store.data.positions.find(p=>p.id===id);return <div className="included-source" key={id}><strong>{p?.providerId??'Unavailable source'} · {p?.asset}</strong><label>Units to allocate<input aria-label={`Units to allocate: ${p?.providerId??id}`} inputMode="decimal" value={q} onChange={e=>setIncluded(old=>({...old,[id]:e.target.value}))}/></label><button type="button" className="secondary" aria-label={`Remove ${p?.providerId??id}`} onClick={()=>setIncluded(old=>Object.fromEntries(Object.entries(old).filter(([key])=>key!==id)))}>Remove</button></div>;})}</section></>}
 {type!=='VALUE'&&allocation==='position'&&<label className="field">Units to allocate<input inputMode="decimal" value={quantity} onChange={e=>setQuantity(e.target.value)}/></label>}
 {!scope&&nativeAccounts.length>1&&<p>Choose a snapshot account in Positions before allocating native wealth.</p>}{!eligible.length&&<p>No eligible Positions yet. <Link href="/app/goals/positions">Add or refresh a Position</Link>, or save this Goal and allocate later.</p>}<p className="fine">No transaction, unstaking or delegation change. Allocation happens only when you confirm Create goal.</p></div>}

 {isLocal?<><p className="notice">Simulation only. Your Goal opens empty. Planned contributions do not deposit simulated funds.</p><div className="form-grid"><label>Planned starting amount<input value={starting} onChange={e=>setStarting(e.target.value)} inputMode="decimal"/></label><label>Planned monthly contribution<input value={monthly} onChange={e=>setMonthly(e.target.value)} inputMode="decimal"/></label><label>Risk preference<select value={risk} onChange={e=>setRisk(e.target.value as GoalMetadata['riskPreference'])}><option>Conservative</option><option>Balanced</option><option>Growth</option></select></label><label>Liquidity preference<select value={liquidity} onChange={e=>setLiquidity(e.target.value as GoalMetadata['liquidityPreference'])}><option>Anytime</option><option>Within a month</option><option>Flexible</option></select></label></div></>:<><label className="checkbox"><input type="checkbox" checked={wantsPlan} disabled={funding==='future'} onChange={e=>setWithPlan(e.target.checked)}/>Add a contribution plan</label>{wantsPlan&&<div className="form-grid"><label>Planned amount<input value={planAmount} onChange={e=>setPlanAmount(e.target.value)} inputMode="decimal"/></label><label>Contribution asset<input value={planAsset} onChange={e=>setPlanAsset(e.target.value.toUpperCase())} maxLength={30}/></label><label>Cadence<select value={cadence} onChange={e=>setCadence(e.target.value as typeof cadence)}>{['weekly','monthly','yearly','irregular'].map(c=><option key={c}>{c}</option>)}</select></label><label>Next contribution date<input type="date" value={nextDate} min={localDate()} onChange={e=>setNextDate(e.target.value)}/></label><label>Contribution end date (optional)<input type="date" min={nextDate} value={endDate} onChange={e=>setEndDate(e.target.value)}/></label>{planAsset!==asset&&<label className="span-two">Price per Goal unit in contribution currency<input inputMode="decimal" value={price} onChange={e=>setPrice(e.target.value)}/></label>}</div>}</>}
 {type==='VALUE'&&<p className="fine">Value Goals count allocated wealth in the Goal currency. Selected CoinGecko assets use automatic quotes in supported currencies. Manual valuations remain available; plans never count as current wealth.</p>}{type==='REWARD'&&<p className="fine">Reward Goals count currently unclaimed rewards, not cumulative claimed income.</p>}</>}</>}
 {step===2&&<><h2>A rhythm that supports your Goal.</h2>{wantsPlan&&cadence!=='irregular'?<><p>{planAsset==='USD'&&asset==='ZIG'?'Buy ZIG':'Contribution reminder'} · {planAmount} {planAsset} · once {cadence==='monthly'?'per month':cadence==='weekly'?'per week':'per year'}</p><label className="checkbox"><input type="checkbox" checked={withHabit} onChange={e=>setWithHabit(e.target.checked)}/>Create supporting Habit</label></>:<p>{isLocal?'Link a supporting Habit from Habits after saving your Goal.':'A recurring contribution plan can create a supporting Habit. You can also link Habits after saving.'}</p>}<p className="notice">Habit completion records behavior only. It never increases financial Goal progress.</p></>}
 {step===3&&<><h2>{name}</h2><dl className="metrics"><div><dt>Target</dt><dd>{isProject?`${milestones.split('\n').filter(x=>x.trim()).length} milestones`:`${target} ${asset}`}</dd></div><div><dt>Target date</dt><dd>{date||'No deadline'}</dd></div><div><dt>Progress source</dt><dd>{isLocal?'Local simulation':isProject?'Project':funding==='wealth'?'Existing wealth':'Future contributions'}</dd></div><div><dt>Observed / entered progress</dt><dd>{review?`${amount(review.current,precision)} ${isProject?'milestones':asset}`:'0 · Goal opens empty'}</dd></div><div><dt>Planned contributions</dt><dd>{isLocal?`${monthly} ${asset} monthly`:wantsPlan?`${planAmount} ${planAsset} · ${cadence} · next ${nextDate}${endDate?` · until ${endDate}`:""}`:'None'}</dd></div><div><dt>Supporting Habit</dt><dd>{withHabit&&wantsPlan&&cadence!=='irregular'?'Create after saving':'None requested'}</dd></div></dl>
 {review?.breakdown.map(b=>{const p=store.data.positions.find(p=>p.id===b.positionId)!;return <p key={p.id}>{p.validator?.name??p.providerId}: {amount(b.quantity,p.decimals)} {p.asset} allocated</p>;})}{price&&wantsPlan&&<p>Price assumption: {price} {planAsset} per {asset}. Planned only.</p>}{review?.requiresReview&&<p className="notice">Snapshot or valuation needs review. Refresh Positions to verify current state.</p>}<p className="notice">{isLocal?'Simulation only.':'No funds move. Allocations are private Goal accounting.'}</p><p className="fine">Goal Manager: Not deployed. Planned amounts and Habits do not count as current wealth.</p></>}
 {(error||reviewError||!isLocal&&store.error)&&<p role="alert" className="notice">{error||reviewError||(!isLocal&&store.error)}</p>}{savedId&&error&&<Link href={`/app/goals/tracked/${savedId}`}>Open saved Goal →</Link>}
 <div className="wizard-actions"><button className="secondary" disabled={step===0||busy||!!savedId} onClick={()=>{setError('');setStep(step-1);}}>Back</button>{step<3?<button className="primary" disabled={!store.loaded||busy} onClick={next}>Continue →</button>:<button className="primary" disabled={busy||!!reviewError||(isLocal?legacy.busy||!legacy.canTransact:!!store.error||!store.loaded||(withHabit&&wantsPlan&&(!habits.loaded||!!habits.error)))} onClick={()=>void save()}>{busy?'Saving…':'Create goal'}</button>}</div>
 </div></section>;
}
