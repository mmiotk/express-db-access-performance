# Claims → evidence map

**Purpose.** Every non-obvious assertion in the manuscript is listed here with the exact thing
that supports it. This is the artefact used to answer "is this claim actually backed?" and to
catch fabricated or drifted citations.
**Owner.** Agent proposes rows; author approves the status.
**Update when.** Any time a claim is added, reworded, or its support changes; fully re-audited
before submission.

Support types: `citation` (external source) | `theorem` (proof in this paper) |
`experiment` (run in `experiments/results/`) | `definition` | `none`.
Status: `[verified]` | `[inferred]` | `[assumption]` | `[unverified]`.

| ID | Location (file:line) | Claim (as written) | Support type | Evidence | Status |
|---|---|---|---|---|---|
| C1 | `sections/intro.tex:42` | "no polynomial algorithm is known for X" | citation | `garey1979computers`, Sec. 3.1 | [verified] |
| C2 | `sections/results.tex:110` | "runtime scales sub-linearly" | experiment | `results/2026-07-27-scaling/summary.csv` | [verified] |

## Open items

Claims that are not yet `[verified]`. This section must be empty before submission.

| ID | Why it is not verified | What would settle it |
|---|---|---|

## Claims relying on secondary sources

Each of these must eventually be traced back to the primary source.

| ID | Secondary source used | Primary source to obtain |
|---|---|---|
