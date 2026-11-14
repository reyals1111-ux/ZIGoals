'use client';
import {useEffect,useId,useLayoutEffect,useRef,useState,type KeyboardEvent,type ReactNode} from 'react';
import './card-options.css';

/** The items of an open menu: every button and link inside it, whatever component rendered them (AskZigiItem, a Link…). */
const ITEMS='button,a[href]';
const items=(panel:HTMLElement|null)=>panel?[...panel.querySelectorAll<HTMLElement>(ITEMS)]:[];
const enabled=(panel:HTMLElement|null)=>items(panel).filter(item=>!(item as HTMLButtonElement).disabled);

/**
 * A card's "⋯" options. Session AO (DV-040g, DV-056c): a WAI-ARIA APG menu button (it was a disclosure of plain buttons and
 * links, so a screen reader heard no menu). The trigger says it opens a menu (aria-haspopup, aria-expanded, aria-controls);
 * the popup is role="menu", named "<label> options"; every button and link in it is a menuitem (links keep their href and
 * still navigate) with a roving tabindex. ArrowDown/ArrowUp (wrapping), Home and End move between items, Enter and Space
 * activate one, Escape closes and returns focus to ⋯, Tab closes and moves on from ⋯; opening by keyboard (Enter, Space,
 * ArrowDown, or ArrowUp for the last item) focuses an item, a pointer click outside closes. Items keep their words, order,
 * look and size: the roles are set on the rendered elements, so callers pass ordinary buttons and links as before.
 */
export function CardOptions({label,children}:{label:string;children:ReactNode}){
 const [open,setOpen]=useState(false),root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),panel=useRef<HTMLDivElement>(null),[start,setStart]=useState(false);
 const id=useId(),triggerId=`${id}-trigger`,menuId=`${id}-menu`,focusOnOpen=useRef<'first'|'last'|null>(null);
 // Session AL (BN-084): the panel opens leftwards from its button; when that would run past the left edge of the page's
 // content (under the desktop sidebar) or the window, it opens rightwards instead, so every item stays readable and clickable.
 useLayoutEffect(()=>{if(!open){setStart(false);return;}const box=panel.current?.getBoundingClientRect(),button=root.current?.getBoundingClientRect();if(!box||!button)return;const main=root.current?.closest('main')?.getBoundingClientRect();const edge=Math.max(8,main?main.left:0);if(box.left<edge&&button.left+box.width<=window.innerWidth-8)setStart(true);},[open]);
 // Session AO (DV-040g): the menu's roles and roving tabindex, kept as items come and go (Ask ZIGi follows the launcher) or
 // turn on and off (busy); anything else in the menu (a note an item points to) is presentational, so the menu holds items only.
 useLayoutEffect(()=>{const menu=panel.current;if(!open||!menu)return;
  const tag=()=>{const all=items(menu),on=all.filter(item=>!(item as HTMLButtonElement).disabled),current=on.find(item=>item===document.activeElement)??on[0];
   for(const item of all){if(item.getAttribute('role')!=='menuitem')item.setAttribute('role','menuitem');const tab=item===current?'0':'-1';if(item.getAttribute('tabindex')!==tab)item.setAttribute('tabindex',tab);}
   for(const child of menu.children)if(!child.matches(ITEMS)&&!child.querySelector(ITEMS)&&!child.hasAttribute('role'))child.setAttribute('role','none');};
  tag();const want=focusOnOpen.current;focusOnOpen.current=null;if(want){const on=enabled(menu);(want==='last'?on[on.length-1]:on[0])?.focus();tag();}
  const watch=new MutationObserver(tag);watch.observe(menu,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','href']});return()=>watch.disconnect();},[open]);
 // Session AL (NB-093): while the panel is open its card carries `data-options-open`, so a card that clips its contents (Today's
 // widgets) can let the panel out without a wide :has() rule (lib/perf/has-invalidation.test.ts).
 useEffect(()=>{const card=root.current?.parentElement;if(!open||!card)return;card.setAttribute('data-options-open','');return()=>card.removeAttribute('data-options-open');},[open]);
 useEffect(()=>{if(!open)return;const close=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);},[open]);
 const show=(at:'first'|'last')=>{if(open){const on=enabled(panel.current);(at==='last'?on[on.length-1]:on[0])?.focus();return;}focusOnOpen.current=at;setOpen(true);};
 function onTriggerKey(event:KeyboardEvent<HTMLButtonElement>){if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();show(event.key==='ArrowUp'?'last':'first');}}
 function onMenuKey(event:KeyboardEvent<HTMLDivElement>){const on=enabled(panel.current),item=(event.target as HTMLElement).closest<HTMLElement>(ITEMS),at=item?on.indexOf(item):-1;
  const go=(index:number)=>{event.preventDefault();on[(index+on.length)%on.length]?.focus();};
  if(!on.length)return;
  if(event.key==='ArrowDown')go(at+1);else if(event.key==='ArrowUp')go(at<0?on.length-1:at-1);else if(event.key==='Home')go(0);else if(event.key==='End')go(on.length-1);
  else if((event.key==='Enter'||event.key===' ')&&item&&at>=0){event.preventDefault();item.click();}
  // Tab: the menu closes and focus moves on from ⋯ (the browser's own Tab or Shift+Tab, from the trigger).
  else if(event.key==='Tab'){for(const one of items(panel.current))one.setAttribute('tabindex','-1');trigger.current?.focus();setOpen(false);}}
 return <div ref={root} className="card-options" onKeyDown={event=>{if(event.key==='Escape'&&open){event.preventDefault();setOpen(false);trigger.current?.focus();}}}>
  <button ref={trigger} id={triggerId} type="button" className="card-options-trigger secondary" aria-label={`Options for ${label}`} aria-haspopup="menu" aria-expanded={open} aria-controls={open?menuId:undefined} onKeyDown={onTriggerKey} onClick={event=>{/* a keyboard click (Enter, Space) opens on the first item */if(!open&&event.detail===0)focusOnOpen.current='first';setOpen(value=>!value);}}>⋯</button>
  {open&&<div ref={panel} id={menuId} className={`card-options-panel${start?' is-start':''}`} role="menu" aria-label={`${label} options`} onKeyDown={onMenuKey} onFocus={event=>{const target=event.target as HTMLElement;if(target.getAttribute('role')==='menuitem')for(const one of items(panel.current))one.setAttribute('tabindex',one===target?'0':'-1');}} onClick={event=>{if((event.target as HTMLElement).closest(ITEMS)){/* an item's own action may move focus (a dialog, the moved card); otherwise focus returns to ⋯ */if(panel.current?.contains(document.activeElement))trigger.current?.focus();setOpen(false);}}}>{children}</div>}
 </div>;
}
