// Round-6 additions, all from the existing results/raw.json (no re-run):
//   - tables/interaction.tex : layer x engine interaction MAGNITUDE (PG/MySQL
//     throughput ratio with 95% paired bootstrap CI) per portable layer x pattern,
//     answering the reviewer's request for interaction effect sizes rather than the
//     permutation p-value floor.
//   - prints the ex-MikroORM rank robustness (Q6) numbers for the prose/letter.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { geomMeanRatio, pairedBootstrapRatioCI } from '../bench/stats.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const resultsDir = join(here, '..', 'results');
const rows = JSON.parse(readFileSync(join(resultsDir, 'raw.json'), 'utf8'));

// same seed as ci-tables.mjs so the bootstrap is reproducible with the rest of the paper
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const PORT = ['knex', 'drizzle', 'prisma', 'sequelize', 'typeorm', 'objection', 'mikroorm'];
const PATS = [['point_read', 'Point read'], ['range_scan', 'Range scan'], ['deep_fetch', 'Deep fetch'], ['aggregation', 'Aggregation'], ['write', 'Insert']];
const samp = (a, e, ep) => { const r = rows.find((x) => x.adapter === a && x.engine === e && x.endpoint === ep); return r ? r.rps_samples : null; };
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };

let body = '';
for (const a of PORT) {
  const cells = PATS.map(([ep]) => {
    const pg = samp(a, 'postgres', ep), my = samp(a, 'mysql', ep);
    if (!pg || !my) return '--';
    const ratio = geomMeanRatio(pg, my);
    const [lo, hi] = pairedBootstrapRatioCI(pg, my, { B: 5000, level: 0.95, rand: mulberry32(0x57a75) });
    return `${ratio.toFixed(2)}~[${lo.toFixed(2)},${hi.toFixed(2)}]`;
  });
  body += `    \\texttt{${a}} & ${cells.join(' & ')} \\\\\n`;
}

const tex = `\\begin{table}[htbp]
  \\centering
  \\small
  \\caption{Layer\\,$\\times$\\,engine interaction magnitude: the PostgreSQL\\,$\\div$\\,MySQL
    throughput ratio (geometric mean of the paired per-replicate ratios, with a 95\\%
    paired-bootstrap interval) for each portable layer and pattern. A ratio $>1$ means
    the layer runs faster on PostgreSQL, $<1$ faster on MySQL. Every layer is faster on
    PostgreSQL here, so the interaction is in the \\emph{spread} of the advantage, not its
    sign: point read and range scan hold a tight band ($\\approx$1.0--1.6), the deep fetch
    and aggregation reach $\\approx$1.9, and the insert scatters widest (1.6--3.2), reordering
    the layers across engines --- the
    interaction the blocked permutation test detects and the rank correlations of
    Table~\\ref{tab:ranks} summarize.}
  \\label{tab:interaction}
  \\begin{adjustbox}{max width=\\textwidth}
  \\begin{tabular}{l ccccc}
    \\toprule
    Layer & Point read & Range scan & Deep fetch & Aggregation & Insert \\\\
    \\midrule
${body}    \\bottomrule
  \\end{tabular}
  \\end{adjustbox}
\\end{table}
`;
writeFileSync(join(resultsDir, 'tables', 'interaction.tex'), tex);
console.log('wrote results/tables/interaction.tex');

// Insert-dispersion figure (reviewer 8.5): raw per-replicate points for the MySQL
// insert cells, where the median/CV hides bimodal structure. One column per layer,
// 25 (or 24) markers, with the median drawn as a short bar.
const WLAYERS = ['mysql2', 'knex', 'drizzle', 'prisma', 'sequelize', 'typeorm', 'objection', 'mikroorm'];
let pts = '', medbars = '', xticks = [], xlabels = [];
WLAYERS.forEach((a, i) => {
  const x = i + 1; xticks.push(x); xlabels.push(`\\texttt{${a}}`);
  const s = samp(a, 'mysql', 'write') || [];
  pts += s.map((v) => `(${x},${v})`).join(' ') + '\n';
  const m = med(s);
  medbars += `\\addplot[thick,red,mark=none] coordinates {(${x - 0.28},${m}) (${x + 0.28},${m})};\n`;
});
const fig = `\\begin{figure}[htbp]
  \\centering
  \\begin{tikzpicture}
  \\begin{axis}[width=\\textwidth,height=6cm,
      ylabel={Insert throughput (req/s)}, xmin=0.4, xmax=${WLAYERS.length + 0.6},
      xtick={${xticks.join(',')}}, xticklabels={${xlabels.join(',')}},
      x tick label style={rotate=35,anchor=east,font=\\footnotesize},
      ymajorgrids, tick align=outside]
  \\addplot[only marks,mark=o,mark size=1.1pt,draw=black!55] coordinates {
${pts}  };
${medbars}  \\end{axis}
  \\end{tikzpicture}
  \\caption{Raw per-replicate insert throughput on MySQL for the eight documentation-selected layers
    (25 repeated runs each, red bar = median). The insert cells are the noisiest in
    the study; several are visibly bimodal or heavy-tailed within a cell, structure a
    coefficient of variation cannot convey, which is why the insert rank correlation and
    dispersion are reported conservatively.}
  \\label{fig:insert_dispersion}
\\end{figure}
`;
writeFileSync(join(resultsDir, 'tables', 'fig_insert_dispersion.tex'), fig);
console.log('wrote results/tables/fig_insert_dispersion.tex');

// Q6: ex-MikroORM rank robustness (printed for the prose + response letter)
function spearman(x, y) { const n = x.length; const rx = Array(n), ry = Array(n); [...x.keys()].sort((i, j) => x[i] - x[j]).forEach((i, r) => rx[i] = r); [...y.keys()].sort((i, j) => y[i] - y[j]).forEach((i, r) => ry[i] = r); let d2 = 0; for (let i = 0; i < n; i++) d2 += (rx[i] - ry[i]) ** 2; return 1 - 6 * d2 / (n * (n * n - 1)); }
function kendall(x, y) { const n = x.length; let c = 0, d = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const s = (x[i] - x[j]) * (y[i] - y[j]); if (s > 0) c++; else if (s < 0) d--; } return (c + d) / (c - d || 1); }
const ser = (layers, ep, e) => layers.map((a) => med(samp(a, e, ep)));
console.log('\\nQ6 ex-MikroORM rank robustness (6 layers):');
for (const [ep] of PATS) {
  const L6 = PORT.filter((a) => a !== 'mikroorm');
  const pg = ser(L6, ep, 'postgres'), my = ser(L6, ep, 'mysql');
  console.log(`  ${ep.padEnd(12)} rho=${spearman(pg, my).toFixed(3)} tau=${kendall(pg, my).toFixed(3)}`);
}
