'use client';
import Link from 'next/link';
import {useState} from 'react';
import {usePrivateStore} from '../use-private-store';
import {DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings} from '../../lib/dashboard-settings';
import {setWrapUp, wrapUpEnabled, wrapUpTime} from '../../lib/wrap-up/engine';
import {formatClock} from '../../lib/visual-format';

/**
 * "Evening wrap-up" (Session W Part 13): off until turned on here. Saved with Today's settings (settings v3 `wrapUp`,
 * synced with them when account sync is on).
 * Session AH (TO2; M-064, M-063, B-198, B-135, M-093, M-120): like every other setting it saves as you change it (it was the
 * only one with a Save button), says so beside the control, and can be started now from here. Turning it on also counts
 * as having set Today up, so its card is never held back behind the first-visit setup.
 */
export function WrapUpSettings() {
  const settings = usePrivateStore(DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings);
  const [message, setMessage] = useState<{text: string; failed?: boolean} | null>(null), [pending, setPending] = useState<boolean | null>(null);
  const ready = settings.loaded && !settings.error, on = pending ?? wrapUpEnabled(settings.data), time = wrapUpTime(settings.data);
  async function save(enabled: boolean, at: string) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(at)) { setMessage({text: 'Choose a time, like 18:00.', failed: true}); return; }
    setPending(enabled);
    try {
      await settings.update(s => ({...setWrapUp(s, enabled, at, new Date().toISOString()), ...(enabled ? {onboarded: true} : {})}));
      setMessage({text: enabled ? `Saved. The evening wrap-up shows on Today from ${formatClock(at)}.` : 'Saved. The evening wrap-up is off.'});
    } catch (error) { setMessage({text: error instanceof Error && error.message ? error.message : 'Could not save.', failed: true}); }
    finally { setPending(null); }
  }
  return <section className="panel wrap-up-settings" id="wrap-up" aria-label="Evening wrap-up">
    <p className="eyebrow">YOUR EVENING</p><h2>Evening wrap-up</h2>
    <p>Off unless you turn it on. From the time you choose, Today offers one card: your day from your own records, how it felt and one intention for tomorrow, which Today shows the next day.</p>
    {ready && <form className="platform-form" onSubmit={e => e.preventDefault()} aria-label="Evening wrap-up choices">
      <label className="checkbox"><input type="checkbox" checked={on} onChange={e => void save(e.currentTarget.checked, time)} />Show the evening wrap-up on Today</label>
      <label className="field">From<input type="time" required defaultValue={time} key={time} onBlur={e => { if (e.currentTarget.value !== time) void save(on, e.currentTarget.value); }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (e.currentTarget.value !== time) void save(on, e.currentTarget.value); } }} /></label>
      {message && <p role={message.failed ? 'alert' : 'status'}>{message.text}</p>}
      {on && <p><Link className="text-link" href="/app?wrap-up=now">Start the wrap-up now →</Link></p>}
    </form>}
    <p className="fine">Saved with your Today settings as you change them. How the day felt is saved in Health, like your other Health records.</p>
  </section>;
}
