'use client';
import {useState, type FormEvent} from 'react';
import {usePrivateStore} from '../use-private-store';
import {useHabits} from '../habits/use-habits';
import {useHealth} from '../health/use-health';
import {ZoneField} from '../zone-field';
import {DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings, withJournalZone} from '../../lib/dashboard-settings';
import {clearHabitTimezone, saveHabitTimezone} from '../../lib/habits';
import {dailyData, saveHealthPreferences} from '../../lib/health-daily';
import {timeZoneSchema} from '../../lib/time-zone-schema';
import {useDeviceZone} from '../use-device-zone';

/**
 * "Your time zone" (Session W Part 17, owner decision W2, TIMEZONE_PHASE4_DECISIONS.md T2-A): one journal zone for every
 * day ZIGoals counts, settings v2 `journalTimeZone`, with the Habits and Health zones as optional overrides under it,
 * keeping their exact meaning. Nothing is written until the person saves; a change never moves a past entry, and a Goal
 * plan keeps the zone it was made with.
 */
export function TimeZoneSettings() {
  const settings = usePrivateStore(DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings);
  const habits = useHabits(), health = useHealth();
  const [message, setMessage] = useState<{text: string; failed?: boolean} | null>(null);
  const device = useDeviceZone(), journal = settings.data.journalTimeZone ?? null;
  const habitsZone = habits.data.timeZone ?? null, healthZone = dailyData(health.data).preferences.timezone;
  const ready = settings.loaded && !settings.error;
  const zoneFrom = (form: HTMLFormElement, name: string) => { const parsed = timeZoneSchema.safeParse(String(new FormData(form).get(name) ?? '').trim()); if (!parsed.success) throw Error('Choose an IANA time zone name, for example Europe/Brussels.'); return parsed.data; };
  async function run(work: () => Promise<unknown>, done: string) {
    try { await work(); setMessage({text: done}); } catch (error) { setMessage({text: error instanceof Error ? error.message : 'Could not save.', failed: true}); }
  }
  const saveJournal = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const form = e.currentTarget; void run(async () => { const zone = zoneFrom(form, 'journalZone'); await settings.update(s => withJournalZone(s, zone)); }, 'Your time zone is saved. Past entries keep their dates.'); };
  const saveHabits = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const form = e.currentTarget; void run(async () => { const zone = zoneFrom(form, 'habitsZone'); await habits.update(d => saveHabitTimezone(d, zone)); }, 'Habits now use their own time zone.'); };
  const saveHealth = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const form = e.currentTarget; void run(async () => { const zone = zoneFrom(form, 'healthZone'); await health.update(d => saveHealthPreferences(d, {...dailyData(d).preferences, timezone: zone})); }, 'Health now uses its own time zone.'); };
  return <section className="panel time-zone-settings" id="time-zone" aria-label="Your time zone">
    <p className="eyebrow">YOUR DAY</p><h2>Your time zone</h2>
    <p>{journal ? <>Your days follow <strong>{journal}</strong>.</> : <>Not written down yet: your days follow this device{device ? ` (${device})` : ''}.</>} Habits, Health and new Goal plans count their days in it.</p>
    {ready && <form className="platform-form" onSubmit={saveJournal}>
      <ZoneField name="journalZone" label="Your time zone" defaultValue={journal ?? device ?? ''}/>
      <button className="secondary" type="submit">Save my time zone</button>
    </form>}
    <p className="fine">Saving it keeps every device on the same days. A change never moves a past entry, and a Goal plan keeps the zone it was made with.</p>
    {ready && habits.loaded && !habits.error && health.loaded && !health.error && <details className="time-zone-overrides">
      <summary>Use a different zone for Habits or Health</summary>
      <form className="platform-form" onSubmit={saveHabits}>
        <p>{habitsZone ? <>Habits use their own zone, {habitsZone}.</> : <>Habits follow your time zone.</>}</p>
        <ZoneField name="habitsZone" label="Habits time zone" defaultValue={habitsZone ?? journal ?? device ?? ''}/>
        <button className="secondary" type="submit">Use this zone for Habits</button>
        {habitsZone && <button className="text-link" type="button" onClick={() => void run(() => habits.update(clearHabitTimezone), 'Habits follow your time zone again.')}>Follow my time zone</button>}
      </form>
      <form className="platform-form" onSubmit={saveHealth}>
        <p>{healthZone ? <>Health uses its own zone, {healthZone}.</> : <>Health follows your time zone.</>}</p>
        <ZoneField name="healthZone" label="Health time zone" defaultValue={healthZone ?? journal ?? device ?? ''}/>
        <button className="secondary" type="submit">Use this zone for Health</button>
        {healthZone && <button className="text-link" type="button" onClick={() => void run(() => health.update(d => saveHealthPreferences(d, {...dailyData(d).preferences, timezone: null})), 'Health follows your time zone again.')}>Follow my time zone</button>}
      </form>
    </details>}
    {message && <p role={message.failed ? 'alert' : 'status'}>{message.text}</p>}
  </section>;
}
