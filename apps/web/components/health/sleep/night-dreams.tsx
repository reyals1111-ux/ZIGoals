'use client';
import Link from 'next/link';
import {useDeviceRecord} from '../../ai/use-device-record';
import {JOURNAL} from '../../../lib/journal/schema';
import {dreamsOf} from '../../../lib/journal/dreams';
import {formatDate} from '../../../lib/visual-format';

/**
 * Session AV lane 2 (r3-notes; LEDGER #278, Stoic's dream journal): on a night of the sleep log, "Write down a dream" (the
 * latest night only: the morning's entry) and the night's dream entries, as a count with a link to them in the Journal.
 * The dreams' words stay in the Journal. Its own chunk.
 */
export default function NightDreams({night, latest}: {night: string; latest: boolean}) {
  const journal = useDeviceRecord(JOURNAL);
  if (!journal.loaded) return null;
  const dreams = dreamsOf(journal.data.entries, night), day = formatDate(night);
  if (!latest && !dreams.length) return null;
  return <span className="night-dreams">
    {dreams.length > 0 && <Link className="text-link" href={`/app/journal?day=${dreams[0]!.date}`} aria-label={`${dreams.length === 1 ? '1 dream' : `${dreams.length} dreams`} written for the night ending ${day}: open in the Journal`}>{dreams.length === 1 ? '1 dream written' : `${dreams.length} dreams written`}</Link>}
    {latest && <Link className="text-link" href={`/app/journal?dream=${night}`} aria-label={`${dreams.length ? 'Write down another dream' : 'Write down a dream'} from the night ending ${day}`}>{dreams.length ? 'Write down another dream' : 'Write down a dream'}</Link>}
  </span>;
}
