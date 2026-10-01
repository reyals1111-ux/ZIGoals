import Decimal from 'decimal.js';
// Intl formatters are costly to build and hold no data, so each locale/option set is built once (Session G, Part 2).
const formatters=new Map<string,Intl.NumberFormat>();
function numberFormat(locale:string,options:Intl.NumberFormatOptions={}){const key=`${locale}|${JSON.stringify(options)}`;let format=formatters.get(key);if(!format){format=new Intl.NumberFormat(locale,options);formatters.set(key,format);}return format;}
const localeDigits=new Map<string,{decimal:string;digits:string[]}>();
function digitsFor(locale:string){let found=localeDigits.get(locale);if(!found){found={decimal:numberFormat(locale).formatToParts(1.1).find(p=>p.type==='decimal')?.value??'.',digits:Array.from({length:10},(_,n)=>numberFormat(locale,{useGrouping:false}).format(n))};localeDigits.set(locale,found);}return found;}
/** Presentation only. Never feed this localized string back into domain arithmetic. */
export function formatExactNumber(value:string,locale='en-US',currency?:string){
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
