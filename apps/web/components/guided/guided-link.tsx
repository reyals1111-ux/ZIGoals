import Link from 'next/link';
import './guided-link.css';

/**
 * Session AJ (item 34, A7): the way to Guided journeys from Goals, Habits, My Universe and search (there is no sidebar
 * entry). A text link with one line saying what it is; it recommends nothing.
 */
export function GuidedJourneysLink({className = ''}: {className?: string}) {
  return <p className={`guided-link ${className}`.trim()}>
    <Link className="text-link" href="/app/guided">Guided journeys →</Link>
    <span className="guided-link-line">Short programs you choose: one small step a day, ticked by you.</span>
  </p>;
}
