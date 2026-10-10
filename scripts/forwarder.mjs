// Throwaway loopback forwarder for the PC's Ollama (ADR-017 S8): the app only allows localhost servers, so the browser
// talks to 127.0.0.1:11435 and this process talks to $PC_OLLAMA_URL (read from the environment, never printed).
// Run: ( set -a; . ~/.config/zigoals/local-llm.env; set +a; node forwarder.mjs )   Stop: kill the pid in forwarder.pid.
import http from 'node:http';
import {writeFileSync} from 'node:fs';
const target = new URL(process.env.PC_OLLAMA_URL ?? '');
if (!target.host) { console.error('PC_OLLAMA_URL is not set'); process.exit(2); }
const server = http.createServer((req, res) => {
  const headers = {...req.headers, host: target.host};
  delete headers['origin']; delete headers['referer'];
  const up = http.request({hostname: target.hostname, port: target.port || 80, path: req.url, method: req.method, headers}, r => {
    const h = {...r.headers, 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS'};
    res.writeHead(r.statusCode ?? 502, h); r.pipe(res);
  });
  up.on('error', e => { res.writeHead(502, {'content-type': 'application/json', 'access-control-allow-origin': '*'}); res.end(JSON.stringify({error: `upstream: ${e.code ?? 'error'}`})); });
  if (req.method === 'OPTIONS') { res.writeHead(204, {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS'}); res.end(); up.destroy(); return; }
  req.pipe(up);
});
server.listen(11435, '127.0.0.1', () => { writeFileSync(new URL('./forwarder.pid', import.meta.url), String(process.pid)); console.log('forwarder on 127.0.0.1:11435 (upstream address not printed)'); });
