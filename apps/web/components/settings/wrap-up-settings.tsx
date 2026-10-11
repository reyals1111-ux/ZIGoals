'use client';
import {useState, type FormEvent} from 'react';
import {usePrivateStore} from '../use-private-store';
import {DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings} from '../../lib/dashboard-settings';
import {setWrapUp, wrapUpEnabled, wrapUpTime} from '../../lib/wrap-up/engine';

/**
 * "Evening wrap-up" (Session W Part 13): off until turned on here. Saved with Today's settings (settings v3 `wrapUp`,
 * synced with them when account sync is on); nothing is written until the person saves.
 */
export function WrapUpSettings() {
  const settings = usePrivateStore(DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings);
  const [message, setMessage] = useState<{text: string; failed?: boolean} | null>(null);
  const ready = settings.loaded && !settings.error, on = wrapUpEnabled(settings.data), time = wrapUpTime(settings.data);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget), enabled = f.get('enabled') === 'on', at = String(f.get('time') ?? '');
    try { await settings.update(s => setWrapUp(s, enabled, at, new Date().toISOString())); setMessage({text: enabled ? `The evening wrap-up shows on Today from ${at}.` : 'The evening wrap-up is off.'}); }
    catch (error) { setMessage({text: error instanceof Error && error.message ? error.message : 'Could not save.', failed: true}); }
  }
  return <section className="panel wrap-up-settings" id="wrap-up" aria-label="Evening wrap-up">
    <p className="eyebrow">YOUR EVENING</p><h2>Evening wrap-up</h2>
    <p>Off unless you turn it on. From the time you choose, Today offers one card: your day from your own records, how it felt and one intention for tomorrow, which Today shows the next day.</p>
    {ready && <form className="platform-form" key={`${on}:${time}`} onSubmit={e => void save(e)}>
      <label className="checkbox"><input type="checkbox" name="enabled" defaultChecked={on} />Show the evening wrap-up on Today</label>
      <label className="field">From<input type="time" name="time" required defaultValue={time} /></label>
      <button className="secondary" type="submit">Save wrap-up</button>
    </form>}
    <p className="fine">Saved with your Today settings. How the day felt is saved in Health, like your other Health records.</p>
    {message && <p role={message.failed ? 'alert' : 'status'}>{message.text}</p>}
  </section>;
}
