import {allocate,allocationBalance,assetMatches,goalProgress,platformSchema,positionSchema,planScenario,type Platform,type Position} from './positions';
import {appendContribution,captureValuations,scheduledFundingCredits} from './goal-intelligence';
import {quoteIsStale,quoteMatchesPosition,quoteValue,type MarketQuote} from './market-quotes';
import {revisionInstallments} from './plan-revisions';
import {saveAsset} from './asset-management';
export type FundingInput={id:string;goalId:string;positionId?:string;newPosition?:Position;quantity:string;occurredAt:string;scheduledDate?:string;planRevisionId?:string;installmentId?:string;note?:string};
export function previewFunding(s:Platform,input:FundingInput,quotes:readonly MarketQuote[]=[],now=Date.now()) {
 const g=s.goals.find(g=>g.id===input.goalId);if(!g||g.locked||g.status==='closed'||!['VALUE','QUANTITY'].includes(g.type))throw Error('Choose an unlocked, open Value or Quantity Goal.');
 if(!/^[1-9]\d{0,77}$/.test(input.quantity))throw Error('Enter a positive contribution.');
 if(!Number.isFinite(Date.parse(input.occurredAt))||Math.abs(now-Date.parse(input.occurredAt))>300000)throw Error('Fund Goal records new wealth now. Use history only for earlier events.');
 if(Boolean(input.positionId)===Boolean(input.newPosition))throw Error('Choose one funding asset.');
 const existing=input.positionId?s.positions.find(p=>p.id===input.positionId):undefined;
 if(input.positionId&&!existing)throw Error('Asset is no longer available.');
 const p=positionSchema.parse(existing??input.newPosition);
 if(p.sourceType!=='MANUAL'||p.archivedAt)throw Error('Observed wallet balances cannot be edited. Add a separately tracked asset.');
 if(!existing&&s.positions.some(x=>x.id===p.id))throw Error('Asset already exists. Refresh this preview.');
 if(existing&&allocationBalance(s,p.id).deficit!=='0')throw Error('Resolve this asset’s allocation deficit before adding funding.');
 if(g.type==='QUANTITY'&&!assetMatches(g,p))throw Error('Choose the same asset as this quantity Goal.');
 if(p.network!=='manual'&&p.network!==g.network)throw Error('Goal and asset networks differ.');
 const q=BigInt(input.quantity),oldQuantity=existing?BigInt(existing.quantity):0n;
 let contributionValue=q*10n**BigInt(g.decimals)/10n**BigInt(p.decimals),valuation=p.valuation&&BigInt(p.quantity)>0n?{...p.valuation,value:(BigInt(p.valuation.value)*(oldQuantity+q)/BigInt(p.quantity)).toString(),observedAt:input.occurredAt}:p.valuation,quote:MarketQuote|undefined;
 if(g.type==='VALUE'){
  if(p.assetClass==='Cash'&&p.asset===g.asset){contributionValue=q*10n**BigInt(g.decimals)/10n**BigInt(p.decimals);valuation={value:((oldQuantity+q)*100n/10n**BigInt(p.decimals)).toString(),currency:g.asset,decimals:2,source:'MANUAL',observedAt:input.occurredAt};}
  else if(p.valuation&&p.valuation.currency===g.asset&&BigInt(p.quantity)>0n){contributionValue=BigInt(p.valuation.value)*q*10n**BigInt(g.decimals)/(BigInt(p.quantity)*10n**BigInt(p.valuation.decimals));valuation={...p.valuation,value:(BigInt(p.valuation.value)*(oldQuantity+q)/BigInt(p.quantity)).toString(),observedAt:input.occurredAt};}
  else {quote=quotes.filter(x=>quoteMatchesPosition(p,x)&&x.currency===g.asset&&!quoteIsStale(x,now)).sort((a,b)=>(b.fetchedAt??'').localeCompare(a.fetchedAt??''))[0];if(!quote)throw Error('Refresh the asset price or supply a manual value in the Goal currency before funding.');contributionValue=BigInt(quoteValue(input.quantity,p.decimals,quote,g.decimals));}
 }
 if(contributionValue<=0n)throw Error('Contribution is below this Goal’s precision.');
 if(g.planRevisions?.length&&(input.scheduledDate||input.installmentId||input.planRevisionId)){
  if(!input.scheduledDate||!input.installmentId||!input.planRevisionId)throw Error('Choose the specific retained plan installment.');
  const installment=revisionInstallments(g,input.scheduledDate,input.scheduledDate,s.contributions,now).find(x=>x.id===input.installmentId&&x.revisionId===input.planRevisionId);
  if(!installment)throw Error('This plan installment changed or is unavailable. Review your contribution again.');
  if(installment.remaining==='0')throw Error('This scheduled contribution is already fully funded.');
 }else if(input.scheduledDate){if(!g.plan||!planScenario(g,'0',g.plan,input.scheduledDate,g.createdAt.slice(0,10)).dates.includes(input.scheduledDate))throw Error('Choose a date from the current contribution plan.');if((scheduledFundingCredits(s,g,now).get(input.scheduledDate)??0n)>=BigInt(planScenario(g,'0',g.plan,input.scheduledDate,input.scheduledDate).contributions))throw Error('This scheduled contribution is already fully funded.');}
 const before=goalProgress(s,g.id,now,quotes),remaining=BigInt(before.remaining),fundedValue=contributionValue<remaining?contributionValue:remaining;
 // Round allocation up to the next atomic asset unit, never exceed added units.
 const allocationQuantity=fundedValue===0n?0n:(q*fundedValue+contributionValue-1n)/contributionValue;
 const updated=positionSchema.parse({...p,quantity:(oldQuantity+q).toString(),valuation,observedAt:input.occurredAt});
 let next=saveAsset(s,updated);
 const prior=BigInt(s.allocations.find(a=>a.goalId===g.id&&a.positionId===p.id)?.quantity??'0');
 next=allocate(next,g.id,p.id,(prior+allocationQuantity).toString());
 const after=goalProgress(next,g.id,now,quotes);
 if(BigInt(after.current)>BigInt(after.target)&&allocationQuantity>0n)throw Error("This asset cannot be split finely enough to cap funding at your Goal target. Use an asset with finer quantity precision or manage the allocation explicitly.");
 return {state:next,position:updated,currentFunded:before.current,newFunded:after.current,remaining:after.remaining,contributionValue:contributionValue.toString(),allocationQuantity:allocationQuantity.toString(),surplusQuantity:(q-allocationQuantity).toString(),surplusValue:(contributionValue-fundedValue).toString(),complete:BigInt(after.current)>=BigInt(after.target)&&!after.requiresReview,quote};
}
export function fundGoal(s:Platform,input:FundingInput,quotes:readonly MarketQuote[]=[],now=Date.now()):Platform {
 const requestKey=JSON.stringify({goalId:input.goalId,positionId:input.positionId,newPosition:input.newPosition?positionSchema.parse(input.newPosition):undefined,quantity:input.quantity,occurredAt:input.occurredAt,scheduledDate:input.scheduledDate,planRevisionId:input.planRevisionId,installmentId:input.installmentId,note:input.note});
 const duplicate=s.contributions.find(e=>e.id===input.id);
 if(duplicate){if(duplicate.fundingMode==='FUND_GOAL'&&duplicate.goalId===input.goalId&&duplicate.positionId===(input.positionId??input.newPosition?.id)&&duplicate.quantity===input.quantity&&duplicate.fundingRequestKey===requestKey)return s;throw Error('Contribution identity conflicts with an existing record.');}
 const p=previewFunding(s,input,quotes,now),g=s.goals.find(g=>g.id===input.goalId)!;
 const next=appendContribution(p.state,{id:input.id,goalId:g.id,goalScope:'private',positionId:p.position.id,direction:'IN',quantity:input.quantity,asset:p.position.asset,decimals:p.position.decimals,valueAtEvent:g.type==='VALUE'?{value:p.contributionValue,decimals:g.decimals,currency:g.asset,source:p.quote?'COINGECKO':'MANUAL',observedAt:p.quote?.observedAt??p.quote?.fetchedAt??input.occurredAt}:undefined,occurredAt:input.occurredAt,provenance:'MANUAL_ATTRIBUTION',fundingMode:'FUND_GOAL',fundingRequestKey:requestKey,scheduledDate:input.scheduledDate,planRevisionId:input.planRevisionId,installmentId:input.installmentId,note:input.note});
 return platformSchema.parse(captureValuations(next,quotes,now));
}
