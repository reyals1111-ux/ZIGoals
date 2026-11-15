// @vitest-environment jsdom
// Session AO (DV-040g, DV-056c): a card's ⋯ is a WAI-ARIA APG menu button: the trigger says it opens a menu, its items are
// menuitems with a roving tabindex, and the keyboard moves, activates, closes and returns focus as the pattern says.
import {act,createElement,type ReactNode} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {CardOptions} from '../components/card-options';
(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;

let host:HTMLDivElement,root:Root,after:HTMLButtonElement;
const first=vi.fn(),third=vi.fn();
beforeEach(async()=>{
 first.mockReset();third.mockReset();
 host=document.createElement('div');document.body.append(host);root=createRoot(host);
 const kids:ReactNode[]=[
  createElement('button',{key:'a',type:'button',onClick:first},'Add Bitcoin quantity to Today'),
  createElement('button',{key:'b',type:'button',disabled:true},'Add value to Today'),
  createElement('a',{key:'c',href:'#edit-goal',onClick:(e:{preventDefault():void})=>{e.preventDefault();third();}},'Edit details'),
  createElement('p',{key:'d',id:'why'},'A note an item points to.'),
  createElement('button',{key:'e',type:'button'},'Ask ZIGi about this'),
 ];
 // eslint-disable-next-line react/no-children-prop -- CardOptions' props type requires children
 await act(async()=>root.render(createElement('div',null,createElement(CardOptions,{label:'Bitcoin',children:kids}),createElement('button',{type:'button'},'After'))));
 after=[...host.querySelectorAll('button')].find(b=>b.textContent==='After')!;
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});

const trigger=()=>host.querySelector<HTMLButtonElement>('button[aria-label="Options for Bitcoin"]')!;
const menu=()=>host.querySelector<HTMLElement>('[role="menu"]');
const menuItems=()=>[...(menu()?.querySelectorAll<HTMLElement>('[role="menuitem"]')??[])];
const key=async(target:Element,k:string,init:KeyboardEventInit={})=>{await act(async()=>{target.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true,...init}));});};
/** A keyboard click (Enter or Space on a native button): `detail` is 0. */
const keyboardClick=async(target:HTMLElement)=>{await act(async()=>{target.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:0}));});};
const pointerClick=async(target:HTMLElement)=>{await act(async()=>{target.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));});};

it('the trigger is a menu button; the popup is a named menu of menuitems (links keep their href), the note presentational', async()=>{
 const t=trigger();t.focus();
 expect(t.getAttribute('aria-haspopup')).toBe('menu');expect(t.getAttribute('aria-expanded')).toBe('false');expect(menu()).toBeNull();
 await pointerClick(t);
 const m=menu()!;
 expect(t.getAttribute('aria-expanded')).toBe('true');expect(t.getAttribute('aria-controls')).toBe(m.id);
 expect(m.getAttribute('aria-label')).toBe('Bitcoin options');
 expect(menuItems().map(i=>i.textContent)).toEqual(['Add Bitcoin quantity to Today','Add value to Today','Edit details','Ask ZIGi about this']);
 expect(menuItems()[2]!.getAttribute('href')).toBe('#edit-goal');
 expect(m.querySelector('#why')!.getAttribute('role')).toBe('none');
 // Roving tabindex: one item in the Tab order, the first enabled one.
 expect(menuItems().map(i=>i.getAttribute('tabindex'))).toEqual(['0','-1','-1','-1']);
 // A pointer open leaves focus on ⋯.
 expect(document.activeElement).toBe(t);
});

it('opening by keyboard focuses the first item; arrows wrap and skip a disabled item; Home and End; Escape returns to ⋯', async()=>{
 const t=trigger();t.focus();
 await keyboardClick(t);
 const [a,,c,e]=menuItems();
 expect(document.activeElement).toBe(a);
 await key(a!,'ArrowDown');expect(document.activeElement).toBe(c);
 expect(c!.getAttribute('tabindex')).toBe('0');expect(a!.getAttribute('tabindex')).toBe('-1');
 await key(c!,'ArrowDown');expect(document.activeElement).toBe(e);
 await key(e!,'ArrowDown');expect(document.activeElement).toBe(a);
 await key(a!,'ArrowUp');expect(document.activeElement).toBe(e);
 await key(e!,'Home');expect(document.activeElement).toBe(a);
 await key(a!,'End');expect(document.activeElement).toBe(e);
 await key(e!,'Escape');
 expect(menu()).toBeNull();expect(document.activeElement).toBe(t);expect(t.getAttribute('aria-expanded')).toBe('false');
});

it('ArrowDown on ⋯ opens on the first item, ArrowUp on the last', async()=>{
 const t=trigger();t.focus();
 await key(t,'ArrowDown');expect(document.activeElement).toBe(menuItems()[0]);
 await key(document.activeElement!,'Escape');
 await key(t,'ArrowUp');expect(document.activeElement).toBe(menuItems()[3]);
});

it('Enter and Space activate the focused item (a link included), close the menu and return focus to ⋯', async()=>{
 const t=trigger();t.focus();
 await keyboardClick(t);
 await key(document.activeElement!,'Enter');
 expect(first).toHaveBeenCalledTimes(1);expect(menu()).toBeNull();expect(document.activeElement).toBe(t);
 await keyboardClick(t);
 await key(document.activeElement!,'ArrowDown');
 await key(document.activeElement!,' ');
 expect(third).toHaveBeenCalledTimes(1);expect(menu()).toBeNull();expect(document.activeElement).toBe(t);
});

it('Tab closes the menu and moves on from ⋯; a pointer press outside closes it', async()=>{
 const t=trigger();t.focus();
 await keyboardClick(t);
 await key(document.activeElement!,'Tab');
 expect(menu()).toBeNull();expect(document.activeElement).toBe(t);
 await pointerClick(t);expect(menu()).not.toBeNull();
 await act(async()=>{after.dispatchEvent(new MouseEvent('pointerdown',{bubbles:true}));});
 expect(menu()).toBeNull();
});
