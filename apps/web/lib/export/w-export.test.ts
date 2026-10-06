import {expect,test} from 'vitest';
import {HEALTH_STORAGE_KEY} from '../health';
import {DASHBOARD_SETTINGS_KEY} from '../dashboard-settings';
import {PLATFORM_KEY} from '../positions';
import {ACCOUNTS_KEY} from '../w-device-keys';
import {ACCOUNT,financeV5,healthV4,settingsV3} from '../vault/format-fixtures';
import {CSV_FILES,collectEverything} from './everything';

// Session W: "Export everything" copies the new areas as they are stored: one CSV each, nothing computed, unknown empty.
const NOW=new Date('2026-10-06T12:00:00.000Z'),APP={now:NOW,version:'0.0.0-test',commit:'abc1234',localSimulation:null};
const lines=(text:string)=>text.split('\r\n');
test('the six new CSV files follow the nine earlier ones, in this order',()=>{
 expect(CSV_FILES.slice(9)).toEqual(['sleep.csv','meditation.csv','vitals.csv','moods.csv','accounts.csv','links.csv']);
});
test('Health v4, settings v3, finance v5 and the accounts device key export row by row, each from where it is stored',()=>{
 const texts={[HEALTH_STORAGE_KEY]:JSON.stringify(healthV4()),[DASHBOARD_SETTINGS_KEY]:JSON.stringify(settingsV3()),[PLATFORM_KEY]:JSON.stringify(financeV5()),
  [ACCOUNTS_KEY]:JSON.stringify({version:1,items:[{...ACCOUNT,id:'9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',kind:'credit-card',name:'Travel card',snapshots:[],payments:[]}]})};
 const collected=collectEverything(texts,APP);
 expect(collected.unreadable).toEqual([]);expect(collected.warnings).toEqual([]);
 expect(lines(collected.csv['sleep.csv'])).toEqual(['"id","kind","start_utc","end_utc","timezone","latency_minutes","awake_minutes","awakenings","deep_minutes","rem_minutes","core_minutes","quality","tags","source","note","created_at_utc","updated_at_utc"',
  '"health_sleep-manual-fixture01","night","2026-09-06T21:30:00.000Z","2026-09-07T05:45:00.000Z","Europe/Brussels","15","","","","","","4","screens","manual","","2026-09-08T12:00:00.000Z","2026-09-08T12:00:00.000Z"']);
 expect(lines(collected.csv['meditation.csv'])[1]).toBe('"health_med-fixture-session01","2026-09-07T06:30:00.000Z","600","breathing","box","3","4","","","","Europe/Brussels","breathing","","2026-09-08T12:00:00.000Z","2026-09-08T12:00:00.000Z"');
 expect(lines(collected.csv['vitals.csv'])[1]).toBe('"health_vital-apple-health-2026-09-07","2026-09-07","apple-health","58","","","","420","","2026-09-08T12:00:00.000Z"');
 expect(lines(collected.csv['moods.csv'])).toEqual(['"date","mood","note","recorded_at_utc"','"2026-09-07","4","","2026-09-08T12:00:00.000Z"']);
 expect(lines(collected.csv['accounts.csv'])).toEqual(['"home","account_id","name","kind","currency","institution","own_rate_percent","archived_at_utc","entry","entry_id","date","value","decimals","note"',
  '"device","9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d","Travel card","credit-card","EUR","","","","","","","","",""',
  `"synced","${ACCOUNT.id}","Rainy-day savings","savings","EUR","","","","balance","0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d","2026-09-07","250000","2",""`]);
 expect(lines(collected.csv['links.csv'])).toEqual(['"id","label","url","icon","order","created_at_utc","updated_at_utc"','"5b1c2d3e-4f50-4a61-8b72-9c8d7e6f5a4b","My running club","https://example.org/club","strava","0","2026-09-08T12:00:00.000Z","2026-09-08T12:00:00.000Z"']);
 // everything.json holds the stored records as they are, the device key under its own name.
 expect(collected.json.device.accounts).toEqual(JSON.parse(texts[ACCOUNTS_KEY]!));expect(collected.json.modules.health).toEqual(healthV4());
});
test('an unreadable accounts key gives a header-only accounts.csv and says so; everything.json still names it',()=>{
 const collected=collectEverything({[ACCOUNTS_KEY]:JSON.stringify({version:1,items:[{id:'x'}]})},APP);
 expect(lines(collected.csv['accounts.csv'])).toHaveLength(1);
 expect(collected.warnings).toEqual(['Your accounts records did not read as expected, so their CSV files hold the header only; everything.json still holds them as stored.']);
});
