'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import './card-options.css';

/** A disclosure of ordinary buttons, so Tab and touch work without ARIA-menu traps. */
export function CardOptions({label,children}:{label:string;children:ReactNode}){
 const [open,setOpen]=useState(false),root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(!open)return;const close=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);},[open]);
 return <div ref={root} className="card-options" onKeyDown={event=>{if(event.key==='Escape'&&open){event.preventDefault();setOpen(false);trigger.current?.focus();}}}>
  <button ref={trigger} type="button" className="card-options-trigger secondary" aria-label={`Options for ${label}`} aria-expanded={open} onClick={()=>setOpen(value=>!value)}>⋯</button>
  {open&&<div className="card-options-panel" role="group" aria-label={`${label} options`} onClick={event=>{if((event.target as HTMLElement).closest('button,a'))setOpen(false);}}>{children}</div>}
 </div>;
}
