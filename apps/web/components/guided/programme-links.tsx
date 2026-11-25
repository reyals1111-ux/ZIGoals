import Link from 'next/link';
import {PROGRAMME_TITLES, programmeHref, type ProgrammeId} from '../../lib/guided/programme-titles';
import './guided-link.css';

/**
 * Session AW (programmes; owner decision 1d): the way to a written programme from its pillar (Health → Workouts, Sleep,
 * Meditation; Habits → Start from an idea), as a quiet text line among that place's folds, never a new card. It
 * recommends nothing; the programme opens in Guided journeys, where the person chooses to start it or not.
 */
export function ProgrammeLinks({ids, className = ''}: {ids: readonly ProgrammeId[]; className?: string}) {
  return <p className={`guided-link programme-links ${className}`.trim()}>
    {ids.map(id => <Link key={id} className="text-link" href={programmeHref(id)}>{`Programme: ${PROGRAMME_TITLES[id]} →`}</Link>)}
    <span className="guided-link-line">A written plan in Guided journeys: a few steps each day, ticked by you.</span>
  </p>;
}
