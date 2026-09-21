import {afterEach,expect,test,vi} from 'vitest';
import {activateShowcase,exitShowcase,getAppStorage,isShowcase,SHOWCASE_MARKER} from './showcase-storage';
import {buildShowcase} from './showcase-data';
import {platformSchema,PLATFORM_KEY,goalProgress} from './positions';
import {habitDataSchema,HABITS_KEY} from './habits';
import {healthSchema,HEALTH_STORAGE_KEY} from './health';
import {fundingHealth} from './goal-intelligence';
function memory():Storage{const m=new Map<string,string>();return {get length(){return m.size;},key:i=>[...m.keys()][i]??null,getItem:k=>m.get(k)??null,setItem:(k,v)=>{m.set(k,String(v));},removeItem:k=>{m.delete(k);},clear:()=>m.clear()};}
const bytes=(s:Storage)=>JSON.stringify(Array.from({length:s.length},(_,i)=>[s.key(i),s.getItem(s.key(i)!)]));
afterEach(()=>vi.unstubAllGlobals());
test('normal storage still works when optional session storage is blocked; an active showcase fails closed',()=>{const normal=memory(),session=memory();vi.stubGlobal('window',{localStorage:normal,sessionStorage:session});const read=session.getItem;session.getItem=()=>{throw Error('blocked');};expect(isShowcase()).toBe(false);expect(getAppStorage()).toBe(normal);session.getItem=read;const data=buildShowcase('2026-09-21');activateShowcase(session,data.day,data.records,'blocked-active');expect(isShowcase()).toBe(true);session.getItem=()=>{throw Error('blocked');};expect(isShowcase()).toBe(true);expect(()=>getAppStorage()).toThrow('Showcase storage');expect(normal.length).toBe(0);});
test('Showcase is explicit and load, edits, reset, exit preserve all normal bytes',()=>{
 const normal=memory(),session=memory();for(const k of [PLATFORM_KEY,HABITS_KEY,HEALTH_STORAGE_KEY,'zigoals:local-ledger:v1','zigoals:market-quotes:v1','wallet'])normal.setItem(k,`private original ${k}`);
 vi.stubGlobal('window',{localStorage:normal,sessionStorage:session});const original=bytes(normal);
 expect(isShowcase()).toBe(false);expect(getAppStorage()).toBe(normal);expect(session.length).toBe(0);
 const fixture=buildShowcase('2026-09-21');activateShowcase(session,fixture.day,fixture.records,'first');
 expect(isShowcase()).toBe(true);expect(getAppStorage().getItem(PLATFORM_KEY)).toBe(fixture.records[PLATFORM_KEY]);
 getAppStorage().setItem(PLATFORM_KEY,'edited demo');getAppStorage().setItem('zigoals:metadata:v1:local','demo plan');
 activateShowcase(session,fixture.day,fixture.records,'reset');expect(getAppStorage().getItem(PLATFORM_KEY)).toBe(fixture.records[PLATFORM_KEY]);
 expect(getAppStorage().getItem('zigoals:metadata:v1:local')).toBeNull();exitShowcase(session);expect(getAppStorage()).toBe(normal);expect(bytes(normal)).toBe(original);
});
test('failed staged writes retain the complete previous showcase and marker',()=>{
 const session=memory(),fixture=buildShowcase('2026-09-21');activateShowcase(session,fixture.day,fixture.records,'old');const old=bytes(session),write=session.setItem;
 session.setItem=(k,v)=>{if(k.includes(':new:')&&k.endsWith(HEALTH_STORAGE_KEY))throw Error('quota');write(k,v);};
 expect(()=>activateShowcase(session,fixture.day,fixture.records,'new')).toThrow('quota');expect(bytes(session)).toBe(old);
});
test('separate tabs and scoped clear never affect another tab or unrelated session keys',()=>{
 const a=memory(),b=memory(),fixture=buildShowcase('2026-09-21');a.setItem('unrelated','keep');activateShowcase(a,fixture.day,fixture.records,'tab-a');
 vi.stubGlobal('window',{localStorage:memory(),sessionStorage:a});getAppStorage().clear();expect(a.getItem('unrelated')).toBe('keep');expect(b.getItem(SHOWCASE_MARKER)).toBeNull();expect(b.length).toBe(0);
});
test('damaged or future showcase selector fails closed without falling into normal storage',()=>{
 const normal=memory(),session=memory();session.setItem(SHOWCASE_MARKER,'{"version":99}');vi.stubGlobal('window',{localStorage:normal,sessionStorage:session});
 expect(isShowcase()).toBe(true);expect(()=>getAppStorage()).toThrow();expect(normal.length).toBe(0);exitShowcase(session);expect(getAppStorage()).toBe(normal);
});
test('fixture is deterministic, schema-valid, bounded and satisfies full inventory',()=>{
 const fixture=buildShowcase('2026-09-21');expect(buildShowcase('2026-09-21')).toEqual(fixture);expect(()=>buildShowcase('2026-02-30')).toThrow();
 const p=platformSchema.parse(JSON.parse(fixture.records[PLATFORM_KEY]!));const h=habitDataSchema.parse(JSON.parse(fixture.records[HABITS_KEY]!));const health=healthSchema.parse(JSON.parse(fixture.records[HEALTH_STORAGE_KEY]!));
 expect(p.positions).toHaveLength(13);expect(p.positions.map(x=>x.asset)).toEqual(expect.arrayContaining(['BTC','ETH','ZIG','USDC','AAPL','NVDA','GOLD','SILVER','VOO','USD','EUR','HOME','CUSTOM']));
 expect(p.goals).toHaveLength(6);expect(new Set(p.goals.map(g=>g.type))).toEqual(new Set(['VALUE','QUANTITY','PROJECT','REWARD']));
 expect(p.watchlist.length).toBeGreaterThanOrEqual(7);expect(p.watchlist.some(f=>!p.positions.some(p=>p.marketRef?.id===f.ref.id))).toBe(true);
 expect(h.habits).toHaveLength(6);expect(h.habits.every(h=>h.entries.length>=30)).toBe(true);expect(new Set(health.diary.filter(x=>x.date===fixture.day).map(x=>x.meal)).size).toBe(4);
 for(const raw of Object.values(fixture.records))expect(new TextEncoder().encode(raw).length).toBeLessThan(2_000_000);
 expect(p.valuationSnapshots.length).toBeGreaterThan(100);expect(p.goalHistory.length).toBeGreaterThan(60);expect(p.contributions.some(e=>e.reversesId)).toBe(true);
 const now=Date.parse(fixture.day+'T23:59:00Z');expect(new Set(p.goals.filter(g=>g.type!=='PROJECT').map(g=>fundingHealth(p,g.id,now).status))).toEqual(new Set(['AHEAD','ON_TRACK','BEHIND','COMPLETED','REVIEW']));
 expect(p.positions.every(pos=>pos.verification==='MANUAL')).toBe(true);expect(p.positions.every(pos=>pos.provenance.includes('SHOWCASE'))).toBe(true);
 expect(p.goals.filter(g=>g.type==='VALUE').every(g=>BigInt(goalProgress(p,g.id,now).current)<=BigInt(g.target))).toBe(true);
});
