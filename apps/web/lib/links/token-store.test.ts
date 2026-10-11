import 'fake-indexeddb/auto';
import {afterEach,expect,test} from 'vitest';
import {LINK_TOKENS_DATABASE,SHOWCASE_LINK_SCOPE,forgetLinkTokens,forgetTokens,hasTokens,linkedScopes,readTokens,sealTokens} from './token-store';
import {forgetAiAccount} from '../ai/account';

// Session W ([TIER 3] (tokens)): a linked service's tokens are sealed like ZIGi's keys; nothing readable is stored.
const ACCOUNT='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',TOKENS={accessToken:'FAKE-ACCESS-1111',refreshToken:'FAKE-REFRESH-2222',expiresAt:'2026-10-06T13:00:00.000Z'};
const listed=async()=>(await indexedDB.databases()).some(db=>db.name===LINK_TOKENS_DATABASE);
async function rawRecords():Promise<unknown[]>{
 return new Promise((resolve,reject)=>{const open=indexedDB.open(LINK_TOKENS_DATABASE,1);open.onsuccess=()=>{const db=open.result;const r=db.transaction('tokens','readonly').objectStore('tokens').getAll();r.onsuccess=()=>{db.close();resolve(r.result);};r.onerror=()=>reject(r.error);};open.onerror=()=>reject(open.error);});
}
afterEach(async()=>{await new Promise<void>(resolve=>{const r=indexedDB.deleteDatabase(LINK_TOKENS_DATABASE);r.onsuccess=r.onerror=r.onblocked=()=>resolve();});});

test('reading on a browser that never linked anything creates nothing',async()=>{
 expect(await readTokens('local','spotify')).toBeNull();expect(await hasTokens('local','spotify')).toBe(false);expect(await linkedScopes()).toEqual([]);
 expect(await listed()).toBe(false);
});
test('tokens round-trip, are sealed on disk, bound to their scope and service, and forgotten per service or per scope',async()=>{
 await sealTokens('local','spotify',TOKENS);await sealTokens(ACCOUNT,'oura',{accessToken:'FAKE-OURA-3333'});
 expect(await readTokens('local','spotify')).toEqual(TOKENS);expect(await readTokens(ACCOUNT,'oura')).toEqual({accessToken:'FAKE-OURA-3333'});
 expect(await readTokens('local','oura')).toBeNull();expect(await readTokens(ACCOUNT,'spotify')).toBeNull();
 expect((await linkedScopes()).sort()).toEqual([ACCOUNT,'local']);
 const disk=JSON.stringify(await rawRecords());expect(disk).not.toContain('FAKE-');expect(disk).toMatch(/"ciphertext"/);
 // A rotated refresh token replaces the old one.
 await sealTokens('local','spotify',{...TOKENS,refreshToken:'FAKE-REFRESH-ROTATED'});expect((await readTokens('local','spotify'))!.refreshToken).toBe('FAKE-REFRESH-ROTATED');
 await forgetTokens('local','spotify');expect(await hasTokens('local','spotify')).toBe(false);expect(await hasTokens(ACCOUNT,'oura')).toBe(true);
 await forgetLinkTokens(ACCOUNT);expect(await hasTokens(ACCOUNT,'oura')).toBe(false);
});
test('Showcase never links anything; invalid tokens are refused before anything is stored',async()=>{
 await expect(sealTokens(SHOWCASE_LINK_SCOPE,'spotify',TOKENS)).rejects.toThrow('Showcase');
 await expect(sealTokens('local','spotify',{accessToken:''})).rejects.toThrow();
 expect(await listed()).toBe(false);
});
test('erasing an account on this device forgets its linked services with ZIGi\'s keys and chats',async()=>{
 await sealTokens(ACCOUNT,'strava',{accessToken:'FAKE-STRAVA'});await sealTokens('local','spotify',TOKENS);
 await forgetAiAccount(ACCOUNT);
 expect(await hasTokens(ACCOUNT,'strava')).toBe(false);expect(await hasTokens('local','spotify')).toBe(true);
});
