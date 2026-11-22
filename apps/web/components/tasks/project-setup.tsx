'use client';
import {useId, useState} from 'react';
import type {useTaskList} from './use-task-list';
import {LEVEL_WORDS, type Project, type Tasks} from '../../lib/tasks/schema';
import {FIELD_KINDS, FIELD_KIND_WORDS, MAX_FIELDS, projectFields, setProjectField, type FieldKind} from '../../lib/tasks/custom-fields';
import {MAX_RULES, RULE_THEN, RULE_WHEN, projectRules, ruleProblem, setProjectRule, type ProjectRule, type RuleThen, type RuleWhen} from '../../lib/tasks/rules';
import './tasks-r2.css';

/**
 * Session AV lane 2 (tasks-r2, LEDGER #228, #229; Any.do's automations and custom fields), a project's "Rules and fields",
 * opened from the project's tools; its own chunk.
 * - Fields (#229): up to five a project — text, a number, a date, a choice from a list, a tick — set in each task's editor,
 *   shown and sorted as columns in Tasks → Table when the Table shows this project.
 * - Rules: "When a task is added / enters a section / is done, then set the priority / add a label / plan it for today /
 *   mark it done / move it to a section / create the next one". They run on this device inside the change that sets them
 *   off (one Undo for both). Assigning people is not offered: nothing in ZIGoals is shared between people.
 */
type List = ReturnType<typeof useTaskList>;
const WHEN_WORDS: Record<RuleWhen, string> = {added: 'A task is added to this project', section: 'A task enters a section', done: 'A task here is done'};
const THEN_WORDS: Record<RuleThen, string> = {level: 'Set its priority', label: 'Add a label', today: 'Plan it for today', done: 'Mark it done', move: 'Move it to a section', next: 'Create the next one'};
/** A rule in plain words. */
export function ruleWords(rule: ProjectRule, record: Tasks): string {
  const section = (id?: string) => { const s = record.sections?.find(x => x.id === id); return s ? `“${s.name}”` : 'a section no longer here'; };
  const when = rule.when === 'added' ? 'When a task is added' : rule.when === 'section' ? `When a task enters ${section(rule.section)}` : 'When a task is done';
  const then = rule.then === 'level' ? `set it to ${LEVEL_WORDS[(rule.level ?? 3) as 1]}` : rule.then === 'label' ? `add @${rule.label}` : rule.then === 'today' ? 'plan it for today' : rule.then === 'done' ? 'mark it done'
    : rule.then === 'move' ? `move it to ${section(rule.to)}` : `create the next one${rule.title ? ` (“${rule.title}”)` : ''}${rule.days !== undefined ? `, due ${rule.days === 0 ? 'today' : rule.days === 1 ? 'the next day' : `${rule.days} days later`}` : ''}`;
  return `${when}, ${then}.`;
}
export default function ProjectSetup({list, record, project}: {list: List; record: Tasks; project: Project}) {
  const id = useId();
  return <section className="panel tasks-project-setup" aria-labelledby={`${id}-t`}>
    <h3 id={`${id}-t`}>Rules and fields for “{project.name}”</h3>
    <Fields list={list} record={record} project={project} />
    <Rules list={list} record={record} project={project} />
  </section>;
}

function Fields({list, record, project}: {list: List; record: Tasks; project: Project}) {
  const id = useId(), fields = projectFields(record, project.id);
  const [name, setName] = useState(''), [kind, setKind] = useState<FieldKind>('text'), [options, setOptions] = useState(''), [error, setError] = useState('');
  const filled = (fieldId: string) => record.tasks.filter(t => t.projectId === project.id && t.fields?.[fieldId] !== undefined).length;
  const add = () => {
    if (!name.trim()) { setError('Give the field a name.'); return; }
    const field = {id: `field_${crypto.randomUUID().slice(0, 12)}`, name: name.trim(), kind, ...(kind === 'choice' ? {options: options.split(',').map(o => o.trim()).filter(Boolean)} : {})};
    try { setProjectField(record, project.id, field); } catch (e) { setError(e instanceof Error ? e.message : 'That field could not be kept.'); return; }
    if (list.change(r => setProjectField(r, project.id, field), `Field added: “${field.name}”. Fill it in each task’s editor.`, 'The field is taken back.')) { setName(''); setOptions(''); setError(''); }
  };
  return <div className="tasks-fields" role="group" aria-labelledby={`${id}-t`}>
    <h4 id={`${id}-t`}>Fields</h4>
    {fields.length ? <ul className="tasks-field-list" aria-label={`Fields of “${project.name}”`}>{fields.map(f => <li key={f.id}>
      <span><strong dir="auto">{f.name}</strong> · {FIELD_KIND_WORDS[f.kind]}{f.options?.length ? `: ${f.options.join(', ')}` : ''} · {filled(f.id) === 1 ? '1 task filled in' : `${filled(f.id)} tasks filled in`}</span>
      <button type="button" className="text-link" aria-label={`Remove the field “${f.name}”`} onClick={() => list.change(r => setProjectField(r, project.id, {id: f.id, remove: true}), `Removed the field “${f.name}” and its values.`, 'The field is back.')}>Remove</button>
    </li>)}</ul> : <p className="fine">No fields yet. Add what this project needs to track per task — a budget (a number), a room (a choice), an order-by day, a tick for “ordered” — and sort by it in Tasks → Table.</p>}
    {fields.length < MAX_FIELDS ? <form className="tasks-field-form" noValidate onSubmit={e => { e.preventDefault(); add(); }}>
      <label className="field"><span>Field name</span><input dir="auto" value={name} maxLength={40} placeholder="Budget" aria-invalid={error ? true : undefined} onChange={e => { setName(e.target.value); setError(''); }} /></label>
      <label className="field"><span>It holds</span><select value={kind} onChange={e => { setKind(e.target.value as FieldKind); setError(''); }}>{FIELD_KINDS.map(k => <option key={k} value={k}>{FIELD_KIND_WORDS[k]}</option>)}</select></label>
      {kind === 'choice' && <label className="field"><span>Choices, separated by commas</span><input dir="auto" value={options} maxLength={500} placeholder="Kitchen, Hall, Bathroom" onChange={e => { setOptions(e.target.value); setError(''); }} /></label>}
      <button type="submit" className="secondary">Add field</button>
      {error && <p className="tasks-field-error" role="alert">{error}</p>}
    </form> : <p className="fine">This project has {MAX_FIELDS} fields, the most it keeps.</p>}
  </div>;
}

function Rules({list, record, project}: {list: List; record: Tasks; project: Project}) {
  const id = useId(), rules = projectRules(record, project.id), sections = (record.sections ?? []).filter(s => s.projectId === project.id && !s.archived);
  const [when, setWhen] = useState<RuleWhen>('added'), [section, setSection] = useState(''), [then, setThen] = useState<RuleThen>('level');
  const [level, setLevel] = useState('1'), [label, setLabel] = useState(''), [to, setTo] = useState(''), [title, setTitle] = useState(''), [days, setDays] = useState(''), [error, setError] = useState('');
  const offered = RULE_THEN.filter(t => !(t === 'done' && when === 'done') && !(t === 'next' && when !== 'done') && !((t === 'move') && !sections.length));
  const thenNow: RuleThen = offered.includes(then) ? then : offered[0]!;
  const draft = (): ProjectRule => ({id: `rule_${crypto.randomUUID().slice(0, 12)}`, when, then: thenNow, ...(when === 'section' ? {section} : {}), ...(thenNow === 'level' ? {level: Number(level)} : {}), ...(thenNow === 'label' ? {label: label.trim().replace(/^@/, '')} : {}),
    ...(thenNow === 'move' ? {to} : {}), ...(thenNow === 'next' && title.trim() ? {title: title.trim()} : {}), ...(thenNow === 'next' && days.trim() !== '' ? {days: Number(days)} : {})});
  const add = () => {
    const rule = draft();
    if (thenNow === 'next' && days.trim() !== '' && !/^\d{1,3}$/.test(days.trim())) { setError('The next one is due 0 to 365 days later.'); return; }
    const problem = ruleProblem(rule, project, record.sections ?? []);
    if (problem) { setError(problem); return; }
    if (list.change(r => setProjectRule(r, project.id, rule), `Rule added: ${ruleWords(rule, record)}`, 'The rule is taken back.')) { setError(''); setLabel(''); setTitle(''); setDays(''); }
  };
  return <div className="tasks-rules" role="group" aria-labelledby={`${id}-t`}>
    <h4 id={`${id}-t`}>Rules</h4>
    {rules.length ? <ul className="tasks-rule-list" aria-label={`Rules of “${project.name}”`}>{rules.map(r => <li key={r.id}>
      <span>{ruleWords(r, record)}</span>
      <button type="button" className="text-link" aria-label={`Remove the rule: ${ruleWords(r, record)}`} onClick={() => list.change(x => setProjectRule(x, project.id, {id: r.id, remove: true}), 'Removed the rule.', 'The rule is back.')}>Remove</button>
    </li>)}</ul> : <p className="fine">No rules yet. A rule does a routine step for you, for example: when a task enters “Done”, mark it done; when a task is done, create the next one a week later.</p>}
    {rules.length < MAX_RULES ? <form className="tasks-rule-form" noValidate onSubmit={e => { e.preventDefault(); add(); }}>
      <label className="field"><span>When</span><select value={when} onChange={e => { setWhen(e.target.value as RuleWhen); setError(''); }}>{RULE_WHEN.filter(w => w !== 'section' || sections.length).map(w => <option key={w} value={w}>{WHEN_WORDS[w]}</option>)}</select></label>
      {when === 'section' && <label className="field"><span>Section</span><select value={section} onChange={e => { setSection(e.target.value); setError(''); }}><option value="">Choose…</option>{sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}
      <label className="field"><span>Then</span><select value={thenNow} onChange={e => { setThen(e.target.value as RuleThen); setError(''); }}>{offered.map(t => <option key={t} value={t}>{THEN_WORDS[t]}</option>)}</select></label>
      {thenNow === 'level' && <label className="field"><span>Priority</span><select value={level} onChange={e => setLevel(e.target.value)}>{([1, 2, 3, 4] as const).map(p => <option key={p} value={p}>{LEVEL_WORDS[p]}</option>)}</select></label>}
      {thenNow === 'label' && <label className="field"><span>Label</span><input value={label} maxLength={41} placeholder="@waiting" onChange={e => { setLabel(e.target.value); setError(''); }} /></label>}
      {thenNow === 'move' && <label className="field"><span>To the section</span><select value={to} onChange={e => { setTo(e.target.value); setError(''); }}><option value="">Choose…</option>{sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}
      {thenNow === 'next' && <>
        <label className="field"><span>Its title (empty: the same)</span><input dir="auto" value={title} maxLength={140} onChange={e => setTitle(e.target.value)} /></label>
        <label className="field"><span>Due after (days, optional)</span><input inputMode="numeric" value={days} placeholder="7" onChange={e => { setDays(e.target.value); setError(''); }} /></label>
      </>}
      <button type="submit" className="secondary">Add rule</button>
      {error && <p className="tasks-field-error" role="alert">{error}</p>}
    </form> : <p className="fine">This project has {MAX_RULES} rules, the most it keeps. Remove one to add another.</p>}
    <p className="fine">Rules run on this device whenever a task of this project changes: here, in Today, on the Agenda or through ZIGi. What a rule changes is in the same Undo as the change itself, and it does not set off other rules. Rules that give a task to someone else are not offered: nothing in ZIGoals is shared between people.</p>
  </div>;
}
