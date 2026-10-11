// @vitest-environment jsdom
import {expect,test,vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {directoryEntries} from '@zigoals/ecosystem-registry/providers';
import {emptyPlatform,FUTURE_PROVIDERS} from './positions';
vi.mock('../components/platform/use-platform',()=>({usePlatform:()=>({data:emptyPlatform(),loaded:true,error:'',update:()=>{throw Error('Research navigation must not change holdings');}})}));
import {PositionsView} from '../components/platform/positions-view';

test('Positions provider disclosure links each named project to its existing research record without implying execution',()=>{
 const view=document.createElement('div');view.innerHTML=renderToStaticMarkup(createElement(PositionsView));
 const disclosure=Array.from(view.querySelectorAll('details')).find(node=>node.querySelector('summary')?.textContent==='Future provider architecture')!;
 expect(disclosure).toBeDefined();expect(disclosure.textContent).toContain('No live integration or execution is implied.');
 const expected=new Map([['Valdora stZIG','valdora'],['Valdora vaults','valdora'],['OroSwap LP','oroswap'],['PermaPod','permapod'],['WME','wme'],['Zignaly external account','zignaly'],['Nawa','nawa']]);
 expect(disclosure.querySelectorAll('a')).toHaveLength(expected.size);
 for(const [name,id] of expected){
  expect(directoryEntries.some(entry=>entry.id===id)).toBe(true);
  const row=Array.from(disclosure.querySelectorAll('li')).find(node=>node.textContent?.startsWith(name))!;
  expect(row.textContent).toContain('RESEARCH_ONLY');
  expect(row.querySelector('a')?.getAttribute('href')).toBe(`/app/ecosystem#project-${id}`);
  expect(row.querySelector('a')?.textContent).toContain('Research');
  expect(row.querySelector('a')?.getAttribute('target')).toBeNull();
 }
 expect(disclosure.querySelectorAll('li')).toHaveLength(FUTURE_PROVIDERS.length);
 for(const name of ['IBC','EVM','RWA']){
  const row=Array.from(disclosure.querySelectorAll('li')).find(node=>node.textContent?.startsWith(name))!;
  expect(row.querySelector('a')).toBeNull();expect(row.textContent).toContain('RESEARCH_ONLY');
 }
 expect(disclosure.querySelector('button,form,input')).toBeNull();
});
