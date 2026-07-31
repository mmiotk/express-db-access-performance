// Protocol-development chronology.
//
// Separates protocol elements specified BEFORE the accepted campaigns from those
// added between campaigns and those added AFTER them. The distinction matters
// because a check introduced after the measurements it evaluates is a
// retrospective admission criterion applied to archived state, not a prospective
// gate on the timed runs. Dates are derived, not typed: artifact dates come from
// the first commit that added each file, campaign dates from the archived
// environment captures.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const resultsDir = path.join(root, "results");
const paperDir = path.resolve(root, "..", "paper", "tables");
const repo = path.resolve(root, "..");

// The committed record of what was derived. It exists because the two derivation
// inputs are not in the distributed artifact: results/environment.txt (the superseded
// pilot capture) is gitignored, and `git log` needs history that a git-archive or Zenodo
// extraction does not carry. Without this the table could not be regenerated from the
// archive at all, which falsified the reproducibility claim.
const RECORD = path.join(resultsDir, "protocol-chronology.json");
const committed = fs.existsSync(RECORD)
  ? JSON.parse(fs.readFileSync(RECORD, "utf8"))
  : null;

const canDerive = fs.existsSync(path.join(repo, ".git"))
  && fs.existsSync(path.join(resultsDir, "environment.txt"));

const addedOn = (relPath) => {
  const out = execFileSync("git", [
    "-C", repo, "log", "--diff-filter=A", "--format=%ad", "--date=short", "-1", "--", relPath,
  ], { encoding: "utf8" }).trim();
  if (!out) throw new Error(`no add-commit found for ${relPath}`);
  return out;
};
const campaignDate = (file) => {
  const text = fs.readFileSync(path.join(resultsDir, file), "utf8");
  const match = text.match(/date_utc:\s*(\d{4}-\d{2}-\d{2})/);
  if (!match) throw new Error(`no date_utc in ${file}`);
  return match[1];
};

let campaigns;
if (canDerive) {
  campaigns = {
    superseded: campaignDate("environment.txt"),
    primary: campaignDate("environment-rq2-campaign2.txt"),
    validation: campaignDate("environment-rq2-validation-campaign.txt"),
  };
} else {
  if (!committed) {
    throw new Error("no git history or environment.txt to derive from, and no committed "
      + "protocol-chronology.json to fall back on");
  }
  campaigns = committed.campaigns;
  console.log("archive mode: git history and environment.txt absent, "
    + "rendering from the committed chronology record");
}

// stage, what it is, the file whose introduction dates it
const ELEMENTS = [
  ["M1", "Cross-implementation differential equivalence", "experiments/bench/verify.mjs"],
  ["R6", "Resource accounting (CPU, RSS, GC)", "experiments/bench/analyze.mjs"],
  ["R3", "Common-SQL raw-path contrast", "experiments/scripts/sameplan.mjs"],
  ["R4", "Capacity characterization (warm-up/knee sweep)", "experiments/scripts/warmupcurve.mjs"],
  ["R5", "Operating-point separation (matched utilization)", "experiments/scripts/utilization.mjs"],
  ["M1", "Post-write state validation", "experiments/bench/verify-writes.mjs"],
  ["M1", "Property-based read checks", "experiments/bench/verify-property.mjs"],
  ["--", "Protocol formalized as machine-readable checklist", "experiments/protocol-checklist.yaml"],
  ["M2", "Treatment-selection policy recorded", "notes/documentation-selection.md"],
  ["M2", "Frozen documentation snapshots", "experiments/documentation-snapshots"],
  ["M1", "Specification-derived expected-result oracle", "experiments/bench/verify-spec.mjs"],
  ["M1", "Seed-parity verification", "experiments/bench/verify-seed-parity.mjs"],
  ["M1", "Campaign-state verification", "experiments/bench/verify-campaign-state.mjs"],
  ["R7", "Dead-work / implementation-waste check", "experiments/bench/dead-work.mjs"],
];

const classify = (date) => {
  if (date < campaigns.primary) {
    return date <= campaigns.superseded ? "before both" : "between";
  }
  return "after";
};

const rows = canDerive
  ? ELEMENTS.map(([stage, what, file]) => {
      const date = addedOn(file);
      return { stage, what, file, date, phase: classify(date) };
    }).sort((a, b) => a.date.localeCompare(b.date))
  : committed.elements;

// Derivation stays the source of truth: when the inputs are present, the committed record
// must agree with what they yield, or the run fails rather than silently publishing a
// stale date.
if (canDerive && committed) {
  const norm = (xs) => JSON.stringify(xs.map(({ stage, what, file, date, phase }) =>
    ({ stage, what, file, date, phase })));
  if (norm(rows) !== norm(committed.elements)
      || JSON.stringify(campaigns) !== JSON.stringify(committed.campaigns)) {
    throw new Error("derived chronology disagrees with the committed record in "
      + "results/protocol-chronology.json; re-commit the record deliberately if the "
      + "history really changed");
  }
}

fs.writeFileSync(
  path.join(resultsDir, "protocol-chronology.json"),
  JSON.stringify({
    note: "Dates are the first commit adding each artifact and the archived environment "
      + "captures for campaigns. A first-commit date bounds when an element entered the "
      + "recorded instrument; it does not prove the idea was absent earlier. Elements dated "
      + "after the accepted campaigns were applied to archived state and to the same seeded "
      + "dataset, not as prospective gates on the timed runs.",
    campaigns,
    elements: rows,
  }, null, 2) + "\n",
);

const PHASE = {
  "before both": "Before any campaign",
  between: "Between campaigns",
  after: "After accepted campaigns",
};
const esc = (s) => s.replaceAll("_", "\\_");
const body = rows.map((r) =>
  `    ${r.date} & ${r.stage} & ${esc(r.what)} & ${PHASE[r.phase]} \\\\`).join("\n");
const tex = `% auto-generated by scripts/gen-protocol-chronology.mjs
\\begin{table}[htbp]
  \\centering
  \\small
  \\caption{Chronology of protocol elements relative to the measurement campaigns.
  Dates are the first commit that added each artifact; campaign dates are from the archived
  environment captures (superseded pilot ${campaigns.superseded}, accepted corrected-state
  campaign ${campaigns.primary}, same-host validation campaign ${campaigns.validation}).
  Elements in the last group were introduced after the accepted campaigns and were therefore
  applied retrospectively, to archived state and to the same seeded dataset, rather than
  gating the timed runs prospectively. A first-commit date bounds when an element entered the
  recorded instrument; it is not evidence that the underlying idea was absent earlier.}
  \\label{tab:protocol_chronology}
  \\begin{adjustbox}{max width=\\textwidth}
  \\begin{tabular}{l l p{7.4cm} l}
    \\toprule
    Date & Stage & Protocol element & Relative to campaigns \\\\
    \\midrule
${body}
    \\bottomrule
  \\end{tabular}
  \\end{adjustbox}
\\end{table}
`;
for (const dir of [path.join(resultsDir, "tables"), paperDir]) {
  fs.writeFileSync(path.join(dir, "protocol_chronology.tex"), tex);
}
const counts = rows.reduce((acc, r) => ({ ...acc, [r.phase]: (acc[r.phase] ?? 0) + 1 }), {});
console.log("campaigns:", campaigns);
console.log("elements by phase:", counts);
