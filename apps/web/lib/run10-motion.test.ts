// @vitest-environment jsdom
import {act,createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {OrbitSlogan} from '../components/orbit-slogan';
import {ProgressRing} from '../components/platform/financial-ui';
import {MotionPreference} from '../components/motion-preference';
import {MOTION_PREFERENCE_KEY} from '../components/use-entrance';
(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
beforeEach(()=>{localStorage.clear();sessionStorage.clear();vi.stubGlobal('matchMedia',vi.fn(()=>({matches:false})));});
afterEach(()=>vi.unstubAllGlobals());
it('reveals once per tab route, retains final semantic value and does not replay on refresh',async()=>{
 const element=document.createElement('div');let root=createRoot(element);await act(async()=>root.render(createElement(ProgressRing,{percent:45.2,identity:'goal-1'})));
 expect(element.firstElementChild?.getAttribute('data-entrance')).toBe('once');expect(element.firstElementChild?.getAttribute('aria-valuetext')).toContain('45.2%');
 await act(async()=>root.render(createElement(ProgressRing,{percent:65,identity:'goal-1'})));expect(element.textContent).toBe('65%');
 await act(async()=>root.unmount());root=createRoot(element);await act(async()=>root.render(createElement(ProgressRing,{percent:65,identity:'goal-1'})));expect(element.firstElementChild?.hasAttribute('data-entrance')).toBe(false);await act(async()=>root.unmount());
});
it('keeps the exact slogan and suppresses motion for device preference',async()=>{
 vi.stubGlobal('matchMedia',vi.fn(()=>({matches:true})));const element=document.createElement('div'),root=createRoot(element);await act(async()=>root.render(createElement(OrbitSlogan)));
 expect(element.textContent).toBe("Today's Goals, Habits & Health = Tomorrow's Wealth");expect(element.firstElementChild?.hasAttribute('data-entrance')).toBe(false);await act(async()=>root.unmount());
});
it('respects the persisted app preference without waiting for Settings to mount',async()=>{
 localStorage.setItem(MOTION_PREFERENCE_KEY,'off');const element=document.createElement('div'),root=createRoot(element);await act(async()=>root.render(createElement(OrbitSlogan)));expect(element.firstElementChild?.hasAttribute('data-entrance')).toBe(false);await act(async()=>root.unmount());
});
it('changing the motion setting saves and applies it immediately',async()=>{
 const element=document.createElement('div'),root=createRoot(element);await act(async()=>root.render(createElement(MotionPreference)));const select=element.querySelector('select')!;
 await act(async()=>{select.value='off';select.dispatchEvent(new Event('change',{bubbles:true}));});expect(localStorage.getItem(MOTION_PREFERENCE_KEY)).toBe('off');expect(document.documentElement.dataset.appMotion).toBe('off');await act(async()=>root.unmount());
});
