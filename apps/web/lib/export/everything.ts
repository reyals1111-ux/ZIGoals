import {csvSafeCell} from './csv-safe';
import {PLATFORM_KEY, platformSchema, type Platform} from '../positions';
import {HABITS_KEY, habitDataSchema, latestHabitRule, type HabitData} from '../habits';
import {HEALTH_STORAGE_KEY, healthSchema, type HealthData} from '../health';
import {DASHBOARD_SETTINGS_KEY} from '../dashboard-settings';
import {PORTFOLIO_KEY} from '../portfolio/schema';
import {REMINDERS_KEY} from '../reminders/schema';
import {HABIT_HEALTH_LINKS_KEY, habitHealthLinksSchema} from '../habit-health-links/schema';
import {HEALTH_GOALS_KEY} from '../health-goals/schema';
import {WEEKLY_REVIEW_KEY} from '../weekly-review/schema';
import {FASTING_KEY} from '../fasting/schema';
import {INSIGHTS_KEY} from '../insights/schema';
import {IMPORT_UNDO_KEY} from '../import/undo-schema';
import {PUSH_KEY} from '../push/client';
import {GUIDE_KEY} from '../coach/schema';
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
export const DEVICE_KEYS = {reminders: REMINDERS_KEY, habitHealthLinks: HABIT_HEALTH_LINKS_KEY, healthGoals: HEALTH_GOALS_KEY, weeklyReview: WEEKLY_REVIEW_KEY, fasting: FASTING_KEY, insights: INSIGHTS_KEY, importUndo: IMPORT_UNDO_KEY, push: PUSH_KEY, guide: GUIDE_KEY} as const;
export const EVERYTHING_KEYS: readonly string[] = [...Object.values(MODULE_KEYS), PORTFOLIO_KEY, ...Object.values(DEVICE_KEYS)];
export const EVERYTHING_NOTE = 'Readable export of your ZIGoals records. It contains personal information: keep it private. It is not a restore format; use Settings → Keep a protected copy for that.';
export const CSV_FILES = ['goals.csv', 'contributions.csv', 'habits.csv', 'check-ins.csv', 'health-diary.csv', 'weights.csv', 'water.csv', 'activity.csv', 'wealth-positions.csv'] as const;
export type CsvFileName = typeof CSV_FILES[number];
export type EverythingTexts = Record<string, string | null>;
export type LocalSimulationExport = {section: string; warning: string | null} | null;
export type EverythingJson = {
  format: 'zigoals-everything'; version: 1; exportedAt: string; app: {version: string; commit: string}; note: string;
  modules: Partial<Record<keyof typeof MODULE_KEYS, unknown>>; portfolio?: unknown; device: Partial<Record<keyof typeof DEVICE_KEYS, unknown>>; localSimulation?: unknown; unreadable: string[];
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
export function collectEverything(texts: EverythingTexts, {now, version, commit, localSimulation}: {now: Date; version: string; commit: string; localSimulation: LocalSimulationExport}): Collected {
  const unreadable: string[] = [], warnings: string[] = [];
  const json: EverythingJson = {format: 'zigoals-everything', version: 1, exportedAt: now.toISOString(), app: {version, commit}, note: EVERYTHING_NOTE, modules: {}, device: {}, unreadable};
  const read = (key: string): unknown => { const text = texts[key]; if (text === null || text === undefined) return undefined; try { return parseJson(text); } catch { unreadable.push(key); return undefined; } };
  for (const [name, key] of Object.entries(MODULE_KEYS) as [keyof typeof MODULE_KEYS, string][]) { const value = read(key); if (value !== undefined) json.modules[name] = value; }
  const portfolio = read(PORTFOLIO_KEY); if (portfolio !== undefined) json.portfolio = portfolio;
  for (const [name, key] of Object.entries(DEVICE_KEYS) as [keyof typeof DEVICE_KEYS, string][]) { const value = read(key); if (value !== undefined) json.device[name] = value; }
  if (localSimulation) { json.localSimulation = JSON.parse(localSimulation.section); if (localSimulation.warning) warnings.push(localSimulation.warning); }
  const typed = <T,>(name: string, value: unknown, parse: (value: unknown) => {success: true; data: T} | {success: false}): T | null => { if (value === undefined) return null; const result = parse(value); if (result.success) return result.data; warnings.push(`Your ${name} records did not read as expected, so their CSV files hold the header only; everything.json still holds them as stored.`); return null; };
  const platform = typed<Platform>('finance', json.modules.finance, v => platformSchema.safeParse(v));
  const habits = typed<HabitData>('habits', json.modules.habits, v => habitDataSchema.safeParse(v));
  const health = typed<HealthData>('health', json.modules.health, v => healthSchema.safeParse(v));
  const links = json.device.habitHealthLinks === undefined ? null : habitHealthLinksSchema.safeParse(json.device.habitHealthLinks);
  const applied = links?.success ? links.data.applied.filter(a => !a.undone) : [];
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
  return {json, csv: out, unreadable, warnings};
}

/** The ZIP: everything.json first, then the CSVs in their table order; every entry dated `now`. */
export function buildEverythingZip(collected: Collected, {date, showcase, now}: {date: string; showcase: boolean; now: Date}): {name: string; bytes: Uint8Array} {
  const entries = [{name: 'everything.json', data: JSON.stringify(collected.json, null, 2), modified: now}, ...CSV_FILES.map(name => ({name, data: collected.csv[name], modified: now}))];
  return {name: exportFileName(`zigoals-export-${date}.zip`, showcase), bytes: buildStoredZip(entries)};
}
