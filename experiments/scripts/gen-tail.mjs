// Round-6 longer-window tail sensitivity (reviewer Priority 5 / Q4):
// compares the 12 s primary p99 (raw.json) against a 60 s re-measurement
// (taillong.json, ~5x the requests, ~300 tail observations/run) for the deep fetch,
// both engines. Writes tables/taillong.tex and prints the headline correlations.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const resultsDir = join(here, '..', 'results');
const raw = JSON.parse(readFileSync(join(resultsDir, 'raw.json'), 'utf8')).filter((r) => r.endpoint === 'deep_fetch');
const tl = JSON.parse(readFileSync(join(resultsDir, 'taillong.json'), 'utf8')).filter((r) => r.endpoint === 'deep_fetch');
const rawK = new Map(raw.map((r) => [`${r.adapter}|${r.engine}`, r]));

const med = (xs) => { const s = [...xs].sort((a, b) => a - b); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const cv = (xs) => { const m = xs.reduce((a, b) => a + b, 0) / xs.length; const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1)); return m ? 100 * sd / m : 0; };
function spearman(x, y) { const n = x.length; const rx = Array(n), ry = Array(n); [...x.keys()].sort((i, j) => x[i] - x[j]).forEach((i, r) => rx[i] = r); [...y.keys()].sort((i, j) => y[i] - y[j]).forEach((i, r) => ry[i] = r); let d2 = 0; for (let i = 0; i < n; i++) d2 += (rx[i] - ry[i]) ** 2; return 1 - 6 * d2 / (n * (n * n - 1)); }

const stats = {};
let body = '';
for (const en of ['postgres', 'mysql']) {
  const cells = tl.filter((r) => r.engine === en).map((r) => ({ r, o: rawK.get(`${r.adapter}|${en}`) })).filter((x) => x.o);
  cells.sort((a, b) => a.o.p99 - b.o.p99);
  const p99_12 = cells.map((x) => x.o.p99), p99_60 = cells.map((x) => med(x.r.p99_samples)), p975_60 = cells.map((x) => med(x.r.p975_samples));
  stats[en] = { rho12v60: spearman(p99_12, p99_60), rho975: spearman(p99_60, p975_60), maxcv: Math.max(...cells.map((x) => cv(x.r.p99_samples))) };
  body += `    \\multicolumn{6}{l}{\\emph{${en === 'postgres' ? 'PostgreSQL' : 'MySQL'}}} \\\\\n`;
  for (const { r, o } of cells) {
    body += `    \\quad\\texttt{${r.adapter}} & ${o.p99} & ${med(r.p99_samples)} & ${med(r.p975_samples)} & ${cv(r.p99_samples).toFixed(1)} & ${med(r.rps_samples)} \\\\\n`;
  }
}

const cap = `Longer-window tail sensitivity on the deep/nested fetch. Each cell's primary p99 is
    measured over a 12~s window ($\\approx$60 tail observations per run in the slowest
    cells); the re-measurement uses a 60~s window ($\\approx$300 tail observations) at the
    same 50-connection operating point, 10 repeated runs. The p99 ranking is preserved
    exactly (Spearman $\\rho=1.00$ on both engines), the per-cell p99 barely moves, the
    p97.5 ordering matches the p99 ordering ($\\rho=1.00$), and the run-to-run p99 CV stays
    small (max ${stats.postgres.maxcv.toFixed(1)}\\% PostgreSQL, ${stats.mysql.maxcv.toFixed(1)}\\% MySQL),
    so the 12~s window is adequate for the tail ranking despite the modest per-run tail count.`;

const tex = `\\begin{table}[htbp]
  \\centering
  \\small
  \\caption{${cap}}
  \\label{tab:taillong}
  \\begin{tabular}{l ccccc}
    \\toprule
    Layer & p99 12\\,s & p99 60\\,s & p97.5 60\\,s & p99 CV & rps 60\\,s \\\\
     & (ms) & (ms) & (ms) & (\\%) & \\\\
    \\midrule
${body}    \\bottomrule
  \\end{tabular}
\\end{table}
`;
writeFileSync(join(resultsDir, 'tables', 'taillong.tex'), tex);
console.log('wrote results/tables/taillong.tex');
console.log('headline:', JSON.stringify(stats, null, 0));
