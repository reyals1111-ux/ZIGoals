'use client';
import Link from 'next/link';
import {useState} from 'react';
import {recordCount, type KeepCard} from '../../lib/keep-data/rules';
import {useKeepCard} from './use-keep-card';
import {localDate} from '../../lib/local-date';
import './keep-data-card.css';

/**
 * Session AV Part 3 (ADR-045 D-KEEP; owner amendment 5): on Today, below the hero (never on it), at most one calm card about
 * keeping the person's records on their own device. Its own chunk; reads the device only; writes only the person's own
 * answer (Got it, Remind me later, Not now, Starting fresh) or the day of a copy they made here.
 * - iPhone or iPad, in a Safari tab: why (Safari can clear a site's data after seven days without a visit; the Home Screen
 *   app keeps its own storage), then: export a backup here, add ZIGoals to the Home Screen, open it there and restore.
 * - The Home Screen app with nothing in it yet: "Restore a backup from Safari", so nobody thinks their records are gone.
 * - Anywhere, after real new data (25 records since the last copy), a copy at most every two weeks; "Turn these reminders
 *   off" is the same switch as Settings → Your data's monthly reminder.
 * Nothing animates (Motion Off and reduced motion need nothing more). Never in the Showcase (Today leaves it out).
 */
/** `fresh`: a brand-new device (Today shows the welcome): only the Home Screen app's restore offer shows then. */
export default function KeepDataCard({fresh = false}: {fresh?: boolean}) {
  const {card, env: seen, record: r} = useKeepCard(false);
  const [busy, setBusy] = useState(false), [note, setNote] = useState(''), [error, setError] = useState('');
  if (!r.loaded || !seen) return null;
  const today = localDate();
  if ((!card && !note) || (fresh && card !== 'ios-restore' && !note)) return null;
  const save = (change: Parameters<typeof r.update>[0]) => { try { r.update(change); } catch { /* storage refused: the card stays */ } };
  const exportNow = async () => {
    setBusy(true); setError('');
    try {
      const {makeEverythingExport} = await import('../../lib/export/make-everything');
      const made = await makeEverythingExport();
      save(x => ({...x, savedOn: localDate(), countAt: recordCount(window.localStorage)}));
      setNote(['Your backup is downloading. Keep it private: it is readable and holds your records, Health included.', ...made.notes].join(' '));
    } catch (cause) { setError(cause instanceof Error && cause.message ? cause.message : 'The backup could not be made. Nothing was changed.'); }
    finally { setBusy(false); }
  };
  const exportButton = <button type="button" className="primary" disabled={busy} onClick={() => void exportNow()}>{busy ? 'Making your backup…' : 'Export a backup'}</button>;
  const readable = <p className="fine">The backup is one readable file made on this device, with your records, Health included. Nothing is uploaded. Keep it private.</p>;
  const TITLE: Record<NonNullable<KeepCard>, string> = {'ios-move': 'Keep your records on this iPhone', 'ios-start': 'Use ZIGoals from your Home Screen', 'ios-restore': 'Coming from Safari?', copy: 'Keep a copy of what you’ve added'};
  const heading = <h2 id="keep-data-title">{card ? TITLE[card] : 'Backup'}</h2>, body = <div className="keep-data-body">
    {card === 'ios-move' && <>
      <p>Safari can clear a website&rsquo;s records after seven days without a visit. ZIGoals on your Home Screen keeps its own storage, separate from Safari&rsquo;s tabs: export a backup here, then open ZIGoals from your Home Screen and restore it.</p>
      <details className="keep-data-how"><summary>How to move, in 3 steps</summary>
        <ol className="keep-data-steps">
          <li>Export a backup here (the button below).</li>
          <li>Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>
          <li>Open ZIGoals from your Home Screen and restore the backup: Settings &rarr; Your data &rarr; Restore from a backup.</li>
        </ol>
        {readable}
      </details>
      <div className="keep-data-actions">{exportButton}<button type="button" className="secondary" onClick={() => save(x => ({...x, iosNoteDoneOn: today}))}>Got it</button><button type="button" className="quiet" onClick={() => save(x => ({...x, iosNoteLaterOn: today}))}>Remind me later</button></div>
    </>}
    {card === 'ios-start' && <>
      <p>Safari can clear a website&rsquo;s records after seven days without a visit; ZIGoals on your Home Screen keeps its own storage. Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>, then open ZIGoals from its icon and record everything there.</p>
      <div className="keep-data-actions"><button type="button" className="secondary" onClick={() => save(x => ({...x, iosNoteDoneOn: today}))}>Got it</button><button type="button" className="quiet" onClick={() => save(x => ({...x, iosNoteLaterOn: today}))}>Remind me later</button></div>
    </>}
    {card === 'ios-restore' && <>
      <p>ZIGoals on your Home Screen has its own storage, so what you recorded in a Safari tab is not here yet. It is still in Safari. If you exported a backup there, bring it in:</p>
      <div className="keep-data-actions"><Link className="primary" href="/app/settings/data#restore" onClick={() => save(x => ({...x, restoreOfferDoneOn: today}))}>Restore a backup from Safari</Link><button type="button" className="quiet" onClick={() => save(x => ({...x, restoreOfferDoneOn: today}))}>I&rsquo;m starting fresh</button></div>
    </>}
    {card === 'copy' && <>
      <p>Your records live only in this browser. A backup keeps them safe if this browser is cleared or you change devices.</p>
      <div className="keep-data-actions">{exportButton}<button type="button" className="quiet" onClick={() => save(x => ({...x, remindedOn: today}))}>Not now</button></div>
      {readable}
      <p className="fine"><button type="button" className="text-link" onClick={() => save(x => ({...x, off: true}))}>Turn these reminders off</button> (also in Settings &rarr; Your data).</p>
    </>}
    {note && <p role="status">{note} Restore it any time: Settings &rarr; Your data &rarr; Restore from a backup.</p>}
    {error && <p role="alert">{error}</p>}
  </div>;
  // On a phone the card is one row that opens (Today stays short); on a larger screen it stands open.
  return <section className="panel keep-data-card" aria-labelledby="keep-data-title" data-card={card ?? 'done'}>
    {seen.narrow && !note && card !== 'ios-restore' ? <details className="keep-data-fold"><summary>{heading}</summary>{body}</details> : <>{heading}{body}</>}
  </section>;
}
