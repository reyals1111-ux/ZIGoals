'use client';
import {useId, type ReactNode} from 'react';

/**
 * C-DVG-17 / PR-100: Activity's search field. Its words live on the page (so they stay while the list's chunk loads, and
 * the list's stand-in shows the same field); the list beside it adds the result count and Export CSV.
 */
export function ActivitySearchField({value, onChange, children}: {value: string; onChange: (value: string) => void; children?: ReactNode}) {
 const id = useId();
 return <div className="activity-search-row" role="search" aria-label="Search activity">
  <label className="field activity-search-field" htmlFor={id}><span>Search activity</span><input id={id} type="search" value={value} onChange={e => onChange(e.target.value)} autoComplete="off" enterKeyHint="search" spellCheck={false}/></label>
  {children}
 </div>;
}
