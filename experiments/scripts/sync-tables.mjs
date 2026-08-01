// Mirror generated tables from results/tables into paper/tables.
//
// This replaces a bare `cp results/tables/*.tex ../paper/tables/`. The copy was
// unconditional, so a generator that writes straight to paper/tables could have
// its fresh output silently replaced by a stale results/ copy -- the same
// last-writer-wins failure as two generators sharing one table path.
//
// Rules:
//   * identical files are skipped, so a clean sync reports nothing;
//   * a differing file is copied and reported, so the change is visible;
//   * a differing file whose paper/ copy is NEWER than its results/ copy is
//     refused: that ordering means paper/ was written after results/, so copying
//     would destroy the fresher content. Set SYNC_FORCE=1 to override.
//
// Tables present only in paper/tables are authored analytical items (see
// MANIFEST.md); they are counted and left untouched.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const src = path.join(root, "results", "tables");
const dst = path.resolve(root, "..", "paper", "tables");
const force = process.env.SYNC_FORCE === "1";

if (!fs.existsSync(src)) {
  console.error(`sync-tables: missing ${src}`);
  process.exit(1);
}

// Archive-only tables: produced and kept under results/tables because the run is part of
// the record, but deliberately NOT part of the manuscript, so they must not be copied into
// paper/tables. Both were deleted from paper/tables once and silently restored by the next
// sync, because this loop copied everything it found.
//   deepfetch_regimes - legacy exploratory sensitivity the manuscript excludes from its estimands
//   analysis_roster   - superseded by the outcomes table; still says "confirmatory", which the
//                       outcomes table dropped because it overstated the analyses' status
const ARCHIVE_ONLY = new Set(["deepfetch_regimes.tex", "analysis_roster.tex"]);

const copied = [];
const refused = [];
const skipped = [];
let identical = 0;

for (const name of fs.readdirSync(src).filter((f) => f.endsWith(".tex")).sort()) {
  if (ARCHIVE_ONLY.has(name)) {
    skipped.push(name);
    // If a previous sync already planted it, take it back out: leaving it would ship dead
    // LaTeX and would re-enter the regeneration gate's blind spot for untracked files.
    const stale = path.join(dst, name);
    if (fs.existsSync(stale)) fs.unlinkSync(stale);
    continue;
  }
  const from = path.join(src, name);
  const to = path.join(dst, name);
  if (fs.existsSync(to)) {
    if (fs.readFileSync(from).equals(fs.readFileSync(to))) { identical++; continue; }
    const srcTime = fs.statSync(from).mtimeMs;
    const dstTime = fs.statSync(to).mtimeMs;
    if (dstTime > srcTime && !force) { refused.push({ name, srcTime, dstTime }); continue; }
  }
  fs.copyFileSync(from, to);
  copied.push(name);
}

const paperOnly = fs.existsSync(dst)
  ? fs.readdirSync(dst).filter((f) => f.endsWith(".tex") && !fs.existsSync(path.join(src, f)))
  : [];

console.log(`sync-tables: ${identical} unchanged, ${copied.length} updated, `
  + `${paperOnly.length} authored paper-only, ${refused.length} refused`);
for (const name of copied) console.log(`  updated  ${name}`);

if (refused.length) {
  console.error(`\nsync-tables: refusing to overwrite ${refused.length} table(s) whose paper/ copy is`);
  console.error(`newer than results/. A generator wrote paper/tables directly after results/tables`);
  console.error(`was produced, so copying would discard the fresher output:`);
  for (const r of refused) console.error(`  ${r.name}`);
  console.error(`\nFix the generator to write results/tables (sync mirrors it), or set SYNC_FORCE=1`);
  console.error(`if the results/ copy really is the one to keep.`);
  process.exit(1);
}
