export const clamp = n => Math.max(0, Math.min(1, n));
const smooth = n => { const x = clamp(n); return x*x*(3-2*x); };
export function pose(progress, prior = null) {
  const p = clamp(progress);
  const state = { frame: smooth(p/.32), opacity: smooth(p/.16)*(1-smooth((p-.72)/.28)),
    scale: 1.08-.08*smooth(p/.32)-.035*smooth((p-.72)/.28),
    y: 22*(1-smooth(p/.32))-18*smooth((p-.72)/.28), rotate: -1.2*(1-smooth(p/.32)) };
  if (prior && p < .32) {
    const settle = smooth(p/.32);
    state.opacity += (1-state.opacity)*prior.opacity;
    state.scale = prior.scale+(1-prior.scale)*settle;
    state.y = prior.y*(1-settle);
    state.rotate = prior.rotate*(1-settle);
  }
  return state;
}
export function blend(progress,count) { const x=clamp(progress)*(count-1), a=Math.floor(x);return {a,b:Math.min(count-1,a+1),mix:x-a}; }
export function nearby(top,scroll,height) { return top>scroll-height && top<scroll+height*2.2; }
export function windowFor(top,height,viewport) { return {start:top-viewport*.88,end:top+Math.min(height*.55,viewport*1.1)}; }
