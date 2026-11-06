'use client';
import {removeWithUndo} from '../ui/remove-with-undo';
import {ConfirmInline} from '../ui/confirm-inline';
/* eslint-disable @next/next/no-img-element -- the progress photos are blob URLs of the person's own device-only files; next/image cannot optimise them */
import {Suspense, lazy, useEffect, useState} from 'react';
import {LoadBoundary} from '../load-boundary';
// Session AK (F5b): measurement trends and the before/after slider, each its own chunk, loaded when opened.
const MeasurementTrends = lazy(() => import('./measurement-trends').then(m => ({default: m.MeasurementTrends})));
const PhotoCompare = lazy(() => import('./photo-compare'));
import {NebulaFlow} from '../nebula-flow';
import {useChartWidth} from '../charts/use-chart-width';
import {ChartGrid, ChartXAxis} from '../charts/chart-kit';
import {ChartLookDefs, useChartLook} from '../charts/chart-defs';
import {measureCharts} from '../../lib/health-aa/measure-charts';
import {dailyData} from '../../lib/health-daily';
import {useDeviceRecord} from '../ai/use-device-record';
import {MEASUREMENTS_CUSTOM, addBodyFat, addCustomKind, addCustomReading, bodyFatHistory, customHistory, removeBodyFat, removeCustomKind, removeCustomReading, type MeasurementsCustom} from '../../lib/health-aa/measurements-custom';
import {PROGRESS_PHOTOS, addPhotoEntry, compressImage, deletePhotoBlob, getPhotoBlob, putPhotoBlob, removePhotoEntry, type PhotoEntry} from '../../lib/health-aa/photos';
import type {HealthData} from '../../lib/health';
import {validateValue} from '../../lib/limits/plausibility';
import {formatDate, formatNumber} from '../../lib/visual-format';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import {getAccountScope} from '../../lib/account-session';
import {isShowcase} from '../../lib/showcase-storage';
import './health-aa.css';
import {plainErrorMessage} from '../../lib/plain-error';
import {ArtNote} from '../illustrations/art-note';

const H = 120, PAD = {top: 10, right: 8, bottom: 22, left: 40};
const one0 = (v: number) => formatNumber(v, {maximumFractionDigits: 1});
function MiniChart({title, points, unit}: {title: string; points: {date: string; value: number}[]; unit: string; id: string}) {
  const [plot, width] = useChartWidth(260, 200), look = useChartLook();
  if (points.length < 2) return <div className="health-measure-chart"><h3><span>{title}</span> <small>{points.length ? `${one0(points[0]!.value)} ${unit}` : '—'}</small></h3><small>{points.length ? 'One reading; a second draws the line.' : 'No readings yet.'}</small></div>;
  // Session AH (HE6; L-054, B-120, N-121): one decimal in every label, the axis never below zero, dates in words.
  const vals = points.map(p => p.value), lo = Math.max(0, Math.min(...vals)), hi = Math.max(...vals), span = Math.max(hi - lo, 1), one = (v: number) => formatNumber(v, {maximumFractionDigits: 1});
  const x = (i: number) => PAD.left + (i / (points.length - 1)) * (width - PAD.left - PAD.right), y = (v: number) => PAD.top + (1 - (v - lo) / span) * (H - PAD.top - PAD.bottom);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const change = vals[vals.length - 1]! - vals[0]!;
  return <div className="health-measure-chart" ref={plot}><h3><span>{title}</span> <small>{one(vals[vals.length - 1]!)} {unit} · {change > 0 ? '+' : change < 0 ? '−' : ''}{one(Math.abs(change))} {unit} since {formatDate(points[0]!.date)}</small></h3>
    <svg className="zg-chart" data-pillar="health" viewBox={`0 0 ${width} ${H}`} width={width} height={H} role="img" aria-label={`${title}: ${points.length} readings from ${one(points[0]!.value)} to ${one(vals[vals.length - 1]!)} ${unit}`}><ChartLookDefs id={look.id} width={width} height={H} /><ChartGrid ticks={[{y: y(hi), label: one(hi)}, {y: y(lo), label: one(lo)}]} left={PAD.left} right={width - PAD.right} /><path className="chart-ink zgc-line" d={d} style={{stroke: look.stroke('a')}} filter={look.glow} />{points.map((p, i) => <circle key={p.date} className="chart-dot" cx={x(i)} cy={y(p.value)} r="3.5" />)}<ChartXAxis ticks={[{x: x(0), label: formatDate(points[0]!.date, {year: false})}, {x: x(points.length - 1), label: formatDate(points[points.length - 1]!.date, {year: false})}]} y={H - 6} /></svg>
    <details className="health-trend-table"><summary>Show as a table</summary><table><tbody>{points.map(p => <tr key={p.date}><td>{formatDate(p.date)}</td><td>{one(p.value)} {unit}</td></tr>)}</tbody></table></details></div>;
}
/** N9: charts per measurement kind (the synced kinds and the person's own), custom kinds, and progress photos. */
export function MeasurementsAa({data, today}: {data: HealthData; today: string}) {
  const custom = useDeviceRecord(MEASUREMENTS_CUSTOM), photos = useDeviceRecord(PROGRESS_PHOTOS);
  const [label, setLabel] = useState(''), [unit, setUnit] = useState<'cm' | 'in'>('cm'), [kind, setKind] = useState(''), [value, setValue] = useState(''), [date, setDate] = useState(today), [error, setError] = useState(''), [trendsOpen, setTrendsOpen] = useState(false), [removingKind, setRemovingKind] = useState<string | null>(null);
  const customKinds = custom.loaded && !custom.unreadable ? custom.data.kinds ?? [] : [];
  // Session AL (P-MO-72, MO-140): every chart in one length unit (the journal's: cm beside kg, in beside lb).
  const charts = measureCharts(data, custom.loaded && !custom.unreadable ? custom.data : null, dailyData(data).preferences.weightUnit);
  const keep = (what: () => void) => { try { what(); setError(''); } catch (e) { setError(e instanceof Error && !/storage|quota/i.test(e.message) ? e.message : `Not saved on this device. ${deviceSettingFailureMessage(e)}`); } };
  return <div className="health-measurements-aa">
    <section className="panel health-aa-card" aria-labelledby="measure-charts-title"><p className="eyebrow">Over time</p><h2 id="measure-charts-title"><NebulaFlow identity="measure-charts-title">Measurement charts</NebulaFlow></h2>
      <div className="health-measure-charts">{charts.map(c => <MiniChart key={c.id} id={c.id} title={c.title} unit={c.unit} points={c.points} />)}</div>
      {/* Session AK (F5b): the week's change and the eight-week trend per kind, in the journal's units; loaded when opened. */}
      <details className="health-measure-trends" onToggle={e => setTrendsOpen(e.currentTarget.open)}><summary>Trends and weekly change</summary>{trendsOpen && <LoadBoundary quiet><Suspense fallback={null}><MeasurementTrends data={data} /></Suspense></LoadBoundary>}</details>
      <form className="health-custom-form" aria-label="Add a reading" onSubmit={e => { e.preventDefault(); keep(() => { /* Session AL (3d): the one limits table for a body circumference, in the kind's own unit (10–250 cm or the inch range) */ const unitOf = customKinds.find(k => k.id === kind)?.unit ?? 'cm', checked = validateValue('waist', value, unitOf); if (!checked.ok) throw new Error(checked.error); custom.update(r => addCustomReading(r, kind, date, checked.input, new Date().toISOString())); setValue(''); }); }}>
        <label className="field"><span>Your own measurement</span><select value={kind} onChange={e => setKind(e.target.value)} required><option value="">Choose</option>{customKinds.map(k => <option key={k.id} value={k.id}>{k.label} ({k.unit})</option>)}</select></label>{/* Session AL (P-MO-30, MO-097): each field names what it is for ("Value for Neck (cm)", "Date of the reading"), not "Value", "Date". */}<label className="field"><span>{(() => { const k = customKinds.find(x => x.id === kind); return k ? `Value for ${k.label} (${k.unit})` : 'Value (choose your measurement first)'; })()}</span>{/* Session AL fourth pass (MO-097): it names what it waits for, and takes a value once a measurement is chosen */}<input type="text" inputMode="decimal" value={value} disabled={!kind} onChange={e => setValue(e.target.value)} /></label><label className="field"><span>Date of the reading</span><input type="date" max={today} value={date} onChange={e => setDate(e.target.value)} /></label><div className="actions"><button type="submit" className="secondary" disabled={!kind}>Add reading</button></div></form>
      <form className="health-custom-form" aria-label="Add a measurement kind" onSubmit={e => { e.preventDefault(); keep(() => { custom.update(r => addCustomKind(r, label, unit)); setLabel(''); }); }}><label className="field"><span>Add any measurement</span><input type="text" maxLength={40} value={label} onChange={e => setLabel(e.target.value)} placeholder="Neck, calf, shoulders…" /></label><label className="field"><span>Unit of the new measurement</span><select value={unit} onChange={e => setUnit(e.target.value as 'cm' | 'in')}><option value="cm">cm</option><option value="in">in</option></select></label><div className="actions"><button type="submit" className="secondary" disabled={!label.trim()}>Add</button>{customKinds.length > 0 && <button type="button" className="quiet" aria-expanded={removingKind !== null} onClick={() => setRemovingKind(kind || customKinds[customKinds.length - 1]!.id)}>Remove the chosen one</button>}</div></form>
      {/* Session AL (P-MO-57, MO-142): removing a kind takes its readings too, so it asks first and names both; Undo stays. */}
      {removingKind && (() => { const k = customKinds.find(x => x.id === removingKind), n = customHistory(custom.data, removingKind).length; return k ? <ConfirmInline title={`Remove ${k.label} and its ${n} ${n === 1 ? 'reading' : 'readings'}?`} confirmLabel={`Remove ${k.label}`} cancelLabel="Keep it" onConfirm={() => { const id = removingKind; setRemovingKind(null); keep(() => { /* Session AH Part 3 (DS5): Undo puts the kind and its readings back. */ removeWithUndo(custom.update, r => removeCustomKind(r, id), `${k.label} removed with its readings.`, `${k.label} and its readings are back.`).catch(e => setError(`Not removed. ${deviceSettingFailureMessage(e)}`)); setKind(''); }); }} onCancel={() => setRemovingKind(null)}><p>You can undo it right after.</p></ConfirmInline> : null; })()}
      {customKinds.length > 0 && kind && customHistory(custom.data, kind).length > 0 && <p className="fine">Last reading: <button type="button" className="text-link" onClick={() => keep(() => { removeWithUndo(custom.update, r => removeCustomReading(r, customHistory(r, kind).at(-1)!.id), 'Last reading removed.', 'The reading is back.').catch(e => setError(`Not removed. ${deviceSettingFailureMessage(e)}`)); })}>remove it</button></p>}
      {error && <p role="alert">{error}</p>}
      <p className="fine">Waist, hips, chest, arm and thigh travel with your Health records; your own kinds travel in your encrypted extras while Health sync is on.</p>
    </section>
    <BodyFat custom={custom} today={today} />
    <ProgressPhotos photos={photos} today={today} />
  </div>;
}
/**
 * Session AL third pass (GAP-053, C-MO-17): body-fat % beside the measurements: a reading per day (from your scale or a
 * caliper, as you typed it), its chart and its last value. Nothing is estimated from weight or circumferences.
 */
function BodyFat({custom, today}: {custom: {data: MeasurementsCustom; loaded: boolean; unreadable: boolean; update: (fn: (r: MeasurementsCustom) => MeasurementsCustom) => MeasurementsCustom}; today: string}) {
  const [value, setValue] = useState(''), [date, setDate] = useState(today), [issue, setIssue] = useState('');
  const history = custom.loaded && !custom.unreadable ? bodyFatHistory(custom.data) : [];
  const last = history.at(-1);
  return <section className="panel health-aa-card health-body-fat" aria-labelledby="body-fat-title"><p className="eyebrow">Body composition</p><h2 id="body-fat-title"><NebulaFlow identity="body-fat-title">Body fat %</NebulaFlow></h2>
    <MiniChart id="body-fat" title="Body fat" unit="%" points={history} />
    <form className="health-custom-form" aria-label="Add a body-fat reading" noValidate onSubmit={e => {
      e.preventDefault();
      const checked = validateValue('percent', value);
      if (!checked.ok) { setIssue(checked.error); document.getElementById('body-fat-value')?.focus(); return; }
      if (!date || date > today) { setIssue('Choose a day up to today.'); return; }
      try { custom.update(r => addBodyFat(r, date, checked.value, new Date().toISOString())); setValue(''); setIssue(''); }
      catch (cause) { setIssue(cause instanceof Error && !/storage|quota/i.test(cause.message) ? cause.message : `Not saved on this device. ${deviceSettingFailureMessage(cause)}`); document.getElementById('body-fat-value')?.focus(); }
    }}>
      <div><label className="field"><span>Body fat (%)</span><input id="body-fat-value" type="text" inputMode="decimal" autoComplete="off" value={value} aria-invalid={issue ? true : undefined} aria-describedby={issue ? 'body-fat-issue' : undefined} onChange={e => { setValue(e.target.value); setIssue(''); }} /></label>{issue && <p className="field-error" id="body-fat-issue" role="alert">{issue}</p>}</div>
      <label className="field"><span>Date of the body-fat reading</span><input type="date" max={today} value={date} onChange={e => setDate(e.target.value)} /></label>
      <div className="actions"><button type="submit" className="secondary">Add body-fat reading</button></div>
    </form>
    {last && <p className="fine">Last reading {one0(last.value)} % on {formatDate(last.date)} · <button type="button" className="text-link" onClick={() => { removeWithUndo(custom.update, r => removeBodyFat(r, last.id), 'Body-fat reading removed.', 'The body-fat reading is back.').catch(e => setIssue(`Not removed. ${deviceSettingFailureMessage(e)}`)); }}>remove it</button></p>}
    <p className="fine">As your scale or caliper shows it; one reading a day (a second replaces the first). Scales read body fat differently, so compare readings from the same device. Information, not medical advice.</p>
  </section>;
}
function ProgressPhotos({photos, today}: {photos: ReturnType<typeof useDeviceRecord<ReturnType<typeof PROGRESS_PHOTOS.empty>>>; today: string}) {
  const scope = (() => { try { return isShowcase() ? 'showcase' : getAccountScope() ?? 'local'; } catch { return 'local'; } })();
  const list = photos.loaded && !photos.unreadable ? photos.data.photos ?? [] : [];
  const [urls, setUrls] = useState<Record<string, string>>({}), [picked, setPicked] = useState<string[]>([]), [pose, setPose] = useState<PhotoEntry['pose']>('front'), [date, setDate] = useState(today), [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => { let active = true; const made: string[] = []; (async () => { const next: Record<string, string> = {}; for (const p of list) { try { const blob = await getPhotoBlob(scope, p.id); if (blob) { const u = URL.createObjectURL(blob); made.push(u); next[p.id] = u; } } catch { /* shown as missing */ } } if (active) setUrls(next); })(); return () => { active = false; for (const u of made) URL.revokeObjectURL(u); }; }, [list.map(p => p.id).join('|'), scope]); // eslint-disable-line react-hooks/exhaustive-deps
  async function add(file: File) {
    setBusy(true); setError('');
    try { const {blob, type} = await compressImage(file); const id = `photo_${crypto.randomUUID()}`; await putPhotoBlob(scope, id, blob); try { photos.update(r => addPhotoEntry(r, {id, date, pose, bytes: blob.size, type, at: new Date().toISOString()})); } catch (e) { await deletePhotoBlob(scope, id); throw e; } }
    catch (e) { setError(plainErrorMessage(e, 'The photo was not saved.')); } finally { setBusy(false); }
  }
  // Session AH Part 3 (DS5): a photo's image is deleted from this device for good, so removing one asks first, in place.
  const [removing, setRemoving] = useState<string | null>(null), [slider, setSlider] = useState(false);
  async function remove(id: string) { setRemoving(null); try { photos.update(r => removePhotoEntry(r, id)); await deletePhotoBlob(scope, id); setPicked(p => p.filter(x => x !== id)); } catch (e) { setError(plainErrorMessage(e, 'The photo was not removed.')); } }
  const pair = picked.map(id => list.find(p => p.id === id)).filter((p): p is PhotoEntry => !!p);
  return <section className="panel health-aa-card" aria-labelledby="photos-title"><p className="eyebrow">On this device only</p><h2 id="photos-title"><NebulaFlow identity="photos-title">Progress photos</NebulaFlow></h2>
    <form className="health-photo-add" aria-label="Add a progress photo" onSubmit={e => e.preventDefault()}><label className="field"><span>Photo file</span><input type="file" accept="image/*" disabled={busy} onChange={e => { const f = e.target.files?.[0]; if (f) void add(f); e.target.value = ''; }} /></label><label className="field"><span>Pose in the photo</span><select value={pose} onChange={e => setPose(e.target.value as PhotoEntry['pose'])}><option value="front">Front</option><option value="side">Side</option><option value="back">Back</option><option value="other">Other</option></select></label><label className="field"><span>Date taken</span><input type="date" max={today} value={date} onChange={e => setDate(e.target.value)} /></label></form>
    {busy && <p role="status">Shrinking and saving…</p>}{error && <p role="alert">{error}</p>}
    {list.length ? <><div className="health-photos-grid">{list.map(p => <figure key={p.id} className="health-photo" data-picked={picked.includes(p.id) || undefined}>{urls[p.id] ? /* a device-only blob URL: next/image cannot optimise it and must never fetch it */ <img src={urls[p.id]} alt={`${p.pose} photo, ${formatDate(p.date)}`} /> : <div className="health-photo-missing">Photo unavailable</div>}<small>{formatDate(p.date)} · {p.pose} · {Math.round(p.bytes / 1024)} kB</small><div className="actions"><button type="button" className="quiet" aria-pressed={picked.includes(p.id)} onClick={() => setPicked(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev.slice(-1), p.id])}>Compare</button><button type="button" className="quiet" aria-expanded={removing === p.id} aria-label={`Remove the ${p.pose} photo of ${formatDate(p.date)}`} onClick={() => setRemoving(p.id)}>Remove</button></div>{removing === p.id && <ConfirmInline title="Remove this photo?" confirmLabel="Remove photo" cancelLabel="Keep it" onConfirm={() => void remove(p.id)} onCancel={() => setRemoving(null)}><p>The image is deleted from this device for good. Export a backup first if you want to keep a copy.</p></ConfirmInline>}</figure>)}</div>
      {pair.length === 2 && <div className="health-photo-compare" aria-label="Side by side">{pair.map(p => <figure key={p.id}><img src={urls[p.id]} alt="" /><figcaption>{formatDate(p.date)} · {p.pose}</figcaption></figure>)}</div>}
      {/* Session AK (F5b): the before/after slider, opt-in per comparison, over the same device-only images; loaded when opened. */}
      {pair.length === 2 && <div className="actions"><button type="button" className="quiet" aria-expanded={slider} onClick={() => setSlider(open => !open)}>{slider ? 'Close the slider' : 'Compare with a slider'}</button></div>}
      {pair.length === 2 && slider && <LoadBoundary quiet><Suspense fallback={null}><PhotoCompare a={pair[0]!} b={pair[1]!} urls={urls} /></Suspense></LoadBoundary>}</>
      : <ArtNote pillar="health"><p className="health-empty-inline">Add two photos and compare them side by side or with a before/after slider. Shrunk on your device, never synced or uploaded, included in Export everything.</p></ArtNote>}
    <p className="fine">Stored in this browser only (at most 60); the account’s erase removes them.</p>
  </section>;
}
