'use client';
import {useUiPrefs} from '../../lib/ui-prefs/use-ui-prefs';
import {GAME_WIDGETS, gameWidgetsOf, type GameWidget} from '../../lib/ui-prefs/schema';
import {useGameEnabled} from './use-game-enabled';

const LABELS: Record<GameWidget, {label: string; line: string}> = {
  xp: {label: 'Level & XP', line: 'Your level ring and the XP to the next one'},
  quests: {label: 'Today’s quests', line: 'The three quests picked from your pages'},
};
/**
 * Session AB-Design Phase 2, Part 8 (owner request 9, owner edit 1): in Today's "Add a widget" dialog, while Gamify is on,
 * the Journey widgets switch on and off at once (kept on this device, never synced). Off: nothing here, nothing on Today.
 */
export default function GameWidgetChoices() {
  const on = useGameEnabled(), prefs = useUiPrefs();
  if (!on || !prefs.loaded || prefs.unreadable) return null;
  const chosen = gameWidgetsOf(prefs.data);
  const toggle = (id: GameWidget) => { try { prefs.update(p => { const list = gameWidgetsOf(p); const next = list.includes(id) ? list.filter(x => x !== id) : [...list, id]; return {...p, today: {...p.today, gameWidgets: next}}; }); } catch { /* the device record reports its own failure */ } };
  return <section className="game-widget-choices" aria-labelledby="game-widget-choices-title">
    <h3 id="game-widget-choices-title">Journey widgets <small>The game layer is on · kept on this device</small></h3>
    <div role="group" aria-label="Journey widgets">{GAME_WIDGETS.map(id => <button key={id} type="button" className="widget-library-tile game-widget-choice" aria-pressed={chosen.includes(id)} onClick={() => toggle(id)}>
      <strong>{LABELS[id].label}</strong><small>{chosen.includes(id) ? 'On Today · tap to remove' : LABELS[id].line}</small></button>)}</div>
  </section>;
}
