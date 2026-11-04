/**
 * Session AL (ADR-037): this session's device keys and their rows for the shared registries, as literals in a module with
 * no imports (the lib/af-extras-keys.ts pattern), so the welcome check, Export everything, the data catalog and the account
 * erase can name them without shipping a schema; lib/al-device-keys.test.ts proves each literal equals its owner's
 * constant and that every registry carries it. Every record is device only, versioned and loose, exported, erased with
 * the account and never synced (TIER 3 stored format: additive keys only).
 * - `zigoals:apps:v1` (display; owner decisions O3, O4): which app pages are switched off and whether the sidebar's Apps
 *   group is folded (lib/ui-prefs/apps.ts). A display choice: never restored.
 */
export const APPS_PREFS_KEY_LITERAL = 'zigoals:apps:v1';
/** BN-085/BN-112 (personal): names given to tracked wallets on this device (lib/staking/tracked-wallets.ts). */
export const WALLET_NAMES_KEY_LITERAL = 'zigoals:wallet-names:v1';
/** BN-100/121 (display): the daily chess puzzle's moves so far (lib/chess/puzzle.ts); a public puzzle, no personal text. */
export const CHESS_PUZZLE_KEY_LITERAL = 'zigoals:chess-puzzle:v1';
/** Part 11 (display): NOVA's look (Holo or Classic) and HUD preset (lib/nova/layout.ts NOVA_HUD). */
export const NOVA_HUD_KEY_LITERAL = 'zigoals:nova-hud:v1';
/** Personal device records: a device holding one is not new (onboarding `DEVICE_RECORD_KEYS`). */
export const AL_PERSONAL_KEYS: readonly string[] = [WALLET_NAMES_KEY_LITERAL];
/** Display records (onboarding `NON_PERSONAL_KEYS`): a device holding only these is still new. */
export const AL_DISPLAY_KEYS: readonly string[] = [APPS_PREFS_KEY_LITERAL, CHESS_PUZZLE_KEY_LITERAL, NOVA_HUD_KEY_LITERAL];
/** Export everything (`DEVICE_KEYS`): the names in everything.json. */
export const AL_EXPORT_KEYS = {appsPrefs: APPS_PREFS_KEY_LITERAL, walletNames: WALLET_NAMES_KEY_LITERAL, chessPuzzle: CHESS_PUZZLE_KEY_LITERAL, novaHud: NOVA_HUD_KEY_LITERAL} as const;
/** The data catalog (`DEVICE_LABELS`): [label, area], home "device". */
export const AL_CATALOG_LABELS = {
  appsPrefs: ['Apps & extras: which apps show and the sidebar Apps group folded or open', 'Settings'],
  walletNames: ['Names you gave tracked wallets', 'Wallet'],
  chessPuzzle: ['Today\'s chess puzzle: your moves so far', 'Chess'],
  novaHud: ['NOVA: Holo or Classic look and the HUD preset', 'NOVA'],
} as const;
/** The account erase (`lib/aa-device-forget.ts`): every key above. */
export const AL_ERASE_KEYS: readonly string[] = [...AL_PERSONAL_KEYS, ...AL_DISPLAY_KEYS];
