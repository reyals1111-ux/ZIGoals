// @vitest-environment jsdom
import {expect, it} from 'vitest';
import {copyRootMarks, copyStylesheets, openPipWindow, PIP_SIZE, pipHost, type PipHost} from './pip';

// Session V Part 14: the mini window's feature check and what it carries over from the page.
it('the feature is used only where the browser has it', () => {
  expect(pipHost(window)).toBeNull();
  const host = {requestWindow: async () => window, window: null};
  expect(pipHost({documentPictureInPicture: host} as unknown as Window)).toBe(host);
  expect(pipHost({documentPictureInPicture: {}} as unknown as Window)).toBeNull();
});
const sheet = (href: string | null, rules: string[] | 'unreadable', media = '') => ({href, media: {mediaText: media},
  get cssRules() { if (rules === 'unreadable') throw new DOMException('Cannot access rules', 'SecurityError'); return rules.map(cssText => ({cssText})); }}) as unknown as CSSStyleSheet;
it('the page\'s own same-origin styles come over as style elements, once each; other origins and unreadable sheets stay out', () => {
  const own = sheet('http://localhost:3000/_next/static/chunks/a.css', ['.a{color:red}', '.a2{margin:0}']), inline = sheet(null, ['.b{color:blue}']);
  const print = sheet('/print.css', ['.c{display:none}'], 'print'), foreign = sheet('https://cdn.example.com/x.css', ['.x{}']), locked = sheet('/locked.css', 'unreadable');
  const from = {baseURI: 'http://localhost:3000/app', styleSheets: [own, inline, print, foreign, locked]};
  const target = document.implementation.createHTMLDocument('');
  expect(copyStylesheets(from, target)).toBe(3);
  expect([...target.head.querySelectorAll('style')].map(s => [s.textContent, s.media])).toEqual([['.a{color:red}\n.a2{margin:0}', ''], ['.b{color:blue}', ''], ['.c{display:none}', 'print']]);
  expect(target.querySelectorAll('link')).toHaveLength(0);
  // The page loaded one more stylesheet: only that one is added.
  const later = sheet('/later.css', ['.d{}']);
  expect(copyStylesheets({...from, styleSheets: [own, inline, print, foreign, locked, later]}, target)).toBe(1);
  expect(target.head.querySelectorAll('style')).toHaveLength(4);
});
it('the display marks follow the page, and nothing else on the root is copied', () => {
  const target = document.implementation.createHTMLDocument('');
  document.documentElement.dataset.appMotion = 'off'; document.documentElement.dataset.zigiSide = 'left'; document.documentElement.dataset.aiSheet = '';
  target.documentElement.dataset.zigiMotion = 'full';
  copyRootMarks(document, target);
  // A mark the page dropped is dropped there too.
  expect({...target.documentElement.dataset}).toEqual({appMotion: 'off', zigiSide: 'left'});
});
it('the window opens at the mini size, named, with the page\'s styles and marks', async () => {
  const doc = document.implementation.createHTMLDocument('');
  let asked: unknown;
  const host: PipHost = {requestWindow: async options => { asked = options; return {document: doc} as unknown as Window; }, window: null};
  document.head.innerHTML = '<style>.z{color:green}</style>';
  const win = await openPipWindow(host, document);
  expect(asked).toEqual(PIP_SIZE);
  expect(win.document.title).toBe('ZIGi · Your Personal AI Companion');
  expect(win.document.documentElement.classList.contains('zigi-pip-root')).toBe(true);
  expect([...win.document.head.querySelectorAll('style')].map(s => s.textContent)).toEqual(['.z { color: green; }']);
});
