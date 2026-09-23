'use client';
import {isDurableMarker} from '../../lib/vault/local';
import {getAppStorage,isShowcase} from "../../lib/showcase-storage";
import {useEffect,useRef} from 'react';
import {captureValuations} from '../../lib/goal-intelligence';
import {PLATFORM_KEY,type Platform} from '../../lib/positions';
import type {MarketQuote} from '../../lib/market-quotes';
/** A relevant surface captures a bounded daily fact. Cache ticks do not write history. */
function persistedV2(){try{const raw=getAppStorage().getItem(PLATFORM_KEY);return isDurableMarker(raw)||JSON.parse(raw??'null')?.schemaVersion===3;}catch{return false;}}
export function useValuationHistory(store:{data:Platform;loaded:boolean;error:string;update:(fn:(s:Platform)=>Platform)=>Promise<void>},market:{quotes:readonly MarketQuote[];now:number;loading:boolean}){
 const {data,loaded,error,update}=store;const {quotes,now,loading}=market;
 const day=now?new Date(now).toISOString().slice(0,10):'';
 const attempted=useRef('');
 useEffect(()=>{
  if(isShowcase()||!loaded||error||loading||!day)return;
  // A read-only v1 migration must retain the original active bytes until an explicit edit.
  if(!persistedV2())return;
  const signature=JSON.stringify([day,data.positions,data.allocations,data.goals,quotes]);
  if(attempted.current===signature)return;attempted.current=signature;
  const captured=captureValuations(data,quotes,Date.now());if(captured===data)return;
  // The updater reads again under the existing cross-tab lock. Failure preserves prior bytes.
  void update(s=>persistedV2()?captureValuations(s,quotes,Date.now()):s).catch(()=>{/* The store surfaces any read failure; capture can retry next day or mount. */});
 },[data,loaded,error,update,quotes,loading,day]);
}
