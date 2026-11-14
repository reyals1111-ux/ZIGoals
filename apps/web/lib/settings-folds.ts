import {hashId} from './hash-id';

/**
 * Session AL (D-088, N-BN-10, DV-266, D-005, N-BN-05): Settings' groups fold from their headings on a computer or a
 * tablet. Session AP (D-088 completed, ADR-040): they start folded, a page of headings with one line each of what they
 * hold; the groups a person opens stay open on this device (`SETTINGS_OPEN_KEY`, localStorage), and a jump (a deep link,
 * the index, Search, Help) always opens the group it lands in. Phones keep their own list. A display convenience, never a
 * record: not exported, synced or catalogued (lib/erase-coverage.test.ts lists both keys in NOT_RECORDS).
 */
/** AL's tab-only list of folded groups; no longer written, removed when Settings opens (an old tab's leftover). */
export const SETTINGS_FOLDS_KEY = 'zigoals:settings-folds:v1';
/** The groups open on this device (group ids only). */
export const SETTINGS_OPEN_KEY = 'zigoals:settings-open:v1';

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

/** The groups open on this device; anything unreadable reads as none open (every group folded). */
export function loadOpen(store: Pick<Storage, 'getItem'> | null | undefined): SettingsGroupId[] {
  try { return parseFolds(store?.getItem(SETTINGS_OPEN_KEY)); } catch { return []; }
}
/** Saves the open groups; with none open the key goes. */
export function saveOpen(store: Store | null | undefined, ids: Iterable<unknown>): void {
  const open = normaliseFolds(ids);
  try {
    if (open.length) store?.setItem(SETTINGS_OPEN_KEY, JSON.stringify(open));
    else store?.removeItem(SETTINGS_OPEN_KEY);
  } catch { /* storage blocked or full: the groups stay as they are until reload */ }
}
/** What starts folded on a computer or a tablet: every group but the open ones, the one a jump lands in, and `alsoOpen`. */
export function foldedAtStart(open: readonly SettingsGroupId[], target: SettingsGroupId | null, alsoOpen: readonly SettingsGroupId[] = []): SettingsGroupId[] {
  return SETTINGS_GROUP_IDS.filter(id => id !== target && !open.includes(id) && !alsoOpen.includes(id));
}
/** Keys a device holds before it has any record of its own (display choices and markers, never a person's records). */
const NOT_A_RECORD = /^zigoals:(onboarding|ui-prefs|settings|settings-open|motion|whats-new|ak-tour|layout|sync-offer|first-five|bento|day-ends|day-goal)(:|$)/;
/**
 * Session AP (ADR-040 D20): the group with the Showcase card ("Your app") starts open while the Showcase is on (its
 * "Return to my data" is wanted first) and on a device that holds no record of its own yet (Settings → Load Showcase Demo
 * is a new person's first step); every other group folds.
 */
export function showcaseGroupOpen(storage: Pick<Storage, 'length' | 'key'> | null | undefined, showcase: boolean): boolean {
  if (showcase) return true;
  try {
    if (!storage) return false;
    for (let i = 0; i < storage.length; i++) { const key = storage.key(i); if (key?.startsWith('zigoals') && !NOT_A_RECORD.test(key)) return false; }
    return true;
  } catch { return false; }
}
/** The open groups that a set of folded ones leaves. */
export const openOf = (folded: Iterable<string>): SettingsGroupId[] => { const set = new Set(folded); return SETTINGS_GROUP_IDS.filter(id => !set.has(id)); };

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
