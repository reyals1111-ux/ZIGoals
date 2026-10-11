import {afterEach,describe,expect,test,vi} from 'vitest';
import {localDate,addLocalDays,localWeekday} from './local-date';
import {createHabit,emptyHabitData,logHabitCount,habitStats,habitDay,habitCalendarDay,saveHabitTimezone,type HabitData} from './habits';
import {healthDay} from './health-daily';

// Regression lock for calendar days around the two DST ends friends will meet this autumn
// (Europe/Brussels 2026-10-25, America/New_York 2026-11-01), midnight rollovers, month end,
// year end and the leap day 2028-02-29. Nothing pins TZ in vitest or CI, so every case sets
// the device zone itself (Node applies process.env.TZ at once) and the suite runs under
// UTC, Brussels and New York on any machine.
const deviceZone=process.env.TZ;
afterEach(()=>{process.env.TZ=deviceZone;vi.useRealTimers();});
const device=(zone:string,iso?:string)=>{process.env.TZ=zone;if(iso)vi.useFakeTimers({now:new Date(iso),toFake:['Date']});};
const ZONES=['UTC','Europe/Brussels','America/New_York'] as const;

describe('device "today" (localDate) at the edges',()=>{
 test.each([
  // Brussels: CEST (+02) until 03:00 local on 25 Oct, then CET (+01)
  ['Europe/Brussels','2026-10-24T21:59:00Z','2026-10-24'],['Europe/Brussels','2026-10-24T22:01:00Z','2026-10-25'],
  ['Europe/Brussels','2026-10-25T00:30:00Z','2026-10-25'],['Europe/Brussels','2026-10-25T01:30:00Z','2026-10-25'],
  ['Europe/Brussels','2026-10-25T22:59:00Z','2026-10-25'],['Europe/Brussels','2026-10-25T23:01:00Z','2026-10-26'],
  // New York: EDT (-04) until 02:00 local on 1 Nov, then EST (-05)
  ['America/New_York','2026-11-01T03:59:00Z','2026-10-31'],['America/New_York','2026-11-01T04:01:00Z','2026-11-01'],
  ['America/New_York','2026-11-01T05:30:00Z','2026-11-01'],['America/New_York','2026-11-01T06:30:00Z','2026-11-01'],
  ['America/New_York','2026-11-02T04:59:00Z','2026-11-01'],['America/New_York','2026-11-02T05:01:00Z','2026-11-02'],
  // month end, year end, leap day
  ['Europe/Brussels','2026-10-31T22:59:00Z','2026-10-31'],['Europe/Brussels','2026-10-31T23:01:00Z','2026-11-01'],
  ['America/New_York','2027-01-01T04:59:00Z','2026-12-31'],['America/New_York','2027-01-01T05:01:00Z','2027-01-01'],
  ['Europe/Brussels','2028-02-28T23:01:00Z','2028-02-29'],['Europe/Brussels','2028-02-29T23:01:00Z','2028-03-01'],
 ])('%s at %s is %s',(zone,iso,expected)=>{device(zone,iso);expect(localDate()).toBe(expected);});
});

describe.each(ZONES)('calendar arithmetic on a %s device',zone=>{
 test('adding days crosses both DST ends, month end, year end and the leap day',()=>{
  device(zone);
  expect(['2026-10-24','2026-10-25','2026-10-31','2026-11-01','2026-12-31','2028-02-28','2028-02-29'].map(d=>addLocalDays(d,1))).toEqual(['2026-10-25','2026-10-26','2026-11-01','2026-11-02','2027-01-01','2028-02-29','2028-03-01']);
  expect(addLocalDays('2026-11-02',-7)).toBe('2026-10-26');
  expect(localWeekday('2026-10-25')).toBe(0);expect(localWeekday('2026-11-01')).toBe(0);expect(localWeekday('2028-02-29')).toBe(2);
 });
 test('journal days in a saved zone ignore the device zone',()=>{
  device(zone);
  const ny={timeZone:'America/New_York'},brussels={timeZone:'Europe/Brussels'};
  expect(habitCalendarDay(ny,new Date('2026-11-01T03:59:00Z'))).toBe('2026-10-31');
  expect(habitCalendarDay(ny,new Date('2026-11-01T06:30:00Z'))).toBe('2026-11-01');
  expect(habitCalendarDay(brussels,new Date('2026-10-25T01:30:00Z'))).toBe('2026-10-25');
  expect(healthDay('Europe/Brussels',new Date('2026-10-24T22:30:00Z'))).toBe('2026-10-25');
  expect(healthDay('America/New_York',new Date('2027-01-01T04:30:00Z'))).toBe('2026-12-31');
  expect(healthDay('Europe/Brussels',new Date('2028-02-28T23:30:00Z'))).toBe('2028-02-29');
 });
});

const id='00000000-0000-4000-8000-00000000da7e';
function daily(from:string,dates:readonly string[],timeZone?:string):HabitData{
 let d=createHabit(timeZone?saveHabitTimezone(emptyHabitData(),timeZone):emptyHabitData(),{title:'Fictional walk',category:'Movement',description:'',notes:'',schedule:{kind:'daily'},target:1},new Date(`${from}T12:00:00Z`),id);
 for(const date of dates)d=logHabitCount(d,id,date,1,'',new Date(`${date}T12:00:00Z`));
 return d;
}
const span=(from:string,to:string)=>{const out:string[]=[];for(let d=from;d<=to;d=addLocalDays(d,1))out.push(d);return out;};

describe.each(ZONES)('streaks on a %s device',zone=>{
 test('a daily streak runs unbroken through both DST weekends',()=>{
  device(zone);const h=daily('2026-10-19',span('2026-10-19','2026-11-03')).habits[0]!;
  expect(habitStats(h,'2026-11-03')).toMatchObject({currentStreak:16,bestStreak:16});
 });
 test('a missed 25 October breaks the streak once, and it restarts the next day',()=>{
  device(zone);const h=daily('2026-10-19',span('2026-10-19','2026-11-03').filter(d=>d!=='2026-10-25')).habits[0]!;
  expect(habitDay(h,'2026-10-25','2026-11-03').status).toBe('failed');
  expect(habitStats(h,'2026-11-03')).toMatchObject({currentStreak:9,bestStreak:9});
 });
 test('today keeps its grace until the next local midnight',()=>{
  device(zone);const h=daily('2026-10-28',span('2026-10-28','2026-10-31')).habits[0]!;
  expect(habitDay(h,'2026-11-01','2026-11-01').status).toBe('due');
  expect(habitStats(h,'2026-11-01')).toMatchObject({currentStreak:4});
  expect(habitDay(h,'2026-11-01','2026-11-02').status).toBe('failed');
  expect(habitStats(h,'2026-11-02')).toMatchObject({currentStreak:0,bestStreak:4});
 });
 test('the week containing the DST change counts Monday to Sunday',()=>{
  device(zone);const h=daily('2026-10-19',span('2026-10-19','2026-10-25').filter(d=>d!=='2026-10-22')).habits[0]!;
  expect(habitStats(h,'2026-10-25')).toMatchObject({weeklyCompleted:6,weeklyScheduled:7,weeklyConsistency:86});
 });
 test('month end, year end and the leap day keep the streak',()=>{
  device(zone);
  expect(habitStats(daily('2026-12-29',span('2026-12-29','2027-01-02')).habits[0]!,'2027-01-02')).toMatchObject({currentStreak:5});
  expect(habitStats(daily('2028-02-27',span('2028-02-27','2028-03-01')).habits[0]!,'2028-03-01')).toMatchObject({currentStreak:4});
 });
 test('changing the journal time zone mid-streak renames no stored day and keeps the streak',()=>{
  device(zone);const before=daily('2026-10-19',span('2026-10-19','2026-11-03'),'Europe/Brussels'),after=saveHabitTimezone(before,'America/New_York');
  expect(after.habits[0]!.entries.map(e=>e.date)).toEqual(before.habits[0]!.entries.map(e=>e.date));
  expect(habitStats(after.habits[0]!,'2026-11-03')).toMatchObject({currentStreak:16});
 });
});
