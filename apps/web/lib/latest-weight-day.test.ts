import {afterEach,describe,expect,test} from 'vitest';
import {createEmptyHealth,saveWeight} from './health';
import {saveMeasurement,latestWeightObservation} from './body-measurements';

// A timed reading belongs to the calendar day of the time zone it was entered in,
// whatever zone this device (or CI) runs in.
const deviceZone=process.env.TZ;
afterEach(()=>{process.env.TZ=deviceZone;});
const at='2026-10-25T06:00:00.000Z';
const reading=(observedAt:string,timezone:string,data=createEmptyHealth())=>saveMeasurement(data,{id:'health_weight-local-day',kind:'weight',quantityMilli:72500,unit:'kg',observedAt,timezone,sourceLabel:'Fictional scale'},at);

describe.each(['UTC','Europe/Brussels','America/New_York'])('device zone %s',zone=>{
 test('an evening reading in New York is today’s latest weight, dated that local day',()=>{
  process.env.TZ=zone;
  const latest=latestWeightObservation(reading('2026-10-24T21:00:00-04:00','America/New_York'),'2026-10-24');
  expect(latest).toMatchObject({date:'2026-10-24',grams:72500});
 });
 test('a reading just after midnight in Brussels is dated that local day, not the UTC day before',()=>{
  process.env.TZ=zone;
  const data=reading('2026-10-25T00:30:00+02:00','Europe/Brussels');
  expect(latestWeightObservation(data,'2026-10-25')).toMatchObject({date:'2026-10-25'});
  expect(latestWeightObservation(data,'2026-10-24')).toBeUndefined();
 });
 test('the repeated hour when Brussels leaves summer time stays on 25 October',()=>{
  process.env.TZ=zone;
  expect(latestWeightObservation(reading('2026-10-25T02:30:00+01:00','Europe/Brussels'),'2026-10-25')).toMatchObject({date:'2026-10-25'});
 });
 test('a timed reading and a date-only reading on the same local day: the timed one is shown and the other is noted',()=>{
  process.env.TZ=zone;
  const daily=saveWeight(createEmptyHealth(),{id:'health_weight-date-only',date:'2026-10-24',grams:73000},at);
  const latest=latestWeightObservation(reading('2026-10-24T21:00:00-04:00','America/New_York',daily),'2026-10-24');
  expect(latest).toMatchObject({date:'2026-10-24',grams:72500});
  expect(latest?.detail).toContain('separate date-only reading also retained');
 });
});
