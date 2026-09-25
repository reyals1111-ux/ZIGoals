/** Showcase data lives only in a tab's sessionStorage. Never proxy or mutate localStorage. */
import {getAccountScope,getAccountGeneration,isAccountLocked} from './account-session';
export const SHOWCASE_MARKER='zigoals:showcase:active:v1';
const PREFIX='zigoals:showcase:v1:';
type Selector={version:1;generation:string;day:string};
const scoped=new WeakMap<Storage,Map<string,Storage>>();
const scopes=new WeakMap<Storage,string>();
const selectedWindows=new WeakMap<object,boolean>();
function browserMarker():string|null{
 let raw:string|null;
 try{raw=window.sessionStorage.getItem(SHOWCASE_MARKER);}catch{
  if(selectedWindows.get(window))throw Error('Showcase storage is unavailable. No private data was accessed.');
  return null; // Normal Local Demo never required sessionStorage before Showcase existed.
 }
 selectedWindows.set(window,raw!==null);return raw;
}
function selector(storage:Storage):Selector|null{
 const raw=storage.getItem(SHOWCASE_MARKER);if(raw===null)return null;
 const value=JSON.parse(raw) as Selector;
 if(value.version!==1||!/^[-a-zA-Z0-9]{1,80}$/.test(value.generation)||!/^\d{4}-\d{2}-\d{2}$/.test(value.day))throw Error('Showcase session is damaged. Exit Showcase to return to your data.');
 return value;
}
function namespace(storage:Storage,prefix:string,guard:()=>void=()=>{},generation=''):Storage{
 const identity=prefix+generation;
 let cached=scoped.get(storage);if(!cached){cached=new Map();scoped.set(storage,cached);}const previous=cached.get(identity);if(previous)return previous;
 const keys=()=>{guard();return Array.from({length:storage.length},(_,i)=>storage.key(i)!).filter(k=>k.startsWith(prefix));};
 const view:Storage={get length(){return keys().length;},key:i=>keys()[i]?.slice(prefix.length)??null,getItem:k=>{guard();return storage.getItem(prefix+k);},setItem:(k,v)=>{guard();storage.setItem(prefix+k,v);},removeItem:k=>{guard();storage.removeItem(prefix+k);},clear:()=>keys().forEach(k=>storage.removeItem(k))};
 cached.set(identity,view);scopes.set(view,prefix);return view;
}
export function isShowcase():boolean{if(typeof window==='undefined')return false;try{return browserMarker()!==null;}catch{return selectedWindows.get(window)??false;}}
export function showcaseDay():string|null{try{return typeof window==='undefined'?null:selector(window.sessionStorage)?.day??null;}catch{return null;}}
export function getAppStorage():Storage{
 const raw=browserMarker();if(raw===null){
  const account=getAccountScope();if(!account)return window.localStorage;
  if(isAccountLocked())throw Error('Account records are locked. Verify your session and unlock the vault in Settings.');
  const generation=getAccountGeneration();
  return namespace(window.localStorage,`zigoals:account:v1:${account}:`,()=>{
   if(isShowcase()||getAccountScope()!==account||isAccountLocked()||getAccountGeneration()!==generation)throw Error('Account selection changed. This storage view is no longer available.');
  },String(generation));
 }
 const selected=selector(window.sessionStorage);if(!selected)throw Error('Showcase selection changed. Reload to continue.');return namespace(window.sessionStorage,`${PREFIX}${selected.generation}:`);
}
export function storageLockKey(storage:Storage,key:string):string{return `${scopes.get(storage)??''}${key}`;}
export function showcaseStorageKey(key:string):string{return storageLockKey(getAppStorage(),key);}
/** Commit a prepared dataset with one final selector write. Old data stays intact on failure. */
export function activateShowcase(session:Storage,day:string,records:Readonly<Record<string,string>>,generation=crypto.randomUUID()):void{
 if(!/^[-a-zA-Z0-9]{1,80}$/.test(generation))throw Error('Invalid showcase generation.');
 const prefix=`${PREFIX}${generation}:`;if(Array.from({length:session.length},(_,i)=>session.key(i)).some(k=>k?.startsWith(prefix)))throw Error('Showcase generation already exists.');
 const staged:string[]=[];
 try{for(const [key,value] of Object.entries(records)){const physical=prefix+key;session.setItem(physical,value);staged.push(physical);}session.setItem(SHOWCASE_MARKER,JSON.stringify({version:1,generation,day}));}
 catch(error){for(const key of staged)session.removeItem(key);throw error;}
 // Cleanup only after the selector committed. Failure can retain old demo bytes, never private data.
 const obsolete=Array.from({length:session.length},(_,i)=>session.key(i)!).filter(k=>k.startsWith(PREFIX)&&!k.startsWith(prefix));
 for(const key of obsolete)try{session.removeItem(key);}catch{/* The newly committed generation remains complete. */}
}
export function exitShowcase(session=window.sessionStorage):void{session.removeItem(SHOWCASE_MARKER);}
