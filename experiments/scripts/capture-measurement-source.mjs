// Capture hashes of the code and schemas that define a measurement campaign.
// This supplements a dirty-worktree commit ID with the exact relevant bytes.
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const campaign = process.env.CAMPAIGN_ID ?? 'measurement';
const campaignScript = process.env.CAMPAIGN_SCRIPT ?? 'scripts/rq2-campaign2.sh';
const fixed = [
  'bench/environment.mjs',
  'bench/runner.mjs',
  'bench/stats.mjs',
  'bench/verify-campaign-state.mjs',
  'bench/verify-seed-parity.mjs',
  'bench/verify.mjs',
  'bench/verify-property.mjs',
  'bench/verify-spec.mjs',
  'bench/verify-writes.mjs',
  'campaign-state.json',
  'package.json',
  'package-lock.json',
  'prisma/schema.mysql.prisma',
  'prisma/schema.postgres.prisma',
  'scripts/db-local.sh',
  'scripts/make-seed-template.mjs',
  'scripts/capture-measurement-source.mjs',
  campaignScript,
  'scripts/seed-fanout.mjs',
  'scripts/set-durability.mjs',
  'seed-parity.json',
  'semantic-equivalence.json',
  'spec-oracle.json',
  'src/config.mjs',
  'src/migrate.mjs',
  'src/seed.mjs',
  'src/server.mjs',
  'src/seed-spec.mjs',
  'write-admission.json',
];
const adapters = (await readdir(path.join(root, 'src', 'adapters')))
  .filter((name) => name.endsWith('.mjs'))
  .sort()
  .map((name) => `src/adapters/${name}`);
const files = [...fixed, ...adapters].sort();
const records = [];
for (const file of files) {
  const bytes = await readFile(path.join(root, file));
  records.push({
    file,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
}
const aggregate = createHash('sha256');
for (const record of records) {
  aggregate.update(record.file).update('\0').update(record.sha256).update('\n');
}
const output = {
  schema_version: 1,
  campaign_id: campaign,
  note: 'Exact hashes of measurement, semantic-admission, database-setup, and state-control source plus the pre-campaign admission evidence; documentation and table renderers are intentionally excluded.',
  aggregate_sha256: aggregate.digest('hex'),
  files: records,
};
const target = path.join(root, 'results', `source-manifest-${campaign}.json`);
await writeFile(target, JSON.stringify(output, null, 2) + '\n');
console.log(`${output.aggregate_sha256}  ${path.relative(root, target)} (${records.length} files)`);
