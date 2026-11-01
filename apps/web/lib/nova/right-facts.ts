import {formatNumber} from '../visual-format';
import type {ScanResult} from './local-servers';
import type {DeviceFacts} from './widgets/telemetry';

/**
 * Session AK P3 (NOVA_DESIGN_REVIEW.md ND-13): "Behind the intelligence" at a glance. Four small tiles of what this
 * device really says about itself (an unknown is "unknown", never invented), and the local servers that did not answer
 * grouped on one line ("Not running: llama.cpp (9931, 8080)") instead of one sentence per port. Pure.
 */
export type FactTile = {label: string; value: string; title: string};
export function factTiles(f: DeviceFacts): FactTile[] {
  const pct = f.battery ? Math.round(f.battery.level * 100) : null;
  return [
    {label: 'Cores', value: f.cores === null ? 'unknown' : formatNumber(f.cores), title: f.cores === null ? 'This browser does not say how many processor cores it has' : `${formatNumber(f.cores)} logical processor cores`},
    {label: 'Memory', value: f.memoryGb === null ? 'unknown' : `${formatNumber(f.memoryGb)} GB+`, title: f.memoryGb === null ? 'This browser does not say how much memory the device has' : `About ${formatNumber(f.memoryGb)} GB or more (the browser rounds it)`},
    {label: 'Battery', value: pct === null ? 'unknown' : `${pct} %`, title: pct === null ? 'This browser does not say the battery level' : `${pct} %${f.battery!.charging ? ', charging' : ', not charging'}`},
    {label: 'Network', value: f.online === null ? 'unknown' : f.online ? 'Connected' : 'Not connected', title: f.online === null ? 'This browser does not say whether it is connected' : f.online ? 'This browser is connected to a network' : 'This browser has no network right now; on-device answers still work'},
  ];
}

const port = (url: string): string => { try { const u = new URL(url); return u.port || (u.protocol === 'https:' ? '443' : '80'); } catch { return '?'; } };
/** The program's own name, without a port note ("llama.cpp (port 8080)" groups with "llama.cpp"). */
const program = (name: string) => name.replace(/\s*\(port \d+\)\s*$/, '');

/**
 * The servers that simply did not answer, grouped by program with their ports, in the order they were asked; null when
 * every server answered or gave its own reason (those keep their own line: they say what to change).
 */
export function notRunningLine(results: readonly ScanResult[]): {line: string; detail: string} | null {
  const silent = results.filter((r): r is Extract<ScanResult, {found: false}> => !r.found && r.reason === 'unreachable');
  if (!silent.length) return null;
  const groups = new Map<string, string[]>();
  for (const r of silent) { const name = program(r.server.name), ports = groups.get(name) ?? []; if (!ports.includes(port(r.server.baseUrl))) ports.push(port(r.server.baseUrl)); groups.set(name, ports); }
  return {
    line: `Not running: ${[...groups].map(([name, ports]) => `${name} (${ports.join(', ')})`).join(' · ')}`,
    detail: silent.map(r => `${r.server.name}: nothing answered at ${r.server.baseUrl}`).join('; '),
  };
}
