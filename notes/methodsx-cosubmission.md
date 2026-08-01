# MethodsX co-submission — status and open items

Written 1 August 2026, the day the manuscript was submitted to IST from tag v1.13.19
(commit `3364710`). Draft lives at `paper/methodsx/methodsx-draft.md` (committed `cc742a4`).
It is **not submitted** and is deliberately outside the release gate: it is not part of the
IST artifact and must not change the version the Data Availability statement points at.

## What the route is

Elsevier's in-flow co-submission step happens on the *Attach Files* screen, during submission
of the regular manuscript. That step was missed, and it does not matter. Elsevier's own support
guidance covers the case:

> In case your co-submission is not ready for submission, you can submit your co-submission
> separately after you have submitted your regular manuscript directly to the *Data in Brief*
> or *MethodsX* submission sites.

The condition is that the **IST manuscript number** goes in the template's *Related Research
Article* field. With it, the two articles are still linked on ScienceDirect if both are
accepted. Without it they publish unlinked, which removes the point of co-submitting.

Source: <https://www.elsevier.support/publishing/answer/cosubmission-to-data-in-brief-and-methodsx>

## Recommended timing: after the first IST decision

Not before, and the reason is specific rather than cautious. Protocol stage **R7 already
changed once under review**, from *independent human review of the benchmark implementations*
to *implementation-waste evidence*. That is a change to the protocol itself, not to its
description. If IST reviewers force another such change while a MethodsX article describing the
older protocol is already published, the two become inconsistent and the published version
cannot be withdrawn.

Waiting costs nothing structurally, because linking works retroactively through the manuscript
number.

## Open items, all marked in the draft

1. **IST manuscript number** (`IST-D-26-NNNNN`) — not yet assigned to us at time of writing.
   Do not guess it or infer it from the year; it comes from the author or Editorial Manager.
2. **Specifications table row labels** — flagged `[unverified]`. Reconstructed from secondary
   descriptions because ScienceDirect returned HTTP 403 for the guide and the mirrors returned
   HTTP 429. Align against the mandatory `.docx` template downloaded from the MethodsX
   submission site. The *section* set (Specifications table, Method details, Method validation,
   Limitations, Ethics statements) is verified.
3. **Abstract length** against the template's stated limit.
4. **Reference 14** cites the artifact at v1.13.19. Update if a later release is deposited
   before submission.

## Content division against IST

Redundant publication is the likeliest reason a co-submission is rejected, so the draft closes
with an explicit division. In short: IST keeps the research questions, the measured throughput
and tail latency, the statistical estimands and corrections, and every ranking. The MethodsX
article carries only the procedure — the four declared inputs, the two mandatory and five
recommended stages, the admission gate, the comparator, the compliance levels, and how to
apply the protocol to a new comparison.

The numbers retained under *Method validation* are evidence that admission discriminates (the
oracle rejecting a timestamp conversion that every adapter and the native driver agreed on;
the two avoidable timed-path operations found before campaign acceptance), not findings. If a
reviewer reads any of them as a result, cut it.

## Declarations

CRediT is copied verbatim from the manuscript and must stay identical to it.

The **AI declaration is deliberately different**. The manuscript additionally declares two
independent critical reviews obtained through OpenAI Codex; those apply to the manuscript and
not to this draft. Copying it verbatim would declare a review that did not take place.

## Costs

MethodsX is fully open access, so an APC applies, presented only after acceptance and
personalized by country and affiliation. Worth checking whether the University of Gdansk has an
agreement before committing.

**Data in Brief** for the 67 archived result datasets is a separate, later option carrying its
own charge. Treat it as a decision to make after MethodsX, not alongside it.

## References

- [[reconstruction-2026-08-01]] — the archive-isolated reconstruction whose counts the draft's
  *Method validation* section cites.
- [[protocol-audit-codebook]] — the external-audit coding scheme behind the 63 codings.
- `experiments/protocol-checklist.yaml` — the machine-readable protocol the draft describes.
