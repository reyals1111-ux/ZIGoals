import {expect,test} from 'vitest';
import {LAYOUT_KEY,columnsFromTops,emptyLayout,entityLayoutId,moveInList,moveWithinSubset,parseLayout,resetPage,resolveOrder,savedOrder,serializeLayout,setRegionOrder} from './page-layout';

test('the layout key follows the versioned zigoals naming',()=>{expect(LAYOUT_KEY).toBe('zigoals:layout:v1');});

test('with nothing saved, the default order is the display order',()=>{
 expect(resolveOrder(['a','b','c'])).toEqual(['a','b','c']);
 expect(resolveOrder(['a','b','c'],[])).toEqual(['a','b','c']);
});

test('a saved order wins; unknown saved IDs are ignored; new cards appear in their default spot',()=>{
 expect(resolveOrder(['a','b','c'],['c','a','b'])).toEqual(['c','a','b']);
 expect(resolveOrder(['a','b','c'],['gone','c','a','b','old'])).toEqual(['c','a','b']);
 // "n" is new and defaults after "b": it follows b wherever b now is.
 expect(resolveOrder(['a','b','n','c'],['c','b','a'])).toEqual(['c','b','n','a']);
 // A new first card goes first.
 expect(resolveOrder(['n','a','b'],['b','a'])).toEqual(['n','b','a']);
 // Duplicates in storage never duplicate cards.
 expect(resolveOrder(['a','b'],['b','b','a'])).toEqual(['b','a']);
});

test('moving reorders, clamps and ignores unknown IDs',()=>{
 expect(moveInList(['a','b','c','d'],'a',2)).toEqual(['b','c','a','d']);
 expect(moveInList(['a','b','c'],'c',0)).toEqual(['c','a','b']);
 expect(moveInList(['a','b','c'],'b',99)).toEqual(['a','c','b']);
 expect(moveInList(['a','b','c'],'b',-4)).toEqual(['b','a','c']);
 expect(moveInList(['a','b'],'x',0)).toEqual(['a','b']);
});

test('moving within a filtered view keeps hidden cards in their slots',()=>{
 // Visible: a, c, e. Moving e to the front swaps it into a's slot; b and d stay put.
 expect(moveWithinSubset(['a','b','c','d','e'],['a','c','e'],'e',0)).toEqual(['e','b','a','d','c']);
 expect(moveWithinSubset(['a','b','c'],['a','c'],'b',0)).toEqual(['a','b','c']);
});

test('saving and resetting touch only the chosen page, and absent cards keep their saved place',()=>{
 let layout=setRegionOrder(emptyLayout(),'goals','cards',['b','a']);
 layout=setRegionOrder(layout,'habits','body',['x','y']);
 expect(savedOrder(layout,'goals','cards')).toEqual(['b','a']);
 // "archived" was saved before and is not shown now; it keeps its place after "b".
 layout=setRegionOrder(setRegionOrder(layout,'wealth','body',['b','archived','a']),'wealth','body',['a','b']);
 expect(savedOrder(layout,'wealth','body')).toEqual(['a','b','archived']);
 const reset=resetPage(layout,'goals');
 expect(savedOrder(reset,'goals','cards')).toBeUndefined();expect(savedOrder(reset,'habits','body')).toEqual(['x','y']);
 expect(parseLayout(serializeLayout(reset))).toEqual(reset);
});

test('corrupt, oversized or hostile storage falls back without throwing',()=>{
 for(const raw of [null,undefined,'','{','[]','null','{"version":2,"pages":{}}','{"version":1,"pages":[]}','x'.repeat(300_000)])expect(parseLayout(raw as string)).toEqual(emptyLayout());
 const parsed=parseLayout(JSON.stringify({version:1,pages:{
  goals:{cards:{order:['ok','bad id with spaces',7,'ok','fine']},broken:{order:'nope'}},
  'bad page!':{r:{order:['a']}},
 }}).replace('"goals":','"__proto__":{"x":{"order":["a"]}},"constructor":{"x":{"order":["a"]}},"goals":'));
 expect(parsed.pages.goals).toEqual({cards:{order:['ok','fine']}});
 expect(Object.keys(parsed.pages)).toEqual(['goals']);expect(Object.getPrototypeOf(parsed.pages)).toBe(Object.prototype);
 expect(savedOrder(parsed,'toString','x')).toBeUndefined();
});

test('entity IDs are stable, short and never contain the source key',()=>{
 const key='legacy:zig-test-2:zig1qexampleaddress:7';
 expect(entityLayoutId(key)).toBe(entityLayoutId(key));
 expect(entityLayoutId(key)).toMatch(/^e[0-9a-f]{8}$/);
 expect(entityLayoutId(key)).not.toContain('zig1');
 expect(entityLayoutId('a')).not.toBe(entityLayoutId('b'));
});

// Session AE (Part 4, ADR-027): Habits' Routines block is its own layout item, `habits:routines`, by default right after the
// groups (`habits:list`). These are the defaults habits-workspace.tsx renders (desktop: source order; phone: PHONE_ORDER).
// page-layout.ts is byte-identical from build #37 (32cb9c5) to this branch, so the old-build cases below are those builds' own reader.
const OLD_DESKTOP=['habits:overview','habits:consistency','habits:list','habits:rhythm'],OLD_PHONE=['habits:overview','habits:list','habits:consistency','habits:rhythm'];
const DESKTOP=['habits:overview','habits:consistency','habits:list','habits:routines','habits:rhythm'],PHONE=['habits:overview','habits:list','habits:routines','habits:consistency','habits:rhythm'];
test('Habits: a saved order from before the Routines block keeps winning, and Routines appears right after the list',()=>{
 // A new device, the Showcase and "Reset this page": the new defaults.
 expect(resolveOrder(DESKTOP)).toEqual(DESKTOP);expect(resolveOrder(PHONE)).toEqual(PHONE);
 // An old saved order, wherever the list is, on either default.
 for(const defaults of [DESKTOP,PHONE]){
  expect(resolveOrder(defaults,OLD_DESKTOP)).toEqual(DESKTOP);
  expect(resolveOrder(defaults,OLD_PHONE)).toEqual(PHONE);
  expect(resolveOrder(defaults,['habits:rhythm','habits:consistency','habits:overview','habits:list'])).toEqual(['habits:rhythm','habits:consistency','habits:overview','habits:list','habits:routines']);
  expect(resolveOrder(defaults,['habits:list','habits:overview','habits:consistency','habits:rhythm'])).toEqual(['habits:list','habits:routines','habits:overview','habits:consistency','habits:rhythm']);
  expect(resolveOrder(defaults,['habits:consistency','habits:overview','habits:list','habits:rhythm'])).toEqual(['habits:consistency','habits:overview','habits:list','habits:routines','habits:rhythm']);
 }
 // With no habits there is no consistency card; Routines still follows the list.
 expect(resolveOrder(DESKTOP.filter(id=>id!=='habits:consistency'),['habits:rhythm','habits:list','habits:overview'])).toEqual(['habits:rhythm','habits:list','habits:routines','habits:overview']);
 // Reading never rewrites: the stored layout is the same bytes after the page resolves it.
 const raw=serializeLayout(setRegionOrder(emptyLayout(),'habits','body',OLD_DESKTOP)),layout=parseLayout(raw);
 resolveOrder(DESKTOP,savedOrder(layout,'habits','body'));expect(serializeLayout(layout)).toBe(raw);expect(savedOrder(layout,'habits','body')).toEqual(OLD_DESKTOP);
});
test('Habits: an older build ignores habits:routines when it reads, and keeps it when it writes',()=>{
 // The person moved Routines above the groups on this build.
 const mine=['habits:overview','habits:consistency','habits:routines','habits:list','habits:rhythm'];
 const layout=parseLayout(serializeLayout(setRegionOrder(emptyLayout(),'habits','body',mine)));
 expect(savedOrder(layout,'habits','body')).toEqual(mine);
 // An older build (Routines inside the list block) shows its own four items in the saved order; the unknown id is ignored.
 expect(resolveOrder(OLD_DESKTOP,savedOrder(layout,'habits','body'))).toEqual(OLD_DESKTOP);
 expect(resolveOrder(OLD_PHONE,savedOrder(layout,'habits','body'))).toEqual(OLD_DESKTOP);
 // A move there writes its four ids; habits:routines keeps its place after the item it followed.
 const old=setRegionOrder(layout,'habits','body',['habits:rhythm','habits:overview','habits:consistency','habits:list']);
 expect(savedOrder(old,'habits','body')).toEqual(['habits:rhythm','habits:overview','habits:consistency','habits:routines','habits:list']);
 // Back on this build, Routines is still above the list.
 expect(resolveOrder(DESKTOP,savedOrder(old,'habits','body'))).toEqual(['habits:rhythm','habits:overview','habits:consistency','habits:routines','habits:list']);
 // "Reset this page" on either build forgets the whole page, so the defaults return.
 expect(savedOrder(resetPage(old,'habits'),'habits','body')).toBeUndefined();
});

test('grid columns are counted from the first row',()=>{
 expect(columnsFromTops([])).toBe(1);expect(columnsFromTops([10,10,10,300,300])).toBe(3);expect(columnsFromTops([0,200,400])).toBe(1);
});
