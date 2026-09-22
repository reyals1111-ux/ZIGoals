/** Pure serialized coordinator semantics, not distributed persistence. Deadline and lease
 * expiry are exclusive. Completion alone does not confer permission to publish later. */
export type WorkLease={token:string;generation:number;fence:number;acquiredAt:number;deadline:number;expiresAt:number};
export type PublishedEvidence<T>={value:T;generation:number;fence:number;completedAt:number;publishedAt:number;complete:boolean};
export type WorkState<T>={lastTime:number;lease?:WorkLease;evidence?:PublishedEvidence<T>};
export const emptyWorkState=<T>():WorkState<T>=>({lastTime:0});
const time=(n:number)=>Number.isSafeInteger(n)&&n>=0;
const until=(l:WorkLease)=>Math.min(l.deadline,l.expiresAt);
export function acquireWork<T>(s:WorkState<T>,token:string,now:number,deadline:number,expiresAt:number):WorkState<T>|null {
 if(!/^[A-Za-z0-9_-]{1,100}$/.test(token)||![now,deadline,expiresAt].every(time)||now<s.lastTime||deadline<=now||expiresAt<=now||s.lease&&(now<until(s.lease)||s.lease.token===token))return null;
 const generation=(s.lease?.generation??0)+1,fence=(s.lease?.fence??0)+1;
 if(!Number.isSafeInteger(generation)||!Number.isSafeInteger(fence))return null;
 return {...s,lastTime:now,lease:{token,generation,fence,acquiredAt:now,deadline,expiresAt}};
}
export type PublicationDecision<T>={ok:boolean;state:WorkState<T>;reason?:'FENCED'|'TIMEOUT'|'INVALID_TIME'|'ALREADY_COMPLETE'};
export function publishWork<T>(s:WorkState<T>,owner:WorkLease,value:T,completedAt:number,now:number,complete:boolean):PublicationDecision<T>{
 const l=s.lease;
 if(!l||l.token!==owner.token||l.fence!==owner.fence||l.generation!==owner.generation)return {ok:false,state:s,reason:'FENCED'};
 if(![now,completedAt].every(time)||now<s.lastTime||completedAt<l.acquiredAt||completedAt>now||s.evidence?.generation===l.generation&&completedAt<s.evidence.completedAt)return {ok:false,state:s,reason:'INVALID_TIME'};
 if(now>=until(l))return {ok:false,state:s,reason:'TIMEOUT'};
 if(s.evidence?.generation===l.generation&&s.evidence.complete)return {ok:false,state:s,reason:'ALREADY_COMPLETE'};
 return {ok:true,state:{...s,lastTime:now,evidence:{value,generation:l.generation,fence:l.fence,completedAt,publishedAt:now,complete}}};
}
export function followerResult<T>(s:WorkState<T>,deadline:number,now:number):{status:'VERIFIED'|'WAITING'|'TIMEOUT';degraded:boolean;evidence?:PublishedEvidence<T>}{
 const valid=time(now)&&time(deadline)&&now>=s.lastTime;
 if(valid&&s.evidence?.complete&&s.evidence.generation===s.lease?.generation)return {status:'VERIFIED',degraded:false,evidence:s.evidence};
 return {status:!valid||now>=deadline||!s.lease||now>=until(s.lease)?'TIMEOUT':'WAITING',degraded:true,evidence:s.evidence};
}
