// Session AM-2 (ADR-038 "AM-2", E3): draws NOVA's star as still pictures, one per accent, for the devices where WebGL
// cannot draw it (components/nova/core/star-system.tsx shows them; the SVG orb stays the last resort).
//
// The pictures are this repository's own shader (lib/nova/core/star-shader.ts) at its standby frame: no outside art.
// Run it again whenever the shader changes:
//
//   node apps/web/scripts/render-star-stills.mjs            (writes apps/web/public/nova/star/<accent>.webp)
//
// It needs the Playwright browser this workspace already uses for its specs; software rendering is fine.
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url)), web = join(here, '..');
const require = createRequire(join(web, 'package.json'));
const {chromium} = require('@playwright/test');
const read = file => readFileSync(join(web, file), 'utf8');
const shader = read('lib/nova/core/star-shader.ts'), governor = read('lib/nova/core/governor.ts');
const frag = /STAR_FRAG = `([\s\S]*?)`;/.exec(shader)?.[1], vert = /STAR_VERT = '([^']*)'/.exec(shader)?.[1];
const accents = Object.fromEntries([...(/STAR_ACCENT[^=]*= \{([\s\S]*?)\n\};/.exec(governor)?.[1] ?? '').matchAll(/(\w+): \['(#[0-9a-f]{6})', '(#[0-9a-f]{6})', '(#[0-9a-f]{6})'\]/gi)].map(m => [m[1], [m[2], m[3], m[4]]]));
if (!frag || !vert || Object.keys(accents).length < 5) throw Error('The shader or the accents could not be read.');
const SIZE = 560, QUALITY = 0.62, out = join(web, 'public/nova/star');
mkdirSync(out, {recursive: true});
const browser = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
try {
  const page = await browser.newPage();
  await page.setContent('<canvas></canvas>');
  for (const [name, colours] of Object.entries(accents)) {
    const base64 = await page.evaluate(async ({frag, vert, size, colours, quality}) => {
      const c = document.createElement('canvas'); c.width = c.height = size;
      const gl = c.getContext('webgl', {alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true});
      const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s)); return s; };
      const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vert)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, frag)); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(p));
      gl.useProgram(p); gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const at = gl.getAttribLocation(p, 'a'); gl.enableVertexAttribArray(at); gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
      const u = n => gl.getUniformLocation(p, n), rgb = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
      gl.viewport(0, 0, size, size); gl.uniform2f(u('uRes'), size, size);
      // The component's own first frame: uT 12, uSpin 0.72, standby, every octave.
      gl.uniform1f(u('uT'), 12); gl.uniform1f(u('uSpin'), 0.72); gl.uniform1f(u('uDetail'), 5);
      for (const n of ['uListen', 'uThink', 'uSpeak', 'uPulse', 'uBeam', 'uBeamA']) gl.uniform1f(u(n), 0);
      gl.uniform3fv(u('uA'), rgb(colours[0])); gl.uniform3fv(u('uB'), rgb(colours[1])); gl.uniform3fv(u('uC'), rgb(colours[2]));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      const blob = await new Promise(done => c.toBlob(done, 'image/webp', quality));
      const bytes = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (const b of bytes) s += String.fromCharCode(b);
      return btoa(s);
    }, {frag, vert, size: SIZE, colours, quality: QUALITY});
    const bytes = Buffer.from(base64, 'base64');
    writeFileSync(join(out, `${name}.webp`), bytes);
    console.log(`${name}.webp  ${(bytes.length / 1024).toFixed(1)} kB`);
  }
} finally { await browser.close(); }
