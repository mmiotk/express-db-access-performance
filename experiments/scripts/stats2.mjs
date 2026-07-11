// Stage 2 of the revision: the inferential upgrades the external review asked for,
// computed on the current primary dataset (results/raw.json, 25 independent
// replicates). Everything is seeded and deterministic.
//   (1) TOST equivalence test (prespecified margin ±5%) for pg vs Prisma, deep fetch.
//   (2) Bootstrap 95% CIs for every native-relative spread (pattern × engine).
//   (3) p99: per-cell bootstrap CIs + Mann–Whitney on adjacent deep-fetch pairs.
//   (4) RQ2: Spearman + Kendall rank correlation between engine rankings per
//       pattern (bootstrap CIs) + permutation F-test (Freedman–Lane on the
//       balanced subsample) for the layer×engine interaction on log throughput.
//   (5) Resource efficiency: requests per CPU-second (deep fetch).
//   (6) Robust dispersion: max relative MAD and IQR/median alongside CV.
// Output: results/analysis2.json + console summary.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { median, cv, mannWhitneyU, cliffsDelta } from '../bench/stats.mjs';

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

function bootCI(fn, level = 0.95) { // fn() -> statistic on resampled data
  const s = Array.from({ length: B }, fn).sort((a, b) => a - b);
  return [q(s, (1 - level) / 2), q(s, 1 - (1 - level) / 2)];
}

const out = { seed: '0x57a75', B, generated: '2026-07-12' };

// ---------- (1) TOST equivalence, pg vs prisma, deep fetch PG -----------------
{
  const A = g('pg', 'deep_fetch', 'postgres').rps_samples;
  const P = g('prisma', 'deep_fetch', 'postgres').rps_samples;
  const ratio = median(P) / median(A);
  // TOST via bootstrap: equivalence at alpha=0.05 iff 90% CI of ratio ⊂ [0.95,1.05]
  const [lo90, hi90] = bootCI(() => median(resample(P)) / median(resample(A)), 0.90);
  const [lo95, hi95] = bootCI(() => median(resample(P)) / median(resample(A)), 0.95);
  out.tost = { margin: '±5%', ratio: +ratio.toFixed(4), ci90: [+lo90.toFixed(4), +hi90.toFixed(4)], ci95: [+lo95.toFixed(4), +hi95.toFixed(4)], equivalent: lo90 >= 0.95 && hi90 <= 1.05 };
  console.log(`(1) TOST pg~prisma deep fetch: ratio ${ratio.toFixed(3)}, 90% CI [${lo90.toFixed(3)}, ${hi90.toFixed(3)}] -> equivalence(±5%): ${out.tost.equivalent}`);
}

// ---------- (2) spread CIs (native-relative, slowest layer fixed by estimate) --
out.spreads = [];
for (const ep of PATTERNS) for (const e of ['postgres', 'mysql']) {
  const layers = ORD.filter((a) => g(a, ep, e));
  const nat = g(NAT[e], ep, e); if (!nat) continue;
  const slowest = layers.map((a) => g(a, ep, e)).reduce((m, r) => (r.rps < m.rps ? r : m));
  const spread = median(nat.rps_samples) / median(slowest.rps_samples);
  const [lo, hi] = bootCI(() => median(resample(nat.rps_samples)) / median(resample(slowest.rps_samples)));
  out.spreads.push({ ep, engine: e, slowest: slowest.adapter, spread: +spread.toFixed(2), ci95: [+lo.toFixed(2), +hi.toFixed(2)] });
  console.log(`(2) spread ${ep}/${e}: ${spread.toFixed(2)}x [${lo.toFixed(2)}, ${hi.toFixed(2)}] (vs ${slowest.adapter})`);
}

// ---------- (3) p99: cell CIs + adjacent-pair tests (deep fetch, PG) -----------
{
  const cells = ORD.filter((a) => g(a, 'deep_fetch', 'postgres'))
    .map((a) => ({ a, r: g(a, 'deep_fetch', 'postgres') }))
    .sort((x, y) => y.r.rps - x.r.rps);
  out.p99 = cells.map(({ a, r }) => {
    const s = r.p99_samples;
    const [lo, hi] = bootCI(() => median(resample(s)));
    return { adapter: a, p99: median(s), ci95: [+lo.toFixed(1), +hi.toFixed(1)] };
  });
  out.p99Pairs = [];
  for (let i = 0; i + 1 < cells.length; i++) {
    const A = cells[i].r.p99_samples, Bb = cells[i + 1].r.p99_samples;
    const { p } = mannWhitneyU(A, Bb);
    out.p99Pairs.push({ pair: `${cells[i].a} vs ${cells[i + 1].a}`, medA: median(A), medB: median(Bb), delta: +cliffsDelta(A, Bb).toFixed(2), p: +p.toFixed(4) });
  }
  console.log(`(3) p99 deep/PG: ` + out.p99.map((x) => `${x.adapter} ${x.p99}[${x.ci95}]`).join('  '));
}

// ---------- (4) RQ2: rank correlations + interaction permutation F -------------
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
  const [rlo, rhi] = bootCI(() => spearman(cellsPG.map((c) => median(resample(c.rps_samples))), cellsMY.map((c) => median(resample(c.rps_samples)))));
  // interaction permutation F (Freedman–Lane) on log rps, balanced subsample n=24
  const n = 24;
  const sub = (c) => { const s = [...c.rps_samples]; while (s.length > n) s.splice(Math.floor(rand() * s.length), 1); return s.map(Math.log); };
  const Y = PORTABLE.map((a, i) => [sub(cellsPG[i]), sub(cellsMY[i])]); // [layer][engine][rep]
  const F_int = (Ydat) => {
    const L = Ydat.length, E = 2;
    const cell = Ydat.map((r) => r.map((v) => v.reduce((s, x) => s + x, 0) / v.length));
    const grand = cell.flat().reduce((s, x) => s + x, 0) / (L * E);
    const rowM = cell.map((r) => (r[0] + r[1]) / 2);
    const colM = [0, 1].map((j) => cell.reduce((s, r) => s + r[j], 0) / L);
    let ssInt = 0, ssErr = 0;
    for (let i = 0; i < L; i++) for (let j = 0; j < E; j++) {
      ssInt += n * (cell[i][j] - rowM[i] - colM[j] + grand) ** 2;
      for (const v of Ydat[i][j]) ssErr += (v - cell[i][j]) ** 2;
    }
    const dfInt = (L - 1) * (E - 1), dfErr = L * E * (n - 1);
    return (ssInt / dfInt) / (ssErr / dfErr);
  };
  const Fobs = F_int(Y);
  // Freedman–Lane: residuals from additive fit, permute pooled, add back additive fit
  const L = PORTABLE.length;
  const cellM = Y.map((r) => r.map((v) => v.reduce((s, x) => s + x, 0) / n));
  const grand = cellM.flat().reduce((s, x) => s + x, 0) / (L * 2);
  const rowM = cellM.map((r) => (r[0] + r[1]) / 2);
  const colM = [0, 1].map((j) => cellM.reduce((s, r) => s + r[j], 0) / L);
  const fit = (i, j) => rowM[i] + colM[j] - grand;
  const resid = []; Y.forEach((r, i) => r.forEach((v, j) => v.forEach((x) => resid.push(x - fit(i, j)))));
  let ge = 0; const P = 2000;
  for (let b = 0; b < P; b++) {
    const perm = [...resid]; for (let k = perm.length - 1; k > 0; k--) { const m = Math.floor(rand() * (k + 1)); [perm[k], perm[m]] = [perm[m], perm[k]]; }
    let idx = 0; const Yb = Y.map((r, i) => r.map((v, j) => v.map(() => fit(i, j) + perm[idx++])));
    if (F_int(Yb) >= Fobs) ge++;
  }
  const pInt = (ge + 1) / (P + 1);
  out.rq2.push({ ep, spearman: +rho.toFixed(3), spearmanCI: [+rlo.toFixed(2), +rhi.toFixed(2)], kendall: +tau.toFixed(3), F_interaction: +Fobs.toFixed(1), p_interaction: +pInt.toFixed(4) });
  console.log(`(4) RQ2 ${ep}: rho=${rho.toFixed(2)} [${rlo.toFixed(2)},${rhi.toFixed(2)}] tau=${tau.toFixed(2)}  F_int=${Fobs.toFixed(1)} p_perm=${pInt.toFixed(4)}`);
}

// ---------- (5) efficiency: requests per CPU-second (deep fetch) ---------------
out.efficiency = [];
for (const e of ['postgres', 'mysql']) for (const a of ORD) {
  const r = g(a, 'deep_fetch', e); if (!r || !r.cpu_pct) continue;
  out.efficiency.push({ adapter: a, engine: e, rps: r.rps, cpu_pct: r.cpu_pct, req_per_cpu_s: +(r.rps / (r.cpu_pct / 100)).toFixed(0) });
}
console.log('(5) req/CPU-s deep/PG: ' + out.efficiency.filter((x) => x.engine === 'postgres').map((x) => `${x.adapter} ${x.req_per_cpu_s}`).join('  '));

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
