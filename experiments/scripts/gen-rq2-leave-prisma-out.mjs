// Leave-Prisma-out sensitivity for RQ2.
//
// All four RQ2 reversals promoted in the main analysis involve Prisma, the one
// treatment whose lower-level MySQL driver differs from every other layer
// (MariaDB adapter, because Prisma ships no mysql2 adapter). This script
// re-runs the identical promotion procedure on the six remaining portable
// layers, so that the RQ2 conclusion can be stated conditionally on that
// driver substitution. It reuses the criteria of
// gen-rq2-validation-table.mjs verbatim: a reversal is promoted only when it
// recurs in both corrected-state campaigns, both stack-specific pair gaps
// exceed the 5% margin, and paired-bootstrap ratio intervals
// exclude equality in opposite directions in both campaigns.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const resultsDir = path.join(root, "results");
const paperDir = path.resolve(root, "..", "paper", "tables");

const ALL_LAYERS = ["knex", "drizzle", "prisma", "sequelize", "typeorm", "objection", "mikroorm"];
const HELD_OUT = "prisma";
const KEPT = ALL_LAYERS.filter((layer) => layer !== HELD_OUT);
const ENGINES = ["postgres", "mysql"];
const PATTERNS = [["deep_fetch", "Deep fetch"], ["aggregation", "Aggregation"], ["write", "Insert"]];

const primary = JSON.parse(fs.readFileSync(path.join(resultsDir, "current-primary.json"), "utf8"));
const validation = JSON.parse(fs.readFileSync(path.join(resultsDir, "rq2-validation-campaign.json"), "utf8"));
const index = (rows) => new Map(rows.map((row) => [`${row.adapter}|${row.engine}|${row.endpoint}`, row]));
const P = index(primary);
const V = index(validation);

for (const [label, source] of [["primary", P], ["validation", V]]) {
  for (const layer of ALL_LAYERS) for (const engine of ENGINES) for (const [endpoint] of PATTERNS) {
    const row = source.get(`${layer}|${engine}|${endpoint}`);
    if (!row) throw new Error(`${label}: missing cell ${layer}|${engine}|${endpoint}`);
    if (!Array.isArray(row.rps_samples) || row.rps_samples.length !== 25) {
      throw new Error(`${label}: ${layer}|${engine}|${endpoint} does not carry 25 rps samples`);
    }
    if (row.errors !== 0 || row.timeouts !== 0 || row.non2xx !== 0) {
      throw new Error(`${label}: ${layer}|${engine}|${endpoint} has request failures`);
    }
  }
}

const median = (values) => {
  const xs = [...values].sort((a, b) => a - b);
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
};
const med = (source, layer, engine, endpoint) =>
  median(source.get(`${layer}|${engine}|${endpoint}`).rps_samples);
const order = (source, engine, endpoint, layers) => layers
  .map((layer) => ({ layer, rps: med(source, layer, engine, endpoint) }))
  .sort((a, b) => b.rps - a.rps);
const spearman = (a, b, layers) => {
  const ra = new Map(a.map((x, i) => [x.layer, i + 1]));
  const rb = new Map(b.map((x, i) => [x.layer, i + 1]));
  let d2 = 0;
  for (const layer of layers) d2 += (ra.get(layer) - rb.get(layer)) ** 2;
  const n = layers.length;
  return 1 - (6 * d2) / (n * (n * n - 1));
};

// Same PRNG, seeding scheme, and interval procedure as gen-rq2-validation-table.mjs,
// so that a kept pair reproduces its main-analysis interval exactly.
function mulberry32(a) {
  return function random() {
    a |= 0;
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function seedFor(...parts) {
  let hash = 2166136261;
  for (const ch of parts.join("|")) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
function pairedMedianRatioCI(a, b, seed, iterations = 5000) {
  const random = mulberry32(seed);
  const estimates = [];
  for (let iteration = 0; iteration < iterations; iteration++) {
    const sampledA = [], sampledB = [];
    for (let i = 0; i < a.length; i++) {
      const j = Math.floor(random() * a.length);
      sampledA.push(a[j]); sampledB.push(b[j]);
    }
    estimates.push(median(sampledA) / median(sampledB));
  }
  estimates.sort((x, y) => x - y);
  return [estimates[Math.floor(0.025 * iterations)], estimates[Math.floor(0.975 * iterations)]];
}
function crossStackReversals(source, endpoint, campaignLabel, layers) {
  const out = [];
  for (let i = 0; i < layers.length; i++) for (let j = i + 1; j < layers.length; j++) {
    const a = layers[i], b = layers[j];
    const pgRatio = med(source, a, "postgres", endpoint) / med(source, b, "postgres", endpoint);
    const mysqlRatio = med(source, a, "mysql", endpoint) / med(source, b, "mysql", endpoint);
    if ((pgRatio - 1) * (mysqlRatio - 1) >= 0) continue;
    const pgRatioCI = pairedMedianRatioCI(
      source.get(`${a}|postgres|${endpoint}`).rps_samples,
      source.get(`${b}|postgres|${endpoint}`).rps_samples,
      seedFor(campaignLabel, endpoint, a, b, "postgres"));
    const mysqlRatioCI = pairedMedianRatioCI(
      source.get(`${a}|mysql|${endpoint}`).rps_samples,
      source.get(`${b}|mysql|${endpoint}`).rps_samples,
      seedFor(campaignLabel, endpoint, a, b, "mysql"));
    out.push({
      pair: `${a}|${b}`,
      pgRatio,
      mysqlRatio,
      material: Math.abs(pgRatio - 1) > 0.05 && Math.abs(mysqlRatio - 1) > 0.05,
      pgRatioCI,
      mysqlRatioCI,
      intervalResolved: (pgRatioCI[0] > 1 && mysqlRatioCI[1] < 1)
        || (pgRatioCI[1] < 1 && mysqlRatioCI[0] > 1),
    });
  }
  return out.sort((a, b) => a.pair.localeCompare(b.pair));
}

const analyze = (layers) => PATTERNS.map(([endpoint, label]) => {
  const primaryReversals = crossStackReversals(P, endpoint, "primary", layers);
  const validationReversals = crossStackReversals(V, endpoint, "validation", layers);
  const byPair = new Map(validationReversals.map((row) => [row.pair, row]));
  const promoted = primaryReversals.filter((row) => {
    const other = byPair.get(row.pair);
    return other && row.material && other.material && row.intervalResolved && other.intervalResolved;
  });
  return {
    endpoint,
    label,
    crossStackSpearman: {
      primary: spearman(order(P, "postgres", endpoint, layers), order(P, "mysql", endpoint, layers), layers),
      validation: spearman(order(V, "postgres", endpoint, layers), order(V, "mysql", endpoint, layers), layers),
    },
    rawReversalPairs: {
      primary: primaryReversals.map((row) => row.pair),
      validation: validationReversals.map((row) => row.pair),
    },
    promotedPairs: promoted.map((row) => row.pair),
    promotedDetail: promoted,
  };
});

const full = analyze(ALL_LAYERS);
const reduced = analyze(KEPT);
const output = {
  scope: "Leave-one-treatment-out sensitivity for RQ2. Prisma is held out because it is the only "
    + "treatment whose lower-level MySQL driver differs from the rest (MariaDB adapter rather than "
    + "mysql2). Promotion criteria are identical to the main RQ2 analysis. This isolates no causal "
    + "mechanism: holding out Prisma removes the driver substitution together with the treatment "
    + "itself, so the two cannot be separated by this design.",
  heldOut: HELD_OUT,
  layersFull: ALL_LAYERS,
  layersReduced: KEPT,
  promotionCriteria: "recurs in both corrected-state campaigns; both stack-specific pair gaps exceed "
    + "5 percent; paired-bootstrap ratio intervals exclude equality in opposite directions in both campaigns",
  full,
  reduced,
  promotedCountFull: full.reduce((n, row) => n + row.promotedPairs.length, 0),
  promotedCountReduced: reduced.reduce((n, row) => n + row.promotedPairs.length, 0),
};
fs.writeFileSync(
  path.join(resultsDir, "rq2-leave-prisma-out.json"),
  JSON.stringify(output, null, 2) + "\n",
);

// Derive the direction of the rank-agreement change rather than asserting it.
// The caption previously hard-coded "does not improve", which was wrong on two of
// the three patterns and under-claimed the result.
const direction = (a, b) => (b > a ? "up" : b < a ? "down" : "level");
const moves = PATTERNS.map(([, label], i) => {
  const f = full[i].crossStackSpearman, r = reduced[i].crossStackSpearman;
  const d = direction(f.primary, r.primary);
  return { label: label.toLowerCase(), d };
});
const upList = moves.filter((m) => m.d === "up").map((m) => m.label);
const downList = moves.filter((m) => m.d === "down").map((m) => m.label);
const join = (xs) => xs.length > 1 ? xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1] : (xs[0] ?? "none");
const movementSentence = upList.length && downList.length
  ? `cross-stack rank agreement moves in both directions: up on ${join(upList)}, down on ${join(downList)}`
  : upList.length
    ? `cross-stack rank agreement rises on ${join(upList)}`
    : `cross-stack rank agreement falls on ${join(downList)}`;

const num = (value) => value.toFixed(2);
const rows = PATTERNS.map(([endpoint, label], i) => {
  const f = full[i], r = reduced[i];
  return `    ${label} & ${num(f.crossStackSpearman.primary)} & ${num(f.crossStackSpearman.validation)}`
    + ` & ${f.promotedPairs.length} & ${num(r.crossStackSpearman.primary)}`
    + ` & ${num(r.crossStackSpearman.validation)} & ${r.promotedPairs.length} \\\\`;
}).join("\n");
const tex = `% auto-generated by scripts/gen-rq2-leave-prisma-out.mjs
\\begin{table}[htbp]
  \\centering
  \\small
  \\caption{Leave-Prisma-out sensitivity for RQ2. Prisma is the only treatment whose
  lower-level MySQL driver differs from the rest, so the analysis is repeated on the six
  remaining portable layers under the identical promotion rule (recurrence in both
  corrected-state campaigns, both stack-specific gaps above the 5\\% margin,
  and paired-bootstrap intervals excluding equality in opposite directions in both
  campaigns). $\\rho$ is the PostgreSQL-versus-MySQL rank correlation of campaign medians.
  All ${output.promotedCountFull} promoted reversals are lost when Prisma is held out, while
  ${movementSentence}, so agreement stays imperfect either way. Holding out
  Prisma removes the driver substitution and the treatment together and therefore
  identifies neither as the cause.}
  \\label{tab:rq2_leave_prisma_out}
  \\begin{adjustbox}{max width=\\textwidth}
  \\begin{tabular}{l rrr rrr}
    \\toprule
    & \\multicolumn{3}{c}{All seven layers} & \\multicolumn{3}{c}{Prisma held out (six layers)} \\\\
    \\cmidrule(lr){2-4}\\cmidrule(lr){5-7}
    Pattern & $\\rho$ primary & $\\rho$ valid. & Promoted & $\\rho$ primary & $\\rho$ valid. & Promoted \\\\
    \\midrule
${rows}
    \\bottomrule
  \\end{tabular}
  \\end{adjustbox}
\\end{table}
`;
for (const dir of [path.join(resultsDir, "tables"), paperDir]) {
  fs.writeFileSync(path.join(dir, "rq2_leave_prisma_out.tex"), tex);
}
console.log(`promoted reversals: all seven = ${output.promotedCountFull}, Prisma held out = ${output.promotedCountReduced}`);
