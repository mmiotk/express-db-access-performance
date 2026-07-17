// R5 numbers dump: every manuscript-relevant figure from the final dataset,
// written to notes/r5-numbers.md for the propagation pass.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const R = (f) => JSON.parse(readFileSync(join(here, '..', 'results', f), 'utf8'));
const raw = R('raw.json');
const cell = (a, e, ep) => raw.find((r) => r.adapter === a && r.engine === e && r.endpoint === ep);
const ORMS = ['knex', 'drizzle', 'prisma', 'sequelize', 'typeorm', 'objection', 'mikroorm'];
const PATTERNS = ['point_read', 'range_scan', 'deep_fetch', 'aggregation', 'write'];
const rank = (e, ep) => {
  const nat = e === 'postgres' ? 'pg' : 'mysql2';
  return [nat, ...ORMS].map((a) => [a, cell(a, e, ep)?.rps]).filter((x) => x[1]).sort((a, b) => b[1] - a[1]);
};
const spearman = (xs, ys) => {
  const rk = (v) => { const s = [...v].map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]); const r = Array(v.length); s.forEach(([, i], j) => (r[i] = j + 1)); return r; };
  const rx = rk(xs), ry = rk(ys); const n = xs.length; const d2 = rx.reduce((s, _, i) => s + (rx[i] - ry[i]) ** 2, 0);
  return 1 - (6 * d2) / (n * (n * n - 1));
};
let out = '# R5 final numbers (auto-dumped from results/)\n\n';
out += '## Per-pattern rankings + spreads (rps, n=25)\n';
for (const e of ['postgres', 'mysql']) {
  out += `\n### ${e}\n`;
  for (const ep of PATTERNS) {
    const r = rank(e, ep); if (!r.length) continue;
    const nat = r[0][0] === (e === 'postgres' ? 'pg' : 'mysql2') ? r[0][1] : cell(e === 'postgres' ? 'pg' : 'mysql2', e, ep)?.rps;
    const natrel = (cell(e === 'postgres' ? 'pg' : 'mysql2', e, ep).rps / Math.min(...ORMS.map((a) => cell(a, e, ep)?.rps).filter(Boolean))).toFixed(2);
    const maxmin = (r[0][1] / r[r.length - 1][1]).toFixed(2);
    out += `- **${ep}**: native-rel ${natrel}x, max/min ${maxmin}x | ${r.map(([a, v]) => `${a} ${v}`).join(' > ')}\n`;
  }
}
out += '\n## CPU (app %, n=25) — the key change (was Prisma ~498%)\n';
out += `- MAX app-CPU across all 90 cells: ${Math.max(...raw.map((r) => r.cpu_pct || 0))}%\n`;
for (const e of ['postgres', 'mysql']) {
  const p = cell('prisma', e, 'deep_fetch'); const nat = cell(e === 'postgres' ? 'pg' : 'mysql2', e, 'deep_fetch');
  out += `- ${e} deep_fetch: prisma cpu=${p.cpu_pct}% (db ${p.db_cpu_pct ?? '?'}%), native cpu=${nat.cpu_pct}% (db ${nat.db_cpu_pct ?? '?'}%)\n`;
}
out += '\n## Read-vs-write engine transfer (Spearman rho over 7 portable layers)\n';
for (const ep of PATTERNS) {
  const xs = ORMS.map((a) => cell(a, 'postgres', ep)?.rps), ys = ORMS.map((a) => cell(a, 'mysql', ep)?.rps);
  if (xs.every(Boolean) && ys.every(Boolean)) out += `- ${ep}: rho=${spearman(xs, ys).toFixed(2)}\n`;
}
out += '\n## Equal-CPU control (rps at 1/2/4 cores) — was Prisma 896->3025\n';
try { const eq = R('equalcpu.json'); const by = {}; for (const r of eq) (by[r.adapter] ??= {})[r.cores] = r.rps;
  for (const a of Object.keys(by)) out += `- ${a}: 1core ${by[a]['1core']}, 2core ${by[a]['2core']}, 4core ${by[a]['4core']}\n`; } catch (e) { out += `  (equalcpu: ${e.message})\n`; }
out += '\n## Utilization (deep-fetch p99 ms at 50/70/85/95% of own capacity)\n';
for (const eng of ['postgres', 'mysql']) {
  try { const u = R(`utilization.${eng}.json`); out += `\n### ${eng}\n`;
    const byA = {}; for (const r of u) (byA[r.adapter] ??= []).push([r.fraction, r.p99_med]);
    for (const a of Object.keys(byA)) out += `- ${a}: ${byA[a].map(([f, p]) => `${Math.round(f * 100)}%->${p}ms`).join(' ')}\n`;
  } catch (e) { out += `  (${eng}: ${e.message})\n`; }
}
out += '\n## Same-SQL control (sameplan.json: idiomatic vs raw)\n';
try { const sp = R('sameplan.json'); out += '  ' + JSON.stringify(sp).slice(0, 800) + '\n'; } catch (e) { out += `  (${e.message})\n`; }
out += '\n## Cluster (multi-worker; was: native overtakes Prisma once cores used)\n';
try { const cl = R('cluster.json'); out += '  ' + JSON.stringify(cl).slice(0, 700) + '\n'; } catch (e) { out += `  (${e.message})\n`; }
out += '\n## Fan-out (deep-fetch spread vs comment count)\n';
try { const fo = R('fanout.json'); out += '  ' + JSON.stringify(fo).slice(0, 500) + '\n'; } catch (e) { out += `  (${e.message})\n`; }
writeFileSync(join(here, '..', '..', 'notes', 'r5-numbers.md'), out);
console.log('wrote notes/r5-numbers.md (' + out.length + ' chars)');
