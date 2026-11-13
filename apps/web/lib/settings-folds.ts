import {hashId} from './hash-id';

/**
 * Session AL (D-088, N-BN-10, DV-266, D-005, N-BN-05): Settings' six groups fold from their headings on a computer or a
 * tablet. Every group is open by default; what is folded lasts for this tab only. A display convenience, never a record:
 * it is not exported, synced or catalogued (lib/erase-coverage.test.ts lists it in NOT_RECORDS).
 */
export const SETTINGS_FOLDS_KEY = 'zigoals:settings-folds:v1';

/** The groups in page order (app/app/settings/page.tsx renders one per id). */
// Session AO (owner decision 13 Nov: the theme switch below the fold at 800 px): Appearance is the first group.
export const SETTINGS_GROUP_IDS = ['settings-look', 'settings-data', 'settings-app', 'settings-areas', 'settings-account', 'settings-zigi', 'settings-help'] as const;
export type SettingsGroupId = typeof SETTINGS_GROUP_IDS[number];

export const isSettingsGroupId = (id: unknown): id is SettingsGroupId => typeof id === 'string' && (SETTINGS_GROUP_IDS as readonly string[]).includes(id);

/** Known group ids, once each, in page order. */
export function normaliseFolds(ids: Iterable<unknown>): SettingsGroupId[] {
  const set = new Set([...ids].filter(isSettingsGroupId));
  return SETTINGS_GROUP_IDS.filter(id => set.has(id));
}

/** What a stored value says is folded; anything unreadable reads as "nothing folded" (every group open). */
export function parseFolds(raw: string | null | undefined): SettingsGroupId[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? normaliseFolds(value) : [];
  } catch { return []; }
}

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export function loadFolds(store: Pick<Storage, 'getItem'> | null | undefined): SettingsGroupId[] {
  try { return parseFolds(store?.getItem(SETTINGS_FOLDS_KEY)); } catch { return []; }
}
/** Saves the folded groups; with none folded the key goes, so a tab that never folds stores nothing. */
export function saveFolds(store: Store | null | undefined, ids: Iterable<unknown>): void {
  const folds = normaliseFolds(ids);
  try {
    if (folds.length) store?.setItem(SETTINGS_FOLDS_KEY, JSON.stringify(folds));
    else store?.removeItem(SETTINGS_FOLDS_KEY);
  } catch { /* storage blocked or full: the folds last until reload */ }
}

/**
 * The group a jump target sits in: the group itself (#settings-zigi), or the group whose element holds it (#send-feedback,
 * ZIGi's own anchors). `groupOf` answers from the page (the id of the closest group around the element), or null.
 */
export function groupForTarget(id: string | null | undefined, groupOf: (id: string) => string | null | undefined): SettingsGroupId | null {
  if (!id) return null;
  if (isSettingsGroupId(id)) return id;
  const group = groupOf(id);
  return isSettingsGroupId(group) ? group : null;
}
/** The same for an address's fragment (`#send-feedback`); a malformed fragment such as `#%` names nothing. */
export function groupForHash(hash: string, groupOf: (id: string) => string | null | undefined): SettingsGroupId | null {
  return groupForTarget(hashId(hash), groupOf);
}

/** The folds a page opening on a jump starts with: the stored ones, less the group the jump lands in. */
export function foldsForJump(stored: readonly SettingsGroupId[], target: SettingsGroupId | null): SettingsGroupId[] {
  return target ? stored.filter(id => id !== target) : [...stored];
}

export function allFolded(folds: Iterable<string>): boolean {
  const set = new Set(folds);
  return SETTINGS_GROUP_IDS.every(id => set.has(id));
}

/** "a", "a and b", "a, b and c". */
export function listPhrase(parts: readonly string[]): string {
  if (parts.length < 2) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

// What each group holds, in its own order, named as its sections are. `chain` parts show only once the chain is chosen
// (lib/chain-choice.ts), as their sections do.
const SUMMARY: Record<SettingsGroupId, [part: string, chain?: true][]> = {
  'settings-look': [['Theme'], ['motion'], ['font, text size and density']],
  'settings-data': [['Your data'], ['backups'], ['export everything'], ['import from other apps'], ['erase everything']],
  'settings-app': [['Plan'], ['pages & buttons'], ['Checklist'], ['Earn and Staking choices', true], ['time zone'], ['my day ends at'], ['wrap-up'], ['music'], ['links']],
  'settings-areas': [['Habits'], ['Health targets'], ['chess'], ['Guide'], ['install'], ['notifications'], ['reminders'], ['market data']],
  'settings-account': [['Account & sync'], ['the PIN screen cover'], ['wallet & network', true]],
  'settings-zigi': [['ZIGi’s settings'], ['NOVA’s command center']],
  'settings-help': [['Storage health'], ['diagnostics'], ['send feedback'], ['Point & tell'], ['about this alpha']],
};
/** The one line a folded group's heading shows: what it holds. */
export function foldSummary(id: SettingsGroupId, {chain = false}: {chain?: boolean} = {}): string {
  return listPhrase(SUMMARY[id].filter(([, needsChain]) => chain || !needsChain).map(([part]) => part));
}
