// @vitest-environment jsdom
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {Watchlist} from '../components/platform/watchlist';
import {buildShowcase} from './showcase-data';
import {PLATFORM_KEY,type Platform} from './positions';
vi.mock('../components/platform/use-market-quotes',()=>({useMarketQuotes:()=>({quotes:[],now:0,loading:false,error:null})}));
vi.mock('../components/platform/use-market-insights',()=>({useMarketInsights:()=>({entries:[],results:{},now:0,loading:false,error:null})}));
let element:HTMLDivElement,root:Root,release:()=>void,initial:Platform;
const buttons=()=>[...element.querySelectorAll<HTMLButtonElement>('.watch-actions button,.wealth-section-heading button')];
const remove=()=>element.querySelector<HTMLButtonElement>('[aria-label="Remove Nvidia favourite"]')!;
beforeEach(async()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);localStorage.clear();sessionStorage.clear();
 initial=JSON.parse(buildShowcase('2026-09-21').records[PLATFORM_KEY]!);initial.watchlist=[{ref:{provider:'coingecko',kind:'coin',id:'bitcoin'},name:'Bitcoin',symbol:'BTC'},{ref:{provider:'coingecko',kind:'rwa',id:'gold',assetType:'commodity'},name:'Gold',symbol:'GOLD'},{ref:{provider:'coingecko',kind:'rwa',id:'nvidia',assetType:'stock'},name:'Nvidia',symbol:'NVDA'}];localStorage.setItem(PLATFORM_KEY,JSON.stringify(initial));
 vi.stubGlobal('navigator',{locks:{request:(_key:string,write:()=>unknown)=>new Promise((resolve,reject)=>{release=()=>{try{resolve(write());}catch(error){reject(error);}};})}});
 element=document.createElement('div');document.body.append(element);root=createRoot(element);await act(async()=>root.render(createElement(Watchlist)));
});
afterEach(async()=>{await act(async()=>root.unmount());element.remove();vi.restoreAllMocks();vi.unstubAllGlobals();localStorage.clear();sessionStorage.clear();});
it('shows pending removal until the locked save commits, then a new page reads two favourites with unchanged accounting',async()=>{
 await act(async()=>remove().click());
 expect(element.querySelector('[role="status"]')?.textContent).toContain('Saving');expect(buttons().every(button=>button.disabled)).toBe(true);expect(element.querySelectorAll('.watch-card')).toHaveLength(3);expect(JSON.parse(localStorage.getItem(PLATFORM_KEY)!).watchlist).toHaveLength(3);
 await act(async()=>release());expect(remove()).toBeNull();expect(element.querySelector('[role="status"]')).toBeNull();
 const saved:Platform=JSON.parse(localStorage.getItem(PLATFORM_KEY)!);expect(saved.watchlist.map(a=>a.name)).toEqual(['Bitcoin','Gold']);expect({...saved,watchlist:[]}).toEqual({...initial,watchlist:[]});
 await act(async()=>root.unmount());root=createRoot(element);await act(async()=>root.render(createElement(Watchlist,{compact:true})));expect(element.querySelectorAll('.compact-watch .watch-card')).toHaveLength(2);
});
it('keeps the favourite and exact saved bytes after a failed save, then enables retry',async()=>{
 const original=localStorage.getItem(PLATFORM_KEY);await act(async()=>remove().click());expect(remove().disabled).toBe(true);
 const set=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('quota');});await act(async()=>release());expect(localStorage.getItem(PLATFORM_KEY)).toBe(original);expect(remove().disabled).toBe(false);expect(element.querySelector('[role="alert"]')?.textContent).toContain('Could not save');expect(element.querySelector('[role="status"]')).toBeNull();
 set.mockRestore();await act(async()=>remove().click());await act(async()=>release());expect(remove()).toBeNull();
});
