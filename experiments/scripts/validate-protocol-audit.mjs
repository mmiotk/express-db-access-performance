import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const input = path.join(root, 'external-protocol-audit.json');
const audit = JSON.parse(fs.readFileSync(input, 'utf8'));
const allowed = new Set(audit.allowed_codes);
const expectedStages = audit.stages;

if (audit.studies.length < 8 || audit.studies.length > 12) {
  throw new Error(`Expected an 8-12 study corpus; got ${audit.studies.length}`);
}

// Rater roster. The schema keeps the primary rater's judgements in study.coding
// and any additional rater's in study.additional_codings[raterId], so adding a
// second rater cannot perturb the primary record.
const raters = audit.raters ?? [{ id: audit.rater.id, role: 'primary' }];
const primaryId = audit.primary_rater ?? raters[0].id;
const rosterIds = new Set(raters.map((r) => r.id));
if (!rosterIds.has(primaryId)) {
  throw new Error(`primary_rater ${primaryId} is not in the rater roster`);
}

function checkJudgement(where, judgement) {
  if (!judgement) throw new Error(`${where}: missing judgement`);
  if (!allowed.has(judgement.code)) {
    throw new Error(`${where}: invalid code ${judgement.code}`);
  }
  for (const field of ['locator', 'evidence']) {
    if (!judgement[field]?.trim()) throw new Error(`${where}: missing ${field}`);
  }
}

const ids = new Set();
const counts = Object.fromEntries(expectedStages.map((stage) => [
  stage,
  Object.fromEntries([...allowed].map((code) => [code, 0])),
]));
const judgementsPerRater = Object.fromEntries([...rosterIds].map((id) => [id, 0]));

for (const study of audit.studies) {
  if (ids.has(study.id)) throw new Error(`Duplicate study id: ${study.id}`);
  ids.add(study.id);
  for (const stage of expectedStages) {
    const judgement = study.coding[stage];
    checkJudgement(`${study.id}/${stage}`, judgement);
    counts[stage][judgement.code] += 1;
    judgementsPerRater[primaryId] += 1;
  }

  // Additional raters may be partial (a rater who coded only some studies is
  // still usable for agreement on the overlap), but every judgement present
  // must be complete and must name a rater on the roster.
  for (const [raterId, coding] of Object.entries(study.additional_codings ?? {})) {
    if (!rosterIds.has(raterId)) {
      throw new Error(`${study.id}: coding by unregistered rater ${raterId}`);
    }
    if (raterId === primaryId) {
      throw new Error(`${study.id}: primary rater must code in study.coding, not additional_codings`);
    }
    for (const [stage, judgement] of Object.entries(coding)) {
      if (!expectedStages.includes(stage)) {
        throw new Error(`${study.id}/${raterId}: unknown stage ${stage}`);
      }
      checkJudgement(`${study.id}/${raterId}/${stage}`, judgement);
      judgementsPerRater[raterId] += 1;
    }
  }
}

const independentRaters = raters.filter((r) => r.independent_of_manuscript);

console.log(JSON.stringify({
  audit_id: audit.audit_id,
  studies: audit.studies.length,
  stages: expectedStages.length,
  rater_count: raters.length,
  primary_rater: primaryId,
  independent_rater_count: independentRaters.length,
  judgements_per_rater: judgementsPerRater,
  agreement_status: audit.agreement?.status ?? 'not recorded',
  counts,
}, null, 2));
