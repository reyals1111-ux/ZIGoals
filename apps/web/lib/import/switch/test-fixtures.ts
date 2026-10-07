import type {ImportFile} from './source';

/**
 * Fictional exports for the importer tests (Session W Part 7), shaped like each vendor's files as IMPORT_FORMATS.md
 * describes them. Every name, number and date is invented; nothing comes from a real person's export.
 */
export const fileOf = (path: string, text: string): ImportFile => { const blob = new Blob([text]); return {path, size: blob.size, open: async () => blob.stream() as ReadableStream<Uint8Array>}; };
export const filesOf = (entries: Record<string, string>) => Object.entries(entries).map(([path, text]) => fileOf(path, text));
const rec = (type: string, source: string, unit: string, start: string, end: string, value: string, meta = '') =>
  meta ? `<Record type="${type}" sourceName="${source}" sourceVersion="17.0" unit="${unit}" creationDate="${end}" startDate="${start}" endDate="${end}" value="${value}">\n  ${meta}\n </Record>`
    : `<Record type="${type}" sourceName="${source}" sourceVersion="17.0" unit="${unit}" creationDate="${end}" startDate="${start}" endDate="${end}" value="${value}"/>`;
const sleep = (source: string, start: string, end: string, value: string, zone?: string) => `<Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="${source}" creationDate="${end}" startDate="${start}" endDate="${end}" value="HKCategoryValueSleepAnalysis${value}"${zone ? `>\n  <MetadataEntry key="HKTimeZone" value="${zone}"/>\n </Record>` : '/>'}`;
export const APPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE HealthData [
<!-- HealthKit Export Version: 14 -->
<!ELEMENT HealthData (ExportDate,Me,(Record|Correlation|Workout|ActivitySummary|ClinicalRecord|Audiogram|VisionPrescription)*)>
<!ATTLIST HealthData
  locale CDATA #REQUIRED
>
<!ELEMENT Record ((MetadataEntry|HeartRateVariabilityMetadataList)*)>
<!ATTLIST Record
  type          CDATA #REQUIRED
  value         CDATA #IMPLIED
>
]>
<HealthData locale="en_BE">
 <ExportDate value="2026-10-06 21:00:00 +0200"/>
 <Me HKCharacteristicTypeIdentifierDateOfBirth="" HKCharacteristicTypeIdentifierBiologicalSex="HKBiologicalSexNotSet"/>
 ${rec('HKQuantityTypeIdentifierStepCount', 'Fictional iPhone', 'count', '2026-10-01 08:00:00 +0200', '2026-10-01 08:10:00 +0200', '1200')}
 ${rec('HKQuantityTypeIdentifierStepCount', 'Fictional Watch', 'count', '2026-10-01 08:00:00 +0200', '2026-10-01 08:10:00 +0200', '1500')}
 ${rec('HKQuantityTypeIdentifierStepCount', 'Fictional Watch', 'count', '2026-10-01 20:00:00 +0200', '2026-10-01 20:10:00 +0200', '500')}
 ${rec('HKQuantityTypeIdentifierStepCount', 'Fictional iPhone', 'count', '2026-07-01 23:30:00 -0700', '2026-07-01 23:40:00 -0700', '900')}
 ${rec('HKQuantityTypeIdentifierActiveEnergyBurned', 'Fictional Watch', 'Cal', '2026-10-01 09:00:00 +0200', '2026-10-01 10:00:00 +0200', '300')}
 ${rec('HKQuantityTypeIdentifierActiveEnergyBurned', 'Fictional Watch', 'kJ', '2026-10-01 18:00:00 +0200', '2026-10-01 19:00:00 +0200', '1046')}
 ${rec('HKQuantityTypeIdentifierActiveEnergyBurned', 'Fictional iPhone', 'kcal', '2026-10-01 18:00:00 +0200', '2026-10-01 19:00:00 +0200', '100')}
 ${rec('HKQuantityTypeIdentifierActiveEnergyBurned', 'Fictional iPhone', 'kWh', '2026-10-01 18:00:00 +0200', '2026-10-01 19:00:00 +0200', '1')}
 ${rec('HKQuantityTypeIdentifierBasalEnergyBurned', 'Fictional Watch', 'kcal', '2026-10-01 00:00:00 +0200', '2026-10-01 23:59:00 +0200', '1600')}
 ${rec('HKQuantityTypeIdentifierRestingHeartRate', 'Fictional Watch', 'count/min', '2026-10-01 07:00:00 +0200', '2026-10-01 07:00:00 +0200', '58')}
 ${rec('HKQuantityTypeIdentifierHeartRate', 'Fictional Watch', 'count/min', '2026-10-01 07:00:00 +0200', '2026-10-01 07:00:00 +0200', '62')}
 ${rec('HKQuantityTypeIdentifierHeartRate', 'Fictional Watch', 'count/min', '2026-10-01 12:00:00 +0200', '2026-10-01 12:00:00 +0200', '75')}
 ${rec('HKQuantityTypeIdentifierHeartRate', 'Fictional Watch', 'count/min', '2026-10-01 18:30:00 +0200', '2026-10-01 18:30:00 +0200', '110', '<MetadataEntry key="HKMetadataKeyHeartRateMotionContext" value="2"/>')}
 ${rec('HKQuantityTypeIdentifierBodyMass', 'Fictional Scale', 'kg', '2026-10-01 07:00:00 +0200', '2026-10-01 07:00:00 +0200', '70')}
 ${rec('HKQuantityTypeIdentifierBodyMass', 'Fictional Scale', 'kg', '2026-10-01 21:00:00 +0200', '2026-10-01 21:00:00 +0200', '70.4')}
 ${rec('HKQuantityTypeIdentifierBodyMass', 'Fictional Scale', 'lb', '2026-10-02 07:00:00 +0200', '2026-10-02 07:00:00 +0200', '154.3')}
 ${rec('HKQuantityTypeIdentifierBodyFatPercentage', 'Fictional Scale', '%', '2026-10-02 07:00:00 +0200', '2026-10-02 07:00:00 +0200', '0.161')}
 ${sleep('Fictional Watch', '2026-10-05 22:30:00 +0200', '2026-10-06 06:30:00 +0200', 'InBed', 'Europe/Brussels')}
 ${sleep('Fictional Watch', '2026-10-05 22:45:00 +0200', '2026-10-06 01:00:00 +0200', 'AsleepCore', 'Europe/Brussels')}
 ${sleep('Fictional Watch', '2026-10-06 01:00:00 +0200', '2026-10-06 02:00:00 +0200', 'AsleepDeep', 'Europe/Brussels')}
 ${sleep('Fictional Watch', '2026-10-06 02:00:00 +0200', '2026-10-06 03:00:00 +0200', 'AsleepREM', 'Europe/Brussels')}
 ${sleep('Fictional Watch', '2026-10-06 03:00:00 +0200', '2026-10-06 03:15:00 +0200', 'Awake', 'Europe/Brussels')}
 ${sleep('Fictional Watch', '2026-10-06 03:15:00 +0200', '2026-10-06 06:15:00 +0200', 'AsleepCore', 'Europe/Brussels')}
 ${sleep('Fictional Sleep App', '2026-10-05 23:00:00 +0200', '2026-10-06 06:00:00 +0200', 'AsleepUnspecified')}
 ${sleep('Fictional Old Phone', '2019-03-10 23:00:00 +0100', '2019-03-11 07:00:00 +0100', 'InBed')}
 ${sleep('Fictional Old Phone', '2019-03-10 23:30:00 +0100', '2019-03-11 06:30:00 +0100', 'Asleep')}
 ${sleep('Fictional Watch', '2026-10-07 23:00:00 +0200', '2026-10-08 07:00:00 +0200', 'AsleepCore')}
 <Record type="HKCategoryTypeIdentifierMindfulSession" sourceName="Fictional Watch" creationDate="2026-10-04 07:10:00 +0200" startDate="2026-10-04 07:00:00 +0200" endDate="2026-10-04 07:10:00 +0200" value="HKCategoryValueNotApplicable"/>
 <Workout workoutActivityType="HKWorkoutActivityTypeRunning" duration="30.5" durationUnit="min" sourceName="Fictional Watch" creationDate="2026-10-03 18:31:00 +0200" startDate="2026-10-03 18:00:00 +0200" endDate="2026-10-03 18:30:30 +0200">
  <WorkoutStatistics type="HKQuantityTypeIdentifierActiveEnergyBurned" startDate="2026-10-03 18:00:00 +0200" startDate="2026-10-03 18:30:30 +0200" sum="300" unit="kcal"/>
  <MetadataEntry key="HKIndoorWorkout" value="0"/>
 </Workout>
 <ActivitySummary dateComponents="2026-10-01" activeEnergyBurned="550" activeEnergyBurnedGoal="500" activeEnergyBurnedUnit="Cal"/>
</HealthData>
`;
export const FITBIT = {
  'Takeout/Google Health/Health Fitness Data_GoogleData/UserSleeps_2026-10-01.csv': `sleep_id,sleep_type,minutes_in_sleep_period,minutes_after_wake_up,minutes_to_fall_asleep,minutes_asleep,minutes_awake,minutes_longest_awakening,minutes_to_persistent_sleep,start_utc_offset,sleep_start,end_utc_offset,sleep_end,data_source
111,STAGES,480,5,12,420,48,10,15,+02:00,2026-10-04 20:30:00+0000,+02:00,2026-10-05 04:30:00+0000,PASSIVELY_MEASURED
222,CLASSIC,300,0,10,270,20,5,10,-04:00,2026-09-20 03:00:00+0000,-04:00,2026-09-20 08:00:00+0000,MANUAL
`,
  'Takeout/Google Health/Health Fitness Data_GoogleData/UserSleepStages_2026-10-01.csv': `sleep_id,sleep_stage_id,sleep_stage_type,start_utc_offset,sleep_stage_start,end_utc_offset,sleep_stage_end
111,1,LIGHT,+02:00,2026-10-04 20:42:00+0000,+02:00,2026-10-04 22:52:00+0000
111,2,DEEP,+02:00,2026-10-04 22:52:00+0000,+02:00,2026-10-05 00:12:00+0000
111,3,REM,+02:00,2026-10-05 00:12:00+0000,+02:00,2026-10-05 01:42:00+0000
111,4,LIGHT,+02:00,2026-10-05 01:42:00+0000,+02:00,2026-10-05 03:42:00+0000
111,5,AWAKE,+02:00,2026-10-05 03:42:00+0000,+02:00,2026-10-05 04:30:00+0000
`,
  'Takeout/Google Health/Physical Activity_GoogleData/steps_2026-10-01.csv': `timestamp,steps,data source
2026-10-01T06:00:00Z,500,Fictional Tracker
2026-10-01T06:00:00Z,400,Fictional Phone
2026-10-01T21:30:00Z,300,Fictional Tracker
2026-10-01T22:30:00Z,200,Fictional Tracker
`,
  'Takeout/Google Health/Physical Activity_GoogleData/daily_resting_heart_rate.csv': `timestamp,beats per minute,data source
2026-10-01T00:00:00Z,57,Fictional Tracker
2026-10-02T00:00:00Z,0,Fictional Tracker
`,
  'Takeout/Google Health/Physical Activity_GoogleData/weight.csv': `timestamp,weight grams,data source
2026-10-01T05:00:00Z,70500,Fictional Scale
`,
  'Takeout/Google Health/Physical Activity_GoogleData/heart_rate_2026-10-01.csv': `timestamp,beats per minute,data source
2026-10-01T06:00:00Z,60,Fictional Tracker
2026-10-01T06:00:05Z,64,Fictional Tracker
2026-10-01T06:00:10Z,300,Fictional Tracker
`,
  'Takeout/Google Health/Global Export Data/sleep-2026-10-04.json': '[{"logId":1,"dateOfSleep":"2026-10-05","startTime":"2026-10-04T22:30:00.000"}]',
};
const day = (iso: string) => String(Date.parse(`${iso}T00:00:00Z`));
export const SAMSUNG = {
  'Samsung Health/com.samsung.shealth.step_daily_trend.20261006090000.csv': `﻿com.samsung.shealth.step_daily_trend,6305010,3
binning_data,update_time,create_time,source_pkg_name,source_type,count,speed,distance,calorie,deviceuuid,pkg_name,datauuid,day_time,
,2026-10-02 06:00:00.000,2026-10-02 06:00:00.000,com.sec.android.app.shealth,-2,8000,1.2,6000,300,dev1,com.sec.android.app.shealth,uuid1,${day('2026-10-01')},
,2026-10-02 06:00:00.000,2026-10-02 06:00:00.000,com.sec.android.app.shealth,0,5000,1.2,4000,200,dev1,com.sec.android.app.shealth,uuid2,${day('2026-10-01')},
,2026-10-03 06:00:00.000,2026-10-03 06:00:00.000,com.sec.android.app.shealth,-2,6500,1.1,5000,250,dev1,com.sec.android.app.shealth,uuid3,${day('2026-10-02')},
`,
  'Samsung Health/com.samsung.shealth.sleep.20261006090000.csv': `com.samsung.shealth.sleep,7006003,11
com.samsung.health.sleep.start_time,com.samsung.health.sleep.end_time,com.samsung.health.sleep.time_offset,com.samsung.health.sleep.datauuid,sleep_latency,efficiency,
2026-10-04 20:45:00.000,2026-10-05 04:45:00.000,UTC+0200,sleep-a,600000,90,
`,
  'Samsung Health/com.samsung.health.sleep_stage.20261006090000.csv': `com.samsung.health.sleep_stage,7006003,6
start_time,end_time,stage,sleep_id,time_offset,
2026-10-04 20:55:00.000,2026-10-05 00:15:00.000,40002,sleep-a,UTC+0200,
2026-10-05 00:15:00.000,2026-10-05 01:45:00.000,40003,sleep-a,UTC+0200,
2026-10-05 01:45:00.000,2026-10-05 03:25:00.000,40004,sleep-a,UTC+0200,
2026-10-05 03:25:00.000,2026-10-05 04:35:00.000,40001,sleep-a,UTC+0200,
`,
  'Samsung Health/com.samsung.health.weight.20261006090000.csv': `com.samsung.health.weight,6305010,2
weight,body_fat,start_time,time_offset,datauuid,
71.2,18.5,2026-10-03 05:30:00.000,UTC+0200,w1,
`,
  'Samsung Health/com.samsung.shealth.tracker.heart_rate.20261006090000.csv': `com.samsung.shealth.tracker.heart_rate,6305010,4
com.samsung.health.heart_rate.heart_rate,com.samsung.health.heart_rate.min,com.samsung.health.heart_rate.max,com.samsung.health.heart_rate.start_time,com.samsung.health.heart_rate.time_offset,
70,65,80,2026-10-03 10:00:00.000,UTC+0200,
90,85,120,2026-10-03 18:00:00.000,UTC+0200,
`,
  'Samsung Health/jsons/com.samsung.shealth.sleep/0/abc.binning_data.json': '{}',
};
export const OURA = {
  'oura-export/App Data/sleepmodel.csv': `id;day;bedtime_start;bedtime_end;total_sleep_duration;deep_sleep_duration;rem_sleep_duration;light_sleep_duration;awake_time;latency;time_in_bed;lowest_heart_rate;average_heart_rate;type;heart_rate
a1;2026-10-05;2026-10-04T22:40:00.000+02:00;2026-10-05T06:40:00.000+02:00;25200;4800;5400;15000;3000;600;28800;52;58.5;long_sleep;{"interval":300,"items":[60,58,null]}
a2;2026-10-05;2026-10-05T14:00:00.000+02:00;2026-10-05T14:40:00.000+02:00;1800;0;0;1800;600;300;2400;60;64;late_nap;{}
a3;2026-10-06;2026-10-06T02:00:00.000+02:00;2026-10-06T02:30:00.000+02:00;0;0;0;0;1800;0;1800;;;rest;{}
`,
  'oura-export/App Data/dailyactivity.csv': `id;day;steps;active_calories;total_calories
d1;2026-10-05;9000;420;2400
`,
  'oura-export/Subscriptions/subscriptions.csv': 'id;plan\ns1;fictional\n',
};
export const LOOP = {
  'Habits.csv': `Position,Name,Type,Question,Description,FrequencyNumerator,FrequencyDenominator,Color,Unit,Target Type,Target Value,Archived?
001,Meditate,YES_NO,Did you meditate today?,,1,1,#FF8F00,,AT_LEAST,0,false
002,Run,YES_NO,,,3,7,#00897B,,AT_LEAST,0,false
003,Water,NUMERICAL,How much water?,,1,1,#039BE5,glasses,AT_LEAST,8,false
004,Old habit,YES_NO,,,1,2,#8E24AA,,AT_LEAST,0,true
`,
  '001 Meditate/Checkmarks.csv': 'Date,Value,Notes\n2026-10-05,2,\n2026-10-04,3,travel\n2026-10-03,0,\n2026-10-02,2,good\n',
  '001 Meditate/Scores.csv': 'Date,Score\n2026-10-05,0.4512\n',
  '002 Run/Checkmarks.csv': 'Date,Value,Notes\n2026-10-05,1,\n2026-10-04,2,\n',
  '003 Water/Checkmarks.csv': 'Date,Value,Notes\n2026-10-05,8000,\n2026-10-04,6500,\n',
  'Checkmarks.csv': 'Date,Meditate,Run,Water,Old habit,\n2026-10-05,2,1,8000,-1,\n',
  'Scores.csv': 'Date,Meditate,Run,Water,Old habit,\n2026-10-05,0.45,0.2,0.5,0,\n',
};
export const GARMIN = {
  'DI_CONNECT/DI-Connect-Aggregator/UDSFile_2026-09-01_2026-12-09.json': JSON.stringify([
    {calendarDate: '2026-10-01', totalSteps: 9100, restingHeartRate: 55, minHeartRate: 48, maxHeartRate: 150, activeKilocalories: 510, bmrKilocalories: 1650, wellnessStartTimeGmt: '2026-09-30T22:00:00.0', wellnessStartTimeLocal: '2026-10-01T00:00:00.0'},
    {hydration: {valueInML: 500}},
  ]),
  'DI_CONNECT/DI-Connect-Wellness/2026-09-01_2026-12-09_1_sleepData.json': JSON.stringify([
    {calendarDate: '2026-10-01', sleepStartTimestampGMT: '2026-09-30T21:10:00.0', sleepEndTimestampGMT: '2026-10-01T05:10:00.0', deepSleepSeconds: 5400, lightSleepSeconds: 16200, remSleepSeconds: 5400, awakeSleepSeconds: 1800, napList: [{napStartTimestampGMT: '2026-10-01T12:00:00.0', napEndTimestampGMT: '2026-10-01T12:30:00.0', calendarDate: '2026-10-01'}]},
  ]),
  'DI_CONNECT/DI-Connect-Wellness/1_userBioMetrics.json': JSON.stringify([{metaData: {calendarDate: '2026-10-01'}, weight: {weight: 72300, timestampGMT: '2026-10-01T05:30:00.0'}}]),
};
