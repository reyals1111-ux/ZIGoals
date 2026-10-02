/**
 * Answers that make a remembered device stale (ADR-008). The messages are the ones shown before; the type only lets the
 * vault provider tell these apart without matching text, and forget this device's remembered material.
 * - StaleDeviceError: the account was deleted (410), the vault changed (key rotation elsewhere), or a cloud section was
 *   deleted on another device.
 * - An access denial noted by the sync transport just before it locks the account with 'access-changed': the server
 *   code says whether the session itself is gone (revoked, another account) or the access token simply expired.
 */
export type StaleReason='account-deleted'|'vault-changed'|'section-deleted';
export class StaleDeviceError extends Error{
 constructor(readonly reason:StaleReason,message:string){super(message);this.name='StaleDeviceError';}
}
let denial:{account:string;code:string}|null=null;
export function noteAccessDenial(account:string,code:unknown){denial={account:account.toLowerCase(),code:typeof code==='string'?code:'UNKNOWN'};}
/** The denial noted for this account since the last call, if any; it is read once. */
export function takeAccessDenial(account:string|null):string|null{const noted=denial;denial=null;return noted&&account&&noted.account===account.toLowerCase()?noted.code:null;}
/** A routine expiry (SIGN_IN_REQUIRED) keeps the device remembered: the session and its id outlive a token refresh. */
export const deniesDevice=(code:string|null)=>code==='SESSION_REVOKED'||code==='ACCOUNT_CHANGED'||code==='ACCOUNT_DELETED';
