// Landing V5 fold interludes: between sections, the paper of the brand film refolds into the next figure as you scroll
// (Z → swan → lotus → butterfly → heart → bull → Z), over stars and the planet at different depths.
// - Layers move by transform and opacity only. The fold frames are drawn on a canvas, one paint per changed frame,
//   with no layout.
// - Nothing here moves the page: no scrollTo, no preventDefault, no wheel or touch listener.
// - Frames load only when a stage is within three quarters of a screen, and are released once it is two screens away.
// - Reduced motion, ?motion=off, Save-Data, short screens and no script all keep the settled figure, static.
import { PACE, PHONE, WIDE, filmPosition, frames, pose, progress } from './fold-state.mjs?v=v5-1';

const root = document.documentElement;
const stages = [...document.querySelectorAll('[data-fold]')];
if (stages.length && 'IntersectionObserver' in window) {
  // Keep in step with the pinned layout's media query in styles/final-v5.css.
  const motion = matchMedia('(scripting: enabled) and (prefers-reduced-motion: no-preference) and (min-height: 561px)');
  const phone = matchMedia('(max-width: 700px)');
  const manualStatic = new URLSearchParams(location.search).get('motion') === 'off';
  // Save-Data: no frames at all, and (through html.fold-static) no pinned runway either.
  const saveData = navigator.connection?.saveData === true;
  if (saveData) root.classList.add('fold-static');
  const all = stages.map(el => ({
    el, name: el.dataset.fold, figure: el.querySelector('.fold-figure'), canvas: el.querySelector('canvas'),
    far: el.querySelector('.fold-stars-far'), nearStars: el.querySelector('.fold-stars-near'),
    planet: el.querySelector('.fold-planet'), slogan: el.querySelector('.fold-slogan'),
    near: false, set: null, drawn: '',
  }));
  let pending = false, listening = false, animated = false;

  const load = s => {
    if (s.set && s.set.small === phone.matches) return;
    release(s);
    const small = phone.matches, at = small ? PHONE[s.name] : WIDE, count = at.length;
    const set = { small, at, images: Array(count), cancelled: false };
    s.set = set;
    // First and settled frames first, so a fast arrival never waits for the middle of the fold.
    const order = [0, count - 1, ...Array.from({ length: count - 2 }, (_, i) => i + 1)];
    let next = 0;
    const worker = async () => {
      while (next < order.length && !set.cancelled) {
        const i = order[next++], image = new Image();
        image.decoding = 'async';
        image.src = `assets/origami-scroll/${s.name}/${small ? 'phone/' : ''}${String(at[i]).padStart(2, '0')}.webp`;
        try { await image.decode(); if (!set.cancelled) { set.images[i] = image; schedule(); } } catch { /* the settled still stays */ }
      }
    };
    for (let i = 0; i < 3; i++) worker();
  };
  const release = s => {
    if (s.set) { s.set.cancelled = true; s.set.images.length = 0; s.set = null; }
    if (s.canvas.width) { s.canvas.width = 0; s.canvas.height = 0; }
    s.drawn = '';
    s.figure.classList.remove('is-drawn');
  };
  /** Draws the frames for fold progress `fold`. False while no frame of the set has arrived yet. */
  const draw = (s, fold) => {
    const images = s.set?.images ?? [], ready = images.map((image, i) => (image ? i : -1)).filter(i => i >= 0);
    if (!ready.length) { s.figure.classList.remove('is-drawn'); return false; }
    const { a, b, mix } = frames(filmPosition(fold, PACE[s.name]), s.set.at);
    const nearest = i => images[i] ?? images[ready.reduce((best, j) => (Math.abs(j - i) < Math.abs(best - i) ? j : best), ready[0])];
    const first = nearest(a), second = nearest(b), key = `${a}:${b}:${mix.toFixed(3)}:${ready.length}`;
    if (key === s.drawn) return true;
    const context = s.canvas.getContext('2d', { alpha: false });
    if (s.canvas.width !== first.naturalWidth) { s.canvas.width = first.naturalWidth; s.canvas.height = first.naturalHeight; }
    context.globalAlpha = 1;
    context.drawImage(first, 0, 0);
    if (second !== first && mix > 0) { context.globalAlpha = mix; context.drawImage(second, 0, 0); context.globalAlpha = 1; }
    s.drawn = key;
    s.figure.classList.add('is-drawn');
    return true;
  };
  const apply = s => {
    const rect = s.el.getBoundingClientRect(), state = pose(progress(rect.top, rect.height, innerHeight));
    // Until its first frame is drawn, a folding figure stays hidden rather than showing the settled still too early.
    const shown = draw(s, state.fold) || state.fold >= 1;
    s.figure.style.opacity = (shown ? state.figure.opacity : 0).toFixed(3);
    s.figure.style.transform = `translate3d(0,${state.figure.y.toFixed(1)}px,0) scale(${state.figure.scale.toFixed(4)}) rotate(${state.figure.rotate.toFixed(2)}deg)`;
    s.far.style.transform = `translate3d(0,${state.far.y.toFixed(1)}px,0)`;
    s.nearStars.style.transform = `translate3d(0,${state.near.y.toFixed(1)}px,0)`;
    s.planet.style.transform = `translate3d(-50%,${state.planet.y.toFixed(1)}px,0)`;
    s.planet.style.opacity = state.planet.opacity.toFixed(3);
    if (s.slogan) { s.slogan.style.opacity = state.slogan.opacity.toFixed(3); s.slogan.style.transform = `translate3d(0,${state.slogan.y.toFixed(1)}px,0)`; }
    s.el.dataset.progress = state.fold.toFixed(3);
  };
  const clear = s => {
    for (const part of [s.figure, s.far, s.nearStars, s.planet, s.slogan]) if (part) { part.style.transform = ''; part.style.opacity = ''; }
    delete s.el.dataset.progress;
  };
  const update = () => {
    pending = false;
    if (!animated || document.hidden) return;
    for (const s of all) if (s.near) apply(s);
  };
  function schedule() { if (!pending) { pending = true; requestAnimationFrame(update); } }
  const listen = on => {
    if (on === listening) return;
    listening = on;
    if (on) { addEventListener('scroll', schedule, { passive: true }); addEventListener('resize', schedule, { passive: true }); }
    else { removeEventListener('scroll', schedule); removeEventListener('resize', schedule); }
  };
  const stageOf = entry => all.find(item => item.el === entry.target);
  // Near: within three quarters of a screen. The frames load and the stage follows the scroll.
  const nearby = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const s = stageOf(entry);
      s.near = entry.isIntersecting;
      s.el.classList.toggle('is-near', s.near && animated);
      if (animated && s.near) load(s);
    }
    listen(animated && all.some(s => s.near));
    schedule();
  }, { rootMargin: '75% 0px 75% 0px' });
  // Far: more than two screens away. The frames are given back; the gap between the two distances means scrolling
  // to and fro at an edge never reloads them.
  const faraway = new IntersectionObserver(entries => {
    for (const entry of entries) if (!entry.isIntersecting) release(stageOf(entry));
  }, { rootMargin: '200% 0px 200% 0px' });

  const setMode = () => {
    animated = motion.matches && !manualStatic && !saveData;
    root.classList.toggle('fold-ready', animated);
    for (const s of all) {
      s.el.classList.toggle('is-near', s.near && animated);
      if (!animated) { release(s); clear(s); }
      else if (s.near) load(s);
    }
    listen(animated && all.some(s => s.near));
    schedule();
  };
  setMode();
  for (const s of all) { nearby.observe(s.el); faraway.observe(s.el); }
  motion.addEventListener('change', setMode);
  phone.addEventListener('change', () => { for (const s of all) if (s.near && animated) load(s); schedule(); });
  document.addEventListener('visibilitychange', schedule);
}
