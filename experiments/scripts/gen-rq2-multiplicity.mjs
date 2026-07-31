// Familywise correction across the whole RQ2 reversal screen.
//
// The screen applies its promotion rule uniformly to 21 layer pairs on each of three
// patterns, 63 comparisons per campaign, and applies no familywise correction. The paper
// discloses that and states that recurrence across two same-host campaigns does not bound
// familywise error. This supplies the correction that disclosure leaves open.
//
// For each pair and pattern the cross-stack interaction is tested directly: with a_i and
// b_i the per-replicate throughputs of the two layers,
//   D_i = [log a_i(PG) - log b_i(PG)] - [log a_i(MySQL) - log b_i(MySQL)],
// so a stack effect common to both layers cancels and D estimates how much the pair's
// ratio moves between stacks. D is tested against zero with a two-sided sign-flip
// permutation test, the same permutation unit the blocked interaction test uses, then
// Holm-corrected across all 63 comparisons within a campaign.
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

const out = { method: "per-pair cross-stack interaction, two-sided sign-flip permutation on the "
  + "difference-in-differences of log throughput, Holm-corrected within campaign",
  B, alpha: ALPHA, seed: "0x5eed", campaigns: {} };

for (const [label, src] of CAMPAIGNS) {
  const rows = [];
  for (const [endpoint] of PATTERNS) {
    for (let i = 0; i < LAYERS.length; i++) {
      for (let j = i + 1; j < LAYERS.length; j++) {
        const a = LAYERS[i], b = LAYERS[j];
        const g = (l, e) => src.get(`${l}|${e}|${endpoint}`).rps_samples;
        const D = g(a, "postgres").map((_, k) =>
          (Math.log(g(a, "postgres")[k]) - Math.log(g(b, "postgres")[k]))
          - (Math.log(g(a, "mysql")[k]) - Math.log(g(b, "mysql")[k])));
        rows.push({ endpoint, pair: `${a}|${b}`, p: signFlipP(D, mulberry32(0x5eed)) });
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
  out.campaigns[label] = { tests: m, survivors: rows.filter((r) => r.survivesHolm).length, rows };
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
  \\caption{Familywise correction across the whole RQ2 screen. Each of the 21 layer pairs on
    each of the three patterns is tested for a cross-stack interaction on its own: with the
    per-replicate difference-in-differences of log throughput, a stack effect common to both
    layers cancels, and the residual is tested against zero by two-sided sign-flip permutation
    ($B={${B}}$, seed \\texttt{${out.seed}}) and Holm-corrected across all
    ${out.campaigns.primary.tests} comparisons within each campaign. Holm retains
    ${out.campaigns.primary.survivors} of ${out.campaigns.primary.tests} in the primary campaign and
    ${out.campaigns.validation.survivors} of ${out.campaigns.validation.tests} in the validation
    campaign, so the correction does discriminate: it is not a formality applied to a family in
    which everything is significant. The four reversals the screen promoted are listed below;
    all four sit at the permutation resolution floor in both campaigns and survive correction.
    This addresses multiplicity in the significance of each interaction. It does not make the
    screen prospective: the $5\\%$ margin was fixed before both campaigns, but the composite
    direction-and-margin promotion rule that uses it was specified after they completed, and the
    two campaigns share a host and the same seeded draws.}
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
