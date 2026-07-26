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
import { cohensKappa, percentAgreement } from '../bench/stats.mjs';

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
      const sa = idx.map((n) => a[n]);
      const sb = idx.map((n) => b[n]);
      perStage[stage] = {
        n: idx.length,
        percent_agreement: percentAgreement(sa, sb),
        cohens_kappa: cohensKappa(sa, sb),
      };
    }

    const disagreements = keys
      .map((k, n) => ({ item: k, [x.rater.id]: a[n], [y.rater.id]: b[n] }))
      .filter((_, n) => a[n] !== b[n]);

    pairs.push({
      raters: [x.rater.id, y.rater.id],
      both_independent_of_manuscript: Boolean(
        x.rater.independent_of_manuscript && y.rater.independent_of_manuscript,
      ),
      n_overlapping_judgements: keys.length,
      percent_agreement: percentAgreement(a, b),
      cohens_kappa: cohensKappa(a, b),
      per_stage: perStage,
      disagreements,
    });
  }
}

const report = {
  audit_id: audit.audit_id,
  generated_from: 'external-protocol-audit.json',
  codebook: audit.codebook,
  allowed_codes: codes,
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
    statistic: best ? best.cohens_kappa : null,
    percent_agreement: best ? best.percent_agreement : null,
    status: report.status,
    computed_by: 'scripts/score-protocol-agreement.mjs',
    output: 'results/protocol-audit-agreement.json',
    blank_form: 'notes/reviewer-packets/protocol-audit-blind.md',
  };
  fs.writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`);
}

console.log(JSON.stringify({
  status: report.status,
  raters_with_codings: report.raters_with_codings,
  pairwise: pairs.map((p) => ({
    raters: p.raters,
    n: p.n_overlapping_judgements,
    percent_agreement: p.percent_agreement,
    cohens_kappa: p.cohens_kappa,
  })),
  wrote: path.relative(root, outPath),
}, null, 2));
