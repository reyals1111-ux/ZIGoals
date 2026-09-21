// @vitest-environment jsdom
import {act,createElement,useState} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {ActionIntent} from '../components/action-intent';
const nav=vi.hoisted(()=>({query:'',path:'/app/wealth',pending:[] as string[]}));
// Router replacements intentionally never settle: the production race happens while this navigation is pending.
vi.mock('next/navigation',()=>({useSearchParams:()=>new URLSearchParams(nav.query),usePathname:()=>nav.path,useRouter:()=>({replace:(url:string)=>{nav.pending.push(url);}})}));
let element:HTMLDivElement,root:Root;
beforeEach(()=>{vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);nav.query='';nav.path='/app/wealth';nav.pending=[];element=document.createElement('div');document.body.append(element);root=createRoot(element);});
afterEach(async()=>{await act(async()=>root.unmount());element.remove();vi.restoreAllMocks();vi.unstubAllGlobals();});
it('consumes the URL before opening and immediately reopens the same Asset intent after closing without a pending route replacement',async()=>{
 const openedAt:string[]=[];
 // Next's installed app-router.js skips canonical URL synchronization for internal __NA/_N writes.
 const nativeReplace=window.history.replaceState.bind(window.history);
 vi.spyOn(window.history,'replaceState').mockImplementation((data:Record<string,unknown>|null,unused,url)=>{if(!data?.__NA&&!data?._N)nav.query=new URL(String(url),window.location.href).search.slice(1);nativeReplace({...window.history.state,...data},unused,url);});
 function WealthIntent(){const [open,setOpen]=useState(false);return createElement('div',null,createElement('output',null,new URLSearchParams(nav.query).get('add')),createElement(ActionIntent,{value:'asset',onAction:()=>{openedAt.push(window.location.pathname+window.location.search+window.location.hash);setOpen(true);}}),open&&createElement('section',{'aria-label':'Add to your wealth'},createElement('button',{onClick:()=>setOpen(false)},'Close')));}
 for(let attempt=0;attempt<2;attempt++){
  window.history.pushState({retained:'state',__NA:true},'','/app/wealth?add=asset&view=owned#holdings');nav.query='add=asset&view=owned';await act(async()=>root.render(createElement(WealthIntent)));
  expect(element.querySelector('[aria-label="Add to your wealth"]')).not.toBeNull();expect(openedAt.at(-1)).toBe('/app/wealth?view=owned#holdings');expect(window.history.state).toEqual({retained:'state',__NA:true});expect(element.querySelector('output')?.textContent).toBe('');
  await act(async()=>element.querySelector<HTMLButtonElement>('button')!.click());expect(element.querySelector('[aria-label="Add to your wealth"]')).toBeNull();
 }
 expect(openedAt).toHaveLength(2);expect(nav.pending).toHaveLength(0);
});
it('does not consume a different current page using a stale router snapshot',async()=>{
 nav.query='add=asset';window.history.replaceState(null,'','/app/goals?add=asset#keep');let opened=false;
 await act(async()=>root.render(createElement(ActionIntent,{value:'asset',onAction:()=>{opened=true;}})));expect(opened).toBe(false);expect(window.location.pathname+window.location.search+window.location.hash).toBe('/app/goals?add=asset#keep');
});
it('retains an intent until ready and consumes only its own parameter while keeping the contribution anchor',async()=>{
 nav.path='/app/goals/tracked/9201';nav.query='contribute=1&view=history';window.history.replaceState(null,'',nav.path+'?'+nav.query+'#funding-wealth');let opened=0;const action=()=>{opened++;};
 await act(async()=>root.render(createElement(ActionIntent,{param:'contribute',value:'1',ready:false,onAction:action})));expect(opened).toBe(0);expect(window.location.search).toContain('contribute=1');
 await act(async()=>root.render(createElement(ActionIntent,{param:'contribute',value:'1',ready:true,onAction:action})));expect(opened).toBe(1);expect(window.location.search+window.location.hash).toBe('?view=history#funding-wealth');
});
