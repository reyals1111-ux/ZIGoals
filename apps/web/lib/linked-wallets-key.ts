/**
 * Session AE (Part 6, ADR-027): the name of the linked-wallets device record, in a module with no imports so the welcome
 * check, Export everything and the erase can name it without shipping a schema (the pattern of lib/ab-design-keys.ts).
 * It holds public wallet addresses the person linked read-only, which are personal data: device-only, never synced,
 * exported, removed by the account's erase. Older builds never read it.
 */
export const LINKED_WALLETS_KEY = 'zigoals:linked-wallets:v1';
