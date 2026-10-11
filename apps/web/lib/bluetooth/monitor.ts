import {connectHeartRate, type Connection} from './web-bluetooth';
import {heartConnected, heartDisconnected, heartReading} from './heart-store';

/**
 * The page's one heart-rate monitor connection (Session W Part 8): it lives as long as the page, like the focus-sound
 * player, so a monitor connected in Health → Devices keeps reporting while the person opens Meditation. A reload or a
 * document load ends it; Disconnect ends it at once.
 */
let current: Connection | null = null;
export async function connectMonitor(): Promise<void> {
  if (current) return;
  const connection = await connectHeartRate(reading => heartReading(reading), () => { current = null; heartDisconnected('The monitor disconnected.'); });
  current = connection;
  heartConnected(connection.name);
}
export function disconnectMonitor(): void { current?.stop(); current = null; heartDisconnected(); }
