/**
 * ⌘/Ctrl + J opens NOVA's command bar from any page (Session AK, owner follow-up 2 N8). The shell binds it; this is the
 * one test of the key, tiny so the shell loads nothing else for it. Not while a key combination with Alt or Shift is held,
 * and not when another handler already took the event.
 */
export function isNovaShortcut(event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'defaultPrevented'>): boolean {
  return (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && !event.defaultPrevented && event.key.toLowerCase() === 'j';
}
