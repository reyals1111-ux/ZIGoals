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

test('grid columns are counted from the first row',()=>{
 expect(columnsFromTops([])).toBe(1);expect(columnsFromTops([10,10,10,300,300])).toBe(3);expect(columnsFromTops([0,200,400])).toBe(1);
});
