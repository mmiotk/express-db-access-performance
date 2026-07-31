import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const audit = JSON.parse(fs.readFileSync(
  path.join(root, 'external-protocol-audit.json'),
  'utf8',
));
const out = path.resolve(root, '..', 'paper', 'tables', 'protocol_retro.tex');

const labels = {
  satisfied: 'Y',
  partial: 'P',
  not_reported: '--',
  not_applicable: 'n/a',
  unclear: '?',
};

function tex(value) {
  return value
    .replaceAll('&', '\\&')
    .replaceAll('%', '\\%')
    .replaceAll('_', '\\_')
    .replaceAll('#', '\\#');
}

const rows = audit.studies.map((study) => {
  const codes = audit.stages.map((stage) => labels[study.coding[stage].code]);
  return `    ${tex(study.label)} & ${codes.join(' & ')} & ${tex(study.licensed_interpretation)} \\\\`;
});

const content = `% auto-generated from experiments/external-protocol-audit.json
\\begin{table}[htbp]
  \\centering
  \\caption{Single-rater retrospective protocol audit of the nine benchmark sources retained by the scoping search. Y = reported as satisfying the codebook (no source attained Y); P = partial; -- = not reported; n/a = outside the access-layer estimand. No source was rerun. The author performed the coding, so this demonstrates a bounded application of the protocol but not inter-rater reproducibility. Per-cell source locators and evidence are preserved in \\texttt{external-protocol-audit.json}.}
  \\label{tab:protocol_retro}
  \\begin{adjustbox}{max width=\\textwidth}
  \\scriptsize
  \\begin{tabular}{p{2.0cm} c c c c c c c p{5.8cm}}
    \\toprule
    \\textbf{Source} & \\textbf{M1} & \\textbf{M2} & \\textbf{R3} & \\textbf{R4} & \\textbf{R5} & \\textbf{R6} & \\textbf{R7} & \\textbf{Conclusion licensed by reported controls} \\\\
    \\midrule
${rows.join('\n    \\addlinespace\n')}
    \\bottomrule
  \\end{tabular}
  \\end{adjustbox}
  \\vspace{2pt}
  {\\raggedright\\footnotesize M1 semantic admission; M2 treatment definition; R3 common-SQL raw-path sensitivity; R4 capacity characterization; R5 operating-point separation; R6 resource accounting; R7 implementation-waste evidence. \\emph{Not reported} is not evidence that a control was never performed.\\par}
\\end{table}
`;

fs.writeFileSync(out, content);
// Also write the results/ copy. `npm run sync:tables` copies results/tables/*.tex
// over paper/tables/, so a generator that writes only paper/tables/ has its output
// silently replaced by whatever stale copy sits in results/tables/.
const mirror = path.resolve(root, 'results', 'tables', 'protocol_retro.tex');
fs.mkdirSync(path.dirname(mirror), { recursive: true });
fs.writeFileSync(mirror, content);
console.log(`Wrote ${out}`);
