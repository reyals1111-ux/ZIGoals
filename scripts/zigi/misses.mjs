#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {basename} from 'node:path';

/**
 * Session Z-Local Part 6: the misses of a run file, grouped so a fix round reads them off the raw run instead of the whole
 * dump: per failed check name (cards, fields, facts, never, contains, schema, tool, no-numbers, error), the cases, and for
 * each case the detail the scorer wrote and the start of the reply. Usage: node scripts/zigi/misses.mjs <run.json> [--kind
 * propose] [--check cards] [--id p2-chat-plan] [--ids] [--reply 240] [--top 12]
 */
const args = process.argv.slice(2), files = args.filter(a => !a.startsWith('--') && /\.json$/.test(a));
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback; };
const KIND = opt('--kind', null), CHECK = opt('--check', null), ID = opt('--id', null), REPLY = Number(opt('--reply', '200')), TOP = Number(opt('--top', '12')), IDS_ONLY = args.includes('--ids');
for (const file of files) {
  const d = JSON.parse(readFileSync(file, 'utf8')), runs = d.runs.filter(r => !r.pass && (!KIND || r.kind === KIND) && (!ID || String(r.id).startsWith(ID)));
  const groups = new Map();
  for (const r of runs) for (const c of r.checks.filter(c => !c.pass)) { const name = c.name.replace(/:.*/, ''); if (CHECK && name !== CHECK) continue; const g = groups.get(name) ?? []; g.push({r, c}); groups.set(name, g); }
  console.log(`# ${basename(file)}: ${d.summary.model}, ${d.runs.filter(r => r.pass).length}/${d.runs.length} pass; ${runs.length} failing turn(s)`);
  if (IDS_ONLY) { console.log([...new Set(runs.map(r => r.id))].join(',')); continue; }
  for (const [name, list] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n## ${name} (${list.length}) — ${[...new Set(list.map(x => x.r.kind))].join(', ')}`);
    for (const {r, c} of list.slice(0, TOP)) {
      const reply = String(r.reply ?? '').replace(/\s+/g, ' ').slice(0, REPLY);
      console.log(`- ${r.id}${r.turn ? `/t${r.turn}` : ''} [${r.kind}, ${r.lang}, ${r.area}]${r.refused ? ' refused-words' : ''}: ${String(c.detail ?? '').replace(/\s+/g, ' ').slice(0, 220)}\n    reply: ${reply}`);
    }
    if (list.length > TOP) console.log(`  … ${list.length - TOP} more`);
  }
}
