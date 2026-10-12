import {DEVICE_KEYS, MODULE_KEYS} from '../export/everything';
import {PORTFOLIO_KEY} from '../portfolio/schema';

/**
 * Where each part of a person's data lives (Session AA-Cloud Part 6, the Data health page): the four synced modules
 * (encrypted, with an account; Health only after each device's own consent), the records kept on this device only, and
 * the figures that are never stored because they are worked out each time. Every key Export everything reads has a
 * plain-words label here (a unit test keeps them in step).
 */
export type Home = 'sync' | 'sync-consent' | 'device';
export type CatalogEntry = {key: string; label: string; home: Home; area: string};
export const SYNCED: readonly CatalogEntry[] = [
  {key: MODULE_KEYS.finance, label: 'Goals, Wealth and contributions', home: 'sync', area: 'Goals & Wealth'},
  {key: MODULE_KEYS.habits, label: 'Habits and check-ins', home: 'sync', area: 'Habits'},
  {key: MODULE_KEYS.settings, label: 'Today\'s layout, widgets and settings', home: 'sync', area: 'Today'},
  {key: MODULE_KEYS.health, label: 'Health journal (food, water, activity, sleep, weight)', home: 'sync-consent', area: 'Health'},
];
const DEVICE_LABELS: Record<keyof typeof DEVICE_KEYS, [label: string, area: string]> = {
  reminders: ['Reminders', 'Today'], habitHealthLinks: ['Habits counted from Health', 'Habits'], healthGoals: ['Health goals', 'Health'], weeklyReview: ['Weekly reflections (your words)', 'Life review'],
  fasting: ['Fasting', 'Health'], insights: ['Insights you dismissed', 'Today'], importUndo: ['Import undo history', 'Wealth'], push: ['Push reminder choices', 'Today'], guide: ['The Guide\'s choices', 'Today'],
  ai: ['ZIGi\'s settings', 'ZIGi'], todayFolds: ['Today\'s open and closed folds', 'Today'], aiOptions: ['ZIGi\'s options', 'ZIGi'], aiUsage: ['ZIGi\'s usage counts', 'ZIGi'], aiMemory: ['Your notes for ZIGi', 'ZIGi'],
  aiActions: ['ZIGi\'s actions log', 'ZIGi'], zigi: ['ZIGi\'s look and feel', 'ZIGi'], zigiReminders: ['ZIGi\'s reminders', 'ZIGi'], zigiKnock: ['ZIGi\'s knocks', 'ZIGi'],
  accounts: ['Accounts and debts', 'Wealth'], milestoneDates: ['Milestone dates', 'Goals'], importBatches: ['Import batches', 'Wealth'], wReminders: ['Reminder choices', 'Today'], chessCache: ['Chess ratings cache', 'Chess'],
  celebrations: ['Celebrations shown', 'Today'], meditationRun: ['A running meditation', 'Health'], music: ['Music player choices', 'Today'], pagesView: ['Your pages and buttons', 'Settings'],
  zigiSuggestions: ['ZIGi\'s suggestions', 'ZIGi'], zigiVoice: ['ZIGi\'s voice choices', 'ZIGi'], zigiCards: ['ZIGi\'s cards', 'ZIGi'],
  goalExtras: ['Goal plans, life areas, visions and sub-goals', 'Goals'], averageGoals: ['Average goals', 'Goals'],
  calculator: ['Calculator scenarios', 'Wealth'], searchRecent: ['Recent searches', 'Search'], lifeReview: ['Life review focus', 'Life review'],
};
export const DEVICE_ONLY: readonly CatalogEntry[] = [
  ...(Object.keys(DEVICE_KEYS) as (keyof typeof DEVICE_KEYS)[]).map((name): CatalogEntry => ({key: DEVICE_KEYS[name], label: DEVICE_LABELS[name][0], home: 'device', area: DEVICE_LABELS[name][1]})),
  {key: PORTFOLIO_KEY, label: 'Portfolio records', home: 'device', area: 'Portfolio'},
];
/** Kept on the device outside the key list: vision photos (IndexedDB) and ZIGi's conversations. */
export const DEVICE_STORES = ['Vision photos (IndexedDB, compressed on this device)', 'ZIGi\'s conversations (IndexedDB)'] as const;
/** Worked out each time from the records above, never stored. */
export const NEVER_STORED = ['Calculator results', 'Life review figures', 'Insights and pairings', 'Search results', 'Pace forecasts', 'The life balance wheel'] as const;
export const HOME_LABEL: Record<Home, string> = {sync: 'Encrypted sync with an account', 'sync-consent': 'Encrypted sync after this device\'s consent', device: 'This device only'};
/** The bytes a stored value takes (UTF-16, as the browser counts it), or null when nothing is stored. */
export const storedBytes = (value: string | null) => value === null ? null : value.length * 2;
