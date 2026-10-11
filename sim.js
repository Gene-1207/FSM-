// ===== SIM-BEGIN =====
const W = 720, C = 360, HALF = 44, LANE = 22;
const STOP_S = C - HALF - 26, BOX_IN = C - HALF, BOX_OUT = C + HALF;
const MINGAP = 8, A_MAX = 300, A_STOP = 140, A_FOLLOW = 220;
const TYPES = {
  car: { len: 38, w: 20, vmax: 100, acc: 130, cost: 1, pts: 10 },
  bus: { len: 74, w: 24, vmax: 78, acc: 90, cost: 2, pts: 25 },
  amb: { len: 46, w: 22, vmax: 155, acc: 200, cost: 3, pts: 60 }
};
const P = { MIN_GREEN: 5, MAX_GREEN: 14, YELLOW: 1.4, ALL_RED: 0.7, EMG_MIN: 1.0, EMG_HOLD: 1.0 };
const SIGS = {
  NS_GREEN: ['G', 'R'], NS_YELLOW: ['Y', 'R'], ALL_RED_A: ['R', 'R'],
  EW_GREEN: ['R', 'G'], EW_YELLOW: ['R', 'Y'], ALL_RED_B: ['R', 'R'],
  PRIORITY_NS: ['G', 'R'], PRIORITY_EW: ['R', 'G']
};
const LABEL = {
  NS_GREEN: 'N–S green', NS_YELLOW: 'N–S yellow', ALL_RED_A: 'All red',
  EW_GREEN: 'E–W green', EW_YELLOW: 'E–W yellow', ALL_RED_B: 'All red',
  PRIORITY_NS: 'Priority N–S', PRIORITY_EW: 'Priority E–W'
};
const ROAD = ['north', 'east', 'south', 'west'];

function vpos(v) {
  const sc = v.s - v.len / 2;
  switch (v.dir) {
    case 0: return { x: C + LANE, y: sc };
    case 1: return { x: W - sc, y: C + LANE };
    case 2: return { x: C - LANE, y: W - sc };
    default: return { x: sc, y: C - LANE };
  }
}

function createSim(rng) {
  rng = rng || Math.random;
  const s = {
    t: 0, state: 'NS_GREEN', since: 0, reason: 'Starting cycle',
    vehicles: [], pending: [[], [], [], []], log: [], events: [],
    tokens: 10, maxTokens: 10, regen: 1 / 1.2, nextId: 1,
    emg: null, act: [false, false], lastActive: [-99, -99], hit: new Set(),
    stats: { cleared: 0, score: 0, streak: 0, mult: 1, collisions: 0, waitSum: 0, ambCleared: 0, ambWaitSum: 0, ambMaxWait: 0 }
  };
  const sig = ax => SIGS[s.state][ax];
  const setState = (n, why) => {
    if (s.state === n) return;
    s.log.unshift({ t: s.t, from: s.state, to: n, why });
    if (s.log.length > 40) s.log.pop();
    s.state = n; s.since = s.t; s.reason = why;
  };

  function emergency() {
    let best = null; const act = [false, false];
    for (const v of s.vehicles) {
      if (v.type !== 'amb' || v.s - v.len >= BOX_OUT) continue;
      const ax = v.dir % 2; act[ax] = true;
      const dist = STOP_S - v.s;
      if (!best || dist < best.dist) best = { axis: ax, dir: v.dir, dist };
    }
    s.act = act;
    if (act[0]) s.lastActive[0] = s.t;
    if (act[1]) s.lastActive[1] = s.t;
    return best;
  }
  const occupied = () => s.vehicles.some(v => (v.s > STOP_S || v.committed) && v.s - v.len < BOX_OUT);
  const queued = ax => s.vehicles.some(v => v.dir % 2 === ax && v.s <= STOP_S && v.s >= STOP_S - 170 && v.v < 20 && !v.committed);
  const arriving = ax => s.vehicles.some(v => v.dir % 2 === ax && v.s <= STOP_S && v.s >= STOP_S - 110 && v.v >= 20);
  s.occupied = occupied;

  function fsm() {
    const age = s.t - s.since, ev = s.emg;
    const from = ev ? ROAD[ev.dir] : '';
    const pri = ax => ax === 0 ? 'PRIORITY_NS' : 'PRIORITY_EW';
    switch (s.state) {
      case 'NS_GREEN':
        if (ev && ev.axis === 0) setState('PRIORITY_NS', 'Ambulance on the ' + from + ' road: holding green');
        else if (ev && age >= P.EMG_MIN) setState('NS_YELLOW', 'Ambulance approaching from the ' + from + ': ending green early');
        else if (!ev && queued(1) && ((age >= P.MIN_GREEN && !arriving(0)) || age >= P.MAX_GREEN))
          setState('NS_YELLOW', age >= P.MAX_GREEN ? 'Max green reached, E–W waiting' : 'N–S flow gap, E–W waiting');
        break;
      case 'NS_YELLOW': if (age >= P.YELLOW) setState('ALL_RED_A', 'Yellow done: clearing the junction'); break;
      case 'ALL_RED_A':
        if (age >= P.ALL_RED && !occupied()) {
          if (ev) setState(pri(ev.axis), 'Junction empty: green for the ambulance on the ' + from + ' road');
          else setState('EW_GREEN', 'Junction empty: E–W turn');
        } break;
      case 'EW_GREEN':
        if (ev && ev.axis === 1) setState('PRIORITY_EW', 'Ambulance on the ' + from + ' road: holding green');
        else if (ev && age >= P.EMG_MIN) setState('EW_YELLOW', 'Ambulance approaching from the ' + from + ': ending green early');
        else if (!ev && queued(0) && ((age >= P.MIN_GREEN && !arriving(1)) || age >= P.MAX_GREEN))
          setState('EW_YELLOW', age >= P.MAX_GREEN ? 'Max green reached, N–S waiting' : 'E–W flow gap, N–S waiting');
        break;
      case 'EW_YELLOW': if (age >= P.YELLOW) setState('ALL_RED_B', 'Yellow done: clearing the junction'); break;
      case 'ALL_RED_B':
        if (age >= P.ALL_RED && !occupied()) {
          if (ev) setState(pri(ev.axis), 'Junction empty: green for the ambulance on the ' + from + ' road');
          else setState('NS_GREEN', 'Junction empty: N–S turn');
        } break;
      case 'PRIORITY_NS':
        if (!s.act[0] && s.t - s.lastActive[0] >= P.EMG_HOLD) {
          if (ev) setState('NS_YELLOW', 'Ambulance cleared, another waiting on the ' + from + ' road');
          else { setState('NS_GREEN', 'Ambulance cleared: back to normal cycle'); s.since = s.t - P.MIN_GREEN; }
        } break;
      case 'PRIORITY_EW':
        if (!s.act[1] && s.t - s.lastActive[1] >= P.EMG_HOLD) {
          if (ev) setState('EW_YELLOW', 'Ambulance cleared, another waiting on the ' + from + ' road');
          else { setState('EW_GREEN', 'Ambulance cleared: back to normal cycle'); s.since = s.t - P.MIN_GREEN; }
        } break;
    }
  }

  function trySpawn(d) {
    const q = s.pending[d]; if (!q.length) return;
    const type = q[0], T = TYPES[type], startS = type === 'amb' ? -90 : 0;
    if (s.vehicles.some(v => v.dir === d && v.s - v.len < startS + MINGAP + 4)) return;
    q.shift();
    s.vehicles.push({ id: s.nextId++, dir: d, type, s: startS, v: T.vmax * 0.7, len: T.len, w: T.w, vmax: T.vmax, acc: T.acc,
      committed: false, wait: 0, honked: false, color: Math.floor(rng() * 8) });
  }

  function award(v) {
    const T = TYPES[v.type], st = s.stats;
    st.cleared++; st.waitSum += v.wait;
    if (v.wait < 6) st.streak++; else st.streak = 0;
    st.mult = 1 + Math.min(2, Math.floor(st.streak / 4) * 0.5);
    let bonus = 0;
    if (v.type === 'amb') { bonus = Math.max(0, 100 - 25 * v.wait); st.ambCleared++; st.ambWaitSum += v.wait; st.ambMaxWait = Math.max(st.ambMaxWait, v.wait); }
    const pts = Math.round((T.pts * Math.max(0.3, 1 - v.wait / 25) + bonus) * st.mult);
    st.score += pts;
    const p = vpos(v);
    s.events.push({ kind: 'score', pts, type: v.type, x: Math.max(24, Math.min(W - 24, p.x)), y: Math.max(24, Math.min(W - 24, p.y)) });
  }

  function move(dt) {
    for (let d = 0; d < 4; d++) {
      const list = s.vehicles.filter(v => v.dir === d).sort((a, b) => b.s - a.s);
      const sg = sig(d % 2);
      for (let i = 0; i < list.length; i++) {
        const v = list[i], lead = list[i - 1];
        let limit = Infinity, cap = v.vmax;
        if (lead) {
          limit = lead.s - lead.len - MINGAP;
          cap = Math.min(cap, Math.sqrt(2 * A_FOLLOW * Math.max(0, limit - v.s)));
        }
        if (!v.committed && v.s <= STOP_S && sg !== 'G') {
          const gap = STOP_S - 0.5 - v.s;
          if (gap < v.v * v.v / (2 * A_MAX) - 0.6) v.committed = true;
          else { limit = Math.min(limit, STOP_S - 0.5); cap = Math.min(cap, Math.sqrt(2 * A_STOP * Math.max(0, gap))); }
        }
        let nv = Math.min(v.v + v.acc * dt, v.vmax);
        if (nv > cap) nv = Math.max(cap, v.v - A_MAX * dt);
        let ns = v.s + nv * dt;
        if (ns > limit) { ns = Math.max(v.s, limit); nv = (ns - v.s) / dt; }
        v.v = nv; v.s = ns;
        if (v.v < 8 && v.s > 0 && v.s < BOX_IN) v.wait += dt;
        if (v.wait > 12 && !v.honked) {
          v.honked = true; s.stats.streak = 0; s.stats.score = Math.max(0, s.stats.score - 5);
          const p = vpos(v); s.events.push({ kind: 'honk', x: p.x, y: p.y });
        }
      }
    }
    for (let i = s.vehicles.length - 1; i >= 0; i--) {
      const v = s.vehicles[i];
      if (v.s - v.len > W + 4) { award(v); s.vehicles.splice(i, 1); }
    }
  }

  function collisions() {
    const vs = s.vehicles;
    for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) {
      const a = vs[i], b = vs[j]; let hit = false;
      if (a.dir === b.dir) {
        const lead = a.s > b.s ? a : b, f = a.s > b.s ? b : a;
        hit = f.s > lead.s - lead.len;
      } else {
        const pa = vpos(a), pb = vpos(b);
        const ha = a.dir % 2 === 0 ? [a.w / 2, a.len / 2] : [a.len / 2, a.w / 2];
        const hb = b.dir % 2 === 0 ? [b.w / 2, b.len / 2] : [b.len / 2, b.w / 2];
        hit = Math.abs(pa.x - pb.x) < ha[0] + hb[0] - 0.5 && Math.abs(pa.y - pb.y) < ha[1] + hb[1] - 0.5;
      }
      if (hit) {
        const key = Math.min(a.id, b.id) + '-' + Math.max(a.id, b.id);
        if (!s.hit.has(key)) { s.hit.add(key); s.stats.collisions++; s.events.push({ kind: 'collision' }); }
      }
    }
  }

  s.step = function (dt) {
    s.t += dt;
    s.tokens = Math.min(s.maxTokens, s.tokens + s.regen * dt);
    for (let d = 0; d < 4; d++) trySpawn(d);
    s.emg = emergency();
    fsm();
    move(dt);
    collisions();
  };
  s.dispatch = function (d, type, free) {
    const T = TYPES[type];
    if (!T) return { ok: false, reason: 'Unknown vehicle' };
    if (s.pending[d].length >= 3) return { ok: false, reason: 'That road entrance is full' };
    if (!free && s.tokens < T.cost - 1e-9) return { ok: false, reason: 'Not enough dispatch energy' };
    if (!free) s.tokens -= T.cost;
    s.pending[d].push(type);
    return { ok: true };
  };
  return s;
}
// ===== SIM-END =====
