'use client';
import {useState} from 'react';

/**
 * Timezone phase 4 (Session W Part 17, T2-A, "write down the zone the first time it matters"): offered once on Today when
 * Habits or Health already count days in this device's zone and no time zone is written down. One tap saves the device's
 * zone as the person's time zone; "Not now" hides the card on this device. Nothing is written without a tap.
 */
export function JournalZoneCard({zone, onUse, onLater}: {zone: string; onUse: () => Promise<void>; onLater: () => boolean}) {
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  return <section className="panel for-you-card journal-zone-card" aria-labelledby="journal-zone-title">
    <p className="eyebrow">Your time zone</p><h2 id="journal-zone-title">Your days follow this device for now.</h2>
    <p className="fine">Save {zone} as your time zone, and every device counts your Habits, Health and new Goal plans on the same days. Past entries keep their dates.</p>
    <div className="for-you-actions">
      <button type="button" className="primary" disabled={busy} onClick={() => { setBusy(true); setError(''); void onUse().catch(() => setError('Your time zone could not be saved. Try again, or choose it in Settings.')).finally(() => setBusy(false)); }}>Use {zone}</button>
      <button type="button" className="secondary" disabled={busy} onClick={() => { if (!onLater()) setError('This card could not be hidden on this device; it may show once more.'); }}>Not now</button>
    </div>
    {error && <p role="alert">{error}</p>}
  </section>;
}
