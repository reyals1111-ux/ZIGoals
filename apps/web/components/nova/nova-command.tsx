'use client';
import Link from 'next/link';
import {useEffect, useId, useRef, useState, type FormEvent, type ReactNode} from 'react';
import {MAX_INPUT_CHARS} from '../../lib/ai/chats';
import {noteNovaDraft, sendToNova} from '../../lib/nova/bridge';
import {probeServer, type ScanModel} from '../../lib/nova/local-servers';
import {NOVA_LAYOUTS, WIDGET_SIZES, type NovaLayout, type NovaWidget, type WidgetSize} from '../../lib/nova/store';
import {LAYOUT_LABEL} from '../../lib/nova/share-setup';
import type {WidgetSpec} from '../../lib/nova/widgets/catalog';
import {useAiSettings} from '../ai/use-ai-settings';
import {NovaIcon} from './icons';
import {useApplePlatform} from './nova-top';
import {commandKeyLabel, commandKeyShortcut} from '../../lib/nova/command-key';
import type {Brain} from './status-chips';

/**
 * Session AK (owner follow-up 3, N12; lane NA): the foot of NOVA's stage. The command field ("What's on your mind?",
 * ⌘/Ctrl + K) hands the words to NOVA's chat (NB's NovaChat takes them through lib/nova/bridge.ts; nothing is sent before
 * the chat sends it), "View controls" (the layout and which widgets float on the stage, and arranging them), and the model
 * routing menu (Automatic, or one of the models the person's own brain offers; one engine: choosing a local model here
 * changes ZIGi's model too, as Settings would).
 */
function Menu({label, current, icon, align, children}: {label: string; current: string; icon: string; align: 'start' | 'end'; children: (close: () => void) => ReactNode}) {
  const [open, setOpen] = useState(false), id = useId(), button = useRef<HTMLButtonElement>(null), box = useRef<HTMLDivElement>(null);
  // The focus goes back to the menu's button only if it was lost with the closing panel (Session AL L8c: a frame later it
  // must not pull the focus back from wherever the person, or a test, already moved it, e.g. a panel's grip after Arrange).
  const close = () => { setOpen(false); requestAnimationFrame(() => { const at = document.activeElement; if (!at || at === document.body || box.current?.contains(at)) button.current?.focus(); }); };
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);
  // Session AL Part 11, second pass (lane L8): the panel also closes when the keyboard's focus leaves the menu (Tab, a toast's
  // Undo), as it already did for a tap outside, so an open panel never stays over what the focus moved to (WCAG 2.4.11).
  const leave = (e: React.FocusEvent<HTMLDivElement>) => { const next = e.relatedTarget as Node | null; if (open && next && !e.currentTarget.contains(next)) setOpen(false); };
  return <div className="nova-menu" data-align={align} onBlur={leave}>
    <button ref={button} type="button" className="nova-menu-button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(o => !o)}>
      <NovaIcon name={icon} size={18}/><span className="nova-menu-label"><span className="sr-only">{label}: </span>{current}</span><span className="nova-menu-caret" aria-hidden="true"><NovaIcon name={open ? 'up' : 'down'} size={16}/></span>
    </button>
    <div ref={box} id={id} className="nova-menu-panel" hidden={!open} role="group" aria-label={label}
      onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } }}>{open && children(close)}</div>
  </div>;
}

export function ViewControls({layout, widgets, available, editing, onLayout, onToggle, onSize, onArrange, extra}: {
  layout: NovaLayout; widgets: NovaWidget[]; available: WidgetSpec[]; editing: boolean;
  onLayout: (l: NovaLayout) => void; onToggle: (id: string, on: boolean) => void; onSize: (id: string, size: WidgetSize) => void; onArrange: () => void;
  /** Session AL Part 11 (lane L8): the HUD presets, under the layout. */
  extra?: ReactNode;
}) {
  const id = useId();
  return <Menu label="View controls" current={`View · ${LAYOUT_LABEL[layout]}`} icon="widgets" align="start">{close => <>
    <fieldset className="nova-fieldset"><legend>Layout</legend>
      <div className="nova-segment">{NOVA_LAYOUTS.map(l => <label key={l} className="nova-seg"><input type="radio" name={`${id}-layout`} checked={layout === l} onChange={() => onLayout(l)}/><span>{LAYOUT_LABEL[l]}</span></label>)}</div>
    </fieldset>
    {extra}
    <fieldset className="nova-fieldset"><legend>On the stage</legend>
      {/* Session AK P3 (ND-15): each row is the widget's name and its size as one S/M/L segment (the arrange bar's own). */}
      <ul className="nova-widget-toggles">{available.map(spec => { const on = widgets.find(w => w.id === spec.id); return <li key={spec.id}>
        <label className="nova-check"><input type="checkbox" checked={!!on} onChange={e => onToggle(spec.id, e.target.checked)}/><span>{spec.title}</span></label>
        {on && <span className="nova-sizes" role="group" aria-label={`Size of ${spec.title}`}>{WIDGET_SIZES.map(size => <button key={size} type="button" className="nova-size" aria-pressed={on.size === size} aria-label={size === 'S' ? 'Small' : size === 'M' ? 'Medium' : 'Large'} onClick={() => onSize(spec.id, size)}>{size}</button>)}</span>}
      </li>; })}</ul>
      {layout === 'minimal' && <p className="nova-fine">Minimal shows the star alone; your widgets wait here.</p>}
      {layout === 'focus' && <p className="nova-fine">Focus shows your first three.</p>}
    </fieldset>
    <div className="nova-menu-foot"><button type="button" className="nova-btn" aria-pressed={editing} onClick={() => { onArrange(); close(); }}><NovaIcon name="arrange" size={18}/>{editing ? 'Done arranging' : 'Arrange on the orbits'}</button></div>
  </>}</Menu>;
}

export function RoutingMenu({brain, routing, onRouting, openModels}: {brain: Brain; routing: string; onRouting: (r: string) => void; openModels: () => void}) {
  const settings = useAiSettings(), s = settings.data, id = useId();
  const [models, setModels] = useState<ScanModel[] | null>(null), [asking, setAsking] = useState(false), [note, setNote] = useState('');
  const local = settings.loaded && s.enabled && s.mode === 'local' && s.baseUrl ? s.baseUrl : null;
  const look = async () => {
    if (!local) return;
    setAsking(true); setNote('');
    const r = await probeServer({id: s.localServer === 'ollama' ? 'ollama' : 'lmstudio', name: 'Your local server', baseUrl: local, wire: s.localServer === 'ollama' ? 'ollama' : 'openai-compatible'});
    setAsking(false);
    if (r.found) setModels(r.models.filter(m => !m.cloud)); else setNote('Your local server did not answer. Is it running?');
  };
  const choose = (model: string) => {
    try { settings.update(cur => ({...cur, model})); onRouting(model); setNote(`${model} answers from now on, here and in ZIGi.`); } catch { setNote('This choice could not be saved on this device.'); }
  };
  const current = routing === 'auto' ? 'Automatic · best fit' : routing;
  return <Menu label="Model routing" current={current} icon="star" align="end">{() => <>
    <fieldset className="nova-fieldset"><legend>Which brain answers</legend>
      <label className="nova-radio"><input type="radio" name={`${id}-r`} checked={routing === 'auto'} onChange={() => onRouting('auto')}/><span>Automatic · best fit<small>The brain you connected answers ({brain.words}); with none, answers made on this device.</small></span></label>
      {local && (models ?? []).map(m => <label key={m.id} className="nova-radio"><input type="radio" name={`${id}-r`} checked={routing === m.id} onChange={() => choose(m.id)}/><span>{m.id}<small>On this computer · free</small></span></label>)}
    </fieldset>
    {local && models === null && <button type="button" className="nova-btn" disabled={asking} onClick={() => void look()}>{asking ? 'Asking your server…' : 'Show my local models'}</button>}
    {local && models?.length === 0 && <p className="nova-fine">Your server runs, but has no local chat model yet.</p>}
    {!local && brain.kind === 'none' && <p className="nova-fine">No brain is connected yet. <Link href="/app/nova/setup" prefetch={false} className="nova-link">Build one</Link></p>}
    {note && <p className="nova-fine" role="status">{note}</p>}
    <button type="button" className="nova-btn" onClick={openModels}>Models per task</button>
  </>}</Menu>;
}

/**
 * Session AM-2 (ref 11): the circuit traces that leave the command bar's ends. One drawing, anchored to the bar's edge
 * (its right side; the right end mirrors it in CSS); the bar shows as much of it as the room beside it allows. Decoration.
 */
function CircuitTrace({side}: {side: 'start' | 'end'}) {
  return <svg className="ncb-trace" data-side={side} viewBox="0 0 168 64" preserveAspectRatio="xMaxYMid slice" aria-hidden="true" focusable="false">
    <path d="M168 32H22M168 22h-12l-9-10h-27M168 42h-12l-9 10h-19M132 32l-11-12H74M108 32l-11 12H52M62 32 52 22H30M40 32l-9 9H14"/>
    <circle cx="116" cy="12" r="3.2"/><circle cx="124" cy="52" r="3.2"/><circle cx="70" cy="20" r="3.2"/><circle cx="48" cy="44" r="3.2"/><circle cx="26" cy="22" r="3.2"/><circle cx="10" cy="41" r="3.2"/><circle cx="18" cy="32" r="3.2"/>
    <circle data-lit="" cx="146" cy="32" r="2.2"/><circle data-lit="" cx="86" cy="32" r="2.2"/><circle data-lit="" cx="116" cy="12" r="1.1"/><circle data-lit="" cx="48" cy="44" r="1.1"/>
    <rect x="150" y="57" width="6" height="2.5"/><rect x="140" y="57" width="6" height="2.5"/><rect x="130" y="57" width="6" height="2.5"/><rect x="112" y="57" width="12" height="2.5"/><rect x="150" y="4.5" width="6" height="2.5"/><rect x="134" y="4.5" width="12" height="2.5"/>
  </svg>;
}

export function CommandField({you, persona, inputRef, onOpen, onBeforeSend, onMic, value, onValue, onKeys, keysOn = true}: {you: string; persona: string; inputRef: React.RefObject<HTMLInputElement | null>;
  /** Called after Enter: `sent` says whether words went to NOVA (Session AM, D7: on a computer the stage then answers in place; with nothing typed the conversation opens). */
  onOpen: (sent: boolean) => void;
  /** Session AM (D7): called just before the words go to NOVA (the dashboard notes they come from the stage's own field). */
  onBeforeSend?: () => void;
  /** Session AM (D9): opens the conversation on its microphone (speech input keeps its own switch and its disclosure there). */
  onMic?: () => void;
  /** Session AL second pass (lane L8; DV-070, TK-074): the words can live with the dashboard, so they outlast the field (the
   *  conversation opening hides it) and letters typed while no field had the focus land here. */
  value?: string; onValue?: (text: string) => void;
  /** Session AL second pass (P-TK-41): opens the list of keyboard shortcuts (computers). */
  onKeys?: () => void; keysOn?: boolean}) {
  const [own, setOwn] = useState(''), hint = useId(), pasted = useRef(false), [pulse, setPulse] = useState(0); // Z1A-2: a paste is marked, so no card from the reply is auto-accepted
  const text = value ?? own, setText = (t: string) => { if (onValue) onValue(t); else setOwn(t); };
  const apple = useApplePlatform(); // Session AK P3 (ND-21): ⌘K on Apple devices, Ctrl K elsewhere
  // Session AL Part 14 (DV-070): every change is noted as NOVA's draft, so the chat that opens while the person types starts
  // from these words; a successful sendToNova clears it.
  const submit = (e: FormEvent) => { e.preventDefault(); const t = text.trim(); let sent = false; if (t) { onBeforeSend?.(); if (sendToNova(t, {pasted: pasted.current})) { setText(''); pasted.current = false; sent = true; setPulse(n => n + 1); } } onOpen(sent); };
  // Session AK P3 (ND-5): one field (the input draws no box of its own) and a one-line hint.
  // Session AM-2: the bar is an instrument — a double frame, circuit traces at both ends, the star in a lit well; every
  // added part is decoration (aria-hidden, no pointer events). When words are sent, one band of light crosses the bar
  // (keyed by the count of sends, so it plays once per send; Full motion only, see nova.css).
  return <form className="nova-command zg-glass" onSubmit={submit} aria-label={`Ask ${persona}`}>
    <span className="ncb-glow" aria-hidden="true"/><span className="sh-inner" aria-hidden="true"/>
    <CircuitTrace side="start"/><CircuitTrace side="end"/>
    {pulse > 0 && <span key={pulse} className="ncb-pulse" aria-hidden="true"/>}
    <span className="ncb-well" aria-hidden="true"><NovaIcon name="star" size={22}/></span>
    <div className="nova-command-text">
      <input ref={inputRef} value={text} onChange={e => { const t = e.target.value.slice(0, MAX_INPUT_CHARS); setText(t); if (!t) pasted.current = false; noteNovaDraft(t, {pasted: pasted.current}); }} onPaste={() => { pasted.current = true; }} placeholder={`What’s on your mind${you ? `, ${you}` : ''}?`} aria-label={`Message ${persona}`} aria-describedby={hint} aria-keyshortcuts={commandKeyShortcut(apple, 'k')} autoComplete="off" enterKeyHint="send" maxLength={MAX_INPUT_CHARS}/>
      <small id={hint}>Enter to ask {persona} · nothing is sent before you press it.</small>
    </div>
    {onMic && <button type="button" className="holo-keys-btn ns-mic-btn" onClick={onMic} aria-label={`Speak to ${persona}`} data-tip="Speak"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><rect x="9" y="3.5" width="6" height="11" rx="3" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg></button>}
    {onKeys && <button type="button" className="holo-keys-btn" onClick={onKeys} aria-label="Keyboard shortcuts" aria-haspopup="dialog" aria-keyshortcuts={keysOn ? '?' : undefined} data-tip="Keyboard shortcuts · ?"><span aria-hidden="true">?</span></button>}
    <kbd className="nova-kbd" aria-hidden="true">{commandKeyLabel(apple, 'k')}</kbd>
    <button type="submit" className="nova-send" aria-label={text.trim() ? `Send to ${persona}` : `Open the conversation with ${persona}`}><NovaIcon name="right" size={22}/></button>
  </form>;
}
