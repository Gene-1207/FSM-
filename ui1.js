
// ===== SPRITES =====
const uri = s => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
const STROKE = 'rgba(0,0,0,.45)';
function carSVG(c) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 50">
<rect x="46" y="1" width="9" height="5" rx="2" fill="${c}" stroke="${STROKE}" stroke-width="1.5"/><rect x="46" y="44" width="9" height="5" rx="2" fill="${c}" stroke="${STROKE}" stroke-width="1.5"/>
<rect x="1.5" y="5" width="93" height="40" rx="13" fill="${c}" stroke="${STROKE}" stroke-width="2"/>
<path d="M60 10 Q70 12 76 15 L76 35 Q70 38 60 40 Z" fill="#14202a"/>
<path d="M22 11 L28 10 L28 40 L22 39 Z" fill="#14202a" opacity=".9"/>
<rect x="28" y="10" width="32" height="30" rx="5" fill="#fff" opacity=".28"/>
<rect x="88" y="9" width="6" height="10" rx="2.5" fill="#fff4b3"/><rect x="88" y="31" width="6" height="10" rx="2.5" fill="#fff4b3"/>
<rect x="2" y="9" width="5" height="10" rx="2" fill="#ff4747"/><rect x="2" y="31" width="5" height="10" rx="2" fill="#ff4747"/></svg>`;
}
const busSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 52">
<rect x="1.5" y="4" width="157" height="44" rx="9" fill="#f1f4f6" stroke="${STROKE}" stroke-width="2"/>
<rect x="1.5" y="19" width="157" height="14" fill="#1259a8"/>
<g fill="#c3ccd2"><rect x="20" y="8" width="18" height="8" rx="2"/><rect x="48" y="8" width="18" height="8" rx="2"/><rect x="76" y="8" width="18" height="8" rx="2"/><rect x="104" y="8" width="18" height="8" rx="2"/>
<rect x="20" y="36" width="18" height="8" rx="2"/><rect x="48" y="36" width="18" height="8" rx="2"/><rect x="76" y="36" width="18" height="8" rx="2"/><rect x="104" y="36" width="18" height="8" rx="2"/></g>
<path d="M138 8 Q148 10 154 13 L154 39 Q148 42 138 44 Z" fill="#14202a"/>
<rect x="153" y="7" width="5" height="8" rx="2" fill="#fff4b3"/><rect x="153" y="37" width="5" height="8" rx="2" fill="#fff4b3"/>
<rect x="2" y="7" width="5" height="8" rx="2" fill="#ff4747"/><rect x="2" y="37" width="5" height="8" rx="2" fill="#ff4747"/></svg>`;
const ambSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 48">
<rect x="1.5" y="4" width="97" height="40" rx="10" fill="#fbfbfb" stroke="${STROKE}" stroke-width="2"/>
<rect x="3" y="7" width="94" height="4" fill="#d9262c"/><rect x="3" y="37" width="94" height="4" fill="#d9262c"/>
<path d="M70 12 Q80 14 86 17 L86 31 Q80 34 70 36 Z" fill="#14202a"/>
<rect x="45" y="13" width="8" height="22" fill="#d9262c"/><rect x="38" y="20" width="22" height="8" fill="#d9262c"/>
<rect x="63" y="12" width="5" height="10" fill="#e23b3b"/><rect x="63" y="26" width="5" height="10" fill="#2f6fe0"/>
<rect x="92" y="9" width="5" height="8" rx="2" fill="#fff4b3"/><rect x="92" y="31" width="5" height="8" rx="2" fill="#fff4b3"/>
<rect x="2" y="9" width="4" height="8" rx="2" fill="#ff4747"/><rect x="2" y="31" width="4" height="8" rx="2" fill="#ff4747"/></svg>`;
const CAR_COLORS = ['#d64545', '#2f6fe0', '#f0b429', '#2d9d6a', '#7a5bd0', '#e8e8e2', '#1f2a33', '#e07b39'];
const SPRITE_URI = { car: uri(carSVG(CAR_COLORS[0])), bus: uri(busSVG), amb: uri(ambSVG) };
const mk = u => { const i = new Image(); i.src = u; return i; };
const IMG = { car: CAR_COLORS.map(c => mk(uri(carSVG(c)))), bus: mk(SPRITE_URI.bus), amb: mk(SPRITE_URI.amb) };
const ready = i => i && i.complete && i.naturalWidth > 0;

// ===== CANVAS =====
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
let K = 1, pal = {};
function readPal() {
  const cs = getComputedStyle(document.documentElement);
  for (const k of ['grass', 'block', 'asphalt', 'curb', 'lane', 'yellowline', 'go', 'warn', 'stop', 'ink', 'muted', 'accent', 'accent-ink', 'prio'])
    pal[k] = cs.getPropertyValue('--' + k).trim();
}
function resizeCanvas() {
  const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = cv.height = Math.max(200, Math.round(r.width * dpr));
  K = cv.width / W;
}
const rr = (x, y, w, h, r) => { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); };

// fixed scenery so the corners look lived in
const TREES = [[60, 70, 15], [150, 40, 11], [90, 190, 13], [250, 120, 12], [640, 60, 14], [560, 150, 11], [670, 230, 13], [50, 600, 14], [150, 660, 11],
  [230, 560, 12], [650, 620, 14], [570, 680, 11], [690, 520, 12]];
const ROOFS = [[28, 100, 70, 46], [180, 70, 64, 52], [470, 28, 80, 50], [606, 110, 70, 56], [30, 440, 76, 52], [190, 470, 64, 60], [470, 470, 74, 56], [604, 440, 72, 60]];

function drawScene() {
  ctx.fillStyle = pal.grass; ctx.fillRect(0, 0, W, W);
  const corners = [[0, 0], [BOX_OUT + 14, 0], [0, BOX_OUT + 14], [BOX_OUT + 14, BOX_OUT + 14]], cs = C - HALF - 14;
  for (const [x, y] of corners) { ctx.fillStyle = pal.block; rr(x, y, cs + 0, cs + 0, 6); ctx.fill(); }
  for (const [x, y, w, h] of ROOFS) { ctx.fillStyle = 'rgba(0,0,0,.16)'; rr(x + 3, y + 4, w, h, 3); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.22)'; rr(x, y, w, h, 3); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1.5; ctx.stroke(); }
  for (const [x, y, r] of TREES) { ctx.fillStyle = 'rgba(10,50,25,.30)'; ctx.beginPath(); ctx.arc(x + 2, y + 3, r, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(40,120,60,.55)'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
  ctx.fillStyle = pal.asphalt; ctx.fillRect(C - HALF, 0, 2 * HALF, W); ctx.fillRect(0, C - HALF, W, 2 * HALF);
  ctx.strokeStyle = pal.curb; ctx.lineWidth = 3;
  for (const x of [C - HALF, C + HALF]) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, C - HALF); ctx.moveTo(x, C + HALF); ctx.lineTo(x, W); ctx.stroke(); }
  for (const y of [C - HALF, C + HALF]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(C - HALF, y); ctx.moveTo(C + HALF, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.strokeStyle = pal.yellowline; ctx.lineWidth = 2;
  const e = STOP_S - 2;
  for (const o of [-2, 2]) {
    ctx.beginPath(); ctx.moveTo(C + o, 0); ctx.lineTo(C + o, e); ctx.moveTo(C + o, W - e); ctx.lineTo(C + o, W);
    ctx.moveTo(0, C + o); ctx.lineTo(e, C + o); ctx.moveTo(W - e, C + o); ctx.lineTo(W, C + o); ctx.stroke();
  }
  ctx.fillStyle = pal.lane; ctx.globalAlpha = .85;
  for (let o = C - HALF + 4; o < C + HALF - 6; o += 14) {
    ctx.fillRect(o, STOP_S + 4, 8, 18); ctx.fillRect(o, W - STOP_S - 22, 8, 18);
    ctx.fillRect(STOP_S + 4, o, 18, 8); ctx.fillRect(W - STOP_S - 22, o, 18, 8);
  }
  ctx.globalAlpha = 1;
  ctx.fillRect(C, STOP_S - 4, HALF, 4); ctx.fillRect(C - HALF, W - STOP_S, HALF, 4);
  ctx.fillRect(W - STOP_S, C, 4, HALF); ctx.fillRect(STOP_S - 4, C - HALF, 4, HALF);
  // straight-ahead lane arrows
  ctx.fillStyle = pal.lane; ctx.globalAlpha = .5;
  for (let d = 0; d < 4; d++) {
    const p = vpos({ dir: d, s: 150 + 20, len: 40 });
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate([Math.PI / 2, Math.PI, -Math.PI / 2, 0][d]);
    ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(0, -9); ctx.lineTo(0, -3); ctx.lineTo(-14, -3); ctx.lineTo(-14, 3); ctx.lineTo(0, 3); ctx.lineTo(0, 9); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  ctx.globalAlpha = 1;
  // junction box outline, brighter while a vehicle is inside
  ctx.save(); ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.strokeStyle = sim.occupied() ? pal.warn : pal.lane; ctx.globalAlpha = sim.occupied() ? .9 : .28;
  ctx.strokeRect(BOX_IN, BOX_IN, 2 * HALF, 2 * HALF); ctx.restore();
}

const HEADS = [[411, 262, 0], [458, 411, 1], [309, 458, 0], [262, 309, 1]]; // x, y, horizontal?
function drawSignals() {
  for (let d = 0; d < 4; d++) {
    const [x, y, hz] = HEADS[d], st = SIGS[sim.state][d % 2];
    const lamps = ['R', 'Y', 'G'], cols = { R: pal.stop, Y: pal.warn, G: pal.go };
    const long = 38, thick = 14;
    ctx.fillStyle = '#10151a'; ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1;
    if (hz) rr(x - long / 2, y - thick / 2, long, thick, 4); else rr(x - thick / 2, y - long / 2, thick, long, 4);
    ctx.fill(); ctx.stroke();
    lamps.forEach((l, i) => {
      const o = (i - 1) * 11 * (hz && d === 1 ? -1 : 1);
      const lx = hz ? x + o : x, ly = hz ? y : y + o, on = l === st;
      ctx.save();
      if (on) { ctx.shadowColor = cols[l]; ctx.shadowBlur = 12; }
      ctx.fillStyle = on ? cols[l] : 'rgba(255,255,255,.1)'; ctx.beginPath(); ctx.arc(lx, ly, 4, 0, 7); ctx.fill(); ctx.restore();
    });
  }
}

function drawVehicle(v) {
  const p = vpos(v), ang = [Math.PI / 2, Math.PI, -Math.PI / 2, 0][v.dir];
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(ang);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; rr(-v.len / 2 + 1, -v.w / 2 + 2, v.len, v.w, 6); ctx.fill();
  const img = v.type === 'car' ? IMG.car[v.color % 8] : IMG[v.type];
  if (ready(img)) ctx.drawImage(img, -v.len / 2, -v.w / 2, v.len, v.w);
  else { ctx.fillStyle = v.type === 'amb' ? '#fff' : CAR_COLORS[v.color % 8]; rr(-v.len / 2, -v.w / 2, v.len, v.w, 6); ctx.fill(); }
  ctx.restore();
  if (v.type === 'amb') {
    const on = Math.floor(sim.t * 6) % 2 === 0, g = ctx.createRadialGradient(p.x, p.y, 3, p.x, p.y, 42);
    const c = on ? '226,59,59' : '47,111,224';
    g.addColorStop(0, `rgba(${c},.55)`); g.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 42, 0, 7); ctx.fill();
  }
  if (v.wait > 10) {
    ctx.fillStyle = pal.stop; ctx.beginPath(); ctx.arc(p.x, p.y - 24, 8, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '700 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', p.x, p.y - 23.5);
  }
}

const LABELS = ['N', 'E', 'S', 'W'], LABEL_POS = [[C + LANE, 22], [W - 22, C + LANE], [C - LANE, W - 22], [22, C - LANE]];
function laneRect(d, len) {
  return [[C, 0, HALF, len], [W - len, C, len, HALF], [C - HALF, W - len, HALF, len], [0, C - HALF, len, HALF]][d];
}
function drawOverlays(hover, selType, fx) {
  if (hover >= 0) {
    const [x, y, w, h] = laneRect(hover, 230);
    ctx.fillStyle = pal.accent; ctx.globalAlpha = .18; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1;
    ctx.strokeStyle = pal.accent; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.strokeRect(x + 1, y + 1, w - 2, h - 2); ctx.setLineDash([]);
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let d = 0; d < 4; d++) {
    const [x, y] = LABEL_POS[d];
    ctx.fillStyle = pal.accent; ctx.beginPath(); ctx.arc(x, y, 12, 0, 7); ctx.fill();
    ctx.fillStyle = pal['accent-ink']; ctx.font = '600 12px "IBM Plex Mono", monospace'; ctx.fillText(LABELS[d], x, y + 0.5);
    const n = sim.pending[d].length;
    if (n) { ctx.fillStyle = pal.ink; ctx.font = '600 12px "IBM Plex Mono", monospace'; ctx.fillText('+' + n, x + (d === 3 ? 26 : d === 1 ? -26 : 26), y + (d === 0 ? 0 : d === 2 ? 0 : 0)); }
  }
  for (const f of fx) {
    ctx.globalAlpha = Math.max(0, 1 - f.t / 1.4); ctx.fillStyle = f.c; ctx.font = '700 20px "Barlow Condensed", sans-serif';
    ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 3; ctx.strokeText(f.text, f.x, f.y - f.t * 30); ctx.fillText(f.text, f.x, f.y - f.t * 30);
  }
  ctx.globalAlpha = 1;
}

let sim = null;
function render(hover, selType, fx) {
  ctx.setTransform(K, 0, 0, K, 0, 0);
  drawScene(); drawSignals();
  const vs = sim.vehicles.slice().sort((a, b) => (a.type === 'amb') - (b.type === 'amb'));
  for (const v of vs) drawVehicle(v);
  drawOverlays(hover, selType, fx);
}
