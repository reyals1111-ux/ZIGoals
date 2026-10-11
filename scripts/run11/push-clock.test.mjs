// workers/push-reminders/clock.mjs: the next due instant of a schedule across zones and clock changes, the wall clock
// and the quiet window. Zones follow the habit calendar tests (apps/web/lib/habit-timezone.test.ts).
import {expect,test} from 'vitest';
import {inQuietWindow,nextDue,wallClock,weekdayBit,zoneSupported,zonedInstant} from '../../workers/push-reminders/clock.mjs';

const ALL=127,MONDAY=weekdayBit(1),SUNDAY=weekdayBit(0);
test('weekday bits: Monday = 1 … Sunday = 64',()=>{
 expect([1,2,3,4,5,6,0].map(weekdayBit)).toEqual([1,2,4,8,16,32,64]);expect(MONDAY|SUNDAY).toBe(65);
});
test('the wall clock in a zone: date, time, weekday; midnight reads 00, never 24',()=>{
 expect(wallClock(Date.UTC(2026,9,5,6,0),'Europe/Brussels')).toMatchObject({date:'2026-10-05',time:'08:00',weekday:1,hour:8,minute:0});
 expect(wallClock(Date.UTC(2026,9,5,22,0),'Europe/Brussels')).toMatchObject({date:'2026-10-06',time:'00:00',weekday:2,hour:0});
 expect(wallClock(Date.UTC(2026,9,5,6,0),'Asia/Kolkata')).toMatchObject({date:'2026-10-05',time:'11:30'});
 expect(wallClock(Date.UTC(2026,9,5,6,0),'Pacific/Kiritimati')).toMatchObject({date:'2026-10-05',time:'20:00'});
 expect(wallClock(Date.UTC(2026,9,5,6,0),'Pacific/Niue')).toMatchObject({date:'2026-10-04',time:'19:00',weekday:0});
});
test.each([
 ['UTC','2026-10-05','08:00',Date.UTC(2026,9,5,8,0)],
 ['Europe/Brussels','2026-10-05','08:00',Date.UTC(2026,9,5,6,0)],
 ['Europe/Brussels','2026-12-07','08:00',Date.UTC(2026,11,7,7,0)],
 ['America/New_York','2026-10-05','08:00',Date.UTC(2026,9,5,12,0)],
 ['America/St_Johns','2026-10-05','08:00',Date.UTC(2026,9,5,10,30)],
 ['America/Sao_Paulo','2026-10-05','08:00',Date.UTC(2026,9,5,11,0)],
 ['Asia/Kolkata','2026-10-05','08:00',Date.UTC(2026,9,5,2,30)],
 ['Asia/Kathmandu','2026-10-05','08:00',Date.UTC(2026,9,5,2,15)],
 ['Asia/Tokyo','2026-10-05','08:00',Date.UTC(2026,9,4,23,0)],
 ['Australia/Lord_Howe','2026-10-05','08:00',Date.UTC(2026,9,4,21,0)],
 ['Pacific/Chatham','2026-10-05','08:00',Date.UTC(2026,9,4,18,15)],
 ['Pacific/Apia','2026-10-05','08:00',Date.UTC(2026,9,4,19,0)],
 ['Pacific/Kiritimati','2026-10-05','08:00',Date.UTC(2026,9,4,18,0)],
 ['Pacific/Niue','2026-10-05','08:00',Date.UTC(2026,9,5,19,0)],
])('%s: %s %s is the expected instant',(zone,date,time,instant)=>{
 expect(zonedInstant(date,time,zone)).toBe(instant);
 expect(wallClock(instant,zone)).toMatchObject({date,time});
});
test('clock changes in Brussels: a skipped 02:30 moves to 03:30; a repeated 02:30 takes the later occurrence',()=>{
 expect(zonedInstant('2026-03-29','02:30','Europe/Brussels')).toBe(Date.UTC(2026,2,29,1,30));
 expect(wallClock(Date.UTC(2026,2,29,1,30),'Europe/Brussels').time).toBe('03:30');
 expect(zonedInstant('2026-10-25','02:30','Europe/Brussels')).toBe(Date.UTC(2026,9,25,1,30));
 expect(wallClock(Date.UTC(2026,9,25,1,30),'Europe/Brussels').time).toBe('02:30');
 expect(zonedInstant('2026-03-29','01:59','Europe/Brussels')).toBe(Date.UTC(2026,2,29,0,59));
 expect(zonedInstant('2026-03-29','03:00','Europe/Brussels')).toBe(Date.UTC(2026,2,29,1,0));
});
test('nextDue: at the instant itself, after it, across the weekday mask and across a clock change',()=>{
 const daily={time:'08:00',zone:'Europe/Brussels',weekdays:ALL},monday={...daily,weekdays:MONDAY};
 const due=Date.UTC(2026,9,5,6,0);
 expect(nextDue(daily,due)).toBe(due);
 expect(nextDue(daily,due+1)).toBe(Date.UTC(2026,9,6,6,0));
 expect(nextDue(daily,Date.UTC(2026,9,5,5,59))).toBe(due);
 expect(nextDue(monday,due+1)).toBe(Date.UTC(2026,9,12,6,0));
 // After the 25 October change the same wall time is an hour later in UTC.
 expect(nextDue(monday,Date.UTC(2026,9,20,6,0))).toBe(Date.UTC(2026,9,26,7,0));
 expect(nextDue({...daily,weekdays:SUNDAY},Date.UTC(2026,9,5,6,0))).toBe(Date.UTC(2026,9,11,6,0));
 expect(nextDue({time:'23:30',zone:'Pacific/Kiritimati',weekdays:ALL},Date.UTC(2026,9,5,9,31))).toBe(Date.UTC(2026,9,6,9,30));
 expect(nextDue({...daily,weekdays:0},due)).toBeNull();
});
test('the quiet window: a wrapping window, a plain window, none when from equals to',()=>{
 expect(inQuietWindow('23:30','22:00','07:00')).toBe(true);expect(inQuietWindow('06:59','22:00','07:00')).toBe(true);
 expect(inQuietWindow('07:00','22:00','07:00')).toBe(false);expect(inQuietWindow('21:59','22:00','07:00')).toBe(false);expect(inQuietWindow('22:00','22:00','07:00')).toBe(true);
 expect(inQuietWindow('13:00','12:00','14:00')).toBe(true);expect(inQuietWindow('14:00','12:00','14:00')).toBe(false);expect(inQuietWindow('11:59','12:00','14:00')).toBe(false);
 expect(inQuietWindow('12:00','12:00','12:00')).toBe(false);
});
test('zoneSupported accepts IANA names this runtime knows and refuses everything else',()=>{
 for(const zone of ['UTC','Europe/Brussels','America/Argentina/Buenos_Aires','Etc/GMT+3','Pacific/Chatham'])expect(zoneSupported(zone)).toBe(true);
 for(const zone of ['','Not/AZone','Europe/Brussels;','GMT+2:00',42,null,'a'.repeat(101)])expect(zoneSupported(zone)).toBe(false);
});
