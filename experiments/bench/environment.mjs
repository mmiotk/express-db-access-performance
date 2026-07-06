// Capture the measurement environment into results/environment.txt so the
// paper's "experimental setup" table is reproducible from the artifact.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import os from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const cpus = os.cpus();
const lines = [
  `date_utc: ${new Date().toISOString()}`,
  `node: ${process.version}`,
  `platform: ${os.platform()} ${os.release()} (${os.arch()})`,
  `cpu: ${cpus[0]?.model} x${cpus.length}`,
  `mem_total_gb: ${(os.totalmem() / 1024 ** 3).toFixed(1)}`,
  `loadavg: ${os.loadavg().map((x) => x.toFixed(2)).join(' ')}`,
].join('\n');

await writeFile(join(here, '..', 'results', 'environment.txt'), `${lines}\n`);
console.log(lines);
