// Round-6 diagnostic, computed from the SUPERSEDED results/raw.json.
//
// This script formerly also wrote tables/interaction.tex and
// tables/fig_insert_dispersion.tex. Both writes were removed: those tables are
// now owned by generators that read the accepted corrected-state campaign
//
//   interaction.tex            <- scripts/gen-rq2-corrected-tables.mjs
//   fig_insert_dispersion.tex  <- scripts/gen-rq2-insert-figure.mjs
//
// and this script's copies came from raw.json, the superseded pilot. Because
// both wrote the same paths, whichever ran last won, so running this script
// could replace a corrected table with a superseded one without any build
// error (see scripts/check-table-owners.mjs, wired into `make release-check`).
//
// What remains is the ex-MikroORM rank-robustness print (Q6), kept for
// provenance and for the response letter. It reads the superseded campaign by
// design: it describes that campaign. No manuscript number is taken from it.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const resultsDir = join(here, '..', 'results');
const rows = JSON.parse(readFileSync(join(resultsDir, 'raw.json'), 'utf8'));

const PORT = ['knex', 'drizzle', 'prisma', 'sequelize', 'typeorm', 'objection', 'mikroorm'];
const PATS = [['point_read', 'Point read'], ['range_scan', 'Range scan'], ['deep_fetch', 'Deep fetch'], ['aggregation', 'Aggregation'], ['write', 'Insert']];
const samp = (a, e, ep) => { const r = rows.find((x) => x.adapter === a && x.engine === e && x.endpoint === ep); return r ? r.rps_samples : null; };
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

// Q6: ex-MikroORM rank robustness (printed for the prose + response letter)
function spearman(x, y) { const n = x.length; const rx = Array(n), ry = Array(n); [...x.keys()].sort((i, j) => x[i] - x[j]).forEach((i, r) => rx[i] = r); [...y.keys()].sort((i, j) => y[i] - y[j]).forEach((i, r) => ry[i] = r); let d2 = 0; for (let i = 0; i < n; i++) d2 += (rx[i] - ry[i]) ** 2; return 1 - 6 * d2 / (n * (n * n - 1)); }
function kendall(x, y) { const n = x.length; let c = 0, d = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const s = (x[i] - x[j]) * (y[i] - y[j]); if (s > 0) c++; else if (s < 0) d--; } return (c + d) / (c - d || 1); }
const ser = (layers, ep, e) => layers.map((a) => med(samp(a, e, ep)));

console.log('Q6 ex-MikroORM rank robustness (6 layers), SUPERSEDED raw.json:');
for (const [ep] of PATS) {
  const L6 = PORT.filter((a) => a !== 'mikroorm');
  const pg = ser(L6, ep, 'postgres'), my = ser(L6, ep, 'mysql');
  console.log(`  ${ep.padEnd(12)} rho=${spearman(pg, my).toFixed(3)} tau=${kendall(pg, my).toFixed(3)}`);
}
console.log('\nThis script writes no tables. See the header for where interaction.tex and');
console.log('fig_insert_dispersion.tex are generated from the accepted campaign.');
