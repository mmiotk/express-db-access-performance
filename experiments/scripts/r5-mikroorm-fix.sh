#!/usr/bin/env bash
set -u
cd "$(dirname "$0")/.."
S=results/r5-fix-status.txt; : > "$S"
st(){ local n=$1; shift; local t=$(date +%s); echo "== [$(date '+%T')] $n" | tee -a "$S"
  if "$@" >/dev/null 2>&1; then echo "OK   $n ($(($(date +%s)-t))s)" | tee -a "$S"; else echo "FAIL $n exit=$?" | tee -a "$S"; fi; }
st mikroorm-write env INDEP=1 ADAPTERS=mikroorm ENDPOINTS=write ENGINES=postgres,mysql \
  REPLICATES=25 DURATION=12 WARMUP=15 RESET_FLOOR=300000 REBUILD_WRITES=1 \
  INDEP_OUT=mikroorm-write-fix node bench/runner.mjs
st txn-write node scripts/txn-write.mjs
st mixed env MX_ENGINES=postgres,mysql node scripts/mixed.mjs
echo "== [$(date '+%T')] COMPLETE" | tee -a "$S"
