// Small stats + output helpers shared by the runner. No dependencies.

export function median(xs) {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Coefficient of variation across repeat runs — a reproducibility signal.
export function cv(xs) {
  if (xs.length < 2) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (xs.length - 1);
  return mean === 0 ? 0 : Math.sqrt(variance) / mean;
}

// --- Nonparametric comparison of two small samples (throughput runs) ---

function erf(x) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}
const normalCdf = (x) => 0.5 * (1 + erf(x / Math.SQRT2));

// Mann–Whitney U with average ranks and a normal approximation (continuity-
// corrected, two-sided). Adequate for the small n of repeated benchmark runs;
// report alongside Cliff's delta, which needs no distributional assumption.
export function mannWhitneyU(a, b) {
  const comb = a.map((v) => ({ v, g: 0 })).concat(b.map((v) => ({ v, g: 1 }))).sort((x, y) => x.v - y.v);
  const n = comb.length;
  for (let i = 0; i < n;) {
    let j = i; while (j + 1 < n && comb[j + 1].v === comb[i].v) j++;
    const rank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) comb[k].rank = rank;
    i = j + 1;
  }
  const n1 = a.length; const n2 = b.length;
  const R1 = comb.filter((x) => x.g === 0).reduce((s, x) => s + x.rank, 0);
  const U1 = R1 - (n1 * (n1 + 1)) / 2;
  const U = Math.min(U1, n1 * n2 - U1);
  const mu = (n1 * n2) / 2;
  const sigma = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
  const z = sigma > 0 ? (U - mu + 0.5) / sigma : 0;
  return { U, p: 2 * normalCdf(-Math.abs(z)) };
}

// Cliff's delta effect size in [-1, 1]; |d|: <.147 negligible, <.33 small,
// <.474 medium, else large.
export function cliffsDelta(a, b) {
  let gt = 0; let lt = 0;
  for (const x of a) for (const y of b) { if (x > y) gt++; else if (x < y) lt++; }
  return a.length && b.length ? (gt - lt) / (a.length * b.length) : 0;
}
export function cliffsMagnitude(d) {
  const ad = Math.abs(d);
  return ad < 0.147 ? 'negligible' : ad < 0.33 ? 'small' : ad < 0.474 ? 'medium' : 'large';
}

// --- Paired / blocked comparisons -------------------------------------------
// The primary campaign is a randomized-block design: within each replicate every
// layer is driven by the identical request stream (seeded on endpoint+replicate,
// not layer), so the two layers' sample arrays are index-aligned by replicate.
// These estimators exploit that pairing; they require a,b of equal length with
// a[i] and b[i] from the same replicate i.

export const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
export function sd(xs) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

// Element-wise paired log-ratios log(a_i / b_i).
export function logRatios(a, b) {
  const n = Math.min(a.length, b.length);
  const r = new Array(n);
  for (let i = 0; i < n; i++) r[i] = Math.log(a[i] / b[i]);
  return r;
}
// Geometric mean of the paired ratio a/b — the paired effect-size estimate.
export const geomMeanRatio = (a, b) => Math.exp(mean(logRatios(a, b)));
// Paired dominance (probability of superiority): fraction of replicates a_i > b_i,
// ties counted as 1/2. A paired analogue of Cliff's delta in [0,1].
export function winFraction(a, b) {
  const n = Math.min(a.length, b.length);
  let w = 0, t = 0;
  for (let i = 0; i < n; i++) { if (a[i] > b[i]) w++; else if (a[i] === b[i]) t++; }
  return (w + t / 2) / n;
}

// Paired sign-flip permutation test on the mean paired log-ratio (two-sided).
// H0: the paired differences are symmetric about 0. Monte Carlo with B flips;
// p = (#{|permuted mean| >= |observed|} + 1)/(B+1), so the smallest attainable
// p is 1/(B+1). `rand` is a seeded [0,1) generator for reproducibility.
export function pairedPermutation(a, b, { B = 20000, rand = Math.random } = {}) {
  const d = logRatios(a, b);
  const n = d.length;
  const obs = Math.abs(mean(d));
  let ge = 0;
  for (let k = 0; k < B; k++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += rand() < 0.5 ? -d[i] : d[i];
    if (Math.abs(s / n) >= obs - 1e-12) ge++;
  }
  return { n, geomRatio: Math.exp(mean(d)), meanLogRatio: mean(d), p: (ge + 1) / (B + 1), B };
}

// Wilcoxon signed-rank test on paired differences a_i - b_i (two-sided, normal
// approximation with tie and continuity correction) — a distribution-light
// robustness check alongside the paired permutation test.
export function wilcoxonSignedRank(a, b) {
  const n0 = Math.min(a.length, b.length);
  const diffs = [];
  for (let i = 0; i < n0; i++) { const dd = a[i] - b[i]; if (dd !== 0) diffs.push(dd); }
  const n = diffs.length;
  if (n === 0) return { W: 0, z: 0, p: 1 };
  const idx = diffs.map((dd, i) => [Math.abs(dd), i]).sort((x, y) => x[0] - y[0]);
  const ranks = new Array(n);
  const counts = {};
  for (let i = 0; i < n;) {
    let j = i; while (j + 1 < n && idx[j + 1][0] === idx[i][0]) j++;
    const rk = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[idx[k][1]] = rk;
    counts[idx[i][0]] = j - i + 1;
    i = j + 1;
  }
  let Wp = 0;
  for (let i = 0; i < n; i++) if (diffs[i] > 0) Wp += ranks[i];
  const mu = (n * (n + 1)) / 4;
  let tie = 0; for (const c of Object.values(counts)) tie += c * c * c - c;
  const sigma = Math.sqrt((n * (n + 1) * (2 * n + 1)) / 24 - tie / 48);
  const z = sigma > 0 ? (Wp - mu - Math.sign(Wp - mu) * 0.5) / sigma : 0;
  return { W: Wp, z, p: 2 * normalCdf(-Math.abs(z)) };
}

// Paired bootstrap CI of the geometric-mean ratio a/b, resampling replicate
// indices (so the pairing is preserved). Seeded via `rand`.
export function pairedBootstrapRatioCI(a, b, { B = 5000, level = 0.90, rand = Math.random } = {}) {
  const n = Math.min(a.length, b.length);
  const lr = logRatios(a, b);
  const stats = new Array(B);
  for (let k = 0; k < B; k++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += lr[Math.floor(rand() * n)];
    stats[k] = Math.exp(s / n);
  }
  stats.sort((x, y) => x - y);
  const lo = stats[Math.floor(((1 - level) / 2) * B)];
  const hi = stats[Math.floor((1 - (1 - level) / 2) * B)];
  return [lo, hi];
}

// Paired two-one-sided-tests (TOST) equivalence on the log-ratio scale, via the
// paired bootstrap: equivalent at the ±margin band iff the 90% paired-bootstrap
// CI of the geometric-mean ratio lies within [1/(1+margin), 1+margin].
export function pairedTOST(a, b, { margin = 0.05, B = 5000, rand = Math.random } = {}) {
  const [lo, hi] = pairedBootstrapRatioCI(a, b, { B, level: 0.90, rand });
  const loB = 1 / (1 + margin), hiB = 1 + margin;
  return {
    geomRatio: +geomMeanRatio(a, b).toFixed(4),
    ci90: [+lo.toFixed(4), +hi.toFixed(4)],
    marginPct: margin * 100,
    equivalent: lo >= loB && hi <= hiB,
  };
}

// Blocked (repeated-measures) permutation test for a layer x engine interaction.
// For each layer L and replicate i, D[L][i] = log(rps_PG) - log(rps_MY) pairs the
// two engines within replicate i. H0: E[D] equal across layers (no interaction).
// Statistic: randomized-block ANOVA F for the layer effect on D (replicate as
// block). Permutation UNIT = layer labels within each replicate block (exchange-
// able under H0). Returns { F, p, B, L, R }.
export function blockedInteraction(D, { B = 5000, rand = Math.random } = {}) {
  const L = D.length;              // layers
  const R = Math.min(...D.map((r) => r.length)); // replicates (common length)
  const Dt = D.map((r) => r.slice(0, R));
  const Fstat = (M) => {
    const grand = mean(M.flat());
    const rowM = M.map((r) => mean(r));                          // per-layer mean
    const colM = Array.from({ length: R }, (_, i) => mean(M.map((r) => r[i]))); // per-replicate (block) mean
    let ssLayer = 0, ssErr = 0;
    for (let l = 0; l < L; l++) ssLayer += R * (rowM[l] - grand) ** 2;
    for (let l = 0; l < L; l++) for (let i = 0; i < R; i++) ssErr += (M[l][i] - rowM[l] - colM[i] + grand) ** 2;
    const dfL = L - 1, dfE = (L - 1) * (R - 1);
    return (ssLayer / dfL) / (ssErr / dfE);
  };
  const Fobs = Fstat(Dt);
  let ge = 0;
  for (let b = 0; b < B; b++) {
    // permute layer labels within each replicate (column)
    const perm = Dt.map((r) => r.slice());
    for (let i = 0; i < R; i++) {
      const col = Dt.map((r) => r[i]);
      for (let k = col.length - 1; k > 0; k--) { const m = Math.floor(rand() * (k + 1)); [col[k], col[m]] = [col[m], col[k]]; }
      for (let l = 0; l < L; l++) perm[l][i] = col[l];
    }
    if (Fstat(perm) >= Fobs - 1e-9) ge++;
  }
  return { F: Fobs, p: (ge + 1) / (B + 1), B, L, R };
}

export function toCsv(rows) {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const head = cols.join(',');
  const body = rows.map((r) => cols.map((c) => r[c]).join(',')).join('\n');
  return `${head}\n${body}\n`;
}

// LaTeX booktabs table grouping throughput (req/s) by adapter × engine for one
// endpoint. `metric` selects which field to print.
export function texTable({ rows, endpoint, metric, caption, label, unit }) {
  const engines = [...new Set(rows.map((r) => r.engine))];
  const filtered = rows.filter((r) => r.endpoint === endpoint);
  const byAdapter = new Map();
  for (const r of filtered) {
    if (!byAdapter.has(r.adapter)) byAdapter.set(r.adapter, { category: r.category });
    byAdapter.get(r.adapter)[r.engine] = r[metric];
  }
  const colspec = `l l ${engines.map(() => 'r').join(' ')}`;
  const header = `Layer & Category & ${engines.map((e) => `\\textbf{${e}}`).join(' & ')} \\\\`;
  // Canonical taxonomy order (native → query builder → lightweight ORM → ORMs), so
  // rows read consistently across tables regardless of measurement/merge order.
  const ORDER = ['pg', 'mysql2', 'pg-tuned', 'mysql2-tuned', 'knex', 'drizzle', 'prisma', 'sequelize', 'typeorm', 'objection', 'mikroorm'];
  const rank = (a) => { const i = ORDER.indexOf(a); return i < 0 ? ORDER.length : i; };
  const lines = [];
  for (const adapter of [...byAdapter.keys()].sort((a, b) => rank(a) - rank(b))) {
    const data = byAdapter.get(adapter);
    const cells = engines.map((e) => (data[e] == null ? '--' : fmt(data[e]))).join(' & ');
    lines.push(`${tex(adapter)} & ${tex(data.category)} & ${cells} \\\\`);
  }
  return `% auto-generated by bench/runner.mjs — do not edit by hand
\\begin{table}[htbp]
  \\centering
  \\caption{${caption}${unit ? ` (${unit})` : ''}}
  \\label{${label}}
  \\begin{tabular}{${colspec}}
    \\toprule
    ${header}
    \\midrule
    ${lines.join('\n    ')}
    \\bottomrule
  \\end{tabular}
\\end{table}
`;
}

// Combined per-pattern table: throughput (req/s) and tail latency (p99) side by
// side, layer × engine — one table per access pattern instead of two, so the
// paper reports the two metrics jointly (its central point) and uses fewer tables.
export function texTableCombined({ rows, endpoint, caption, label }) {
  const ORDER = ['pg', 'mysql2', 'pg-tuned', 'mysql2-tuned', 'knex', 'drizzle', 'prisma', 'sequelize', 'typeorm', 'objection', 'mikroorm'];
  const rank = (a) => { const i = ORDER.indexOf(a); return i < 0 ? ORDER.length : i; };
  const byAdapter = new Map();
  for (const r of rows.filter((r) => r.endpoint === endpoint)) {
    if (!byAdapter.has(r.adapter)) byAdapter.set(r.adapter, { category: r.category });
    byAdapter.get(r.adapter)[r.engine] = { rps: r.rps, p99: r.p99 };
  }
  const cell = (d, e) => (d[e] ? `${fmt(d[e].rps)} & ${fmt(d[e].p99)}` : '-- & --');
  const lines = [...byAdapter.keys()].sort((a, b) => rank(a) - rank(b)).map((a) => {
    const d = byAdapter.get(a);
    return `${tex(a)} & ${tex(d.category)} & ${cell(d, 'postgres')} & ${cell(d, 'mysql')} \\\\`;
  });
  return `% auto-generated by bench/runner.mjs — do not edit by hand
\\begin{table}[htbp]
  \\centering
  \\caption{${caption}}
  \\label{${label}}
  \\begin{tabular}{l l r r r r}
    \\toprule
    & & \\multicolumn{2}{c}{PostgreSQL} & \\multicolumn{2}{c}{MySQL} \\\\
    \\cmidrule(lr){3-4}\\cmidrule(lr){5-6}
    Layer & Category & req/s & p99 & req/s & p99 \\\\
    \\midrule
    ${lines.join('\n    ')}
    \\bottomrule
  \\end{tabular}
\\end{table}
`;
}

const tex = (s) => String(s).replace(/_/g, '\\_');
const fmt = (v) => (typeof v === 'number' ? (v >= 100 ? v.toFixed(0) : v.toFixed(1)) : v);
