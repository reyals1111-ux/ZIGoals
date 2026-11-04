'use client';
import Link from 'next/link';
import {useEffect, useId, useRef, useState, type FormEvent, type ReactNode} from 'react';
import {MAX_INPUT_CHARS} from '../../lib/ai/chats';
import {sendToNova} from '../../lib/nova/bridge';
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
  const close = () => { setOpen(false); requestAnimationFrame(() => button.current?.focus()); };
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);
  return <div className="nova-menu" data-align={align}>
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

export function CommandField({you, persona, inputRef, onOpen}: {you: string; persona: string; inputRef: React.RefObject<HTMLInputElement | null>; onOpen: () => void}) {
  const [text, setText] = useState(''), hint = useId(), pasted = useRef(false); // Z1A-2: a paste is marked, so no card from the reply is auto-accepted
  const apple = useApplePlatform(); // Session AK P3 (ND-21): ⌘K on Apple devices, Ctrl K elsewhere
  const submit = (e: FormEvent) => { e.preventDefault(); const t = text.trim(); if (t && sendToNova(t, {pasted: pasted.current})) { setText(''); pasted.current = false; } onOpen(); };
  // Session AK P3 (ND-5): one calm glass field (the input draws no box of its own) and a one-line hint.
  return <form className="nova-command zg-glass" onSubmit={submit} aria-label={`Ask ${persona}`}>
    <NovaIcon name="star" size={22}/>
    <div className="nova-command-text">
      <input ref={inputRef} value={text} onChange={e => { setText(e.target.value.slice(0, MAX_INPUT_CHARS)); if (!e.target.value) pasted.current = false; }} onPaste={() => { pasted.current = true; }} placeholder={`What’s on your mind${you ? `, ${you}` : ''}?`} aria-label={`Message ${persona}`} aria-describedby={hint} aria-keyshortcuts={commandKeyShortcut(apple, 'k')} autoComplete="off" enterKeyHint="send" maxLength={MAX_INPUT_CHARS}/>
      <small id={hint}>Enter to ask {persona} · nothing is sent before you press it.</small>
    </div>
    <kbd className="nova-kbd" aria-hidden="true">{commandKeyLabel(apple, 'k')}</kbd>
    <button type="submit" className="nova-send" aria-label={text.trim() ? `Send to ${persona}` : `Open the conversation with ${persona}`}><NovaIcon name="right" size={22}/></button>
  </form>;
}
