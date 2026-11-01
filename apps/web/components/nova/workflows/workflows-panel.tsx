'use client';
import {useId, useRef, useState, type FormEvent} from 'react';
import {WORKFLOW_TEMPLATES, templateOf, type WorkflowId} from '../../../lib/nova/workflows/templates';
import {MAX_INSTRUCTION, MAX_TITLE, NOVA_WORKFLOWS, deleteCustom, editProblem, importWorkflows, resolveWorkflow, restoreCustom, saveCustom, shareWorkflows, workflowsFile, type CustomWorkflow, type WorkflowDef} from '../../../lib/nova/workflows/schema';
import {isShowcase} from '../../../lib/showcase-storage';
import {formatDate} from '../../../lib/visual-format';
import {useDeviceRecord} from '../../ai/use-device-record';
import {WorkflowRun} from './workflow-run';
import '../../ai/ai.css';
import './workflows.css';

/**
 * NOVA's Workflows panel (Session AK, owner follow-up 2 N6): the eight templates and the person's own, each run with its
 * steps shown live; any template can be edited (its name, its instruction to the model, the steps kept) and saved as the
 * person's own workflow (`zigoals:nova-workflows:v1`, on this device only); their own can be exported as a file and a
 * file imported — the file holds names, instructions and steps only, never a record (shareWorkflows).
 */
type Editing = {from: WorkflowId; id?: string; title: string; instruction: string; skip: string[]};
function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], {type: 'application/json'})), a = document.createElement('a');
  a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function WorkflowsPanel({start}: {start?: WorkflowId}) {
  const record = useDeviceRecord(NOVA_WORKFLOWS), showcase = isShowcase();
  const [running, setRunning] = useState<WorkflowDef | null>(() => start ? templateOf(start) : null);
  const [editing, setEditing] = useState<Editing | null>(null), [message, setMessage] = useState<{text: string; failed?: boolean; restore?: CustomWorkflow} | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const own = record.data.custom ?? [];
  const change = (apply: Parameters<typeof record.update>[0], text: string, restore?: CustomWorkflow) => {
    try { record.update(apply); setMessage({text, ...(restore ? {restore} : {})}); return true; }
    catch (error) { setMessage({text: error instanceof Error ? error.message : 'Not saved on this device.', failed: true}); return false; }
  };
  const onImport = async (input: HTMLInputElement) => {
    const chosen = input.files?.[0]; input.value = ''; if (!chosen) return;
    if (chosen.size > 64 * 1024) { setMessage({text: 'That file is too large to be a workflows file.', failed: true}); return; }
    let parsed: unknown = null; try { parsed = JSON.parse(await chosen.text()); } catch { setMessage({text: 'That file is not a workflows file.', failed: true}); return; }
    let result = {added: 0, refused: 0};
    change(current => { const out = importWorkflows(current, parsed, new Date()); result = out; return out.record; }, '');
    setMessage({text: result.added ? `${result.added} ${result.added === 1 ? 'workflow' : 'workflows'} added${result.refused ? `; ${result.refused} left out (not readable)` : ''}.` : 'No workflow in that file could be read.', failed: !result.added});
  };
  if (running) return <WorkflowRun def={running} onClose={() => setRunning(null)}/>;
  if (editing) return <WorkflowEditor editing={editing} onCancel={() => setEditing(null)} onSave={next => { if (change(current => saveCustom(current, next.from, next, new Date(), next.id), next.id ? 'Your workflow is saved.' : 'Saved as your own workflow.')) setEditing(null); }}/>;
  const shared = shareWorkflows(record.data);
  return <div className="nova-workflows">
    <p className="ai-note">Each workflow reads your own records on this device, shows every step, and asks before every change: a card you add or dismiss. With a model connected, it puts the result into words.{showcase ? ' Showcase: fictional records; your own workflows stay in this tab.' : ''}</p>
    {own.length > 0 && <section aria-labelledby="nova-wf-own"><h4 id="nova-wf-own">Your workflows</h4>
      <ul className="nova-wf-list">{own.map(c => <li key={c.id} className="nova-wf-item">
        <p className="nova-wf-title">{c.title}</p>
        <p className="ai-note">From &ldquo;{templateOf(c.from).title}&rdquo; · saved {formatDate(c.updatedAt)}{record.data.runs?.[c.id] ? ` · last run ${formatDate(record.data.runs[c.id]!)}` : ''}</p>
        <div className="ai-card-actions">
          <button type="button" className="primary" onClick={() => setRunning(resolveWorkflow(c))}>Run</button>
          <button type="button" className="secondary" onClick={() => setEditing({from: c.from, id: c.id, title: c.title, instruction: c.instruction, skip: [...c.skip]})} aria-label={`Edit ${c.title}`}>Edit</button>
          <button type="button" className="text-link" onClick={() => change(current => deleteCustom(current, c.id), `Deleted: ${c.title}.`, c)} aria-label={`Delete ${c.title}`}>Delete</button>
        </div>
      </li>)}</ul>
    </section>}
    <section aria-labelledby="nova-wf-templates"><h4 id="nova-wf-templates">Templates</h4>
      <ul className="nova-wf-list">{WORKFLOW_TEMPLATES.map(t => <li key={t.id} className="nova-wf-item">
        <p className="nova-wf-title">{t.title}</p>
        <p className="ai-note">{t.blurb}{record.data.runs?.[t.id] ? ` Last run ${formatDate(record.data.runs[t.id]!)}.` : ''}</p>
        <div className="ai-card-actions">
          <button type="button" className="primary" onClick={() => setRunning(t)} aria-label={`Run ${t.title}`}>Run</button>
          <button type="button" className="secondary" onClick={() => setEditing({from: t.id, title: t.title, instruction: t.instruction, skip: []})} aria-label={`Edit and save as your own: ${t.title}`}>Edit and save as mine</button>
        </div>
      </li>)}</ul>
    </section>
    <div className="ai-card-actions">
      {own.length > 0 && <button type="button" className="secondary" onClick={() => { download('my-nova-workflows.json', workflowsFile(record.data, new Date())); setMessage({text: `Your workflows were saved as a file (my-nova-workflows.json): names, instructions and steps only, no records.${shared.heldBack ? ` ${shared.heldBack} ${shared.heldBack === 1 ? 'text that looked personal was' : 'texts that looked personal were'} replaced by the template's own.` : ''}`}); }}>Export my workflows</button>}
      <button type="button" className="secondary" onClick={() => file.current?.click()}>Import workflows</button>
      <input ref={file} type="file" accept="application/json,.json" hidden tabIndex={-1} aria-hidden="true" onChange={e => void onImport(e.currentTarget)}/>
    </div>
    {message?.text && <p role={message.failed ? 'alert' : 'status'} className="ai-note">{message.text}{message.restore && <> <button type="button" className="text-link" onClick={() => change(current => restoreCustom(current, message.restore!), 'The workflow is back.')}>Undo</button></>}</p>}
  </div>;
}
function WorkflowEditor({editing, onSave, onCancel}: {editing: Editing; onSave: (next: Editing) => void; onCancel: () => void}) {
  const [title, setTitle] = useState(editing.title), [instruction, setInstruction] = useState(editing.instruction), [skip, setSkip] = useState<string[]>(editing.skip);
  const base = templateOf(editing.from), problem = editProblem(editing.from, {title, instruction, skip}), hint = useId();
  const submit = (event: FormEvent) => { event.preventDefault(); if (!problem) onSave({...editing, title, instruction, skip}); };
  return <form className="nova-wf-edit" onSubmit={submit} aria-label={`Edit ${base.title}`}>
    <h3>{editing.id ? 'Edit your workflow' : 'Make it your own'}</h3>
    <p className="ai-note">From the template &ldquo;{base.title}&rdquo;. Kept on this device only.</p>
    <label className="field">Name<input value={title} maxLength={MAX_TITLE} onChange={e => setTitle(e.target.value)} autoComplete="off"/></label>
    <label className="field">Instruction to your model<textarea value={instruction} maxLength={MAX_INSTRUCTION} rows={4} onChange={e => setInstruction(e.target.value)} aria-describedby={hint} autoComplete="off"/></label>
    <small id={hint} className="ai-note">Used only when a model is connected and your privacy mode allows it. Your records are always read on this device first. Never a key or a password.</small>
    <fieldset className="nova-wf-steps-edit"><legend>Steps</legend>
      {base.steps.map(s => <label key={s.id} className="ai-check"><input type="checkbox" checked={!skip.includes(s.id)} onChange={e => setSkip(current => e.target.checked ? current.filter(x => x !== s.id) : [...current, s.id])}/> {s.label}</label>)}
    </fieldset>
    {problem && <p className="ai-note" role="status">{problem}</p>}
    <div className="ai-card-actions"><button type="submit" className="primary" disabled={!!problem}>Save</button><button type="button" className="text-link" onClick={onCancel}>Cancel</button></div>
  </form>;
}
