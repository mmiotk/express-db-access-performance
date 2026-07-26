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
#   scripts/release.sh --check          verify current state is self-consistent
#
# Run it AFTER the Zenodo deposit exists, so no build ever carries a
# placeholder DOI. Then: make pdf supplement ist ist-package.

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

if [[ "${1:-}" == "--check" ]]; then
  echo "Declared version: v$OLD_V"
  echo "Declared DOI:     $OLD_D"
  fail=0
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
sed -i "s|Zenodo version DOI for release v${NEW_V}|Zenodo version DOI for release v${NEW_V}|" "$CFF"

echo
"$0" --check
echo
echo "Next: make pdf && make supplement && make ist && make ist-package"
echo "Then verify the package matches the builds:"
echo "  md5sum paper/ist/_package/{ist_main,supplement}.pdf paper/ist/{ist_main,supplement}.pdf"
