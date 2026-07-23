// Rebuild the analysis tables with the engine assignment used by the supplement:
// PostgreSQL for cv_all.tex; MySQL for significance_deep_fetch.tex, resources.tex,
// and cpu_efficiency.tex. bench/analyze.mjs writes common filenames, so simply
// running it twice would leave every file for whichever engine ran last.
import { spawnSync } from 'node:child_process';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const experiments = join(here, '..');
const tables = join(experiments, 'results', 'tables');

function analyze(engine) {
  const result = spawnSync(process.execPath, ['bench/analyze.mjs'], {
    cwd: experiments,
    env: { ...process.env, ENGINE: engine },
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error(`bench/analyze.mjs failed for ${engine} with status ${result.status}`);
  }
}

analyze('postgres');
const postgresCv = await readFile(join(tables, 'cv_all.tex'));
analyze('mysql');
const mysqlCv = await readFile(join(tables, 'cv_all.tex'), 'utf8');
await writeFile(join(tables, 'cv_mysql.tex'),
  mysqlCv.replace('\\label{tab:cv}', '\\label{tab:cv_mysql}'));
await writeFile(join(tables, 'cv_all.tex'), postgresCv);

// This legacy main-text summary is no longer included or mapped in the artifact.
await rm(join(tables, 'resources_main.tex'), { force: true });
console.log('wrote analysis tables: cv_all=PostgreSQL; cv_mysql/significance/resources/cpu=MySQL');
