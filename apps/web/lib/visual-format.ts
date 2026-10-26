import Decimal from 'decimal.js';
/**
 * Display formatting for numbers, money and dates: one module, one rule (Session G, Part 3; QA-06, QA-29).
 * - Numbers and money follow the browser's locale. Each currency keeps its own code or symbol; nothing is converted.
 * - Dates written only with digits follow the browser's locale too. A date or time with words in it (month or weekday
 *   names, AM/PM) is written in English, the app's language, with the conventions of the user's region (en-<REGION>),
 *   so names never mix languages.
 * - Form inputs are never localized. ISO dates are for exports and machine fields only (Session AD item 8).
 * Hydration: the server cannot know the browser's locale, so the server render and hydration always use en-US. Right
 * after hydration, the Shell (useDisplayLocaleKey) switches to the browser's locale in a layout effect and remounts the
 * page content once, before the first paint and while the workspace is still hidden, so every figure is written in
 * one locale and nothing mismatches. en-US never remounts, so it renders exactly as before. The switch must stay a
 * layout effect: Suspense boundaries in a page hydrate after the root commit, and the remount replaces them first.
 */
export const DEFAULT_DISPLAY_LOCALE='en-US';
let active=DEFAULT_DISPLAY_LOCALE,words:string|undefined;
/** The locale numbers, money and digit-only dates are written in. en-US on the server and until hydration ends. */
export function displayLocale(){return active;}
/** Only the Shell's hydration switch (and tests) set this. */
export function setDisplayLocale(locale:string){active=locale;words=undefined;}
/** The first browser language this runtime supports, as resolved by Intl; a bare "en" counts as en-US. */
export function resolveDisplayLocale(languages:readonly string[]|undefined):string{
 for(const tag of languages??[]){
  try{const [supported]=Intl.NumberFormat.supportedLocalesOf([tag]);if(!supported)continue;const resolved=new Intl.NumberFormat(supported).resolvedOptions().locale;return resolved==='en'?DEFAULT_DISPLAY_LOCALE:resolved;}catch{/* an invalid tag is skipped */}
 }
 return DEFAULT_DISPLAY_LOCALE;
}
/** English for the user's region (en-GB, en-DE, en-IN…), for dates and times that contain words. */
export function wordLocale(){
 if(words)return words;
 let found=DEFAULT_DISPLAY_LOCALE;
 try{const region=new Intl.Locale(active).maximize().region;if(region){const resolved=new Intl.DateTimeFormat(`en-${region}`).resolvedOptions().locale;if(resolved.startsWith('en-'))found=resolved;}}catch{/* en-US */}
 return words=found;
}
// Intl formatters are costly to build and hold no data, so each locale/option set is built once (Session G, Part 2).
const formatters=new Map<string,Intl.NumberFormat>();
function numberFormat(locale:string,options:Intl.NumberFormatOptions={}){const key=`${locale}|${JSON.stringify(options)}`;let format=formatters.get(key);if(!format){format=new Intl.NumberFormat(locale,options);formatters.set(key,format);}return format;}
const localeDigits=new Map<string,{decimal:string;digits:string[]}>();
function digitsFor(locale:string){let found=localeDigits.get(locale);if(!found){found={decimal:numberFormat(locale).formatToParts(1.1).find(p=>p.type==='decimal')?.value??'.',digits:Array.from({length:10},(_,n)=>numberFormat(locale,{useGrouping:false}).format(n))};localeDigits.set(locale,found);}return found;}
/** Presentation only. Never feed this localized string back into domain arithmetic. */
// Session M (QA2-08): Wealth formats a few thousand amounts while it loads. What depends only on the locale and the
// currency (its minor digits; where the number, the sign and the symbol go) is worked out once; every output is unchanged.
const groupers=new Map<string,Intl.NumberFormat>(),shapes=new Map<string,Intl.NumberFormatPart[]>();
export function formatExactNumber(value:string,locale=displayLocale(),currency?:string){
 if(!/^-?\d+(?:\.\d+)?$/.test(value))return 'Unavailable';
 const negative=value.startsWith('-'),[integer,fraction]=value.replace(/^-/,'').split('.');
 let grouper=groupers.get(locale);if(!grouper){grouper=numberFormat(locale,{maximumFractionDigits:0});groupers.set(locale,grouper);}
 const grouped=grouper.format(BigInt(integer!));
 const {decimal,digits}=digitsFor(locale);
 const number=grouped+(fraction?decimal+fraction.replace(/\d/g,d=>digits[Number(d)]!):'');
 const shape=`${locale}|${currency??''}|${negative?'-':'+'}`;let parts=shapes.get(shape);
 if(!parts){parts=numberFormat(locale,{...(currency?{style:'currency' as const,currency}:{}),minimumFractionDigits:0,maximumFractionDigits:0}).formatToParts(negative?-1:1);shapes.set(shape,parts);}
 return parts.map(p=>p.type==='integer'?number:p.value).join('');
}
/**
 * Money (Session I, Part 5): one formatter, so every amount of money shows its currency's minor digits (2 for USD and
 * EUR, 0 for JPY, 3 for KWD), written in the display locale. Digits beyond them are cut toward −∞ (Session M, QA2-03):
 * a balance never reads higher than it is, and a loss never reads smaller (−12.349 shows −12.35). Quantities (ZIG,
 * BTC…) and chain amounts are not money and keep their own formatting.
 */
let isoCurrencies: Set<string> | undefined;
/** True for an ISO 4217 currency this runtime knows, except the X codes (metals, test and accounting units). */
export function isMoneyCurrency(code:string){
 if(!/^[A-Z]{3}$/.test(code)||code.startsWith('X'))return false;
 if(!isoCurrencies){try{isoCurrencies=new Set(Intl.supportedValuesOf('currency'));}catch{isoCurrencies=new Set(['USD','EUR']);}}
 return isoCurrencies.has(code);
}
/** The currency's minor digits, or null when the code is not money. */
const minorDigits=new Map<string,number|null>();
export function currencyDigits(code:string):number|null{
 let digits=minorDigits.get(code);
 if(digits===undefined){digits=isMoneyCurrency(code)?numberFormat(DEFAULT_DISPLAY_LOCALE,{style:'currency',currency:code}).resolvedOptions().maximumFractionDigits??2:null;if(/^[A-Z]{3}$/.test(code))minorDigits.set(code,digits);}
 return digits;
}
const DECIMAL=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
/**
 * An amount of money with exactly its currency's minor digits: "$9,000.00", "9.000,00 €" (de-DE), "¥9,000". `code`
 * writes "9,000.00 GBP" instead of the symbol, as the app does for currencies other than USD and EUR.
 */
export function formatMoney(value:string,currency:string,locale=displayLocale(),{display='symbol'}:{display?:'symbol'|'code'}={}){
 const digits=currencyDigits(currency);
 if(digits===null||!DECIMAL.test(value))return 'Unavailable';
 const amount=new Decimal(value);if(!amount.isFinite())return 'Unavailable';
 const fixed=amount.toDecimalPlaces(digits,Decimal.ROUND_FLOOR).toFixed(digits),signed=fixed.startsWith('-')&&/^-0(?:\.0*)?$/.test(fixed)?fixed.slice(1):fixed;
 return display==='code'?`${formatExactNumber(signed,locale)} ${currency}`:formatExactNumber(signed,locale,currency);
}
/**
 * The size of a signed money amount, for interfaces that write the sign themselves (QA2-03): the unsigned decimal at the
 * currency's minor digits, a loss cut away from zero so that it never reads smaller than it is, a gain cut toward zero
 * as formatMoney does. Not money (ZIG, BTC…), or not a decimal: the value without its sign, unchanged.
 */
export function moneyMagnitude(value:string,currency:string){
 const digits=currencyDigits(currency),unsigned=value.replace(/^[+-]/,'');
 if(digits===null||!DECIMAL.test(value))return unsigned;
 const amount=new Decimal(value);if(!amount.isFinite())return unsigned;
 return amount.toDecimalPlaces(digits,Decimal.ROUND_FLOOR).abs().toFixed(digits);
}
/** A signed amount of money with its sign written first ("−$12.35", "+$8.00"), as Portfolio writes a result. */
export function formatSignedMoney(value:string,currency:string,locale=displayLocale(),{plus='+',minus='−'}:{plus?:string;minus?:string}={}){
 const negative=value.startsWith('-');
 return `${negative?minus:plus}${formatMoney(moneyMagnitude(value,currency),currency,locale)}`;
}
/**
 * A market price: at least the currency's minor digits, and below one unit enough further digits for four significant
 * ones (up to 8 decimals), so "$0.0043" never reads as "$0.00". Cut, never rounded up.
 */
export function formatPrice(value:string,currency:string,locale=displayLocale()){
 const digits=currencyDigits(currency);
 if(digits===null||!DECIMAL.test(value))return 'Unavailable';
 const amount=new Decimal(value);if(!amount.isFinite())return 'Unavailable';
 const small=amount.abs().lt(1)&&!amount.isZero()?Math.min(8,Math.max(digits,-Math.floor(Math.log10(amount.abs().toNumber()))+3)):digits;
 // Extra digits only as far as they say something: "0.0043", not "0.004300"; the minor digits always stay.
 let fixed=amount.toDecimalPlaces(small,Decimal.ROUND_DOWN).toFixed(small);
 while(small>digits&&fixed.endsWith('0')&&fixed.split('.')[1]!.length>digits)fixed=fixed.slice(0,-1);
 return formatExactNumber(fixed,locale,currency);
}
/**
 * Session AH Part 4 (TR4/B2, M17): a quantity of something that is not money (BTC, ZIG, a share count) in a list or a
 * card: at most `maxDecimals` decimals (8), cut toward zero, trailing zeros dropped, and "≈ " in front when digits were
 * cut, so a 23-digit amount never fills a row. Detail views keep formatExactNumber.
 */
export function formatQuantity(value:string,maxDecimals=8,locale=displayLocale()){
 if(!/^-?\d+(?:\.\d+)?$/.test(value))return 'Unavailable';
 const [integer,fraction='']=value.split('.'),kept=fraction.slice(0,maxDecimals).replace(/0+$/,''),cut=/[1-9]/.test(fraction.slice(maxDecimals));
 const text=kept?`${integer}.${kept}`:integer!;
 return `${cut?'≈ ':''}${formatExactNumber(text==='-0'?'0':text,locale)}`;
}
export function progressPresentation(value:number|string|null|undefined,complete?:boolean){
 if(value===null||value===undefined||value===''||typeof value==='string'&&!/^\d+(?:\.\d+)?$/.test(value))return null;
 const exact=new Decimal(value);if(!exact.isFinite()||exact.isNegative())return null;
 const attained=complete??exact.gte(100),arc=Decimal.min(exact,100).toNumber();
 return {exact:exact.toFixed(),arc,label:Decimal.min(exact.toDecimalPlaces(0,Decimal.ROUND_HALF_UP),attained?100:99).toFixed()};
}
/** A number, as Number#toLocaleString would write it in the display locale. */
export function formatNumber(value:number|bigint,options?:Intl.NumberFormatOptions){return numberFormat(active,options).format(value);}
/** A plain decimal text written without grouping today ("1234.5 ZIG"): the locale's decimal sign and digits, still ungrouped. */
export function formatPlainDecimal(text:string){
 if(active===DEFAULT_DISPLAY_LOCALE||!/^-?\d+(?:\.\d+)?$/.test(text))return text;
 const {decimal,digits}=digitsFor(active);
 return text.replace(/\d/g,d=>digits[Number(d)]!).replace('.',decimal);
}
/** True when the display locale groups thousands with a dot ("1.234" means one thousand there). */
export function displayGroupsWithDot(){return numberFormat(active).formatToParts(1234567).some(part=>part.type==='group'&&part.value==='.');}

/**
 * Dates and times (Session AD item 8, ADR-026): one style on every page. A date is the medium date, day + short month +
 * year in the order of the user's region ("17 Oct 2026" en-GB, "Oct 17, 2026" en-US); a time follows the locale's hour
 * cycle ("14:05" en-GB, "2:05 PM" en-US); a date-time is both. A day key ("2026-10-17") is that calendar day wherever the
 * reader is, never moved by a zone. ISO stays in exports and machine fields only. Pages call these, never
 * Date#toLocale…String or Intl.DateTimeFormat (lib/date-format-guard.test.ts).
 */
export type DateInput=Date|number|string;
/** weekday adds the short weekday ("Thu, 1 Oct 2026"); year: false leaves the year out where a page means this year. */
export type DateOptions={weekday?:boolean;year?:boolean;timeZone?:string};
export type TimeOptions={seconds?:boolean;timeZone?:string};
const DAY_KEY=/^\d{4}-\d{2}-\d{2}$/,MONTH_KEY=/^\d{4}-\d{2}$/;
const dateFormatters=new Map<string,Intl.DateTimeFormat>();
function dateFormat(locale:string,options:Intl.DateTimeFormatOptions){const key=`${locale}|${JSON.stringify(options)}`;let format=dateFormatters.get(key);if(!format){format=new Intl.DateTimeFormat(locale,options);dateFormatters.set(key,format);}return format;}
// Session Y Part 9 (QA2-08's leftover): a page writes the same dates many times (Wealth's 200 rows); the strings are kept
// per locale, options and instant, at most WRITTEN_KEPT of them (the oldest half goes when full). Output is unchanged.
const WRITTEN_KEPT=2000,writtenCache=new Map<string,string>();
function written(date:DateInput,options:Intl.DateTimeFormatOptions){
 // A day key (or a month key) is written at its UTC noon, in UTC, so no zone moves it to another day.
 const calendarKey=typeof date==='string'&&(DAY_KEY.test(date)||MONTH_KEY.test(date));
 const value=calendarKey?new Date(`${MONTH_KEY.test(date as string)?`${date}-15`:date}T12:00:00Z`):date instanceof Date?date:new Date(date);
 if(calendarKey)options={...options,timeZone:'UTC'};
 // Date#toLocale…String writes "Invalid Date" where Intl throws; keep that.
 if(Number.isNaN(value.getTime()))return 'Invalid Date';
 const key=`${active}|${wordLocale()}|${JSON.stringify(options)}|${value.getTime()}`,kept=writtenCache.get(key);if(kept!==undefined)return kept;
 const parts=dateFormat(active,options).formatToParts(value);
 const hasWords=parts.some(part=>part.type==='weekday'||part.type==='era'||part.type==='dayPeriod'||(part.type==='month'||part.type==='literal')&&/\p{L}/u.test(part.value));
 const text=hasWords?dateFormat(wordLocale(),options).format(value):parts.map(part=>part.value).join('');
 if(writtenCache.size>=WRITTEN_KEPT)for(const old of [...writtenCache.keys()].slice(0,WRITTEN_KEPT/2))writtenCache.delete(old);
 writtenCache.set(key,text);return text;
}
const zoned=(timeZone?:string):Intl.DateTimeFormatOptions=>timeZone?{timeZone}:{};
const dateFields=({weekday,year}:DateOptions):Intl.DateTimeFormatOptions=>({...(weekday?{weekday:'short'}:{}),day:'numeric',month:'short',...(year===false?{}:{year:'numeric'})});
// A 24-hour clock writes the hour with two digits ("09:05"), a 12-hour one without ("9:05 AM"), as each locale does.
const twentyFour=()=>/^h2[34]$/.test(dateFormat(active,{hour:'numeric'}).resolvedOptions().hourCycle??'');
const timeFields=({seconds}:TimeOptions):Intl.DateTimeFormatOptions=>({hour:twentyFour()?'2-digit':'numeric',minute:'2-digit',...(seconds?{second:'2-digit'}:{})});
/** The medium date: "17 Oct 2026" (en-GB), "Oct 17, 2026" (en-US). */
export function formatDate(date:DateInput,options:DateOptions={}){return written(date,{...dateFields(options),...zoned(options.timeZone)});}
/** A time in the locale's hour cycle: "14:05" (en-GB), "2:05 PM" (en-US). */
export function formatTime(date:DateInput,options:TimeOptions={}){return written(date,{...timeFields(options),...zoned(options.timeZone)});}
/** A wall-clock time kept as "HH:MM" (a bedtime, quiet hours, a reminder) in the locale's hour cycle: "22:30", "10:30 PM". */
export function formatClock(clock:string){
 const m=/^(\d{2}):(\d{2})$/.exec(clock);
 return m&&Number(m[1])<24&&Number(m[2])<60?formatTime(Date.UTC(2000,0,1,Number(m[1]),Number(m[2])),{timeZone:'UTC'}):clock;
}
/** The medium date and the time: "17 Oct 2026, 14:05" (en-GB), "Oct 17, 2026, 2:05 PM" (en-US). */
export function formatDateTime(date:DateInput,options:DateOptions&TimeOptions={}){return written(date,{...dateFields(options),...timeFields(options),...zoned(options.timeZone)});}
/** A month and its year, for calendar headings: "Oct 2026" ("Oct" with year: false, a date tile's label). Takes a month key ("2026-10") too. */
export function formatMonth(date:DateInput,{year,timeZone}:{year?:boolean;timeZone?:string}={}){return written(date,{month:'short',...(year===false?{}:{year:'numeric'}),...zoned(timeZone)});}
/** The short weekday alone, for chart columns and week strips: "Thu". */
export function formatWeekday(date:DateInput,{timeZone}:{timeZone?:string}={}){return written(date,{weekday:'short',...zoned(timeZone)});}
/** The calendar day ("2026-10-17") an instant falls on in the zone (the device's by default); a day key is itself. */
export function calendarDay(date:DateInput,timeZone?:string){
 if(typeof date==='string'&&DAY_KEY.test(date))return date;
 const value=date instanceof Date?date:new Date(date);if(Number.isNaN(value.getTime()))return '';
 const parts=dateFormat('en-US',{year:'numeric',month:'2-digit',day:'2-digit',...zoned(timeZone)}).formatToParts(value),get=(type:string)=>parts.find(part=>part.type===type)?.value??'';
 return `${get('year')}-${get('month')}-${get('day')}`;
}
/**
 * "Today", "Yesterday" or "Tomorrow" when the date falls on that calendar day as seen at `now` (in `timeZone`, the
 * device's by default), else the medium date. Pages pass the `now` they render with, so the server and browser agree.
 */
export function formatRelativeDay(date:DateInput,now:DateInput,options:DateOptions={}){
 const day=calendarDay(date,options.timeZone),today=calendarDay(now,options.timeZone);
 if(day&&today){const apart=Math.round((Date.parse(`${day}T12:00:00Z`)-Date.parse(`${today}T12:00:00Z`))/86_400_000);if(apart===0)return 'Today';if(apart===-1)return 'Yesterday';if(apart===1)return 'Tomorrow';}
 return formatDate(date,options);
}
