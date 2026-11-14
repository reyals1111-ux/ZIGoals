'use client';
import {HOLO_ROWS, HUD_LOOKS, HUD_LOOK_LABEL, HUD_PRESETS, HUD_PRESET_ABOUT, HUD_PRESET_LABEL, HUD_PRESET_PLAN, placeOrbit, presetWidgets, type HudLook, type HudPreset} from '../../../lib/nova/layout';
import {widgetSpec} from '../../../lib/nova/widgets/catalog';

/**
 * Review p1 (lane L8d): a 64 × 40 sketch of each preset — the star in the middle and each panel beside it in its pillar's
 * colour, as tall as its size (what fits beside the star at a 1440 px window; the rest is the band, dotted under it).
 * Decoration: the button says the preset's name and what it holds in words.
 */
const SKETCH_INK: Record<string, string> = {health: '#ff74be', habits: '#23eaff', goals: '#9273ff', wealth: '#ffd27a', orbit: '#7fc8ff'};
export function PresetSketch({preset}: {preset: HudPreset}) {
  const plan = HUD_PRESET_PLAN[preset], widgets = presetWidgets(preset), unit = 7.5, top = 4;
  const ink = (id: string) => SKETCH_INK[widgetSpec(id)?.pillar ?? 'orbit'] ?? SKETCH_INK.orbit;
  if (plan.layout === 'focus') return <svg className="holo-preset-sketch" viewBox="0 0 64 40" aria-hidden="true" focusable="false">
    <circle cx="32" cy="14" r="8" className="holo-sketch-star"/>
    {widgets.slice(0, 3).map((w, i) => <rect key={w.id} x={6 + i * 18} y="28" width="16" height="8" rx="1.5" fill="none" stroke={ink(w.id)}/>)}
  </svg>;
  const placed = placeOrbit(widgets, 4, HOLO_ROWS), band = placed.filter(p => p.side === 'band').length;
  return <svg className="holo-preset-sketch" viewBox="0 0 64 40" aria-hidden="true" focusable="false">
    <circle cx="32" cy="18" r="7" className="holo-sketch-star"/>
    {placed.filter(p => p.side !== 'band').map(p => <rect key={p.id} x={p.side === 'left' ? 3 : 45} y={top + (p.row - 1) * unit + 0.6} width={p.size === 'L' ? 18 : 16} height={p.rows * unit - 1.2} rx="1.5" fill="none" stroke={ink(p.id)} transform={p.side === 'right' && p.size === 'L' ? 'translate(-2 0)' : undefined}/>)}
    {Array.from({length: Math.min(band, 8)}, (_, i) => <circle key={i} cx={32 - (Math.min(band, 8) - 1) * 2.5 + i * 5} cy="37" r="1.1" className="holo-sketch-band"/>)}
  </svg>;
}

/**
 * Session AL Part 11 (lane L8): the HUD presets and the look (Holo or Classic), as plain buttons: each is a native
 * button (Enter and Space), the current one pressed, and the arrow keys move between them in a group. A preset replaces
 * the stage's layout and widgets in one step, with Undo (the dashboard says it in the app's one toast).
 */
function arrows(e: React.KeyboardEvent<HTMLDivElement>) {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
  const buttons = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('button')], at = buttons.indexOf(document.activeElement as HTMLButtonElement);
  if (at < 0) return;
  e.preventDefault();
  buttons[(at + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? buttons.length - 1 : 1)) % buttons.length]?.focus();
}
export function PresetPicker({shown, onApply, compact = false}: {shown: HudPreset | null; onApply: (p: HudPreset) => void; compact?: boolean}) {
  return <fieldset className="nova-fieldset holo-presets"><legend>HUD presets</legend>
    <div className="holo-preset-row" role="group" aria-label="HUD presets" onKeyDown={arrows}>{HUD_PRESETS.map(p => <button key={p} type="button" className="holo-preset" aria-pressed={shown === p} aria-describedby={compact ? undefined : `holo-preset-${p}`} onClick={() => onApply(p)}>
      <PresetSketch preset={p}/><span>{HUD_PRESET_LABEL[p]}</span>{!compact && <small id={`holo-preset-${p}`}>{HUD_PRESET_ABOUT[p]}</small>}
    </button>)}</div>
    {compact && <p className="nova-fine">{shown ? `${HUD_PRESET_LABEL[shown]}: ${HUD_PRESET_ABOUT[shown]}` : 'Your own arrangement. A preset replaces it; Undo puts it back.'}</p>}
  </fieldset>;
}
export function LookPicker({look, onLook}: {look: HudLook; onLook: (l: HudLook) => void}) {
  return <fieldset className="nova-fieldset holo-presets"><legend>Widget look</legend>
    <div className="holo-preset-row" role="group" aria-label="Widget look" onKeyDown={arrows}>{HUD_LOOKS.map(l => <button key={l} type="button" className="holo-preset" aria-pressed={look === l} onClick={() => onLook(l)}>
      <span>{HUD_LOOK_LABEL[l]}</span><small>{l === 'holo' ? 'A holographic HUD: neon data on glass panels.' : 'The calm glass cards.'}</small>
    </button>)}</div>
  </fieldset>;
}
