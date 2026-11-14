'use client';
import {useId, useState, type FormEvent} from 'react';
import {MAX_TAG_CHARS, MAX_TAGS_PER_ENTRY, MOOD_TAGS} from '../../../lib/mood-tags/schema';
import {addTag, cleanTag, recentTags, removeTag, tagsOn} from '../../../lib/mood-tags/tags';
import {plainErrorMessage} from '../../../lib/plain-error';
import {useDeviceRecord} from '../../ai/use-device-record';
import './plus.css';

/**
 * Session AP (feature 1): what the day went with, as a few short tags on its mood check-in ("walk", "friends"). Kept in
 * zigoals:mood-tags:v1 by the mood entry's id (its day), not on the mood record. Private like Health: ZIGi and NOVA do
 * not read it. Loaded by the mood card once the day has a mood.
 */
export default function MoodTags({day}: {day: string}) {
  const record = useDeviceRecord(MOOD_TAGS), [text, setText] = useState(''), [error, setError] = useState(''), [note, setNote] = useState('');
  const errorId = useId();
  if (!record.loaded || record.unreadable) return null;
  const tags = tagsOn(record.data, day), here = new Set(tags.map(t => t.toLocaleLowerCase()));
  const offers = recentTags(record.data, 12).filter(t => !here.has(t.toLocaleLowerCase())).slice(0, 6);
  const full = tags.length >= MAX_TAGS_PER_ENTRY;
  const write = (change: Parameters<typeof record.update>[0], said: string) => { try { record.update(change); setError(''); setNote(said); return true; } catch (cause) { setError(plainErrorMessage(cause, 'The tag was not saved. Nothing was changed.')); return false; } };
  function submit(e: FormEvent) {
    e.preventDefault();
    let tag: string;
    try { tag = cleanTag(text); } catch (cause) { setError(plainErrorMessage(cause, 'Check the tag.')); return; }
    if (write(r => addTag(r, day, tag), `Tagged “${tag}”.`)) setText('');
  }
  return <div className="ap-mood-tags">
    <h3>What went with it? <small>(optional)</small></h3>
    {tags.length > 0 && <ul className="ap-chips" aria-label="This day’s tags">{tags.map(t => <li key={t}><button type="button" className="secondary" aria-label={`Remove the tag ${t}`} onClick={() => write(r => removeTag(r, day, t), `“${t}” removed.`)}>{t} <span aria-hidden="true">×</span></button></li>)}</ul>}
    {!full && offers.length > 0 && <ul className="ap-chips" aria-label="Your tags">{offers.map(t => <li key={t}><button type="button" className="quiet" aria-label={`Add the tag ${t}`} onClick={() => write(r => addTag(r, day, t), `Tagged “${t}”.`)}><span aria-hidden="true">+ </span>{t}</button></li>)}</ul>}
    {!full && <form className="ap-plus-form" aria-label="Add a tag" onSubmit={submit} noValidate>
      <label className="field"><span>A tag, up to {MAX_TAG_CHARS} characters</span><input type="text" value={text} maxLength={MAX_TAG_CHARS + 8} autoComplete="off" aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : undefined} onChange={e => { setText(e.target.value); setError(''); }}/></label>
      <button type="submit" className="secondary">Add tag</button>
    </form>}
    {full && <p className="fine">{MAX_TAGS_PER_ENTRY} tags is the most for one day; remove one to add another.</p>}
    {error && <p className="field-error ap-field-error" id={errorId} role="alert">{error}</p>}
    {note && <p className="fine" role="status">{note}</p>}
    <p className="fine">Kept on this device with your Health records; ZIGi and NOVA do not read your tags. Health → Insights shows what goes with your good days.</p>
  </div>;
}
