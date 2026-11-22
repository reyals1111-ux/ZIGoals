'use client';
import {useId, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {showStatus, showUndo} from '../ui/undo-toast';
import type {useTaskList} from './use-task-list';
import {addArea, archiveSection, removeArea, renameArea, setProjectArea} from '../../lib/tasks/layouts';
import {BUILT_IN_TEMPLATES, MAX_REPEATS, MAX_TEMPLATES, TASK_TEMPLATES, applyTemplate, removeTemplate, saveTemplate, templateFromProject, type RepeatEvery, type TaskTemplate} from '../../lib/tasks/templates';
import {addRepeat, nextRepeat, pauseRepeat, removeRepeat, repeatIssue, repeatProjectName, repeatWords, repeatsOf, restoreRepeat} from '../../lib/tasks/repeat-projects';
import {undoOfChange} from '../../lib/tasks/undo';
import type {Tasks} from '../../lib/tasks/schema';
import {formatNumber} from '../../lib/visual-format';

/**
 * Session AV lane 2 (tasks; Things' Areas, TickTick's folders, Sunsama's contexts, Todoist's templates), in the Tasks
 * views' planning chunk:
 * - Areas (LEDGER #12, #20, #28): name an area (Work, Home), put projects in it; the Tasks page groups projects under their
 *   area and its "Area" choice narrows every view to one area. A finished section is archived as one block.
 * - Templates (LEDGER #10, #17): start a project from a template (built in, or saved from one of your projects), with its
 *   days counted from a start day you choose. One Undo takes the new project back.
 * - Repeating projects (Session AV lane 2, rest, LEDGER #17; Things): "Repeats" every week, month or few days makes the
 *   project now and again each time its day comes round (when Tasks opens); pause or stop it in the list below.
 */
type List = ReturnType<typeof useTaskList>;
export default function TasksOrganise({list, record, today}: {list: List; record: Tasks; today: string}) {
  const id = useId(), [name, setName] = useState(''), [error, setError] = useState(''), [renaming, setRenaming] = useState<string | null>(null), [rename, setRename] = useState('');
  const areas = record.areas ?? [], projects = (record.projects ?? []).filter(p => !p.archived), sections = record.sections ?? [];
  const add = () => { if (!name.trim()) { setError('Give the area a name.'); return; } if (list.change(r => addArea(r, name, `area_${crypto.randomUUID()}`), `Area “${name.trim()}” added. Put projects in it below.`, 'The area is taken back.')) { setName(''); setError(''); } };
  return <section className="tasks-plan-view" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>Areas and templates</h3>
    <h4>Areas</h4>
    <p className="fine">An area holds projects that belong together, like Work, Home or Health. Choose an area at the top of Tasks to see only its tasks, in every view.</p>
    {areas.length > 0 && <ul className="tasks-areas" aria-label="Areas">{areas.map(a => <li key={a.id}>
      {renaming === a.id ? <form className="tasks-inline-form" noValidate onSubmit={e => { e.preventDefault(); if (list.change(r => renameArea(r, a.id, rename), `Renamed to “${rename.trim()}”.`, 'The name is back.')) setRenaming(null); }}>
        <label className="field"><span>New name for “{a.name}”</span><input dir="auto" value={rename} maxLength={60} autoFocus onChange={e => setRename(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') setRenaming(null); }} /></label>
        <button type="submit" className="secondary" disabled={!rename.trim()}>Rename</button><button type="button" className="quiet" onClick={() => setRenaming(null)}>Cancel</button></form>
        : <><strong dir="auto">{a.name}</strong> <small>{formatNumber(projects.filter(p => p.areaId === a.id).length)} projects</small>
          <button type="button" className="text-link" aria-label={`Rename the area “${a.name}”`} onClick={() => { setRenaming(a.id); setRename(a.name); }}>Rename</button>
          <button type="button" className="text-link" aria-label={`Remove the area “${a.name}”`} onClick={() => list.change(r => removeArea(r, a.id), `Removed the area “${a.name}”; its projects stay, outside any area.`, 'The area is back.')}>Remove</button></>}
    </li>)}</ul>}
    <form className="tasks-inline-form" noValidate onSubmit={e => { e.preventDefault(); add(); }}>
      <label className="field"><span>New area</span><input dir="auto" value={name} maxLength={60} placeholder="Work" aria-invalid={error ? true : undefined} onChange={e => { setName(e.target.value); setError(''); }} /></label>
      <button type="submit" className="secondary">Add area</button>
      {error && <p className="tasks-field-error" role="alert">{error}</p>}
    </form>
    {areas.length > 0 && projects.length > 0 && <ul className="tasks-area-projects" aria-label="Projects and their areas">{projects.map(p => <li key={p.id}>
      <label className="field"><span>{p.name}</span><select value={p.areaId ?? ''} onChange={e => { const v = e.target.value || null; list.change(r => setProjectArea(r, p.id, v), v ? `“${p.name}” is in “${areas.find(a => a.id === v)?.name}”.` : `“${p.name}” is outside any area.`, 'Moved back.'); }}>
        <option value="">No area</option>{areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label></li>)}</ul>}
    {sections.length > 0 && <>
      <h4>Sections</h4>
      <p className="fine">Archive a finished section as one block: it leaves the project’s list, its tasks stay in the project.</p>
      <ul className="tasks-areas" aria-label="Sections">{sections.map(s => <li key={s.id}><strong dir="auto">{s.name}</strong> <small>{record.projects?.find(p => p.id === s.projectId)?.name ?? ''}{s.archived ? ' · archived' : ''}</small>
        <button type="button" className="text-link" aria-label={`${s.archived ? 'Bring back' : 'Archive'} the section “${s.name}”`} onClick={() => list.change(r => archiveSection(r, s.id, !s.archived), s.archived ? `“${s.name}” is back.` : `Archived the section “${s.name}”.`, 'Undone.')}>{s.archived ? 'Bring back' : 'Archive'}</button></li>)}</ul>
    </>}
    <Templates list={list} record={record} today={today} />
  </section>;
}

function Templates({list, record, today}: {list: List; record: Tasks; today: string}) {
  const tid = useId(), own = useDeviceRecord(TASK_TEMPLATES), [chosen, setChosen] = useState(''), [start, setStart] = useState(today), [projectName, setProjectName] = useState(''), [from, setFrom] = useState('');
  const all: {id: string; name: string; about: string; items: TaskTemplate['items']; own: boolean}[] = [...BUILT_IN_TEMPLATES.map(t => ({...t, own: false})), ...own.data.items.map(t => ({id: t.id, name: t.name, about: `${t.items.length} tasks, saved from a project`, items: t.items, own: true}))];
  const template = all.find(t => t.id === chosen), projects = (record.projects ?? []).filter(p => !p.archived);
  const [every, setEvery] = useState<'' | RepeatEvery>(''), [days, setDays] = useState('14'), [repeatError, setRepeatError] = useState('');
  const use = () => {
    if (!template) return;
    if (every) { makeRepeating(); return; }
    let made = '';
    if (list.change(r => { const out = applyTemplate(r, template, {name: projectName || template.name, start: start || undefined, today, at: new Date(), ids: () => crypto.randomUUID()}); made = out.projectId; return out.record; }, `Made the project “${projectName.trim() || template.name}” with ${template.items.length} tasks.`, 'The project from the template is taken back.')) {
      setChosen(''); setProjectName(''); void made;
    }
  };
  // A repeating project: this period's project now, the repeat kept with the templates; one Undo takes back both.
  const makeRepeating = () => {
    if (!template || !every) return;
    if (own.unreadable || list.tasks.unreadable) { showStatus('Your tasks or templates could not be read on this device, so nothing was written over them.', {tone: 'error'}); return; }
    const name = (projectName.trim() || template.name).slice(0, 60), first = start || today, input = {name, every, days: every === 'days' ? Number(days) : undefined, start: first, items: template.items};
    const issue = repeatIssue(own.data, input); if (issue) { setRepeatError(issue); return; }
    const id = `repeat_${crypto.randomUUID()}`, label = repeatProjectName({name}, first);
    try {
      const before = list.tasks.data, after = list.tasks.update(r => applyTemplate(r, template, {name: label, start: first, today, at: new Date(), ids: () => crypto.randomUUID()}).record);
      own.update(x => addRepeat(x, input, {id, madeFor: first}));
      const words = repeatWords(input);
      showUndo({message: `Made “${label}”. It comes round ${words}, the next on ${nextRepeat(input, first)}.`, undone: 'The project and its repeat are taken back.',
        restore: () => { list.tasks.update(undoOfChange(before, after)); own.update(x => removeRepeat(x, id).record); }});
      setChosen(''); setProjectName(''); setEvery(''); setRepeatError('');
    } catch (e) { showStatus(e instanceof Error ? e.message : 'That could not be kept on this device.', {tone: 'error'}); }
  };
  const repeats = repeatsOf(own.data);
  const stop = (rid: string) => {
    const out = removeRepeat(own.data, rid); if (!out.removed) return;
    const gone = out.removed; own.update(x => removeRepeat(x, rid).record);
    showUndo({message: `“${gone.name}” no longer repeats. Its projects stay.`, undone: `“${gone.name}” repeats again.`, restore: () => own.update(x => restoreRepeat(x, gone, out.at))});
  };
  const save = () => {
    if (!from) return;
    if (own.unreadable) { showStatus('Your templates could not be read on this device, so nothing was written over them.', {tone: 'error'}); return; }
    try {
      const t = templateFromProject(record, from, {id: `template_${crypto.randomUUID()}`, at: new Date()});
      own.update(x => saveTemplate(x, t));
      showUndo({message: `Saved “${t.name}” as a template (${t.items.length} tasks).`, undone: 'The template is taken back.', restore: () => own.update(x => removeTemplate(x, t.id))});
      setFrom('');
    } catch (e) { showStatus(e instanceof Error ? e.message : 'That could not be kept on this device.', {tone: 'error'}); }
  };
  return <>
    <h4>Templates</h4>
    <p className="fine">Start a project from a list made earlier: its tasks, sections, priorities and lengths, with days counted from the start day. Set “Repeats” and the project comes round by itself.</p>
    <div className="tasks-plan-settings-fields">
      <label className="field"><span>Template</span><select value={chosen} onChange={e => { setChosen(e.target.value); setProjectName(''); }}><option value="">Choose…</option>{all.map(t => <option key={t.id} value={t.id}>{t.name}{t.own ? ' (yours)' : ''}</option>)}</select></label>
      {template && <label className="field"><span>Project name</span><input dir="auto" value={projectName} maxLength={60} placeholder={template.name} onChange={e => setProjectName(e.target.value)} /></label>}
      {template && <label className="field"><span>Start day</span><input type="date" value={start} onChange={e => setStart(e.target.value)} /></label>}
      {template && <label className="field"><span>Repeats</span><select value={every} aria-describedby={repeatError ? `${tid}-repeat-error` : undefined} onChange={e => { setEvery(e.target.value as '' | RepeatEvery); setRepeatError(''); }}>
        <option value="">Once (no repeat)</option><option value="week">Every week</option><option value="month">Every month</option><option value="days">Every few days</option></select></label>}
      {template && every === 'days' && <label className="field"><span>Every how many days</span><input type="number" inputMode="numeric" min={2} max={365} value={days} onChange={e => { setDays(e.target.value); setRepeatError(''); }} /></label>}
    </div>
    {repeatError && <p className="tasks-field-error" role="alert" id={`${tid}-repeat-error`}>{repeatError}</p>}
    {template && <><p className="fine">{template.about} {template.items.filter(i => i.parent === undefined).slice(0, 6).map(i => i.title).join(' · ')}{template.items.length > 6 ? ' …' : ''}</p>
      <p className="tasks-io-actions"><button type="button" className="secondary" disabled={!!every && repeats.length >= MAX_REPEATS} onClick={use}>{every ? 'Make it and repeat' : 'Make the project'}</button>
        {template.own && <button type="button" className="quiet" onClick={() => { const t = own.data.items.find(x => x.id === template.id); if (!t) return; own.update(x => removeTemplate(x, t.id)); setChosen(''); showUndo({message: `Removed the template “${t.name}”.`, undone: 'The template is back.', restore: () => own.update(x => saveTemplate(x, t))}); }}>Remove this template</button>}</p></>}
    {projects.length > 0 && <div className="tasks-plan-settings-fields">
      <label className="field"><span>Save a project as a template</span><select value={from} onChange={e => setFrom(e.target.value)}><option value="">Choose a project…</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <button type="button" className="secondary" disabled={!from || own.data.items.length >= MAX_TEMPLATES} onClick={save}>Save as template</button>
    </div>}
    <h4>Repeating projects</h4>
    {repeats.length === 0 ? <p className="fine">None yet. Choose a template above and set “Repeats” to every week, every month or every few days: the project is made now and again each time its day comes round, when you open Tasks.</p>
      : <ul className="tasks-areas" aria-label="Repeating projects">{repeats.map(r => <li key={r.id}>
        <strong dir="auto">{r.name}</strong> <small>{repeatWords(r)}{r.paused ? ' · paused' : ` · next on ${nextRepeat(r, today)}`}</small>
        <button type="button" className="text-link" aria-label={`${r.paused ? 'Resume' : 'Pause'} the repeating project “${r.name}”`} onClick={() => { own.update(x => pauseRepeat(x, r.id, !r.paused)); showStatus(r.paused ? `“${r.name}” repeats again. A project still due this time comes when you next open Tasks.` : `“${r.name}” is paused: no new project until you resume it.`); }}>{r.paused ? 'Resume' : 'Pause'}</button>
        <button type="button" className="text-link" aria-label={`Stop repeating “${r.name}”`} onClick={() => stop(r.id)}>Stop repeating</button>
      </li>)}</ul>}
  </>;
}
