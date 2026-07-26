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
#   scripts/release.sh 1.12.16 10.5281/zenodo.21601234
#
#   scripts/release.sh --check           verify the declared version/DOI are consistent
#                                        AND that HEAD is the tagged, pushed release
#   scripts/release.sh --refresh-counts   regenerate the AI-provenance commit counts
#
# Run it AFTER the Zenodo deposit exists, so no build ever carries a placeholder DOI.
#
# Full release sequence:
#   1. scripts/release.sh <version> <doi>      version, DOI and AI counts
#   2. make pdf supplement ist                 rebuild
#   3. git commit -am "Prepare vX.Y.Z release"
#   4. scripts/release.sh --refresh-counts     counts now include the release commit
#   5. make pdf supplement ist && git commit --amend --no-edit
#   6. git tag vX.Y.Z && git push origin HEAD --tags
#   7. make ist-package                        gate passes only after step 6

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
  perl -0pi -e "s/\\d+ of \\d+ commits\\ncarry a \\\\texttt\\{Co-Authored-By\\} trailer naming the model \\(\\d+ Opus 4\\.8, \\d+ Fable 5, \\d+ Opus 5\\)/${trailed} of ${total} commits\\ncarry a \\\\texttt{Co-Authored-By} trailer naming the model (${o48} Opus 4.8, ${f5} Fable 5, ${o5} Opus 5)/" "$M"
  perl -0pi -e "s/The other \\S+ predate the convention/The other ${untrailed} predate the convention/" "$M"
  echo "  AI-provenance counts: ${trailed}/${total} trailed (${o48} Opus 4.8, ${f5} Fable 5, ${o5} Opus 5), ${untrailed} untrailed"
}

if [[ "${1:-}" == "--refresh-counts" ]]; then
  refresh_counts
  echo "Rebuild the manuscript, then amend: git commit --amend --no-edit"
  exit 0
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
    echo "ARTIFACT: HEAD ($(git rev-parse --short HEAD)) is not the tagged release commit"
    echo "          (v$OLD_V = ${tag_sha:0:7}). The archived artifact does not contain"
    echo "          $(git rev-list --count "v$OLD_V"..HEAD) later commit(s), so Data Availability is false."
    fail=1
  fi
  if git remote get-url origin >/dev/null 2>&1; then
    if ! git ls-remote --tags origin 2>/dev/null | grep -q "refs/tags/v$OLD_V\$"; then
      echo "ARTIFACT: tag v$OLD_V is not pushed to origin; the GitHub tag cannot identify the release commit."
      fail=1
    fi
    remote_head=$(git ls-remote --heads origin 2>/dev/null | awk '/refs\/heads\/(master|main)$/{print $1; exit}')
    if [[ -n "$remote_head" && "$remote_head" != "$head_sha" ]]; then
      echo "ARTIFACT: origin's default branch (${remote_head:0:7}) differs from HEAD; this revision is not public."
      fail=1
    fi
  else
    echo "ARTIFACT: no 'origin' remote configured; cannot verify the revision is public."; fail=1
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
  sed -i "s|v${OLD_V}\b|v${NEW_V}|g; s|\"${OLD_V}\"|\"${NEW_V}\"|g; s|^version: ${OLD_V}$|version: ${NEW_V}|" "$f"
  sed -i "s|${OLD_D}|${NEW_D}|g" "$f"
  after=$(md5sum "$f" | cut -d' ' -f1)
  [[ "$before" != "$after" ]] && echo "  updated $f"
done

sed -i "s|^date-released:.*|date-released: \"${TODAY}\"|" "$CFF"

refresh_counts

echo
"$0" --check
echo
echo "Next: make pdf && make supplement && make ist && make ist-package"
echo "Then verify the package matches the builds:"
echo "  md5sum paper/ist/_package/{ist_main,supplement}.pdf paper/ist/{ist_main,supplement}.pdf"
