'use client';
import {removeWithUndo} from '../ui/remove-with-undo';
import {ConfirmInline} from '../ui/confirm-inline';
/* eslint-disable @next/next/no-img-element -- the progress photos are blob URLs of the person's own device-only files; next/image cannot optimise them */
import {useEffect, useState} from 'react';
import {NebulaFlow} from '../nebula-flow';
import {useChartWidth} from '../charts/use-chart-width';
import {ChartDefs, ChartGrid, ChartXAxis} from '../charts/chart-kit';
import {measurementHistory} from '../../lib/body-measurements';
import {measurementKinds} from '../../lib/body-measurement-schema';
import {useDeviceRecord} from '../ai/use-device-record';
import {MEASUREMENTS_CUSTOM, addCustomKind, addCustomReading, customHistory, removeCustomKind, removeCustomReading} from '../../lib/health-aa/measurements-custom';
import {PROGRESS_PHOTOS, addPhotoEntry, compressImage, deletePhotoBlob, getPhotoBlob, putPhotoBlob, removePhotoEntry, type PhotoEntry} from '../../lib/health-aa/photos';
import type {HealthData} from '../../lib/health';
import {readFormNumber} from '../../lib/decimal-input';
import {formatDate} from '../../lib/visual-format';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import {getAccountScope} from '../../lib/account-session';
import {isShowcase} from '../../lib/showcase-storage';
import './health-aa.css';

const H = 120, PAD = {top: 10, right: 8, bottom: 22, left: 40};
function MiniChart({title, points, unit, id}: {title: string; points: {date: string; value: number}[]; unit: string; id: string}) {
  const [plot, width] = useChartWidth(260, 200);
  if (points.length < 2) return <div className="health-measure-chart"><h3><span>{title}</span><small>{points.length ? `${points[0]!.value} ${unit}` : '—'}</small></h3><small>{points.length ? 'One reading; a second draws the line.' : 'No readings yet.'}</small></div>;
  const vals = points.map(p => p.value), lo = Math.min(...vals), hi = Math.max(...vals), span = Math.max(hi - lo, 1);
  const x = (i: number) => PAD.left + (i / (points.length - 1)) * (width - PAD.left - PAD.right), y = (v: number) => PAD.top + (1 - (v - lo) / span) * (H - PAD.top - PAD.bottom);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const change = vals[vals.length - 1]! - vals[0]!;
  return <div className="health-measure-chart" ref={plot}><h3><span>{title}</span><small>{vals[vals.length - 1]} {unit} · {change > 0 ? '+' : ''}{Math.round(change * 10) / 10} since {points[0]!.date}</small></h3>
    <svg viewBox={`0 0 ${width} ${H}`} width={width} height={H} role="img" aria-label={`${title}: ${points.length} readings from ${points[0]!.value} to ${vals[vals.length - 1]} ${unit}`}><ChartDefs id={`m-${id}`} pillar="health" /><ChartGrid ticks={[{y: y(hi), label: hi}, {y: y(lo), label: lo}]} left={PAD.left} right={width - PAD.right} /><path className="chart-ink" d={d} stroke={`url(#m-${id}-ink)`} />{points.map((p, i) => <circle key={p.date} className="chart-dot" cx={x(i)} cy={y(p.value)} r="3.5" />)}<ChartXAxis ticks={[{x: x(0), label: formatDate(points[0]!.date, {year: false})}, {x: x(points.length - 1), label: formatDate(points[points.length - 1]!.date, {year: false})}]} y={H - 6} /></svg>
    <details className="health-trend-table"><summary>Show as a table</summary><table><tbody>{points.map(p => <tr key={p.date}><td>{formatDate(p.date)}</td><td>{p.value} {unit}</td></tr>)}</tbody></table></details></div>;
}
/** N9: charts per measurement kind (the synced kinds and the person's own), custom kinds, and progress photos. */
export function MeasurementsAa({data, today}: {data: HealthData; today: string}) {
  const custom = useDeviceRecord(MEASUREMENTS_CUSTOM), photos = useDeviceRecord(PROGRESS_PHOTOS);
  const [label, setLabel] = useState(''), [unit, setUnit] = useState<'cm' | 'in'>('cm'), [kind, setKind] = useState(''), [value, setValue] = useState(''), [date, setDate] = useState(today), [error, setError] = useState('');
  const synced = measurementKinds.filter(k => k !== 'weight').map(k => { const h = measurementHistory(data, k); return {id: k, title: k[0]!.toUpperCase() + k.slice(1), unit: h.readings[0]?.unit === 'in' ? 'in' : 'cm', points: h.readings.map(r => ({date: r.observedAt.slice(0, 10), value: Math.round((r.unit === 'in' ? r.canonical / 25400 : r.canonical / 10000) * 10) / 10}))}; });
  const customKinds = custom.loaded && !custom.unreadable ? custom.data.kinds ?? [] : [];
  const customCharts = customKinds.map(k => ({id: k.id, title: k.label, unit: k.unit, points: customHistory(custom.data, k.id).map(r => ({date: r.date, value: Math.round(r.valueMilli / 100) / 10}))}));
  const keep = (what: () => void) => { try { what(); setError(''); } catch (e) { setError(e instanceof Error && !/storage|quota/i.test(e.message) ? e.message : `Not saved on this device. ${deviceSettingFailureMessage(e)}`); } };
  return <div className="health-measurements-aa">
    <section className="panel health-aa-card" aria-labelledby="measure-charts-title"><p className="eyebrow">Over time</p><h2 id="measure-charts-title"><NebulaFlow identity="measure-charts-title">Measurement charts</NebulaFlow></h2>
      <div className="health-measure-charts">{[...synced, ...customCharts].map(c => <MiniChart key={c.id} id={c.id} title={c.title} unit={c.unit} points={c.points} />)}</div>
      <form className="health-custom-form" aria-label="Add a reading" onSubmit={e => { e.preventDefault(); keep(() => { const v = readFormNumber(value, {min: 0.1, max: 5000}); custom.update(r => addCustomReading(r, kind, date, v, new Date().toISOString())); setValue(''); }); }}>
        <label className="field"><span>Your own measurement</span><select value={kind} onChange={e => setKind(e.target.value)} required><option value="">Choose</option>{customKinds.map(k => <option key={k.id} value={k.id}>{k.label} ({k.unit})</option>)}</select></label><label className="field"><span>Value</span><input type="text" inputMode="decimal" value={value} onChange={e => setValue(e.target.value)} /></label><label className="field"><span>Date</span><input type="date" max={today} value={date} onChange={e => setDate(e.target.value)} /></label><div className="actions"><button type="submit" className="secondary" disabled={!kind}>Add reading</button></div></form>
      <form className="health-custom-form" aria-label="Add a measurement kind" onSubmit={e => { e.preventDefault(); keep(() => { custom.update(r => addCustomKind(r, label, unit)); setLabel(''); }); }}><label className="field"><span>Add any measurement</span><input type="text" maxLength={40} value={label} onChange={e => setLabel(e.target.value)} placeholder="Neck, calf, shoulders…" /></label><label className="field"><span>Unit</span><select value={unit} onChange={e => setUnit(e.target.value as 'cm' | 'in')}><option value="cm">cm</option><option value="in">in</option></select></label><div className="actions"><button type="submit" className="secondary" disabled={!label.trim()}>Add</button>{customKinds.length > 0 && <button type="button" className="quiet" onClick={() => keep(() => { const id = kind || customKinds[customKinds.length - 1]!.id; /* Session AH Part 3 (DS5): Undo puts the kind and its readings back. */ removeWithUndo(custom.update, r => removeCustomKind(r, id), 'Measurement removed with its readings.', 'The measurement and its readings are back.').catch(e => setError(`Not removed. ${deviceSettingFailureMessage(e)}`)); setKind(''); })}>Remove the chosen one</button>}</div></form>
      {customKinds.length > 0 && kind && customHistory(custom.data, kind).length > 0 && <p className="fine">Last reading: <button type="button" className="text-link" onClick={() => keep(() => { removeWithUndo(custom.update, r => removeCustomReading(r, customHistory(r, kind).at(-1)!.id), 'Last reading removed.', 'The reading is back.').catch(e => setError(`Not removed. ${deviceSettingFailureMessage(e)}`)); })}>remove it</button></p>}
      {error && <p role="alert">{error}</p>}
      <p className="fine">Waist, hips, chest, arm and thigh travel with your Health records; your own kinds travel in your encrypted extras while Health sync is on.</p>
    </section>
    <ProgressPhotos photos={photos} today={today} />
  </div>;
}
function ProgressPhotos({photos, today}: {photos: ReturnType<typeof useDeviceRecord<ReturnType<typeof PROGRESS_PHOTOS.empty>>>; today: string}) {
  const scope = (() => { try { return isShowcase() ? 'showcase' : getAccountScope() ?? 'local'; } catch { return 'local'; } })();
  const list = photos.loaded && !photos.unreadable ? photos.data.photos ?? [] : [];
  const [urls, setUrls] = useState<Record<string, string>>({}), [picked, setPicked] = useState<string[]>([]), [pose, setPose] = useState<PhotoEntry['pose']>('front'), [date, setDate] = useState(today), [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => { let active = true; const made: string[] = []; (async () => { const next: Record<string, string> = {}; for (const p of list) { try { const blob = await getPhotoBlob(scope, p.id); if (blob) { const u = URL.createObjectURL(blob); made.push(u); next[p.id] = u; } } catch { /* shown as missing */ } } if (active) setUrls(next); })(); return () => { active = false; for (const u of made) URL.revokeObjectURL(u); }; }, [list.map(p => p.id).join('|'), scope]); // eslint-disable-line react-hooks/exhaustive-deps
  async function add(file: File) {
    setBusy(true); setError('');
    try { const {blob, type} = await compressImage(file); const id = `photo_${crypto.randomUUID()}`; await putPhotoBlob(scope, id, blob); try { photos.update(r => addPhotoEntry(r, {id, date, pose, bytes: blob.size, type, at: new Date().toISOString()})); } catch (e) { await deletePhotoBlob(scope, id); throw e; } }
    catch (e) { setError(e instanceof Error ? e.message : 'The photo was not saved.'); } finally { setBusy(false); }
  }
  // Session AH Part 3 (DS5): a photo's image is deleted from this device for good, so removing one asks first, in place.
  const [removing, setRemoving] = useState<string | null>(null);
  async function remove(id: string) { setRemoving(null); try { photos.update(r => removePhotoEntry(r, id)); await deletePhotoBlob(scope, id); setPicked(p => p.filter(x => x !== id)); } catch (e) { setError(e instanceof Error ? e.message : 'The photo was not removed.'); } }
  const pair = picked.map(id => list.find(p => p.id === id)).filter((p): p is PhotoEntry => !!p);
  return <section className="panel health-aa-card" aria-labelledby="photos-title"><p className="eyebrow">On this device only</p><h2 id="photos-title"><NebulaFlow identity="photos-title">Progress photos</NebulaFlow></h2>
    <form className="health-photo-add" aria-label="Add a progress photo" onSubmit={e => e.preventDefault()}><label className="field"><span>Photo</span><input type="file" accept="image/*" disabled={busy} onChange={e => { const f = e.target.files?.[0]; if (f) void add(f); e.target.value = ''; }} /></label><label className="field"><span>Pose</span><select value={pose} onChange={e => setPose(e.target.value as PhotoEntry['pose'])}><option value="front">Front</option><option value="side">Side</option><option value="back">Back</option><option value="other">Other</option></select></label><label className="field"><span>Date</span><input type="date" max={today} value={date} onChange={e => setDate(e.target.value)} /></label></form>
    {busy && <p role="status">Shrinking and saving…</p>}{error && <p role="alert">{error}</p>}
    {list.length ? <><div className="health-photos-grid">{list.map(p => <figure key={p.id} className="health-photo" data-picked={picked.includes(p.id) || undefined}>{urls[p.id] ? /* a device-only blob URL: next/image cannot optimise it and must never fetch it */ <img src={urls[p.id]} alt={`${p.pose} photo, ${formatDate(p.date)}`} /> : <div className="health-photo-missing">Photo unavailable</div>}<small>{formatDate(p.date)} · {p.pose} · {Math.round(p.bytes / 1024)} kB</small><div className="actions"><button type="button" className="quiet" aria-pressed={picked.includes(p.id)} onClick={() => setPicked(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev.slice(-1), p.id])}>Compare</button><button type="button" className="quiet" aria-expanded={removing === p.id} aria-label={`Remove the ${p.pose} photo of ${formatDate(p.date)}`} onClick={() => setRemoving(p.id)}>Remove</button></div>{removing === p.id && <ConfirmInline title="Remove this photo?" confirmLabel="Remove photo" cancelLabel="Keep it" onConfirm={() => void remove(p.id)} onCancel={() => setRemoving(null)}><p>The image is deleted from this device for good. Export a backup first if you want to keep a copy.</p></ConfirmInline>}</figure>)}</div>
      {pair.length === 2 && <div className="health-photo-compare" aria-label="Side by side">{pair.map(p => <figure key={p.id}><img src={urls[p.id]} alt="" /><figcaption>{formatDate(p.date)} · {p.pose}</figcaption></figure>)}</div>}</>
      : <p className="health-empty-inline">Add two photos and compare them side by side. Shrunk on your device, never synced, included in Export everything.</p>}
    <p className="fine">Stored in this browser only (at most 60); the account’s erase removes them.</p>
  </section>;
}
