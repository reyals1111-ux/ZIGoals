'use client';
import {useDeviceRecord} from '../ai/use-device-record';
import {BACKUP_REMINDER} from '../../lib/backup-reminder';
import {localDate} from '../../lib/local-date';
import {formatDate} from '../../lib/visual-format';

/** Session AK Part 8.9: the person's own "I saved a copy" mark and the monthly reminder's switch (Settings → Your data). */
export default function BackupReminderControls() {
  const r = useDeviceRecord(BACKUP_REMINDER);
  if (!r.loaded) return null;
  const save = (change: Parameters<typeof r.update>[0]) => { try { r.update(change); } catch { /* storage refused; nothing changes */ } };
  return <div className="backup-reminder">
    <p className="fine">{r.data.savedOn ? `You said you saved a copy on ${formatDate(r.data.savedOn)}.` : 'No copy marked yet.'} {r.data.off ? 'The monthly reminder is off.' : 'ZIGoals reminds you gently once a month.'}</p>
    <div className="dh-actions">
      <button type="button" className="secondary" onClick={() => save(x => ({...x, savedOn: localDate()}))}>I saved a copy today</button>
      <button type="button" className="quiet" onClick={() => save(x => ({...x, off: !x.off}))}>{r.data.off ? 'Turn the monthly reminder on' : 'Turn the monthly reminder off'}</button>
    </div>
  </div>;
}
