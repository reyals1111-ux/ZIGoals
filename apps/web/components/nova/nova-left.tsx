'use client';
import Link from 'next/link';
import {useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent} from 'react';
import type {LeftState} from '../../lib/nova/store';
import {sendToNova} from '../../lib/nova/bridge';
import {GO_TO_SECTIONS, GO_TO_SECTION_LABEL, foldWords, goToFor, goToMatches, goToPages, inNovaHash, type GoToEntry, type GoToNeed, type GoToSection} from '../../lib/nova/go-to';
import {hermesPanel, type HermesStatus} from '../../lib/nova/hermes-record';
import {APPS_PREFS, appShown} from '../../lib/ui-prefs/apps';
import {useDeviceRecord} from '../ai/use-device-record';
import {NovaIcon} from './icons';
import type {Brain} from './status-chips';
import type {NovaCounts} from './use-counts';
import './stage/bars.css';

/**
 * Session AK (owner follow-up 3, N12; lane NA): NOVA's left panel, in place of the app's sidebar while NOVA is open. The
 * person's space (everything on this device), Today ("Your life"), a field to go anywhere, the pages with their dots and
 * live counts, the agents with a status dot, and at the foot NOVA's line and the brain's status. Open, folded to an icon
 * rail, or hidden (the button cycles; "[" too while single-key shortcuts are on); remembered per device.
 *
 * Session AM (ADR-038 A1; art direction §3): the bar is the fast way to everything in the app. Every page a person can
 * open is here, each only while it is switched on for them (Your pages & buttons, the apps of this device, Earn and
 * Governance by their own switches; nothing of the chain until they chose it), in sections that fold: Your pillars, Your
 * day, Your mind, Money, More and Agents. The field is a "go to": it finds pages and the places inside them by English or
 * Dutch words (lib/nova/go-to.ts) — Enter opens the first, the arrow keys walk the list, and words that name nothing can
 * be handed to NOVA. Which sections are folded is kept in this page's memory only.
 */
export type LeftEntry = {id: string; label: string; where?: string; href?: string; onPick?: () => void; icon: string; tone: string; count?: number | null; countLabel?: string; status?: 'on' | 'calm' | 'off'; statusWord?: string};
/** The pages the dashboard answers for from Your pages & buttons (lib/pages/visibility.ts `isShown`). */
export type LeftPage = 'today' | 'goals' | 'habits' | 'health' | 'wealth' | 'markets' | 'staking' | 'portfolio' | 'ecosystem' | 'activity' | 'music';
type SectionId = GoToSection | 'agents';
/** The Hermes row's dot and word: ready when reachable, calm with the panel's pill when it answered with a problem. */
function hermesRow(hermes: HermesStatus): {status: 'on' | 'calm' | 'off'; statusWord?: string} {
  const p = hermesPanel(hermes);
  return hermes.reachable ? {status: 'on'} : p.on ? {status: 'calm', statusWord: p.pill.toLowerCase()} : {status: 'off'};
}
const TONE: Readonly<Record<string, string>> = {goals: 'goals', habits: 'habits', health: 'health', wealth: 'wealth', day: 'cyan', mind: 'violet', money: 'wealth', more: 'muted'};
/** The icon of a place inside a page: its page's own. */
const WHERE_ICON: Readonly<Record<string, string>> = {Health: 'health', Goals: 'goals', Habits: 'habits', Wealth: 'wealth', Tasks: 'tasks', Notes: 'notes', Journal: 'journal', 'Life review': 'review', Focus: 'focus', Journey: 'journey', Music: 'music', NOVA: 'star', ZIGi: 'zigi', Settings: 'settings', Help: 'help'};
const toneOf = (e: GoToEntry): string => TONE[e.id] ?? (e.section ? TONE[e.section] : e.needs ? TONE[e.needs] : undefined) ?? (e.id === 'focus' ? 'teal' : 'muted');
const APPS: readonly GoToNeed[] = ['tasks', 'notes', 'journal', 'agenda'];
export function NovaLeft({state, onCycle, you, brain, counts, pages, earn, chess, governance = false, chain = false, persona, onNova, onZigi, zigiStatus, hermes}: {
  state: LeftState; onCycle: () => void; you: string; brain: Brain; counts: NovaCounts; pages: (id: LeftPage) => boolean;
  earn: boolean; chess: boolean;
  /** Governance's own switch on this device (off until the person shows it); it still follows Staking. */
  governance?: boolean;
  /** Whether the person chose the chain (lib/chain-choice.ts): until then no chain word shows. */
  chain?: boolean;
  persona: string; onNova: () => void; onZigi: () => void; zigiStatus: 'on' | 'calm';
  /** NC's Hermes status (lib/nova/hermes-record.ts); shown only once the person connected their Hermes Agent. */
  hermes: HermesStatus | null;
}) {
  const [query, setQuery] = useState(''), id = useId(), rail = state === 'rail';
  // In this page's memory only: Money and More start folded, so the pillars, the day and the agents are in view.
  const [folded, setFolded] = useState<ReadonlySet<SectionId>>(() => new Set<SectionId>(['money', 'more']));
  const field = useRef<HTMLInputElement>(null), results = useRef<HTMLUListElement>(null);
  const apps = useDeviceRecord(APPS_PREFS);
  const has = (need: GoToNeed): boolean => need === 'earn' ? earn : need === 'chess' ? chess : need === 'chain' ? chain
    : need === 'governance' ? governance && pages('staking')
    : APPS.includes(need) ? appShown(apps.data, need as 'tasks' | 'notes' | 'journal' | 'agenda') : pages(need as LeftPage);
  const open = goToFor(has), named = (label: string) => label.replace(/\bNOVA\b/g, persona);
  const countOf: Readonly<Record<string, [number | null, string]>> = {goals: [counts.goals, 'active'], habits: [counts.habitsLeft, 'left today'], notes: [counts.notesInbox, 'in the inbox'], tasks: [counts.tasksDue, 'due'], focus: [counts.focusWeek, 'sessions this week']};
  const entryOf = (e: GoToEntry): LeftEntry => ({id: e.id, label: named(e.label), href: e.href, icon: e.icon ?? WHERE_ICON[e.where ?? ''] ?? 'star', tone: toneOf(e), ...(e.where ? {where: named(e.where)} : {}), ...(countOf[e.id] && e.section ? {count: countOf[e.id]![0], countLabel: countOf[e.id]![1]} : {})});
  const agents: LeftEntry[] = [
    {id: 'nova', label: persona, onPick: onNova, icon: 'star', tone: 'violet', status: brain.kind === 'none' ? 'calm' : 'on'},
    {id: 'zigi', label: 'ZIGi', onPick: onZigi, icon: 'zigi', tone: 'cyan', status: zigiStatus},
    // EX3 left-over 1: a gateway that answered but refused or wanted the key is "key refused", never "not reachable".
    ...(hermes?.connected ? [{id: 'hermes', label: 'Hermes Agent', href: '/app/nova/hermes', icon: 'test', tone: 'magenta', ...hermesRow(hermes)}] : []),
  ];
  const today = goToPages(open, 'today')[0];
  const everySection: {id: SectionId; label: string; list: LeftEntry[]}[] = [
    ...GO_TO_SECTIONS.map(s => ({id: s, label: GO_TO_SECTION_LABEL[s], list: goToPages(open, s).map(entryOf)})),
    {id: 'agents', label: 'Agents', list: agents},
  ];
  const sections = everySection.filter(s => s.list.length);

  // The "go to": the agents by name first, then the pages and places the words find (an agent's own page is not listed twice).
  const words = query.trim(), q = foldWords(words);
  const who = q ? agents.filter(a => foldWords(a.label).split(' ').some(w => w.startsWith(q))) : [];
  const found: LeftEntry[] = q ? [...who, ...goToMatches(words, has, 8).filter(e => !who.some(a => a.href === e.href)).map(entryOf)] : [];
  const ask = () => { if (sendToNova(words)) setQuery(''); };
  const links = () => [...(results.current?.querySelectorAll<HTMLElement>('a, button') ?? [])];
  const onFieldKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!q) return;
    if (e.key === 'Enter') { e.preventDefault(); const first = links()[0]; if (first) first.click(); else ask(); }
    else if (e.key === 'ArrowDown') { const first = links()[0]; if (first) { e.preventDefault(); first.focus(); } }
    // Escape empties the field first (NOVA's own Escape, which leaves the page, never sees this one).
    else if (e.key === 'Escape') { e.preventDefault(); setQuery(''); }
  };
  const onResultsKey = (e: ReactKeyboardEvent<HTMLUListElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End' && e.key !== 'Escape') return;
    const list = links(), at = list.indexOf(document.activeElement as HTMLElement);
    e.preventDefault();
    if (e.key === 'Escape' || (e.key === 'ArrowUp' && at <= 0)) { field.current?.focus(); if (e.key === 'Escape') setQuery(''); return; }
    (e.key === 'Home' ? list[0] : e.key === 'End' ? list.at(-1) : list[Math.min(list.length - 1, at + (e.key === 'ArrowDown' ? 1 : -1))])?.focus();
  };
  const toggle = (s: SectionId) => setFolded(now => { const next = new Set(now); if (next.has(s)) next.delete(s); else next.add(s); return next; });

  const row = (e: LeftEntry, first = false) => {
    const count = typeof e.count === 'number' ? e.count : null, inner = <>
      <span className="nova-left-dot" data-tone={e.tone} data-status={e.status} aria-hidden="true"><NovaIcon name={e.icon} size={rail ? 22 : 18}/></span>
      <span className="nova-left-label">{e.label}{e.where && <small className="nb-where">{e.where}</small>}</span>
      {/* ND-14: a zero says nothing at a glance; it stays in the row's name for assistive technology. */}
      {count !== null && count > 0 && !rail && <span className="nova-left-count" aria-hidden="true">{count}</span>}
      {first && <kbd className="nb-enter" aria-hidden="true">Enter</kbd>}
    </>;
    const name = `${e.label}${e.where ? `, in ${e.where}` : ''}${count !== null ? `, ${count} ${e.countLabel}` : ''}${e.status ? `, ${e.statusWord ?? (e.status === 'on' ? 'ready' : e.status === 'calm' ? 'on-device answers' : 'not reachable')}` : ''}`;
    const shared = {className: 'nova-left-row', 'aria-label': name, title: rail ? name : undefined, 'data-first': first || undefined};
    const hash = e.href ? inNovaHash(e.href) : null;
    return <li key={e.id}>{hash
      // A place inside NOVA itself opens here, as the page's own links do (the address changes, the page hears it).
      ? <a {...shared} href={hash} onClick={() => setQuery('')}>{inner}</a>
      : e.href ? <Link {...shared} href={e.href} prefetch={false}>{inner}</Link>
      : <button type="button" {...shared} onClick={() => { e.onPick?.(); setQuery(''); }}>{inner}</button>}</li>;
  };
  // Session AK P3 (ND-14): a fixed head, the pages and agents scrolling in between, and a fixed foot, so NOVA's line and
  // the brain's status always show (at 900 px tall they had fallen below the panel's fold).
  // Session AL sweep 2 (LA-024 / N-LS-05): a named region, not a complementary landmark: this panel sits inside the shell's
  // <main>, where a complementary landmark is not top level (axe landmark-complementary-is-top-level). Still an <aside>.
  return <aside role="region" className="nova-left zg-glass" data-state={state} aria-label={`${persona} navigation`}>
    <span className="sh-inner" aria-hidden="true"/>
    <div className="nova-left-head">
    <div className="nova-left-top">
      <p className="nova-left-brand"><NovaIcon name="star" size={20}/>{!rail && <span><strong>{persona}</strong><small>Private intelligence</small></span>}</p>
      <button type="button" className="nova-icon-btn" onClick={onCycle} aria-label={rail ? 'Hide the left panel' : 'Fold the left panel to icons'} title={rail ? 'Hide the panel' : 'Fold to icons'}><NovaIcon name="left"/></button>
    </div>
    {!rail && <div className="nova-left-space">
      <p><strong>{you || 'Your space'}</strong><small><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></g></svg> Everything stays on this device</small></p>
    </div>}
    {today && <Link className="nova-left-life" href={today.href} prefetch={false} aria-label="Your life: all four pillars on Today" title={rail ? 'Today: your life, all four pillars' : undefined}><NovaIcon name="today" size={rail ? 22 : 20}/>{!rail && <span>Today<small>Your life, all four pillars</small></span>}</Link>}
    {!rail && <div className="nova-left-find nb-find"><label htmlFor={`${id}-q`} className="sr-only">Go to a page, a place inside one or an agent</label>
      <span className="nb-find-icon" aria-hidden="true"><NovaIcon name="search" size={18}/></span>
      <input ref={field} id={`${id}-q`} type="search" value={query} onChange={e => setQuery(e.target.value.slice(0, 60))} onKeyDown={onFieldKey} placeholder="Go to… sleep, bills" autoComplete="off" enterKeyHint="go" aria-describedby={`${id}-hint`}/>
      <span id={`${id}-hint`} className="sr-only">Type a page or a place. Enter opens the first one found; the down arrow moves into the list.</span></div>}
    </div>
    <nav className="nova-left-nav" aria-label="Pages and agents">
      {q && !rail ? <>
        <p className="sr-only" role="status">{found.length ? `${found.length} found. Enter opens ${found[0]!.label}.` : `Nothing by that name. You can ask ${persona} instead.`}</p>
        {found.length ? <ul className="nb-results" ref={results} onKeyDown={onResultsKey}>{found.map((e, i) => row(e, i === 0))}</ul>
          : <div className="nb-none"><p>Nothing by that name. Ask {persona} instead.</p>
            <button type="button" className="nova-btn" onClick={ask} aria-label={`Ask ${persona}: ${words}`}><NovaIcon name="star" size={18}/>Ask {persona}</button></div>}
      </> : sections.map(s => { const shut = !rail && folded.has(s.id); return <div key={s.id} className="nova-left-section nb-section" data-folded={shut || undefined}>
        {!rail && <h2 className="nb-heading"><button type="button" className="nb-fold" aria-expanded={!shut} aria-controls={`${id}-${s.id}`} onClick={() => toggle(s.id)}>
          <span>{s.label}</span><span className="nb-fold-count" aria-hidden="true">{s.list.length}</span><NovaIcon name={shut ? 'down' : 'up'} size={16}/></button></h2>}
        <ul id={`${id}-${s.id}`} hidden={shut}>{s.list.map(e => row(e))}</ul>
      </div>; })}
    </nav>
    {!rail && <div className="nova-left-foot">
      <p className="nova-signature"><strong>{persona}</strong> · your life and your own AI, in one private place.</p>
      <p className="nova-left-brain"><span className="nova-chip-dot" data-kind={brain.kind} aria-hidden="true"/>Brain: {brain.words}</p>
      {/* Session AL Part 14 (EX3 left-over 1): a gateway that answered but refused or wanted the key was reached. */}
      {hermes?.connected && (() => { const p = hermesPanel(hermes); return <p className="nova-left-brain"><span className="nova-chip-dot" data-kind={p.on ? 'on' : 'offline'} aria-hidden="true"/>{p.line}</p>; })()}
    </div>}
  </aside>;
}
