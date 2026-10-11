import {test,expect} from 'vitest';
import {resolveConflicts} from './conflict-review';
import {validateData} from './account-data';
import {createEmptyHealth} from '../health';
import {saveMeasurement} from '../body-measurements';
const wrap=(rows:unknown[])=>({habits:JSON.stringify({rows})});
test('conflicting same-record fields require choices and retain independent changes',()=>{
 const b=wrap([{id:'a',name:'base',count:1}]),l=wrap([{id:'a',name:'local',count:1},{id:'b',name:'added'}]),r=wrap([{id:'a',name:'cloud',count:2}]);
 const plan=resolveConflicts(b,l,r,{});expect(plan.conflicts).toHaveLength(1);expect(plan.unresolved).toBe(1);
 const resolved=resolveConflicts(b,l,r,{[plan.conflicts[0]!.id]:'local'});expect(resolved.unresolved).toBe(0);expect(JSON.parse(resolved.data.habits!)).toEqual({rows:[{id:'a',name:'local',count:2},{id:'b',name:'added'}]});expect(b).toEqual(wrap([{id:'a',name:'base',count:1}]));
});
test('concurrent measurement correction review keeps both observed readings and immutable original',()=>{
 const draft={id:'health_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',kind:'waist' as const,quantityMilli:80000,unit:'cm' as const,observedAt:'2026-09-26T10:00:00.000Z',timezone:'UTC',sourceLabel:'Tape'},at='2026-09-26T12:00:00.000Z';
 const b=saveMeasurement(createEmptyHealth(),draft,at),l=saveMeasurement(b,{...draft,quantityMilli:79000},at),r=saveMeasurement(b,{...draft,quantityMilli:78000},at),wrap=(v:unknown)=>({health:JSON.stringify(v)});
 const p=resolveConflicts(wrap(b),wrap(l),wrap(r),{});expect(p.conflicts).toHaveLength(1);const result=resolveConflicts(wrap(b),wrap(l),wrap(r),{[p.conflicts[0]!.id]:'cloud'});validateData(result.data,wrap(b));validateData(result.data,wrap(l));validateData(result.data,wrap(r));expect(JSON.parse(result.data.health!).measurements[0].quantityMilli).toBe(78000);
 expect(()=>validateData(wrap({...l,measurements:[]}),wrap(b))).toThrow('history');
});
test('edit/delete remains explicit; financial integer conflicts offer exact combined deltas',()=>{
 const b={finance:'{"positions":[{"id":"p","quantity":"9007199254740993"}]}'},l={finance:'{"positions":[{"id":"p","quantity":"9007199254741003"}]}'},r={finance:'{"positions":[{"id":"p","quantity":"9007199254741013"}]}'};
 const p=resolveConflicts(b,l,r,{});expect(p.conflicts[0]!.combined).toBe('9007199254741023');expect(JSON.parse(resolveConflicts(b,l,r,{[p.conflicts[0]!.id]:'combined'}).data.finance!).positions[0].quantity).toBe('9007199254741023');
 expect(resolveConflicts(wrap([{id:'a',name:'base'}]),wrap([]),wrap([{id:'a',name:'edit'}]),{}).unresolved).toBe(1);
});
