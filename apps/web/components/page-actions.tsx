'use client';
import Link from 'next/link';
import {askZigi} from './ai/ask';
import './page-actions.css';

/**
 * Session AB-Design (owner request 21): the two header actions every pillar page shares, identical on Goals, Habits,
 * Health and Wealth — "Ask ZIGi about my …" (opens ZIGi with the page's opening words) and "Back up private data ↗"
 * (Settings). Nothing new is stored; they are the same links the pages had, in one place and one look.
 */
export function AskZigiLink({about, className = ''}: {about: string; className?: string}) {
  // Phones show the short words; the accessible name stays the full one.
  return <button type="button" className={`quiet ai-ask-link page-ask-zigi ${className}`.trim()} aria-label={`Ask ZIGi about my ${about}`} onClick={() => askZigi(`About my ${about}: `)}><span className="page-ask-full">Ask ZIGi about my {about}</span><span className="page-ask-short" aria-hidden="true">Ask ZIGi</span></button>;
}
export function BackupLink({className = ''}: {className?: string}) {
  return <Link className={`text-link page-backup-link ${className}`.trim()} href="/app/settings#backup-restore">Back up private data ↗</Link>;
}
/** The pair, in the page header's minor row. */
export function PageMinorActions({about}: {about: string}) {
  return <span className="page-minor-actions"><AskZigiLink about={about}/><BackupLink/></span>;
}
