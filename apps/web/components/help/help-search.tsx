'use client';
import {useEffect, useId, useState} from 'react';

/**
 * Session AH (SE4; D-091, N-032, T-083): search inside Help. Typing narrows the page to the answers that hold every
 * word (question and answer text), opens them, and says how many match; clearing it shows every answer again, as they
 * were. It reads the page only; nothing is sent or stored.
 */
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/**
 * Session AL (BN-109, BN-163): accents are ignored, so "ö" alone became "o" and matched every answer. A search needs
 * at least two letters in a word; shorter words are left out and the line says so. The box keeps 80 characters and
 * says it when a longer text was cut.
 */
export const MAX_HELP_QUERY = 80;
export const helpWords = (query: string) => norm(query).split(/\s+/).filter(w => w.length >= 2);
export function HelpSearch() {
  const [query, setQuery] = useState(''), [count, setCount] = useState<number | null>(null), [cut, setCut] = useState(false), id = useId();
  const short = query.trim() !== '' && helpWords(query).length === 0;
  useEffect(() => {
    const items = [...document.querySelectorAll<HTMLDetailsElement>('.help-page details[id^="help-"]')];
    const words = helpWords(query);
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
    <input id={`${id}-q`} type="search" value={query} onChange={e => { const v = e.target.value; setCut(v.length > MAX_HELP_QUERY); setQuery(v.slice(0, MAX_HELP_QUERY)); }} placeholder="For example: backup, staking, reminders" aria-describedby={`${id}-n`} />
    <p id={`${id}-n`} role="status" className="fine">{cut ? `Help search reads the first ${MAX_HELP_QUERY} characters; the rest was left out. ` : ''}{short ? 'Type at least two letters to search.' : count === null ? '' : count === 0 ? 'No answer holds every word. Try fewer words, or the app’s search (it covers pages and your records too).' : `${count} ${count === 1 ? 'answer matches' : 'answers match'}, opened below.`}</p>
  </div>;
}
