'use client';
import Link from 'next/link';
import {useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {useHealth} from '../use-health';
import {useHealthToday} from '../use-health-today';
import {dailyData} from '../../../lib/health-daily';
import {formatHealthGrams, newHealthId, saveWeight} from '../../../lib/health';
import {isShowcase} from '../../../lib/showcase-storage';
import {bluetoothProblem, bluetoothSupport, connectScale, type Connection, type Support} from '../../../lib/bluetooth/web-bluetooth';
import {connectMonitor, disconnectMonitor} from '../../../lib/bluetooth/monitor';
import {heartSnapshot, SERVER_HEART, subscribeHeart} from '../../../lib/bluetooth/heart-store';
import type {BodyCompositionReading, WeightReading} from '../../../lib/bluetooth/gatt';
import {NebulaFlow} from '../../nebula-flow';
import {HealthLinks} from './health-links';
import './devices.css';

/**
 * Health → Devices (Session W Part 8; /app/health?view=devices): what can reach the Health journal, honestly, platform by
 * platform. A Bluetooth heart-rate monitor or scale works here where the browser has Web Bluetooth (Chrome or Edge on a
 * computer, Chrome on Android) and the page was loaded as Health; accounts at Oura, Withings, Polar and Strava need
 * ZIGoals' own registration and stay "needs setup" until the owner configures them; Apple Health, Health Connect,
 * Fitbit and Garmin offer no web access, so their path is the importer. Nothing here runs until the person asks.
 */
const LB = 0.45359237;
export default function DevicesView() {
  const [support, setSupport] = useState<Support | null>(null);
  useEffect(() => { queueMicrotask(() => setSupport(bluetoothSupport())); }, []);
  return <div className="devices-view">
    <div className="page-heading"><div>
      <p><Link className="text-link sleep-back" href="/app/health">← Health</Link></p>
      <p className="eyebrow page-eyebrow"><NebulaFlow identity="devices-eyebrow">HEALTH · DEVICES</NebulaFlow></p>
      <h1><NebulaFlow identity="devices-title">Your devices, honestly.</NebulaFlow></h1>
      <p className="page-lede">What can bring readings into your Health journal from here, and what cannot yet. Nothing connects until you ask.</p>
    </div></div>
    <section className="panel devices-section" aria-labelledby="devices-bluetooth-title">
      <h2 id="devices-bluetooth-title">On this device, by Bluetooth</h2>
      {support === null ? <p>Checking this browser…</p>
        : support === 'no-api' ? <p>This browser has no Web Bluetooth. Chrome or Edge on a computer, or Chrome on Android, can connect a heart-rate monitor or a scale; Safari, Firefox and iPhone browsers cannot.</p>
        : support === 'policy' ? <div className="devices-reload"><p>Bluetooth works on Health when it is opened as its own page.</p><a className="secondary devices-reload-link" href="/app/health?view=devices">Reload Health for Bluetooth</a></div>
        : <><HeartMonitor /><ScaleReader /></>}
    </section>
    <HealthLinks />
    <section className="panel devices-section" aria-labelledby="devices-import-title">
      <h2 id="devices-import-title">Bring your history instead</h2>
      <ul className="devices-platforms">
        <li><strong>Apple Health (iPhone, Apple Watch)</strong><p>No web access: Apple keeps Health on your devices. Export it from the Health app and import the file.</p></li>
        <li><strong>Health Connect (Android)</strong><p>No web access: Health Connect keeps data on the phone. Import from the app that writes to it, such as Samsung Health or Google Health.</p></li>
        <li><strong>Fitbit</strong><p>Fitbit&apos;s web access ended (turned off 30 October 2026) and Google&apos;s new Health API takes no new projects. Export with Google Takeout and import it.</p></li>
        <li><strong>Garmin</strong><p>Garmin&apos;s Health API is for approved businesses, and its export layout is unpublished, so ZIGoals does not read it yet. Garmin Connect can share your data with Apple Health or Health Connect.</p></li>
      </ul>
      <p><Link className="text-link" href="/app/settings#switch-import">Settings → Switch to ZIGoals →</Link></p>
    </section>
  </div>;
}

function HeartMonitor() {
  const heart = useSyncExternalStore(subscribeHeart, heartSnapshot, () => SERVER_HEART);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function connect() {
    setBusy(true); setError('');
    try { await connectMonitor(); }
    catch (cause) { const problem = bluetoothProblem(cause); if (problem) setError(problem); }
    finally { setBusy(false); }
  }
  return <div className="devices-card" role="group" aria-label="Heart-rate monitor">
    <h3>Heart-rate monitor</h3>
    {heart.connected ? <>
      <p className="devices-reading"><span aria-hidden="true">♥</span> <strong>{heart.latest ? heart.latest.bpm : '…'}</strong> bpm{heart.latest?.contact === 'lost' ? ' · no skin contact' : ''}</p>
      <p className="fine">{heart.device}. It stays connected while you move around ZIGoals (a reload ends it). A meditation session can keep your lowest, average and highest heart rate if you tick it when saving. Readings are never stored one by one.</p>
      <div className="actions"><button type="button" className="secondary" onClick={disconnectMonitor}>Disconnect</button></div>
    </> : <>
      <p>A chest strap or watch that offers the standard heart-rate service.</p>
      <div className="actions"><button type="button" className="secondary" disabled={busy} onClick={() => void connect()}>{busy ? 'Connecting…' : 'Connect a heart-rate monitor'}</button></div>
    </>}
    {(error || heart.error) && <p role="alert">{error || heart.error}</p>}
  </div>;
}

function ScaleReader() {
  const health = useHealth(), daily = dailyData(health.data), today = useHealthToday(daily.preferences.timezone), unit = daily.preferences.weightUnit;
  const connection = useRef<Connection | null>(null), [name, setName] = useState<string | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [status, setStatus] = useState('');
  const [weight, setWeight] = useState<WeightReading | null>(null), [body, setBody] = useState<BodyCompositionReading | null>(null);
  useEffect(() => () => { connection.current?.stop(); connection.current = null; }, []);
  async function connect() {
    setBusy(true); setError(''); setStatus('');
    try { const c = await connectScale(setWeight, r => { setBody(r); if (r.kg !== null) setWeight({kg: r.kg, unit: r.unit}); }, () => { connection.current = null; setName(null); }); connection.current = c; setName(c.name); }
    catch (cause) { const problem = bluetoothProblem(cause); if (problem) setError(cause instanceof Error && /neither/.test(cause.message) ? cause.message : problem); }
    finally { setBusy(false); }
  }
  const existing = health.data.weights.find(w => w.date === today);
  const shown = (kg: number) => unit === 'lb' ? `${(kg / LB).toFixed(1)} lb` : `${kg.toFixed(1)} kg`;
  async function save() {
    if (!weight) return;
    setError(''); setStatus('');
    if (isShowcase()) { setError('Showcase holds fictional records only, so readings are not saved here.'); return; }
    try { await health.update(latest => saveWeight(latest, {id: latest.weights.find(w => w.date === today)?.id ?? newHealthId(), date: today, grams: Math.round(weight.kg * 1000)}, new Date().toISOString())); setStatus(`Saved as your weight for ${today}: ${shown(weight.kg)}.`); setWeight(null); setBody(null); }
    catch (cause) { setError(cause instanceof Error && cause.message ? cause.message : 'The weight was not saved.'); }
  }
  return <div className="devices-card" role="group" aria-label="Scale">
    <h3>Scale</h3>
    {name ? <p className="fine">{name}: step on the scale. Each reading waits here for you to save it or not.</p> : <p>A scale that offers the standard weight or body composition service.</p>}
    {weight && <div className="devices-weight">
      <p className="devices-reading"><strong>{shown(weight.kg)}</strong>{body?.fatPct != null ? ` · body fat ${body.fatPct.toFixed(1)} %` : ''}</p>
      {body?.fatPct != null && <p className="fine">Body fat is shown, not saved: your Health journal has no place for it yet.</p>}
      {existing && <p className="notice">You already have a weight for {today} ({formatHealthGrams(existing.grams)} kg); saving replaces it.</p>}
      <div className="actions"><button type="button" className="primary" onClick={() => void save()}>{existing ? 'Replace today’s weight' : 'Save as today’s weight'}</button><button type="button" className="quiet" onClick={() => { setWeight(null); setBody(null); }}>Not this one</button></div>
    </div>}
    <div className="actions">{name ? <button type="button" className="secondary" onClick={() => { connection.current?.stop(); connection.current = null; setName(null); }}>Disconnect</button> : <button type="button" className="secondary" disabled={busy || !health.loaded} onClick={() => void connect()}>{busy ? 'Connecting…' : 'Connect a scale'}</button>}</div>
    {status && <p role="status">{status}</p>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
