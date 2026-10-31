// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {act, createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {encodeQr} from './encode';
import {qrSvgPath} from './svg-path';

let root: Root, container: HTMLDivElement;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

test('qrSvgPath merges each row run into one rectangle, offset by the quiet zone', () => {
  expect(qrSvgPath([[true, true, false, true], [false, false, false, false]], 4)).toBe('M4 4h2v1h-2zM7 4h1v1h-1z');
});

test('QrCode renders one black-on-white path with a 4-module quiet zone and an accessible name', async () => {
  const {default: QrCode} = await import('../../components/qr/qr-code');
  const uri = 'wc:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef@2?relay-protocol=irn&symKey=k';
  await act(async () => root.render(createElement(QrCode, {value: uri, label: 'Pairing QR code'})));
  const svg = container.querySelector('svg')!;
  const qr = encodeQr(uri), dim = qr.size + 8;
  expect(svg.getAttribute('role')).toBe('img');
  expect(svg.getAttribute('aria-label')).toBe('Pairing QR code');
  expect(svg.getAttribute('viewBox')).toBe(`0 0 ${dim} ${dim}`);
  expect(svg.getAttribute('shape-rendering')).toBe('crispEdges');
  expect(svg.style.width).toBe('240px');
  expect(svg.style.maxWidth).toBe('100%');
  const rect = svg.querySelector('rect')!;
  expect([rect.getAttribute('width'), rect.getAttribute('height'), rect.getAttribute('fill')]).toEqual([`${dim}`, `${dim}`, '#fff']);
  const paths = svg.querySelectorAll('path');
  expect(paths).toHaveLength(1);
  const d = paths[0]!.getAttribute('d')!;
  expect(d).toBe(qrSvgPath(qr.modules, 4));
  // Quiet zone: no dark run starts before module 4 or ends after size + 4, on either axis.
  for (const [, x, y, w] of d.matchAll(/M(\d+) (\d+)h(\d+)/g)) {
    expect(Number(x)).toBeGreaterThanOrEqual(4);
    expect(Number(y)).toBeGreaterThanOrEqual(4);
    expect(Number(x) + Number(w)).toBeLessThanOrEqual(qr.size + 4);
    expect(Number(y) + 1).toBeLessThanOrEqual(qr.size + 4);
  }
  expect(d.startsWith('M4 4h7v1h-7z')).toBe(true); // the top-left finder's top edge
  expect(svg.style.color).toBe('rgb(0, 0, 0)');
  expect(paths[0]!.getAttribute('fill')).toBe('currentColor');
});
