'use client';
import {useRef, useState} from 'react';
import {useChainChoice} from '../chain/use-chain-choice';

/**
 * Help's topic index (Session AF Gate C, design critique). On a phone the first `shown` topics show and "All topics"
 * reveals the rest in place, handing focus to the first one it revealed; computers and tablets list every topic (help.css).
 * It only shows or hides links: every section is on the page either way, and nothing is read or written.
 * Session AV lane 2 (PK-10): `plain` gives a topic's consumer words (lib/help/chain-help.ts CHAIN_TOPIC_PLAIN), shown
 * until the chain is chosen (lib/chain-choice.ts); the link and its place stay the same.
 */
export function HelpTopics({topics, shown = 6, plain = {}}: {topics: readonly (readonly [id: string, label: string])[]; shown?: number; plain?: Readonly<Record<string, string>>}) {
  const [all, setAll] = useState(false), nav = useRef<HTMLElement>(null), chosen = useChainChoice().chosen;
  const open = () => { setAll(true); requestAnimationFrame(() => nav.current?.querySelectorAll('a')[shown]?.focus()); };
  return <nav ref={nav} id="help-topics" className="help-topics" aria-label="Help topics" data-all={all ? '' : undefined}>
    {topics.map(([id, label], i) => <a key={id} href={`#${id}`} data-more={i >= shown ? '' : undefined}>{chosen ? label : plain[id] ?? label}</a>)}
    {!all && topics.length > shown && <button type="button" className="secondary help-topics-all" onClick={open}>All topics</button>}
  </nav>;
}
