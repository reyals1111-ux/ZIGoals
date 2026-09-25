import {ZodError} from 'zod';
import {ProviderValidationError} from '../provider-validation';
/** Closed, sanitized vocabulary. Never retain a cause, URL, headers or response body. */
export type ProviderFailureCategory = 'THROTTLED'|'UPSTREAM_5XX'|'TIMEOUT'|'NETWORK'|'AUTHENTICATION'|'ENTITLEMENT'|'MALFORMED'|'UNSUPPORTED'|'LOCAL_BUDGET'|'LOCAL_QUEUE'|'UNKNOWN';
export class ProviderFailure extends Error {
 constructor(readonly category:ProviderFailureCategory){super('CoinGecko market data unavailable.');this.name='ProviderFailure';}
}
export function providerHttpFailure(status:number):ProviderFailure {
 // A generic 403 (including edge policy denial) proves neither credentials nor entitlement.
 return new ProviderFailure(status===429?'THROTTLED':status>=500&&status<=599?'UPSTREAM_5XX':status===401?'AUTHENTICATION':'UNKNOWN');
}
export function sanitizeProviderFailure(error:unknown):ProviderFailure {
 return new ProviderFailure(error instanceof ProviderFailure?error.category:'UNKNOWN');
}
export function parseProviderEvidence<T>(parse:()=>T):T {
 try{return parse();}catch(error){throw new ProviderFailure(error instanceof ProviderValidationError||error instanceof ZodError?'MALFORMED':'UNKNOWN');}
}
