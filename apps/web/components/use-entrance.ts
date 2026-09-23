'use client';
import {useEffect,useRef} from 'react';
import './motion.css';
export const MOTION_PREFERENCE_KEY='zigoals:motion:v1';
/** One finite entrance per component identity and route in this tab session. */
export function useEntrance<T extends HTMLElement>(identity:string){
 const ref=useRef<T>(null);
 useEffect(()=>{
  const el=ref.current;if(!el)return;
  const key=`zigoals:entrance:v1:${location.pathname}:${identity}`;
  try{
   if(localStorage.getItem(MOTION_PREFERENCE_KEY)==='off'||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||sessionStorage.getItem(key))return;
   sessionStorage.setItem(key,'seen');el.dataset.entrance='once';
  }catch{/* Restricted storage means motion stays off; content is still available. */}
 },[identity]);
 return ref;
}
