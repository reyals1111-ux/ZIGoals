import {describe,expect,test} from 'vitest';
import {parseHealthNumber} from './health';
import {bodyWeightGrams} from './health-daily';

// Belgian, French and German keyboards type a decimal comma. It is accepted only
// where it cannot be a thousands separator; everything else keeps failing closed.
describe('Health decimal comma',()=>{
 test.each([
  ['1,5',1500],['72,5',72500],['0,125',125],[' 1,5 ',1500],['1,50',1500],['0,5',500],['12,05',12050],
 ] as const)('%j is accepted as a decimal comma',(raw,milli)=>{
  expect(parseHealthNumber(raw,1000,0,1_000_000)).toBe(milli);
 });
 test('a comma followed by three digits after a non-zero whole part is refused as ambiguous, with a clear message',()=>{
  expect(()=>parseHealthNumber('1,234',1000,0,1_000_000)).toThrow(/1234 or 1\.234/);
  expect(()=>parseHealthNumber('12,500',1000,0,1_000_000)).toThrow(/12500 or 12\.500/);
 });
 test.each(['1,2,3','1,5.2','1.234,5','1 234,5',',5','1,','1,2345','-1,5','1,5e3','0,0001'])('%j is still refused',raw=>{
  expect(()=>parseHealthNumber(raw,1000,0,1_000_000)).toThrow();
 });
 test('whole-number fields still refuse any comma',()=>{
  for(const raw of ['250,5','1,000','0,5'])expect(()=>parseHealthNumber(raw,1,0,100_000)).toThrow();
 });
 test('dot input is unchanged',()=>{
  expect(parseHealthNumber('1.234',1000,0,1_000_000)).toBe(1234);
  expect(parseHealthNumber('72.5',1000,0,1_000_000)).toBe(72500);
  expect(parseHealthNumber('250',1,0,100_000)).toBe(250);
 });
 test('body weight typed with a comma is stored in grams exactly',()=>{
  expect(bodyWeightGrams('72,5','kg')).toBe(72500);
  expect(bodyWeightGrams('160,4','lb')).toBe(72756);
 });
});
