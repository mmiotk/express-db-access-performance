#!/usr/bin/env bash
# R5 measurement campaign — full re-freeze re-run on the latest-stable versions
# (Prisma 7 Rust-free, Drizzle 0.45, TypeORM 1.1, MikroORM 7, Express 5,
# autocannon 8; DB engines PG 18.4 / MySQL 9.7.1). Same protocol as E3: canonical
# byte-identical payloads (verified ALL MATCH before this run), TZ=UTC, paired
# streams, physical write rebuild, DEFAULT durability primary. Runs the primary
# matrix + every secondary experiment (E3 suite + the R3/R4 additions).
#
#   (launched via the harness in the background; logs to results/r5-status.txt,
#    per-stage results/r5-<name>.log)
#
# A failed stage does not abort the campaign (stages are independent given the
# byte-equivalence gate), EXCEPT the primary run.
set -u
cd "$(dirname "$0")/.."   # experiments/
mkdir -p results
STATUS=results/r5-status.txt
: > "$STATUS"

stage() { # stage <name> <cmd...>
  local name="$1"; shift
  local t0=$(date +%s)
  echo "===== [$(date '+%F %T')] stage $name: $*" | tee -a "$STATUS"
  if "$@" > "results/r5-$name.log" 2>&1; then
    echo "OK   $name ($(( $(date +%s) - t0 ))s)" | tee -a "$STATUS"
  else
    echo "FAIL $name ($(( $(date +%s) - t0 ))s) exit=$?" | tee -a "$STATUS"
    return 1
  fi
}

# Back up every pre-r5 secondary dataset (raw.json already backed up by hand).
for f in raw-indep sameplan openloop openloop_mysql fanout equalcpu utilization \
         utilization_mysql cluster mixed poolsize poolsize_mysql waitevents \
         altloading postreboot durability txn-write scaling longrun90; do
  [ -f "results/$f.json" ] && cp -n "results/$f.json" "results/$f.pre-r5.bak"
done

stage durability-default node scripts/set-durability.mjs default || exit 1

# S2 warm-up curves — justifies the WARMUP=15 choice on the new versions
stage warmupcurve node scripts/warmupcurve.mjs

# S3 PRIMARY: 25 repeated runs x 18 cells, shuffled, 12 s runs, 15 s warm-up,
# write in a dedicated boot after a physical rebuild, DEFAULT durability. THE dataset.
stage primary env INDEP=1 REPLICATES=25 DURATION=12 WARMUP=15 \
  RESET_FLOOR=300000 REBUILD_WRITES=1 node bench/runner.mjs || exit 1

# ADOPT the fresh primary as raw.json (INDEP writes raw-indep.json); utilization
# and every table generator read raw.json, so this must happen before them.
cp results/raw-indep.json results/raw.json
echo "OK   adopt raw-indep.json -> raw.json" | tee -a "$STATUS"

# S4/S5 order-invariance A/B on the write endpoint
stage order-fwd env INDEP=1 ENDPOINTS=write ORDER=forward REPLICATES=5 DURATION=12 WARMUP=15 \
  RESET_FLOOR=300000 REBUILD_WRITES=1 INDEP_OUT=order-fwd node bench/runner.mjs
stage order-rev env INDEP=1 ENDPOINTS=write ORDER=reverse REPLICATES=5 DURATION=12 WARMUP=15 \
  RESET_FLOOR=300000 REBUILD_WRITES=1 INDEP_OUT=order-rev node bench/runner.mjs

# S6 relaxed-durability SECONDARY for writes; durability ALWAYS restored afterwards
stage durability-relaxed node scripts/set-durability.mjs relaxed
stage writes-relaxed env INDEP=1 ENDPOINTS=write REPLICATES=10 DURATION=12 WARMUP=15 \
  RESET_FLOOR=300000 REBUILD_WRITES=1 INDEP_OUT=raw-writes-relaxed node bench/runner.mjs
stage durability-restore node scripts/set-durability.mjs default || exit 1

# S7 same-SQL control (median of 10)
stage sameplan env SP_REPS=10 node scripts/sameplan.mjs

# S8 CO-corrected open-loop rate sweep — BOTH engines (review 6.2)
stage openloop      env OL_ENGINE=postgres node scripts/openloop2.mjs
stage openloop_mysql env OL_ENGINE=mysql   node scripts/openloop2.mjs

# S9 deep-fetch fan-out scaling (both engines, replicated)
stage fanout env FO_ENGINES=postgres,mysql node scripts/fanout.mjs

# S10 equal-CPU-slice control (taskset 1/2/4 cores for the server)
stage equalcpu node scripts/equalcpu.mjs

# S11 pool/connection scaling (1..256 connections, deep fetch)
stage scaling env REPEATS=3 RESET_FLOOR=300000 node bench/scaling.mjs

# --- R3/R4 additions ---
# S12 utilization-controlled open-loop (matched utilization), BOTH engines.
#     Reads capacity from the freshly adopted raw.json.
stage utilization       env UL_ENGINE=postgres node scripts/utilization.mjs
stage utilization_mysql env UL_ENGINE=mysql    node scripts/utilization.mjs

# S13 per-layer pool-size frontier, BOTH engines
stage poolsize       env PS_ENGINE=postgres node scripts/poolsize.mjs
stage poolsize_mysql env PS_ENGINE=mysql    node scripts/poolsize.mjs

# S14 alternative eager-loading strategy (both engines)
stage altloading env AL_ENGINES=postgres,mysql node scripts/altloading.mjs

# S15 multi-worker node cluster (both engines)
stage cluster env CL_ENGINES=postgres,mysql node scripts/cluster.mjs

# S16 mixed read/write workload (both engines)
stage mixed env MX_ENGINES=postgres,mysql node scripts/mixed.mjs

# S17 write throughput under 3 durability regimes (self-manages durability)
stage durability node scripts/durability.mjs

# S18 MySQL commit-flush wait events (root perf_schema)
stage waitevents node scripts/waitevents.mjs

# S19 post-restart robustness — reboots BOTH engines; MUST be last
stage postreboot node scripts/postreboot.mjs

echo "===== [$(date '+%F %T')] R5 campaign COMPLETE" | tee -a "$STATUS"
