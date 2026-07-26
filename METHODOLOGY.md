# Methodology overview

This file is the short repository-level entry point. The normative treatment record is [`experiments/METHODOLOGY.md`](experiments/METHODOLOGY.md), the runnable procedure is [`REPRODUCE.md`](REPRODUCE.md), and table/figure provenance is in [`experiments/MANIFEST.md`](experiments/MANIFEST.md).

## Factors and outcomes

- 11 configured treatments: nine policy-selected documented paths and two tuned native references. Seven portable layers run on PostgreSQL 18.4 and MySQL 9.7.1.
- Five patterns: point read, keyset range scan, deep fetch, aggregation, and single-row insert.
- Outcomes: throughput and run-level p50/p90/p97.5/p99. The inferential unit is the endpoint-level run, not an individual HTTP request.

## Admission before timing

Read evidence has two separate layers:

1. `bench/verify-spec.mjs` derives expected results by replaying the deterministic seed specification without importing an adapter or querying a database.
2. `bench/verify.mjs` and `bench/verify-property.mjs` establish differential equivalence. The native result is a comparator in this layer, not an independent expected-result oracle.

`bench/verify-writes.mjs` checks the primary single-row insert's intended database state, identifier, and exact row-count change for all nine compatible adapters per engine. It checks commit atomicity and rollback for the adapters that also declare the secondary transactional method (five on PostgreSQL, four on MySQL); `write-admission.json` records that scope. These finite tests establish evidence for the declared task and tested inputs, not correctness for arbitrary programs.

## Campaign controls

- Pool size is fixed at 10; every endpoint receives a discarded 15-second warm-up and a 12-second measurement at 50 connections.
- The revised primary run-level design uses `INDEP=1` and 25 repetitions. A fresh application process is used for every adapter-engine block; read endpoints within a block run sequentially, while database and host caches remain shared.
- Request streams are deterministically paired by endpoint and replicate.
- `bench/verify-campaign-state.mjs` checks exact base/fan-out counts, absence of stray rows, fan-out cardinalities, and the next allocated post identifier.
- The headline single-row insert uses engine-default durability. Relaxed durability is a labelled sensitivity experiment and the Docker workflow default, not the primary insert regime.

The state preflight discovered that the historical MySQL rebuild could allocate benchmark inserts below the cleanup floor. Historical MySQL range-scan, aggregation, and insert cells are therefore not used as clean evidence. The accepted corrected-state primary campaign repeats all five patterns for all compatible native, tuned-native, query-builder, and ORM treatments in one 25-repetition randomized-block campaign (90 cells, 2,250 runs). A second independently ordered same-host campaign repeats the seven portable layers on deep fetch, aggregation, and insert (42 cells, 1,050 runs). It tests whole-campaign sensitivity but is not cross-host replication.

## Interpretation limits

The experiment's treatment is selected mechanically from frozen documentation; it is not observed practitioner behavior. The common-SQL raw-path experiment is a compound sensitivity contrast. Capacity, tail under equal demand, and tail at matched utilization are distinct quantities. All adapters and treatment choices remain single-author; result-blind independent-review packets are provided, but no completed independent human audit is claimed.
