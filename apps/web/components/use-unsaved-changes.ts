'use client';
import {useEffect,useRef} from 'react';
/** Private drafts stay in memory; navigation requires an explicit discard. */
export function useUnsavedChanges(dirty:boolean){
 const released=useRef(false);
 useEffect(()=>{
  if(!dirty)return;
  const message='Discard your unsaved Goal changes?';
  const ask=()=>released.current||window.confirm(message);
  const unload=(event:BeforeUnloadEvent)=>{if(!released.current){event.preventDefault();event.returnValue='';}};
  const click=(event:MouseEvent)=>{const link=(event.target as Element)?.closest?.('a[href]');if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.hasAttribute('download')||link.getAttribute('target')==='_blank')return;const url=new URL(link.getAttribute('href')!,location.href);if(url.href===location.href||url.pathname===location.pathname&&url.search===location.search&&url.hash)return;if(!ask()){event.preventDefault();event.stopImmediatePropagation();}else released.current=true;};
  type NavigationEvent=Event&{navigationType:string;destination:{sameDocument:boolean}};
  const navigation=(window as Window&{navigation?:EventTarget}).navigation;
  const traverse=(event:Event)=>{const e=event as NavigationEvent;if(e.navigationType==='traverse'&&e.destination.sameDocument&&e.cancelable&&!ask())e.preventDefault();};
  // Older engines lack the Navigation API. Stop the SPA listener while restoring
  // a canceled single-step Back/Forward traversal to this still-mounted draft.
  let restoring=false;const pop=(event:PopStateEvent)=>{if(restoring){restoring=false;event.stopImmediatePropagation();return;}if(!ask()){event.stopImmediatePropagation();restoring=true;history.forward();}};
  window.addEventListener('beforeunload',unload);document.addEventListener('click',click,true);navigation?.addEventListener('navigate',traverse);if(!navigation)window.addEventListener('popstate',pop,true);
  return()=>{window.removeEventListener('beforeunload',unload);document.removeEventListener('click',click,true);navigation?.removeEventListener('navigate',traverse);if(!navigation)window.removeEventListener('popstate',pop,true);};
 },[dirty]);
 return ()=>{released.current=true;};
}
