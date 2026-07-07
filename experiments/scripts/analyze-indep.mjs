// Compare the independent-replicate run (raw-indep.json) against the original
// within-process run (raw.json): per-layer throughput, spreads, bootstrap 95% CIs,
// CV, and adjacent-pair significance on the now-independent samples. Read-only; used
// to decide whether the qualitative findings survive the stricter protocol before
// adopting the new numbers.
import { readFile } from 'node:fs/promises';
import { median, cv, mannWhitneyU, cliffsDelta } from '../bench/stats.mjs';

const indep = JSON.parse(await readFile('results/raw-indep.json', 'utf8'));
const orig = JSON.parse(await readFile('results/raw.json', 'utf8'));
const ORDER = ['pg', 'mysql2', 'knex', 'drizzle', 'prisma', 'sequelize', 'typeorm', 'objection', 'mikroorm'];
const get = (rows, a, ep, e) => rows.find((r) => r.adapter === a && r.endpoint === ep && r.engine === e);

// bootstrap 95% CI of the median
function bootCI(samples, B = 2000) {
  if (!samples || samples.length < 2) return [NaN, NaN];
  const meds = [];
  for (let b = 0; b < B; b++) {
    const s = Array.from({ length: samples.length }, () => samples[Math.floor(Math.random() * samples.length)]);
    meds.push(median(s));
  }
  meds.sort((x, y) => x - y);
  return [meds[Math.floor(0.025 * B)], meds[Math.floor(0.975 * B)]];
}

for (const [ep, engines] of [['deep_fetch', ['postgres', 'mysql']], ['point_read', ['postgres', 'mysql']], ['aggregation', ['postgres', 'mysql']], ['write', ['postgres', 'mysql']]]) {
  for (const e of engines) {
    const layers = ORDER.filter((a) => get(indep, a, ep, e));
    if (!layers.length) continue;
    const rows = layers.map((a) => {
      const i = get(indep, a, ep, e); const o = get(orig, a, ep, e);
      const [lo, hi] = bootCI(i.rps_samples);
      return { a, indep: i.rps, orig: o ? o.rps : NaN, lo: Math.round(lo), hi: Math.round(hi), cv: (cv(i.rps_samples) * 100).toFixed(1) };
    }).sort((x, y) => y.indep - x.indep);
    const spread = (rows[0].indep / rows[rows.length - 1].indep).toFixed(2);
    console.log(`\n== ${ep} / ${e} ==  spread ${spread}x (indep) vs ${(get(orig, rows[0].a, ep, e)?.rps / get(orig, rows[rows.length - 1].a, ep, e)?.rps || NaN).toFixed(2)}x (orig)`);
    for (const r of rows) console.log(`  ${r.a.padEnd(10)} indep ${String(r.indep).padStart(5)} [${r.lo}-${r.hi}] CV ${r.cv}%   orig ${r.orig}  Δ${(((r.indep - r.orig) / r.orig) * 100).toFixed(0)}%`);
  }
}

// adjacent-pair significance on independent deep_fetch/postgres samples
console.log('\n== deep_fetch/postgres adjacent-pair significance (independent samples) ==');
const dp = ORDER.filter((a) => get(indep, a, 'deep_fetch', 'postgres')).map((a) => ({ a, r: get(indep, a, 'deep_fetch', 'postgres') })).sort((x, y) => y.r.rps - x.r.rps);
for (let i = 0; i + 1 < dp.length; i++) {
  const A = dp[i].r.rps_samples, B = dp[i + 1].r.rps_samples;
  console.log(`  ${dp[i].a} > ${dp[i + 1].a}: ${dp[i].r.rps} vs ${dp[i + 1].r.rps}  p=${mannWhitneyU(A, B).p.toFixed(4)}  d=${cliffsDelta(A, B).toFixed(2)}`);
}

// global CV maxima
for (const e of ['postgres', 'mysql']) {
  let max = 0, at = '';
  for (const r of indep.filter((r) => r.engine === e && r.rps_samples)) { const v = cv(r.rps_samples) * 100; if (v > max) { max = v; at = `${r.adapter}/${r.endpoint}`; } }
  console.log(`\n${e} max CV (indep): ${max.toFixed(1)}% (${at})`);
}
