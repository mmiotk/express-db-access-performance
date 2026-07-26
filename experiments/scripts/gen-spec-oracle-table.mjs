import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'spec-oracle.json'), 'utf8'));
const out = path.resolve(root, '..', 'paper', 'tables', 'spec_oracle.tex');

const rows = Object.entries(data.engines).map(([engine, value]) =>
  `    ${engine === 'postgres' ? 'PostgreSQL' : 'MySQL'} & ${value.adapters} & ` +
  `${value.postInputs} & ${value.authorInputs} & ${value.listInputs} & ` +
  `${value.checks.toLocaleString('en-US').replaceAll(',', '{,}')} & ` +
  `${value.failedAdapters} \\\\`,
);

const text = `% auto-generated from experiments/spec-oracle.json
\\begin{center}
  \\begin{minipage}{0.96\\linewidth}\\small
  \\centering
  \\textbf{Specification-derived read admission.} Expected fields, values, ordering,
    graph membership, and aggregates are computed by replaying the deterministic
    seed, not from native-driver responses. Timestamps are checked for presence and
    canonical ISO-8601 representation because their instants are database-generated.\\\\[4pt]
  \\begin{adjustbox}{max width=\\linewidth}
  \\begin{tabular}{lrrrrrr}
    \\toprule
    Engine & Adapters & Post inputs & Author inputs & List cases & Checks & Failed \\\\
    \\midrule
${rows.join('\n')}
    \\bottomrule
  \\end{tabular}
  \\end{adjustbox}
  \\end{minipage}
\\end{center}
`;

fs.writeFileSync(out, text);
console.log(`Wrote ${out}`);
