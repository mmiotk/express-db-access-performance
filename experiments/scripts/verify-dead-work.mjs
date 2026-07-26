// R7 gate: no dead work on the timed path.
//
// Scans every adapter for values acquired and never read. Exits non-zero on any
// finding, so it can gate a campaign the way the specification and write-state
// oracles do. Writes results/dead-work.json as the recorded evidence.

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findDeadWork } from '../bench/dead-work.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const adapterDir = join(here, '..', 'src', 'adapters');
const outPath = join(here, '..', 'results', 'dead-work.json');

const files = readdirSync(adapterDir).filter((f) => f.endsWith('.mjs')).sort();
const findings = [];
for (const fn of files) {
  findings.push(...findDeadWork(readFileSync(join(adapterDir, fn), 'utf8'), { filename: fn }));
}

const report = {
  purpose: 'Static evidence against correct-but-needlessly-slow adapter code (protocol stage R7).',
  scope: 'Single-identifier const/let bindings never read in their enclosing block, and void-discard '
       + 'suppressions. Destructuring and shadowing are not modelled; a clean result is evidence for '
       + 'this class of waste, not for all of it.',
  validated_against: 'bench/fixtures/mikroorm-asa02-before-fix.mjs — the real pre-fix source of finding '
       + 'ASA-02, which this check reports (bench/dead-work.test.mjs).',
  adapters_scanned: files.length,
  findings,
};
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

if (findings.length) {
  console.error(`DEAD WORK on the timed path (${findings.length}):`);
  for (const f of findings) console.error(`  ${f.filename}:${f.line}  ${f.name}  ${f.snippet}`);
  process.exit(1);
}
console.log(`ALL ADAPTERS CLEAN — ${files.length} scanned, 0 dead-work findings (results/dead-work.json)`);
