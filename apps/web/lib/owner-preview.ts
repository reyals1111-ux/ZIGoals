/** Private preview helpers. No reader, wallet or execution dependencies. */
import {allocate,allocationBalance,assetMatches,platformSchema,positionSync,rescaleUnits,stakingProjection,type Platform,type PrivateGoal} from './positions';
export function availableNativeStake(s:Platform,g:PrivateGoal){
 return s.positions.filter(p=>g.type==='QUANTITY'&&g.asset==='ZIG'&&p.network===g.network&&p.providerId==='native-zig'&&p.sourceType==='NATIVE_STAKING'&&p.verification==='VERIFIED_READ_ONLY'&&positionSync(p)==='CURRENT'&&assetMatches(g,p)&&BigInt(allocationBalance(s,p.id).unallocated)>0n).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
}
export function quickAllocateStake(raw:Platform,goalId:string,positionIds?:readonly string[]):Platform{
 let s=platformSchema.parse(raw);const g=s.goals.find(g=>g.id===goalId);
 if(!g||g.status==='closed'||g.type!=='QUANTITY'||g.asset!=='ZIG')throw Error('Choose an open ZIG quantity Goal.');
 // A deficit must be resolved before adding new intentions to this Goal.
 if(s.allocations.some(a=>a.goalId===goalId&&allocationBalance(s,a.positionId).deficit!=='0'))throw Error('Review allocation deficits first.');
 // Preserve fractional Goal units already reserved in higher-precision Positions.
 const reserved=s.allocations.filter(a=>a.goalId===goalId).reduce((sum,a)=>{
  const p=s.positions.find(p=>p.id===a.positionId)!;
  return (p.network==='manual'||p.network===g.network)&&assetMatches(g,p)&&['MANUAL','VERIFIED_READ_ONLY','EXECUTION_READY','EXECUTABLE'].includes(p.verification)?sum+BigInt(rescaleUnits(a.quantity,p.decimals,18)):sum;
 },0n);
 let remainingExact=BigInt(rescaleUnits(g.target,g.decimals,18))-reserved;
 if(remainingExact<=0n)return s;
 for(const p of availableNativeStake(s,g).filter(p=>!positionIds||positionIds.includes(p.id))){
  const remaining=BigInt(rescaleUnits(remainingExact.toString(),18,p.decimals));
  const available=BigInt(allocationBalance(s,p.id).unallocated),add=remaining<available?remaining:available;
  if(add===0n)continue;
  const previous=BigInt(s.allocations.find(a=>a.goalId===goalId&&a.positionId===p.id)?.quantity??'0');
  s=allocate(s,goalId,p.id,(previous+add).toString());
  remainingExact-=BigInt(rescaleUnits(add.toString(),p.decimals,18));
 }
 return s;
}
export function watchScope(s:Platform,network=s.watchScope?.network??'zigchain-1'){
 const accounts=[...new Set(s.positions.filter(p=>p.network===network&&p.providerId==='native-zig').map(p=>p.account))];
 if(s.watchScope?.network===network)return accounts.includes(s.watchScope.account)?s.watchScope:undefined;
 return accounts.length===1?{network,account:accounts[0]!}:undefined;
}
export function readAprAssumption(s:Platform,network:string,account:string){return s.aprAssumptions?.find(a=>a.network===network&&a.account===account)?.percent??'';}
export function saveAprAssumption(s:Platform,network:string,account:string,percent:string):Platform{
 if(!s.positions.some(p=>p.network===network&&p.account===account&&p.providerId==='native-zig'))throw Error('Choose an observed account before saving an assumption.');
 percent=percent.trim();if(percent!=='')stakingProjection('0',percent,1);
 return platformSchema.parse({...s,aprAssumptions:[...(s.aprAssumptions??[]).filter(a=>a.network!==network||a.account!==account),...(percent===''?[]:[{network,account,percent}])]});
}
