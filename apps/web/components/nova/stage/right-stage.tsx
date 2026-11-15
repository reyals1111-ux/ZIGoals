'use client';
import {useId, useRef, useState} from 'react';
import {plainErrorMessage} from '../../../lib/plain-error';
import {showAgain} from '../../../lib/nova/stage/events';
import {asksOf, forgetAsk, forgetAsks, keepsMade, proactiveOn, setKeep, setProactive, type NovaAsk, type NovaStage} from '../../../lib/nova/stage/record';
import {groupAsks, restoreAsks} from '../../../lib/nova/stage/requests';
import {widgetTitle} from '../../../lib/nova/summon/words';
import {calendarDay, formatDate, formatDateTime, formatTime} from '../../../lib/visual-format';
import type {DeviceRecordState} from '../../ai/use-device-record';
import {showStatus, showUndo} from '../../ui/undo-toast';
import {useLocalToday} from '../../use-local-today';
import {NovaIcon} from '../icons';
import type {StageApi} from './use-stage';
import './bars.css';

/**
 * Session AM (ADR-038 D3, D16, D19, A5; art direction §3): what the right bar shows above "Behind the intelligence" —
 * Requests (what the person asked, newest first, Today and Earlier, each one tap from being shown again, a phone's marked
 * so), On the stage (every widget on the stage and in the dock, with Pin, Hide and Close) and Your choices (keep made
 * widgets, gentle cards from the briefs, and where all of this lives). Everything is read from the stage record and the
 * stage itself; every change is the person's own tap, and forgetting offers Undo.
 */
type StageRecord = DeviceRecordState<NovaStage>;
const NOT_SAVED = 'This change could not be saved on this device.', NOT_BACK = 'This could not be put back on this device.';
function saver(record: StageRecord) {
  return (change: (r: NovaStage) => NovaStage): boolean => {
    try { record.update(change); return true; } catch (e) { showStatus(plainErrorMessage(e, NOT_SAVED), {tone: 'error'}); return false; }
  };
}
/**
 * After a row left or moved: the keyboard stays where the person was — the control named, else the list's first control,
 * else the list itself; when the list itself is gone (its last row left), the button of its section.
 */
function keepFocus(box: () => HTMLElement | null, key?: string) {
  const section = box()?.closest('section')?.querySelector<HTMLElement>('h3 button') ?? null;
  requestAnimationFrame(() => {
    const now = box(), active = document.activeElement;
    if (active && active !== document.body && active.isConnected && active !== now) return;
    if (!now?.isConnected) { section?.focus(); return; }
    ((key ? now.querySelector<HTMLElement>(`[data-nb="${key}"]`) : null) ?? now.querySelector<HTMLElement>('button') ?? now).focus();
  });
}

const FIRST = 6;
export function StageRequests({record, persona}: {record: StageRecord; persona: string}) {
  const today = useLocalToday(), box = useRef<HTMLDivElement>(null), [all, setAll] = useState(false), save = saver(record);
  if (!record.loaded) return <p className="nova-fine">Reading your requests…</p>;
  if (record.unreadable) return <p className="nova-fine">Your requests could not be read on this device.</p>;
  const groups = groupAsks(record.data, today), total = groups.today.length + groups.earlier.length;
  if (!total) return <p className="nova-fine">Nothing asked yet. Ask {persona} to show something, such as “my habits this week”, and it is kept here, one tap from being shown again.</p>;
  const room = all ? total : FIRST, shownToday = groups.today.slice(0, room), shownEarlier = groups.earlier.slice(0, Math.max(0, room - shownToday.length));
  const put = (asks: readonly NovaAsk[]) => { try { record.update(r => restoreAsks(r, asks)); } catch { throw Error(NOT_BACK); } };
  const forget = (ask: NovaAsk) => {
    if (!save(r => forgetAsk(r, ask.id))) return;
    showUndo({message: 'That request is forgotten.', undone: 'Your request is back.', restore: () => put([ask])});
    keepFocus(() => box.current);
  };
  const forgetAll = () => {
    const before = [...asksOf(record.data)];
    if (!save(r => forgetAsks(r))) return;
    showUndo({message: 'Your requests are forgotten.', undone: 'Your requests are back.', restore: () => put(before)});
    keepFocus(() => box.current);
  };
  const item = (ask: NovaAsk, isToday: boolean) => {
    const made = (ask.widgets ?? []).map(id => widgetTitle(id));
    return <li key={ask.id} className="nb-ask">
      <p className="nb-ask-text">“{ask.text}”</p>
      <p className="nb-ask-meta">
        <time dateTime={ask.at}>{isToday ? formatTime(ask.at) : formatDateTime(ask.at, {year: false})}</time>
        {ask.device === 'phone' && <span className="nb-ask-phone"><NovaIcon name="phone" size={16}/>from your phone</span>}
        {made.length > 0 && <span>made {made.join(', ')}</span>}
      </p>
      <div className="nb-ask-acts">
        {made.length > 0 && <button type="button" className="nova-btn nova-btn-small" onClick={() => showAgain(ask.id)} aria-label={`Show again: ${ask.text}`}>Show again</button>}
        <button type="button" className="nb-quiet" onClick={() => forget(ask)} aria-label={`Forget: ${ask.text}`}>Forget</button>
      </div>
    </li>;
  };
  return <div className="nb-asks" ref={box} tabIndex={-1}>
    {shownToday.length > 0 && <><h4 className="nb-group">Today</h4><ul className="nb-ask-list">{shownToday.map(a => item(a, true))}</ul></>}
    {shownEarlier.length > 0 && <><h4 className="nb-group">Earlier</h4><ul className="nb-ask-list">{shownEarlier.map(a => item(a, false))}</ul></>}
    <div className="nb-asks-foot">
      {total > FIRST && <button type="button" className="nb-quiet" aria-expanded={all} onClick={() => setAll(a => !a)}>{all ? 'Show fewer' : `Show all ${total}`}</button>}
      <button type="button" className="nb-quiet" onClick={forgetAll}>Forget all requests</button>
    </div>
  </div>;
}

export function StageList({stage, persona}: {stage: StageApi; persona: string}) {
  const today = useLocalToday(), box = useRef<HTMLUListElement>(null);
  if (!stage.loaded) return <p className="nova-fine">Reading the stage…</p>;
  const rows = [...stage.shown.map(w => ({w, docked: false})), ...stage.docked.map(w => ({w, docked: true}))];
  if (!rows.length) return <p className="nova-fine">The stage is clear. Ask {persona} to show something and it appears here, where you can pin it, hide it or close it.</p>;
  const act = (key: string, run: () => void) => () => { run(); keepFocus(() => box.current, key); };
  return <ul className="nb-stage" ref={box} tabIndex={-1}>{rows.map(({w, docked}) => {
    const title = widgetTitle(w.id), since = w.at ? calendarDay(w.at) === today ? formatTime(w.at) : formatDate(w.at, {year: false}) : '';
    return <li key={w.id} className="nb-stage-row" data-docked={docked || undefined}>
      <span className="nb-stage-name">{title}<small>{w.pinned ? 'Pinned' : since ? `Made ${since}` : 'Made on request'}{docked ? ' · in the dock' : ''}</small></span>
      <span className="nb-stage-acts" role="group" aria-label={title}>
        <button type="button" className="nb-act" data-nb={`pin:${w.id}`} data-on={w.pinned || undefined} aria-label={`${title}: ${w.pinned ? 'unpin' : 'pin'}`} title={w.pinned ? 'Unpin' : 'Pin: keep it on the stage'}
          onClick={act(`pin:${w.id}`, () => w.pinned ? stage.unpin(w.id) : stage.pin(w.id))}><NovaIcon name={w.pinned ? 'pinned' : 'pin'} size={20}/></button>
        <button type="button" className="nb-act" data-nb={`dock:${w.id}`} aria-label={`${title}: ${docked ? 'show on the stage' : 'hide in the dock'}`} title={docked ? 'Show on the stage' : 'Hide in the dock'}
          onClick={act(`dock:${w.id}`, () => docked ? stage.show(w.id) : stage.hide(w.id))}><NovaIcon name={docked ? 'show' : 'hide'} size={20}/></button>
        <button type="button" className="nb-act" data-nb={`close:${w.id}`} aria-label={`${title}: close`} title="Close" onClick={act('', () => stage.close(w.id))}><NovaIcon name="close" size={20}/></button>
      </span>
    </li>;
  })}</ul>;
}

export function StageChoices({record, persona, travels}: {record: StageRecord; persona: string;
  /** The last sync in this tab carried NOVA's section for an unlocked account (read by the caller; false when it cannot be told). */
  travels: boolean;
}) {
  const id = useId(), save = saver(record), ready = record.loaded && !record.unreadable, keep = keepsMade(record.data), gentle = proactiveOn(record.data);
  return <>
    <div className="nova-switch-row"><span id={`${id}-keep`}>Keep made widgets until I close them</span>
      <button type="button" role="switch" aria-checked={keep} aria-labelledby={`${id}-keep`} aria-describedby={`${id}-keep-note`} className="nova-switch" disabled={!ready} onClick={() => save(r => setKeep(r, !keep))}><span aria-hidden="true"/></button></div>
    <p className="nova-fine" id={`${id}-keep-note`}>{keep ? `A widget ${persona} makes stays until you close it.` : `Off: a widget ${persona} makes leaves by itself after 12 hours, unless you pin it.`}</p>
    <div className="nova-switch-row"><span id={`${id}-gentle`}>Gentle cards from your briefs</span>
      <button type="button" role="switch" aria-checked={gentle} aria-labelledby={`${id}-gentle`} aria-describedby={`${id}-gentle-note`} className="nova-switch" disabled={!ready} onClick={() => save(r => setProactive(r, !gentle))}><span aria-hidden="true"/></button></div>
    <p className="nova-fine" id={`${id}-gentle-note`}>While {persona} is open, a card may appear for today’s plan, something due today, a streak at risk or a bill due. Never a notification.</p>
    {record.unreadable && <p className="nova-fine">These choices could not be read on this device.</p>}
    <p className="nb-lives" data-travels={travels || undefined}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></g></svg>
      <span>{travels ? 'Your requests, pinned widgets and layout travel end-to-end encrypted with your account.' : 'Your requests, pinned widgets and layout stay on this device only.'}</span>
    </p>
  </>;
}
