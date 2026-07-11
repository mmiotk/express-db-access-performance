// Capture the measurement environment into results/environment.txt so the
// paper's "experimental setup" table is reproducible from the artifact. Includes
// code provenance: the git commit the harness ran from and a hash of the exact
// dependency lockfile, so a result file can be tied to the code that produced it.
import { writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import os from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const cpus = os.cpus();
const tryExec = (cmd) => { try { return execSync(cmd, { cwd: here, encoding: 'utf8' }).trim(); } catch { return 'unavailable'; } };
const lockHash = createHash('sha256')
  .update(await readFile(join(here, '..', 'package-lock.json'))).digest('hex');
const lines = [
  `date_utc: ${new Date().toISOString()}`,
  `node: ${process.version}`,
  `platform: ${os.platform()} ${os.release()} (${os.arch()})`,
  `cpu: ${cpus[0]?.model} x${cpus.length}`,
  `mem_total_gb: ${(os.totalmem() / 1024 ** 3).toFixed(1)}`,
  `loadavg: ${os.loadavg().map((x) => x.toFixed(2)).join(' ')}`,
  `git_commit: ${tryExec('git rev-parse HEAD')}${(() => { const st = tryExec('git status --porcelain'); return st && st !== 'unavailable' ? ' (dirty)' : ''; })()}`,
  `package_lock_sha256: ${lockHash}`,
].join('\n');

await writeFile(join(here, '..', 'results', 'environment.txt'), `${lines}\n`);
console.log(lines);
