'use client';
import {useEffect,useRef} from 'react';
import './motion.css';
export const MOTION_PREFERENCE_KEY='zigoals:motion:v1';
/** False under device reduced motion, the in-app Off setting, or unreadable storage. */
export function entranceAllowed(){try{return localStorage.getItem(MOTION_PREFERENCE_KEY)!=='off'&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;}catch{return false;}}
// Session Y Part 9 (QA2-08's leftover): one observer serves every entrance on the page (Wealth's 200 holding bars made
// 200), each element with its own one-shot callback; same threshold, same moment, same single play.
let shared:{observer:IntersectionObserver;waiting:Map<Element,()=>void>}|null=null;
function watch(el:Element,play:()=>void){
 if(!shared){const waiting=new Map<Element,()=>void>();shared={waiting,observer:new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;const run=waiting.get(entry.target);if(!run)continue;waiting.delete(entry.target);shared?.observer.unobserve(entry.target);run();}},{threshold:.12})};}
 const {observer,waiting}=shared;waiting.set(el,play);observer.observe(el);
 return()=>{if(waiting.get(el)===play){waiting.delete(el);observer.unobserve(el);}};
}
/** One finite entrance when a meaningful component first becomes visible on this mount. */
export function useEntrance<T extends HTMLElement>(identity:string,ready=true){
 const ref=useRef<T>(null),played=useRef(false);
 useEffect(()=>{
  const el=ref.current;if(!el||!ready||played.current)return;
  if(!entranceAllowed())return;
  const play=()=>{if(played.current)return;played.current=true;el.dataset.entrance='once';};
  if(!('IntersectionObserver' in window)){play();return;}
  return watch(el,play);
 },[identity,ready]);
 return ref;
}
