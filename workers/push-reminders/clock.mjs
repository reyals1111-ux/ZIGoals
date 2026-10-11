/**
 * Zone arithmetic for reminder schedules (ADR-010): a schedule is "HH:MM" in an IANA zone on a weekday mask
 * (Monday = 1 … Sunday = 64); the alarm needs its next instant and the quiet window needs the zone's wall clock.
 * Intl.DateTimeFormat is the only zone source, as in the app.
 */
export const TIME=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
const WEEKDAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
/** @type {Map<string,Intl.DateTimeFormat>} */
const formatters=new Map();
/** @param {string} zone */
function formatter(zone){let f=formatters.get(zone);if(!f){f=new Intl.DateTimeFormat('en-US',{timeZone:zone,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',weekday:'short'});formatters.set(zone,f);}return f;}
/** An IANA zone name this runtime knows. @param {unknown} zone */
export function zoneSupported(zone){if(typeof zone!=='string'||!zone||zone.length>100||!/^[A-Za-z0-9_+\-/]+$/.test(zone))return false;try{formatter(zone);return true;}catch{return false;}}
/** The zone's wall clock at an instant. @param {number} ms @param {string} zone */
export function wallClock(ms,zone){
 /** @type {Record<string,string>} */const parts={};
 for(const part of formatter(zone).formatToParts(new Date(ms)))if(part.type!=='literal')parts[part.type]=part.value;
 const hour=Number(parts.hour)%24,minute=Number(parts.minute),second=Number(parts.second);
 return {year:Number(parts.year),month:Number(parts.month),day:Number(parts.day),hour,minute,second,weekday:WEEKDAYS.indexOf(parts.weekday??''),date:`${parts.year}-${parts.month}-${parts.day}`,time:`${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`};
}
/** The zone's offset at an instant, in minutes east of UTC. @param {number} ms @param {string} zone */
function offsetMinutes(ms,zone){const w=wallClock(ms,zone);return Math.round((Date.UTC(w.year,w.month-1,w.day,w.hour,w.minute,w.second)-ms)/60000);}
/**
 * The instant of a wall-clock date and time in the zone. A time skipped by a forward clock change moves an hour
 * later; a time repeated by a backward change takes its later occurrence.
 * @param {string} date "YYYY-MM-DD" @param {string} time "HH:MM" @param {string} zone
 */
export function zonedInstant(date,time,zone){
 const ymd=date.split('-'),hm=time.split(':'),y=Number(ymd[0]),m=Number(ymd[1]),d=Number(ymd[2]),hh=Number(hm[0]),mm=Number(hm[1]);
 const guess=Date.UTC(y,m-1,d,hh,mm),first=offsetMinutes(guess,zone),candidate=guess-first*60000,second=offsetMinutes(candidate,zone);
 if(second===first)return candidate;
 const alternative=guess-second*60000;
 return offsetMinutes(alternative,zone)===second?alternative:Math.max(candidate,alternative);
}
/** The mask bit of a weekday (0 = Sunday … 6 = Saturday): Monday = 1, Tuesday = 2 … Sunday = 64. @param {number} weekday */
export const weekdayBit=weekday=>1<<((weekday+6)%7);
/** The next instant at or after `from` when a schedule is due, or null when its mask names no weekday. @param {{time:string,zone:string,weekdays:number}} schedule @param {number} from */
export function nextDue(schedule,from){
 const start=wallClock(from,schedule.zone),base=Date.UTC(start.year,start.month-1,start.day);
 for(let n=0;n<8;n++){const day=new Date(base+n*86400000);if(!(schedule.weekdays&weekdayBit(day.getUTCDay())))continue;const instant=zonedInstant(day.toISOString().slice(0,10),schedule.time,schedule.zone);if(instant>=from)return instant;}
 return null;
}
/** Whether "HH:MM" lies in the quiet window [from, to), which may wrap midnight; from = to means no window. @param {string} time @param {string} from @param {string} to */
export function inQuietWindow(time,from,to){if(from===to)return false;return from<to?time>=from&&time<to:time>=from||time<to;}
