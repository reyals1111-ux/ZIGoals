'use client';
import {useState} from 'react';
import {BRIDGES} from '../../lib/export/bridges/loop';
import {getAppStorage} from '../../lib/showcase-storage';
import {storedHabits} from '../../lib/push/device';
import {localDate} from '../../lib/local-date';

/**
 * Settings → Your data → "Take your data to another app" (Session AK Part 8.8, A16): the no-lock-in promise, honestly.
 * Only Loop Habit Tracker has a file it really imports from ZIGoals; the others say what they accept.
 */
export default function ExportBridges() {
  const [said, setSaid] = useState('');
  const loop = async () => {
    try {
      const habits = await storedHabits(getAppStorage());
      if (!habits?.habits.length) { setSaid('No habits on this device yet, so there is nothing to export.'); return; }
      const {habitsToHabitBullCsv} = await import('../../lib/export/bridges/loop');
      const out = habitsToHabitBullCsv(habits, localDate());
      const url = URL.createObjectURL(new Blob([out.csv], {type: 'text/csv;charset=utf-8'}));
      const a = document.createElement('a'); a.href = url; a.download = `zigoals-habits-for-loop-${localDate()}.csv`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setSaid(`${out.habits} ${out.habits === 1 ? 'habit' : 'habits'} with ${out.rows} check-ins saved for Loop. In Loop: Settings → Import data → choose this file.`);
    } catch { setSaid('The file could not be made just now. Your habits are as they were.'); }
  };
  return <section className="panel export-bridges" aria-labelledby="bridges-title">
    <p className="eyebrow">NO LOCK-IN</p>
    <h2 id="bridges-title">Take your data to another app</h2>
    <ul className="bridge-list">{BRIDGES.map(b => <li key={b.app}><strong>{b.app}</strong>: {b.what}{b.file && <> <button type="button" className="secondary" onClick={() => void loop()}>Save the file for Loop</button></>}</li>)}</ul>
    {said && <p role="status">{said}</p>}
    <p className="fine">Files are made on this device and saved where you choose; nothing is sent anywhere.</p>
  </section>;
}
