'use client';
import {useEffect, useId, useMemo, useRef, useState, type KeyboardEvent} from 'react';
import {ENERGY} from '../../lib/energy/schema';
import {JOURNAL} from '../../lib/journal/schema';
import {healthGroupIn} from '../../lib/vault/w-homes';
import {isShown} from '../../lib/pages/visibility';
import {isShowcase} from '../../lib/showcase-storage';
import {findDay, levelWord, moveDay, pixelLabel, pixelYear, pixelYears, type Pixel, type PixelMetric} from '../../lib/year-pixels/grid';
import {formatDate} from '../../lib/visual-format';
import {useDeviceRecord} from '../ai/use-device-record';
import {useHealth} from '../health/use-health';
import {usePagesView} from '../pages/use-pages-view';
import {ShowcaseTag} from '../ui/showcase-tag';
import {downloadPixelsPng} from './year-pixels-export';
import './year-pixels.css';
import {wordsOf} from '../../lib/mood-words/schema';

/**
 * Session AK (lane S, item 13): Journal → Year, a year of the person's days, one square each, by the day's mood (Health's
 * moods, while the Health page shows) or energy. The grid is one keyboard stop (arrows move a day or a week, Home/End the
 * year's ends); a tap or Enter shows that day below: its rating, its feeling word and its journal entries. Every square
 * has a label in words. "Save as image" draws the grid on a canvas and downloads a PNG; nothing is sent anywhere.
 */
export default function YearPixels({today}: {today: string}) {
  const energy = useDeviceRecord(ENERGY), journal = useDeviceRecord(JOURNAL), health = useHealth(), healthShown = isShown(usePagesView(), 'health'), id = useId();
  const moods = useMemo(() => healthShown && health.loaded && !health.error ? healthGroupIn(health.data, 'moods')?.days ?? {} : {}, [healthShown, health.loaded, health.error, health.data]);
  const src = useMemo(() => ({moods, energy: energy.data.days, words: wordsOf(energy.data), journalDates: journal.data.entries.map(e => e.date)}), [moods, energy.data, journal.data.entries]);
  const [metric, setMetric] = useState<PixelMetric>(healthShown ? 'mood' : 'energy'), years = useMemo(() => pixelYears(today, src), [today, src]);
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const shownMetric: PixelMetric = healthShown ? metric : 'energy';
  const grid = useMemo(() => pixelYear(year, today, shownMetric, src), [year, today, shownMetric, src]);
  const [at, setAt] = useState<{w: number; d: number} | null>(null), [selected, setSelected] = useState<string | null>(null), [status, setStatus] = useState('');
  const focus = at ?? findDay(grid.weeks, today <= `${year}-12-31` && today >= `${year}-01-01` ? today : `${year}-01-01`) ?? {w: 0, d: 0};
  const gridRef = useRef<HTMLDivElement>(null), scroller = useRef<HTMLDivElement>(null);
  // This year opens on its recent weeks where the grid scrolls (phones), as the habit year view does.
  useEffect(() => {
    const el = scroller.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const share = year === Number(today.slice(0, 4)) ? focus.w / Math.max(1, grid.weeks.length) : 0;
    el.scrollLeft = Math.max(0, share * el.scrollWidth - el.clientWidth + 60);
  }, [year, today, grid.weeks.length]); // eslint-disable-line react-hooks/exhaustive-deps -- once per year shown, not on every move
  const cellId = (w: number, d: number) => `${id}-c-${w}-${d}`;
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); const p = grid.weeks[focus.w]?.[focus.d]; if (p?.inYear) setSelected(p.date); return; }
    const next = moveDay(grid.weeks, focus, event.key);
    if (!next) return;
    event.preventDefault(); setAt(next);
    document.getElementById(cellId(next.w, next.d))?.scrollIntoView({block: 'nearest', inline: 'nearest'});
  };
  const pick = (p: Pixel, w: number, d: number) => { if (!p.inYear) return; setAt({w, d}); setSelected(p.date); };
  const step = (n: number) => {
    if (!selected) return;
    const from = findDay(grid.weeks, selected);
    const next = from && moveDay(grid.weeks, from, n > 0 ? 'ArrowDown' : 'ArrowUp');
    if (next) { setAt(next); setSelected(grid.weeks[next.w]![next.d]!.date); }
  };
  const save = async () => {
    try { await downloadPixelsPng(grid, shownMetric, year); setStatus('The image is saved to your downloads.'); } catch { setStatus('The image could not be made on this device.'); }
  };
  if (!energy.loaded || !journal.loaded) return <p className="fine">Reading your year…</p>;
  const day = selected ? grid.weeks.flat().find(p => p.date === selected && p.inYear) ?? null : null;
  const entries = selected ? journal.data.entries.filter(e => e.date === selected) : [];
  const mood = selected ? moods[selected]?.mood ?? null : null, en = selected ? energy.data.days[selected]?.energy ?? null : null;
  return <div className="year-pixels">
    {isShowcase() && <p className="fine"><ShowcaseTag/> Fictional example days.</p>}
    <div className="year-pixels-controls">
      {healthShown && <div role="group" aria-label="Colour the days by" className="year-pixels-toggle">{(['mood', 'energy'] as const).map(m => <button key={m} type="button" className="secondary" aria-pressed={shownMetric === m} onClick={() => setMetric(m)}>{m === 'mood' ? 'Mood' : 'Energy'}</button>)}</div>}
      <div className="year-pixels-nav"><button type="button" className="quiet" aria-label="Previous year" disabled={year <= years[0]!} onClick={() => { setYear(y => y - 1); setAt(null); setSelected(null); }}>←</button><strong>{year}</strong><button type="button" className="quiet" aria-label="Next year" disabled={year >= years.at(-1)!} onClick={() => { setYear(y => y + 1); setAt(null); setSelected(null); }}>→</button></div>
    </div>
    <p className="year-pixels-summary" role="status">{grid.summary}</p>
    <div className="year-pixels-scroll" ref={scroller}>
      <div className="year-pixels-months" aria-hidden="true" style={{'--weeks': grid.weeks.length} as React.CSSProperties}>{grid.months.map(m => <span key={m.label} style={{gridColumnStart: m.week + 1}}>{m.label}</span>)}</div>
      <div ref={gridRef} className="year-pixels-grid" role="grid" aria-label={`${year}, by ${shownMetric}. Arrow keys move by a day or a week; Enter shows the day.`} tabIndex={0} aria-activedescendant={cellId(focus.w, focus.d)} onKeyDown={onKey}>
        {Array.from({length: 7}, (_, d) => <div key={d} role="row" className="year-pixels-row">
          {grid.weeks.map((week, w) => { const p = week[d]!; return <div key={w} id={cellId(w, d)} role="gridcell" aria-label={p.inYear ? pixelLabel(p, shownMetric) : undefined} aria-selected={p.inYear ? selected === p.date : undefined} aria-hidden={p.inYear ? undefined : true}
            className="year-pixels-cell" data-level={!p.inYear ? 'out' : p.future ? 'ahead' : p.value ?? 'none'} data-entry={p.entries ? '' : undefined} data-focus={focus.w === w && focus.d === d ? '' : undefined} onClick={() => pick(p, w, d)}/>; })}
        </div>)}
      </div>
    </div>
    <ul className="year-pixels-legend" aria-label="Key">{[1, 2, 3, 4, 5].map(v => <li key={v}><i data-level={v} aria-hidden="true"/>{v} {levelWord(shownMetric, v)} ({grid.counts[v - 1]})</li>)}<li><i data-level="none" aria-hidden="true"/>Not rated</li><li><i data-level="none" data-entry="" aria-hidden="true"/>Dot: a journal entry</li></ul>
    {day && <section className="year-pixels-day" aria-labelledby={`${id}-day`}>
      <h3 id={`${id}-day`}>{formatDate(day.date, {weekday: true})}</h3>
      <p>{[mood !== null && healthShown ? `Mood: ${levelWord('mood', mood)} (${mood} of 5)` : null, en !== null ? `Energy: ${levelWord('energy', en)} (${en} of 5)` : null, day.word ? `Feeling: ${day.word}` : null].filter(Boolean).join(' · ') || 'No rating that day.'}</p>
      {entries.length ? <ul className="year-pixels-entries">{entries.map(e => <li key={e.id}><p>{e.text}</p></li>)}</ul> : <p className="fine">No journal entry that day.</p>}
      <p className="year-pixels-day-nav"><button type="button" className="secondary" onClick={() => step(-1)}>Previous day</button><button type="button" className="secondary" onClick={() => step(1)}>Next day</button></p>
    </section>}
    <p className="year-pixels-actions"><button type="button" className="secondary" onClick={() => void save()}>Save as image (PNG)</button></p>
    {status && <p className="fine" role="status">{status}</p>}
    <p className="fine">Weeks run top to bottom, Monday first. A day without a rating stays empty, never low. The image is made on this device.</p>
  </div>;
}
