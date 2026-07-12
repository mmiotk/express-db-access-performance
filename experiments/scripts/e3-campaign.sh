#!/usr/bin/env bash
# E3 measurement campaign (revision plan, stage 3). Runs the FULL replacement
# measurement set under Harness 2.0: canonical byte-identical payloads, TZ=UTC,
# paired request streams, physical write-state rebuild, DEFAULT durability as
# the primary write regime (relaxed kept as a labelled secondary), plus the
# mechanism/diagnostic suite (same-SQL control, CO-corrected open loop, fan-out,
# equal-CPU, pool scaling, warm-up curves).
#
#   nohup bash scripts/e3-campaign.sh > results/e3-campaign.log 2>&1 &
#
# Stages log to results/e3-<stage>.log; a one-line status per stage is appended
# to results/e3-status.txt. A failed stage does not abort the campaign (the
# stages are independent given S1), EXCEPT the primary run S3.
set -u
cd "$(dirname "$0")/.."   # experiments/
mkdir -p results
STATUS=results/e3-status.txt
: > "$STATUS"

stage() { # stage <name> <cmd...>
  local name="$1"; shift
  local t0=$(date +%s)
  echo "===== [$(date '+%F %T')] stage $name: $*" | tee -a "$STATUS"
  if "$@" > "results/e3-$name.log" 2>&1; then
    echo "OK   $name ($(( $(date +%s) - t0 ))s)" | tee -a "$STATUS"
  else
    echo "FAIL $name ($(( $(date +%s) - t0 ))s) exit=$?" | tee -a "$STATUS"
    return 1
  fi
}

# preserve the pre-E3 primary dataset (old payload shapes / relaxed durability)
[ -f results/raw-indep.json ] && cp -n results/raw-indep.json results/raw-indep.pre-e3.bak

stage durability-default node scripts/set-durability.mjs default || exit 1

# S2 warm-up curves (PG; fast / engine-threaded / slowest layer) — justifies WARMUP
stage warmupcurve node scripts/warmupcurve.mjs

# S3 PRIMARY: 25 independent replicates x 18 cells (9+2 layers x engines),
# shuffled cell order, 12s runs, 5s warm-up, write measured in a dedicated boot
# after a physical rebuild, DEFAULT durability. THE dataset of the paper.
stage primary env INDEP=1 REPLICATES=25 DURATION=12 WARMUP=5 \
  RESET_FLOOR=300000 REBUILD_WRITES=1 node bench/runner.mjs || exit 1

# S4/S5 order-invariance A/B on the write endpoint (history-effects check)
stage order-fwd env INDEP=1 ENDPOINTS=write ORDER=forward REPLICATES=5 DURATION=12 WARMUP=5 \
  RESET_FLOOR=300000 REBUILD_WRITES=1 INDEP_OUT=order-fwd node bench/runner.mjs
stage order-rev env INDEP=1 ENDPOINTS=write ORDER=reverse REPLICATES=5 DURATION=12 WARMUP=5 \
  RESET_FLOOR=300000 REBUILD_WRITES=1 INDEP_OUT=order-rev node bench/runner.mjs

# S6 relaxed-durability SECONDARY for writes (labelled mechanism-isolation regime);
# durability is ALWAYS restored to default afterwards, even if the run fails
stage durability-relaxed node scripts/set-durability.mjs relaxed
stage writes-relaxed env INDEP=1 ENDPOINTS=write REPLICATES=10 DURATION=12 WARMUP=5 \
  RESET_FLOOR=300000 REBUILD_WRITES=1 INDEP_OUT=raw-writes-relaxed node bench/runner.mjs
stage durability-restore node scripts/set-durability.mjs default || exit 1

# S7 same-SQL control, replicated (median of 10)
stage sameplan env SP_REPS=10 node scripts/sameplan.mjs

# S8 CO-corrected open-loop rate sweep (PG; 5 layers x 250..4000 req/s)
stage openloop node scripts/openloop2.mjs

# S9 deep-fetch fan-out scaling (0/1/10/50/100/500 comments, both engines)
stage fanout env FO_ENGINES=postgres,mysql node scripts/fanout.mjs

# S10 equal-CPU-slice control (taskset 1/2/4 cores for the server)
stage equalcpu node scripts/equalcpu.mjs

# S11 pool/connection scaling (1..256 connections, deep fetch)
stage scaling env REPEATS=3 node bench/scaling.mjs

echo "===== [$(date '+%F %T')] E3 campaign COMPLETE" | tee -a "$STATUS"
