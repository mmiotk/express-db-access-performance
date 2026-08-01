# MethodsX co-submission — working draft

**Status: draft for author review. Not submitted. Not release-gated.**

Two things must be resolved before this leaves the repository:

1. The **Specifications table row labels below are `[unverified]`.** They are reconstructed
   from secondary descriptions of the template, because the official template could not be
   retrieved (ScienceDirect returned HTTP 403 and the mirrors returned HTTP 429). Download the
   mandatory `.docx` template from the MethodsX submission site and align the labels, order,
   and any rows omitted here before transcribing.
2. The **Related research article** field needs the IST manuscript number assigned at
   submission. Without it the two articles will not be linked on ScienceDirect.

The section set itself (Specifications table, Method details, Method validation, Limitations,
Ethics statements) is `[verified]` against the MethodsX author guidance.

---

## Title

Reporting a comparability protocol for benchmarking relational database access layers

Alternative, if the editor prefers the customization framing:
*A protocol for admitting database access layers into a benchmark before timing them*

## Related research article

`[TO COMPLETE]` M. Miotk, A Comparability Protocol for Benchmarking Relational Database
Access Layers in Express.js, Information and Software Technology, submitted 1 August 2026,
manuscript number `[IST-D-26-XXXXX]`.

## Abstract

Benchmarks that compare database access layers routinely time implementations without first
establishing that those implementations perform the same task. When one layer returns fewer
fields, resolves a relation with a different number of statements, or fails faster than it
succeeds, the resulting ranking measures the difference in task rather than the difference in
library. This article describes an executable protocol that separates admission from
measurement: a treatment is timed only after it has been shown to satisfy an expected-result
specification derived independently of the code under test, to be mutually equivalent to the
other treatments under a declared comparator, and to leave the intended database state after
mutations. The protocol fixes four inputs, defines two mandatory and five recommended stages,
and states a per-cell admission gate that either passes or disqualifies a cell before any
timing occurs. It is distributed as a machine-readable checklist alongside a reference
implementation covering eleven configured access layers on PostgreSQL and MySQL, so that an
instantiation can be audited programmatically rather than by reading prose. The protocol is
domain-independent in structure: the admission stages apply to any comparison of
implementations that are supposed to compute the same result by different means.

`[Check length against the template. MethodsX abstracts are short; trim to the stated limit.]`

## Keywords

benchmarking protocol; semantic admission; database access layer; object-relational mapping;
measurement validity; reproducible benchmarking

## Specifications table

`[unverified — align row labels with the official template before submission]`

| | |
|---|---|
| Subject area | Computer Science |
| More specific subject area | Empirical software engineering; performance benchmarking |
| Name of your method | Comparability protocol for benchmarking database access layers |
| Name and reference of original method | Not applicable. The protocol is newly specified. It composes established practice in experiment design and measurement rigor, cited in the Method details, rather than modifying a single prior method. |
| Resource availability | Reference implementation, machine-readable checklist, and archived records: https://doi.org/10.5281/zenodo.21313858 (concept DOI, resolves to the current release). Source repository: https://github.com/mmiotk/express-db-access-performance. Code under MIT, text under CC BY 4.0. |

---

# Method details

## The problem the protocol addresses

A benchmark comparing access layers produces a ranking. For that ranking to mean what readers
take it to mean, every compared implementation must be doing the same job. This is not
guaranteed by returning HTTP 200. Across the eleven implementations used to develop this
protocol, the failure modes that admission catches were all observed in practice: a layer
whose timestamp conversion shifted instants by the host UTC offset, a layer emitting console
output on every request, and a layer acquiring and discarding an unused handle per request.
Each would have been timed, and each would have produced a defensible-looking number.

The protocol therefore makes admission a precondition of timing rather than a validity check
performed afterwards. Its unit is the **cell**: one (treatment, workload-point) pair. A cell
is timed only if it passes the admission gate; otherwise it is disqualified and reported as
such.

## Relation to established practice

The protocol composes existing guidance rather than replacing it, and it is worth being precise
about which part is new.

Rigorous performance measurement is well covered. Established work prescribes how to repeat,
summarize, and report measurements [7,9], warns that incidental environmental factors can
produce confidently wrong numbers [8], and shows how much of that survives on virtualized
infrastructure [10]. Guidance on empirical software engineering supplies the surrounding
design vocabulary and validity categories [3–6]. Benchmark design for data-serving systems is
likewise established [2], and the distinction between open and closed workload models [11],
together with the tail-measurement pitfalls that follow from ignoring it [12,13], is what
inputs IN4 and stages R4 and R5 encode.

What none of that supplies is a gate. Existing guidance tells you how to measure well; it
assumes the things you are measuring are comparable. For database access layers that
assumption is unsafe, because the layers differ in what they return and in how many statements
they issue to return it, and those differences are known to be consequential [1]. The
contribution of this protocol is therefore narrow and specific: it makes semantic equivalence
a **precondition of timing**, with a stated pass or fail rule, rather than a caveat discussed
afterwards.

The reference implementation is archived and citable [14].

## Four declared inputs

An instantiation must fix these before measurement. They are inputs, not stages, because the
protocol does not prescribe their content — only that they be declared.

| ID | Input | Requirement |
|---|---|---|
| IN1 | Treatments | The set of implementations under comparison, each a configured bundle of library, version, and query and loading strategy — not the library name alone. |
| IN2 | Declared workload model | Stated access patterns, fixed for all treatments. A declared model, not a captured production trace. |
| IN3 | Output equivalence semantics | A definition of when two responses count as equivalent: byte-identical, set equality, numeric tolerance, or canonicalization. |
| IN4 | Operating point definition | An explicit separation of capacity, external demand, and utilization. Every reported number is tied to one operating point. |

IN1 carries most of the protocol's weight. Treating "Prisma" or "TypeORM" as a treatment is
the single most common source of incomparability, because the same library reached through a
different loading strategy is a different treatment. The bundle, not the name, is what gets
compared.

## Two mandatory stages

**M1, semantic admission.** Admit a treatment only if three conditions hold. Reads satisfy an
expected-result oracle *derived independently of the timed implementation* — the oracle must
not be the native driver's own output, or it certifies nothing. Implementations are mutually
equivalent under the comparator declared in IN3. Mutations produce the intended database
state, checked at field, identifier, row-count, and rollback level, rather than merely
returning a success status.

The independence requirement is what distinguishes M1 from ordinary integration testing. In
the reference implementation the oracle replays a deterministic seed specification and
computes expected results from that specification, so an error shared by every adapter and the
native driver would still be caught.

**M2, treatment definition.** Fix each treatment's implementation and loading strategy by a
rule declared reproducibly in advance.

This stage is deliberately weaker than it could be. The protocol **requires** such a rule and
**privileges none**. The reference instantiation uses a documentation-first rule — the API the
official documentation presents first, with frozen source pages and recorded hashes — but a
survey-derived rule, a performance-tuned rule, or an expert-panel rule would satisfy M2
equally. What M2 forbids is choosing each treatment's strategy ad hoc, because that makes the
comparison unfalsifiable: any adverse result can be attributed to a strategy the author would
not have chosen.

## Five recommended stages

Recommended stages license additional interpretations. An instantiation may omit them, and may
scope them to a subset of treatments, provided it says so.

| ID | Stage | What it licenses |
|---|---|---|
| R3 | Common-SQL raw-path sensitivity | A contrast in which every layer executes common SQL through its raw facility, bounding how much of the spread survives when query construction is held constant. |
| R4 | Capacity characterization | Locating estimated saturating throughput per treatment by a concurrency sweep, so a fixed operating point can be read against capacity. |
| R5 | Operating-point separation | Measuring the tail at equal external demand *and* at matched fractions of each treatment's estimated capacity, disclosing denominator uncertainty, and reporting the two as distinct quantities. |
| R6 | Resource accounting | Reporting compute and memory use alongside throughput, or an explicitly labelled equal-budget sensitivity comparison. |
| R7 | Implementation-waste evidence | Recorded evidence that no compared implementation does avoidable work on the timed path beyond the declared task, and the disposition of anything found. |

R7 deserves comment because it was revised during development. It was originally specified as
*independent human review of the benchmark implementations*. That requirement was unsatisfiable
in a way that mattered: human review is neither reproducible nor rerunnable by a reader, so an
instantiation claiming it offered nothing checkable. R7 now demands **evidence**, which may be
mechanical or human. Mechanical evidence is preferred because a reader can rerun it. In the
reference implementation two mechanical checks discharge part of it: a static check reporting
values acquired and never read, and a runtime gate rejecting any cell that writes to standard
output or standard error during a measured run.

Neither check closes R7. Waste that is silent *and* invisible in the source — an unnecessarily
expensive but documented configuration, say — passes both. R7 is reported as narrowed, not
discharged. An instantiation should do the same rather than claim the stage as satisfied.

## The admission gate

Stated operationally, because this is the part that a harness implements:

> Time a (treatment, workload-point) cell **only if** semantic admission passes:
> specification-conformant and mutually equivalent non-mutating outputs, plus correct
> post-write state.

Disqualifiers, any one of which prevents timing:

- expected-result mismatch against the declared task specification;
- non-equivalent output under the declared cross-implementation comparator;
- invalid or unsuccessful write state.

The gate runs before every accepted campaign, not once during development. This matters
because a dependency upgrade can reintroduce a semantic difference that a one-time check
would have missed.

## Choosing the comparator

Byte-identical comparison is valid only when equivalent outputs are deterministic and
canonically serializable. Where they are not, IN3 must declare a semantic comparator: set
equality for unordered collections, numeric tolerance for floating-point aggregates, or
canonicalization before comparison.

The reference implementation canonicalizes: every adapter funnels rows through shared
constructors that fix the field set, key order, and typing under a fixed time zone, and then
compares bytes. The constructors copy and type-normalize already-grouped rows without
querying, joining, regrouping, sorting, or caching, so they cannot smuggle work out of a
treatment and into shared code. Their standalone cost was measured and reported precisely so a
reader can check that claim rather than accept it.

## What the protocol licenses reporting

Throughput and tail latency per operating point, read as:

- descriptive of the treatment as defined, **not** a causal decomposition into library
  machinery versus strategy;
- configuration-specific and version-specific;
- valid within the declared condition, with transfer across environments requiring independent
  evaluation.

An instantiation that reports a layer as "faster" without the configuration and version
attached has exceeded what the protocol licenses.

## Compliance levels

The protocol defines named coverage levels so that an instantiation can state how far it went
instead of implying full coverage. A study reporting its level, and which recommended stages
it scoped or omitted, is auditable; one that reports only results is not.

## Machine-readable checklist

The protocol ships as `experiments/protocol-checklist.yaml`. Each stage carries five fields:
what it requires, how to check it, the failure that follows if it is skipped, how the reference
study satisfies it, and its epistemic limit. The last field is the one most often absent from
methodological guidance: it records what the stage does *not* establish. M1's limit, for
instance, states that finite checks establish conformance for tested inputs and comparability
among implementations, and are not a proof of correctness for all inputs.

The file is intended for tooling. Field names are stable identifiers, so an instantiation can
be scored programmatically against the protocol rather than assessed by reading prose.

## Applying the protocol to a new comparison

1. Declare IN1–IN4 in writing before measuring, including the M2 selection rule.
2. Implement an expected-result oracle from the task specification, independently of any
   implementation under test.
3. Implement the declared comparator; canonicalize if you intend byte comparison.
4. Run the admission gate over the full (treatment, workload-point) matrix. Disqualify and
   report failures; do not repair a treatment and quietly re-admit it without saying so.
5. Time only admitted cells.
6. Decide which recommended stages you will attempt, and state the scope of each.
7. Report the compliance level reached, the stages omitted, and the epistemic limits carried.

Steps 1 and 4 are where instantiations most often depart from the protocol, in opposite
directions: declaring inputs after seeing results, and treating admission as a debugging phase
rather than a gate whose failures are reported.

---

# Method validation

MethodsX asks for evidence that the method works, not for the findings of the study that used
it. What follows is evidence about the protocol, not about which access layer is faster.

**The oracle discriminates.** The specification-derived oracle executed 73,080 expected-result
checks independently of every adapter. It is not a tautological check: during development it
rejected a timestamp conversion that shifted PostgreSQL instants by the host UTC offset, which
had passed ordinary functional testing because every adapter and the native driver agreed with
each other while all disagreeing with the specification.

**Admission catches real waste.** A result-blind audit conducted under R7 before campaign
acceptance found two avoidable timed-path operations in the reference implementation. Both
were removed, the admission chain was rerun, and measurement restarted from the first
repetition. Both classes are now detected mechanically, which is the change that turned R7
from a stage requiring trust into one producing evidence.

**The comparator is not doing hidden work.** A fixed-payload endpoint measures the shared
framework and serialization floor. It exceeded the fastest measured cell by more than a factor
of three, establishing that differences arose in how implementations reached an identical
response rather than in the shared path.

**The record reconstructs from the archive.** The archived artifact was exported to a clean
directory with no database available and no access to the original measurement hosts. All 67
archived datasets verified against their recorded checksums, and 42 of the 58 reported tables
regenerated byte-for-byte from those datasets by committed code. Six generator-backed tables
were not reachable without a database and were byte-compared rather than regenerated; that
distinction is reported rather than blurred, since byte comparison is weaker evidence than
regeneration.

**The checklist is applicable by someone other than its author.** The protocol was applied to
a corpus of external benchmark reports, producing 63 codings against the stage definitions.
This establishes that the stages can be applied to material the protocol did not anticipate.
It does not establish inter-rater reliability, for the reason given under Limitations.

---

# Limitations

The protocol is a **candidate**, not a validated instrument. It has one worked instantiation,
by its author.

**Single-rater audit.** The external application of the checklist has one rater, who is also
the protocol's author. Inter-rater agreement is therefore unmeasured, and general independent
applicability remains to be tested. A reader should treat the codings as evidence that the
stages are applicable, not that they are applied consistently across raters.

**Author-implemented reference.** All eleven adapters in the reference implementation were
written by one author. A semantically correct but needlessly expensive adapter passes every
admission check. Mechanical R7 evidence narrows this residual without closing it.

**Stages are unevenly enforceable.** M1 is mechanically checkable. M2 is not: the protocol can
verify that a selection rule was declared and applied, but not that it was declared before the
results were seen. An instantiation's compliance with M2 rests on its record-keeping, and a
reader must judge that record rather than rely on a check.

**Recommended stages postdating measurement.** In the reference instantiation several
admission elements were specified after the campaigns they audit. Because they replay a
deterministic seed and inspect archived state, they can invalidate archived results, and did
so for a superseded pilot. But they did not gate the runs as those runs executed, so a defect
observable only while a run was in progress would have escaped them. Any instantiation
retrofitting the protocol to an existing campaign inherits this limitation and should state it.

**Scope of the reference domain.** The protocol was developed against HTTP-level measurement
of relational access layers under Node.js. Its admission logic is domain-independent, but its
stage set is not demonstrated outside that domain. R3, in particular, presumes that treatments
share a raw-SQL escape hatch, which need not hold elsewhere.

**Not a causal instrument.** The protocol establishes comparability. It does not decompose an
observed difference into library machinery versus configured strategy, and an instantiation
that reads its output causally has overclaimed.

---

# Ethics statements

This work did not involve human participants, animal subjects, or data collected from social
media platforms. No ethical approval was required.

## Funding

This research did not receive any specific grant from funding agencies in the public,
commercial, or not-for-profit sectors.

## CRediT author statement

**Mateusz Miotk:** Conceptualization, Methodology, Software, Investigation, Data curation,
Formal analysis, Visualization, Writing – original draft, Writing – review & editing.

Taken verbatim from the IST manuscript. The two statements must remain identical; if the IST
version changes during review, change this one with it.

## Declaration of competing interest

The author declares no known competing financial interests or personal relationships that
could have appeared to influence the work reported in this paper. The author is not affiliated
with, nor funded by, any of the database libraries or vendors evaluated in the reference
instantiation.

## Declaration of generative AI and AI-assisted technologies

During the preparation of this work the author used Claude (Anthropic) to draft and edit
manuscript text and improve its readability and language. After using this tool, the author
reviewed and edited the content as needed and takes full responsibility for the content of the
published article. AI assistance that formed part of the research itself is separate from the
preparation use declared here: it covered implementation of the benchmark harness and analysis
code described in the Method details, and extended to proposing candidate analysis procedures,
which the author selected among, verified, and interpreted. The models, affected components,
independent checks on the generated code, and the limits of that assistance are documented in
the related research article and in the archived artifact.

**This declaration is deliberately not identical to the one in the IST manuscript.** That
manuscript additionally declares two independent critical reviews obtained through OpenAI
Codex, which apply to that manuscript and not to this one. Copying it verbatim would declare
a review that did not take place. If this article is later put through such a review, add it
here then.

---

# References

Fourteen sources, each already recorded as verified in `SOURCE_LEDGER.md` and cited in the IST
manuscript. The statistical sources of that manuscript are deliberately absent, because the
analysis stays in IST under the overlap division below. Rendered text taken from the built
manuscript; the two DOIs that `pdftotext` corrupted on extraction were restored from
`references.bib`.

*Why access layers need admission before timing*

1. T.-H. Chen, W. Shang, Z. M. Jiang, A. E. Hassan, M. Nasser, P. Flora, Detecting performance
   anti-patterns for applications developed using object-relational mapping, in: Proceedings of
   the 36th International Conference on Software Engineering (ICSE), ACM, 2014, pp. 1001–1012.
   doi:10.1145/2568225.2568259.
2. B. F. Cooper, A. Silberstein, E. Tam, R. Ramakrishnan, R. Sears, Benchmarking cloud serving
   systems with YCSB, in: Proceedings of the 1st ACM Symposium on Cloud Computing (SoCC), ACM,
   2010, pp. 143–154. doi:10.1145/1807128.1807152.

*Experiment design and empirical method*

3. V. R. Basili, H. D. Rombach, The TAME project: Towards improvement-oriented software
   environments, IEEE Trans. Softw. Eng. 14 (6) (1988) 758–773. doi:10.1109/32.6156.
4. B. A. Kitchenham, S. L. Pfleeger, L. M. Pickard, P. W. Jones, D. C. Hoaglin, K. El Emam,
   J. Rosenberg, Preliminary guidelines for empirical research in software engineering, IEEE
   Trans. Softw. Eng. 28 (8) (2002) 721–734. doi:10.1109/TSE.2002.1027796.
5. C. Wohlin, P. Runeson, M. Höst, M. C. Ohlsson, B. Regnell, A. Wesslén, Experimentation in
   Software Engineering, Springer, Berlin, Heidelberg, 2012. doi:10.1007/978-3-642-29044-2.
6. T. D. Cook, D. T. Campbell, Quasi-Experimentation: Design and Analysis Issues for Field
   Settings, Houghton Mifflin, Boston, MA, 1979.

*Rigor in performance measurement*

7. A. Georges, D. Buytaert, L. Eeckhout, Statistically rigorous Java performance evaluation,
   in: Proceedings of the 22nd ACM SIGPLAN Conference on Object-Oriented Programming Systems,
   Languages and Applications (OOPSLA), ACM, 2007, pp. 57–76. doi:10.1145/1297027.1297033.
8. T. Mytkowicz, A. Diwan, M. Hauswirth, P. F. Sweeney, Producing wrong data without doing
   anything obviously wrong!, in: Proceedings of the 14th International Conference on
   Architectural Support for Programming Languages and Operating Systems (ASPLOS), ACM, 2009,
   pp. 265–276. doi:10.1145/1508244.1508275.
9. T. Kalibera, R. Jones, Rigorous benchmarking in reasonable time, in: Proceedings of the 2013
   International Symposium on Memory Management (ISMM), ACM, 2013, pp. 63–74.
   doi:10.1145/2464157.2464160.
10. C. Laaber, J. Scheuner, P. Leitner, Software microbenchmarking in the cloud. How bad is it
    really?, Empir. Softw. Eng. 24 (4) (2019) 2469–2508. doi:10.1007/s10664-019-09681-1.

*Operating points and the tail — the basis of IN4, R4 and R5*

11. B. Schroeder, A. Wierman, M. Harchol-Balter, Open versus closed: A cautionary tale, in:
    Proceedings of the 3rd USENIX Symposium on Networked Systems Design and Implementation
    (NSDI), USENIX Association, 2006.
    https://www.usenix.org/legacy/event/nsdi06/tech/schroeder.html
12. G. Tene, How NOT to measure latency, conference presentation, QCon San Francisco, 2015.
    https://www.infoq.com/presentations/latency-response-time/ (accessed 10 July 2026).
13. M. Fruth, S. Scherzinger, W. Mauerer, R. Ramsauer, Tell-tale tail latencies: Pitfalls and
    perils in database benchmarking, in: Performance Evaluation and Benchmarking (TPCTC 2021),
    Vol. 13169 of Lecture Notes in Computer Science, Springer, 2022, pp. 119–134.
    doi:10.1007/978-3-030-94437-7_8.

*The method's own artifact — cited as software, as the guide requires*

14. M. Miotk, Replication package for A Comparability Protocol for Benchmarking Relational
    Database Access Layers in Express.js [software], Zenodo, version 1.13.19, 2026.
    doi:10.5281/zenodo.21313858.

Reference 14 must be updated if a later release is deposited before submission. The guide is
explicit that the software itself is cited, in addition to any article describing it, and not
replaced by that article.

---

# Overlap control — read before submitting

MethodsX and IST must not publish the same content. The division applied in this draft:

| Belongs in IST | Belongs here |
|---|---|
| Research questions and findings | The protocol as a procedure |
| Measured throughput and tail latency | The admission gate and how to implement it |
| Statistical estimands, corrections, intervals | Nothing — omit entirely |
| Threats to validity of the findings | Limitations of the protocol |
| Which layer is faster | No ranking appears here at all |

The numbers retained in Method validation are there as evidence about the protocol's
discriminating power, not as results. If a reviewer reads any of them as a finding, cut it.
