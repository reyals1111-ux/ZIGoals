'use client';
import {useState} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {CSV_TEMPLATES, templateCsv, templateFileName, type CsvTemplate, type ImportTarget} from '../../../lib/csv/templates/presets';
import {CSV_MAPPINGS, findSaved, removeMapping, saveMapping, type MappingToSave} from '../../../lib/csv/templates/saved';
import './bankfiles.css';

/**
 * Session AK (7.1): the CSV presets as template files to download and fill in (written on the device, every cell
 * formula-safe), and the person's saved column mappings for the mapping step (kept by column name in
 * `zigoals:csv-mappings:v1`, no file content). Lazy-loaded inside the import sheet.
 */
function download(template: CsvTemplate) {
  const blob = new Blob([templateCsv(template)], {type: 'text/csv;charset=utf-8'}), url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = templateFileName(template); link.rel = 'noopener';
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function CsvTemplateDownloads({target}: {target?: ImportTarget}) {
  const list = CSV_TEMPLATES.filter(t => !target || t.target === target);
  return <section className="csv-templates" aria-label="Template files">
    <ul>{list.map(t => <li key={t.id}><span><strong>{t.name}</strong><span className="fine"> · {t.description}</span></span>
      <button type="button" className="secondary" onClick={() => download(t)} aria-label={`Download the ${t.name} template`}>Download template</button></li>)}</ul>
    <p className="fine">Written on this device with fictional example rows. Fill it in a spreadsheet, save it as CSV and import it.</p>
  </section>;
}
/** In the mapping step: apply the saved mapping that fits this header, or save the current one under a name. */
export function SavedMappingControls({target, current, onApply}: {target: ImportTarget; current: Omit<MappingToSave, 'name' | 'target'>; onApply: (mapping: Partial<Record<string, number>>, saved: {numberStyle?: MappingToSave['numberStyle']; dateFormat?: MappingToSave['dateFormat']}) => void}) {
  const record = useDeviceRecord(CSV_MAPPINGS), [name, setName] = useState(''), [status, setStatus] = useState('');
  if (!record.loaded) return null;
  const fit = findSaved(record.data, current.header, target);
  const save = () => {
    try { record.update(r => saveMapping(r, {...current, name, target}, crypto.randomUUID(), new Date())); setStatus(`Saved as "${name.trim()}" on this device.`); setName(''); }
    catch (cause) { setStatus(cause instanceof Error ? cause.message : 'Not saved on this device.'); }
  };
  return <div className="csv-saved" role="group" aria-label="Saved column matches">
    {fit && <p><button type="button" className="secondary" onClick={() => { onApply(fit.mapping, {numberStyle: fit.saved.numberStyle, dateFormat: fit.saved.dateFormat}); setStatus(`"${fit.saved.name}" applied. Check the columns before you go on.`); }}>Use &ldquo;{fit.saved.name}&rdquo;</button>
      <button type="button" className="quiet" onClick={() => { record.update(r => removeMapping(r, fit.saved.id)); setStatus(`"${fit.saved.name}" removed.`); }} aria-label={`Forget the saved match ${fit.saved.name}`}>Forget</button></p>}
    <div className="csv-saved-row"><label className="field"><span>Save these column matches as</span><input maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder="My bank"/></label>
      <button type="button" className="secondary" disabled={!name.trim()} onClick={save}>Save</button></div>
    <p className="fine" role="status" aria-live="polite">{status}</p>
  </div>;
}
