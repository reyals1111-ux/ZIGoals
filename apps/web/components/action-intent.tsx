'use client';
import {Suspense,useEffect} from 'react';
import {usePathname,useSearchParams} from 'next/navigation';
type Props={param?:string;value:string;ready?:boolean;onAction:()=>void};
function Intent({param='add',value,ready=true,onAction}:Props){
 const params=useSearchParams(),path=usePathname(),query=params.toString();
 useEffect(()=>{
  if(!ready)return;
  // Consume the current URL synchronously before opening. A deferred router.replace
  // can swallow the next identical Quick Add action while its cleanup is pending.
  const current=new URL(window.location.href);
  if(current.pathname!==path||current.searchParams.get(param)!==value)return;
  current.searchParams.delete(param);
  // Next copies its own history internals. Forwarding these loop markers would
  // bypass its canonical URL/search-param synchronization. Preserve custom state.
  const state={...window.history.state};delete state.__NA;delete state._N;
  window.history.replaceState(state,'',`${current.pathname}${current.search}${current.hash}`);
  onAction();
 },[query,param,value,ready,onAction,path]);
 return null;
}
/** Consume an explicit action without forcing the surrounding page to client-render. */
export function ActionIntent(props:Props){return <Suspense fallback={null}><Intent {...props}/></Suspense>;}
