'use client';
import {useId, useState} from 'react';
import {newHealthId, type HealthData} from '../../../lib/health';
import {removeMealPlan} from '../../../lib/health-daily';
import {FOOD_PLUS, MAX_MENUS} from '../../../lib/food-plus/schema';
import {keepWeekAsMenu, menuNameIssue, menusOf, menuSize, placeMenu, removeMenu, weekItems, type Menu} from '../../../lib/food-plus/menus';
import {formatDate, formatWeekday} from '../../../lib/visual-format';
import {useDeviceRecord} from '../../ai/use-device-record';
import {deviceSettingFailureMessage} from '../../../lib/storage-error-copy';
import type {HealthPerform} from '../aa-types';
import './food-plus.css';

/**
 * Session AW (X5, LEDGER #454; Paprika's menus): in the Meal planner, "Menus": "Keep this week as a menu" (the week shown,
 * by name, up to 12 kept on this device in `zigoals:food-plus:v1` `menus`), and each kept menu placed on the week shown in
 * one step — ordinary meal plans, each still logged with a tap, the grocery list following them as before — with Undo.
 */
const dayLabel = (d: string) => `${formatWeekday(d)} ${Number(d.slice(8))}`;
export default function MenusFold({data, weekStart, today, perform}: {data: HealthData; weekStart: string; today: string; perform: HealthPerform}) {
  const id = useId(), record = useDeviceRecord(FOOD_PLUS), [name, setName] = useState(''), [issue, setIssue] = useState(''), [note, setNote] = useState('');
  const [placed, setPlaced] = useState<{name: string; ids: string[]} | null>(null), [removed, setRemoved] = useState<{menu: Menu} | null>(null);
  if (!record.loaded) return <p className="fine" role="status">Opening your menus…</p>;
  const menus = menusOf(record.data), planned = weekItems(data, weekStart).length, week = `the week of ${dayLabel(weekStart)}`;
  const keep = () => {
    const bad = menuNameIssue(name); setIssue(bad); if (bad) return;
    const menuId = `menu-${newHealthId().slice(7)}`;
    try { keepWeekAsMenu(record.data, data, weekStart, name, {id: menuId, today}); } catch (cause) { setIssue(cause instanceof Error ? cause.message : 'This menu could not be kept.'); return; }
    try { record.update(r => keepWeekAsMenu(r, data, weekStart, name, {id: menuId, today})); setNote(`“${name.trim()}” kept: ${planned} ${planned === 1 ? 'meal' : 'meals'} from ${week}.`); setPlaced(null); setRemoved(null); setName(''); }
    catch (cause) { setIssue(`Not kept on this device. ${deviceSettingFailureMessage(cause)}`); }
  };
  const place = (menu: Menu) => {
    const preview = placeMenu(data, menu, weekStart, new Date().toISOString(), newHealthId);
    if (!preview.planIds.length) { setNote(preview.missing.length ? `Nothing placed: ${preview.missing.join(', ')} ${preview.missing.length === 1 ? 'is' : 'are'} no longer saved.` : `“${menu.name}” is on ${week} already.`); return; }
    const ids: string[] = [];
    const words = `“${menu.name}” placed on ${week}: ${preview.planIds.length} ${preview.planIds.length === 1 ? 'meal' : 'meals'} planned${preview.already ? `, ${preview.already} planned already` : ''}${preview.missing.length ? `; left out (no longer saved): ${preview.missing.join(', ')}` : ''}. Nothing logged as eaten.`;
    void perform(latest => { const r = placeMenu(latest, menu, weekStart, new Date().toISOString(), newHealthId); ids.splice(0, ids.length, ...r.planIds); return r.data; }, words, () => { setRemoved(null); setPlaced({name: menu.name, ids: [...ids]}); setNote(words); });
  };
  const undoPlace = () => { if (!placed) return; const {ids, name: n} = placed; void perform(latest => ids.reduce((d, pid) => d.daily?.plans.some(p => p.id === pid) ? removeMealPlan(d, pid) : d, latest), `“${n}” taken off ${week} again.`, () => { setPlaced(null); setNote(`“${n}” taken off ${week} again.`); }); };
  return <div className="food-plus-menus">
    <p className="fine">Keep a week of planned meals by name, then place it on any week in one step. Each meal is planned as usual: logged only when you tap Log, and the grocery list follows it.</p>
    <form className="health-micro-edit" noValidate aria-label="Keep this week as a menu" onSubmit={e => { e.preventDefault(); keep(); }}>
      <label className="field"><span>Menu name</span><input type="text" value={name} maxLength={80} aria-invalid={issue ? true : undefined} aria-describedby={issue ? `${id}-issue` : undefined} onChange={e => { setName(e.target.value); setIssue(''); }} placeholder="Soup week"/></label>
      <button type="submit" className="secondary" aria-disabled={!planned || undefined}>Keep this week as a menu</button>
      {issue && <p className="field-error" id={`${id}-issue`} role="alert">{issue}</p>}
    </form>
    {!planned && <p className="fine">Nothing is planned for {week} yet: plan a meal above first, or place a kept menu here.</p>}
    {menus.length ? <ul className="health-micro-list" aria-label="Your menus">{menus.map(m => <li key={m.id}>
      <div><strong>{m.name}</strong> <small>{menuSize(m)} · kept {formatDate(m.keptOn, {year: m.keptOn.slice(0, 4) !== today.slice(0, 4)})}</small></div>
      <div className="actions" style={{margin: 0}}>
        <button type="button" className="secondary" aria-label={`Place ${m.name} on ${week}`} onClick={() => place(m)}>Place on this week</button>
        <button type="button" className="quiet" aria-label={`Remove the menu ${m.name}`} onClick={() => { try { record.update(r => removeMenu(r, m.id)); setRemoved({menu: m}); setPlaced(null); setNote(`Menu “${m.name}” removed; its planned meals stay as they are.`); } catch (cause) { setNote(`Not kept on this device. ${deviceSettingFailureMessage(cause)}`); } }}>Remove</button>
      </div>
    </li>)}</ul> : <p className="fine">No menu kept yet. Plan a week you like, then keep it here by name.</p>}
    {note && <p className="fine" role="status">{note}{placed && <> <button type="button" className="quiet" onClick={undoPlace}>Undo</button></>}{removed && !placed && <> <button type="button" className="quiet" onClick={() => { try { record.update(r => ({...r, menus: [...menusOf(r), removed.menu].slice(0, MAX_MENUS)})); setNote(`Menu “${removed.menu.name}” is back.`); setRemoved(null); } catch (cause) { setNote(`Not kept on this device. ${deviceSettingFailureMessage(cause)}`); } }}>Undo</button></>}</p>}
  </div>;
}
