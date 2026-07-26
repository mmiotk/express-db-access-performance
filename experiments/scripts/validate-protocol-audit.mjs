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

const ids = new Set();
const counts = Object.fromEntries(expectedStages.map((stage) => [
  stage,
  Object.fromEntries([...allowed].map((code) => [code, 0])),
]));

for (const study of audit.studies) {
  if (ids.has(study.id)) throw new Error(`Duplicate study id: ${study.id}`);
  ids.add(study.id);
  for (const stage of expectedStages) {
    const judgement = study.coding[stage];
    if (!judgement) throw new Error(`${study.id}: missing ${stage}`);
    if (!allowed.has(judgement.code)) {
      throw new Error(`${study.id}/${stage}: invalid code ${judgement.code}`);
    }
    for (const field of ['locator', 'evidence']) {
      if (!judgement[field]?.trim()) {
        throw new Error(`${study.id}/${stage}: missing ${field}`);
      }
    }
    counts[stage][judgement.code] += 1;
  }
}

console.log(JSON.stringify({
  audit_id: audit.audit_id,
  studies: audit.studies.length,
  rater_count: audit.rater.count,
  independent: audit.rater.independent_of_manuscript,
  counts,
}, null, 2));
