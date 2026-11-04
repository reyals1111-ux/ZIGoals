'use client';
import {useEffect, useRef} from 'react';

/**
 * Session AL (Part 8, P-LS-07, LS-014/LS-044/LS-H25): the Tasks page's keyboard shortcuts and their help sheet ("?").
 * Single keys work only while no text field has the focus and no dialog is open; none of them takes a key the app
 * already uses everywhere: "/" opens Search, Ctrl/⌘+K opens ZIGi, Ctrl/⌘+J opens NOVA, Ctrl/⌘+Shift+Space talks to ZIGi.
 */
export const TASK_SHORTCUTS: {keys: string; does: string}[] = [
  {keys: 'q, a or n', does: 'Add a task (puts the cursor in the add field)'},
  {keys: 'f', does: 'Filter this list (search with #project, @label, p1, today, overdue)'},
  {keys: 'j / k or ↓ / ↑', does: 'Next / previous task'},
  {keys: 'e', does: 'Mark the task done (or open again)'},
  {keys: 'Enter', does: 'Edit the task'},
  {keys: '1 2 3 4', does: 'Priority P1 High … P4 Low'},
  {keys: 't  /  Shift+T', does: 'Due today / tomorrow'},
  {keys: 'x', does: 'Select the task (for bulk actions)'},
  {keys: 'Alt+↑ / Alt+↓', does: 'Move the task up / down'},
  {keys: 'Delete', does: 'Remove the task or the selected ones (with Undo)'},
  {keys: 'Ctrl/⌘+Z', does: 'Undo the last change while its message shows'},
  {keys: 'g then i / t / u / c', does: 'Go to Inbox / Today / Upcoming / Completed'},
  {keys: 'Esc', does: 'Close the editor, clear the selection or the filter'},
  {keys: '?', does: 'This list'},
];
export const APP_SHORTCUTS: {keys: string; does: string}[] = [
  {keys: '/', does: 'Search the whole app'},
  {keys: 'Ctrl/⌘+K', does: 'Open ZIGi'},
  {keys: 'Ctrl/⌘+J', does: 'Open NOVA'},
];
export default function TasksShortcuts({onClose}: {onClose: () => void}) {
  const box = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = box.current; if (d && !d.open) d.showModal(); return () => { if (d?.open) d.close(); }; }, []);
  return <dialog ref={box} className="tasks-shortcuts" aria-labelledby="tasks-shortcuts-title" onClose={onClose} onClick={e => { if (e.target === box.current) box.current?.close(); }}>
    <div>
      <header className="section-heading"><h2 id="tasks-shortcuts-title">Keyboard shortcuts</h2><button type="button" className="quiet" autoFocus aria-label="Close keyboard shortcuts" onClick={() => box.current?.close()}>×</button></header>
      <table><caption className="sr-only">On the Tasks page</caption><thead><tr><th scope="col">Keys</th><th scope="col">On the Tasks page</th></tr></thead>
        <tbody>{TASK_SHORTCUTS.map(s => <tr key={s.keys}><td><kbd>{s.keys}</kbd></td><td>{s.does}</td></tr>)}</tbody></table>
      <table><caption className="sr-only">Everywhere in the app</caption><thead><tr><th scope="col">Keys</th><th scope="col">Everywhere</th></tr></thead>
        <tbody>{APP_SHORTCUTS.map(s => <tr key={s.keys}><td><kbd>{s.keys}</kbd></td><td>{s.does}</td></tr>)}</tbody></table>
      <p className="fine">Single keys work when no text field has the cursor. On a phone, every action is also a button on the task.</p>
    </div>
  </dialog>;
}
