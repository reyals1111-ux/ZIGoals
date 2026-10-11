/**
 * Session U Part 3: a food lookup answered 429 carries the food Worker's wait in seconds (the body's `retryAfter`, and
 * `Retry-After`; app/api/food-lookup/route.ts). The scanner disables its lookup for exactly that long and never retries
 * by itself. Anything unreadable waits 60 s, the Worker's own back-off.
 */
export const DEFAULT_FOOD_WAIT_S=60;
export function foodRetryAfterSeconds(body:unknown,header:string|null):number{
 const fromBody=body!==null&&typeof body==='object'?(body as {retryAfter?:unknown}).retryAfter:undefined;
 if(typeof fromBody==='number'&&Number.isSafeInteger(fromBody)&&fromBody>0&&fromBody<=86400)return fromBody;
 const text=header?.trim()??'';
 if(/^\d{1,5}$/.test(text)){const seconds=Number(text);if(seconds>0&&seconds<=86400)return seconds;}
 return DEFAULT_FOOD_WAIT_S;
}
/** "45 s" under a minute, then whole minutes rounded up: calm, never a running clock of milliseconds. */
export function foodWaitLabel(seconds:number):string{return seconds<60?`${Math.max(1,Math.ceil(seconds))} s`:`${Math.ceil(seconds/60)} min`;}
/** When this tab may look up again. Kept for the page's lifetime, so closing and reopening the panel does not reset it. */
let lookupAvailableAt=0;
export function foodLookupAvailableAt(){return lookupAvailableAt;}
export function holdFoodLookup(until:number){lookupAvailableAt=Math.max(lookupAvailableAt,until);}
