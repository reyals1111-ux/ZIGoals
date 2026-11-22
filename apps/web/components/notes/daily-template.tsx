'use client';
import {useState} from 'react';
import {MAX_TEMPLATE_BODY, type Notes} from '../../lib/notes/schema';
import {withDailyTemplate} from '../../lib/notes/schedules';
import type {Change} from './note-editor';
import {SecretGuard} from '../secret-guard/secret-guard';

/**
 * Session AV lane 2 (notes; LEDGER #32, Notion: "a daily note that starts from a template"): the words a new daily note
 * starts from — shown in the day's editor and written only when that note is saved; `{date}` becomes the day. Loaded
 * when its fold opens.
 */
export default function DailyTemplate({record, change}: {record: Notes; change: Change}) {
  const [text, setText] = useState(record.dailyTemplate ?? '');
  const dirty = text !== (record.dailyTemplate ?? '');
  return <div className="note-daily-template">
    <label className="field"><span>A new daily note starts with</span><textarea rows={5} maxLength={MAX_TEMPLATE_BODY} value={text} placeholder={'Today I want to:\n- \n\nGrateful for:\n'} onChange={e => setText(e.target.value)}/></label>
    <SecretGuard text={text} onRemove={() => setText('')}/>
    <p className="fine">Shown in a day&rsquo;s note until you save it; nothing is written for days you only open. {'{date}'} becomes the day. Leave it empty for an empty note.</p>
    <div className="note-actions">
      <button type="button" className="primary" disabled={!dirty} onClick={() => change(r => withDailyTemplate(r, text), text.trim() ? 'Daily notes start from your template.' : 'Daily notes start empty.')}>Save the template</button>
      {record.dailyTemplate && <button type="button" className="quiet" onClick={() => { setText(''); change(r => withDailyTemplate(r, ''), 'Daily notes start empty.'); }}>Clear it</button>}
    </div>
  </div>;
}
