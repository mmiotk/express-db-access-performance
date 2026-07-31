#!/usr/bin/env bash
# Atomic version + DOI propagation for a new release.
#
# The version string and the Zenodo version DOI must change together. Bumping
# one without the other produced a submission package whose manuscript and
# artifact disagreed, which reviewers flagged twice. This script changes both
# across every declaration site in one step and then verifies that no stale
# value survives anywhere in the tracked tree.
#
# Usage:
#   scripts/release.sh <new-version> <new-version-doi>
#   scripts/release.sh 1.12.16 10.5281/zenodo.21601234 --publish
#
# With --publish it also pushes and rebuilds the submission package; without it
# everything is done locally and nothing leaves the machine.
#
#   scripts/release.sh --check           verify the declared version/DOI are consistent
#                                        AND that HEAD is the tagged, pushed release
#   scripts/release.sh --refresh-counts   regenerate the AI-provenance commit counts
#   scripts/release.sh --check-doi        verify the declared DOI resolves to the
#                                        declared version (needs network; advisory)
#
# Run it AFTER the Zenodo deposit exists, so no build ever carries a placeholder DOI.
#
# One invocation does the whole release: propagates version and DOI, refreshes the
# AI-provenance counts, rebuilds, commits, re-refreshes the counts so they include
# the release commit, amends, and tags. With --publish it also pushes and rebuilds
# the submission package.

set -euo pipefail
cd "$(dirname "$0")/.."

CFF=CITATION.cff

current_version() { grep -oP '^version:\s*\K[0-9]+\.[0-9]+\.[0-9]+' "$CFF"; }
current_doi() { grep -oP '^doi:\s*\K10\.5281/zenodo\.[0-9]+' "$CFF"; }

# Every file that states the release version or the version DOI.
FILES=(
  CITATION.cff
  .zenodo.json
  TODO.md
  REPRODUCE.md
  experiments/README.md
  experiments/protocol-checklist.yaml
  paper/express_db_access.tex
  paper/supplement.tex
  paper/sections/introduction.tex
  paper/ist/ist_main.tex
  paper/ist/cover-letter.md
  paper/references.bib
)

OLD_V=$(current_version)
OLD_D=$(current_doi)

# Section 3.9 quotes per-model AI-assistance commit counts. Every commit changes
# them, including the release commit itself, so they are regenerated rather than
# maintained by hand: a disclosure that is stale on arrival is worse than none.
# Counts come from the trailers, not message text, because commit messages that
# merely discuss the trailers would otherwise inflate them.
refresh_counts() {
  local M=paper/sections/methodology.tex o48 f5 o5 total trailed untrailed
  o48=$(git log --format='%(trailers:key=Co-Authored-By,valueonly)' | grep -c '^Claude Opus 4.8' || true)
  f5=$(git log --format='%(trailers:key=Co-Authored-By,valueonly)' | grep -c '^Claude Fable 5' || true)
  o5=$(git log --format='%(trailers:key=Co-Authored-By,valueonly)' | grep -c '^Claude Opus 5' || true)
  total=$(git log --oneline | wc -l | tr -d ' ')
  trailed=$((o48 + f5 + o5)); untrailed=$((total - trailed))
  # Whitespace-tolerant. The previous pattern required the line break to fall
  # exactly after "commits", so any reflow of that sentence made this a silent
  # no-op that still printed git-derived numbers. It bit v1.12.17, which shipped
  # a count one commit stale.
  perl -0pi -e "s/\d+ of \d+ commits\s+carry a \\\\texttt\{Co-Authored-By\} trailer naming the model\s*\(\d+ Opus 4\.8, \d+ Fable 5, \d+ Opus 5\)/${trailed} of ${total} commits carry a \\\\texttt{Co-Authored-By} trailer naming the model\n(${o48} Opus 4.8, ${f5} Fable 5, ${o5} Opus 5)/s" "$M"
  perl -0pi -e "s/The other \\S+ predate the convention/The other ${untrailed} predate the convention/" "$M"
  echo "  AI-provenance counts: ${trailed}/${total} trailed (${o48} Opus 4.8, ${f5} Fable 5, ${o5} Opus 5), ${untrailed} untrailed"
}

if [[ "${1:-}" == "--refresh-counts" ]]; then
  refresh_counts
  echo "Rebuild the manuscript, then amend: git commit --amend --no-edit"
  exit 0
fi

# --- optional: does the declared DOI actually resolve to the declared version? ---
#
# --check verifies only that the version and DOI strings agree across the
# declaration sites. It cannot tell whether the archive exists: a release can be
# tagged, pushed, and self-consistent while Zenodo still resolves the concept DOI
# to an older version, which makes the Data Availability statement false. That
# happened with v1.13.0. This check closes that gap. It needs network, so it is
# opt-in and never runs as part of the offline gate.
check_doi() {
  local declared_v declared_d recid body resolved http
  declared_v=$(grep -oP '^version:\s*\K.+' CITATION.cff | tr -d '"')
  declared_d=$(grep -oP '^doi:\s*\K10\.5281/zenodo\.[0-9]+' CITATION.cff)
  if [[ -z "$declared_v" || -z "$declared_d" ]]; then
    echo "DOI-CHECK: cannot read the declared version or DOI from CITATION.cff" >&2
    return 1
  fi
  recid="${declared_d##*.}"
  echo "Declared version: v${declared_v}"
  echo "Declared DOI:     ${declared_d}"

  body=$(mktemp)
  # -L is required: Zenodo redirects a concept record id to the latest version,
  # so without it every run returns 302 and the check silently skips.
  http=$(curl -sSL -o "$body" -w '%{http_code}' --max-time 25 \
         "https://zenodo.org/api/records/${recid}" 2>/dev/null || echo 000)
  # Only a genuine transport failure or a server-side error is a skip. Any other
  # unexpected status is reported, because a silent skip would hide a bad URL.
  if [[ "$http" == "000" || "$http" =~ ^5[0-9][0-9]$ ]]; then
    echo "DOI-CHECK: SKIPPED - could not reach Zenodo (HTTP ${http}). Re-run when online;"
    echo "           this check is advisory and does not gate an offline build."
    rm -f "$body"; return 0
  fi
  if [[ "$http" != "200" ]]; then
    echo "DOI-CHECK: unexpected HTTP ${http} from the Zenodo API for record ${recid}." >&2
    echo "           Not skipping silently: check the URL and the record id." >&2
    rm -f "$body"; return 1
  fi

  resolved=$(python3 -c "
import json,sys
d=json.load(open(sys.argv[1]))
print((d.get('metadata') or {}).get('version') or '')
" "$body" 2>/dev/null || true)
  rm -f "$body"

  if [[ -z "$resolved" ]]; then
    # A reachable record that declares no version cannot confirm the papers, so
    # this is a failure, not a skip. Treating it as a skip made the check pass
    # silently on the v1.13.0 deposit, which was published without a version field.
    echo "DOI-CHECK FAILED: ${declared_d} resolves to a record that declares no version," >&2
    echo "                  so it cannot confirm the papers' v${declared_v}. Set the Version" >&2
    echo "                  field on the Zenodo record and re-run." >&2
    return 1
  fi
  if [[ "$resolved" == "$declared_v" ]]; then
    echo "OK: ${declared_d} resolves to v${resolved}, matching the declaration."
    return 0
  fi
  echo "DOI-CHECK FAILED: ${declared_d} resolves to v${resolved}, but the papers declare"
  echo "                  v${declared_v}. The Data Availability statement is false until the"
  echo "                  v${declared_v} archive is published on Zenodo."
  return 1
}

if [[ "${1:-}" == "--check-doi" ]]; then
  check_doi
  exit $?
fi

if [[ "${1:-}" == "--check" ]]; then
  echo "Declared version: v$OLD_V"
  echo "Declared DOI:     $OLD_D"
  fail=0

  # The manuscript's Data Availability statement says the DOI'd release contains
  # this revision and that the GitHub tag identifies the release commit. Both were
  # false at submission time once revision commits landed after the tag, which is
  # how a previous package shipped a manuscript the archive did not contain.
  # These checks make that failure loud instead of silent.
  head_sha=$(git rev-parse HEAD)
  tag_sha=$(git rev-list -n1 "v$OLD_V" 2>/dev/null || true)
  if [[ -z "$tag_sha" ]]; then
    echo "ARTIFACT: tag v$OLD_V does not exist locally."; fail=1
  elif [[ "$tag_sha" != "$head_sha" ]]; then
    # Only substantive drift falsifies Data Availability. Commits that touch
    # nothing but regenerable build artifacts leave the archived sources intact.
    substantive=$(git diff --name-only "v$OLD_V" HEAD -- . \
                  ':(exclude)paper/ist/ist-submission.zip' \
                  ':(exclude)paper/ist/_package/**' | wc -l)
    if [[ "$substantive" != "0" ]]; then
      echo "ARTIFACT: HEAD ($(git rev-parse --short HEAD)) is not the tagged release commit"
      echo "          (v$OLD_V = ${tag_sha:0:7}), and $substantive source file(s) differ,"
      echo "          so Data Availability is false. Differing:"
      git diff --name-only "v$OLD_V" HEAD -- . ':(exclude)paper/ist/ist-submission.zip' \
        ':(exclude)paper/ist/_package/**' | head -10 | sed 's/^/            /'
      fail=1
    else
      echo "NOTE: HEAD is past v$OLD_V but differs only in build artifacts; sources match the release."
    fi
  fi
  if git remote get-url origin >/dev/null 2>&1; then
    # Capture once, then match with here-strings. Piping into `grep -q` or an
    # early-exiting `awk` closes the pipe, SIGPIPEs git, and `set -o pipefail`
    # then reports the whole pipeline as failed — which made this check claim a
    # pushed tag was missing.
    remote_tags=$(git ls-remote --tags origin 2>/dev/null || true)
    remote_heads=$(git ls-remote --heads origin 2>/dev/null || true)
    if [[ -z "$remote_tags$remote_heads" ]]; then
      echo "ARTIFACT: could not reach origin; the public state is unverified."; fail=1
    else
      if ! grep -q "refs/tags/v$OLD_V\$" <<<"$remote_tags"; then
        echo "ARTIFACT: tag v$OLD_V is not pushed to origin; the GitHub tag cannot identify the release commit."
        fail=1
      fi
      remote_head=$(grep -E 'refs/heads/(master|main)$' <<<"$remote_heads" | head -1 | cut -f1)
      if [[ -n "$remote_head" && "$remote_head" != "$head_sha" ]]; then
        echo "ARTIFACT: origin's default branch (${remote_head:0:7}) differs from HEAD; this revision is not public."
        fail=1
      fi
    fi
  else
    echo "ARTIFACT: no 'origin' remote configured; cannot verify the revision is public."; fail=1
  fi
  # The Data Availability statement asserts the archived JSON hashes verify. That was
  # false at v1.13.4: results/rq2-campaign-comparison.json had been legitimately
  # regenerated one commit after the manifest was last written, so the recorded hash was
  # carried forward rather than re-verified (CLAUDE.md section 9 forbids exactly that).
  # Nothing caught it, because the gate checked tables but never the manifest.
  if [[ -f experiments/results/checksums.sha256 ]]; then
    if ! ( cd experiments && sha256sum -c results/checksums.sha256 >/dev/null 2>&1 ); then
      echo "ARTIFACT: archived checksums do not verify; the Data Availability statement is false:"
      ( cd experiments && sha256sum -c results/checksums.sha256 2>/dev/null | grep -v ': OK$' ) \
        | sed 's/^/                   /'
      fail=1
    fi
  else
    echo "ARTIFACT: experiments/results/checksums.sha256 is missing."; fail=1
  fi

  # The manuscript claims every reported table regenerates byte-for-byte from the
  # archived data. That was false: corrections had been applied to paper/tables/
  # by hand while the generators still emitted the old text, so `npm run
  # tables:primary` silently reverted eight tables — including two retracted
  # claims. This re-runs the documented chain and fails if it changes anything.
  if [[ "${SKIP_REGEN:-}" != "1" ]]; then
    # Every generator, not just the primary chain: a table:* script outside it can
    # also drift from its committed output (gen-protocol-retro-table.mjs did).
    regen_ok=1
    ( cd experiments && RAW_FILE=current-primary.json npm run tables:primary --silent >/dev/null 2>&1 ) || regen_ok=0
    for t in $(node -e "const s=require('./experiments/package.json').scripts;console.log(Object.keys(s).filter(k=>k.startsWith('table:')).join(' '))" 2>/dev/null); do
      ( cd experiments && npm run "$t" --silent >/dev/null 2>&1 ) || regen_ok=0
    done
    ( cd experiments && npm run sync:tables --silent >/dev/null 2>&1 ) || regen_ok=0
    if [[ "$regen_ok" == "1" ]]; then
      # Derived analysis JSON belongs here too: a number quoted in the manuscript can
      # come from a generator that writes no table, and would otherwise drift unseen.
      REGEN_PATHS=(paper/tables/ experiments/results/tables/ experiments/results/protocol-chronology.json
                   experiments/results/tost-closest-pair.json)
      changed=$(git diff --name-only "${REGEN_PATHS[@]}" | wc -l)
      if [[ "$changed" != "0" ]]; then
        echo "REPRODUCIBILITY: regenerating tables from archived data changed $changed file(s);"
        echo "                 the manuscript does not match its own generators:"
        git diff --name-only "${REGEN_PATHS[@]}" | sed 's/^/                   /'
        fail=1
      fi
    else
      echo "REPRODUCIBILITY: table regeneration chain failed to run."; fail=1
    fi

    # Two scripts writing one table is a silent-corruption hazard: whichever
    # runs last wins, so a generator reading a superseded campaign can replace a
    # table built from the accepted one without any build error.
    if ! owners=$( cd experiments && node scripts/check-table-owners.mjs 2>&1 ); then
      echo "OWNERSHIP: contested table generators."
      echo "$owners" | sed 's/^/           /'
      fail=1
    fi
  fi

  # Any v1.x.y other than the declared one, excluding the deliberate historical
  # v1.12.9 clean-room references.
  stray=$(grep -rhoP 'v[0-9]+\.[0-9]+\.[0-9]+' "${FILES[@]}" 2>/dev/null \
          | sort -u | grep -v "^v$OLD_V$" | grep -v '^v1\.12\.9$' || true)
  if [[ -n "$stray" ]]; then
    echo "STRAY VERSION STRINGS:"; echo "$stray" | sed 's/^/  /'; fail=1
  fi
  stray_doi=$(grep -rhoP '10\.5281/zenodo\.[0-9]+' "${FILES[@]}" 2>/dev/null \
              | sort -u | grep -v "^$OLD_D$" | grep -v '10\.5281/zenodo\.21313858' || true)
  if [[ -n "$stray_doi" ]]; then
    echo "STRAY DOIs (concept DOI 21313858 is expected and excluded):"
    echo "$stray_doi" | sed 's/^/  /'; fail=1
  fi
  [[ $fail -eq 0 ]] && echo "OK: version and DOI are self-consistent across all declaration sites."
  [[ $fail -eq 0 ]] && echo "     This does not prove the archive exists; run --check-doi online for that."
  exit $fail
fi

NEW_V="${1:-}"; NEW_D="${2:-}"
if [[ -z "$NEW_V" || -z "$NEW_D" ]]; then
  echo "usage: $0 <new-version> <new-version-doi>   |   $0 --check" >&2
  exit 2
fi
[[ "$NEW_V" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "bad version: $NEW_V" >&2; exit 2; }
[[ "$NEW_D" =~ ^10\.5281/zenodo\.[0-9]+$ ]] || { echo "bad DOI: $NEW_D" >&2; exit 2; }

TODAY=$(date +%Y-%m-%d)

echo "v$OLD_V -> v$NEW_V"
echo "$OLD_D -> $NEW_D"
echo

for f in "${FILES[@]}"; do
  [[ -f "$f" ]] || continue
  before=$(md5sum "$f" | cut -d' ' -f1)
  # Version: only the exact old version, so the historical v1.12.9 references
  # and unrelated version numbers are left alone.
  # The bare form "version 1.13.0" (references.bib) matched none of the first three
  # patterns, so the artifact citation sat four releases stale until a reviewer caught it.
  sed -i "s|v${OLD_V}\b|v${NEW_V}|g; s|\"${OLD_V}\"|\"${NEW_V}\"|g; s|^version: ${OLD_V}$|version: ${NEW_V}|; s|version ${OLD_V}|version ${NEW_V}|g" "$f"
  sed -i "s|${OLD_D}|${NEW_D}|g" "$f"
  after=$(md5sum "$f" | cut -d' ' -f1)
  [[ "$before" != "$after" ]] && echo "  updated $f"
done

sed -i "s|^date-released:.*|date-released: \"${TODAY}\"|" "$CFF"

refresh_counts


# --- rebuild, commit, tag, and (optionally) publish ------------------------
# Done here rather than left as a manual checklist because the steps are
# order-dependent: the AI-provenance counts must be refreshed AFTER the release
# commit exists, and the package gate only passes once the tag is pushed.

echo
echo "Rebuilding documents..."
# Built twice: on a cold tree the first pass has no .aux/.bbl, so cross-references
# and citations are legitimately unresolved until a second pass. Checking after
# one pass would abort on a healthy build.
build_all() {
  make pdf >/dev/null 2>&1 && make supplement >/dev/null 2>&1 && make ist >/dev/null 2>&1
}
build_all || true
build_all || { echo "ABORT: build failed."; exit 1; }
make -C paper/ist docs >/dev/null 2>&1 || true

for log in paper/_build/express_db_access.log paper/_build/supplement.log paper/ist/ist_main.log; do
  [[ -f "$log" ]] || { echo "ABORT: $log not produced."; exit 1; }
  n=$(grep -c undefined "$log" || true)
  [[ "$n" == "0" ]] || {
    echo "ABORT: $log has $n undefined reference(s) after two passes:"
    grep -m5 undefined "$log" | sed 's/^/    /'
    exit 1; }
done
echo "  builds clean (0 undefined references)"

git add -A
git commit -q -m "Prepare v${NEW_V} release

Artifact v${NEW_V}, version DOI ${NEW_D}.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"

# The release commit itself changes the counts Section 3.9 quotes.
refresh_counts
make pdf >/dev/null && make supplement >/dev/null && make ist >/dev/null
make -C paper/ist docs >/dev/null 2>&1 || true
git add -A && git commit -q --amend --no-edit

git tag -a "v${NEW_V}" -m "v${NEW_V}: IST revision artifact (DOI ${NEW_D})"
echo "  tagged v${NEW_V} at $(git rev-parse --short HEAD)"

if [[ "${3:-}" == "--publish" ]]; then
  echo "Publishing..."
  git push -q origin HEAD && git push -q origin "v${NEW_V}"
  echo "  pushed branch and tag"
  echo
  "$0" --check || { echo "ABORT: post-publish check failed."; exit 1; }
  make ist-package >/dev/null && echo "  submission package rebuilt"
  echo
  echo "md5 (package must match builds):"
  md5sum paper/ist/_package/ist_main.pdf paper/ist/ist_main.pdf \
         paper/ist/_package/supplement.pdf paper/ist/supplement.pdf | sed 's/^/  /'
  echo
  echo "DONE. paper/ist/ist-submission.zip is ready to upload."
else
  echo
  echo "Committed and tagged locally, not pushed."
  echo "To publish:  git push origin HEAD && git push origin v${NEW_V} && make ist-package"
  echo "Or re-run with --publish next time."
fi
