// Inferential analysis on the primary dataset (results/raw.json, 25 independent
// replicates), RESPECTING THE PAIRED/BLOCKED DESIGN (revision round 2, review
// 6.1/6.2/6.4/6.9/8). Within each replicate every layer runs the identical request
// stream, so layers are compared on per-replicate ratios, not as independent
// groups. Everything is seeded and deterministic.
//   (1) Paired TOST equivalence (a-priori ±5% margin) for pg vs Prisma, deep fetch,
//       on the per-replicate log-ratio; plus the paired difference test.
//   (2) Native-relative spreads as paired geometric-mean ratios with paired CIs.
//   (3) p99: per-cell bootstrap CIs + paired tests on adjacent deep-fetch pairs.
//   (4) RQ2: Spearman/Kendall rank agreement (descriptive, 7 evaluated systems) +
//       a BLOCKED (repeated-measures) permutation test for the layer x engine
//       interaction, permuting layer labels within replicate blocks.
//   (5) CPU efficiency: application-tier AND combined app+database CPU per request.
//   (6) Robust dispersion: max relative MAD.
// Output: results/analysis2.json + console summary.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  median, cv, geomMeanRatio, winFraction, pairedPermutation, wilcoxonSignedRank,
  pairedBootstrapRatioCI, pairedTOST, blockedInteraction,
} from '../bench/stats.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const rows = JSON.parse(await readFile(join(here, '..', 'results', 'raw.json'), 'utf8'));
const g = (a, ep, e) => rows.find((r) => r.adapter === a && r.endpoint === ep && r.engine === e);
const ORD = ['pg', 'mysql2', 'knex', 'drizzle', 'prisma', 'sequelize', 'typeorm', 'objection', 'mikroorm'];
const PORTABLE = ['knex', 'drizzle', 'prisma', 'sequelize', 'typeorm', 'objection', 'mikroorm'];
const PATTERNS = ['point_read', 'range_scan', 'deep_fetch', 'aggregation', 'write'];
const NAT = { postgres: 'pg', mysql: 'mysql2' };

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rand = mulberry32(0x57a75);
const resample = (xs) => xs.map(() => xs[Math.floor(rand() * xs.length)]);
const q = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(p * sorted.length)))];
const B = 5000;

function bootCI(fn, level = 0.95) { // fn() -> statistic on resampled data (unpaired)
  const s = Array.from({ length: B }, fn).sort((a, b) => a - b);
  return [q(s, (1 - level) / 2), q(s, 1 - (1 - level) / 2)];
}
function fnv1a(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; }
// Per-cell deterministically-seeded percentile bootstrap of the median (integer-rounded),
// identical to ci-tables.mjs/gen-p99-significance.mjs so the p99 CI is the same value in
// analysis2.json and in every table that reports it, independent of iteration order.
function ciSeeded(samples, key) {
  const r = mulberry32(fnv1a(key));
  const s = [];
  for (let b = 0; b < B; b++) { const rs = samples.map(() => samples[Math.floor(r() * samples.length)]); s.push(median(rs)); }
  s.sort((x, y) => x - y);
  return [Math.round(s[Math.floor(0.025 * B)]), Math.round(s[Math.floor(0.975 * B)])];
}

const out = { seed: '0x57a75', bootstrap_B: B, permutation_B: 20000, paired: true, generated: '2026-07-13' };

// ---------- (1) Paired TOST + paired difference, pg vs prisma, deep fetch PG ----
{
  const A = g('pg', 'deep_fetch', 'postgres').rps_samples;      // pg
  const P = g('prisma', 'deep_fetch', 'postgres').rps_samples;  // prisma
  const tost = pairedTOST(A, P, { margin: 0.05, B, rand });     // ratio pg/prisma
  const perm = pairedPermutation(A, P, { B: 20000, rand });
  const wil = wilcoxonSignedRank(A, P);
  out.tost = {
    contrast: 'pg / prisma', margin: '±5% (log scale)', paired: true,
    geomRatio: tost.geomRatio, ci90: tost.ci90, equivalent: tost.equivalent,
    paired_perm_p: perm.p, wilcoxon_p: +wil.p.toFixed(4), dominance_pg_over_prisma: +winFraction(A, P).toFixed(2),
  };
  console.log(`(1) PAIRED TOST pg/prisma deep/PG: ratio ${tost.geomRatio} 90%CI [${tost.ci90}] -> equivalent(±5%): ${tost.equivalent}; paired perm p=${perm.p.toExponential(2)}, wilcoxon p=${wil.p.toFixed(3)}`);
}

// ---------- (2) native-relative spreads (median ratio; paired bootstrap CI) -----
// The point estimate is the ratio of the two layers' median throughputs (matching
// the per-pattern tables); the CI is a PAIRED bootstrap that resamples replicate
// indices jointly, so the interval respects the blocked design.
out.spreads = [];
for (const ep of PATTERNS) for (const e of ['postgres', 'mysql']) {
  const layers = ORD.filter((a) => g(a, ep, e));
  const nat = g(NAT[e], ep, e); if (!nat) continue;
  const slowest = layers.map((a) => g(a, ep, e)).reduce((m, r) => (r.rps < m.rps ? r : m));
  const n = Math.min(nat.rps_samples.length, slowest.rps_samples.length);
  const a = nat.rps_samples.slice(0, n), b = slowest.rps_samples.slice(0, n);
  const spread = median(a) / median(b);
  const boots = Array.from({ length: B }, () => {
    const idx = Array.from({ length: n }, () => Math.floor(rand() * n));
    return median(idx.map((k) => a[k])) / median(idx.map((k) => b[k]));
  }).sort((x, y) => x - y);
  const lo = q(boots, 0.025), hi = q(boots, 0.975);
  out.spreads.push({ ep, engine: e, slowest: slowest.adapter, spread: +spread.toFixed(2), ci95: [+lo.toFixed(2), +hi.toFixed(2)], paired_ci: true });
  console.log(`(2) spread ${ep}/${e}: ${spread.toFixed(2)}x [${lo.toFixed(2)}, ${hi.toFixed(2)}] (vs ${slowest.adapter})`);
}

// ---------- (3) p99 inference for EVERY pattern x engine (review 6.9/8) ---------
// Per-cell bootstrap CI on the per-replicate p99, plus PAIRED permutation +
// Wilcoxon adjacent-pair tests on the ranked p99 ladder. The tail is co-primary
// with throughput, so it gets the same paired treatment, not just deep_fetch/PG.
out.p99 = {};
out.p99Pairs = {};
for (const e of ['postgres', 'mysql']) for (const ep of PATTERNS) {
  const cells = ORD.filter((a) => g(a, ep, e))
    .map((a) => ({ a, r: g(a, ep, e) }))
    .filter((x) => x.r && x.r.p99_samples)
    .sort((x, y) => median(x.r.p99_samples) - median(y.r.p99_samples)); // ascending: fastest tail first
  const key = `${ep}/${e}`;
  out.p99[key] = cells.map(({ a, r }) => {
    const s = r.p99_samples;
    const [lo, hi] = ciSeeded(s, `${a}|${e}|${ep}|p99`);
    return { adapter: a, p99: median(s), ci95: [lo, hi], nRequestsApprox: Math.round(r.rps * r.duration), errors: r.errors, timeouts: r.timeouts, non2xx: r.non2xx };
  });
  const pairs = [];
  for (let i = 0; i + 1 < cells.length; i++) {
    // slower-tail layer is B (higher p99); test B_p99 > A_p99 pairwise on log-ratios
    const B = cells[i + 1].r.p99_samples, A = cells[i].r.p99_samples;
    const n = Math.min(A.length, B.length);
    const perm = pairedPermutation(B.slice(0, n), A.slice(0, n), { B: 20000, rand });
    const wil = wilcoxonSignedRank(B.slice(0, n), A.slice(0, n));
    pairs.push({ pair: `${cells[i + 1].a}>${cells[i].a}`, ratio: +geomMeanRatio(B.slice(0, n), A.slice(0, n)).toFixed(2), paired_perm_p: perm.p, wilcoxon_p: +wil.p.toFixed(4) });
  }
  out.p99Pairs[key] = pairs;
}
// console: deep/PG ladder + how many adjacent p99 pairs separate per pattern/engine
console.log(`(3) p99 deep/PG (median [95% CI]): ` + out.p99['deep_fetch/postgres'].map((x) => `${x.adapter} ${x.p99}[${x.ci95}]`).join('  '));
for (const e of ['postgres', 'mysql']) for (const ep of PATTERNS) {
  const pr = out.p99Pairs[`${ep}/${e}`];
  const sig = pr.filter((p) => p.paired_perm_p < 0.05).length;
  console.log(`    p99 ${ep}/${e}: ${sig}/${pr.length} adjacent pairs separate (p<0.05)`);
}
// all-zero error attestation across the primary matrix
{
  const tot = rows.reduce((s, r) => ({ e: s.e + (r.errors || 0), t: s.t + (r.timeouts || 0), n: s.n + (r.non2xx || 0) }), { e: 0, t: 0, n: 0 });
  out.primaryErrors = { errors: tot.e, timeouts: tot.t, non2xx: tot.n, cells: rows.length };
  console.log(`    primary matrix errors/timeouts/non2xx: ${tot.e}/${tot.t}/${tot.n} across ${rows.length} cells`);
}

// ---------- (4) RQ2: rank agreement (descriptive) + BLOCKED interaction test ----
function spearman(x, y) { const rk = (v) => { const idx = v.map((val, i) => [val, i]).sort((a, b) => a[0] - b[0]); const r = []; idx.forEach(([, i], k) => r[i] = k + 1); return r; };
  const rx = rk(x), ry = rk(y); const n = x.length; const mx = (n + 1) / 2;
  let num = 0, dx = 0, dy = 0; for (let i = 0; i < n; i++) { num += (rx[i] - mx) * (ry[i] - mx); dx += (rx[i] - mx) ** 2; dy += (ry[i] - mx) ** 2; }
  return num / Math.sqrt(dx * dy); }
function kendall(x, y) { let c = 0, d = 0; for (let i = 0; i < x.length; i++) for (let j = i + 1; j < x.length; j++) { const s = Math.sign(x[i] - x[j]) * Math.sign(y[i] - y[j]); if (s > 0) c++; else if (s < 0) d++; } return (c - d) / (c + d); }

out.rq2 = [];
for (const ep of PATTERNS) {
  const cellsPG = PORTABLE.map((a) => g(a, ep, 'postgres'));
  const cellsMY = PORTABLE.map((a) => g(a, ep, 'mysql'));
  if (cellsPG.some((c) => !c) || cellsMY.some((c) => !c)) continue;
  const mPG = cellsPG.map((c) => median(c.rps_samples)), mMY = cellsMY.map((c) => median(c.rps_samples));
  const rho = spearman(mPG, mMY), tau = kendall(mPG, mMY);
  // BLOCKED interaction: D[layer][rep] = log(rps_PG) - log(rps_MY), pairing engines
  // within replicate; permute layer labels within each replicate block.
  const D = PORTABLE.map((a, i) => {
    const pg = cellsPG[i].rps_samples, my = cellsMY[i].rps_samples;
    const n = Math.min(pg.length, my.length);
    const d = new Array(n); for (let k = 0; k < n; k++) d[k] = Math.log(pg[k]) - Math.log(my[k]);
    return d;
  });
  const bi = blockedInteraction(D, { B: 20000, rand });
  out.rq2.push({ ep, spearman: +rho.toFixed(3), kendall: +tau.toFixed(3), n_layers: PORTABLE.length,
    interaction_F: +bi.F.toFixed(1), interaction_p: bi.p, interaction_perm_B: bi.B, block_R: bi.R,
    note: bi.R < 25 ? 'write: knex/postgres has 24 replicates; truncated to common length pending re-run' : undefined });
  console.log(`(4) RQ2 ${ep}: rho=${rho.toFixed(2)} tau=${tau.toFixed(2)} (descriptive, n=7); blocked interaction F=${bi.F.toFixed(1)} p=${bi.p.toExponential(2)} (R=${bi.R})`);
}

// ---------- (5) efficiency: application-tier AND combined app+db CPU ------------
out.efficiency = [];
for (const e of ['postgres', 'mysql']) for (const a of ORD) {
  const r = g(a, 'deep_fetch', e); if (!r || !r.cpu_pct) continue;
  const combinedCores = (r.cpu_pct + (r.db_cpu_pct ?? 0)) / 100;
  out.efficiency.push({ adapter: a, engine: e, rps: r.rps, app_cpu_pct: r.cpu_pct, db_cpu_pct: r.db_cpu_pct ?? null,
    req_per_app_cpu_s: +(r.rps / (r.cpu_pct / 100)).toFixed(0),
    req_per_combined_cpu_s: +(r.rps / combinedCores).toFixed(0) });
}
console.log('(5) req/app-CPU-s vs req/combined-CPU-s deep/PG: ' + out.efficiency.filter((x) => x.engine === 'postgres')
  .map((x) => `${x.adapter} ${x.req_per_app_cpu_s}/${x.req_per_combined_cpu_s}`).join('  '));

// ---------- (6) robust dispersion ----------------------------------------------
{
  let maxRelMAD = 0, at = '';
  for (const r of rows) {
    if (!r.rps_samples) continue;
    const m = median(r.rps_samples);
    const mad = median(r.rps_samples.map((x) => Math.abs(x - m)));
    const rel = mad / m; if (rel > maxRelMAD) { maxRelMAD = rel; at = `${r.adapter}/${r.endpoint}/${r.engine}`; }
  }
  out.dispersion = { maxRelMAD_pct: +(maxRelMAD * 100).toFixed(1), at };
  console.log(`(6) max relative MAD: ${(maxRelMAD * 100).toFixed(1)}% (${at})`);
}

await writeFile(join(here, '..', 'results', 'analysis2.json'), JSON.stringify(out, null, 2));
console.log('\nwrote results/analysis2.json');
