// Verify an extracted accepted-campaign source snapshot against the
// SOURCE-MANIFEST.json embedded in that snapshot.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? '.');
const manifest = JSON.parse(await readFile(path.join(root, 'SOURCE-MANIFEST.json'), 'utf8'));
const failures = [];
const aggregate = createHash('sha256');

for (const record of manifest.files) {
  let bytes;
  try {
    bytes = await readFile(path.join(root, record.file));
  } catch {
    failures.push(`${record.file}: missing`);
    continue;
  }
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (bytes.length !== record.bytes || sha256 !== record.sha256) {
    failures.push(`${record.file}: expected ${record.bytes}/${record.sha256}, got ${bytes.length}/${sha256}`);
  }
  aggregate.update(record.file).update('\0').update(record.sha256).update('\n');
}

const aggregateSha256 = aggregate.digest('hex');
if (aggregateSha256 !== manifest.aggregate_sha256) {
  failures.push(`aggregate: expected ${manifest.aggregate_sha256}, got ${aggregateSha256}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`${manifest.campaign_id}: ${manifest.files.length}/${manifest.files.length} files exact; aggregate ${aggregateSha256}`);
