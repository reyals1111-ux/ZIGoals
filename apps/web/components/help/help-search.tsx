'use client';
import {useEffect, useId, useState} from 'react';

/**
 * Session AH (SE4; D-091, N-032, T-083): search inside Help. Typing narrows the page to the answers that hold every
 * word (question and answer text), opens them, and says how many match; clearing it shows every answer again, as they
 * were. It reads the page only; nothing is sent or stored.
 */
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function HelpSearch() {
  const [query, setQuery] = useState(''), [count, setCount] = useState<number | null>(null), id = useId();
  useEffect(() => {
    const items = [...document.querySelectorAll<HTMLDetailsElement>('.help-page details[id^="help-"]')];
    const words = norm(query).split(/\s+/).filter(Boolean);
    if (!words.length) { for (const d of items) { d.hidden = false; if (d.dataset.searchOpened) { d.open = false; delete d.dataset.searchOpened; } } setCount(null); return; }
    let n = 0;
    for (const d of items) {
      const hit = words.every(w => norm(d.textContent ?? '').includes(w));
      d.hidden = !hit;
      if (hit) { n++; if (!d.open) { d.open = true; d.dataset.searchOpened = '1'; } }
    }
    setCount(n);
  }, [query]);
  return <div className="help-search" role="search">
    <label className="field" htmlFor={`${id}-q`}>Search Help</label>
    <input id={`${id}-q`} type="search" value={query} maxLength={80} onChange={e => setQuery(e.target.value)} placeholder="For example: backup, staking, reminders" aria-describedby={`${id}-n`} />
    <p id={`${id}-n`} role="status" className="fine">{count === null ? '' : count === 0 ? 'No answer holds every word. Try fewer words, or the app’s search (it covers pages and your records too).' : `${count} ${count === 1 ? 'answer matches' : 'answers match'}, opened below.`}</p>
  </div>;
}
