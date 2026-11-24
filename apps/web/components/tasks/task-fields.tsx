'use client';
import {useId, useState} from 'react';
import {cleanFieldValues, projectFields, readFieldValue, type FieldDef, type FieldValue} from '../../lib/tasks/custom-fields';
import type {Task, Tasks} from '../../lib/tasks/schema';
import './tasks-r2.css';

/**
 * Session AV lane 2 (tasks-r2, LEDGER #229; Any.do's custom fields): a task's values for its project's own fields, in the
 * task editor (its chunk). Each field is an input of its kind; a value that does not fit says why under it, and Save waits.
 */
type Raw = Record<string, string | boolean>;
const toRaw = (task: Task): Raw => Object.fromEntries(Object.entries(task.fields ?? {}).map(([k, v]) => [k, v === true ? true : String(v)]));
export function useTaskFields(task: Task, record: Tasks | undefined, projectId: string) {
  const defs = record ? projectFields(record, projectId || undefined) : [], [raw, setRaw] = useState<Raw>(() => toRaw(task)), [errors, setErrors] = useState<Record<string, string>>({});
  const set = (def: FieldDef, value: string | boolean) => { setRaw(r => ({...r, [def.id]: value})); setErrors(e => { const n = {...e}; delete n[def.id]; return n; }); };
  /** The values to save: undefined (nothing to say), 'invalid' (an error is shown), or the values (null clears them). */
  const read = (): Record<string, FieldValue> | null | undefined | 'invalid' => {
    if (!record) return undefined;
    if (!defs.length) return task.fields ? null : undefined;
    const found: Record<string, string> = {};
    for (const def of defs) if (raw[def.id] !== undefined) { const r = readFieldValue(def, raw[def.id]!); if ('error' in r) found[def.id] = r.error; }
    if (Object.keys(found).length) { setErrors(found); return 'invalid'; }
    return cleanFieldValues(defs, raw);
  };
  return {defs, raw, errors, set, read};
}
export function TaskFieldInputs({fields}: {fields: ReturnType<typeof useTaskFields>}) {
  const id = useId();
  if (!fields.defs.length) return null;
  return <div className="task-editor-fields" role="group" aria-labelledby={`${id}-t`}>
    <span id={`${id}-t`} className="task-editor-pause-title">Project fields</span>
    {fields.defs.map(def => {
      const value = fields.raw[def.id], error = fields.errors[def.id], note = error ? `${id}-${def.id}-e` : undefined;
      if (def.kind === 'tick') return <label key={def.id} className="task-editor-check"><input type="checkbox" checked={value === true} onChange={e => fields.set(def, e.target.checked)} /> <span dir="auto">{def.name}</span></label>;
      const common = {'aria-invalid': error ? true : undefined, 'aria-describedby': note};
      return <label key={def.id} className="field"><span dir="auto">{def.name}</span>
        {def.kind === 'choice' ? <select value={typeof value === 'string' ? value : ''} onChange={e => fields.set(def, e.target.value)} {...common}><option value="">None</option>{(def.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}</select>
          : <input dir="auto" type={def.kind === 'date' ? 'date' : 'text'} inputMode={def.kind === 'number' ? 'decimal' : undefined} maxLength={def.kind === 'text' ? 200 : 40} value={typeof value === 'string' ? value : ''} onChange={e => fields.set(def, e.target.value)} {...common} />}
        {error && <small id={note} className="tasks-field-error" role="alert">{error}</small>}</label>;
    })}
  </div>;
}
