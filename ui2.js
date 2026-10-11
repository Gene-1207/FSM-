
// ===== GAME =====
const SHIFT = 180, STAR_AT = [500, 1000, 1600];
const NAMES = ['North', 'East', 'South', 'West'], ARROW = ['↓', '←', '↑', '→'];
const $ = id => document.getElementById(id);
const fmt = t => { t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
let mode = 'idle', timeLeft = SHIFT, paused = false, speed = 1, selType = 'car', hover = -1, acc = 0, last = 0, burstCd = 0, demoT = 0, demoAmb = 8;
let best = 0; try { best = +localStorage.getItem('junction-keeper-best') || 0; } catch (e) {}
const fx = [];
sim = createSim();

// --- dispatch deck
const typeBtns = {}, roadBtns = [];
for (const [k, name] of [['car', 'Car'], ['bus', 'Bus'], ['amb', 'Ambulance']]) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'btn type'; b.setAttribute('aria-pressed', k === selType);
  b.innerHTML = `<img alt="" src="${SPRITE_URI[k]}"><span><strong>${name}</strong><small>${TYPES[k].cost} energy &middot; ${TYPES[k].pts} pts</small></span>`;
  b.addEventListener('click', () => pickType(k));
  $('types').appendChild(b); typeBtns[k] = b;
}
for (let d = 0; d < 4; d++) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'btn road';
  b.innerHTML = `<strong>${ARROW[d]} ${NAMES[d]}</strong><small id="rc${d}">0 on road</small>`;
  b.setAttribute('aria-label', 'Send from the ' + NAMES[d].toLowerCase() + ' road');
  b.addEventListener('click', () => send(d));
  $('roads').appendChild(b); roadBtns.push(b);
}
for (let i = 0; i < 10; i++) $('sEnergy').appendChild(document.createElement('i'));
function pickType(k) { selType = k; for (const t in typeBtns) typeBtns[t].setAttribute('aria-pressed', t === k); }
let toastT = 0;
function toast(m) { $('toast').textContent = m; toastT = 2; }
function playing() { return mode === 'shift' || mode === 'free'; }
function send(d) {
  if (!playing() || paused) return;
  const r = sim.dispatch(d, selType);
  toast(r.ok ? 'Sent a ' + { car: 'car', bus: 'bus', amb: 'ambulance' }[selType] + ' from the ' + NAMES[d].toLowerCase() : r.reason);
}

// --- controller diagram
const NODES = [
  { id: 'NS_GREEN', x: 110, y: 46, w: 78, k: 'g', a: 'N–S', b: 'green' }, { id: 'NS_YELLOW', x: 250, y: 46, w: 78, k: 'y', a: 'N–S', b: 'yellow' },
  { id: 'ALL_RED_A', x: 322, y: 130, w: 72, k: 'r', a: 'All red', b: 'clear box' }, { id: 'EW_GREEN', x: 250, y: 214, w: 78, k: 'g', a: 'E–W', b: 'green' },
  { id: 'EW_YELLOW', x: 110, y: 214, w: 78, k: 'y', a: 'E–W', b: 'yellow' }, { id: 'ALL_RED_B', x: 38, y: 130, w: 72, k: 'r', a: 'All red', b: 'clear box' },
  { id: 'PRIORITY_NS', x: 180, y: 98, w: 96, k: 'p', a: 'Priority N–S', b: 'ambulance' }, { id: 'PRIORITY_EW', x: 180, y: 162, w: 96, k: 'p', a: 'Priority E–W', b: 'ambulance' }
];
const NH = 32, byId = Object.fromEntries(NODES.map(n => [n.id, n]));
const EDGES = [['NS_GREEN', 'NS_YELLOW'], ['NS_YELLOW', 'ALL_RED_A'], ['ALL_RED_A', 'EW_GREEN'], ['EW_GREEN', 'EW_YELLOW'], ['EW_YELLOW', 'ALL_RED_B'], ['ALL_RED_B', 'NS_GREEN'],
  ['NS_GREEN', 'PRIORITY_NS', 1], ['PRIORITY_NS', 'NS_YELLOW', 1], ['EW_GREEN', 'PRIORITY_EW', 1], ['PRIORITY_EW', 'EW_YELLOW', 1]];
function clip(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, t = Math.min((a.w / 2 + 2) / Math.abs(dx || 1e-9), (NH / 2 + 2) / Math.abs(dy || 1e-9));
  return [a.x + dx * t, a.y + dy * t];
}
(function buildFsm() {
  let h = `<defs><marker id="ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="var(--muted)"/></marker>
<marker id="arp" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="var(--prio)"/></marker></defs>`;
  for (const [f, t, p] of EDGES) {
    const a = byId[f], b = byId[t], [x1, y1] = clip(a, b), [x2, y2] = clip(b, a);
    h += `<path class="e${p ? ' p' : ''}" d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}" marker-end="url(#${p ? 'arp' : 'ar'})"/>`;
  }
  for (const n of NODES)
    h += `<g class="n ${n.k}" id="n-${n.id}"><rect x="${n.x - n.w / 2}" y="${n.y - NH / 2}" width="${n.w}" height="${NH}" rx="6"/><text x="${n.x}" y="${n.y - 2}">${n.a}</text><text class="sub" x="${n.x}" y="${n.y + 10}">${n.b}</text></g>`;
  $('fsm').innerHTML = h;
})();
let shownState = '', shownLog = -1;
function updateFsm() {
  if (sim.state !== shownState) {
    if (shownState) $('n-' + shownState).classList.remove('on');
    $('n-' + sim.state).classList.add('on'); shownState = sim.state;
    $('lN').className = SIGS[sim.state][0]; $('lE').className = SIGS[sim.state][1];
  }
  $('stName').textContent = LABEL[sim.state] + ' · ' + (sim.t - sim.since).toFixed(1) + ' s';
  $('stWhy').textContent = sim.reason;
  const key = sim.log.length ? sim.log[0].t : -1;
  if (key !== shownLog) {
    shownLog = key;
    const rows = sim.log.slice(0, 6).map(e => `<li><time>${fmt(e.t - 0.999)}</time><span><b>${LABEL[e.from]}</b> → <b>${LABEL[e.to]}</b><br><span style="color:var(--muted)">${e.why}</span></span></li>`);
    $('log').innerHTML = rows.length ? rows.join('') : '<li><span class="empty">No changes yet.</span></li>';
  }
}

// --- overlay screens
function showStart() {
  $('overlay').hidden = false;
  $('overlay').innerHTML = `<div class="sheet"><h2>Keep the junction moving</h2>
<p>You choose which vehicles enter and from where. The controller keeps them from colliding. Your job is flow.</p>
<ul><li>Pick a vehicle, then tap a road. Each costs dispatch energy, which refills over time.</li>
<li>Send an ambulance and watch the controller cut the green early to clear its path.</li>
<li>Vehicles that wait under 6 seconds build a flow bonus up to &times;3. Waiting past 12 seconds costs points.</li></ul>
<div class="row"><button class="btn primary" id="oShift" type="button">Start 3-minute shift</button><button class="btn" id="oFree" type="button">Free play</button></div>
<p class="hint">Best score: ${best}</p></div>`;
  $('oShift').onclick = () => start('shift'); $('oFree').onclick = () => start('free'); $('oShift').focus({ preventScroll: true });
}
function showResults() {
  const st = sim.stats, stars = STAR_AT.filter(s => st.score >= s).length;
  let isBest = false;
  if (st.score > best) { best = st.score; isBest = true; try { localStorage.setItem('junction-keeper-best', String(best)); } catch (e) {} }
  const avg = st.cleared ? (st.waitSum / st.cleared).toFixed(1) : '0.0';
  $('overlay').hidden = false;
  $('overlay').innerHTML = `<div class="sheet"><h2>Shift complete</h2>
<div class="stars" aria-label="${stars} of 3 stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
<div class="res"><div class="stat"><span class="label">Score</span><b>${st.score}</b></div><div class="stat"><span class="label">Vehicles cleared</span><b>${st.cleared}</b></div>
<div class="stat"><span class="label">Ambulances</span><b>${st.ambCleared}</b></div><div class="stat"><span class="label">Average wait</span><b>${avg} s</b></div>
<div class="stat"><span class="label">Collisions</span><b>${st.collisions}</b></div><div class="stat"><span class="label">Best</span><b>${best}</b></div></div>
<p class="hint">${isBest ? 'New best score. ' : ''}Stars at ${STAR_AT.join(', ')} points.</p>
<div class="row"><button class="btn primary" id="oAgain" type="button">Play again</button><button class="btn" id="oFree" type="button">Free play</button></div></div>`;
  $('oAgain').onclick = () => start('shift'); $('oFree').onclick = () => start('free'); $('oAgain').focus({ preventScroll: true });
}
function start(m) {
  sim = createSim(); mode = m; timeLeft = SHIFT; paused = false; acc = 0; burstCd = 0; fx.length = 0;
  shownState = ''; shownLog = -1; clearOn();
  $('overlay').hidden = true; $('bPause').textContent = 'Pause'; $('sTimeL').textContent = m === 'shift' ? 'Shift' : 'Elapsed';
  cv.focus({ preventScroll: true });
}
function clearOn() { document.querySelectorAll('#fsm .n.on').forEach(n => n.classList.remove('on')); }
function toIdle() { sim = createSim(); mode = 'idle'; shownState = ''; shownLog = -1; clearOn(); fx.length = 0; showStart(); }

// --- controls
$('bPause').onclick = togglePause;
function togglePause() { if (!playing()) return; paused = !paused; $('bPause').textContent = paused ? 'Resume' : 'Pause'; toast(paused ? 'Paused' : ''); }
$('bSpeed').onclick = () => { speed = speed === 1 ? 2 : speed === 2 ? 3 : 1; $('bSpeed').innerHTML = 'Speed &times;' + speed; };
$('bReset').onclick = toIdle;
$('bBurst').onclick = () => {
  if (!playing() || paused) return;
  if (burstCd > 0) { toast('Rush burst ready in ' + Math.ceil(burstCd) + ' s'); return; }
  for (let i = 0; i < 4; i++) sim.dispatch(Math.floor(Math.random() * 4), Math.random() < 0.2 ? 'bus' : 'car', true);
  burstCd = 15; toast('Rush burst: 4 vehicles on the way');
};
function dirAt(ev) {
  const r = cv.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * W - C, y = (ev.clientY - r.top) / r.height * W - C;
  return Math.abs(y) >= Math.abs(x) ? (y < 0 ? 0 : 2) : (x > 0 ? 1 : 3);
}
cv.addEventListener('pointermove', e => { hover = dirAt(e); });
cv.addEventListener('pointerleave', () => { hover = -1; });
cv.addEventListener('pointerdown', e => { hover = dirAt(e); send(hover); });
window.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const m = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 };
  if (e.key in m) { if (playing()) { e.preventDefault(); send(m[e.key]); } }
  else if (e.key === '1') pickType('car'); else if (e.key === '2') pickType('bus'); else if (e.key === '3') pickType('amb');
  else if (e.key === 'p' || e.key === 'P') togglePause();
});

// --- banner + HUD
let bannerKey = '';
function updateBanner() {
  const ev = sim.emg, el = $('banner');
  let key = '';
  if (ev) key = ev.dir + (sim.state.startsWith('PRIORITY') ? 'p' : 'w');
  if (key === bannerKey) return;
  bannerKey = key;
  if (!ev) { el.hidden = true; return; }
  const road = NAMES[ev.dir].toLowerCase(), pr = sim.state.startsWith('PRIORITY');
  el.hidden = false;
  el.innerHTML = `<img alt="" src="${SPRITE_URI.amb}"><span>${pr ? `Ambulance on the ${road} road has priority. Its road stays green until it clears.` : `Ambulance coming from the ${road}. The controller is clearing the junction for it.`}</span>`;
}
let hudKey = '';
function updateHud() {
  const st = mode === 'idle' ? { score: 0, mult: 1, collisions: 0 } : sim.stats;
  $('sScore').textContent = st.score; $('sCol').textContent = st.collisions;
  $('sFlow').innerHTML = '&times;' + (st.mult % 1 ? st.mult.toFixed(1) : st.mult);
  $('sTime').textContent = mode === 'shift' ? fmt(timeLeft) : mode === 'free' ? fmt(sim.t) : fmt(SHIFT);
  const pips = $('sEnergy').children;
  for (let i = 0; i < 10; i++) pips[i].style.opacity = (0.15 + 0.85 * Math.max(0, Math.min(1, sim.tokens - i))).toFixed(2);
  for (const k in typeBtns) typeBtns[k].classList.toggle('low', sim.tokens < TYPES[k].cost);
  for (let d = 0; d < 4; d++) {
    const n = sim.vehicles.filter(v => v.dir === d).length + sim.pending[d].length;
    const t = n + (n === 1 ? ' on road' : ' on road');
    const el = $('rc' + d); if (el.textContent !== t) el.textContent = t;
  }
}

// --- main loop
function consumeEvents() {
  for (const e of sim.events.splice(0)) {
    if (mode === 'idle') continue;
    if (e.kind === 'score') fx.push({ x: e.x, y: e.y, text: '+' + e.pts, c: e.type === 'amb' ? pal.prio : pal.go, t: 0 });
    else if (e.kind === 'honk') fx.push({ x: e.x, y: e.y, text: 'honk −5', c: pal.stop, t: 0 });
    else if (e.kind === 'collision') toast('Collision!');
  }
}
function demoTick(dt) {
  demoT -= dt; demoAmb -= dt;
  if (demoT <= 0) { demoT = 0.9 + Math.random() * 1.2; sim.dispatch(Math.floor(Math.random() * 4), Math.random() < 0.15 ? 'bus' : 'car', true); }
  if (demoAmb <= 0) { demoAmb = 16; sim.dispatch(Math.floor(Math.random() * 4), 'amb', true); }
}
let palT = 0;
function frame(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
  if (palT-- <= 0) { readPal(); palT = 60; }
  const run = mode === 'idle' || (playing() && !paused);
  if (run) {
    acc += dt * (mode === 'idle' ? 1 : speed);
    let n = 0;
    while (acc >= 1 / 60 && n++ < 12) {
      if (mode === 'idle') demoTick(1 / 60);
      sim.step(1 / 60); acc -= 1 / 60;
      if (mode === 'shift') { timeLeft -= 1 / 60; if (timeLeft <= 0) { timeLeft = 0; mode = 'over'; consumeEvents(); showResults(); break; } }
      if (burstCd > 0) burstCd -= 1 / 60;
    }
    consumeEvents();
  }
  for (let i = fx.length - 1; i >= 0; i--) { fx[i].t += dt; if (fx[i].t > 1.4) fx.splice(i, 1); }
  if (toastT > 0 && (toastT -= dt) <= 0) $('toast').textContent = '';
  render(playing() ? hover : -1, selType, fx);
  updateFsm(); updateBanner(); updateHud();
  requestAnimationFrame(frame);
}
new ResizeObserver(resizeCanvas).observe(cv);
readPal(); resizeCanvas(); showStart();
requestAnimationFrame(frame);
