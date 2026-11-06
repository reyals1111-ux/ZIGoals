'use client';
import type {DockEntry} from '../../../lib/nova/dock';
import {shortcutLines} from '../../../lib/nova/holo/keys';

/**
 * Session AL Part 11, second pass (lane L8; P-TK-41, L10a's request): NOVA's keyboard shortcuts, listed where a person can
 * find them (the "?" button in the field "What’s on your mind?", or the "?" key). Letters work only while single-key shortcuts are on and
 * the focus is not in a field; Ctrl/⌘ + K and Esc always work. The switch itself lives in Make NOVA yours.
 */
export default function ShortcutList({entries, on, panels, persona, onCustomize}: {entries: readonly DockEntry[]; on: boolean; panels: boolean; persona: string; onCustomize: () => void}) {
  const lines = shortcutLines(entries, {panels, persona}), always = new Set(['Ctrl/⌘ + K', 'Esc']);
  return <div className="holo-keys">
    <p className="nova-fine" role="status">{on
      ? `Single-key shortcuts are on. A letter works when the focus is not in a field; typing words while no field has the focus puts them in “What’s on your mind?”.`
      : 'Single-key shortcuts are off, so letters do nothing here. Ctrl/⌘ + K and Esc still work.'}</p>
    <table className="holo-keys-table">
      <caption className="sr-only">Keyboard shortcuts on {persona}</caption>
      <thead><tr><th scope="col">Key</th><th scope="col">What it does</th></tr></thead>
      <tbody>{lines.map(l => <tr key={l.keys} data-off={!on && !always.has(l.keys) ? '' : undefined}>
        <th scope="row"><kbd className="nova-kbd">{l.keys}</kbd></th>
        <td>{l.does}{!on && !always.has(l.keys) ? <span className="holo-keys-off"> · off now</span> : null}</td>
      </tr>)}</tbody>
    </table>
    <p className="nova-row-actions"><button type="button" className="nova-btn" onClick={onCustomize}>{on ? 'Turn single-key shortcuts off' : 'Turn single-key shortcuts on'} in Make {persona} yours</button></p>
  </div>;
}
