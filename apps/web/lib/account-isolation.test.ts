import {afterEach,expect,test,vi} from 'vitest';
import * as account from './account-session';
import {activateShowcase,exitShowcase,getAppStorage,storageLockKey} from './showcase-storage';
const alice='10000000-0000-4000-8000-000000000001',bob='20000000-0000-4000-8000-000000000002';
function memory():Storage{const m=new Map<string,string>();return {get length(){return m.size;},key:i=>[...m.keys()][i]??null,getItem:k=>m.get(k)??null,setItem:(k,v)=>{m.set(k,String(v));},removeItem:k=>{m.delete(k);},clear:()=>m.clear()};}
function browser(){const w=Object.assign(new EventTarget(),{localStorage:memory(),sessionStorage:memory()});vi.stubGlobal('window',w);return w;}
afterEach(()=>vi.unstubAllGlobals());
test('local, two accounts and Showcase never read or erase one another',()=>{
 const w=browser();w.localStorage.setItem('private','local');account.activateAccount(alice);expect(account.isAccountLocked()).toBe(true);expect(()=>getAppStorage()).toThrow();account.unlockAccount();const a=getAppStorage();expect(a.getItem('private')).toBeNull();a.setItem('private','alice');
 account.activateAccount(bob);account.unlockAccount();const b=getAppStorage();expect(b.getItem('private')).toBeNull();b.setItem('private','bob');expect(storageLockKey(a,'private')).not.toBe(storageLockKey(b,'private'));
 activateShowcase(w.sessionStorage,'2026-09-23',{private:'fictional'},'fixture');expect(getAppStorage().getItem('private')).toBe('fictional');expect(()=>b.setItem('private','late')).toThrow();getAppStorage().clear();exitShowcase();expect(getAppStorage().getItem('private')).toBe('bob');
 account.activateAccount(alice);account.unlockAccount();expect(getAppStorage().getItem('private')).toBe('alice');getAppStorage().clear();account.clearAccountSession();expect(getAppStorage().getItem('private')).toBe('local');account.activateAccount(bob);account.unlockAccount();expect(getAppStorage().getItem('private')).toBe('bob');
});
test('lock and same-account relogin revoke old storage objects',()=>{
 browser();account.activateAccount(alice);account.unlockAccount();const old=getAppStorage();old.setItem('private','saved');account.lockAccount();expect(()=>old.getItem('private')).toThrow();expect(()=>old.setItem('private','late')).toThrow();account.unlockAccount();expect(getAppStorage()===old).toBe(false);account.clearAccountSession();account.activateAccount(alice);account.unlockAccount();expect(()=>old.clear()).toThrow();expect(getAppStorage().getItem('private')).toBe('saved');
});
test('persisted selector is locked on a fresh page, never authentication proof',()=>{
 const first=browser();account.activateAccount(alice);account.unlockAccount();const next=Object.assign(new EventTarget(),{sessionStorage:first.sessionStorage,localStorage:first.localStorage});vi.stubGlobal('window',next);expect(account.getAccountScope()).toBe(alice);expect(account.isAccountLocked()).toBe(true);expect(()=>getAppStorage()).toThrow();
});
test('corrupt and unavailable selected-account storage fail closed',()=>{
 const w=browser();expect(()=>account.activateAccount('../other')).toThrow();account.activateAccount(alice);w.sessionStorage.setItem(account.ACCOUNT_SELECTOR,'{"version":99}');expect(()=>getAppStorage()).toThrow();account.clearAccountSession();account.activateAccount(alice);w.sessionStorage.getItem=()=>{throw Error('blocked');};expect(()=>getAppStorage()).toThrow();
});
test('locked account may inspect fictional Showcase, exiting remains locked',()=>{
 const w=browser();account.activateAccount(alice);activateShowcase(w.sessionStorage,'2026-09-23',{private:'fictional'},'fixture');expect(getAppStorage().getItem('private')).toBe('fictional');exitShowcase();expect(()=>getAppStorage()).toThrow();expect(account.getAccountScope()).toBe(alice);
});
test('account transitions announce a new generation without broadcasting records',()=>{
 const w=browser(),events:Event[]=[];w.addEventListener('zigoals:account-change',e=>events.push(e));const before=account.getAccountGeneration();account.activateAccount(alice);account.unlockAccount();account.lockAccount();account.clearAccountSession();expect(account.getAccountGeneration()).toBeGreaterThan(before);expect(events).toHaveLength(4);expect(events.every(e=>!('detail' in e))).toBe(true);
});
test('failed selector removal still revokes unlocked storage access',()=>{
 const w=browser();account.activateAccount(alice);account.unlockAccount();const old=getAppStorage();old.setItem('private','saved');w.sessionStorage.removeItem=()=>{throw Error('blocked');};expect(()=>account.clearAccountSession()).toThrow();expect(()=>old.getItem('private')).toThrow();expect(account.isAccountLocked()).toBe(true);
});
test('profile-wide notifications can only lock and never unlock or echo secrets',()=>{
 const w=browser(),sent:unknown[]=[];let incoming:((event:MessageEvent)=>void)|null=null;
 class Channel{onmessage:((event:MessageEvent)=>void)|null=null;constructor(){queueMicrotask(()=>{incoming=this.onmessage;});}postMessage(value:unknown){sent.push(value);}}
 Object.assign(w,{BroadcastChannel:Channel});account.activateAccount(alice);account.unlockAccount();expect(sent).toEqual(['lock']);
 // Deliver through the actual registered channel handler, as another tab would.
 return Promise.resolve().then(()=>{incoming?.({data:'unlock'} as MessageEvent);expect(account.isAccountLocked()).toBe(false);incoming?.({data:'lock'} as MessageEvent);expect(account.isAccountLocked()).toBe(true);expect(sent).toEqual(['lock']);account.clearAccountSession();expect(sent).toEqual(['lock','lock']);});
});
