'use client';
import {useEffect,useRef} from 'react';
import './motion.css';
export const MOTION_PREFERENCE_KEY='zigoals:motion:v1';
/** One finite entrance when a meaningful component first becomes visible on this mount. */
export function useEntrance<T extends HTMLElement>(identity:string,ready=true){
 const ref=useRef<T>(null),played=useRef(false);
 useEffect(()=>{
  const el=ref.current;if(!el||!ready||played.current)return;
  try{if(localStorage.getItem(MOTION_PREFERENCE_KEY)==='off'||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;}catch{return;}
  const play=()=>{if(played.current)return;played.current=true;el.dataset.entrance='once';};
  if(!('IntersectionObserver' in window)){play();return;}
  const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();play();}},{threshold:.12});
  observer.observe(el);
  return()=>observer.disconnect();
 },[identity,ready]);
 return ref;
}
