'use client';
import {useState, type FormEvent} from 'react';
import {usePrivateStore} from '../use-private-store';
import {useHabits} from '../habits/use-habits';
import {useHealth} from '../health/use-health';
import {ZoneField} from '../zone-field';
import {DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings, withJournalZone} from '../../lib/dashboard-settings';
import {clearHabitTimezone, saveHabitTimezone} from '../../lib/habits';
import {dailyData, saveHealthPreferences} from '../../lib/health-daily';
import {readZoneInput} from '../../lib/time-zone-input';
import {useDeviceZone} from '../use-device-zone';
import {plainErrorMessage} from '../../lib/plain-error';

/**
 * "Your time zone" (Session W Part 17, owner decision W2, TIMEZONE_PHASE4_DECISIONS.md T2-A): one journal zone for every
 * day ZIGoals counts, settings v2 `journalTimeZone`, with the Habits and Health zones as optional overrides under it,
 * keeping their exact meaning. Nothing is written until the person saves; a change never moves a past entry, and a Goal
 * plan keeps the zone it was made with.
 */
export function TimeZoneSettings() {
  const settings = usePrivateStore(DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings);
  const habits = useHabits(), health = useHealth();
  const [message, setMessage] = useState<{text: string; failed?: boolean} | null>(null), [fieldError, setFieldError] = useState<{name: string; text: string} | null>(null);
  const device = useDeviceZone(), journal = settings.data.journalTimeZone ?? null;
  const habitsZone = habits.data.timeZone ?? null, healthZone = dailyData(health.data).preferences.timezone;
  const ready = settings.loaded && !settings.error;
  // Session AH (VA10, C8): a typed name is matched whatever its case; an offset or a made-up name says why and what to pick.
  // Session AL (BN-029; P-BN-63): the reason sits under its own field (an offset, a made-up name), the line above the field
  // names the zone as saved ("europe/paris" → Europe/Paris), and an empty field means "follow" (this device, or your time zone).
  const zoneFrom = (form: HTMLFormElement, name: string): string | null | undefined => {
    const raw = String(new FormData(form).get(name) ?? '');
    if (!raw.trim()) return null;
    const read = readZoneInput(raw);
    if ('error' in read) { setFieldError({name, text: read.error}); form.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.focus(); return undefined; }
    return read.zone;
  };
  async function run(work: () => Promise<unknown>, done: string) {
    setFieldError(null);
    try { await work(); setMessage({text: done}); } catch (error) { setMessage({text: plainErrorMessage(error, 'Could not save.'), failed: true}); }
  }
  const saveJournal = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); setMessage(null); const zone = zoneFrom(e.currentTarget, 'journalZone'); if (zone === undefined) return; void run(() => settings.update(s => withJournalZone(s, zone)), zone ? 'Your time zone is saved. Past entries keep their dates.' : `Your days follow this device${device ? ` (${device})` : ''}. Past entries keep their dates.`); };
  const saveHabits = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); setMessage(null); const zone = zoneFrom(e.currentTarget, 'habitsZone'); if (zone === undefined) return; void run(() => zone ? habits.update(d => saveHabitTimezone(d, zone)) : habits.update(clearHabitTimezone), zone ? 'Habits now use their own time zone.' : 'Habits follow your time zone again.'); };
  const saveHealth = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); setMessage(null); const zone = zoneFrom(e.currentTarget, 'healthZone'); if (zone === undefined) return; void run(() => health.update(d => saveHealthPreferences(d, {...dailyData(d).preferences, timezone: zone})), zone ? 'Health now uses its own time zone.' : 'Health follows your time zone again.'); };
  const err = (name: string) => fieldError?.name === name ? fieldError.text : undefined;
  return <section className="panel time-zone-settings" id="time-zone" aria-label="Your time zone">
    <p className="eyebrow">YOUR DAY</p><h2>Your time zone</h2>
    <p>{journal ? <>Your days follow <strong>{journal}</strong>.</> : <>Not written down yet: your days follow this device{device ? ` (${device})` : ''}.</>} Habits, Health and new Goal plans count their days in it.</p>
    {ready && <form className="platform-form" onSubmit={saveJournal}>
      <ZoneField name="journalZone" label="Your time zone" defaultValue={journal ?? device ?? ''} required={false} error={err('journalZone')} hint="Empty means: follow this device."/>
      <button className="secondary" type="submit">Save my time zone</button>
      {/* Session AH (VA10, B-175): back to the device's own zone. */}
      {journal && <button className="text-link" type="button" onClick={() => void run(() => settings.update(s => withJournalZone(s, null)), 'Your days follow this device again. Past entries keep their dates.')}>Follow this device{device ? ` (${device})` : ''}</button>}
    </form>}
    <p className="fine">Saving it keeps every device on the same days. A change never moves a past entry, and a Goal plan keeps the zone it was made with. It sets which day an entry counts for; clock times shown elsewhere stay in this device&rsquo;s own time.</p>
    {ready && habits.loaded && !habits.error && health.loaded && !health.error && <details className="time-zone-overrides">
      <summary>Use a different zone for Habits or Health</summary>
      <form className="platform-form" onSubmit={saveHabits}>
        <p>{habitsZone ? <>Habits use their own zone, {habitsZone}.</> : <>Habits follow your time zone.</>}</p>
        <ZoneField name="habitsZone" label="Habits time zone" defaultValue={habitsZone ?? journal ?? device ?? ''} required={false} error={err('habitsZone')}/>
        <button className="secondary" type="submit">Use this zone for Habits</button>
        {habitsZone && <button className="text-link" type="button" onClick={() => void run(() => habits.update(clearHabitTimezone), 'Habits follow your time zone again.')}>Follow my time zone</button>}
      </form>
      <form className="platform-form" onSubmit={saveHealth}>
        <p>{healthZone ? <>Health uses its own zone, {healthZone}.</> : <>Health follows your time zone.</>}</p>
        <ZoneField name="healthZone" label="Health time zone" defaultValue={healthZone ?? journal ?? device ?? ''} required={false} error={err('healthZone')}/>
        <button className="secondary" type="submit">Use this zone for Health</button>
        {healthZone && <button className="text-link" type="button" onClick={() => void run(() => health.update(d => saveHealthPreferences(d, {...dailyData(d).preferences, timezone: null})), 'Health follows your time zone again.')}>Follow my time zone</button>}
      </form>
    </details>}
    {message && <p role={message.failed ? 'alert' : 'status'}>{message.text}</p>}
  </section>;
}
