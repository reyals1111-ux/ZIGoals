'use client';
import {useEffect,useState} from 'react';
/** Advance after newly persisted facts as well as quote aging, without reading the clock in render. */
export function useEvidenceNow(revision:unknown,marketNow:number){
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)setNow(Date.now());});return()=>{active=false;};},[revision,marketNow]);
 return now;
}
