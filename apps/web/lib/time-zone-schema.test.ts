import {describe,expect,test} from 'vitest';
import {isTimeZone} from '@zigoals/goal-engine/time';
import {timeZoneSchema} from './time-zone-schema';

// Timezone phase 3 (R1, Session P): the zone a stored plan or journal may name. IANA names only: Intl also accepts
// fixed offsets, which carry no daylight-saving rules, and the design stores names (TIMEZONE_DESIGN.md).
describe('timeZoneSchema',()=>{
 test.each(['UTC','Europe/Brussels','America/New_York','Pacific/Kiritimati','Etc/GMT+12','Asia/Kolkata','Asia/Kathmandu','Australia/Lord_Howe','Pacific/Chatham','America/Santiago'])('accepts the IANA name %s',zone=>{
  expect(timeZoneSchema.parse(zone)).toBe(zone);
  expect(isTimeZone(zone)).toBe(true);
 });
 test.each(['+05:30','-03:00','+0530','UTC+2','GMT-3','utc+1'])('refuses the fixed offset %s',zone=>{
  const result=timeZoneSchema.safeParse(zone);
  expect(result.success).toBe(false);
  expect(result.error?.issues[0]?.message).toBe('Choose an IANA time zone name, for example Europe/Brussels.');
 });
 test.each(['','Mars/Olympus','Europe/Bruxelles','x'.repeat(101),'Europe/Brussels ','Brussels'])('refuses %j, which no zone database knows',zone=>{
  expect(timeZoneSchema.safeParse(zone).success).toBe(false);
 });
 test('refuses anything that is not a string',()=>{
  for(const value of [undefined,null,0,true,['UTC'],{zone:'UTC'}])expect(timeZoneSchema.safeParse(value).success).toBe(false);
 });
});
