import {csvSafeCell} from './csv-safe';
import {PLATFORM_KEY, platformSchema, type Platform} from '../positions';
import {HABITS_KEY, habitDataSchema, latestHabitRule, type HabitData} from '../habits';
import {HEALTH_STORAGE_KEY, healthSchema, type HealthData} from '../health';
import {DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, type DashboardSettings} from '../dashboard-settings';
import {PORTFOLIO_KEY} from '../portfolio/schema';
import {REMINDERS_KEY} from '../reminders/schema';
import {HABIT_HEALTH_LINKS_KEY, habitHealthLinksSchema, type AppliedCheckInV4} from '../habit-health-links/schema';
import {HEALTH_GOALS_KEY} from '../health-goals/schema';
import {WEEKLY_REVIEW_KEY} from '../weekly-review/schema';
import {FASTING_KEY} from '../fasting/schema';
import {INSIGHTS_KEY} from '../insights/schema';
import {IMPORT_UNDO_KEY} from '../import/undo-schema';
import {PUSH_KEY} from '../push/client';
import {GUIDE_KEY} from '../coach/schema';
import {AI_SETTINGS_KEY} from '../ai/launcher-record';
import {TODAY_FOLDS_KEY} from '../today-folds';
import {AI_ACTIONS_KEY, AI_MEMORY_KEY, AI_OPTIONS_KEY, AI_USAGE_KEY, ZIGI_KEY, ZIGI_KNOCK_KEY, ZIGI_REMINDERS_KEY} from '../ai/store/keys';
import {ACCOUNTS_KEY, CELEBRATIONS_KEY, CHESS_CACHE_KEY, IMPORT_BATCHES_KEY, MEDITATION_RUN_KEY, MILESTONE_DATES_KEY, MUSIC_KEY, PAGES_VIEW_KEY, W_REMINDERS_KEY} from '../w-device-keys';
import {ZIGI_SUGGESTIONS_KEY, ZIGI_VOICE_KEY} from '../z-device-keys';
import {accountsSchema, type Account} from '../accounts/schema';
import {exportHealthCsv} from '../health-daily';
import {exerciseData} from '../health-counters';
import {LOCAL_CHAIN, LOCAL_OWNER, parseLocalLedger} from '../local-ledger';
import {exportLocalSimulation, localSimulationSchema} from '../vault/local-simulation-backup';
import {exportDurableStore, isDurableMarker} from '../vault/local';
import {exportFileName} from '../showcase-detect';
import {parseBackup} from '@zigoals/shared-types';
import {buildStoredZip} from './zip';

/**
 * "Export everything" (Session P, PR 3, T4; docs/product/features/T4-export-everything.md): one readable ZIP with a
 * JSON file of every stored record (parsed with JSON.parse only, so the bytes are faithful) and a CSV per area. The
 * export copies stored records as they are and computes nothing new; unknown values are empty cells, never 0. It reads
 * and writes nothing in storage. Not a restore format: the encrypted backup and the module backups remain those.
 */
export const MODULE_KEYS = {finance: PLATFORM_KEY, habits: HABITS_KEY, health: HEALTH_STORAGE_KEY, settings: DASHBOARD_SETTINGS_KEY} as const;
// ZIGi (ADR-012): its settings key is exported like every device key; its conversations arrive through `aiChats` (they
// live in IndexedDB, read by the caller through lib/ai/chats.ts); its provider keys live in a separate key store that
// the export never reads.
export const DEVICE_KEYS = {reminders: REMINDERS_KEY, habitHealthLinks: HABIT_HEALTH_LINKS_KEY, healthGoals: HEALTH_GOALS_KEY, weeklyReview: WEEKLY_REVIEW_KEY, fasting: FASTING_KEY, insights: INSIGHTS_KEY, importUndo: IMPORT_UNDO_KEY, push: PUSH_KEY, guide: GUIDE_KEY, ai: AI_SETTINGS_KEY, todayFolds: TODAY_FOLDS_KEY,
  // Session V: ZIGi's own device records (options, usage, notes, the actions log, look and feel, reminders, knocks).
  aiOptions: AI_OPTIONS_KEY, aiUsage: AI_USAGE_KEY, aiMemory: AI_MEMORY_KEY, aiActions: AI_ACTIONS_KEY, zigi: ZIGI_KEY, zigiReminders: ZIGI_REMINDERS_KEY, zigiKnock: ZIGI_KNOCK_KEY,
  // Session W: accounts and debts, milestone dates, import batches, reminders, the chess cache, celebrations shown, a
  // running meditation, the music player's choices and the visible-pages mirror (lib/w-device-keys.ts).
  accounts: ACCOUNTS_KEY, milestoneDates: MILESTONE_DATES_KEY, importBatches: IMPORT_BATCHES_KEY, wReminders: W_REMINDERS_KEY, chessCache: CHESS_CACHE_KEY, celebrations: CELEBRATIONS_KEY, meditationRun: MEDITATION_RUN_KEY, music: MUSIC_KEY, pagesView: PAGES_VIEW_KEY,
  // Session Z-Cloud: ZIGi's suggestions from the person's own questions and the voice choices (lib/z-device-keys.ts).
  zigiSuggestions: ZIGI_SUGGESTIONS_KEY, zigiVoice: ZIGI_VOICE_KEY} as const;
export const EVERYTHING_KEYS: readonly string[] = [...Object.values(MODULE_KEYS), PORTFOLIO_KEY, ...Object.values(DEVICE_KEYS)];
export const EVERYTHING_NOTE = 'Readable export of your ZIGoals records. It contains personal information: keep it private. It is not a restore format; use Settings → Keep a protected copy for that.';
export const CSV_FILES = ['goals.csv', 'contributions.csv', 'habits.csv', 'check-ins.csv', 'health-diary.csv', 'weights.csv', 'water.csv', 'activity.csv', 'wealth-positions.csv',
  // Session W: one per new area, each a plain copy of its stored records.
  'sleep.csv', 'meditation.csv', 'vitals.csv', 'moods.csv', 'accounts.csv', 'links.csv'] as const;
export type CsvFileName = typeof CSV_FILES[number];
export type EverythingTexts = Record<string, string | null>;
export type LocalSimulationExport = {section: string; warning: string | null} | null;
export type EverythingJson = {
  format: 'zigoals-everything'; version: 1; exportedAt: string; app: {version: string; commit: string}; note: string;
  modules: Partial<Record<keyof typeof MODULE_KEYS, unknown>>; portfolio?: unknown; device: Partial<Record<keyof typeof DEVICE_KEYS | 'aiChats', unknown>>; localSimulation?: unknown; unreadable: string[];
};
export type Collected = {json: EverythingJson; csv: Record<CsvFileName, string>; unreadable: string[]; warnings: string[]};
const CSV_HEADERS: Record<CsvFileName, string[]> = {
  'goals.csv': ['source', 'id', 'name', 'type', 'status', 'asset', 'decimals', 'target', 'target_date', 'category', 'created_at_utc', 'plan_amount', 'plan_asset', 'plan_cadence', 'plan_next_date', 'plan_active', 'notes'],
  'contributions.csv': ['id', 'goal_id', 'goal_scope', 'direction', 'quantity', 'asset', 'decimals', 'occurred_at_utc', 'provenance', 'funding_mode', 'scheduled_date', 'position_id', 'reverses_id', 'note'],
  'habits.csv': ['id', 'title', 'category', 'type', 'measurement', 'unit', 'target', 'target_period', 'schedule', 'state', 'start_date', 'time_of_day', 'goal_link', 'created_at_utc', 'updated_at_utc', 'description', 'notes'],
  'check-ins.csv': ['habit_id', 'habit_title', 'date', 'count', 'disposition', 'mood', 'note', 'updated_at_utc', 'source', 'auto_applied_at'],
  'health-diary.csv': ['record_id', 'date', 'kind', 'name', 'meal', 'quantity', 'unit', 'serving_weight_g', 'kcal_per_serving', 'protein_mg_per_serving', 'carbs_mg_per_serving', 'fat_mg_per_serving', 'source', 'created_at_utc', 'updated_at_utc'],
  'weights.csv': ['id', 'date', 'grams', 'source', 'observed_at_utc', 'timezone', 'created_at_utc', 'updated_at_utc'],
  'water.csv': ['id', 'date', 'amount', 'unit', 'millilitres', 'created_at_utc', 'updated_at_utc'],
  'activity.csv': ['id', 'date', 'kind', 'name', 'steps', 'minutes', 'count', 'created_at_utc', 'updated_at_utc'],
  'wealth-positions.csv': ['id', 'name', 'asset', 'asset_class', 'source_type', 'network', 'quantity', 'decimals', 'valuation_value', 'valuation_currency', 'valuation_decimals', 'valuation_source', 'observed_at_utc', 'archived_at_utc', 'provenance', 'notes'],
  'sleep.csv': ['id', 'kind', 'start_utc', 'end_utc', 'timezone', 'latency_minutes', 'awake_minutes', 'awakenings', 'deep_minutes', 'rem_minutes', 'core_minutes', 'quality', 'tags', 'source', 'note', 'created_at_utc', 'updated_at_utc'],
  'meditation.csv': ['id', 'started_at_utc', 'seconds', 'kind', 'pattern', 'mood_before', 'mood_after', 'heart_rate_avg', 'heart_rate_min', 'heart_rate_max', 'timezone', 'source', 'note', 'created_at_utc', 'updated_at_utc'],
  'vitals.csv': ['id', 'date', 'source', 'resting_heart_rate', 'heart_rate_min', 'heart_rate_avg', 'heart_rate_max', 'active_kcal', 'resting_kcal', 'updated_at_utc'],
  'moods.csv': ['date', 'mood', 'note', 'recorded_at_utc'],
  'accounts.csv': ['home', 'account_id', 'name', 'kind', 'currency', 'institution', 'own_rate_percent', 'archived_at_utc', 'entry', 'entry_id', 'date', 'value', 'decimals', 'note'],
  'links.csv': ['id', 'label', 'url', 'icon', 'order', 'created_at_utc', 'updated_at_utc'],
};
type Cell = string | number | boolean | null | undefined;
/** Every cell quoted, quotes doubled, a leading apostrophe before what a spreadsheet would run as a formula (csv-safe.ts, Session U). */
export const csvCell = (value: Cell) => csvSafeCell(value);
const csv = (header: readonly string[], rows: readonly Cell[][]) => [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
const parseJson = (text: string): unknown => JSON.parse(text);
/** The day of an instant in a zone, for timed weight measurements; the UTC day when the zone cannot be read. */
function dayIn(iso: string, zone: string): string {
  try { const parts = new Intl.DateTimeFormat('en', {timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(new Date(iso)); const get = (type: string) => parts.find(p => p.type === type)!.value; return `${get('year')}-${get('month')}-${get('day')}`; } catch { return iso.slice(0, 10); }
}
/** Milligrams as a decimal gram text without locale formatting (integer arithmetic). */
const gramsText = (milligrams: number) => { const whole = Math.floor(milligrams / 1000), rest = milligrams % 1000; return rest ? `${whole}.${String(rest).padStart(3, '0').replace(/0+$/, '')}` : String(whole); };
const milliText = (milli: number) => gramsText(milli);
const scheduleText = (schedule: ReturnType<typeof latestHabitRule>['schedule']) => schedule.kind === 'daily' ? 'daily' : schedule.kind === 'weekdays' ? `weekdays ${schedule.days.join(' ')}` : schedule.kind === 'interval' ? `every ${schedule.every} days from ${schedule.anchor}` : schedule.kind === 'frequency' ? `${schedule.times} per ${schedule.period}` : `month dates ${schedule.days.join(' ')}`;

/** Reads every key, a module held in transactional storage through its durable path. Throws when the account is locked (the storage getter throws). */
export async function readEverything(storage: Storage): Promise<{texts: EverythingTexts; localSimulation: LocalSimulationExport}> {
  const texts: EverythingTexts = {};
  for (const key of EVERYTHING_KEYS) { const raw = storage.getItem(key); texts[key] = isDurableMarker(raw) ? await exportDurableStore(storage, key) : raw; }
  return {texts, localSimulation: exportLocalSimulation(storage)};
}

function goalRows(platform: Platform | null, localSimulation: LocalSimulationExport, warnings: string[]): Cell[][] {
  const rows: Cell[][] = (platform?.goals ?? []).map(g => ['private', g.id, g.name, g.type, g.status, g.asset, g.decimals, g.target, g.targetDate ?? '', g.category ?? '', g.createdAt, g.plan?.amount ?? '', g.plan?.asset ?? '', g.plan?.cadence ?? '', g.plan?.nextDate ?? '', g.plan ? String(g.plan.active) : '', g.notes]);
  if (localSimulation) {
    try {
      const section = localSimulationSchema.parse(JSON.parse(localSimulation.section));
      if (!('omitted' in section)) {
        const ledger = section.ledger === null ? null : parseLocalLedger(section.ledger), plans = section.plans === null ? null : parseBackup(section.plans, LOCAL_CHAIN, LOCAL_OWNER);
        const ids = [...new Set([...(ledger?.goals.map(g => g.id) ?? []), ...Object.keys(plans?.goals ?? {})])];
        for (const id of ids) {
          const goal = ledger?.goals.find(g => g.id === id), plan = plans?.goals[id];
          rows.push(['local-simulation', id, plan?.name ?? '', 'legacy', goal?.status ?? '', goal?.base_denom ?? '', '', plan?.targetValue ?? '', plan?.targetDate ?? '', plan?.category ?? '', goal?.created_at ?? '', plan?.monthlyContribution ?? '', plan?.currency ?? '', plan ? 'monthly' : '', '', '', plan?.notes ?? '']);
        }
      }
    } catch { warnings.push('Legacy simulation Goals could not be read for goals.csv; they are still in everything.json.'); }
  }
  return rows;
}

/** The JSON and the CSVs from the stored texts; unreadable keys are named, never copied. */
export function collectEverything(texts: EverythingTexts, {now, version, commit, localSimulation, aiChats}: {now: Date; version: string; commit: string; localSimulation: LocalSimulationExport; aiChats?: unknown}): Collected {
  const unreadable: string[] = [], warnings: string[] = [];
  const json: EverythingJson = {format: 'zigoals-everything', version: 1, exportedAt: now.toISOString(), app: {version, commit}, note: EVERYTHING_NOTE, modules: {}, device: {}, unreadable};
  const read = (key: string): unknown => { const text = texts[key]; if (text === null || text === undefined) return undefined; try { return parseJson(text); } catch { unreadable.push(key); return undefined; } };
  for (const [name, key] of Object.entries(MODULE_KEYS) as [keyof typeof MODULE_KEYS, string][]) { const value = read(key); if (value !== undefined) json.modules[name] = value; }
  const portfolio = read(PORTFOLIO_KEY); if (portfolio !== undefined) json.portfolio = portfolio;
  for (const [name, key] of Object.entries(DEVICE_KEYS) as [keyof typeof DEVICE_KEYS, string][]) { const value = read(key); if (value !== undefined) json.device[name] = value; }
  if (aiChats !== undefined) json.device.aiChats = aiChats;
  if (localSimulation) { json.localSimulation = JSON.parse(localSimulation.section); if (localSimulation.warning) warnings.push(localSimulation.warning); }
  const typed = <T,>(name: string, value: unknown, parse: (value: unknown) => {success: true; data: T} | {success: false}): T | null => { if (value === undefined) return null; const result = parse(value); if (result.success) return result.data; warnings.push(`Your ${name} records did not read as expected, so their CSV files hold the header only; everything.json still holds them as stored.`); return null; };
  const platform = typed<Platform>('finance', json.modules.finance, v => platformSchema.safeParse(v));
  const habits = typed<HabitData>('habits', json.modules.habits, v => habitDataSchema.safeParse(v));
  const health = typed<HealthData>('health', json.modules.health, v => healthSchema.safeParse(v));
  const links = json.device.habitHealthLinks === undefined ? null : habitHealthLinksSchema.safeParse(json.device.habitHealthLinks);
  // Session U Part 9: with the sync writes on, the markers live in Health v3 (`habitLinks`); the device key's are read too
  // (it is never rewritten), and for the same habit and day the Health copy is the one in use.
  const markers = new Map<string, AppliedCheckInV4>((links?.success ? links.data.applied : []).map(a => [`${a.habitId}:${a.date}`, a] as const));
  for (const a of (health && 'habitLinks' in health ? health.habitLinks?.applied : undefined) ?? []) markers.set(`${a.habitId}:${a.date}`, a);
  const applied = [...markers.values()].filter(a => !a.undone);
  const out: Record<CsvFileName, string> = {} as Record<CsvFileName, string>;
  out['goals.csv'] = csv(CSV_HEADERS['goals.csv'], goalRows(platform, localSimulation, warnings));
  out['contributions.csv'] = csv(CSV_HEADERS['contributions.csv'], (platform?.contributions ?? []).map(c => [c.id, c.goalId, c.goalScope, c.direction, c.quantity, c.asset, c.decimals, c.occurredAt, c.provenance, c.fundingMode ?? '', c.scheduledDate ?? '', c.positionId ?? '', c.reversesId ?? '', c.note ?? '']));
  out['habits.csv'] = csv(CSV_HEADERS['habits.csv'], (habits?.habits ?? []).map(h => { const rule = latestHabitRule(h); return [h.id, h.title, h.category, rule.type, rule.measurement.kind, 'unit' in rule.measurement ? rule.measurement.unit : '', rule.target, rule.targetPeriod, scheduleText(rule.schedule), rule.state, h.startDate, h.timeOfDay, h.goalLink ? `${h.goalLink.chainId}:${h.goalLink.goalId}` : '', h.createdAt, h.updatedAt, h.description, h.notes]; }));
  out['check-ins.csv'] = csv(CSV_HEADERS['check-ins.csv'], (habits?.habits ?? []).flatMap(h => h.entries.map(e => [h.id, h.title, e.date, e.count, e.disposition, e.mood ?? '', e.note, e.updatedAt, (e as {source?: string}).source ?? '', applied.find(a => a.habitId === h.id && a.date === e.date)?.appliedAt ?? ''])));
  out['health-diary.csv'] = health ? exportHealthCsv(health, '1900-01-01', '2199-12-31') : csv(CSV_HEADERS['health-diary.csv'], []);
  out['weights.csv'] = csv(CSV_HEADERS['weights.csv'], [...(health?.weights ?? []).map(w => [w.id, w.date, w.grams, 'manual-date-only', '', '', w.createdAt, w.updatedAt] as Cell[]), ...(health?.measurements ?? []).filter(m => m.kind === 'weight').map(m => [m.id, dayIn(m.observedAt, m.timezone), gramsText(m.canonical), 'measurement', new Date(m.observedAt).toISOString(), m.timezone, m.createdAt, m.recordedAt] as Cell[])]);
  out['water.csv'] = csv(CSV_HEADERS['water.csv'], (health?.daily?.water ?? []).map(w => [w.id, w.date, milliText(w.amountMilli), w.unit === 'ml' ? 'mL' : 'US fl oz', w.unit === 'ml' ? milliText(w.amountMilli) : String(Math.round(w.amountMilli / 1000 * 29.5735295625 * 1000) / 1000), w.createdAt, w.updatedAt]));
  out['activity.csv'] = csv(CSV_HEADERS['activity.csv'], [...(health?.activity ?? []).map(a => [a.id, a.date, 'activity', a.name, a.steps, a.minutes, '', a.createdAt, a.updatedAt] as Cell[]), ...(health ? exerciseData(health).days.map(d => { const counter = exerciseData(health).counters.find(c => c.id === d.counterId); return [d.id, d.date, 'counter', counter?.name ?? d.counterId, '', '', d.count, '', ''] as Cell[]; }) : [])]);
  out['wealth-positions.csv'] = csv(CSV_HEADERS['wealth-positions.csv'], (platform?.positions ?? []).map(p => [p.id, p.providerId, p.asset, p.assetClass ?? '', p.sourceType, p.network, p.quantity, p.decimals, p.valuation?.value ?? '', p.valuation?.currency ?? '', p.valuation?.decimals ?? '', p.valuation?.source ?? '', p.observedAt, p.archivedAt ?? '', p.provenance, p.notes]));
  // Session W's areas. Accounts live in their device key in this release; a later build keeps them in finance v5, so
  // both homes are copied, each row saying which one it came from.
  out['sleep.csv'] = csv(CSV_HEADERS['sleep.csv'], (health?.sleep?.nights ?? []).map(n => [n.id, n.kind, n.start, n.end ?? '', n.timeZone, n.latencyMin, n.awakeMin, n.awakenings, n.stages?.deepMin, n.stages?.remMin, n.stages?.coreMin, n.quality, (n.tags ?? []).join('; '), n.source, n.note ?? '', n.createdAt, n.updatedAt]));
  out['meditation.csv'] = csv(CSV_HEADERS['meditation.csv'], (health?.meditation?.sessions ?? []).map(m => [m.id, m.startedAt, m.seconds, m.kind, m.pattern ?? '', m.moodBefore, m.moodAfter, m.heartRate?.avg, m.heartRate?.min, m.heartRate?.max, m.timeZone, m.source, m.note ?? '', m.createdAt, m.updatedAt]));
  out['vitals.csv'] = csv(CSV_HEADERS['vitals.csv'], (health?.vitals?.days ?? []).map(v => [v.id, v.date, v.source, v.restingHr, v.hrMin, v.hrAvg, v.hrMax, v.activeKcal, v.restingKcal, v.updatedAt]));
  out['moods.csv'] = csv(CSV_HEADERS['moods.csv'], Object.entries(health?.moods?.days ?? {}).sort(([a], [b]) => a.localeCompare(b)).map(([date, m]) => [date, m.mood, m.note ?? '', m.at]));
  const deviceAccounts = json.device.accounts === undefined ? null : typed('accounts', json.device.accounts, v => accountsSchema.safeParse(v));
  const accountRows = (home: string, account: Account): Cell[][] => {
    const head = [home, account.id, account.name, account.kind, account.currency, account.institution ?? '', account.ratePercent ?? '', account.archivedAt ?? ''];
    const entries = [...account.snapshots.map(e => ['balance', e] as const), ...account.payments.map(e => ['payment', e] as const)];
    return entries.length ? entries.map(([entry, e]) => [...head, entry, e.id, e.date, e.value, e.decimals, e.note ?? '']) : [[...head, '', '', '', '', '', '']];
  };
  out['accounts.csv'] = csv(CSV_HEADERS['accounts.csv'], [...(deviceAccounts?.items ?? []).flatMap(a => accountRows('device', a)), ...((platform && 'accounts' in platform ? platform.accounts?.items : undefined) ?? []).flatMap(a => accountRows('synced', a))]);
  const settings = typed<DashboardSettings>('Today settings', json.modules.settings, v => dashboardSettingsSchema.safeParse(v));
  out['links.csv'] = csv(CSV_HEADERS['links.csv'], (settings?.links?.items ?? []).map(l => [l.id, l.label, l.url, l.icon, l.order, l.createdAt, l.updatedAt]));
  return {json, csv: out, unreadable, warnings};
}

/** The ZIP: everything.json first, then the CSVs in their table order; every entry dated `now`. */
export function buildEverythingZip(collected: Collected, {date, showcase, now}: {date: string; showcase: boolean; now: Date}): {name: string; bytes: Uint8Array} {
  const entries = [{name: 'everything.json', data: JSON.stringify(collected.json, null, 2), modified: now}, ...CSV_FILES.map(name => ({name, data: collected.csv[name], modified: now}))];
  return {name: exportFileName(`zigoals-export-${date}.zip`, showcase), bytes: buildStoredZip(entries)};
}
