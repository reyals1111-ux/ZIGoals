import Decimal from 'decimal.js';
/** Presentation only. Never feed this localized string back into domain arithmetic. */
export function formatExactNumber(value:string,locale='en-US',currency?:string){
 if(!/^-?\d+(?:\.\d+)?$/.test(value))return 'Unavailable';
 const negative=value.startsWith('-'),[integer,fraction]=value.replace(/^-/,'').split('.');
 const grouped=new Intl.NumberFormat(locale,{maximumFractionDigits:0}).format(BigInt(integer!));
 const decimal=new Intl.NumberFormat(locale).formatToParts(1.1).find(p=>p.type==='decimal')?.value??'.';
 const digits=Array.from({length:10},(_,n)=>new Intl.NumberFormat(locale,{useGrouping:false}).format(n));
 const number=grouped+(fraction?decimal+fraction.replace(/\d/g,d=>digits[Number(d)]!):'');
 const parts=new Intl.NumberFormat(locale,{...(currency?{style:'currency' as const,currency}:{}),minimumFractionDigits:0,maximumFractionDigits:0}).formatToParts(negative?-1:1);
 return parts.map(p=>p.type==='integer'?number:p.value).join('');
}
export function progressPresentation(value:number|string|null|undefined,complete?:boolean){
 if(value===null||value===undefined||value===''||typeof value==='string'&&!/^\d+(?:\.\d+)?$/.test(value))return null;
 const exact=new Decimal(value);if(!exact.isFinite()||exact.isNegative())return null;
 const attained=complete??exact.gte(100),arc=Decimal.min(exact,100).toNumber();
 return {exact:exact.toFixed(),arc,label:Decimal.min(exact.toDecimalPlaces(0,Decimal.ROUND_HALF_UP),attained?100:99).toFixed()};
}
