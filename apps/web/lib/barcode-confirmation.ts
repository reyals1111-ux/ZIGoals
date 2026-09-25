import {normalizeBarcode} from './food-lookup';

/** Require adjacent successful product-code frames; an unreadable frame resets confirmation. */
export function createBarcodeConfirmation(){
 let previous='';
 return (raw:string):string|null=>{
  let candidate='';try{if(raw)candidate=normalizeBarcode(raw);}catch{candidate='';}
  if(candidate&&candidate===previous)return candidate;
  previous=candidate;return null;
 };
}
