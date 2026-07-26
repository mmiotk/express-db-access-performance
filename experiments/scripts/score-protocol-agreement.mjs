// Inter-rater agreement for the external protocol audit.
//
// Reads experiments/external-protocol-audit.json, which stores the primary
// rater's judgements in study.coding and any additional rater's in
// study.additional_codings[raterId]. For every pair of raters with overlapping
// judgements it reports percent agreement and Cohen's kappa, both overall and
// per protocol stage, and writes results/protocol-audit-agreement.json.
//
// With only the primary rater present the script is a no-op that reports why
// agreement is not computable, so it is safe to run in CI before any external
// rater has returned a packet.
//
// Usage:  node scripts/score-protocol-agreement.mjs [--write]
//         --write also stamps audit.agreement back into the audit file.

import fs from 'node:fs';
import path from 'node:path';
import {
  cohensKappa, percentAgreement, chanceAgreement, pabak, kappaBootstrapCI,
} from '../bench/stats.mjs';

// Kappa is unstable when items are few or the marginals are skewed. On this corpus
// the per-stage slices are n = 9 and one stage has p_e = 0.80, where a single
// disagreement moves kappa by ~0.7 while observed agreement changes by 1/9. Per-stage
// kappa is therefore emitted with a reliability flag, and the pooled figure over all
// 63 judgements is the headline. PABAK is reported alongside because it does not
// collapse under skewed marginals.
const MIN_N = 20;
const MAX_PE = 0.7;
const BOOT_SEED = 20260726;

// mulberry32: seeded so bootstrap intervals are reproducible across runs.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function agreementBlock(a, b, { bootstrap = false } = {}) {
  const n = a.length;
  const pe = chanceAgreement(a, b);
  const reliable = n >= MIN_N && pe !== null && pe <= MAX_PE;
  const block = {
    n,
    percent_agreement: percentAgreement(a, b),
    cohens_kappa: cohensKappa(a, b),
    chance_agreement: pe,
    pabak: pabak(a, b),
    kappa_reliable: reliable,
  };
  if (!reliable) {
    block.kappa_caveat = n < MIN_N
      ? `n=${n} < ${MIN_N}: kappa is unstable at this sample size; read percent agreement and PABAK.`
      : `chance agreement ${pe.toFixed(2)} > ${MAX_PE}: skewed marginals make kappa uninterpretable (kappa paradox); read PABAK.`;
  }
  if (bootstrap) {
    block.kappa_ci95 = kappaBootstrapCI(a, b, { B: 5000, rand: mulberry32(BOOT_SEED) });
  }
  return block;
}

const root = path.resolve(import.meta.dirname, '..');
const auditPath = path.join(root, 'external-protocol-audit.json');
const outPath = path.join(root, 'results', 'protocol-audit-agreement.json');
const write = process.argv.includes('--write');

const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
const stages = audit.stages;
const codes = audit.allowed_codes;
const primaryId = audit.primary_rater ?? audit.raters?.[0]?.id ?? audit.rater.id;

/** Judgements of one rater as a Map keyed by `${studyId}/${stage}`. */
function codingsOf(raterId) {
  const out = new Map();
  for (const study of audit.studies) {
    const source = raterId === primaryId
      ? study.coding
      : study.additional_codings?.[raterId];
    if (!source) continue;
    for (const stage of stages) {
      const judgement = source[stage];
      if (judgement?.code) out.set(`${study.id}/${stage}`, judgement.code);
    }
  }
  return out;
}

const raters = audit.raters ?? [{ id: primaryId, role: 'primary' }];
const coded = raters
  .map((r) => ({ rater: r, codings: codingsOf(r.id) }))
  .filter((r) => r.codings.size > 0);

const pairs = [];
for (let i = 0; i < coded.length; i += 1) {
  for (let j = i + 1; j < coded.length; j += 1) {
    const [x, y] = [coded[i], coded[j]];
    const keys = [...x.codings.keys()].filter((k) => y.codings.has(k)).sort();
    if (keys.length === 0) continue;

    const a = keys.map((k) => x.codings.get(k));
    const b = keys.map((k) => y.codings.get(k));

    const perStage = {};
    for (const stage of stages) {
      const idx = keys.map((k, n) => (k.endsWith(`/${stage}`) ? n : -1)).filter((n) => n >= 0);
      if (idx.length === 0) continue;
      perStage[stage] = agreementBlock(idx.map((n) => a[n]), idx.map((n) => b[n]));
    }

    const disagreements = keys
      .map((k, n) => ({ item: k, [x.rater.id]: a[n], [y.rater.id]: b[n] }))
      .filter((_, n) => a[n] !== b[n]);

    // Blindness/independence asymmetry matters for interpretation: agreement with a
    // non-blind rater who also designed the codebook estimates agreement *with that
    // rater*, not codebook reliability in general.
    const bothBlind = Boolean(x.rater.blind_to_results && y.rater.blind_to_results);
    const bothIndependent = Boolean(
      x.rater.independent_of_manuscript && y.rater.independent_of_manuscript,
    );

    pairs.push({
      raters: [x.rater.id, y.rater.id],
      both_independent_of_manuscript: bothIndependent,
      both_blind_to_results: bothBlind,
      licence: bothIndependent && bothBlind
        ? 'Estimates codebook reliability between two independent blind raters.'
        : 'One rater is not independent of the manuscript and/or not result-blind, so this '
          + 'estimates agreement with that rater, not codebook reliability in general.',
      headline: 'pooled — per_stage figures are descriptive only',
      pooled: agreementBlock(a, b, { bootstrap: true }),
      per_stage: perStage,
      disagreements,
    });
  }
}

// Marginal distribution of the primary rater's codes. Reported because it bounds what
// any agreement statistic can mean: a code never awarded cannot be agreed or disagreed
// on, and heavily skewed marginals drive the kappa paradox flagged per stage below.
const codeDistribution = Object.fromEntries(codes.map((c) => [c, 0]));
for (const study of audit.studies) {
  for (const stage of stages) codeDistribution[study.coding[stage].code] += 1;
}
const neverAwarded = codes.filter((c) => codeDistribution[c] === 0);

const report = {
  audit_id: audit.audit_id,
  generated_from: 'external-protocol-audit.json',
  codebook: audit.codebook,
  allowed_codes: codes,
  code_distribution: codeDistribution,
  codes_never_awarded: neverAwarded,
  code_distribution_note: neverAwarded.length
    ? `Codes never awarded by the primary rater: ${neverAwarded.join(', ')}. `
      + 'Agreement statistics cannot speak to categories no rater used, and the '
      + "codebook's discriminative range is untested at that end of the scale."
    : 'All codes were used at least once.',
  raters_with_codings: coded.map((r) => ({ id: r.rater.id, judgements: r.codings.size })),
  pairwise: pairs,
  status: pairs.length === 0
    ? 'not_computable: fewer than two raters have recorded judgements. '
      + 'A blank coding form for the 63 judgements is at notes/reviewer-packets/protocol-audit-blind.md.'
    : 'computed',
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

if (write) {
  const best = pairs.find((p) => p.both_independent_of_manuscript) ?? pairs[0];
  audit.agreement = {
    ...audit.agreement,
    statistic: best ? best.pooled.cohens_kappa : null,
    kappa_ci95: best ? best.pooled.kappa_ci95 : null,
    pabak: best ? best.pooled.pabak : null,
    percent_agreement: best ? best.pooled.percent_agreement : null,
    licence: best ? best.licence : null,
    status: report.status,
    computed_by: 'scripts/score-protocol-agreement.mjs',
    output: 'results/protocol-audit-agreement.json',
    blank_form: 'notes/reviewer-packets/protocol-audit-blind.md',
  };
  fs.writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`);
}

console.log(JSON.stringify({
  status: report.status,
  code_distribution: report.code_distribution,
  raters_with_codings: report.raters_with_codings,
  pairwise: pairs.map((p) => ({
    raters: p.raters,
    licence: p.licence,
    pooled: p.pooled,
    unreliable_stages: Object.entries(p.per_stage)
      .filter(([, v]) => !v.kappa_reliable)
      .map(([k, v]) => `${k}: ${v.kappa_caveat}`),
  })),
  wrote: path.relative(root, outPath),
}, null, 2));
