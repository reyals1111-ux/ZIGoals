'use client';
import {useEffect,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import './card-options.css';

/** A disclosure of ordinary buttons, so Tab and touch work without ARIA-menu traps. */
export function CardOptions({label,children}:{label:string;children:ReactNode}){
 const [open,setOpen]=useState(false),root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),panel=useRef<HTMLDivElement>(null),[start,setStart]=useState(false);
 // Session AL (BN-084): the panel opens leftwards from its button; when that would run past the left edge of the page's
 // content (under the desktop sidebar) or the window, it opens rightwards instead, so every item stays readable and clickable.
 useLayoutEffect(()=>{if(!open){setStart(false);return;}const box=panel.current?.getBoundingClientRect(),button=root.current?.getBoundingClientRect();if(!box||!button)return;const main=root.current?.closest('main')?.getBoundingClientRect();const edge=Math.max(8,main?main.left:0);if(box.left<edge&&button.left+box.width<=window.innerWidth-8)setStart(true);},[open]);
 useEffect(()=>{if(!open)return;const close=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);},[open]);
 return <div ref={root} className="card-options" onKeyDown={event=>{if(event.key==='Escape'&&open){event.preventDefault();setOpen(false);trigger.current?.focus();}}}>
  <button ref={trigger} type="button" className="card-options-trigger secondary" aria-label={`Options for ${label}`} aria-expanded={open} onClick={()=>setOpen(value=>!value)}>⋯</button>
  {open&&<div ref={panel} className={`card-options-panel${start?' is-start':''}`} role="group" aria-label={`${label} options`} onClick={event=>{if((event.target as HTMLElement).closest('button,a'))setOpen(false);}}>{children}</div>}
 </div>;
}
