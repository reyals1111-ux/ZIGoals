// @vitest-environment jsdom
import {afterEach,beforeEach,expect,test} from 'vitest';
import {act,createElement,useState} from 'react';
import {flushSync} from 'react-dom';
import {createRoot,type Root} from 'react-dom/client';
import {touchOnInput} from './wizard-guard';

/**
 * Session AL fourth pass (BN-153, BN-188): the goal creator lost the first thing typed ("Berlin" → "erlin", a first fill
 * gone). In a browser, a render scheduled by a capture-phase handler is flushed (microtask checkpoint) before React's
 * bubble listener reads the field; jsdom dispatches synchronously, so the test flushes in a capture listener the way the
 * browser does between React's two root listeners.
 */
let host:HTMLDivElement,root:Root;
beforeEach(()=>{(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(()=>{act(()=>root.unmount());host.remove();});

/** A controlled field inside a section that marks itself touched, the old way (capture) or the fixed way. */
function Form({mode}:{mode:'capture'|'fixed'}){
 const [name,setName]=useState(''),[touched,setTouchedState]=useState(false);
 // The browser flushes a capture handler's render before the bubble phase; flushSync reproduces that order here.
 const setTouched=(v:true)=>mode==='capture'?flushSync(()=>setTouchedState(v)):setTouchedState(v);
 const props=mode==='capture'?{onInputCapture:()=>{if(!touched)setTouched(true);}}:touchOnInput(touched,setTouched);
 return createElement('section',{...props,'data-touched':String(touched)},createElement('input',{'aria-label':'Goal name',value:name,onChange:(e:{target:HTMLInputElement})=>setName(e.target.value)}));
}
/** Types one character the way a browser does: the value changes, then one bubbling input event. */
function typeChar(el:HTMLInputElement,ch:string){
 const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!;
 act(()=>{set.call(el,el.value+ch);el.dispatchEvent(new Event('input',{bubbles:true}));});
}

test('BN-153: the old capture-phase "touched" render swallowed the first key (the cause, reproduced)',()=>{
 act(()=>root.render(createElement(Form,{mode:'capture'})));
 const el=host.querySelector('input')!;for(const ch of 'Berlin')typeChar(el,ch);
 expect(el.value).toBe('erlin');expect(host.querySelector('section')!.dataset.touched).toBe('true');
});

test('BN-153/BN-188: with touchOnInput every key lands ("Berlin") and the creator is marked touched',()=>{
 act(()=>root.render(createElement(Form,{mode:'fixed'})));
 const el=host.querySelector('input')!;for(const ch of 'Berlin')typeChar(el,ch);
 expect(el.value).toBe('Berlin');expect(host.querySelector('section')!.dataset.touched).toBe('true');
});

test('BN-188: a first whole-value fill (Target amount) is kept',()=>{
 act(()=>root.render(createElement(Form,{mode:'fixed'})));
 const el=host.querySelector('input')!;const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!;
 act(()=>{set.call(el,'1200');el.dispatchEvent(new Event('input',{bubbles:true}));});
 expect(el.value).toBe('1200');expect(host.querySelector('section')!.dataset.touched).toBe('true');
});
