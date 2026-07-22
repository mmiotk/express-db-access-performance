// p99 estimation-spread figure (reviewer point 8.4): the 25 per-run p99 values behind
// each reported deep-fetch p99 (PostgreSQL), so the run-to-run stability of the p99
// estimate is visible directly. Each run's p99 is itself estimated from ~1% of that
// run's requests, so it is noisy; the paper reports the median of these 25 run-level
// p99 values with a bootstrap interval, and this plot shows the underlying dispersion.
// Regenerates from results/raw.json (p99_samples). Writes ONLY fig_p99_spread.tex.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { median } from '../bench/stats.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const resultsDir = join(here, '..', 'results');
const rows = JSON.parse(readFileSync(join(resultsDir, 'raw.json'), 'utf8'));

const LAYERS = ['pg', 'knex', 'drizzle', 'prisma', 'sequelize', 'typeorm', 'objection', 'mikroorm'];
const p99s = (a) => { const r = rows.find((x) => x.adapter === a && x.engine === 'postgres' && x.endpoint === 'deep_fetch'); return r ? r.p99_samples : []; };

let pts = '', medbars = '', xticks = [], xlabels = [];
LAYERS.forEach((a, i) => {
  const x = i + 1; xticks.push(x); xlabels.push(`\\texttt{${a}}`);
  const s = p99s(a);
  pts += s.map((v) => `(${x},${v})`).join(' ') + '\n';
  const m = median(s);
  medbars += `\\addplot[thick,red,mark=none] coordinates {(${x - 0.28},${m}) (${x + 0.28},${m})};\n`;
});

const fig = `\\begin{figure}[htbp]
  \\centering
  \\begin{tikzpicture}
  \\begin{axis}[width=\\textwidth,height=6cm,
      ylabel={Deep-fetch p99 (ms)}, xmin=0.4, xmax=${LAYERS.length + 0.6}, ymin=0,
      xtick={${xticks.join(',')}}, xticklabels={${xlabels.join(',')}},
      x tick label style={rotate=35,anchor=east,font=\\footnotesize},
      ymajorgrids, tick align=outside]
  \\addplot[only marks,mark=o,mark size=1.1pt,draw=black!55] coordinates {
${pts}  };
${medbars}  \\end{axis}
  \\end{tikzpicture}
  \\caption{The 25 per-run p99 values behind each reported deep-fetch p99 on PostgreSQL
    (red bar = median, the value tabulated in the main text). Each run's p99 is estimated from roughly
    the top 1\\% of that run's requests, so a single run's p99 is noisy; the paper reports the
    \\emph{median} of these 25 run-level p99 values with a within-campaign bootstrap interval rather than
    pooling dependent requests. The plot shows the run-to-run dispersion this median summarizes: it is
    tight for the fast layers and widens for the slower ones, consistent with the coarser p99 estimate
    at higher latency. A full per-request HDR recorder was not used (the load generator reports latency
    percentiles, not raw request latencies), so an HDR reconstruction is left to future work.}
  \\label{fig:p99_spread}
\\end{figure}
`;
writeFileSync(join(resultsDir, 'tables', 'fig_p99_spread.tex'), fig);
writeFileSync(join(here, '..', '..', 'paper', 'tables', 'fig_p99_spread.tex'), fig);
console.log('wrote fig_p99_spread.tex');
