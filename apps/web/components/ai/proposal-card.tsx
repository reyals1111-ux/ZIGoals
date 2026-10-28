'use client';
import {useId, useState, type FormEvent} from 'react';
import {applyEdits, editableFields, fieldText, type Field} from '../../lib/ai/actions/edit';
import type {Plan} from '../../lib/ai/actions/plan';
import type {Action} from '../../lib/ai/actions/schema';
import {formatDate} from '../../lib/visual-format';
import {MEMORY_FIRST} from '../../lib/ai/memory';
// The card's day as people read it ("Sep 18, 2026", "week of Sep 14, 2026"); the card keeps the ISO day.
const dayText = (day: string) => day.replace(/\d{4}-\d{2}-\d{2}/g, key => formatDate(key));

/**
 * One proposal from ZIGi (ADR-012, Part 5): exactly what would be written, where and for which day, with Add, Edit and
 * Dismiss. Nothing happens until Add. "AI estimate" marks values the AI guessed; the fasting cards carry HE6's safety
 * note. Fully keyboard-usable: plain buttons, a plain form, status text in a live region owned by the list.
 */
/** `replaced` (Session X-Local Part 5a): a later reply corrected this one, so this card is no longer offered. */
export type ProposalStatus = 'proposed' | 'busy' | 'added' | 'undone' | 'dismissed' | 'opened' | 'replaced' | 'auto';
export type ProposalCardProps = {
  action: Action; plan: Plan | null; refusal: string | null; status: ProposalStatus; error: string | null;
  onAdd: () => void; onDismiss: () => void; onEdit: (action: Action) => void;
  /** Session V Part 7: the reply answered a photo, so the card's estimate badge says so. */
  fromPhoto?: boolean;
  /** Session Z-Cloud Part 2: false while the card's Undo window is open, so nothing moves under the person's pointer. */
  receipt?: boolean;
  /** Session Z-Cloud Gate B: what a runner effect did ("Opened: Sleep"), in place of the money form's words. */
  opened?: string;
  /** Gate C (persona round): the receipt's detail in place of the card's first line ("edited" for a kept card the person changed). */
  receiptDetail?: string;
  /** Session AF (L4, H30): the first Remember card says, once, how ZIGi keeps notes (the person's press is their agreement). */
  firstNote?: boolean;
};
const STATUS_TEXT: Record<Exclude<ProposalStatus, 'proposed'>, string> = {busy: 'Adding…', added: 'Added', undone: 'Undone', dismissed: 'Dismissed', opened: 'Opened in Wealth: review it and save it yourself', replaced: 'Replaced by the next reply', auto: 'Added by ZIGi (auto-accept)'};
/** A kept note says where it went, on the full card (while its Undo window is open) and on its receipt alike. */
const statusText = (status: Exclude<ProposalStatus, 'proposed'>, kind: string, opened?: string) => status === 'added' && kind === 'remember' ? 'Remembered: in What ZIGi knows about me' : status === 'opened' && opened ? opened : STATUS_TEXT[status];
export function ProposalCard({action, plan, refusal, status, error, onAdd, onDismiss, onEdit, fromPhoto = false, receipt = true, opened, receiptDetail, firstNote = false}: ProposalCardProps) {
  const titleId = useId();
  const [editing, setEditing] = useState(false), [editError, setEditError] = useState('');
  if (!plan) return <article className="ai-card ai-card-refused" aria-labelledby={titleId}>
    <h4 id={titleId}>Nothing proposed</h4>
    <p>{refusal ?? 'This proposal could not be turned into a card.'}</p>
    {status === 'proposed' && <div className="ai-card-actions"><button type="button" className="text-link" onClick={onDismiss} aria-describedby={titleId}>Dismiss</button></div>}
  </article>;
  const {card} = plan, fields = editableFields(action), form = plan.target === 'form';
  const applies = form && !!plan.device && !plan.navigate && !plan.confirm; // Session AA-Local B37: a device-record write applies in place; no form opens
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget), values: Record<string, string> = {};
    for (const field of fields) values[field.key] = String(data.get(field.key) ?? '');
    const result = applyEdits(action, values);
    if (!result.ok) { setEditError(result.message); return; }
    setEditError(''); setEditing(false); onEdit(result.action);
  }
  // Session Z-Cloud Part 2: once acted on, a card is one line: what happened and to what, with its error if any. An added
  // card keeps its size while its Undo window is open (the Undo below it stays where it was), then folds.
  if (status !== 'proposed' && status !== 'busy' && receipt) return <article className={`ai-card ai-card-${status} ai-card-receipt`} aria-labelledby={titleId} data-kind={card.kind}>
    <span className="ai-card-receipt-mark" aria-hidden="true">{status === 'added' || status === 'auto' || status === 'opened' ? '✓' : '–'}</span>
    <span className="ai-card-status">{statusText(status, card.kind, opened)}</span>
    {/* Gate C (persona round): the receipt says how much ("Add water · 300 mL"); the card's name stays its title alone. */}
    {(() => { const detail = receiptDetail ?? card.lines[0]; return <h4 className="ai-card-receipt-title" title={detail ? `${card.title} · ${detail}` : card.title}><span id={titleId}>{card.title}</span>{detail && <span className="ai-card-receipt-detail"> · {detail}</span>}</h4>; })()}
    {error && <p role="alert" className="ai-card-error">{error}</p>}
  </article>;
  return <article className={`ai-card ai-card-${status}${card.estimate ? ' ai-card-estimate' : ''}`} aria-labelledby={titleId} data-kind={card.kind}>
    <header className="ai-card-head"><span className="ai-card-where" title={`${card.where}${card.day ? ` · ${dayText(card.day)}` : ''}`}>{card.where}{card.day ? ` · ${dayText(card.day)}` : ''}</span>{card.estimate && <span className="ai-card-badge">{fromPhoto ? 'Estimated by your AI from a photo' : 'AI estimate'}</span>}</header>
    <h4 id={titleId}>{card.title}</h4>
    <ul className="ai-card-lines">{card.lines.map((line, i) => <li key={i}>{line}</li>)}</ul>
    {card.safety && <p className="ai-card-safety">{card.safety}</p>}
    {firstNote && status === 'proposed' && <p className="ai-card-note ai-card-first-note">{MEMORY_FIRST}</p>}
    {editing ? <form className="ai-card-edit" onSubmit={save} aria-label={`Edit: ${card.title}`}>
      {fields.map(field => <EditField key={field.key} field={field} value={fieldText(action, field)}/>)}
      {editError && <p role="alert" className="ai-card-error">{editError}</p>}
      <div className="ai-card-actions"><button type="submit" className="primary">Save changes</button><button type="button" className="text-link" onClick={() => { setEditing(false); setEditError(''); }}>Cancel</button></div>
    </form> : <div className="ai-card-actions">
      {status === 'proposed' ? <>
        {/* Session V Part 16: each button keeps its short name and is described by the card's title, so a list of buttons still says which card. */}
        <button type="button" className="primary" onClick={onAdd} aria-describedby={titleId}>{applies ? (card.kind === 'log-expense' || card.kind === 'log-income' ? 'Add' : 'Apply') : plan.staking ? 'Open the review' : form ? 'Open the form' : card.kind === 'remember' ? 'Remember' : 'Add'}</button>
        {fields.length > 0 && <button type="button" className="secondary" onClick={() => setEditing(true)} aria-describedby={titleId}>Edit</button>}
        <button type="button" className="text-link" onClick={onDismiss} aria-describedby={titleId}>Dismiss</button>
      </> : <span className="ai-card-status">{statusText(status, card.kind, opened)}</span>}
    </div>}
    {error && <p role="alert" className="ai-card-error">{error}</p>}
  </article>;
}
function EditField({field, value}: {field: Field; value: string}) {
  const id = useId();
  const control = field.type === 'select' ? <select id={id} name={field.key} defaultValue={value}>{field.optional && <option value="">—</option>}{field.options!.map(option => <option key={option} value={option}>{field.labels?.[option] ?? option}</option>)}</select>
    : field.type === 'day' || field.type === 'date' ? <input id={id} name={field.key} type="date" defaultValue={value === 'today' || value === 'yesterday' ? '' : value} placeholder={field.type === 'day' ? 'today' : undefined}/>
    : field.multiline ? <textarea id={id} name={field.key} defaultValue={value} rows={2} maxLength={2000}/>
    : <input id={id} name={field.key} type="text" inputMode={field.type === 'text' ? undefined : field.type === 'integer' ? 'numeric' : 'decimal'} defaultValue={value} autoComplete="off" spellCheck={field.type === 'text'}/>;
  return <label className="field" htmlFor={id}>{field.label}{field.note ? <small> ({field.note})</small> : field.optional && field.type !== 'day' ? <small> (optional)</small> : field.type === 'day' ? <small> (empty = today)</small> : null}{control}</label>;
}
