import Link from 'next/link';

/**
 * Session AK (F5d): the agenda's door from Today and Help, exported for the lead to mount — one text link, no data read,
 * so it costs Today nothing. `/app/agenda` loads its own chunk when followed.
 */
export const AGENDA_ROUTE = '/app/agenda';
export function AgendaLink({className = 'text-link', children = 'Your agenda: the days ahead →'}: {className?: string; children?: React.ReactNode}) {
  return <Link prefetch={false} className={className} href={AGENDA_ROUTE}>{children}</Link>;
}
export default AgendaLink;
