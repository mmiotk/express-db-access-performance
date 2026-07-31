# Source ledger

**Purpose.** Single registry of every reference in `references.bib`, with proof that its
metadata was checked against an authoritative API. A `.bib` entry with no row here is
considered unverified and must not be cited.
**Owner.** Agent writes rows; author owns the "Read?" and "Trust" columns.
**Update when.** Immediately after any entry is added to or changed in `references.bib`.

Verification sources: `crossref` | `openalex` | `dblp` | `arxiv` | `s2` | `publisher`.
Read: `full` (read in full) | `skim` | `abstract-only`.

**Generated** by `scripts/gen_source_ledger.py` from `paper/references.bib` and a
`scripts/verify_refs.py` run on 2026-07-31. Do not hand-edit the table; rerun the generator.
The `Read?` and `Trust` columns are the author's and are intentionally blank.

**Status:** 65 entries, 65 cited, 65 API-confirmed.

**0 cited entries are not API-confirmed** and must be settled before
submission, per CLAUDE.md section 6: .

**0 entries are in the .bib but never cited**, which CLAUDE.md section 10 forbids at
submission: .

| BibTeX key | DOI / arXiv ID | Verified against | Date | Read? | Preprint≠published? | Notes |
|---|---|---|---|---|---|---|
| `arcuri2014hitchhiker` | 10.1002/stvr.1486 | crossref | 2026-07-31 | |  |  |
| `autocannon` | — | project-page | 2026-07-31 | | n/a |  |
| `basili1988tame` | 10.1109/32.6156 | crossref | 2026-07-31 | |  |  |
| `bonvoisin2024orm` | 10.1109/SANER60148.2024.00069 | crossref | 2026-07-31 | |  |  |
| `carmo2024backend` | 10.1145/3658271.3658314 | crossref | 2026-07-31 | |  |  |
| `chaniotis2015nodejs` | 10.1007/s00607-014-0394-9 | crossref | 2026-07-31 | |  |  |
| `chen2014orm` | 10.1145/2568225.2568259 | crossref | 2026-07-31 | |  |  |
| `chen2016cacheoptimizer` | 10.1145/2950290.2950303 | crossref | 2026-07-31 | |  |  |
| `chen2016redundant` | 10.1109/TSE.2016.2553039 | crossref | 2026-07-31 | |  |  |
| `cheung2013querysynthesis` | 10.1145/2491956.2462180 | crossref | 2026-07-31 | |  |  |
| `cheung2014sloth` | 10.1145/2588555.2593672 | crossref | 2026-07-30 | |  |  |
| `cliff1993dominance` | 10.1037/0033-2909.114.3.494 | crossref | 2026-07-31 | |  |  |
| `collberg2016repeatability` | 10.1145/2812803 | crossref | 2026-07-31 | |  |  |
| `colley2018orm` | 10.1109/iccecome.2018.8659222 | crossref | 2026-07-31 | |  |  |
| `cook1979quasi` | — | openlibrary | 2026-07-31 | |  |  |
| `cooper2010ycsb` | 10.1145/1807128.1807152 | crossref | 2026-07-31 | |  |  |
| `dean2013tail` | 10.1145/2408776.2408794 | crossref | 2026-07-31 | |  |  |
| `drizzle_benchmarks` | — | vendor-page | 2026-07-31 | | n/a |  |
| `fowler2002patterns` | — | publisher | 2026-07-31 | |  |  |
| `fruth2022tail` | 10.1007/978-3-030-94437-7\_8 | crossref | 2026-07-31 | |  |  |
| `georges2007rigorous` | 10.1145/1297027.1297033 | crossref | 2026-07-31 | |  |  |
| `gupta2017pooling` | 10.1109/ICECA.2017.8212833 | crossref | 2026-07-31 | |  |  |
| `harizopoulos2008oltp` | 10.1145/1376616.1376713 | crossref | 2026-07-31 | |  |  |
| `hasselbring2021benchmarking` | 10.1145/3463274.3463361 | crossref | 2026-07-31 | |  |  |
| `huppler2009benchmark` | 10.1007/978-3-642-10424-4\_3 | crossref | 2026-07-31 | |  |  |
| `imamsakti2025async` | 10.1016/j.procs.2025.08.270 | crossref | 2026-07-31 | |  |  |
| `imdbench` | — | project-page | 2026-07-31 | | n/a |  |
| `ireland2009impedance` | 10.1109/DBKDA.2009.11 | crossref | 2026-07-31 | |  |  |
| `jiang2015load` | 10.1109/TSE.2015.2445340 | crossref | 2026-07-31 | |  |  |
| `kalibera2013rigorous` | 10.1145/2464157.2464160 | crossref | 2026-07-31 | |  |  |
| `kitchenham2002guidelines` | 10.1109/TSE.2002.1027796 | crossref | 2026-07-31 | |  |  |
| `kounev2020benchmarking` | 10.1007/978-3-030-41705-5 | crossref | 2026-07-30 | |  |  |
| `krishnamachari2026stats` | arXiv:2605.00428 | arxiv | 2026-07-30 | | n/a |  |
| `kuffel2025nodejs` | 10.1007/978-3-031-87880-0\_14 | crossref | 2026-07-31 | |  |  |
| `laaber2019microbenchmarking` | 10.1007/s10664-019-09681-1 | crossref | 2026-07-31 | |  |  |
| `laigner2021microservices` | 10.14778/3484224.3484232 | crossref | 2026-07-30 | |  |  |
| `leis2015optimizers` | 10.14778/2850583.2850594 | crossref | 2026-07-31 | |  |  |
| `leitner2017exploratory` | 10.1145/3030207.3030213 | crossref | 2026-07-31 | |  |  |
| `li2013sqlnosql` | 10.1109/PACRIM.2013.6625441 | crossref | 2026-07-31 | |  |  |
| `li2014tales` | 10.1145/2670979.2670988 | crossref | 2026-07-30 | |  |  |
| `lorenz2017orm` | 10.24251/HICSS.2017.592 | crossref | 2026-07-31 | |  |  |
| `miotk2026artifact` | 10.5281/zenodo.21313858 | crossref | 2026-07-31 | | n/a |  |
| `mytkowicz2009producing` | 10.1145/1508244.1508275 | crossref | 2026-07-31 | |  |  |
| `orm_compare_jcct_2025` | 10.14456/jcct.2025.16 | publisher | 2026-07-30 | |  |  |
| `papadopoulos2021reproducible` | 10.1109/TSE.2019.2927908 | crossref | 2026-07-31 | |  |  |
| `pratama2023nodebench` | 10.62527/joiv.7.4.1762 | crossref | 2026-07-31 | |  |  |
| `prisma_benchmarks` | — | vendor-page | 2026-07-31 | | n/a |  |
| `prisma_rawsql_2025` | 10.1016/j.procs.2025.09.061 | crossref | 2026-07-31 | |  |  |
| `raasveldt2018fair` | 10.1145/3209950.3209955 | crossref | 2026-07-30 | |  |  |
| `rigger2020sqlancer` | — | dblp | 2026-07-30 | |  |  |
| `sadalage2012nosql` | — | publisher | 2026-07-31 | |  |  |
| `salunke2024pgmysql` | 10.3390/fi16100382 | crossref | 2026-07-31 | |  |  |
| `schroeder2006open` | — | dblp | 2026-07-30 | |  |  |
| `shao2020antipatterns` | 10.1109/ICSME46990.2020.00016 | crossref | 2026-07-31 | |  |  |
| `sim2003benchmark` | 10.1109/ICSE.2003.1201189 | crossref | 2026-07-31 | |  |  |
| `sotiropoulos2021cynthia` | 10.1109/ICSE43902.2021.00137 | crossref | 2026-07-31 | |  |  |
| `tene2015latency` | — | publisher | 2026-07-31 | | n/a |  |
| `torres2017orm` | 10.1016/j.infsof.2016.09.009 | crossref | 2026-07-31 | |  |  |
| `turcotte2022asyncjs` | 10.1145/3510003.3510097 | crossref | 2026-07-30 | |  |  |
| `vanzyl2009optimisations` | 10.1145/1632149.1632169 | crossref | 2026-07-31 | |  |  |
| `wohlin2012experimentation` | 10.1007/978-3-642-29044-2 | crossref+dblp | 2026-07-31 | |  |  |
| `yan2017inefficiencies` | 10.1145/3132847.3132954 | crossref | 2026-07-31 | |  |  |
| `yang2018dbapps` | 10.1145/3180155.3180194 | crossref | 2026-07-30 | |  |  |
| `yu2014concurrency` | 10.14778/2735508.2735511 | crossref | 2026-07-30 | |  |  |
| `zhadko2025orm` | 10.35784/jcsi.7951 | crossref | 2026-07-31 | |  |  |
