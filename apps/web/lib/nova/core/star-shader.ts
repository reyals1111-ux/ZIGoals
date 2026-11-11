/**
 * Session AM (ADR-038 D10; art direction §5), rebuilt in Session AM-2: NOVA's centre node as a nebula star system — one
 * hand-written fragment shader on one quad, no library. A tilted disc with two logarithmic spiral arms and finer spurs
 * under differential rotation (the inner disc turns faster), fractal gas from a white-violet core through magenta to
 * violet and peach with cyan knots along the arms, dust lanes, a bright core with a bloom, a thin accretion ring, a
 * four-point glint, stars that turn with the disc, a sparse field streaming toward the viewer, two orbit traces, a
 * planet that is dark and rim-lit from the core, a small moon, and one thin blue light streak through the core. The
 * person's accent recolours it (uA, uB, uC).
 *
 * The agent's states are uniforms eased by the component (components/nova/core/star-system.tsx): uListen (cyan rings fall
 * inward, the arms open), uThink (the arms wind tighter, a sweep of light turns through the disc, the field streams
 * faster), uSpeak with uPulse (the core pulses, rings travel outward), uBeam and uBeamA (a hairline of light with a
 * travelling spark toward a widget being made). uDetail lowers the noise octaves when the frame governor asks
 * (lib/nova/core/governor.ts). Time comes in as uT and uSpin, both accumulated by the component, so a pause never makes
 * the picture jump.
 *
 * AM-2, portability (the star did not appear on Apple graphics hardware): the GLSL specification leaves `smoothstep`
 * undefined when its first edge is not below its second, and `pow` undefined for a negative base. Software rendering
 * computed both; a GPU need not. Every ramp here goes through `up` (rising) or `dn` (falling), each with its edges in
 * order; there is no `pow`; no loop leaves early; `atan` never sees (0, 0). lib/nova/core/star-shader.test.ts keeps it so.
 * The colour is written premultiplied (alpha is the brightest channel, or 1 on the planet), so the star adds its light to
 * the sky behind it instead of dimming its own faint gas.
 */
export const STAR_VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
export const STAR_FRAG = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes; uniform float uT; uniform float uSpin; uniform float uListen; uniform float uThink; uniform float uSpeak; uniform float uPulse; uniform float uBeam; uniform float uBeamA; uniform float uDetail;
uniform vec3 uA; uniform vec3 uB; uniform vec3 uC;
float up(float lo, float hi, float x){ return smoothstep(lo, hi, x); }
float dn(float lo, float hi, float x){ return 1. - smoothstep(lo, hi, x); }
float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ if(float(i) < uDetail){ v+=a*noise(p); p=p*2.03+vec2(17.1,9.2); a*=.5; } } return v/(1.-2.*a); }
mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
float sq(float x){ return x*x; }
const float TILT = .44; const float ROLL = -.38; const float ORBIT = .40; const float MOON = .255;
void main(){
  vec2 uv = (gl_FragCoord.xy - .5*uRes) / min(uRes.x, uRes.y);
  float rr = length(uv);
  vec3 col = vec3(0.);
  vec3 peach = vec3(1.,.66,.50);
  // ---- the nebula the star sits in: wide soft clouds, wound toward the core ----
  float na = atan(uv.y, uv.x + 1e-5), nw = na + 2.2*log(rr+.05) + uSpin*.18;
  vec2 np = vec2(cos(nw), sin(nw)) * rr;
  float cloud = fbm(np*3.2 + vec2(3.7, uSpin*.05)), cloud2 = fbm(np*6.5 - vec2(1.3, 8.2));
  float neb = up(.4,.84, cloud) * dn(.08,.40, rr) * (.4+.8*cloud2);
  col += mix(mix(uA, uC, up(.3,.8,cloud2)), peach, up(.5,.9,cloud)*.55) * neb * .6;
  // ---- the disc: tilted, two log-spiral arms with finer spurs, the inner disc turns faster ----
  vec2 q = rot(ROLL) * uv; q.y /= TILT;
  float r = length(q), a = atan(q.y, q.x + 1e-5), lr = log(r+.02);
  float swirl = a + uSpin * (.55 + .2/(r+.12));
  float twist = 5.4 + 1.8*uThink - .8*uListen;
  float phase = 2.*swirl - twist*lr;
  float arm = max(.5+.5*cos(phase), 0.), arms = arm*sqrt(arm);
  float spur = sq(max(.5+.5*cos(2.*phase + 1.7 + 3.*lr), 0.));
  vec2 g = rot(uSpin*(.35+.14/(r+.2))) * q;
  float gas = fbm(g*5.5 + vec2(0., uSpin*.2)), gas2 = fbm(g*12. - vec2(uSpin*.15, 3.1));
  float disc = dn(.05,.64, r);
  float dens = disc * (.10 + 1.1*arms + .26*spur) * (.14 + 1.6*gas*gas) * (.5+1.05*gas2);
  float lane = up(.42,.78, fbm(g*8.+vec2(4.,1.)+phase*.12));
  dens *= mix(1., .2, lane*up(.07,.3,r));
  dens *= .78 + .5*noise(g*64. + vec2(uSpin*.3, 1.7));
  vec3 inner = mix(vec3(1.,.97,1.), mix(uA, vec3(1.), .3), up(.0,.12,r));
  vec3 mid = mix(inner, uC, up(.09,.28,r));
  vec3 outer = mix(mid, mix(uA, peach, .5 + .5*up(.35,.75,gas)), up(.24,.5,r));
  vec3 gasCol = mix(outer, uB, up(.5,.85,gas2)*arms*.8);
  gasCol = mix(gasCol, uA*.55, lane*.5);
  col += gasCol * dens * 2.9;
  // bright knots along the arms (star-forming regions)
  vec2 kg = g*26.; vec2 ki = floor(kg); float kh = hash(ki+3.1);
  float knot = dn(0.,.34, length(fract(kg)-.5 - (vec2(hash(ki),hash(ki+9.))-.5)*.5)) * step(.80, kh) * arms * disc * up(.06,.2,r);
  col += mix(uB, vec3(1.), .45) * knot * 1.1;
  // ---- the core: a white heart, a violet bloom, a thin accretion ring ----
  float pulse = 1. + .06*sin(uT*1.1) + .5*uSpeak*uPulse + .12*uThink*sin(uT*5.) + .08*uListen;
  float core = exp(-r*r*300./(pulse*pulse)) * 2.6 + exp(-r*16.)*.75*pulse + exp(-r*r*2600.)*1.8;
  col += mix(vec3(1.), uA*1.1+.3, up(0.,.18,r)) * core;
  float bulge = exp(-length(uv*vec2(1.,1.3))*7.5);
  col += (uA*.6 + uC*.34 + .1) * (bulge * .8 + exp(-rr*7.)*.05) * pulse;
  float ringR = .085*pulse;
  float acc = dn(0.,.006, abs(r-ringR)) * (.55 + .45*cos(a - uSpin*3.)) + dn(0.,.03, abs(r-ringR))*.12;
  col += mix(uB, vec3(1.), .6) * acc * .7;
  // four-point glint
  vec2 gv = rot(.38)*uv; float glint = exp(-abs(gv.x)*60.)*exp(-abs(gv.y)*8.) + exp(-abs(gv.y)*60.)*exp(-abs(gv.x)*8.);
  col += vec3(.9,.92,1.) * glint * .3 * pulse;
  // ---- listening: rings fall inward · speaking: rings travel outward · thinking: a sweep of light turns through the disc ----
  float wIn = .5+.5*sin(r*64. + uT*5.5), wOut = .5+.5*sin(r*44. - uT*7.);
  float ringIn = uListen * dn(.02,.5,r) * sq(sq(wIn)*sq(wIn)) * .7 * up(.03,.1,r);
  float ringOut = uSpeak * dn(.06,.56,r) * sq(sq(wOut)*sq(wOut)*wOut) * (.25+.75*uPulse);
  col += uB * ringIn + mix(uC, vec3(1.), .45) * ringOut;
  float sw = .5+.5*cos(a + uT*2.6), sw2 = .5+.5*cos(a + uT*2.6 + 3.14159); float sweep = sq(sq(sq(sw))) + sq(sq(sq(sw2)))*.55;
  col += mix(uB, vec3(1.), .4) * uThink * sweep * disc * up(.05,.14,r) * (.4 + 1.1*arms);
  // ---- stars: in the disc (turning with it) and a field streaming toward the viewer ----
  vec2 sg = rot(uSpin*.5) * q * 52.; vec2 si = floor(sg); float sh = hash(si);
  float st = dn(0., .12*sh+.02, length(fract(sg)-.5 - (vec2(hash(si+1.7),hash(si+5.3))-.5)*.7)) * step(.84, sh) * dn(.1,.68,r) * 1.3;
  col += vec3(1.,.96,1.) * st * (.6+.4*sin(uT*1.7+sh*40.));
  vec2 tg = rot(uSpin*.42) * q * 118. + 7.; vec2 ti = floor(tg); float th = hash(ti+2.3);
  float tiny = dn(0., .16, length(fract(tg)-.5 - (vec2(hash(ti+4.1),hash(ti+8.7))-.5)*.6)) * step(.78, th) * dn(.12,.7,r) * (.35 + .65*arms);
  col += mix(vec3(.85,.92,1.), uB, th*.4) * tiny * (.55+.45*sin(uT*2.3+th*60.));
  for(int k=0;k<3;k++){
    float fk = float(k); float z = fract(uT*(.03+.035*uThink) + fk*.333);
    vec2 pp = uv / (z*1.3+.07) * (4.+fk*1.7) + fk*13.7; vec2 pi = floor(pp); float ph = hash(pi+fk*7.3);
    float sd = length(fract(pp)-.5 - (vec2(hash(pi+1.3),hash(pi+2.7))-.5)*.7); float tw = (dn(0., .05, sd) + dn(0., .014, sd)*1.5) * step(.9, ph);
    col += mix(vec3(.8,.88,1.), uA+.4, ph*.5) * tw * up(0.,.3,z) * dn(.75,1.,z) * up(.09,.24,rr);
  }
  // ---- the thin horizontal light streak through the core ----
  float streak = exp(-abs(uv.y)*330.) * exp(-abs(uv.x)*(2.2 - .8*uSpeak*uPulse)) * 1.5 + exp(-abs(uv.y)*46.) * exp(-abs(uv.x)*6.5)*.26;
  col += vec3(.42,.68,1.) * streak * pulse * 1.05;
  // ---- the beam toward a widget being made: a hairline and a spark that travels along it ----
  vec2 bd = vec2(cos(uBeamA), sin(uBeamA)); float along = dot(uv, bd), across = abs(dot(uv, vec2(-bd.y, bd.x)));
  float line = step(0., along) * exp(-across*260.) * dn(0.,.62,along);
  float spark = exp(-sq((along - (1.-uBeam)*.5)*18.)) * exp(-across*90.) * step(0., along);
  col += mix(uB, vec3(1.), .5) * uBeam * (line*1.5 + spark*1.2);
  // ---- the orbits, the moon and the planet, rim-lit from the core ----
  float oa = uT*(.10+.12*uThink) + 1.1, ma = -uT*(.23+.2*uThink) + 4.;
  float trace = dn(0.,.0035, abs(r-ORBIT)), trace2 = dn(0.,.003, abs(r-MOON));
  col += uB * trace * (.16 + .4*(.5+.5*cos(a - oa))) + uA * trace2 * (.10 + .3*(.5+.5*cos(a - ma)));
  vec2 mo = rot(-ROLL) * vec2(cos(ma)*MOON, sin(ma)*MOON*TILT);
  float mr = .011 * (1. - .16*sin(ma)), md = length(uv - mo);
  float moonBehind = step(0., sin(ma)) * dn(.05,.12, length(mo));
  col += mix(uC, vec3(1.), .7) * (dn(mr*.5, mr, md)*1.3 + exp(-md*120.)*.25) * (1.-moonBehind);
  vec2 po = rot(-ROLL) * vec2(cos(oa)*ORBIT, sin(oa)*ORBIT*TILT);
  float pr = .05 * (1. - .16*sin(oa));
  vec2 d = uv - po; float pd = length(d);
  float body = dn(pr-.0035, pr, pd);
  float behind = step(0., sin(oa)) * dn(.05,.12, length(po));
  float solid = body*(1.-behind);
  if (body > 0.) {
    vec2 n = d/pr; float nz = sqrt(max(0., 1.-dot(n,n)));
    vec3 nrm = normalize(vec3(n, nz)); vec3 L = normalize(vec3(-po/max(length(po), 1e-4), -.12));
    float lit = max(0., dot(nrm, L));
    float rim = sq(1.-nz)*sqrt(max(1.-nz, 0.)), facing = max(0., dot(n, -po/max(length(po), 1e-4)));
    // A body in every frame: a dark globe with faint bands, a thin lit limb all the way round, brightest toward the core.
    vec3 pc = vec3(.012,.016,.045) + uA * .05 * nz * (.6 + .4*noise(vec2(n.y*9., 2.))) + mix(uA, vec3(1.), .7) * lit*sqrt(max(lit, 0.)) * 3.2 + mix(uB, vec3(1.), .35) * rim * (.7 + 3.*facing);
    col = mix(col, pc, solid);
  }
  col += uB * exp(-max(pd-pr, 0.)*70.) * (.16 + .3*max(0., dot(d, -po)/max(pd*length(po), 1e-4))) * (1.-behind) * (1.-body);
  // ---- fade to nothing at the edge; a filmic curve that keeps the colours' own hue ----
  col *= dn(.28,.5, rr);
  float peak = max(col.r, max(col.g, col.b));
  vec3 soft = 1. - exp(-col*1.35);
  vec3 keep = col * ((1. - exp(-peak*1.35)) / max(peak, 1e-4));
  col = mix(keep, soft, up(.5, 2.4, peak)*.9);
  float alpha = clamp(max(max(col.r, max(col.g, col.b)), solid), 0., 1.);
  gl_FragColor = vec4(min(col, vec3(alpha)), alpha);
}`;
export const STAR_UNIFORMS = ['uRes', 'uT', 'uSpin', 'uListen', 'uThink', 'uSpeak', 'uPulse', 'uBeam', 'uBeamA', 'uDetail', 'uA', 'uB', 'uC'] as const;
export type StarUniform = (typeof STAR_UNIFORMS)[number];
