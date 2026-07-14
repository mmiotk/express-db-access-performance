# Review Round 3 — triage and response skeleton

Third external reviewer, IST, "major revision" (17 sections), on the current
`ist_main.pdf` (59 pp, R2 version). Verdict: not rejectable; fixable by reframing +
analysis + targeted experiments. Recurring cross-round theme: **claims stronger
than the design supports.** Strategy: claim less, decisively, once.

Disposition: **[REFRAME]** wording only · **[REAN]** reanalysis of existing data ·
**[RESTR]** restructure/budget · **[DOC]** docs/tests · **[NEW]** new run (user
opted into 4) · **[REBUT]** answer/clarify.

## Major (§6)

- 6.1 same-SQL "decompose" → **[REFRAME]** contrast/bound in both abstracts +
  conclusion + methodology estimand name (body already hedged). Residual-from-R2.
- 6.2 primary p99 = saturated closed-loop → **[REFRAME]** state 50-conn/pool-10 at
  the ladder + abstract; narrow "for every pattern"; **[NEW 5a]** both-engine
  sub-saturation open-loop as intrinsic-tail companion.
- 6.3 "idiomatic" underspecified → **[DOC]** per-adapter API/options/alternatives;
  **[NEW 5b]** alt eager-loading sensitivity.
- 6.4 practical recs too broad → **[REFRAME]** already class/pattern-scoped +
  bounded; tighten to conditional per-tier.
- 6.5 Prisma mechanism → **[REFRAME]** abstract "at 50-conn operating point";
  separate observation vs documentation-fact vs inference.
- 6.6 MySQL insert mechanism → **[REFRAME]** "consistent with"; **[NEW 5c]**
  performance_schema wait events to firm it up.
- 6.7 temporal concentration → **[REFRAME]** "runs within one host campaign";
  **[NEW 5d]** post-reboot representative check.
- 6.8 CPU/equal-CPU in supplement → **[RESTR]** compact resource+CPU table to main
  with uncertainty (conflicts with 15k budget → offset by de-dup).

## Statistics (§8)

- p99 gets no inference outside deep_fetch/PG → **[REAN]** paired p99 all
  patterns×engines (p99_samples present).
- adjacent-rank "confirmatory family" not preregistered → **[REFRAME]** planned
  contrasts on observed ranking, reported descriptively.
- "p ≤ 5×10⁻⁵" → **[REFRAME]** "p ≈ 1/20001" (=, none exceeded); fix table.
- TOST margin justified by CV → **[REFRAME]** engineering/deployment relevance.
- interaction: report effect ranges + statistic/exchangeability → **[REAN/REFRAME]**.
- primary vs secondary/exploratory outcomes → **[RESTR]** add a table.
- errors/timeouts in primary tables → **[REAN]** all-zero attestation.

## Minor (§7) — mostly [REFRAME]

title "HTTP-level" (keep, note in reply); "production"/"premiere"/"dominates
perceived" trims; taxonomy → library-level primary; "lower bound" for tuned →
clearer; prepared-stmt "paying off" hedge; precision/CI notation; interval plots
[RESTR]; p99 sample size + HdrHistogram [REAN]; knex n=24 sensitivity [REAN];
errors/status [REAN]; byte-equality/insert-semantics/cache-state → [DOC/REBUT];
NUMA wording; repetition [RESTR]; novelty "no study found" [REFRAME]; prior-Prisma
"not reproducible" document-or-soften [REFRAME]; AI disclosure verification [DOC].

## Artifact (§9) — [DOC]

LICENSE (MIT/CC-BY), DB config dumps + schema/index DDL, raw autocannon/open-loop
JSON, hashes, provenance manifest run-id→cell, stats unit tests, AI-code
verification note.

## §13 questions — answers we hold

1. Adjacency/±5% margin fixed a-priori but NOT preregistered → relabel as planned,
   reported descriptively; repo history available.
2. Blocked interaction statistic = randomized-block F on per-(layer,replicate)
   PG−MySQL log-differences; layer labels exchangeable within replicate under H0.
3. ±5% is a deployment-relevance threshold (capacity/instance-count), not CV-derived.
4. p99 over ≈ rps×12 s requests; autocannon HdrHistogram, sub-ms, ms-rounded.
5. Zero non-2xx/errors/timeouts in the primary 90-cell matrix (fields confirmed 0).
6. Byte-equality compares final serialized JSON bodies (bench/verify.mjs); status
   codes/health checked; headers not compared.
7. TZ=UTC, ISO-8601 dates, Number coercion, BigInt→Number, canonical key order
   (src/adapters/_canon.mjs).
8. Inserts: autocommit single INSERT ... RETURNING id (pg)/insertId (mysql2);
   identical return semantics; createThread uses one transaction.
9. pg-tuned/mysql2-tuned reuse prepared statements per pooled connection.
10. Buffer pools warm across cells (memory-resident seed by design); randomized cell
    order + fresh boot per replicate mitigate carryover.
11. MySQL insert ceiling: [NEW 5c] performance_schema wait evidence.
12. Prisma lead: observation (498% CPU, concurrency-dependent) + documentation
    (in-process engine); pipelining is inference, relabelled.
13. ORM defaults: identity-map/tracking/hooks/validation at library defaults;
    documented per adapter (Stage 4).
14. Maintainers not invited (independence); disclosed as limitation; artifact open.
15. Logging disabled; to be verified at runtime and stated (Stage 4).
16. equal-CPU pins the SERVER process (taskset); DB/generator on disjoint cores.
17. combined app+db CPU excludes generator; kernel/I/O-wait not separately isolated
    (disclose).
18. Every table cell regenerable from raw JSON via committed scripts (MANIFEST).
19. Claude used for harness + analysis; verification = byte-identical cross-check,
    stats unit tests (Stage 4), independent hand-recompute of key stats.
20. effective word count computed in Stage 3 (word-count.md).
