import {removeWidget, saveWidget, type DashboardSettings, type DashboardWidget} from '../dashboard-settings';

/**
 * Session AL (P-BN-57, BN-097): an Ecosystem project's research shortcut on Today, read and changed from its card's ⋯
 * menu like a favourite. Pure: the card runs these through the settings store's own `update` (latest record in, new out).
 */
export const isShortcutOf = (id: string) => (w: Pick<DashboardWidget, 'kind' | 'metric' | 'entity'>) => w.kind === 'ecosystem' && w.metric === 'directory' && w.entity === id;
export const shortcutOf = (s: DashboardSettings, id: string) => s.widgets.find(isShortcutOf(id));
/** Adds the shortcut, or keeps the record as it is when it is already there (never a second one). */
export function addShortcut(s: DashboardSettings, id: string, widgetId: string): DashboardSettings {
  return shortcutOf(s, id) ? s : saveWidget(s, {id: widgetId, kind: 'ecosystem', metric: 'directory', entity: id, title: '', size: 'compact', hidden: false, revision: 1});
}
export function removeShortcut(s: DashboardSettings, id: string): DashboardSettings {
  const w = shortcutOf(s, id);
  return w ? removeWidget(s, w.id) : s;
}
/** Undo of a removal: the same widget (its id, title and size) back, unless the shortcut was added again meanwhile. */
export function restoreShortcut(s: DashboardSettings, widget: DashboardWidget): DashboardSettings {
  return shortcutOf(s, widget.entity ?? '') || s.widgets.some(w => w.id === widget.id) ? s : saveWidget(s, {...widget, revision: 1});
}
