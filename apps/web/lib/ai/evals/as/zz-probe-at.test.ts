import {test} from 'vitest';
import {ask, freshAll, novaEnv, showcaseAll, zigiEnv} from './harness';
const Q = (process.env.PROBE_Q ?? '').split('||').filter(Boolean);
test('probe', () => {
  const envs = {novaS: novaEnv(showcaseAll()), zigiS: zigiEnv(showcaseAll()), novaF: novaEnv(freshAll()), zigiF: zigiEnv(freshAll()), zigiS_noHealth: zigiEnv(showcaseAll(), false)};
  for (const q of Q) for (const [k, e] of Object.entries(envs)) {
    const a = ask(q, e);
    console.log(`[${k}] «${q}» → ${a.kind} tools=${a.tools.join(',')} :: ${a.text.slice(0, 400)}${'cards' in a.reply ? ' cards=' + JSON.stringify((a.reply as any).cards).slice(0, 200) : ''}`);
  }
}, 120000);
