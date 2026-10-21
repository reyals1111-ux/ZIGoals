'use client';
import {useRef, useState} from 'react';

/**
 * Help's topic index (Session AF Gate C, design critique). On a phone the first `shown` topics show and "All topics"
 * reveals the rest in place, handing focus to the first one it revealed; computers and tablets list every topic (help.css).
 * It only shows or hides links: every section is on the page either way, and nothing is read or written.
 */
export function HelpTopics({topics, shown = 6}: {topics: readonly (readonly [id: string, label: string])[]; shown?: number}) {
  const [all, setAll] = useState(false), nav = useRef<HTMLElement>(null);
  const open = () => { setAll(true); requestAnimationFrame(() => nav.current?.querySelectorAll('a')[shown]?.focus()); };
  return <nav ref={nav} className="help-topics" aria-label="Help topics" data-all={all ? '' : undefined}>
    {topics.map(([id, label], i) => <a key={id} href={`#${id}`} data-more={i >= shown ? '' : undefined}>{label}</a>)}
    {!all && topics.length > shown && <button type="button" className="secondary help-topics-all" onClick={open}>All topics</button>}
  </nav>;
}
