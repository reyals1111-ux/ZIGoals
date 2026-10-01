import Decimal from 'decimal.js';
/**
 * Display formatting for numbers, money and dates: one module, one rule (Session G, Part 3; QA-06, QA-29).
 * - Numbers and money follow the browser's locale. Each currency keeps its own code or symbol; nothing is converted.
 * - Dates written only with digits follow the browser's locale too. A date or time with words in it (month or weekday
 *   names, AM/PM) is written in English, the app's language, with the conventions of the user's region (en-<REGION>),
 *   so names never mix languages.
 * - Form inputs are never localized, and ISO dates shown as ISO stay ISO.
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
export function formatExactNumber(value:string,locale=displayLocale(),currency?:string){
 if(!/^-?\d+(?:\.\d+)?$/.test(value))return 'Unavailable';
 const negative=value.startsWith('-'),[integer,fraction]=value.replace(/^-/,'').split('.');
 const grouped=numberFormat(locale,{maximumFractionDigits:0}).format(BigInt(integer!));
 const {decimal,digits}=digitsFor(locale);
 const number=grouped+(fraction?decimal+fraction.replace(/\d/g,d=>digits[Number(d)]!):'');
 const parts=numberFormat(locale,{...(currency?{style:'currency' as const,currency}:{}),minimumFractionDigits:0,maximumFractionDigits:0}).formatToParts(negative?-1:1);
 return parts.map(p=>p.type==='integer'?number:p.value).join('');
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

type DateInput=Date|number|string;
const DATE_FIELDS=['weekday','year','month','day'] as const,TIME_FIELDS=['dayPeriod','hour','minute','second','fractionalSecondDigits'] as const;
const dateFormatters=new Map<string,Intl.DateTimeFormat>();
function dateFormat(locale:string,options:Intl.DateTimeFormatOptions){const key=`${locale}|${JSON.stringify(options)}`;let format=dateFormatters.get(key);if(!format){format=new Intl.DateTimeFormat(locale,options);dateFormatters.set(key,format);}return format;}
const has=(options:Intl.DateTimeFormatOptions,fields:readonly (keyof Intl.DateTimeFormatOptions)[])=>!!options.dateStyle||!!options.timeStyle||fields.some(field=>options[field]!==undefined);
function written(date:DateInput,options:Intl.DateTimeFormatOptions){
 const value=date instanceof Date?date:new Date(date);
 // Date#toLocale…String writes "Invalid Date" where Intl throws; keep that.
 if(Number.isNaN(value.getTime()))return 'Invalid Date';
 const parts=dateFormat(active,options).formatToParts(value);
 const hasWords=parts.some(part=>part.type==='weekday'||part.type==='era'||part.type==='dayPeriod'||(part.type==='month'||part.type==='literal')&&/\p{L}/u.test(part.value));
 return hasWords?dateFormat(wordLocale(),options).format(value):parts.map(part=>part.value).join('');
}
/** As Date#toLocaleDateString: the date, digits in the display locale, words in English. */
export function formatDate(date:DateInput,options:Intl.DateTimeFormatOptions={}){return written(date,has(options,DATE_FIELDS)?options:{...options,year:'numeric',month:'numeric',day:'numeric'});}
/** As Date#toLocaleTimeString. */
export function formatTime(date:DateInput,options:Intl.DateTimeFormatOptions={}){return written(date,has(options,TIME_FIELDS)?options:{...options,hour:'numeric',minute:'numeric',second:'numeric'});}
/** As Date#toLocaleString. */
export function formatDateTime(date:DateInput,options:Intl.DateTimeFormatOptions={}){return written(date,has(options,DATE_FIELDS)||has(options,TIME_FIELDS)?options:{...options,year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',second:'numeric'});}
