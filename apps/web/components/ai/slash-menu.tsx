'use client';
import {useState, type KeyboardEvent} from 'react';
import {suggestCommands, type SlashCommand} from '../../lib/ai/slash';
import './chat-polish.css';

/**
 * The "/" list in ZIGi's composer (Session V Part 10): while the first word after "/" is typed, the matching commands
 * show as a list box under the message box (the WAI-ARIA combobox pattern: arrow keys move, Enter or Tab picks, Escape
 * closes). Picking fills the box with the command; nothing is sent until the person sends it.
 */
export function useSlashMenu(text: string, pick: (command: SlashCommand) => void) {
  const suggestions = suggestCommands(text), [active, setActive] = useState(0), [closedFor, setClosedFor] = useState<string | null>(null);
  // A command typed in full ("/help") needs no list: Enter sends it.
  const complete = suggestions.length === 1 && suggestions[0]!.name === text.trim().toLowerCase();
  const open = suggestions.length > 0 && !complete && closedFor !== text, current = Math.min(active, Math.max(0, suggestions.length - 1));
  /** Handles the keys of the open list; true when the key was the list's. */
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): boolean => {
    if (!open) return false;
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((current + 1) % suggestions.length); return true; }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActive((current - 1 + suggestions.length) % suggestions.length); return true; }
    if (event.key === 'Enter' || event.key === 'Tab') { event.preventDefault(); pick(suggestions[current]!); setActive(0); return true; }
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setClosedFor(text); return true; }
    return false;
  };
  return {open, suggestions, active: current, onKeyDown, pick: (command: SlashCommand) => { pick(command); setActive(0); }};
}
export function SlashMenu({id, suggestions, active, onPick}: {id: string; suggestions: readonly SlashCommand[]; active: number; onPick: (command: SlashCommand) => void}) {
  return <ul id={id} role="listbox" aria-label="Commands" className="ai-slash-menu">
    {suggestions.map((command, i) => <li key={command.name} id={`${id}-${i}`} role="option" aria-selected={i === active} className={i === active ? 'ai-slash-active' : undefined} onMouseDown={event => event.preventDefault()} onClick={() => onPick(command)}>
      <strong>{command.name}</strong> <span>{command.hint}</span>
    </li>)}
  </ul>;
}
