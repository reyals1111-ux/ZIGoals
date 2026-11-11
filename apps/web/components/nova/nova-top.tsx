'use client';
import Link from 'next/link';
import {useEffect, useState, type CSSProperties} from 'react';
import {QuickAdd} from '../quick-add';
import {keyLabel, type DockEntry} from '../../lib/nova/dock';
import {isApplePlatform} from '../../lib/nova/command-key';
import {NovaIcon} from './icons';
import {NovaClock} from './nova-stage';

/**
 * Session AK (owner follow-up 3, N12; lane NA): NOVA's top bar. On the left, Exit NOVA (Esc) and "Your day", search,
 * workflows and settings; the local time and date in the centre; on the right the quick-access grid (the dock: every
 * entry a real link or one of the app's own actions, with its single-key shortcut shown while shortcuts are on), then
 * Customize the view and Fullscreen.
 * Release review 2 (R2-3): every icon-only button has its accessible name and a tooltip on hover and keyboard focus; on
 * wide screens Search, Workflows and Customize show their short label too.
 */
export type QuickHandlers = {act: (entry: DockEntry) => void; customize: () => void; fullscreen: () => void};
export function QuickTile({entry, shortcuts, act, labelled = false}: {entry: DockEntry; shortcuts: boolean; act: (entry: DockEntry) => void; labelled?: boolean}) {
  const keys = shortcuts ? keyLabel(entry.key) : undefined, tip = `${entry.label}${keys ? ` · ${keys}` : ''}`;
  const name = `${entry.label}${keys ? `, key ${keys}` : ''}`, cls = `nova-tile${labelled ? ' nova-tile-labelled' : ''}`;
  const inner = <><span className="nova-tile-planet" data-dock={entry.id} aria-hidden="true"><NovaIcon name={entry.id} size={20}/></span>{labelled && <span className="nova-tile-label">{entry.label}</span>}</>;
  // Quick add is the app's own Quick add (its dialog and its words); NOVA only dresses its button as a planet.
  if (entry.id === 'quick-add') return <span className={`${cls} nova-tile-quickadd`} data-tip={labelled ? undefined : tip}><QuickAdd triggerClassName="nova-quickadd"/><span className="nova-tile-planet" aria-hidden="true"><NovaIcon name="quick-add" size={20}/></span>{labelled && <span className="nova-tile-label" aria-hidden="true">{entry.label}</span>}</span>;
  if (entry.action) return <button type="button" className={cls} onClick={() => act(entry)} aria-label={labelled ? undefined : name} data-tip={labelled ? undefined : tip} aria-keyshortcuts={keys}>{inner}</button>;
  return <Link className={cls} href={entry.href!} prefetch={false} aria-label={labelled ? undefined : name} data-tip={labelled ? undefined : tip} aria-keyshortcuts={keys}>{inner}</Link>;
}
/** Session AK P3 (ND-21): the command key in the platform's own words (⌘ on Apple devices, Ctrl elsewhere). */
export function useApplePlatform(): boolean {
  const [apple, setApple] = useState(false);
  useEffect(() => {
    const nav = navigator as Navigator & {userAgentData?: {platform?: string}};
    setApple(isApplePlatform(nav.userAgentData?.platform || nav.platform || nav.userAgent));
  }, []);
  return apple;
}
/**
 * Session AK P3 (ND-4): one row. On the left Exit, Your day, Search and Workflows (in that order of priority; below a
 * comfortable width Exit and Your day show their icon with the name kept for assistive technology); the clock in the
 * middle; on the right one tidy grid of 44 px planets — the dock, Customize, Fullscreen, the mini window — with the
 * right-panel toggle as its last cell, two rows deep (one row on a wide centre).
 */
export function NovaTop({now, persona, entries, shortcuts, fullscreen, fullscreenOk, handlers, onExit, onDay, onSearch, onWorkflows, onMini, miniOpen, onOwnWindow, leftHidden, onShowLeft, rightOpen, onToggleRight, compact, onQuick}: {
  now: Date | null; persona: string; entries: DockEntry[]; shortcuts: boolean; fullscreen: boolean; fullscreenOk: boolean; handlers: QuickHandlers;
  onExit: () => void; onDay: () => void; onSearch: () => void; onWorkflows: () => void; onMini?: () => void; miniOpen: boolean;
  /** Session AM (A3): NOVA in a window of its own (a computer, not already in that window). */
  onOwnWindow?: () => void;
  leftHidden: boolean; onShowLeft: () => void; rightOpen: boolean; onToggleRight: () => void; compact: boolean; onQuick: () => void;
}) {
  const grid = entries.filter(e => !e.hidden).slice(0, 10), cells = grid.length + 2 + (fullscreenOk ? 1 : 0) + (onMini ? 1 : 0) + (onOwnWindow ? 1 : 0);
  return <header className="nova-top">
    <div className="nova-top-left">
      <button type="button" className="nova-exit" onClick={onExit} aria-keyshortcuts="Escape"><NovaIcon name="exit" size={20}/><span className="nova-top-word">Exit {persona}</span><kbd className="nova-kbd" aria-hidden="true">Esc</kbd></button>
      {!compact && <>
        {leftHidden && <button type="button" className="nova-icon-btn" onClick={onShowLeft} aria-label="Show the left panel" data-tip="Show the left panel"><NovaIcon name="right"/></button>}
        <button type="button" className="nova-pill" onClick={onDay}><NovaIcon name="star" size={18}/><span className="nova-top-word">Your day</span></button>
        <button type="button" className="nova-icon-btn nova-icon-btn-labelled" onClick={onSearch} aria-label="Search ZIGoals" data-tip="Search"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></g></svg><span className="nova-icon-label" aria-hidden="true">Search</span></button>
        <button type="button" className="nova-icon-btn nova-icon-btn-labelled" onClick={onWorkflows} aria-label="Workflows" data-tip="Workflows"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="12" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M8.5 6H12a3 3 0 0 1 3 3v.5M8.5 18H12a3 3 0 0 0 3-3v-.5"/></g></svg><span className="nova-icon-label" aria-hidden="true">Workflows</span></button>
      </>}
    </div>
    <NovaClock now={now} compact={compact}/>
    <div className="nova-top-right">
      {compact ? <button type="button" className="nova-icon-btn nova-quick-open" onClick={onQuick} aria-label="Quick access" aria-haspopup="dialog" data-tip="Quick access" data-tip-end=""><NovaIcon name="widgets"/></button> : <>
        <button type="button" className="nova-icon-btn nova-quick-more" onClick={onQuick} aria-label="Quick access" aria-haspopup="dialog" data-tip="Quick access" data-tip-end=""><NovaIcon name="widgets"/></button>
        <nav className="nova-quick" aria-label="Quick access" style={{'--cells': cells, '--cols': Math.ceil(cells / 2)} as CSSProperties}>
          <ul>{grid.map(e => <li key={e.id}><QuickTile entry={e} shortcuts={shortcuts} act={handlers.act}/></li>)}
            <li className="nova-quick-tool-first"><button type="button" className="nova-tile" onClick={handlers.customize} aria-label="Customize the view" data-tip="Customize the view"><span className="nova-tile-planet" aria-hidden="true"><NovaIcon name="yours" size={20}/></span></button></li>
            {onMini && <li><button type="button" className="nova-tile" onClick={onMini} aria-pressed={miniOpen} aria-label={miniOpen ? 'Close the mini window' : 'Open a mini window that stays on top'} data-tip={miniOpen ? 'Close the mini window' : 'Mini window, stays on top'}><span className="nova-tile-planet" aria-hidden="true"><NovaIcon name="mini" size={20}/></span></button></li>}
            {onOwnWindow && <li><button type="button" className="nova-tile" onClick={onOwnWindow} aria-label="Open NOVA in its own window" data-tip="NOVA in its own window"><span className="nova-tile-planet" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="6.5" width="13" height="11" rx="2"/><path d="M8 6.5V5a1.5 1.5 0 0 1 1.5-1.5H19A1.5 1.5 0 0 1 20.5 5v8A1.5 1.5 0 0 1 19 14.5h-2.5M3.5 10h13"/></g></svg></span></button></li>}
            {fullscreenOk && <li><button type="button" className="nova-tile" onClick={handlers.fullscreen} aria-pressed={fullscreen} aria-label="Fullscreen" data-tip={fullscreen ? 'Leave fullscreen · Esc' : 'Fullscreen'}><span className="nova-tile-planet" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d={fullscreen ? 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5' : 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></span></button></li>}
            {/* The right panel's toggle is the grid's last cell (ND-4: aligned to the grid, not hanging beside it). */}
            <li><button type="button" className="nova-tile nova-tile-panel" onClick={onToggleRight} aria-pressed={rightOpen} aria-label={rightOpen ? 'Hide Behind the intelligence' : 'Show Behind the intelligence'} data-tip={rightOpen ? 'Hide Behind the intelligence' : 'Behind the intelligence: brains, voice, usage'}><span className="nova-tile-planet" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M14.5 4.5v15M17 8.5h1M17 11.5h1"/></g></svg></span></button></li>
          </ul>
        </nav>
      </>}
    </div>
  </header>;
}
