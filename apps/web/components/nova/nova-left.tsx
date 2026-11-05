'use client';
import Link from 'next/link';
import {useId, useState} from 'react';
import type {LeftState} from '../../lib/nova/store';
import {hermesPanel, type HermesStatus} from '../../lib/nova/hermes-record';
import {NovaIcon} from './icons';
import type {Brain} from './status-chips';
import type {NovaCounts} from './use-counts';

/**
 * Session AK (owner follow-up 3, N12; lane NA): NOVA's left panel, in place of the app's sidebar while NOVA is open. The
 * person's space (everything on this device), "Your life", a search for a page or an agent, the pillars and pages with
 * their dots and live counts (Earn only when chosen, a page hidden on this device left out), the agents with a status dot,
 * and at the foot NOVA's line and the brain's status. Open, folded to an icon rail, or hidden (the button cycles; "[" too
 * while single-key shortcuts are on); remembered per device.
 */
export type LeftEntry = {id: string; label: string; href?: string; onPick?: () => void; icon: string; tone: string; count?: number | null; countLabel?: string; section: 'pillars' | 'pages' | 'agents'; status?: 'on' | 'calm' | 'off'; statusWord?: string};
/** The Hermes row's dot and word: ready when reachable, calm with the panel's pill when it answered with a problem. */
function hermesRow(hermes: HermesStatus): {status: 'on' | 'calm' | 'off'; statusWord?: string} {
  const p = hermesPanel(hermes);
  return hermes.reachable ? {status: 'on'} : p.on ? {status: 'calm', statusWord: p.pill.toLowerCase()} : {status: 'off'};
}
const SECTION_LABEL = {pillars: 'Your pillars', pages: 'Your pages', agents: 'Agents'} as const;
export function NovaLeft({state, onCycle, you, brain, counts, pages, earn, chess, persona, onNova, onZigi, zigiStatus, hermes}: {
  state: LeftState; onCycle: () => void; you: string; brain: Brain; counts: NovaCounts; pages: (id: 'goals' | 'habits' | 'health' | 'wealth') => boolean;
  earn: boolean; chess: boolean; persona: string; onNova: () => void; onZigi: () => void; zigiStatus: 'on' | 'calm';
  /** NC's Hermes status (lib/nova/hermes-record.ts); shown only once the person connected their Hermes Agent. */
  hermes: HermesStatus | null;
}) {
  const [query, setQuery] = useState(''), id = useId(), rail = state === 'rail';
  const entries: LeftEntry[] = [
    ...(pages('goals') ? [{id: 'goals', label: 'Goals', href: '/app/goals', icon: 'goals', tone: 'goals', count: counts.goals, countLabel: 'active', section: 'pillars' as const}] : []),
    ...(pages('habits') ? [{id: 'habits', label: 'Habits', href: '/app/habits', icon: 'habits', tone: 'habits', count: counts.habitsLeft, countLabel: 'left today', section: 'pillars' as const}] : []),
    ...(pages('health') ? [{id: 'health', label: 'Health', href: '/app/health', icon: 'health', tone: 'health', section: 'pillars' as const}] : []),
    ...(pages('wealth') ? [{id: 'wealth', label: 'Wealth', href: '/app/wealth', icon: 'wealth', tone: 'wealth', section: 'pillars' as const}] : []),
    {id: 'notes', label: 'Notes', href: '/app/notes', icon: 'notes', tone: 'violet', count: counts.notesInbox, countLabel: 'in the inbox', section: 'pages'},
    {id: 'journal', label: 'Journal', href: '/app/journal', icon: 'notes', tone: 'violet', section: 'pages'},
    {id: 'tasks', label: 'Tasks', href: '/app/tasks', icon: 'agenda', tone: 'cyan', count: counts.tasksDue, countLabel: 'due', section: 'pages'},
    {id: 'agenda', label: 'Agenda', href: '/app/agenda', icon: 'agenda', tone: 'cyan', section: 'pages'},
    {id: 'focus', label: 'Focus and music', href: '/app/journey#focus', icon: 'focus', tone: 'teal', count: counts.focusWeek, countLabel: 'sessions this week', section: 'pages'},
    {id: 'checklist', label: 'Checklist', href: '/app/checklist', icon: 'checklist', tone: 'cyan', section: 'pages'},
    {id: 'review', label: 'Review', href: '/app/review', icon: 'review', tone: 'violet', section: 'pages'},
    ...(earn ? [{id: 'earn', label: 'Earn', href: '/app/earn', icon: 'earn', tone: 'wealth', section: 'pages' as const}] : []),
    ...(chess ? [{id: 'chess', label: 'Chess', href: '/app/chess', icon: 'chess', tone: 'magenta', section: 'pages' as const}] : []),
    {id: 'settings', label: 'Settings', href: '/app/settings', icon: 'settings', tone: 'muted', section: 'pages'},
    {id: 'nova', label: persona, onPick: onNova, icon: 'star', tone: 'violet', section: 'agents', status: brain.kind === 'none' ? 'calm' : 'on'},
    {id: 'zigi', label: 'ZIGi', onPick: onZigi, icon: 'zigi', tone: 'cyan', section: 'agents', status: zigiStatus},
    // EX3 left-over 1: a gateway that answered but refused or wanted the key is "key refused", never "not reachable".
    ...(hermes?.connected ? [{id: 'hermes', label: 'Hermes Agent', href: '/app/nova/hermes', icon: 'test', tone: 'magenta', section: 'agents' as const, ...hermesRow(hermes)}] : []),
  ];
  const q = query.trim().toLowerCase(), found = q ? entries.filter(e => e.label.toLowerCase().includes(q) || e.id.includes(q)) : entries;
  const row = (e: LeftEntry) => {
    const count = typeof e.count === 'number' ? e.count : null, inner = <>
      <span className="nova-left-dot" data-tone={e.tone} data-status={e.status} aria-hidden="true"><NovaIcon name={e.icon} size={rail ? 22 : 18}/></span>
      <span className="nova-left-label">{e.label}</span>
      {/* ND-14: a zero says nothing at a glance; it stays in the row's name for assistive technology. */}
      {count !== null && count > 0 && !rail && <span className="nova-left-count" aria-hidden="true">{count}</span>}
    </>;
    const name = `${e.label}${count !== null ? `, ${count} ${e.countLabel}` : ''}${e.status ? `, ${e.statusWord ?? (e.status === 'on' ? 'ready' : e.status === 'calm' ? 'on-device answers' : 'not reachable')}` : ''}`;
    return <li key={e.id}>{e.href
      ? <Link className="nova-left-row" href={e.href} prefetch={false} aria-label={name} title={rail ? name : undefined}>{inner}</Link>
      : <button type="button" className="nova-left-row" onClick={e.onPick} aria-label={name} title={rail ? name : undefined}>{inner}</button>}</li>;
  };
  // Session AK P3 (ND-14): a fixed head, the pages and agents scrolling in between, and a fixed foot, so NOVA's line and
  // the brain's status always show (at 900 px tall they had fallen below the panel's fold).
  // Session AL sweep 2 (LA-024 / N-LS-05): a named region, not a complementary landmark: this panel sits inside the shell's
  // <main>, where a complementary landmark is not top level (axe landmark-complementary-is-top-level). Still an <aside>.
  return <aside role="region" className="nova-left zg-glass" data-state={state} aria-label={`${persona} navigation`}>
    <div className="nova-left-head">
    <div className="nova-left-top">
      <p className="nova-left-brand"><NovaIcon name="star" size={20}/>{!rail && <span><strong>{persona}</strong><small>Private intelligence</small></span>}</p>
      <button type="button" className="nova-icon-btn" onClick={onCycle} aria-label={rail ? 'Hide the left panel' : 'Fold the left panel to icons'} title={rail ? 'Hide the panel' : 'Fold to icons'}><NovaIcon name="left"/></button>
    </div>
    {!rail && <div className="nova-left-space">
      <p><strong>{you || 'Your space'}</strong><small><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></g></svg> Everything stays on this device</small></p>
    </div>}
    <Link className="nova-left-life" href="/app/today" prefetch={false} aria-label="Your life: all four pillars on Today" title={rail ? 'Your life' : undefined}><NovaIcon name="widgets" size={rail ? 22 : 18}/>{!rail && <span>Your life<small>All four pillars, on Today</small></span>}</Link>
    {!rail && <div className="nova-left-find"><label htmlFor={`${id}-q`} className="sr-only">Find a page or agent</label>
      <input id={`${id}-q`} type="search" value={query} onChange={e => setQuery(e.target.value.slice(0, 60))} placeholder="Find a page or agent…" autoComplete="off"/></div>}
    </div>
    <nav className="nova-left-nav" aria-label="Pages and agents">
      {(['pillars', 'pages', 'agents'] as const).map(section => { const list = found.filter(e => e.section === section); return list.length ? <div key={section} className="nova-left-section">
        {!rail && <h2 className="nova-left-heading">{SECTION_LABEL[section]} <span aria-hidden="true">{list.length}</span></h2>}
        <ul>{list.map(row)}</ul>
      </div> : null; })}
      {q && !found.length && <p className="nova-left-none" role="status">No page or agent matches “{query.trim()}”.</p>}
    </nav>
    {!rail && <div className="nova-left-foot">
      <p className="nova-signature"><strong>{persona}</strong> · your life and your own AI, in one private place.</p>
      <p className="nova-left-brain"><span className="nova-chip-dot" data-kind={brain.kind} aria-hidden="true"/>Brain: {brain.words}</p>
      {/* Session AL Part 14 (EX3 left-over 1): a gateway that answered but refused or wanted the key was reached. */}
      {hermes?.connected && (() => { const p = hermesPanel(hermes); return <p className="nova-left-brain"><span className="nova-chip-dot" data-kind={p.on ? 'on' : 'offline'} aria-hidden="true"/>{p.line}</p>; })()}
    </div>}
  </aside>;
}
