import {RevisionConflict} from './cloud-sync';

/**
 * Session AF Part 11 A4 (ADR-028 H8, TIER 3 (sync)): when a replayed or staged write answers 409 (another device moved
 * the cloud head first), `synchronize()` clears the refused pending write and throws RevisionConflict; the panel then
 * paused on "Cloud changed… Retry to reconcile", and the conflict review was only reached by the person's next sync
 * (the account-browser b-first race, ADR-027 G24). Account sync now reconciles exactly once more, as the Portfolio sync
 * (runPortfolio) already did: `fence()` re-checks the account and lock before the second attempt, and a second 409, or
 * any other error, surfaces as before. Nothing is retried in a loop and no write is repeated without a fresh read.
 */
export async function reconcileOnce<T>(attempt:()=>Promise<T>,fence:()=>void):Promise<T>{
 try{return await attempt();}
 catch(error){if(!(error instanceof RevisionConflict))throw error;fence();return await attempt();}
}
