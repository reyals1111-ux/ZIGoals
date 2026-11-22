/**
 * Session AV lane 2 (owner follow-up 4, 4d A45-1; TIER 3 sync): the account-sync engine's words, moved unchanged out of
 * components/vault-sync-controls.tsx so the Settings panel shows them without loading the engine. The engine re-exports them.
 */
/** Refusals of the Health consent checkbox; the checkbox is described by the error while one is shown. */
export const HEALTH_HELD_REFUSAL='Health is kept locally after cloud deletion. Use Review restoring local section before enabling transfers.',HEALTH_UNVERIFIED_REFUSAL='Health permission could not be verified. Transfers remain off.';
/** Remember this device (ADR-008, owner decision M1): the choice, and what it means, always shown together. */
export const REMEMBER_LABEL='Remember on this device — don’t use on shared computers',REMEMBER_NOTE='ZIGoals then opens your account records here without the recovery secret, also after a restart; anyone who can use this browser on this device can open them too. Forget this device in Settings at any time; locking also forgets it.';
/** Session Y Part 5 (B4): what a Health restore says instead of turning Health sync on. */
export const HEALTH_RESTORE_ASK='Your Health section on this device is approved for a new cloud copy. Health sync stays off in this tab until you tick “Sync my Health records with this account” below; until then your Health records stay on this device.';
/** Session Y Part 5 (B6, B3): what the person reads when the cloud's vault is gone or older than this device's record. */
export const VAULT_MISSING='Your account had encrypted sync on this device, but the cloud has no vault for it now. Nothing was changed on this device. This can happen when the sync service was restored from an earlier copy, so try again later. If the vault stays missing, you can start a new one below.',VAULT_OLDER='The vault in the cloud is older than the one this device last synced with, so nothing was applied. Your records on this device were not changed. This can happen when the sync service was restored from an earlier copy, or a new vault was made on another device after that, so try again later. If it stays like this, you can re-link this device below.';
export const REMEMBER_DAYS=30,REMEMBER_EXPIRED_NOTE='remember-expired';
/** Session Y Part 5 (A7): what a remembered device says when the server ended it. */
export const DENIED_REVOKED='This device is no longer remembered because its session was signed out on another device. Your records on this device were not changed; unlocking again needs the recovery secret.',DENIED_DELETED='Your cloud copy was deleted; this device keeps its records. It is no longer remembered, and Export everything still makes a copy of what it kept.';
