'use client';
import {HUD_LOOKS, HUD_LOOK_LABEL, HUD_PRESETS, HUD_PRESET_ABOUT, HUD_PRESET_LABEL, type HudLook, type HudPreset} from '../../../lib/nova/layout';

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
      <span>{HUD_PRESET_LABEL[p]}</span>{!compact && <small id={`holo-preset-${p}`}>{HUD_PRESET_ABOUT[p]}</small>}
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
