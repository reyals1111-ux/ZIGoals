'use client';
import {useEffect, useId, useRef, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {BACKUP_REMINDER} from '../../lib/backup-reminder';
import {localDate} from '../../lib/local-date';
import {formatDate} from '../../lib/visual-format';
import {isShowcase} from '../../lib/showcase-storage';
import {EVERY, EVERY_WORDS, nextDueOn, scheduleDue, withSchedule, type Every} from '../../lib/backup-folder/schedule';
import {folderOf, folderSupported, forgetFolder, keepFolder, pickFolder} from '../../lib/backup-folder/handle';

/**
 * Session AV lane 2 (N6 #193, Loop Habit Tracker's automatic backups): Settings → Your data → "A copy on a schedule".
 * How often, and — where the browser can write into a folder (Chrome or Edge on a computer) — the folder chosen once:
 * ZIGoals then writes Export everything there by itself when a copy is due (on opening the app), or asks for one tap
 * when the browser wants permission again. Elsewhere the schedule reminds. The file never leaves the device.
 */
export default function BackupFolder() {
  const id = useId(), r = useDeviceRecord(BACKUP_REMINDER);
  const [supported, setSupported] = useState(false), [folder, setFolder] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<{text: string; failed?: boolean} | null>(null);
  const choose = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let live = true;
    queueMicrotask(() => { if (live) setSupported(folderSupported()); });
    void import('../../lib/backup-folder/run').then(m => folderOf(m.scope())).then(h => { if (live) setFolder(h?.name ?? null); }).catch(() => undefined);
    return () => { live = false; };
  }, []);
  if (!r.loaded) return null;
  if (isShowcase()) return <section className="backup-folder" id="backup-schedule" aria-labelledby={id + 'h'}><h3 id={id + 'h'}>A copy on a schedule</h3><p className="fine">Not in the Showcase: its example records are not yours to keep.</p></section>;
  const today = localDate(), s = r.data.schedule, every = s?.every ?? null;
  const save = (change: Parameters<typeof r.update>[0]) => { try { r.update(change); return true; } catch { setSaid({text: 'This browser could not save your choice. Nothing changed.', failed: true}); return false; } };
  const setEvery = (next: Every | null) => {
    if (!save(x => withSchedule(x, next ? {...(x.schedule ?? {}), every: next} : null))) return;
    if (!next) { void import('../../lib/backup-folder/run').then(m => forgetFolder(m.scope())); setFolder(null); setSaid({text: 'No scheduled copy. The monthly reminder below still works.'}); return; }
    setSaid({text: `A copy ${EVERY_WORDS[next].en}.${supported && !folder ? ' Choose a folder to have it written there by itself.' : ''}`});
  };
  const pick = async () => {
    setSaid(null);
    try {
      const handle = await pickFolder(); if (!handle) return;
      const m = await import('../../lib/backup-folder/run');
      await keepFolder(m.scope(), handle); setFolder(handle.name);
      save(x => withSchedule(x, {...(x.schedule ?? {every: 'week'}), folder: handle.name}));
      setSaid({text: `Copies go into “${handle.name}”.`});
    } catch { setSaid({text: 'That folder could not be used. Choose another one.', failed: true}); }
    finally { choose.current?.focus(); }
  };
  const now = async () => {
    setBusy(true); setSaid({text: 'Making the copy on this device…'});
    try {
      const {runScheduledBackup} = await import('../../lib/backup-folder/run');
      const result = await runScheduledBackup({tap: true, force: true});
      setSaid(result.state === 'written' ? {text: `Saved “${result.name}” in “${folder}”.`} : result.state === 'failed' ? {text: result.message, failed: true} : result.state === 'ask' ? {text: 'The browser did not allow writing into that folder. Choose it again, or allow it when asked.', failed: true} : {text: 'Export everything, above, makes the copy in this browser.'});
    } catch { setSaid({text: 'The copy could not be made. Your records on this device were not changed.', failed: true}); }
    finally { setBusy(false); }
  };
  const forget = () => { void import('../../lib/backup-folder/run').then(m => forgetFolder(m.scope())); setFolder(null); save(x => { if (!x.schedule) return x; const {folder: gone, ...rest} = x.schedule; void gone; return {...x, schedule: rest}; }); setSaid({text: 'The folder is forgotten on this device; the copies already in it stay there.'}); choose.current?.focus(); };
  const due = s ? scheduleDue(r.data, today) : false, next = nextDueOn(r.data, today);
  return <section className="backup-folder" id="backup-schedule" aria-labelledby={id + 'h'}>
    <h3 id={id + 'h'}>A copy on a schedule</h3>
    {!s && <p className="fine">Choose how often, and ZIGoals keeps a copy of everything for you{supported ? ': in a folder you choose once, written by itself when a copy is due' : ''}. The file is the same as Export everything’s and never leaves this device.</p>}
    <fieldset className="backup-folder-every" aria-describedby={id + 'n'}>
      <legend>How often</legend>
      <div className="backup-folder-options">
        <label><input type="radio" name={id + 'every'} checked={!every} onChange={() => setEvery(null)}/><span>Off</span></label>
        {EVERY.map(e => <label key={e}><input type="radio" name={id + 'every'} checked={every === e} onChange={() => setEvery(e)}/><span>{EVERY_WORDS[e].en[0]!.toUpperCase() + EVERY_WORDS[e].en.slice(1)}</span></label>)}
      </div>
      <small id={id + 'n'} className="fine">{supported ? 'When a copy is due, ZIGoals writes it into your folder as you open the app. If the browser asks again for permission, one tap here does it.' : 'This browser cannot write into a folder by itself, so when a copy is due ZIGoals reminds you as you open the app, and Export everything makes it.'}</small>
    </fieldset>
    {s && supported && <div className="dh-actions">
      <p className="fine">{folder ? <>Folder: <strong>{folder}</strong></> : 'No folder chosen yet.'}</p>
      <button ref={choose} type="button" className="secondary" onClick={() => void pick()}>{folder ? 'Change the folder…' : 'Choose a folder…'}</button>
      {folder && <button type="button" className="secondary" disabled={busy} onClick={() => void now()}>Make a copy now</button>}
      {folder && <button type="button" className="quiet" onClick={forget}>Forget the folder</button>}
    </div>}
    {s && <p className="fine">{s.lastOn ? `Last copy written ${formatDate(s.lastOn)}.` : r.data.savedOn ? `Last copy you marked: ${formatDate(r.data.savedOn)}.` : 'No copy yet.'} {due ? 'A copy is due now.' : next ? `Next copy ${formatDate(next)}.` : ''}{s.failedOn ? ` On ${formatDate(s.failedOn)} the copy could not be written; it is tried again.` : ''}</p>}
    {said && <p role={said.failed ? 'alert' : 'status'}>{said.text}</p>}
  </section>;
}
