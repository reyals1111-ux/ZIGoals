import {DEVICE_KEYS, MODULE_KEYS} from '../export/everything';
import {PORTFOLIO_KEY} from '../portfolio/schema';
import {EARN_CATALOG_LABELS} from '../af-earn-keys';
import {AF_CHECKLIST_CATALOG_LABELS} from '../af-checklist-keys';
import {WALLET_CATALOG_LABELS} from '../af-wallet-keys';
import {AF_ZIGI_CATALOG_LABELS} from '../af-zigi-keys';
import {AF_EXTRAS_CATALOG_LABELS} from '../af-extras-keys';
import {AL_CATALOG_LABELS} from '../al-device-keys';
import {AM_CATALOG_LABELS} from '../am-device-keys';

/**
 * Where each part of a person's data lives (Session AA-Cloud Part 6, the Data health page): the four synced modules
 * (encrypted, with an account; Health only after each device's own consent), the records kept on this device only, and
 * the figures that are never stored because they are worked out each time. Every key Export everything reads has a
 * plain-words label here (a unit test keeps them in step).
 */
export type Home = 'sync' | 'sync-consent' | 'device';
export type CatalogEntry = {key: string; label: string; home: Home; area: string};

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
  workouts: ['Workouts', 'Health'],
  moneyLog: ['Spending', 'Wealth'],
  journal: ['Journal', 'Today'],
  energy: ['Daily energy', 'Health'],
  mealEstimates: ['Meal estimate ranges', 'Health'],
  tasks: ['Tasks', 'Today'],
  portfolioReceipts: ['Portfolio rewards, income and airdrops', 'Wealth'],
  portfolioImports: ['Portfolio rows from wallets', 'Wealth'],
  readingSources: ['Where wealth readings came from', 'Wealth'],
  priceAlerts: ['Price alerts', 'Wealth'],
  notify: ['Notification choices', 'Settings'],
  musicMix: ['Sound mix and timer', 'Music'],
  autoRules: ['Habits ticked off by your rules', 'Habits'],
  bills: ['Bills and subscriptions', 'Wealth'],
  budgets: ['Monthly category budgets', 'Wealth'],
  targetAllocation: ['Your target mix', 'Wealth'],
  csvMappings: ['Saved CSV column matches', 'Wealth'],
  backupReminder: ['Backup reminder', 'Settings'],
  foodScans: ['Barcodes you scanned', 'Health'],
  nutrientExtras: ['Extra nutrients (magnesium, zinc, B vitamins, omega-3)', 'Health'],
  grocery: ['Grocery ticks, pantry and added items', 'Health'],
  calorieWeek: ['Weekly calorie budget', 'Health'],
  comparePair: ['The comparison you chose last (Insights)', 'Health'],
  supplements: ['Supplements and medication log', 'Health'],
  govReminders: ['Governance vote reminders', 'Wealth'],
  insightFeedback: ['Was this useful? (ZIGi notes)', 'ZIGi'],
  focusRounds: ['Focus bell and breaks', 'Journey'],
  cycle: ['Cycle log', 'Health'],
  scales: ['Your own scales', 'Today'],
  healthNumbers: ['Your numbers (blood pressure and lab values)', 'Health'],
  novaHermes: ['Hermes Agent connection (address, checks; never the key)', 'NOVA'],
  novaSetup: ['Build your own NOVA: progress and privacy mode', 'NOVA'],
  novaWorkflows: ['NOVA custom workflows', 'NOVA'],
  novaBriefs: ['NOVA morning briefs and evening recaps', 'NOVA'],
  novaBridge: ['Which chats started in NOVA, and delegated turns', 'NOVA'],
  nova: ['NOVA: layout, widgets, quick access and persona', 'NOVA'],
  calendarImport: ['Imported calendars (read-only events)', 'Today'],
  notes: ['Notes and the capture inbox', 'Today'],
  networthMilestones: ['Net-worth milestones', 'Wealth'],
  savingsChallenges: ['Savings challenges', 'Goals'],
  debtPlanner: ['Debt payoff planner figures', 'Wealth'],
  wrapped: ['ZIGoals Wrapped (when you opened it)', 'Journey'],
  agenda: ['Agenda view and filters', 'Today'],
  journalDisplay: ['On this day choices (Journal)', 'Today'],
  firstWeek: ['Your first week (Today card)', 'Today'],
  experiments: ['Experiments (one change, compared)', 'Health'],
  moneyRules: ['Money log rules', 'Wealth'],
  moneyReview: ['Imported entries still to review', 'Wealth'],
  fiModel: ['Financial freedom model inputs', 'Wealth'],
  emergencySheet: ['If something happens to me (emergency sheet)', 'Wealth'],
  muscleRecovery: ['Recovery days per muscle group', 'Health'],
  foodDisplay: ['Food quality letters (Nutri-Score) choice', 'Health'],
  rewardsShelf: ['Rewards shelf', 'Journey'],
  focusSessions: ['Focus sessions', 'Journey'],
  guidedJourneys: ['Guided journeys', 'Journey'],
  exchanges: ['Exchanges read (balances only)', 'Wealth'],
  zigiMetrics: ['What ZIGi did for you (counts)', 'Today'],
  todayCards: ['Today\'s cards kept on this device', 'Today'],
  // Session AA-Local (ADR-022 B1, merged second): the eleven device-only keys of lib/aa-device-keys.ts.
  habitExtras: ['Habit extras: areas, quit costs, bells, folds', 'Habits'], routineRun: ['A routine in progress', 'Habits'], game: ['The game layer: XP, quests, badges, freezes', 'Journey'],
  healthCoach: ['The weekly coach\'s answers', 'Health'], microTargets: ['Micronutrient targets', 'Health'], macroMode: ['How macros are shown', 'Health'], aisles: ['Grocery aisles', 'Health'],
  measurementsCustom: ['Custom measurement kinds', 'Health'], progressPhotos: ['Progress photo index', 'Health'], remindersPlan: ['The reminders plan and quiet hours', 'Today'], onboardingSetup: ['The welcome\'s setup (for Undo)', 'Today'],
  // Session AB-Design's display preferences (ADR-023 C8).
  uiPrefs: ['How pages look on this device', 'Settings'],
  // Session AB-Cloud's own (lib/ab-cloud-device-keys.ts).
  healthVitamins: ['Vitamins of your foods and their targets', 'Health'], pointTell: ['Point & tell notes', 'Settings'],
  // Session AE (Part 6, ADR-027): the wallets linked read-only.
  linkedWallets: ['Linked wallet addresses (read-only)', 'Wallet'],
  // Session AF (ADR-028): the Earn and Checklist device records (lib/af-earn-keys.ts, lib/af-checklist-keys.ts).
  earnPath: [EARN_CATALOG_LABELS.earnPath[0], EARN_CATALOG_LABELS.earnPath[1]], earnAcademy: [EARN_CATALOG_LABELS.earnAcademy[0], EARN_CATALOG_LABELS.earnAcademy[1]], earnPrefs: [EARN_CATALOG_LABELS.earnPrefs[0], EARN_CATALOG_LABELS.earnPrefs[1]],
  checklist: [AF_CHECKLIST_CATALOG_LABELS.checklist[0], AF_CHECKLIST_CATALOG_LABELS.checklist[1]], checklistDays: [AF_CHECKLIST_CATALOG_LABELS.checklistDays[0], AF_CHECKLIST_CATALOG_LABELS.checklistDays[1]],
  // Session AF (L2a): native staking's two device records.
  stakingJournal: ['Staking and vote transactions', 'Wallet'], stakingPrefs: ['Staking choices: practice or real', 'Wallet'], validatorAlerts: ['Validator health alerts: what this device last saw', 'Wallet'],
  // Session AF (L2b): linked wallets' last balances and Goal Vault links.
  walletBalances: [WALLET_CATALOG_LABELS.walletBalances[0], WALLET_CATALOG_LABELS.walletBalances[1]], goalVaults: [WALLET_CATALOG_LABELS.goalVaults[0], WALLET_CATALOG_LABELS.goalVaults[1]],
  // Session AF (L4, L5b): ZIGi's plans; My universe, Day timeline and Stories.
  zigiPlans: [AF_ZIGI_CATALOG_LABELS.zigiPlans[0], AF_ZIGI_CATALOG_LABELS.zigiPlans[1]],
  universe: [AF_EXTRAS_CATALOG_LABELS.universe[0], AF_EXTRAS_CATALOG_LABELS.universe[1]], dayTimeline: [AF_EXTRAS_CATALOG_LABELS.dayTimeline[0], AF_EXTRAS_CATALOG_LABELS.dayTimeline[1]], stories: [AF_EXTRAS_CATALOG_LABELS.stories[0], AF_EXTRAS_CATALOG_LABELS.stories[1]],
  // Session AL (lib/al-device-keys.ts): the Apps & extras display choices (O3, O4).
  appsPrefs: [AL_CATALOG_LABELS.appsPrefs[0], AL_CATALOG_LABELS.appsPrefs[1]], walletNames: [AL_CATALOG_LABELS.walletNames[0], AL_CATALOG_LABELS.walletNames[1]],
  chessPuzzle: [AL_CATALOG_LABELS.chessPuzzle[0], AL_CATALOG_LABELS.chessPuzzle[1]], novaHud: [AL_CATALOG_LABELS.novaHud[0], AL_CATALOG_LABELS.novaHud[1]], healthExtras: [AL_CATALOG_LABELS.healthExtras[0], AL_CATALOG_LABELS.healthExtras[1]], stablecoinsAsCash: [AL_CATALOG_LABELS.stablecoinsAsCash[0], AL_CATALOG_LABELS.stablecoinsAsCash[1]], chessPuzzleLog: [AL_CATALOG_LABELS.chessPuzzleLog[0], AL_CATALOG_LABELS.chessPuzzleLog[1]], ecoTvlHistory: [AL_CATALOG_LABELS.ecoTvlHistory[0], AL_CATALOG_LABELS.ecoTvlHistory[1]], profileName: [AL_CATALOG_LABELS.profileName[0], AL_CATALOG_LABELS.profileName[1]], watchlistMore: [AL_CATALOG_LABELS.watchlistMore[0], AL_CATALOG_LABELS.watchlistMore[1]],
  // Session AM (lib/am-device-keys.ts; ADR-038 D16, D17): NOVA's stage record and its outside-data record.
  novaStage: [AM_CATALOG_LABELS.novaStage[0], AM_CATALOG_LABELS.novaStage[1]], novaWorld: [AM_CATALOG_LABELS.novaWorld[0], AM_CATALOG_LABELS.novaWorld[1]],
};
/** Session AM (ADR-038 D18): the one record of which only a part travels, in the words the Data health page shows. */
export const NOVA_PARTLY_SYNCED_LABEL = 'NOVA: layout and pinned widgets (quick access, persona, names, instructions and side bars stay on this device)';
/**
 * Session AB-Cloud (ADR-023): device records that now also travel in encrypted sync. They stay on this device (every page
 * reads them there) and their synced copy lives in the home named here: accounts and milestone dates inside finance v5
 * (Part 1, C6), the AA records in the encrypted extras sections (Part 2, C1; `lib/vault/extras-sections.ts`).
 */
export const DEVICE_SYNCED: Partial<Record<keyof typeof DEVICE_KEYS, {home: Home; area: string; label?: string}>> = {
  accounts: {home: 'sync', area: 'Goals & Wealth'}, milestoneDates: {home: 'sync', area: 'Goals & Wealth'},
  // Part 2 (C1, C4): the encrypted extras sections, on unless turned off in Settings → Sync; Health's only with its consent.
  goalExtras: {home: 'sync', area: 'Goals'}, averageGoals: {home: 'sync', area: 'Goals'},
  calculator: {home: 'sync', area: 'Wealth'}, lifeReview: {home: 'sync', area: 'Life review'}, todayCards: {home: 'sync', area: 'Today'}, remindersPlan: {home: 'sync', area: 'Today'},
  habitExtras: {home: 'sync', area: 'Habits'}, routineRun: {home: 'sync', area: 'Habits'}, game: {home: 'sync', area: 'Journey'},
  healthCoach: {home: 'sync-consent', area: 'Health'}, microTargets: {home: 'sync-consent', area: 'Health'}, macroMode: {home: 'sync-consent', area: 'Health'}, aisles: {home: 'sync-consent', area: 'Health'}, measurementsCustom: {home: 'sync-consent', area: 'Health'}, healthVitamins: {home: 'sync-consent', area: 'Health'},
  // Session AK (8.10, AFL8): the Checklist section; its Health quick inputs and today's ticks stay on each device.
  checklist: {home: 'sync', area: 'Checklist'}, checklistDays: {home: 'sync', area: 'Checklist'},
  // Session AM (ADR-038 D18): the NOVA section. The stage record travels whole. Of `zigoals:nova:v1` only the layout and
  // the pinned widgets travel; a key is listed once, so it stands with the synced records under a label that names what
  // travels and what stays (NOVA_PARTLY_SYNCED_LABEL), never as "this device only" (two of its fields leave the device)
  // and never as plainly synced (the rest does not). `zigoals:nova-world:v1` and every other NOVA key stay device-only.
  novaStage: {home: 'sync', area: 'NOVA'}, nova: {home: 'sync', area: 'NOVA', label: NOVA_PARTLY_SYNCED_LABEL},
};
const DEVICE_NAMES = Object.keys(DEVICE_KEYS) as (keyof typeof DEVICE_KEYS)[];
export const SYNCED: readonly CatalogEntry[] = [
  {key: MODULE_KEYS.finance, label: 'Goals, Wealth and contributions', home: 'sync', area: 'Goals & Wealth'},
  {key: MODULE_KEYS.habits, label: 'Habits and check-ins', home: 'sync', area: 'Habits'},
  {key: MODULE_KEYS.settings, label: 'Today\'s layout, widgets and settings', home: 'sync', area: 'Today'},
  {key: MODULE_KEYS.health, label: 'Health journal (food, water, activity, sleep, weight)', home: 'sync-consent', area: 'Health'},
  ...DEVICE_NAMES.filter(name => DEVICE_SYNCED[name]).map((name): CatalogEntry => ({key: DEVICE_KEYS[name], label: DEVICE_SYNCED[name]!.label ?? DEVICE_LABELS[name][0], home: DEVICE_SYNCED[name]!.home, area: DEVICE_SYNCED[name]!.area})),
];
export const DEVICE_ONLY: readonly CatalogEntry[] = [
  ...DEVICE_NAMES.filter(name => !DEVICE_SYNCED[name]).map((name): CatalogEntry => ({key: DEVICE_KEYS[name], label: DEVICE_LABELS[name][0], home: 'device', area: DEVICE_LABELS[name][1]})),
  {key: PORTFOLIO_KEY, label: 'Portfolio records', home: 'device', area: 'Portfolio'},
];
/** Kept on the device outside the key list: vision photos (IndexedDB) and ZIGi's conversations. */
export const DEVICE_STORES = ['Vision photos (IndexedDB, compressed on this device)', 'Progress photos (IndexedDB, compressed on this device)', 'ZIGi\'s conversations (IndexedDB)', 'Notification snapshot, push identity and taps waiting to apply (IndexedDB, this device only)', 'Offline food library (public data, IndexedDB)', 'Your own Spotify client id (IndexedDB, this device only)', 'Barcode lookups and exchange refreshes asked for while offline (IndexedDB, this device only)', 'Meal photos you chose to keep (IndexedDB, this device only)', 'Your Lichess connection (IndexedDB, this device only, never exported)', 'Photos in notes (IndexedDB, this device only)', 'Receipt photos on money entries (IndexedDB, this device only)'] as const;
/**
 * Session AL (third pass, INT): the copies a restore keeps of what it replaced, `<key>:recovery:<uuid>` (lib/vault/
 * recovery-copies.ts; Tasks, the Checklist and its day history since Session AL, the modules and device records before).
 * They are not in the key list above (their names are made at restore time), never exported or synced, and erased with
 * everything else. `recoveryCopyEntry` names one for the Data health page: "Recovery copy: <the record's label>", in the
 * record's own area, this device only; any other key is null.
 */
const RECOVERY_COPY = /^(.+):recovery:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function recoveryCopyEntry(key: string): CatalogEntry | null {
  const of = RECOVERY_COPY.exec(key)?.[1];
  const record = of ? [...SYNCED, ...DEVICE_ONLY].find(e => e.key === of) : undefined;
  return record ? {key, label: `Recovery copy: ${record.label}`, home: 'device', area: record.area} : null;
}
/** Every recovery copy in a storage view, named (the keys of records this catalog does not know are left out). */
export function recoveryCopies(storage: Pick<Storage, 'length' | 'key'>): CatalogEntry[] {
  const out: CatalogEntry[] = [];
  for (let i = 0; i < storage.length; i++) { const k = storage.key(i); const entry = k ? recoveryCopyEntry(k) : null; if (entry) out.push(entry); }
  return out.sort((a, b) => a.label.localeCompare(b.label));
}
/** Worked out each time from the records above, never stored. */
export const NEVER_STORED = ['Calculator results', 'Life review figures', 'Insights and pairings', 'Search results', 'Pace forecasts', 'The life balance wheel'] as const;
export const HOME_LABEL: Record<Home, string> = {sync: 'Encrypted sync with an account', 'sync-consent': 'Encrypted sync after this device\'s consent', device: 'This device only'};
/** The bytes a stored value takes (UTF-16, as the browser counts it), or null when nothing is stored. */
export const storedBytes = (value: string | null) => value === null ? null : value.length * 2;
