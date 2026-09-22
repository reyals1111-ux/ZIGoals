import {ProviderValidationError} from './provider-validation';
/** Small bounded JSON reader: numeric values remain original lexemes, duplicate keys fail closed. */
export class JsonNumber {constructor(readonly lexeme:string){}}
export function exactMarketJson(text:string,maxLength=1024*1024,maxNodes=100000):unknown{
 if(text.length>maxLength)throw new ProviderValidationError('Quote response too large.');let at=0,nodes=0;
 const whitespace=()=>{while(/[\x20\t\r\n]/.test(text[at]??'!'))at++;};
 const string=():string=>{const start=at++;while(at<text.length){const c=text[at++]!;if(c==='"'){try{return JSON.parse(text.slice(start,at)) as string;}catch(error){if(error instanceof SyntaxError)throw new ProviderValidationError('Invalid JSON string.');throw error;}}if(c==='\\')at++;}throw new ProviderValidationError('Invalid JSON string.');};
 const value=(depth:number):unknown=>{whitespace();if(depth>20||++nodes>maxNodes)throw new ProviderValidationError('Quote response too complex.');const c=text[at];
  if(c==='"')return string();
  if(c==='{'){at++;const result:Record<string,unknown>=Object.create(null);whitespace();if(text[at]==='}'){at++;return result;}while(true){whitespace();if(text[at]!=='"')throw new ProviderValidationError('Invalid JSON key.');const key=string();if(Object.hasOwn(result,key))throw new ProviderValidationError('Duplicate JSON member.');whitespace();if(text[at++]!==':')throw new ProviderValidationError('Invalid JSON object.');result[key]=value(depth+1);whitespace();const separator=text[at++];if(separator==='}')return result;if(separator!==',')throw new ProviderValidationError('Invalid JSON object.');}}
  if(c==='['){at++;const result:unknown[]=[];whitespace();if(text[at]===']'){at++;return result;}while(true){result.push(value(depth+1));whitespace();const separator=text[at++];if(separator===']')return result;if(separator!==',')throw new ProviderValidationError('Invalid JSON array.');}}
  for(const [token,result] of [['true',true],['false',false],['null',null]] as const)if(text.startsWith(token,at)){at+=token.length;return result;}
  const number=text.slice(at).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);if(!number)throw new ProviderValidationError('Invalid JSON value.');at+=number[0].length;return new JsonNumber(number[0]);
 };
 const result=value(0);whitespace();if(at!==text.length)throw new ProviderValidationError('Invalid trailing JSON.');return result;
}
export function decimalLexeme(value:unknown):{price:string;priceDecimals:number}{
 if(!(value instanceof JsonNumber)||value.lexeme.startsWith('-'))throw new ProviderValidationError('Invalid market price.');
 const [mantissa,exponent='0']=value.lexeme.toLowerCase().split('e'),[whole,fraction='']=mantissa!.split('.');const exp=Number(exponent);if(!Number.isSafeInteger(exp)||Math.abs(exp)>100)throw new ProviderValidationError('Unsupported price precision.');
 let priceDecimals=fraction.length-exp;let price=(whole!+fraction).replace(/^0+/,'')||'0';if(priceDecimals<0){price+='0'.repeat(-priceDecimals);priceDecimals=0;}
 while(priceDecimals>0&&price.endsWith('0')){price=price.slice(0,-1);priceDecimals--;}
 if(!/^[1-9]\d{0,77}$/.test(price)||priceDecimals>30)throw new ProviderValidationError('Unsupported price precision.');return {price,priceDecimals};
}
