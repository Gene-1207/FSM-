const fs = require('fs');
const src = fs.readFileSync(__dirname + '/sim.js', 'utf8');
const { createSim } = new Function(src + '\nreturn { createSim };')();

function lcg(seed) { let x = seed; return () => (x = (x * 1664525 + 1013904223) % 4294967296) / 4294967296; }

let bad = 0;
for (const seed of [1, 7, 42, 99]) {
  const r = lcg(seed), sim = createSim(r);
  const dt = 1 / 60; let next = 0;
  const states = new Set();
  for (let i = 0; i < 60 * 900; i++) {
    if (sim.t >= next) {
      next = sim.t + 0.25 + r() * 0.5;
      const roll = r();
      sim.dispatch(Math.floor(r() * 4), roll < 0.08 ? 'amb' : roll < 0.25 ? 'bus' : 'car', true);
    }
    sim.step(dt); states.add(sim.state); sim.events.length = 0;
  }
  // drain
  for (let i = 0; i < 60 * 120; i++) { sim.step(dt); sim.events.length = 0; }
  const st = sim.stats;
  const ok = st.collisions === 0 && sim.vehicles.length === 0 && sim.pending.every(p => !p.length);
  if (!ok) bad++;
  console.log(`seed ${seed}: collisions=${st.collisions} cleared=${st.cleared} left=${sim.vehicles.length} score=${st.score}`
    + ` amb=${st.ambCleared} ambAvgWait=${(st.ambWaitSum / Math.max(1, st.ambCleared)).toFixed(2)}s ambMax=${st.ambMaxWait.toFixed(2)}s`
    + ` avgWait=${(st.waitSum / st.cleared).toFixed(2)}s states=${[...states].length}`);
}
console.log(bad ? 'FAIL' : 'PASS');
process.exit(bad ? 1 : 0);
