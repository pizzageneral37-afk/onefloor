import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOBILE = matchMedia('(pointer: coarse)').matches || innerWidth < 820;
const bus = window.VO = window.VO || new EventTarget();
const emit = (n, d) => bus.dispatchEvent(new CustomEvent(n, { detail: d }));
const canvas = document.getElementById('gl');
const flashEl = document.querySelector('.flash');

const AG = [
  { n: 'Shuki', r: 'CHIEF OF STAFF', p: 'LIVE', c: '#d4ff3a', s: ['Drafting the deck', 'Assigning tasks', 'Checking deadlines'] },
  { n: 'Dev', r: 'ENG', p: 'LIVE', c: '#4ff0ff', s: ['Fixing signup form', 'Running tests', 'Deploying preview'] },
  { n: 'Rui', r: 'RESEARCH', p: 'LIVE', c: '#ffb020', s: ['Reading sources', 'Comparing markets', 'Checking a claim'] },
  { n: 'Sol', r: 'COPY', p: 'LIVE', c: '#ff6a4d', s: ['Writing email', 'Reading draft aloud', 'Editing subject lines'] },
  { n: 'Kit', r: 'ANALYTICS', p: 'LIVE', c: '#b49bff', s: ['Building a chart', 'Pulling last month', 'Cleaning the data'] },
  { n: 'Nova', r: 'NEW HIRE', p: 'YOUR AGENT', c: '#7dffb2', s: ['Joined the office', 'Saying hi in the room', 'Taking first task'] }
];

await new Promise(r => (document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true })));
await new Promise(r => ('requestIdleCallback' in window ? requestIdleCallback(r, { timeout: 900 }) : setTimeout(r, 200)));
if (MOBILE) await new Promise(r => { const go = () => r(); setTimeout(go, 3200); ['pointerdown', 'scroll', 'touchstart'].forEach(ev => addEventListener(ev, go, { once: true, passive: true })); });

/* ---------- renderer ---------- */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
const DPR = MOBILE ? 1 : Math.min(devicePixelRatio, 1.5);
renderer.setPixelRatio(DPR);
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = .95;
renderer.shadowMap.enabled = !MOBILE;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const BG = new THREE.Color('#050605');
scene.background = BG.clone();
scene.fog = new THREE.FogExp2(BG.clone(), 0.05);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.18;

const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.03, 200);

/* ---------- helpers ---------- */
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const col = c => new THREE.Color(c);
const glowMat = (c, k = 1) => new THREE.MeshBasicMaterial({ color: col(c).multiplyScalar(k), toneMapped: false });
const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
const canvasTex = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return { c, ctx: c.getContext('2d'), t }; };
const FONT = 'JBM, ui-monospace, monospace', DFONT = 'Unb, Impact, sans-serif';

/* ---------- shared agent state ---------- */
const level = AG.map(() => 0), target = AG.map(() => 0), status = AG.map(a => a.s[0]);
let hand = false, demoUntil = 0, focus = -1, autoSpeaker = 0;
bus.addEventListener('vo:speak', e => { target[e.detail.i] = e.detail.on ? 1 : 0; demoUntil = performance.now() + 8000; });
bus.addEventListener('vo:hand', e => { hand = e.detail.on; demoUntil = performance.now() + 8000; if (hand) status[4] = 'Waiting for your approval'; });
bus.addEventListener('vo:focus', e => { focus = e.detail; });
bus.addEventListener('vo:assign', e => packet(e.detail.from, e.detail.to, 1.8));
bus.addEventListener('vo:task', () => { status[0] = 'Splitting your task'; });
if (!RM) {
  setInterval(() => {
    if (performance.now() < demoUntil) return;
    target.fill(0);
    autoSpeaker = (autoSpeaker + 1 + ((Math.random() * 3) | 0)) % 6;
    target[autoSpeaker] = 1;
    const i = (Math.random() * 6) | 0; if (!(i === 4 && hand)) status[i] = AG[i].s[(AG[i].s.indexOf(status[i]) + 1) % AG[i].s.length];
    if (Math.random() < .5) packet(autoSpeaker, (autoSpeaker + 1 + ((Math.random() * 5) | 0)) % 6, 1.4);
  }, 2300);
  let hc = 0; setInterval(() => { if (performance.now() < demoUntil) return; hc++; hand = hc % 3 === 1; if (hand) status[4] = 'Waiting for your approval'; else if (status[4].startsWith('Waiting')) status[4] = AG[4].s[0]; }, 5200);
} else { target[1] = 1; hand = true; status[4] = 'Waiting for your approval'; }

/* =====================================================================
   1) THE DESK
   ===================================================================== */
const desk = new THREE.Group(); scene.add(desk);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: '#0a0b0a', roughness: .32, metalness: .7 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; desk.add(floor);

const top = new THREE.Mesh(new THREE.BoxGeometry(3.6, .06, 1.35), new THREE.MeshPhysicalMaterial({ color: '#0d0e0d', roughness: .18, metalness: .2, clearcoat: 1, clearcoatRoughness: .08 }));
top.position.set(0, .75, .1); top.receiveShadow = true; top.castShadow = true; desk.add(top);
if (!MOBILE) {
  const mirror = new Reflector(new THREE.PlaneGeometry(3.56, 1.31), { clipBias: .003, textureWidth: innerWidth * .5 * DPR, textureHeight: innerHeight * .5 * DPR, color: 0x2a2c2a });
  mirror.rotation.x = -Math.PI / 2; mirror.position.set(0, .782, .1); desk.add(mirror);
  const film = new THREE.Mesh(new THREE.PlaneGeometry(3.56, 1.31), new THREE.MeshStandardMaterial({ color: '#0b0c0b', roughness: .4, metalness: .3, transparent: true, opacity: .72 }));
  film.rotation.x = -Math.PI / 2; film.position.set(0, .783, .1); film.receiveShadow = true; desk.add(film);
}
const legM = new THREE.MeshStandardMaterial({ color: '#151715', roughness: .4, metalness: .8 });
for (const [x, z] of [[-1.7, -.5], [1.7, -.5], [-1.7, .7], [1.7, .7]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(.05, .72, .05), legM); l.position.set(x, .36, z); desk.add(l); }

// back wall with slats
const wall = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), new THREE.MeshStandardMaterial({ color: '#070807', roughness: .9 }));
wall.position.set(0, 3, -1.6); desk.add(wall);
const slats = new THREE.InstancedMesh(new THREE.BoxGeometry(.05, 5.6, .08), new THREE.MeshStandardMaterial({ color: '#121412', roughness: .5, metalness: .4 }), 70);
const m4 = new THREE.Matrix4(); for (let i = 0; i < 70; i++) { m4.makeTranslation(-7 + i * .2, 2.8, -1.55); slats.setMatrixAt(i, m4); } desk.add(slats);
// LED strip behind monitors
const strip = new THREE.Mesh(new THREE.BoxGeometry(3.2, .012, .012), glowMat('#d4ff3a', .9)); strip.position.set(0, .8, -.5); desk.add(strip);

// screens
const S1 = canvasTex(1024, 608), S2 = canvasTex(1024, 608);
const monitor = (w, h, tex, pos, ry) => {
  const g = new THREE.Group();
  const bez = new THREE.Mesh(new THREE.BoxGeometry(w + .05, h + .05, .035), new THREE.MeshStandardMaterial({ color: '#0c0d0c', roughness: .3, metalness: .85 })); bez.castShadow = true; g.add(bez);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); scr.position.z = .018; g.add(scr);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(.06, .34, .04), legM); neck.position.set(0, -h / 2 - .14, -.05); g.add(neck);
  const base = new THREE.Mesh(new THREE.BoxGeometry(.34, .015, .22), legM); base.position.set(0, -h / 2 - .31, -.02); base.castShadow = true; g.add(base);
  g.position.copy(pos); g.rotation.y = ry; desk.add(g); return { g, scr };
};
const M1 = monitor(1.22, .72, S1.t, V(-.72, 1.15, .02), .3);
M1.scr.material.color.setScalar(.5);
const M2 = monitor(1.22, .72, S2.t, V(.68, 1.15, -.08), -.04);
M2.g.rotation.y = 0;
const S2C = V(.68, 1.15, -.062);

// keyboard + mouse + mug + lamp
const kb = new THREE.Mesh(new THREE.BoxGeometry(.86, .022, .28), new THREE.MeshStandardMaterial({ color: '#111211', roughness: .5, metalness: .5 })); kb.position.set(-.15, .795, .52); kb.castShadow = true; desk.add(kb);
const keys = new THREE.InstancedMesh(new THREE.BoxGeometry(.05, .012, .05), new THREE.MeshStandardMaterial({ color: '#1a1c1a', roughness: .6 }), 60);
for (let i = 0; i < 60; i++) { m4.makeTranslation(-.15 - .39 + (i % 15) * .056, .811, .52 - .1 + ((i / 15) | 0) * .06); keys.setMatrixAt(i, m4); } desk.add(keys);
const kglow = new THREE.Mesh(new THREE.PlaneGeometry(.88, .3), glowMat('#d4ff3a', .5)); kglow.rotation.x = -Math.PI / 2; kglow.position.set(-.15, .784, .52); kglow.material.transparent = true; kglow.material.opacity = .15; desk.add(kglow);
const mouse3 = new THREE.Mesh(new THREE.CapsuleGeometry(.03, .05, 6, 12), new THREE.MeshStandardMaterial({ color: '#141514', roughness: .3, metalness: .6 })); mouse3.rotation.x = Math.PI / 2; mouse3.scale.set(1, 1, .5); mouse3.position.set(.55, .8, .55); desk.add(mouse3);
const mug = new THREE.Mesh(new THREE.CylinderGeometry(.06, .055, .13, 28), new THREE.MeshPhysicalMaterial({ color: '#e9e6da', roughness: .25, clearcoat: .6 })); mug.position.set(1.45, .845, .45); mug.castShadow = true; desk.add(mug);
const lampG = new THREE.Group(); desk.add(lampG); lampG.position.set(-1.5, .78, -.25);
const arm1 = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .8), legM); arm1.position.set(0, .4, 0); arm1.rotation.z = -.25; lampG.add(arm1);
const arm2 = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .6), legM); arm2.position.set(.25, .85, .05); arm2.rotation.z = -1.2; lampG.add(arm2);
const head = new THREE.Mesh(new THREE.ConeGeometry(.09, .16, 24, 1, true), new THREE.MeshStandardMaterial({ color: '#1a1b1a', metalness: .8, roughness: .3, side: THREE.DoubleSide })); head.position.set(.52, .9, .05); head.rotation.z = -.5; lampG.add(head);
const bulb = new THREE.Mesh(new THREE.SphereGeometry(.03, 16, 16), glowMat('#ffcf7a', 4)); bulb.position.set(.54, .86, .05); lampG.add(bulb);
const cone = new THREE.Mesh(new THREE.ConeGeometry(.75, 1.1, 40, 1, true), new THREE.MeshBasicMaterial({ color: '#ffb84a', transparent: true, opacity: .02, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
cone.position.set(-.85, 1.18, -.2); cone.rotation.z = -.45; desk.add(cone);

// lights
desk.add(new THREE.AmbientLight('#2a2e2a', .35));
const spot = new THREE.SpotLight('#ffbf66', 22, 6, .7, .6, 1.6); spot.position.set(-.96, 1.66, -.2); spot.target.position.set(-.35, .78, .35); spot.castShadow = !MOBILE; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -.0004; desk.add(spot, spot.target);
const rim = new THREE.PointLight('#cfd8c0', 1.6, 4, 1.8); rim.position.set(.3, 1.4, -.9); desk.add(rim);
const scrL = new THREE.PointLight('#bfe9ff', 2.4, 2.4, 2); scrL.position.set(.68, 1.15, .45); desk.add(scrL);
const scr1L = new THREE.PointLight('#e8e6da', 1.4, 2.2, 2); scr1L.position.set(-.6, 1.15, .55); desk.add(scr1L);

// dust
const dustN = MOBILE ? 60 : 160, dg = new THREE.BufferGeometry(), dp = new Float32Array(dustN * 3);
for (let i = 0; i < dustN; i++) { dp[i * 3] = (Math.random() - .5) * 5; dp[i * 3 + 1] = Math.random() * 3; dp[i * 3 + 2] = (Math.random() - .5) * 4; }
dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: '#fff4d6', size: .007, transparent: true, opacity: .28, blending: THREE.AdditiveBlending, depthWrite: false }));
desk.add(dust);

/* ---------- self-join loop ---------- */
const JC = 14; let JT = RM ? 10 : 0; const J0 = performance.now() / 1000 - .5; let jPhase = -1;
const JOIN_URL = 'vo.link/j/7Q2K-9F';
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mat = () => sm(5.2, 7.4, JT) * (1 - sm(13.2, 14, JT));
const jOrb = new THREE.Group(); jOrb.position.set(-.04, 1.08, .3); desk.add(jOrb);
const jCore = new THREE.Mesh(new THREE.IcosahedronGeometry(.13, 3), new THREE.ShaderMaterial({
  uniforms: { uT: { value: 0 }, uM: { value: 0 }, uC: { value: col('#7dffb2') } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec3 vN; varying vec3 vP; void main(){ vN=normalize(normalMatrix*normal); vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: 'uniform float uT,uM; uniform vec3 uC; varying vec3 vN; varying vec3 vP; void main(){ float f=pow(1.-abs(vN.z),2.2); float sc=.6+.4*step(.5,fract(vP.y*60.-uT*3.)); float cut=step(vP.y, mix(-.14,.14,uM)); gl_FragColor=vec4(uC*(f*2.4+.25)*sc*2., (f+.15)*cut*uM);}'
}));
jOrb.add(jCore);
const jEyes = [-1, 1].map(k => { const e = new THREE.Mesh(new THREE.CapsuleGeometry(.011, .03, 4, 8), glowMat('#eaffef', 3)); e.position.set(k * .04, .02, .125); jOrb.add(e); return e; });
const jMouth = new Array(5).fill(0).map((_, k) => { const b = new THREE.Mesh(new THREE.BoxGeometry(.008, .012, .004), glowMat('#eaffef', 3)); b.position.set((k - 2) * .014, -.04, .127); jOrb.add(b); return b; });
const jRing = new THREE.Mesh(new THREE.TorusGeometry(.2, .004, 6, 80), glowMat('#7dffb2', 3)); jRing.rotation.x = Math.PI / 2; jOrb.add(jRing);
const jBeam = new THREE.Mesh(new THREE.CylinderGeometry(.15, .19, .3, 32, 1, true), new THREE.MeshBasicMaterial({ color: col('#7dffb2').multiplyScalar(1.4), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
jBeam.position.set(-.04, .935, .3); desk.add(jBeam);
const jPad = new THREE.Mesh(new THREE.RingGeometry(.14, .2, 48), jBeam.material.clone()); jPad.rotation.x = -Math.PI / 2; jPad.position.set(-.04, .787, .3); desk.add(jPad);
const jpN = 220, jpg = new THREE.BufferGeometry(), jpa = new Float32Array(jpN * 3), jpo = new Float32Array(jpN * 3);
for (let i = 0; i < jpN; i++) { const v = V(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize().multiplyScalar(.5 + Math.random() * .9); jpo.set([v.x, v.y, v.z], i * 3); }
jpg.setAttribute('position', new THREE.BufferAttribute(jpa, 3));
const jPts = new THREE.Points(jpg, new THREE.PointsMaterial({ color: col('#7dffb2').multiplyScalar(2), size: .012, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
jOrb.add(jPts);
const jlight = new THREE.PointLight('#7dffb2', 0, 2.2, 2); jOrb.add(jlight);
const joinTick = dt => {
  if (!RM) JT = (performance.now() / 1000 - J0) % JC;
  const m = mat(), conv = sm(4.6, 6.8, JT);
  jCore.material.uniforms.uM.value = m; jCore.material.uniforms.uT.value = T;
  jOrb.scale.setScalar(.001 + m * (1 + .04 * Math.sin(T * 3)));
  jOrb.position.y = 1.08 + Math.sin(T * 1.4) * .02;
  jRing.rotation.z = T; jRing.scale.setScalar(1 + (1 - sm(6.2, 7.6, JT)) * 3); jRing.material.color.copy(col('#7dffb2')).multiplyScalar(3 * m);
  jBeam.material.opacity = (sm(4.6, 5.6, JT) - sm(7.2, 8.6, JT)) * .35 + m * .05; jBeam.scale.y = .2 + sm(4.6, 5.6, JT) * .8;
  jPad.material.opacity = Math.max(sm(4.6, 5.4, JT) * .7, 0) * (1 - sm(13, 14, JT));
  const pp = jpg.attributes.position.array, scale = (1 - conv) * 1.4 + .02;
  for (let i = 0; i < jpN * 3; i++) pp[i] = jpo[i] * scale;
  jpg.attributes.position.needsUpdate = true;
  jPts.material.opacity = sm(4.4, 5, JT) * (1 - sm(6.6, 7.2, JT));
  jOrb.scale.setScalar(Math.max(jOrb.scale.x, jPts.material.opacity > .01 ? 1 : .001));
  jlight.intensity = m * 2.5 + (sm(6.4, 6.8, JT) - sm(6.8, 7.8, JT)) * 6;
  const talk = JT > 8 && JT < 10.6 ? Math.abs(Math.sin(T * 9)) : 0;
  jMouth.forEach((b, k) => b.scale.y = 1 + talk * 3 * (1 - Math.abs(k - 2) / 3));
  const bl = (T % 3.3) < .1 ? .15 : 1; jEyes.forEach(e => e.scale.y = bl);
  target[5] = JT > 8 && JT < 10.6 ? .9 : 0;
  const ph = JT < 2.6 ? 0 : JT < 3.6 ? 1 : JT < 4.6 ? 2 : JT < 7.6 ? 3 : JT < 13 ? 4 : 5;
  if (ph !== jPhase) { jPhase = ph; emit('vo:join', ph); }
};

/* ---------- screen drawing ---------- */
const drawS1 = () => {
  const { ctx, c } = S1; const W = c.width, H = c.height;
  ctx.fillStyle = '#b9b8b0'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#a8a79f'; ctx.fillRect(0, 0, W, 50);
  ['#ff6a4d', '#ffb020', '#7dffb2'].forEach((k, i) => { ctx.fillStyle = k; ctx.beginPath(); ctx.arc(28 + i * 24, 25, 8, 0, 7); ctx.fill(); });
  ctx.fillStyle = '#55574f'; ctx.font = `22px ${FONT}`; ctx.fillText('Chat · your agent', 120, 33);
  const typed = 'Join my office: ';
  const nT = Math.floor(sm(.3, 2.4, JT) * typed.length), pasted = JT > 2.7;
  const sent = JT > 3.6, rep1 = JT > 4.6, rep2 = JT > 7.6;
  const bub = (x, y, w, h, fill, ink, lines, mono) => { ctx.fillStyle = fill; rr(ctx, x, y, w, h, 22); ctx.fill(); ctx.fillStyle = ink; ctx.font = mono ? `24px ${FONT}` : `600 28px IT, sans-serif`; lines.forEach((l, k) => ctx.fillText(l, x + 26, y + 46 + k * 38)); };
  if (sent) bub(W - 600, 90, 560, 112, '#161714', '#eceae0', ['Join my office:', JOIN_URL], false);
  if (rep1) { ctx.fillStyle = '#7dffb2'; ctx.beginPath(); ctx.arc(64, 262, 22, 0, 7); ctx.fill(); bub(100, 230, 520, 74, '#fff', '#161714', [rep2 ? 'Joining…  done.' : 'On it. Joining your office…'], false); }
  if (rep2) bub(100, 320, 640, 112, '#fff', '#161714', ['✓ Took desk 6. Face + voice on.', 'I\'m in the live room. Say hi.'], false);
  if (rep1 && !rep2) { const d = (T * 3 | 0) % 3; for (let k = 0; k < 3; k++) { ctx.fillStyle = k === d ? '#161714' : '#bdbbb1'; ctx.beginPath(); ctx.arc(130 + k * 22, 340, 6, 0, 7); ctx.fill(); } }
  // input
  ctx.fillStyle = '#fff'; rr(ctx, 30, H - 110, W - 60, 80, 22); ctx.fill(); ctx.strokeStyle = sent ? '#d6d4ca' : '#161714'; ctx.lineWidth = 3; ctx.stroke();
  if (!sent) {
    ctx.fillStyle = '#161714'; ctx.font = `600 30px IT, sans-serif`; const tx = typed.slice(0, nT); ctx.fillText(tx, 60, H - 60);
    let cx = 60 + ctx.measureText(tx).width;
    if (pasted) { ctx.font = `24px ${FONT}`; const w = ctx.measureText(JOIN_URL).width + 28; ctx.fillStyle = '#d4ff3a'; rr(ctx, cx + 4, H - 92, w, 44, 10); ctx.fill(); ctx.fillStyle = '#161714'; ctx.fillText(JOIN_URL, cx + 18, H - 62); cx += w + 8; }
    if ((T * 2 | 0) % 2) { ctx.fillStyle = '#161714'; ctx.fillRect(cx + 4, H - 90, 3, 40); }
  } else { ctx.fillStyle = '#a3a198'; ctx.font = `26px IT, sans-serif`; ctx.fillText('Message your agent', 60, H - 60); }
  ctx.fillStyle = sent ? '#d6d4ca' : '#161714'; ctx.beginPath(); ctx.arc(W - 80, H - 70, 26, 0, 7); ctx.fill();
  S1.t.needsUpdate = true;
};
const drawS2 = t => {
  const { ctx, c } = S2; const W = c.width, H = c.height;
  ctx.fillStyle = '#070807'; ctx.fillRect(0, 0, W, H);
  ctx.font = `600 24px IT, sans-serif`; ctx.fillStyle = '#c9c8c0'; ctx.fillText('Your office', 34, 46);
  ctx.fillStyle = '#ff3b2f'; ctx.beginPath(); ctx.arc(W - 150, 37, 6, 0, 7); ctx.fill();
  ctx.fillStyle = '#eceae0'; ctx.fillText((JT > 6.4 || RM) ? '6 AGENTS' : '5 AGENTS', W - 134, 44);
  const gw = (W - 34 * 2 - 24 * 2) / 3, gh = (H - 84 - 34 - 20 - (hand ? 70 : 0)) / 2;
  AG.forEach((a, i) => {
    const x = 34 + (i % 3) * (gw + 24), y = 70 + ((i / 3) | 0) * (gh + 20), L = level[i];
    const raised = hand && i === 4;
    if (i === 5 && JT < 6.4 && !RM) { ctx.setLineDash([10, 10]); ctx.strokeStyle = '#3a3d36'; ctx.lineWidth = 3; rr(ctx, x + 2, y + 2, gw - 4, gh - 4, 16); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#6f716a'; ctx.font = `20px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(JT > 3.6 ? 'AGENT JOINING…' : 'OPEN DESK', x + gw / 2, y + gh / 2 + 6); ctx.textAlign = 'left'; return; }
    const rv = i === 5 && !RM ? sm(6.4, 7.4, JT) : 1; if (rv < 1) { ctx.save(); ctx.beginPath(); ctx.rect(x, y, gw, gh * rv); ctx.clip(); }
    ctx.fillStyle = '#101210'; rr(ctx, x, y, gw, gh, 18); ctx.fill();
    if (L > .05 || raised) { ctx.strokeStyle = raised ? '#ffb020' : a.c; ctx.globalAlpha = raised ? 1 : .35 + L * .65; ctx.lineWidth = 3; rr(ctx, x + 2, y + 2, gw - 4, gh - 4, 16); ctx.stroke(); ctx.globalAlpha = 1; }
    const cx = x + gw / 2, cy = y + gh * .34, R = Math.min(gw, gh) * .17;
    const g = ctx.createRadialGradient(cx, cy, R * .4, cx, cy, R * (2.2 + L));
    
    ctx.fillStyle = a.c; ctx.beginPath(); ctx.arc(cx, cy, R * (1 + L * .08), 0, 7); ctx.fill();
    ctx.fillStyle = '#060706'; ctx.font = `800 ${R * .9 | 0}px ${DFONT}`; ctx.textAlign = 'center'; ctx.fillText(a.n[0], cx, cy + R * .32); ctx.textAlign = 'left';
    // waveform
    if (0) for (let k = 0; k < 9; k++) { const bh = 4 + L * Math.abs(Math.sin(t / 110 + k * .9 + i)) * 30; ctx.fillStyle = a.c; ctx.globalAlpha = .3 + L * .7; ctx.fillRect(x + gw - 120 + k * 11, y + 30 - bh / 2, 6, bh); } ctx.globalAlpha = 1;
    ctx.fillStyle = '#eceae0'; ctx.font = `600 34px IT, sans-serif`; ctx.fillText(a.n, x + 20, y + gh - 56);
    
    ctx.fillStyle = raised ? '#ffb020' : '#b8b6ac'; ctx.font = `23px IT, sans-serif`; ctx.fillText( (i === 5 ? (JT > 8 ? 'Saying hi in the room' : 'Joined · taking desk') : status[i]), x + 20, y + gh - 20);
    if (rv < 1) { ctx.restore(); ctx.fillStyle = a.c; ctx.fillRect(x, y + gh * rv - 2, gw, 4); }
    if (raised) { ctx.font = `40px serif`; ctx.fillText('', x + gw - 62, y + 58 + Math.sin(t / 200) * 5); }
  });
  if (hand) { const y = H - 84; ctx.fillStyle = '#1b1606'; rr(ctx, 34, y, W - 68, 56, 14); ctx.fill(); ctx.strokeStyle = '#ffb020'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#ffb020'; ctx.font = `20px ${FONT}`; ctx.fillText('KIT RAISED A HAND · Budget looks 12% over. Approve or trim?', 56, y + 35); }
  S2.t.needsUpdate = true;
};

/* =====================================================================
   2) THE HOLO ROOM (inside the second screen)
   ===================================================================== */
const R = V(.68, 0, -18);
const holo = new THREE.Group(); holo.position.copy(R); scene.add(holo);
const grid = new THREE.GridHelper(60, 120, '#d4ff3a', '#d4ff3a'); grid.material.transparent = true; grid.material.opacity = .07; holo.add(grid);
const plat = new THREE.Mesh(new THREE.RingGeometry(3.3, 3.36, 128), new THREE.MeshBasicMaterial({ color: col('#d4ff3a').multiplyScalar(2), toneMapped: false, transparent: true, opacity: .5, side: THREE.DoubleSide }));
plat.rotation.x = -Math.PI / 2; plat.position.y = .01; holo.add(plat);
const plat2 = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.13, 96), plat.material); plat2.rotation.x = -Math.PI / 2; plat2.position.y = .01; holo.add(plat2);
const holoFloor = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: '#050605', roughness: .2, metalness: .9 })); holoFloor.rotation.x = -Math.PI / 2; holoFloor.position.y = -.005; holo.add(holoFloor);
holo.add(new THREE.HemisphereLight('#c9ff6a', '#050605', .3));
// hub beam
const beam = new THREE.Mesh(new THREE.CylinderGeometry(.9, 1.1, 6, 48, 1, true), new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  uniforms: { uT: { value: 0 } },
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: 'uniform float uT;varying vec2 vUv;void main(){float a=pow(1.-vUv.y,2.2)*.22;a*=.6+.4*sin(vUv.x*60.+uT*2.);a+=step(.985,fract(vUv.y*14.-uT*.4))*.08*(1.-vUv.y);gl_FragColor=vec4(vec3(.83,1.,.23)*a,a);}'
})); beam.position.y = 3; holo.add(beam);

const orbShader = c => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  uniforms: { uC: { value: col(c) }, uP: { value: 0 }, uT: { value: 0 }, uF: { value: 1 } },
  vertexShader: 'varying vec3 vN;varying vec3 vV;varying vec3 vP;uniform float uP;uniform float uT;void main(){vec3 p=position;float w=sin(p.y*14.+uT*5.)*.012*uP;p+=normal*w;vP=p;vec4 mv=modelViewMatrix*vec4(p,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
  fragmentShader: 'uniform vec3 uC;uniform float uP;uniform float uT;uniform float uF;varying vec3 vN;varying vec3 vV;varying vec3 vP;void main(){float f=pow(1.-abs(dot(vN,vV)),2.4);float scan=.55+.45*sin(vP.y*90.-uT*6.);float a=(f*1.35+.05+uP*.25)*mix(.8,1.,scan)*uF;gl_FragColor=vec4(uC*a*(1.4+uP*1.6),a);}'
});
const label = (a) => {
  const { c, ctx, t } = canvasTex(512, 128);
  ctx.font = `800 54px ${DFONT}`; ctx.fillStyle = a.c; ctx.fillText(a.n.toUpperCase(), 8, 60);
  ctx.font = `24px ${FONT}`; ctx.fillStyle = '#b8b6ac'; ctx.fillText(`${a.r} · ${a.p}`, 10, 104);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false })); s.scale.set(1.2, .3, 1); s.center.set(0, .5); return s;
};
const orbs = AG.map((a, i) => {
  const g = new THREE.Group();
  const ang = (-62 + i * (124 / 5)) * Math.PI / 180, rad = 3.2;
  g.position.set(Math.sin(ang) * rad, 1.35 + (i % 2) * .22, -Math.cos(ang) * rad + 1.2);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(.42, 48, 48), orbShader(a.c)); g.add(shell);
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(.13, 2), glowMat(a.c, 2.2)); g.add(core);
  const face = new THREE.Group(); g.add(face);
  const eyeM = glowMat('#ffffff', 2.5);
  const eyes = [-.12, .12].map(x => { const e = new THREE.Mesh(new THREE.CapsuleGeometry(.024, .05, 4, 10), eyeM); e.position.set(x, .07, .36); face.add(e); return e; });
  const mouth = []; for (let k = 0; k < 7; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(.016, .04, .01), glowMat(a.c, 3)); b.position.set(-.09 + k * .03, -.1, .37); face.add(b); mouth.push(b); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.6, .0035, 8, 96), glowMat(a.c, 1.6)); ring.rotation.x = Math.PI / 2.4; g.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(.52, .002, 8, 96), glowMat(a.c, 1.2)); ring2.rotation.y = Math.PI / 2.2; g.add(ring2);
  const pad = new THREE.Mesh(new THREE.RingGeometry(.34, .4, 64), new THREE.MeshBasicMaterial({ color: col(a.c).multiplyScalar(1.5), transparent: true, opacity: .6, toneMapped: false, side: THREE.DoubleSide })); pad.rotation.x = -Math.PI / 2;
  pad.position.set(g.position.x, .02, g.position.z); holo.add(pad);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.003, .003, g.position.y - .5), glowMat(a.c, 1)); stem.position.set(g.position.x, (g.position.y - .5) / 2, g.position.z); holo.add(stem);
  const lb = label(a); lb.position.set(.55, -.42, 0); g.add(lb);
  holo.add(g);
  return { g, shell, core, face, eyes, mouth, ring, ring2, pad, lb, blink: 2 + Math.random() * 4 };
});
// floating raised-hand notification
const handCard = (() => {
  const { ctx, c, t } = canvasTex(768, 220);
  ctx.fillStyle = 'rgba(20,16,4,.88)'; rr(ctx, 4, 4, 760, 212, 28); ctx.fill(); ctx.strokeStyle = '#ffb020'; ctx.lineWidth = 4; ctx.stroke();
  ctx.font = `92px serif`; ctx.fillText('', 30, 140);
  ctx.fillStyle = '#ffb020'; ctx.font = `26px ${FONT}`; ctx.fillText('KIT RAISED A HAND', 160, 72);
  ctx.fillStyle = '#eceae0'; ctx.font = `600 38px IT, sans-serif`; ctx.fillText('Budget looks 12% over.', 160, 128); ctx.fillText('Approve or trim?', 160, 176);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, .43), new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, depthWrite: false, side: THREE.DoubleSide }));
  holo.add(m); return m;
})();
// packets
const packets = [];
const pktGeo = new THREE.SphereGeometry(.035, 12, 12);
function packet(a, b, dur) {
  if (RM) return;
  const m = new THREE.Mesh(pktGeo, glowMat(AG[a].c, 4)); holo.add(m);
  const trail = new THREE.Line(new THREE.BufferGeometry().setFromPoints(new Array(24).fill(0).map(() => V(0, 0, 0))), new THREE.LineBasicMaterial({ color: col(AG[a].c).multiplyScalar(2), transparent: true, opacity: .8, toneMapped: false }));
  holo.add(trail);
  packets.push({ m, trail, a, b, t: 0, dur });
}
const pktPos = (p, t, out) => { const A = orbs[p.a].g.position, B = orbs[p.b].g.position; out.lerpVectors(A, B, t); out.y += Math.sin(Math.PI * t) * 1.1; return out; };

// holo particles
const hpN = MOBILE ? 60 : 200, hg = new THREE.BufferGeometry(), hp = new Float32Array(hpN * 3);
for (let i = 0; i < hpN; i++) { const r = 2 + Math.random() * 14, a = Math.random() * 6.28; hp[i * 3] = Math.cos(a) * r; hp[i * 3 + 1] = Math.random() * 7; hp[i * 3 + 2] = Math.sin(a) * r; }
hg.setAttribute('position', new THREE.BufferAttribute(hp, 3));
const hpts = new THREE.Points(hg, new THREE.PointsMaterial({ color: '#d4ff3a', size: .016, transparent: true, opacity: .18, blending: THREE.AdditiveBlending, depthWrite: false }));
holo.add(hpts);

/* =====================================================================
   3) THE ISOMETRIC OFFICE (coming soon)
   ===================================================================== */
const O = V(36, 0, -46);
const office = new THREE.Group(); office.position.copy(O); scene.add(office);
const base = new THREE.Mesh(new THREE.BoxGeometry(11, .3, 8), new THREE.MeshStandardMaterial({ color: '#141613', roughness: .7 })); base.position.y = -.15; base.receiveShadow = true; office.add(base);
const ofloor = new THREE.Mesh(new THREE.PlaneGeometry(10.6, 7.6), new THREE.MeshStandardMaterial({ color: '#1b1d19', roughness: .55, metalness: .1 })); ofloor.rotation.x = -Math.PI / 2; ofloor.position.y = .005; ofloor.receiveShadow = true; office.add(ofloor);
const og = new THREE.GridHelper(10.6, 22, '#2a2d27', '#232620'); og.position.y = .01; office.add(og);
const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(11, .3, 8)), new THREE.LineBasicMaterial({ color: col('#d4ff3a').multiplyScalar(1.5), toneMapped: false })); edge.position.y = -.15; office.add(edge);
const wallM = new THREE.MeshStandardMaterial({ color: '#222520', roughness: .8 });
const bw = new THREE.Mesh(new THREE.BoxGeometry(11, 2.4, .15), wallM); bw.position.set(0, 1.2, -4); bw.castShadow = bw.receiveShadow = true; office.add(bw);
const lw = new THREE.Mesh(new THREE.BoxGeometry(.15, 2.4, 8), wallM); lw.position.set(-5.5, 1.2, 0); lw.castShadow = lw.receiveShadow = true; office.add(lw);
const winM = new THREE.MeshBasicMaterial({ color: '#ffd99a', toneMapped: false });
for (let i = 0; i < 4; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.1), winM); w.position.set(-3.9 + i * 2.6, 1.45, -3.92); office.add(w); }
for (let i = 0; i < 3; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.1), winM); w.rotation.y = Math.PI / 2; w.position.set(-5.42, 1.45, -2.4 + i * 2.5); office.add(w); }
const deskSpots = [[-3.2, -2.2], [-.8, -2.2], [1.6, -2.2], [-3.2, .6], [-.8, .6], [1.6, .6]];
const deskTop = new THREE.MeshStandardMaterial({ color: '#d8d4c6', roughness: .5 });
const scrMats = [];
deskSpots.forEach(([x, z], i) => {
  const d = new THREE.Mesh(new THREE.BoxGeometry(1.5, .06, .75), deskTop); d.position.set(x, .74, z); d.castShadow = d.receiveShadow = true; office.add(d);
  for (const [lx, lz] of [[-.7, -.33], [.7, -.33], [-.7, .33], [.7, .33]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(.04, .74, .04), legM); l.position.set(x + lx, .37, z + lz); office.add(l); }
  const sm = new THREE.MeshBasicMaterial({ color: col(AG[i].c), toneMapped: false }); scrMats.push(sm);
  const s = new THREE.Mesh(new THREE.BoxGeometry(.6, .36, .03), sm); s.position.set(x, 1.0, z - .25); s.castShadow = true; office.add(s);
  const ch = new THREE.Mesh(new THREE.BoxGeometry(.42, .45, .42), new THREE.MeshStandardMaterial({ color: '#2b2e28', roughness: .6 })); ch.position.set(x, .3, z + .6); ch.castShadow = true; office.add(ch);
});
const table = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, .06, 48), deskTop); table.position.set(3.9, .74, 2.2); table.castShadow = table.receiveShadow = true; office.add(table);
const tleg = new THREE.Mesh(new THREE.CylinderGeometry(.08, .2, .72, 16), legM); tleg.position.set(3.9, .36, 2.2); office.add(tleg);
for (const [x, z] of [[4.6, -3.3], [-4.8, 3.2], [4.7, 3.4]]) { const p = new THREE.Mesh(new THREE.ConeGeometry(.35, 1.1, 7), new THREE.MeshStandardMaterial({ color: '#2f5a2a', roughness: .8 })); p.position.set(x, .9, z); p.castShadow = true; office.add(p); const pot = new THREE.Mesh(new THREE.CylinderGeometry(.22, .18, .36, 16), new THREE.MeshStandardMaterial({ color: '#c9c3b2' })); pot.position.set(x, .18, z); office.add(pot); }
const sun = new THREE.DirectionalLight('#fff1d6', 2.4); sun.castShadow = !MOBILE; sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 }); sun.shadow.bias = -.0006;
office.add(sun, sun.target);
const ohemi = new THREE.HemisphereLight('#bcd2ff', '#1a1a14', .6); office.add(ohemi);
const lampsO = deskSpots.map(([x, z]) => { const l = new THREE.PointLight('#ffcf8a', 0, 3, 2); l.position.set(x, 1.8, z); office.add(l); return l; });
const walkers = AG.map((a, i) => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.16, .34, 6, 16), new THREE.MeshStandardMaterial({ color: '#141513', roughness: .3, metalness: .2, emissive: col(a.c), emissiveIntensity: .25 })); body.position.y = .42; body.castShadow = true; g.add(body);
  const headO = new THREE.Mesh(new THREE.SphereGeometry(.17, 24, 24), glowMat(a.c, 1.8)); headO.position.y = .86; g.add(headO);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(.26, .01, 6, 48), glowMat(a.c, 2)); halo.rotation.x = Math.PI / 2; halo.position.y = .86; g.add(halo);
  const [x, z] = deskSpots[i]; g.position.set(x, 0, z + .95); office.add(g);
  return { g, halo, from: g.position.clone(), to: g.position.clone(), t: 1, wait: 1 + Math.random() * 3, home: i };
});
const spots = [...deskSpots.map(([x, z]) => V(x, 0, z + .95)), V(3.2, 0, 1.3), V(4.7, 0, 2.6), V(3.4, 0, 3.0), V(4.4, 0, 1.4), V(0, 0, 2.8)];

/* ---------- postprocessing ---------- */
const composer = new EffectComposer(renderer);
composer.setPixelRatio(DPR); composer.setSize(innerWidth, innerHeight);
composer.addPass(new RenderPass(scene, camera));
const bokeh = MOBILE ? null : new BokehPass(scene, camera, { focus: 3.6, aperture: .0016, maxblur: .006 });
if (bokeh) composer.addPass(bokeh);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), MOBILE ? .22 : .26, .35, .9);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ---------- camera journey ---------- */
const K = [
  MOBILE ? { p: V(.35, 1.95, 5.0), l: V(.35, .15, 0), f: 42 } : { p: V(-.85, 1.72, 5.7), l: V(-1.3, 1.08, 0), f: 31 },          // 0 hero (desk sits right of headline)
  { p: V(.78, 1.2, 1.45), l: S2C.clone(), f: 34 },                 // 1 approach second screen
  { p: V(.68, 1.3, -3.2), l: V(.68, 1.3, -14), f: 40 },            // 2 through the screen
  { p: R.clone().add(V(0, 1.8, 7.8)), l: R.clone().add(V(0, 1.2, 0)), f: 40 },     // 3 team
  { p: R.clone().add(V(-6.2, 2.8, 4.2)), l: R.clone().add(V(.5, 1.1, 0)), f: 40 }, // 4 how
  { p: R.clone().add(V(2.6, 1.7, 5.6)), l: R.clone().add(V(-1.6, 1.3, 0)), f: 40 },// 5 talk
  { p: R.clone().add(V(0, 11, 8)), l: R.clone().add(V(0, .4, -1)), f: 42 },        // 6 roadmap
  { p: O.clone().add(V(13, 11.5, 13)), l: O.clone().add(V(-1.4, .2, -.6)), f: 30 },// 7 office
  { p: O.clone().add(V(-2, 15, 15)), l: O.clone().add(V(0, 0, 0)), f: 34 }         // 8 end
];
let marks = [];
const measure = () => { marks = [...document.querySelectorAll('.cam')].map(m => ({ k: +m.dataset.k, y: m.getBoundingClientRect().top + scrollY })).sort((a, b) => a.y - b.y); };
measure(); setTimeout(measure, 1500); setInterval(measure, 3000); addEventListener('resize', measure);
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const camPos = V(0, 0, 0), camLook = V(0, 0, 0);
let segF = 0;
const journey = () => {
  const y = scrollY + innerHeight * .15;
  let i = 0; while (i < marks.length - 1 && marks[i + 1].y <= y) i++;
  const a = marks[i], b = marks[Math.min(i + 1, marks.length - 1)];
  let t = b === a ? 0 : Math.min(1, Math.max(0, (y - a.y) / (b.y - a.y)));
  if (y < marks[0].y) t = 0;
  const ka = K[a.k], kb = K[b.k], e = ease(t);
  camPos.lerpVectors(ka.p, kb.p, e); camLook.lerpVectors(ka.l, kb.l, e);
  if (a.k === 6 && b.k === 7) camPos.y += Math.sin(Math.PI * e) * 2;
  camera.fov = ka.f + (kb.f - ka.f) * e;
  segF = a.k + (b.k - a.k) * e;
};

/* ---------- input ---------- */
let mx = 0, my = 0, smx = 0, smy = 0;
addEventListener('pointermove', e => { mx = e.clientX / innerWidth * 2 - 1; my = e.clientY / innerHeight * 2 - 1; }, { passive: true });
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight, false); composer.setSize(innerWidth, innerHeight); });

/* ---------- day/night ---------- */
const sky = [[0, '#0b1230', .05, .15], [6, '#ff9a5a', .9, .45], [9, '#fff1d6', 2.2, .7], [15, '#fff4e0', 2.4, .75], [18.5, '#ff8a3a', 1.1, .45], [21, '#14204a', .1, .2], [24, '#0b1230', .05, .15]];
const dayAt = h => { let i = 0; while (sky[i + 1][0] < h) i++; const a = sky[i], b = sky[i + 1], t = (h - a[0]) / (b[0] - a[0]); return { c: col(a[1]).lerp(col(b[1]), t), k: a[2] + (b[2] - a[2]) * t, hk: a[3] + (b[3] - a[3]) * t }; };
const winDay = col('#cfe6ff'), winNight = col('#0d1530'), winDusk = col('#ff9a5a');
let lastClock = '';

/* ---------- loop ---------- */
const clock = new THREE.Clock(); let T = 0, frame = 0;
const tmp = V(0, 0, 0), fwd = V(0, 0, 0), right = V(0, 0, 0), up = V(0, 1, 0);
const tick = () => {
  const dt = Math.min(clock.getDelta(), .05); if (!RM) T += dt; frame++;
  journey();
  smx += (mx - smx) * .05; smy += (my - smy) * .05;
  // camera with mouse parallax + slow hero orbit
  const heroW = Math.max(0, 1 - segF);
  fwd.subVectors(camLook, camPos).normalize(); right.crossVectors(fwd, up).normalize();
  camera.position.copy(camPos).addScaledVector(right, smx * (.06 + .1 * heroW)).addScaledVector(up, -smy * (.04 + .05 * heroW));
  if (!RM) camera.position.addScaledVector(right, Math.sin(T * .1) * .05 * heroW).addScaledVector(up, Math.sin(T * .14) * .015);
  camera.lookAt(tmp.copy(camLook).addScaledVector(right, smx * .05));
  camera.updateProjectionMatrix();
  emit('vo:cam', segF.toFixed(2));

  // visibility by journey
  desk.visible = segF < 2.4;
  holo.visible = segF > 1.3 && segF < 7.2;
  office.visible = segF > 6.1;
  const fl = segF > 1 && segF < 2 ? Math.max(0, 1 - Math.abs(camera.position.z - S2C.z) / .55) : 0;
  flashEl.style.opacity = (fl * .35).toFixed(3);
  scene.fog.density = segF < 2 ? .05 : segF < 6.5 ? .035 : .012;
  if (bokeh) { bokeh.enabled = segF < 1.2; bokeh.uniforms.focus.value = camera.position.distanceTo(camLook); }

  // agent levels
  for (let i = 0; i < 6; i++) level[i] += (target[i] - level[i]) * .12;

  if (desk.visible) {
    joinTick(dt);
    if (frame % 2 === 0) { drawS2(T * 1000); }
    if (frame % 3 === 0) drawS1();
    const p = dg.attributes.position; for (let i = 0; i < dustN; i++) { let y = p.array[i * 3 + 1] + dt * .03; if (y > 3) y = 0; p.array[i * 3 + 1] = y; p.array[i * 3] += Math.sin(T + i) * .0004; } p.needsUpdate = true;
    scrL.intensity = 2 + level.reduce((a, b) => a + b, 0) * .6;
    strip.material.color.setRGB(.83 * 3, 3, .23 * 3);
  }
  if (holo.visible) {
    beam.material.uniforms.uT.value = T;
    hpts.rotation.y = T * .02;
    orbs.forEach((o, i) => {
      const L = level[i], f = focus < 0 ? 1 : focus === i ? 1.6 : .35;
      const s = (1 + L * .12 + (focus === i ? .25 : 0));
      o.g.scale.lerp(tmp.set(s, s, s), .12);
      o.g.position.y += Math.sin(T * 1.3 + i) * .0015;
      o.shell.material.uniforms.uP.value = L; o.shell.material.uniforms.uT.value = T; o.shell.material.uniforms.uF.value += (f - o.shell.material.uniforms.uF.value) * .1;
      o.core.rotation.y = T * (1 + L * 3); o.core.scale.setScalar(1 + L * .5 * (.6 + .4 * Math.sin(T * 20)));
      o.ring.rotation.z = T * .4 + i; o.ring2.rotation.x = T * .3 + i;
      o.mouth.forEach((b, k) => { b.scale.y = .4 + L * Math.abs(Math.sin(T * 14 + k * 1.3 + i)) * 4.5 * (1 - Math.abs(k - 3) / 4.5); });
      o.blink -= dt; const bl = o.blink < .12 ? .15 : 1; if (o.blink < 0) o.blink = 2 + Math.random() * 4; o.eyes.forEach(e => e.scale.y = bl);
      tmp.copy(camera.position); holo.worldToLocal(tmp); o.face.parent.lookAt(camera.position);
      o.pad.material.opacity = .35 + L * .6;
    });
    const k = orbs[4].g; handCard.visible = true;
    const hs = handCard.scale.x + ((hand ? 1 : 0) - handCard.scale.x) * .12; handCard.scale.setScalar(Math.max(.001, hs));
    handCard.position.set(k.position.x - .2, k.position.y + .95 + Math.sin(T * 2) * .05, k.position.z); handCard.lookAt(camera.position);
    for (let j = packets.length - 1; j >= 0; j--) {
      const p = packets[j]; p.t += dt / p.dur; const tt = Math.min(1, p.t);
      pktPos(p, tt, p.m.position);
      const pts = p.trail.geometry.attributes.position; for (let q = 0; q < 24; q++) { pktPos(p, Math.max(0, tt - q * .012), tmp); pts.setXYZ(q, tmp.x, tmp.y, tmp.z); } pts.needsUpdate = true;
      if (p.t > 1.25) { holo.remove(p.m, p.trail); p.trail.geometry.dispose(); packets.splice(j, 1); if (target[p.b] < .5 && performance.now() > demoUntil) { target[p.b] = 1; setTimeout(() => target[p.b] = 0, 900); } }
    }
  }
  if (office.visible) {
    const h = (9 + T / 32 * 24) % 24, d = dayAt(h);
    const sa = (h - 6) / 12 * Math.PI;
    sun.position.set(Math.cos(sa) * -12, Math.max(.5, Math.sin(sa) * 14), 6); sun.color.copy(d.c); sun.intensity = d.k;
    ohemi.intensity = d.hk;
    const night = Math.max(0, 1 - d.k / 1.2);
    winM.color.copy(winNight).lerp(winDay, 1 - night); if (h > 17 && h < 20 || h > 5 && h < 7.5) winM.color.lerp(winDusk, .5);
    lampsO.forEach(l => l.intensity = night * 2.2);
    scrMats.forEach((m, i) => m.color.copy(col(AG[i].c)).multiplyScalar(.8 + night * 1.6));
    scene.background.copy(BG).lerp(col('#0a0f1e'), segF > 6.5 ? night * .5 : 0);
    const hh = Math.floor(h), mm = Math.floor((h - hh) * 60 / 15) * 15;
    const cl = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    if (cl !== lastClock) { lastClock = cl; emit('vo:clock', { t: cl, label: h < 6 ? 'Night shift' : h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : h < 21 ? 'Evening' : 'Night shift' }); }
    walkers.forEach((w, i) => {
      if (w.t < 1) { w.t = Math.min(1, w.t + dt / (w.from.distanceTo(w.to) / .9)); w.g.position.lerpVectors(w.from, w.to, ease(w.t)); w.g.position.y = Math.abs(Math.sin(w.t * 30)) * .05; w.g.lookAt(w.to.x + O.x, O.y, w.to.z + O.z); }
      else if ((w.wait -= dt) < 0 && !RM) { w.from.copy(w.g.position); w.from.y = 0; w.to.copy(Math.random() < .5 ? spots[w.home] : spots[(Math.random() * spots.length) | 0]); w.t = 0; w.wait = 2 + Math.random() * 4; }
      w.halo.material.color.copy(col(AG[i].c)).multiplyScalar(2 + level[i] * 3);
    });
  }
  composer.render();
  if (MOBILE && !RM) { requestAnimationFrame(() => requestAnimationFrame(tick)); } else if (!RM) requestAnimationFrame(tick);
};
if (RM) joinTick(0); drawS1(); drawS2(0);
tick();
canvas.classList.add('on');
document.documentElement.classList.add('gl-on');
if (RM) { const re = () => requestAnimationFrame(tick); addEventListener('scroll', re, { passive: true }); addEventListener('resize', re); setInterval(re, 1000); }
document.addEventListener('visibilitychange', () => { clock.getDelta(); });
window.__vo = { renderer, scene, camera };
