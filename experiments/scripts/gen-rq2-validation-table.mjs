import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const resultsDir = path.join(root, "results");
const paperDir = path.resolve(root, "..", "paper", "tables");
const primaryFile = path.join(resultsDir, "current-primary.json");
const validationFile = path.join(resultsDir, "rq2-validation-campaign.json");
if (!fs.existsSync(primaryFile) || !fs.existsSync(validationFile)) {
  throw new Error("current-primary.json and rq2-validation-campaign.json are required");
}

const LAYERS = ["knex", "drizzle", "prisma", "sequelize", "typeorm", "objection", "mikroorm"];
const ENGINES = ["postgres", "mysql"];
const PATTERNS = [["deep_fetch", "Deep fetch"], ["aggregation", "Aggregation"], ["write", "Insert"]];
const primary = JSON.parse(fs.readFileSync(primaryFile, "utf8"));
const validation = JSON.parse(fs.readFileSync(validationFile, "utf8"));

function median(values) {
  const xs = [...values].sort((a, b) => a - b);
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
}
function index(rows) {
  return new Map(rows.map((row) => [`${row.adapter}|${row.engine}|${row.endpoint}`, row]));
}
const P = index(primary);
const V = index(validation);
const errors = [];
const expected = new Set();
for (const layer of LAYERS) for (const engine of ENGINES) for (const [endpoint] of PATTERNS) {
  expected.add(`${layer}|${engine}|${endpoint}`);
}
for (const row of validation) {
  const key = `${row.adapter}|${row.engine}|${row.endpoint}`;
  if (!expected.has(key)) errors.push(`unexpected validation cell ${key}`);
  if (!Array.isArray(row.rps_samples) || row.rps_samples.length !== 25) errors.push(`${key}: rps sample count`);
  if (!Array.isArray(row.p99_samples) || row.p99_samples.length !== 25) errors.push(`${key}: p99 sample count`);
  if (row.repeats !== 25 || !row.independent || !row.preflight || !row.paired_streams) errors.push(`${key}: metadata`);
  if (row.errors !== 0 || row.timeouts !== 0 || row.non2xx !== 0) errors.push(`${key}: request failures`);
}
if (validation.length !== expected.size) errors.push(`expected ${expected.size} validation cells, found ${validation.length}`);
for (const key of expected) {
  if (!V.has(key)) errors.push(`missing validation cell ${key}`);
  if (!P.has(key)) errors.push(`missing primary cell ${key}`);
  const primaryRow = P.get(key);
  if (primaryRow) {
    if (!Array.isArray(primaryRow.rps_samples) || primaryRow.rps_samples.length !== 25) errors.push(`${key}: primary rps sample count`);
    if (primaryRow.repeats !== 25 || !primaryRow.independent || !primaryRow.preflight || !primaryRow.paired_streams) errors.push(`${key}: primary metadata`);
    if (primaryRow.errors !== 0 || primaryRow.timeouts !== 0 || primaryRow.non2xx !== 0) errors.push(`${key}: primary request failures`);
  }
}
if (errors.length) throw new Error(`validation campaign failed admission:\n- ${errors.join("\n- ")}`);

function med(source, layer, engine, endpoint) {
  return median(source.get(`${layer}|${engine}|${endpoint}`).rps_samples);
}
function order(source, engine, endpoint) {
  return LAYERS.map((layer) => ({ layer, rps: med(source, layer, engine, endpoint) }))
    .sort((a, b) => b.rps - a.rps);
}
function spearman(a, b) {
  const ra = new Map(a.map((x, i) => [x.layer, i + 1]));
  const rb = new Map(b.map((x, i) => [x.layer, i + 1]));
  let d2 = 0;
  for (const layer of LAYERS) d2 += (ra.get(layer) - rb.get(layer)) ** 2;
  const n = LAYERS.length;
  return 1 - (6 * d2) / (n * (n * n - 1));
}
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
  if (a.length !== b.length || a.length < 2) throw new Error("paired samples required");
  const random = mulberry32(seed);
  const estimates = [];
  for (let iteration = 0; iteration < iterations; iteration++) {
    const sampledA = [], sampledB = [];
    for (let i = 0; i < a.length; i++) {
      const index = Math.floor(random() * a.length);
      sampledA.push(a[index]); sampledB.push(b[index]);
    }
    estimates.push(median(sampledA) / median(sampledB));
  }
  estimates.sort((x, y) => x - y);
  return [estimates[Math.floor(0.025 * iterations)], estimates[Math.floor(0.975 * iterations)]];
}
function crossStackReversals(source, endpoint, campaignLabel) {
  const out = [];
  for (let i = 0; i < LAYERS.length; i++) for (let j = i + 1; j < LAYERS.length; j++) {
    const a = LAYERS[i], b = LAYERS[j];
    const pgRatio = med(source, a, "postgres", endpoint) / med(source, b, "postgres", endpoint);
    const mysqlRatio = med(source, a, "mysql", endpoint) / med(source, b, "mysql", endpoint);
    if ((pgRatio - 1) * (mysqlRatio - 1) < 0) {
      const pgA = source.get(`${a}|postgres|${endpoint}`).rps_samples;
      const pgB = source.get(`${b}|postgres|${endpoint}`).rps_samples;
      const mysqlA = source.get(`${a}|mysql|${endpoint}`).rps_samples;
      const mysqlB = source.get(`${b}|mysql|${endpoint}`).rps_samples;
      const pgRatioCI = pairedMedianRatioCI(pgA, pgB, seedFor(campaignLabel, endpoint, a, b, "postgres"));
      const mysqlRatioCI = pairedMedianRatioCI(mysqlA, mysqlB, seedFor(campaignLabel, endpoint, a, b, "mysql"));
      const intervalResolved = (pgRatioCI[0] > 1 && mysqlRatioCI[1] < 1)
        || (pgRatioCI[1] < 1 && mysqlRatioCI[0] > 1);
      out.push({
        pair: `${a}|${b}`,
        pgRatio,
        mysqlRatio,
        material: Math.abs(pgRatio - 1) > 0.05 && Math.abs(mysqlRatio - 1) > 0.05,
        pgRatioCI,
        mysqlRatioCI,
        intervalResolved,
      });
    }
  }
  return out.sort((a, b) => a.pair.localeCompare(b.pair));
}

const comparisons = [];
for (const [endpoint, label] of PATTERNS) for (const engine of ENGINES) {
  const primaryOrder = order(P, engine, endpoint);
  const validationOrder = order(V, engine, endpoint);
  const validationRanks = new Map(validationOrder.map((x, i) => [x.layer, i + 1]));
  const primaryRanks = new Map(primaryOrder.map((x, i) => [x.layer, i + 1]));
  const drifts = LAYERS.map((layer) => 100 * (med(V, layer, engine, endpoint) / med(P, layer, engine, endpoint) - 1));
  comparisons.push({
    endpoint,
    label,
    engine,
    primaryLeader: primaryOrder[0].layer,
    validationLeader: validationOrder[0].layer,
    primaryOrder: primaryOrder.map((x) => x.layer),
    validationOrder: validationOrder.map((x) => x.layer),
    spearman: spearman(primaryOrder, validationOrder),
    exactRankMatches: LAYERS.filter((layer) => primaryRanks.get(layer) === validationRanks.get(layer)).length,
    maxAbsoluteMedianDriftPct: Math.max(...drifts.map(Math.abs)),
    medianDriftPctByLayer: Object.fromEntries(LAYERS.map((layer, i) => [layer, drifts[i]])),
  });
}
const reversals = PATTERNS.map(([endpoint, label]) => {
  const primary = crossStackReversals(P, endpoint, "primary");
  const validation = crossStackReversals(V, endpoint, "validation");
  const validationByPair = new Map(validation.map((row) => [row.pair, row]));
  const persistent = primary.filter((row) => validationByPair.has(row.pair));
  const persistentMaterial = persistent.filter((row) => row.material && validationByPair.get(row.pair).material);
  const persistentIntervalResolvedMaterial = persistentMaterial.filter((row) =>
    row.intervalResolved && validationByPair.get(row.pair).intervalResolved);
  return {
    endpoint,
    label,
    primary,
    validation,
    persistentPairs: persistent.map((row) => row.pair),
    persistentMaterialPairs: persistentMaterial.map((row) => row.pair),
    persistentIntervalResolvedMaterialPairs: persistentIntervalResolvedMaterial.map((row) => row.pair),
  };
});
const output = {
  scope: "Descriptive comparison of two corrected-state campaigns on one host. Campaign dates are not paired. Headline reversals must recur, exceed the predeclared plus or minus 5 percent margin on both stacks, and have paired-bootstrap intervals excluding equality in opposite directions in both campaigns. No cross-host transfer is inferred.",
  primaryFile: "current-primary.json",
  validationFile: "rq2-validation-campaign.json",
  validationCells: validation.length,
  repetitionsPerCell: 25,
  comparisons,
  crossBackendRankReversals: reversals,
};
fs.writeFileSync(path.join(resultsDir, "rq2-campaign-comparison.json"), JSON.stringify(output, null, 2) + "\n");

const esc = (value) => value.replaceAll("_", "\\_");
const robustReversalSummary = reversals.flatMap((row) =>
  row.persistentIntervalResolvedMaterialPairs.map((pair) =>
    `${row.label}: \\texttt{${esc(pair.replace("|", " vs. "))}}`));
const robustReversalText = robustReversalSummary.length
  ? robustReversalSummary.join("; ")
  : "none";
const rows = comparisons.map((row) => `    ${row.label} & ${row.engine === "postgres" ? "PG" : "MySQL"} & \\texttt{${esc(row.primaryLeader)}} & \\texttt{${esc(row.validationLeader)}} & ${row.spearman.toFixed(2)} & ${row.exactRankMatches}/7 & ${row.maxAbsoluteMedianDriftPct.toFixed(1)}\\% \\\\`).join("\n");
const tex = `% auto-generated by scripts/gen-rq2-validation-table.mjs
\\begin{table}[htbp]
  \\centering
  \\small
  \\caption{Same-host, between-campaign sensitivity for the reviewer-prioritized RQ2 patterns. Both corrected-state campaigns use 25 repetitions per cell; the validation campaign uses a new block order and environment fingerprint. Leaders and Spearman rank agreement compare campaign medians for the seven portable layers. Exact ranks counts unchanged rank positions; drift is the largest absolute layer-level median-throughput change. A reversal is promoted in RQ2 only when it recurs, both stack-specific pair gaps exceed 5\\%, and paired-bootstrap intervals exclude equality in opposite directions in both campaigns. Pairs meeting all criteria: ${robustReversalText}. Campaign dates are not paired, and this is not cross-host replication.}
  \\label{tab:rq2_cross_campaign}
  \\begin{adjustbox}{max width=\\textwidth}
  \\begin{tabular}{ll ll r r r}
    \\toprule
    Pattern & Stack & Primary leader & Validation leader & $\\rho$ & Exact ranks & max $|\\Delta|$ \\\\
    \\midrule
${rows}
    \\bottomrule
  \\end{tabular}
  \\end{adjustbox}
\\end{table}
`;
fs.writeFileSync(path.join(resultsDir, "tables", "rq2_cross_campaign.tex"), tex);
fs.writeFileSync(path.join(paperDir, "rq2_cross_campaign.tex"), tex);
console.log("wrote rq2-campaign-comparison.json and rq2_cross_campaign.tex");
