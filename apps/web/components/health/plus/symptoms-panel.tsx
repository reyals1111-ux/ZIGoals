'use client';
import {useId, useState, type FormEvent} from 'react';
import {SEVERITY_WORDS, SYMPTOMS, MAX_SYMPTOM_NAME, type SymptomItem} from '../../../lib/symptoms/schema';
import {addItem, itemCounts, levelOn, removeItem, setLevel} from '../../../lib/symptoms/symptoms';
import {formatDate} from '../../../lib/visual-format';
import {plainErrorMessage} from '../../../lib/plain-error';
import {useDeviceRecord} from '../../ai/use-device-record';
import {ConfirmInline} from '../../ui/confirm-inline';
import './plus.css';

/**
 * Session AP (feature 2), Health → Diary → "Symptoms and factors": the person's own list (up to 40), a level per day
 * from None to Strong, and plain counts. Private like Health: kept on this device in zigoals:symptoms:v1, which no ZIGi or
 * NOVA path reads. The Life review pairs the most answered items with mood and sleep under the usual rules.
 */
export default function SymptomsPanel({date, today}: {date: string; today: string}) {
  const record = useDeviceRecord(SYMPTOMS), day = date > today ? today : date;
  const [name, setName] = useState(''), [kind, setKind] = useState<SymptomItem['kind']>('symptom'), [error, setError] = useState(''), [note, setNote] = useState(''), [removing, setRemoving] = useState<string | null>(null);
  const errorId = useId();
  const write = (change: Parameters<typeof record.update>[0], said: string) => { try { record.update(change); setNote(said); return true; } catch (cause) { setNote(plainErrorMessage(cause, 'This was not saved on this device. Nothing was changed.')); return false; } };
  function add(e: FormEvent) {
    e.preventDefault();
    try { addItem(record.data, name, kind, new Date().toISOString()); setError(''); } catch (cause) { setError(plainErrorMessage(cause, 'Check the name.')); return; }
    if (write(r => addItem(r, name, kind, new Date().toISOString()), `${name.trim()} is added to your list.`)) setName('');
  }
  if (!record.loaded) return <p className="fine" role="status">Opening your list…</p>;
  if (record.unreadable) return <p role="alert">Your symptom list on this device could not be read. It was not changed.</p>;
  const counts = new Map(itemCounts(record.data, today).map(c => [c.id, c]));
  const when = day === today ? 'today' : formatDate(day);
  return <section className="ap-symptoms" aria-labelledby="ap-symptoms-title">
    <h2 id="ap-symptoms-title">Symptoms and factors</h2>
    <p className="fine">Follow what you choose, such as a headache, pollen or a stiff back, from None to Strong each day. A day you skip stays unanswered; it is never counted as none.</p>
    {record.data.items.length > 0 && <ul className="ap-symptom-list">{record.data.items.map(item => {
      const level = levelOn(record.data, day, item.id), c = counts.get(item.id);
      return <li key={item.id}>
        <h3>{item.name} <small>· {item.kind === 'symptom' ? 'symptom' : 'factor'}</small></h3>
        <div className="ap-levels" role="group" aria-label={`${item.name} ${when}`}>
          {SEVERITY_WORDS.map((word, i) => <button key={word} type="button" className="secondary" aria-pressed={level === i} onClick={() => write(r => setLevel(r, day, item.id, i), `${item.name} ${when}: ${word.toLowerCase()}.`)}>{word}</button>)}
          {level !== undefined && <button type="button" className="quiet" onClick={() => write(r => setLevel(r, day, item.id, null), `${item.name} ${when}: no answer.`)}>Clear</button>}
        </div>
        {c && c.answered > 0 && <p className="fine">Last 30 days: noted on {c.noted} of the {c.answered} {c.answered === 1 ? 'day' : 'days'} you answered{c.strong ? `, strong on ${c.strong}` : ''}.</p>}
        {removing === item.id ? <ConfirmInline title={`Remove ${item.name}?`} confirmLabel="Remove it and its days" cancelLabel="Keep it" onConfirm={() => { write(r => removeItem(r, item.id), `${item.name} and its days are removed.`); setRemoving(null); }} onCancel={() => setRemoving(null)}><p>Every level you gave it is removed from this device.</p></ConfirmInline>
          : <button type="button" className="quiet" aria-label={`Remove ${item.name}`} onClick={() => setRemoving(item.id)}>Remove</button>}
      </li>;
    })}</ul>}
    <form className="ap-plus-form" aria-label="Add something to follow" onSubmit={add} noValidate>
      <label className="field"><span>Name</span><input type="text" value={name} maxLength={MAX_SYMPTOM_NAME + 10} autoComplete="off" aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : undefined} onChange={e => { setName(e.target.value); setError(''); }}/></label>
      <label className="field"><span>Kind</span><select value={kind} onChange={e => setKind(e.target.value as SymptomItem['kind'])}><option value="symptom">Symptom (how you feel)</option><option value="factor">Factor (around you)</option></select></label>
      <button type="submit" className="secondary">Add</button>
    </form>
    {error && <p className="field-error ap-field-error" id={errorId} role="alert">{error}</p>}
    {note && <p className="fine" role="status">{note}</p>}
    <p className="fine">Kept on this device with your Health records. ZIGi and NOVA do not read it. In your Life review, “On the same days” sets the items you answer most beside your mood and sleep, in counts: things that go together, not a cause.</p>
  </section>;
}
