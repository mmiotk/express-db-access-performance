// Familywise correction across the whole RQ2 reversal screen.
//
// The screen applies its promotion rule uniformly to 21 layer pairs on each of three
// patterns, 63 comparisons per campaign, and applies no familywise correction. The paper
// discloses that and states that recurrence across two same-host campaigns does not bound
// familywise error. This supplies the correction that disclosure leaves open.
//
// The correction has to match the claim. An earlier version tested the cross-stack
// interaction, D_i = [log a_i(PG) - log b_i(PG)] - [log a_i(MySQL) - log b_i(MySQL)],
// against zero. That hypothesis is IMPLIED by the promotion rule rather than equal to it:
// two intervals on opposite sides of parity already entail a non-zero interaction, so
// certifying it adds no protection against selection over 63 composite screens.
//
// What the rule actually claims is a conjunction: the pair's ratio differs from 1 on
// PostgreSQL AND on MySQL, in opposite directions, by more than the margin. A conjunction
// is tested by intersection-union: each component is tested separately and the combined
// p-value is the MAXIMUM of the component p-values, with no multiplicity penalty inside
// the conjunction. So each stack's per-replicate log ratios are tested against zero by
// two-sided sign-flip permutation, the two are combined by max, Holm-corrected across all
// 63 comparisons within a campaign, and the direction and margin filters are then applied.
//
// NOTE for anyone extending this: do not route D through pairedPermutation(). That
// function forms log ratios of its two arguments internally, so passing (D, zeros) takes
// log(D/0) and reports every comparison at the resolution floor. That mistake produced a
// clean-looking "63 of 63 significant" result before a sanity check on effect sizes
// (|t| ranged 0.2 to 63) exposed it.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const resultsDir = path.join(root, "results");
const paperDir = path.resolve(root, "..", "paper", "tables");

const LAYERS = ["knex", "drizzle", "prisma", "sequelize", "typeorm", "objection", "mikroorm"];
const PATTERNS = [["deep_fetch", "Deep fetch"], ["aggregation", "Aggregation"], ["write", "Insert"]];
const B = 20000;
const ALPHA = 0.05;

function mulberry32(a) {
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
// Per-test seed, derived from the test's identity. A single shared seed would give every
// comparison the identical sequence of sign-flip patterns, so their Monte Carlo errors
// would be perfectly comonotone and the survivor count would carry less independent
// information than it appears to. Deriving the seed keeps each run reproducible while
// making the 63 tests independent draws.
function seedFor(...parts) {
  let hash = 2166136261;
  for (const ch of parts.join("|")) { hash ^= ch.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}
function signFlipP(D, rand) {
  const obs = Math.abs(D.reduce((x, y) => x + y, 0) / D.length);
  let ge = 0;
  for (let b = 0; b < B; b++) {
    let s = 0;
    for (const d of D) s += rand() < 0.5 ? -d : d;
    if (Math.abs(s / D.length) >= obs - 1e-15) ge++;
  }
  return (ge + 1) / (B + 1);
}

const index = (rows) => new Map(rows.map((r) => [`${r.adapter}|${r.engine}|${r.endpoint}`, r]));
const load = (f) => index(JSON.parse(fs.readFileSync(path.join(resultsDir, f), "utf8")));
const CAMPAIGNS = [
  ["primary", load("current-primary.json")],
  ["validation", load("rq2-validation-campaign.json")],
];

const out = { method: "per-stack two-sided sign-flip permutation on per-replicate log ratios, "
  + "combined across stacks by intersection-union (larger p), Holm-corrected across all 63 "
  + "pair-pattern screens within a campaign; the direction and margin filters are applied to the "
  + "survivors and are NOT part of the corrected family",
  B, alpha: ALPHA, seed: "per-test, FNV-1a of campaign|pattern|pair|engine", campaigns: {} };

for (const [label, src] of CAMPAIGNS) {
  const rows = [];
  for (const [endpoint] of PATTERNS) {
    for (let i = 0; i < LAYERS.length; i++) {
      for (let j = i + 1; j < LAYERS.length; j++) {
        const a = LAYERS[i], b = LAYERS[j];
        const g = (l, e) => src.get(`${l}|${e}|${endpoint}`).rps_samples;
        const logRatios = (e) => g(a, e).map((_, k) => Math.log(g(a, e)[k]) - Math.log(g(b, e)[k]));
        const mean = (xs) => xs.reduce((x, y) => x + y, 0) / xs.length;
        const pPG = signFlipP(logRatios("postgres"), mulberry32(seedFor(label, endpoint, a, b, "postgres")));
        const pMY = signFlipP(logRatios("mysql"), mulberry32(seedFor(label, endpoint, a, b, "mysql")));
        const ratioPG = Math.exp(mean(logRatios("postgres")));
        const ratioMY = Math.exp(mean(logRatios("mysql")));
        rows.push({
          endpoint, pair: `${a}|${b}`,
          pPostgres: pPG, pMysql: pMY,
          p: Math.max(pPG, pMY),                       // intersection-union
          ratioPostgres: +ratioPG.toFixed(4), ratioMysql: +ratioMY.toFixed(4),
          opposite: (ratioPG - 1) * (ratioMY - 1) < 0,
          bothExceedMargin: Math.abs(ratioPG - 1) > 0.05 && Math.abs(ratioMY - 1) > 0.05,
        });
      }
    }
  }
  rows.sort((x, y) => x.p - y.p);
  const m = rows.length;
  let stillRejecting = true;
  rows.forEach((r, k) => {
    r.holmThreshold = ALPHA / (m - k);
    r.survivesHolm = stillRejecting && r.p <= r.holmThreshold;
    if (!r.survivesHolm) stillRejecting = false;
  });
  const selected = rows.filter((r) => r.survivesHolm && r.opposite && r.bothExceedMargin);
  out.campaigns[label] = {
    tests: m,
    survivors: rows.filter((r) => r.survivesHolm).length,
    selectedAfterFilters: selected.map((r) => `${r.endpoint}:${r.pair}`),
    rows,
  };
}

// The four the screen promoted, so the caption can state their corrected status rather
// than assert that correction "changes nothing".
const PROMOTED = [["deep_fetch", "prisma|sequelize"], ["deep_fetch", "prisma|objection"],
                  ["aggregation", "prisma|objection"], ["write", "prisma|mikroorm"]];
const statusOf = (label, endpoint, pair) =>
  out.campaigns[label].rows.find((r) => r.endpoint === endpoint && r.pair === pair);
out.promoted = PROMOTED.map(([endpoint, pair]) => ({
  endpoint, pair,
  primary: statusOf("primary", endpoint, pair),
  validation: statusOf("validation", endpoint, pair),
}));
const allSurvive = out.promoted.every((x) => x.primary.survivesHolm && x.validation.survivesHolm);
out.allPromotedSurviveHolm = allSurvive;

fs.writeFileSync(path.join(resultsDir, "rq2-multiplicity.json"), JSON.stringify(out, null, 2) + "\n");

const label = { deep_fetch: "Deep fetch", aggregation: "Aggregation", write: "Insert" };
const rowsTex = out.promoted.map((x) =>
  `    ${label[x.endpoint]} & \\texttt{${x.pair.replace("|", "} vs \\texttt{")}} `
  + `& $${x.primary.p.toExponential(1).replace("e-5", "{\\times}10^{-5}")}$ `
  + `& $${x.validation.p.toExponential(1).replace("e-5", "{\\times}10^{-5}")}$ `
  + `& ${x.primary.survivesHolm && x.validation.survivesHolm ? "yes" : "no"} \\\\`).join("\n");

const tex = `% auto-generated by scripts/gen-rq2-multiplicity.mjs
\\begin{table}[htbp]
  \\centering
  \\caption{Familywise correction matched to the promotion rule. The rule claims a
    \\emph{conjunction}: the pair's throughput ratio differs from~1 on PostgreSQL and on MySQL, in
    opposite directions, by more than the margin. A conjunction is tested by intersection-union, so
    each stack's per-replicate log ratios are tested against zero by two-sided sign-flip permutation
    ($B={${B}}$, per-test seeds derived from campaign, pattern, pair and engine), the two combined by taking the larger $p$, and the
    result Holm-corrected across all ${out.campaigns.primary.tests} pair-pattern screens in a
    campaign. Correcting the cross-stack interaction instead would certify a hypothesis the rule
    already implies, and so would not cover the selection. Holm retains
    ${out.campaigns.primary.survivors} of ${out.campaigns.primary.tests} screens in the primary
    campaign and ${out.campaigns.validation.survivors} of ${out.campaigns.validation.tests} in the
    validation campaign; applying the direction and margin filters to the survivors leaves exactly
    the ${out.campaigns.primary.selectedAfterFilters.length} pairs the screen promoted in the primary
    campaign, and those ${out.campaigns.primary.selectedAfterFilters.length} plus
    \\texttt{prisma} versus \\texttt{sequelize} on insert in the validation campaign, which the
    recurrence requirement excludes. Two limits. Each promoted $p$ is at the permutation resolution
    floor $1/(B{+}1)=5.0{\\times}10^{-5}$, sixteen-fold below the strictest Holm threshold
    $0.05/${out.campaigns.primary.tests}$, so surviving correction follows from the floor rather
    than being tested by it. And correction does not make the screen prospective: the
    $5\\%$ margin was fixed before both campaigns, but the composite rule using it was specified
    after they completed, and the two campaigns share a host and the same seeded draws.}
  \\label{tab:rq2_multiplicity}
  \\begin{tabular}{l l r r c}
    \\toprule
    Pattern & Promoted pair & primary & validation & Holm \\\\
    & & $p$ & $p$ & \\\\
    \\midrule
${rowsTex}
    \\bottomrule
  \\end{tabular}
\\end{table}
`;
for (const dir of [path.join(resultsDir, "tables"), paperDir]) {
  fs.writeFileSync(path.join(dir, "rq2_multiplicity.tex"), tex);
}
console.log(`primary: ${out.campaigns.primary.survivors}/${out.campaigns.primary.tests} survive Holm`);
console.log(`validation: ${out.campaigns.validation.survivors}/${out.campaigns.validation.tests} survive Holm`);
console.log(`all four promoted survive in both campaigns: ${allSurvive}`);
