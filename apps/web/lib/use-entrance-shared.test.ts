// @vitest-environment jsdom
import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {useEntrance} from '../components/use-entrance';

/**
 * Session Y Part 9 (QA2-08's leftover): one IntersectionObserver serves every entrance on a page, where each holding bar
 * on Wealth made its own. Each element still plays once, when it first shows, and leaves the observer when it unmounts.
 */
class FakeObserver{
 static made:FakeObserver[]=[];
 observed=new Set<Element>();
 constructor(public callback:IntersectionObserverCallback,public options?:IntersectionObserverInit){FakeObserver.made.push(this);}
 observe(el:Element){this.observed.add(el);}
 unobserve(el:Element){this.observed.delete(el);}
 disconnect(){this.observed.clear();}
 takeRecords(){return [];}
 show(el:Element,isIntersecting=true){this.callback([{target:el,isIntersecting} as IntersectionObserverEntry],this as unknown as IntersectionObserver);}
}
beforeEach(()=>{(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;vi.stubGlobal('IntersectionObserver',FakeObserver);vi.stubGlobal('matchMedia',()=>({matches:false}));localStorage.clear();});
afterEach(()=>{vi.unstubAllGlobals();});
function Bar({id}:{id:string}){const ref=useEntrance<HTMLDivElement>(id);return createElement('div',{ref,'data-id':id});}

test('two hundred bars share one observer; each plays once when it first shows; unmounting leaves it',async()=>{
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 await act(async()=>root.render(createElement('div',null,...Array.from({length:200},(_,i)=>createElement(Bar,{key:i,id:`bar-${i}`})))));
 expect(FakeObserver.made).toHaveLength(1);const [observer]=FakeObserver.made as [FakeObserver];
 expect(observer.options).toEqual({threshold:.12});expect(observer.observed.size).toBe(200);
 const bar=(i:number)=>host.querySelector<HTMLElement>(`[data-id="bar-${i}"]`)!;
 act(()=>observer.show(bar(3),false));expect(bar(3).dataset.entrance).toBeUndefined();expect(observer.observed.size).toBe(200);
 act(()=>observer.show(bar(3)));expect(bar(3).dataset.entrance).toBe('once');expect(bar(4).dataset.entrance).toBeUndefined();expect(observer.observed.size).toBe(199);
 bar(3).removeAttribute('data-entrance');act(()=>observer.show(bar(3)));expect(bar(3).dataset.entrance).toBeUndefined();
 await act(async()=>root.unmount());expect(observer.observed.size).toBe(0);host.remove();
});
