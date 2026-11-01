'use client';
import {useState} from 'react';
import {StorageHealth} from '../storage-health';
import {usePlatform} from '../platform/use-platform';
import {useHabits} from '../habits/use-habits';
import {useHealth} from '../health/use-health';
import {usePrivateStore} from '../use-private-store';
import {useShowcase} from '../showcase-controls';
import {DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings} from '../../lib/dashboard-settings';
import {PLATFORM_KEY, platformSchema, emptyPlatform} from '../../lib/positions';
import {HABITS_KEY, habitDataSchema, emptyHabitData} from '../../lib/habits';
import {HEALTH_STORAGE_KEY, healthSchema, createEmptyHealth} from '../../lib/health';
import {getAppStorage, isShowcase} from '../../lib/showcase-storage';
import {enableDurableStore, isDurableMarker} from '../../lib/vault/local';
import {plainErrorMessage} from '../../lib/plain-error';

type Domain = 'finance' | 'habits' | 'health' | 'settings';
const KEYS: Record<Domain, string> = {finance: PLATFORM_KEY, habits: HABITS_KEY, health: HEALTH_STORAGE_KEY, settings: DASHBOARD_SETTINGS_KEY};

/**
 * Session AK G2 (RELEASE_REVIEW_2 R2-16, re-opening part of R4): how this browser keeps the records — storage health and
 * the per-module move to transactional storage — moved out of Backup & restore into Help & diagnostics, unchanged in what
 * it does (components/private-vault-tools.tsx had both since run 10/11). Its own panel, not inside the closed Advanced
 * Diagnostics, so both stay one tap away.
 */
export function StorageInternals() {
  const finance = usePlatform(), habits = useHabits(), health = useHealth(), settings = usePrivateStore(DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings);
  const stores = {finance, habits, health, settings};
  const inShowcase = useShowcase();
  const [domain, setDomain] = useState<Domain>('health'), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  async function upgrade() {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      if (isShowcase()) throw Error('Return to your data before changing private storage.');
      const storage = getAppStorage();
      if (domain === 'finance') await enableDurableStore(storage, PLATFORM_KEY, platformSchema, emptyPlatform);
      if (domain === 'habits') await enableDurableStore(storage, HABITS_KEY, habitDataSchema, emptyHabitData);
      if (domain === 'health') await enableDurableStore(storage, HEALTH_STORAGE_KEY, healthSchema, createEmptyHealth);
      if (domain === 'settings') await enableDurableStore(storage, DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings);
      window.dispatchEvent(new CustomEvent('zigoals:private-change', {detail: KEYS[domain]}));
      setMessage('Transactional storage is active for this module. Original bytes are preserved privately. This is local storage, not cloud sync.');
    } catch (e) { setError(plainErrorMessage(e, 'Operation failed. Existing records were preserved.')); } finally { setBusy(false); }
  }
  // Until a module's first read finishes, its storage kind is unknown and it must not be migrated.
  const reading = !stores[domain].loaded;
  let durable = false; try { durable = stores[domain].loaded && isDurableMarker(getAppStorage().getItem(KEYS[domain])); } catch { /* unknown: not durable */ }
  return <section className="panel storage-internals" id="storage-internals" aria-labelledby="storage-internals-title">
    <p className="eyebrow">STORAGE ON THIS DEVICE</p>
    <h2 id="storage-internals-title">How this browser keeps your records</h2>
    {inShowcase && <p className="notice">Storage upgrades work on your own records, not the Showcase&rsquo;s examples. Exit the Showcase to use them.</p>}
    <StorageHealth/>
    <details><summary>Transactional local storage</summary><p>Move this module to IndexedDB after downloading a backup. Related records and pending operations save together. Older app versions will refuse this module rather than overwrite it. Browser persistence is not a backup; hosted sync remains separate.</p><label>Module<select value={domain} onChange={e => setDomain(e.target.value as Domain)}><option value="finance">Goals and Wealth</option><option value="habits">Habits</option><option value="health">Health</option><option value="settings">Today preferences</option></select></label><p>{reading ? 'Reading this module…' : durable ? 'Using transactional local storage.' : 'Using legacy local storage.'}</p><button className="secondary" disabled={busy || durable || reading || inShowcase} onClick={() => void upgrade()}>Upgrade selected module storage</button></details>
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
  </section>;
}
