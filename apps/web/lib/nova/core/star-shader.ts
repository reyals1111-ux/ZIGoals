/**
 * Session AM (ADR-038 D10; art direction §5): NOVA's centre node as a nebula star system — one hand-written fragment
 * shader on one quad, no library. A tilted disc with two logarithmic spiral arms under differential rotation (the inner
 * disc turns faster), fractal gas from white-violet through magenta to peach with cyan knots along the arms, dust lanes, a
 * bright core with a soft bulge and a four-point glint, stars that turn with the disc, a sparse field streaming toward
 * the viewer, the orbit trace, a planet that is dark and rim-lit from the core, and one thin blue light streak through
 * the core. The person's accent recolours it (uA, uB, uC).
 *
 * The agent's states are uniforms eased by the component (components/nova/core/star-system.tsx): uListen (cyan rings fall
 * inward, the arms open), uThink (the arms wind tighter, the field streams faster), uSpeak with uPulse (the core pulses,
 * rings travel outward), uBeam and uBeamA (a hairline of light toward a widget being made). uDetail lowers the noise
 * octaves when the frame governor asks (lib/nova/core/governor.ts). Time comes in as uT and uSpin, both accumulated by
 * the component, so a pause never makes the picture jump.
 */
export const STAR_VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
export const STAR_FRAG = `precision highp float;
uniform vec2 uRes; uniform float uT; uniform float uSpin; uniform float uListen; uniform float uThink; uniform float uSpeak; uniform float uPulse; uniform float uBeam; uniform float uBeamA; uniform float uDetail;
uniform vec3 uA; uniform vec3 uB; uniform vec3 uC;
float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ if(float(i) >= uDetail) break; v+=a*noise(p); p=p*2.03+vec2(17.1,9.2); a*=.5; } return v; }
mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
const float TILT = .44; const float ROLL = -.38;
void main(){
  vec2 uv = (gl_FragCoord.xy - .5*uRes) / min(uRes.x, uRes.y);
  float rr = length(uv);
  vec3 col = vec3(0.);
  vec3 peach = vec3(1.,.70,.55);
  // ---- the nebula the star sits in: wide soft clouds, wound toward the core ----
  float na = atan(uv.y, uv.x), nw = na + 2.2*log(rr+.05) + uSpin*.18;
  vec2 np = vec2(cos(nw), sin(nw)) * rr;
  float cloud = fbm(np*3.2 + vec2(3.7, uSpin*.05)), cloud2 = fbm(np*6.5 - vec2(1.3, 8.2));
  float neb = smoothstep(.34,.86, cloud) * smoothstep(.52,.12, rr) * (.55+.6*cloud2);
  col += mix(mix(uA, uC, smoothstep(.3,.8,cloud2)), peach, smoothstep(.5,.9,cloud)*.7) * neb * .75;
  // ---- the disc: tilted, two log-spiral arms, inner turns faster ----
  vec2 q = rot(ROLL) * uv; q.y /= TILT;
  float r = length(q), a = atan(q.y, q.x);
  float swirl = a + uSpin * (.55 + .2/(r+.12));
  float twist = 5.4 + 1.8*uThink - .8*uListen;
  float phase = 2.*swirl - twist*log(r+.02);
  float arms = pow(.5+.5*cos(phase), 1.5);
  vec2 g = rot(uSpin*(.35+.14/(r+.2))) * q;
  float gas = fbm(g*5.5 + vec2(0., uSpin*.2)), gas2 = fbm(g*12. - vec2(uSpin*.15, 3.1)), fil = fbm(g*22. + 5.);
  float disc = smoothstep(.60, .04, r);
  float dens = disc * (.12 + 1.1*arms) * (.15 + 1.5*gas*gas) * (.55+.9*gas2);
  float lane = smoothstep(.4,.78, fbm(g*8.+vec2(4.,1.)+phase*.12));
  dens *= mix(1., .28, lane*smoothstep(.07,.3,r));
  dens *= .55 + .9*fil;
  vec3 inner = mix(vec3(1.,.97,1.), mix(uA, vec3(1.), .25), smoothstep(.0,.13,r));
  vec3 mid = mix(inner, uC, smoothstep(.1,.30,r));
  vec3 outer = mix(mid, peach, smoothstep(.22,.46,r)*.9 * (.6+.6*gas));
  vec3 gasCol = mix(outer, uB, smoothstep(.55,.9,gas2)*arms*.8);
  col += gasCol * dens * 2.3;
  // bright knots along the arms (star-forming regions)
  vec2 kg = g*26.; vec2 ki = floor(kg); float kh = hash(ki+3.1);
  float knot = smoothstep(.34, 0., length(fract(kg)-.5 - (vec2(hash(ki),hash(ki+9.))-.5)*.5)) * step(.82, kh) * arms * disc * smoothstep(.06,.2,r);
  col += mix(uB, vec3(1.), .5) * knot * .9;
  // ---- the core ----
  float pulse = 1. + .06*sin(uT*1.1) + .5*uSpeak*uPulse + .12*uThink*sin(uT*5.);
  float core = exp(-r*r*300./(pulse*pulse)) * 2.2 + exp(-r*18.)*.6*pulse;
  col += mix(vec3(1.), uA*1.1+.3, smoothstep(0.,.18,r)) * core;
  float bulge = exp(-length(uv*vec2(1.,1.3))*10.);
  col += (uA*.6 + uC*.3 + .1) * bulge * .6 * pulse;
  // four-point glint
  vec2 gv = rot(.38)*uv; float glint = exp(-abs(gv.x)*60.)*exp(-abs(gv.y)*9.) + exp(-abs(gv.y)*60.)*exp(-abs(gv.x)*9.);
  col += vec3(.9,.92,1.) * glint * .22 * pulse;
  // ---- listening: rings fall inward · speaking: rings travel outward ----
  float ringIn = uListen * smoothstep(.5,.02,r) * pow(.5+.5*sin(r*64. + uT*5.5), 10.) * .55 * smoothstep(.03,.1,r);
  float ringOut = uSpeak * smoothstep(.56,.06,r) * pow(.5+.5*sin(r*44. - uT*7.), 12.) * (.2+.7*uPulse);
  col += uB * ringIn + mix(uC, vec3(1.), .45) * ringOut;
  // ---- stars: in the disc (turning with it) and a field streaming toward the viewer ----
  vec2 sg = rot(uSpin*.5) * q * 52.; vec2 si = floor(sg); float sh = hash(si);
  float st = smoothstep(.12*sh+.02, 0., length(fract(sg)-.5 - (vec2(hash(si+1.7),hash(si+5.3))-.5)*.7)) * step(.88, sh) * smoothstep(.66,.1,r);
  col += vec3(1.,.96,1.) * st * (.55+.45*sin(uT*1.7+sh*40.));
  for(int k=0;k<3;k++){
    float fk = float(k); float z = fract(uT*(.03+.03*uThink) + fk*.333);
    vec2 pp = uv / (z*1.3+.07) * (4.+fk*1.7) + fk*13.7; vec2 pi = floor(pp); float ph = hash(pi+fk*7.3);
    float tw = smoothstep(.09, 0., length(fract(pp)-.5 - (vec2(hash(pi+1.3),hash(pi+2.7))-.5)*.7)) * step(.9, ph);
    col += mix(vec3(.8,.88,1.), uA+.4, ph*.5) * tw * smoothstep(0.,.3,z) * smoothstep(1.,.75,z) * smoothstep(.09,.24,rr) * .9;
  }
  // ---- the thin horizontal light streak through the core ----
  float streak = exp(-abs(uv.y)*220.) * exp(-abs(uv.x)*3.) + exp(-abs(uv.y)*50.) * exp(-abs(uv.x)*7.)*.22;
  col += vec3(.42,.68,1.) * streak * pulse * .95;
  // ---- the beam toward a widget being made ----
  vec2 bd = vec2(cos(uBeamA), sin(uBeamA)); float along = dot(uv, bd), across = abs(dot(uv, vec2(-bd.y, bd.x)));
  col += mix(uB, vec3(1.), .5) * uBeam * step(0., along) * exp(-across*260.) * smoothstep(.62,.0,along) * 1.4;
  // ---- the orbit and the planet, rim-lit from the core ----
  float oa = uT*(.10+.12*uThink) + 1.1; float OR = .40;
  vec2 po = rot(-ROLL) * vec2(cos(oa)*OR, sin(oa)*OR*TILT);
  float pr = .034 * (1. - .22*sin(oa));
  float orb = smoothstep(.0035,.0,abs(r-OR)) * (.5+.5*cos(a - oa)) ;
  col += uB * orb * .22 + uB * smoothstep(.003,.0,abs(r-OR))*.05;
  vec2 d = uv - po; float pd = length(d);
  float body = smoothstep(pr, pr-.0035, pd);
  float behind = step(0., sin(oa)) * smoothstep(.12,.05, length(po));
  if (body > 0.) {
    vec2 n = d/pr; float nz = sqrt(max(0., 1.-dot(n,n)));
    vec3 nrm = normalize(vec3(n, nz)); vec3 L = normalize(vec3(-po, -.22));
    float lit = max(0., dot(nrm, L));
    float rim = pow(1.-nz, 2.5);
    vec3 pc = vec3(.012,.014,.04) + mix(uA, vec3(1.), .6) * pow(lit, .7) * 2.6 + uB * rim * .45 + uC*.05*rim;
    pc *= .75 + .25*noise(n*6.+2.);
    col = mix(col, pc, body*(1.-behind));
  }
  col += uA * exp(-pd*70.) * .10 * (1.-behind);
  // ---- fade to nothing at the edge; filmic ----
  col *= smoothstep(.5,.27,rr);
  col = 1. - exp(-col*1.4);
  float alpha = clamp(max(col.r,max(col.g,col.b))*1.5, 0., 1.);
  gl_FragColor = vec4(col, alpha);
}`;
export const STAR_UNIFORMS = ['uRes', 'uT', 'uSpin', 'uListen', 'uThink', 'uSpeak', 'uPulse', 'uBeam', 'uBeamA', 'uDetail', 'uA', 'uB', 'uC'] as const;
export type StarUniform = (typeof STAR_UNIFORMS)[number];
