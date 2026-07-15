# R5 re-propagation brief — apply once the campaign finishes

The full re-run (`scripts/r5-campaign.sh`, logs `results/r5-status.txt`) produces a
new `raw.json` + all secondary JSONs on the latest-stable versions. When it
completes, apply everything below against the new numbers. Number-INDEPENDENT items
already done in the pre-campaign pass are marked ✅ (do not redo).

## Adoption + regeneration (do first)
- Confirm `results/raw.json` was adopted from `raw-indep.json` (campaign does this).
- Regenerate every table: `node scripts/ci-tables.mjs` (5 pattern tables w/ CI),
  `scripts/gen-tables.mjs`, `scripts/gen-r4-tables.mjs` (utilization/cluster/mixed),
  `scripts/gen-openloop-mysql.mjs`, sameplan/durability/etc.; then `npm run sync:tables`.
  REMINDER: `sync:tables` overwrites paper/tables from results/tables — hand-edited
  captions (altloading S18, etc.) must be edited in results/tables too.
- Re-run `stats2.mjs`/`analyze.mjs` (TOST, bootstrap, permutation, ranks).

## THE headline change — Prisma 7 (verify against data, report honestly)
Smoke already shows Prisma deep-fetch CPU ~110% (was ~498%) and lower throughput.
Confirm from the new raw.json, then across results/threats/discussion/abstract/conclusion:
- **Retire** the "cores-for-latency / ties native at ~5× CPU / 469-498% / multi-threaded
  Rust engine / pipelined query engine" story (results.tex:~277-312, 90-91;
  threats.tex:73-79,105-113). Prisma 7 is Rust-free (JS driver adapter: pg / mariadb).
- **Report the new v7 behavior** as the current finding AND the old→new contrast as the
  paper's strongest evidence for "rankings are perishable, methodology is durable."
- Note Prisma 7's MySQL path uses the **mariadb** driver via `@prisma/adapter-mariadb`
  (no mysql2 adapter exists) — driver differs from the other layers; disclose.
- New defect the cross-check caught: Prisma-7 PG **TIMESTAMPTZ 2 h mislabel**, fixed by
  forcing the session to UTC — add to the pitfalls/cross-check narrative (a fresh example).

## Freeze rule + experimental setup (methodology.tex:315-330) — Priority 1
Rewrite the setup paragraph with the R5 facts:
- Measurement dates = the actual r5-campaign dates (check r5-status.txt timestamps).
- Host/runtime: Node.js 24.18.0; Express **5** now (drop the "we pin Express 4 not 5"
  paragraph entirely — we are on Express 5).
- **Freeze rule (Priority-1 policy):** "Each library is pinned to the latest stable
  release compatible with the harness adapter contract as of the freeze date
  (2026-07-15), recorded from the committed lockfile and the environment capture; a
  library is pinned to an earlier release only where the latest stable breaks the
  contract or the byte-equivalence cross-check, documented per layer. Only Sequelize
  invokes this: its v7 line is a prerelease, so the 6.x stable line is used.
  Prereleases and unreleased point versions are otherwise excluded. This pins a dated
  snapshot, not a permanent ranking." → answers Q1/Q2 and Priority 1.
- Refresh the versions table (supplement `tab:versions`, S11) + `METHODOLOGY.md:34-44`
  per-layer doc-URL+version from the new lockfile; `schema/db-config.md`.

## Estimand restructure — Stage 3 (full)
- methodology.tex:15-20 + intro: NAME the three estimands — **equal external demand**
  (saturated matrix), **equal utilization** (utilization sweep), **equal resource budget**
  (equal-CPU) — and map each experiment to one; keep default-config vs same-SQL as an
  orthogonal axis.
- Elevate matched-utilization (S21/S22) to **co-primary in the MAIN text** + a
  utilization-vs-p99 figure; state it as the near-intrinsic-latency result.
- Demote saturated p99 to **overload/queueing behavior**; propagate the caveat already at
  results.tex:222 / supplement.tex:268-271 ("saturated tail tracks capacity, not intrinsic
  latency") to the **abstract, introduction, conclusion** (they omit it).
- RQ1 (introduction.tex:79-88): "overhead" → **"performance difference relative to the
  native baseline"**; align results heading (results.tex:26). Rebuild RQs around the triad.
- Abstract: lead with instrument + methodology; state the large saturated p99 differences
  **largely reflect capacity, not inherent per-request latency**.

## Language sweep — Stage 5
- **"abstraction cost" → "observed implementation-and-strategy difference"**:
  introduction.tex:114, both abstracts :62, conclusion.tex:11, discussion.tex:5.
- results.tex:70-72 "abstraction is cheap when a layer merely forwards a query" → tighten.
- discussion.tex:129 "recovers most of the deep fetch's cost" → obey the compound-contrast
  caution (bounds, not recovers).

## Statistics breadth — Stage 4
- Extend the paired effect-size + bootstrap-CI table (`significance_deep_fetch` pattern) to
  **writes** and at least one **cross-engine** comparison.
- Add **p99 CIs** to `ci-tables.mjs` (bootstrap the run-level p99; currently bare) → main
  pattern tables carry p99 [95% CI]. ✅ caption already relabelled "within-campaign".
- Adjacent-rank: weaken "statistically and practically supported" → descriptive
  (post-selection stated).
- Permutation: exchangeability justification/diagnostic + compact blocked-permutation math
  spec (supplement).
- p99 transparency: report approx request count contributing to p99 in slowest cells +
  histogram resolution.
- ✅ TOST already sharpened to "author-selected SESOI for this study."

## Results-narrative minors — Stage 5
- "pipelined query engine" (results.tex:90-91): OBSOLETE under v7 → remove/replace.
- open-loop "collapse" (results.tex:215-217): give the exact numeric timeout threshold or
  mark descriptive.
- state the tuned-control exclusion each time "native leads."
- stop treating the three-tier taxonomy as an explanatory variable (discussion).
- abstract "1.5× ... the residual is small": drop "small" (and update the number).

## Already done (number-independent, pre-campaign) ✅
- methodology minors: byte-identical *data* vs physical state; RAM working-set caveat; TOST
  SESOI framing.
- novelty search auditable: related_work.tex protocol (strings/dates/eligibility/scoping) +
  notes/related-work-search.md composed queries + coverage note; softened "we found none"
  ×3 in introduction.tex.
- ci-tables.mjs caption relabelled "within-campaign."

## Close-out — Stage 6/7
- Length recount under IST rule (refs + floats×200) < 15,000 with margin; move defensive
  detail to supplement; restructure around three findings.
- Clean-room reproduction from the Zenodo tarball (answers Q7) + reproduction note.
- Point-by-point response letter (17 sections + 8 questions + 17-item checklist + Q8
  anonymization); adversarial re-review; rebuild PDFs + package; **Zenodo v1.5.0**; tag +
  release only when the user asks.
