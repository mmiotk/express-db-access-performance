#!/usr/bin/env python3
"""Regenerate SOURCE_LEDGER.md from references.bib and a verify_refs.py run.

The ledger is a control file: a .bib entry with no row here counts as
unverified and must not be cited (CLAUDE.md section 6). Writing it by hand
across 77 entries invites exactly the drift it exists to catch, so it is
generated.

The "Verified against" column records what an API actually confirmed in the
recorded run. It is never inferred: an entry the verifier could not confirm is
written as `unconfirmed`, and entries with no DOI or arXiv id (vendor pages,
software, some books) are written as `no-api-id`, because Crossref and OpenAlex
cannot adjudicate them. Those need a human check against the publisher or the
page itself.

The "Read?" and "Trust" columns belong to the author and are left blank.

Usage:
    python3 scripts/verify_refs.py paper/references.bib --mailto you@example.org > /tmp/verify.txt
    python3 scripts/gen_source_ledger.py /tmp/verify.txt [--date YYYY-MM-DD]
"""
from __future__ import annotations

import argparse
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BIB = ROOT / "paper" / "references.bib"
LEDGER = ROOT / "SOURCE_LEDGER.md"
TEX = [ROOT / "paper" / "sections" / f"{n}.tex" for n in
       ("introduction", "related_work", "methodology", "results", "discussion", "threats", "conclusion")]
TEX += [ROOT / "paper" / "ist" / "ist_main.tex", ROOT / "paper" / "supplement.tex"]


def entries() -> dict[str, dict]:
    text = BIB.read_text()
    out: dict[str, dict] = {}
    for kind, key, body in re.findall(r"@(\w+)\{([^,]+),(.*?)\n\}", text, re.S):
        doi = re.search(r"doi\s*=\s*[{\"]([^}\"]+)", body, re.I)
        arx = re.search(r"arxiv\.org/abs/([0-9.]+)", body, re.I) or re.search(r"eprint\s*=\s*[{\"]([^}\"]+)", body, re.I)
        out[key.strip()] = {
            "type": kind.lower(),
            "doi": doi.group(1).strip() if doi else "",
            "arxiv": arx.group(1).strip() if arx else "",
        }
    return out


def cited_keys() -> set[str]:
    keys: set[str] = set()
    for path in TEX:
        if not path.exists():
            continue
        for m in re.finditer(r"\\cite[a-z]*\{([^}]*)\}", path.read_text()):
            keys |= {k.strip() for k in m.group(1).split(",") if k.strip()}
    return keys


# Entries confirmed by hand this session against an API the verifier does not
# query, with the API and date. Crossref does not index arXiv preprints, so a
# verifier miss there is not evidence of a bad reference. Only add a row here
# after actually retrieving the metadata and matching title, authors, and year.
MANUAL: dict[str, tuple[str, str]] = {
    # title, sole author, and 2026 publication date matched via the arXiv API
    "krishnamachari2026stats": ("arxiv", "2026-07-30"),
    # Crossref stores these three without their subtitles, which is why a
    # title-similarity check misses them; DOI fetch matched title, all authors,
    # and year in each case.
    "raasveldt2018fair": ("crossref", "2026-07-30"),
    "li2014tales": ("crossref", "2026-07-30"),
    "kounev2020benchmarking": ("crossref", "2026-07-30"),
    # fruth2022tail is deliberately absent: its DOI carried a LaTeX-escaped
    # underscore, so the lookup was malformed. The .bib is fixed, and the
    # verifier now confirms it on its own, so no manual row is warranted.
    # Confirmed by DOI fetch: title, all authors, and year matched.
    "yang2018dbapps": ("crossref", "2026-07-30"),
    "cheung2014sloth": ("crossref", "2026-07-30"),
    "turcotte2022asyncjs": ("crossref", "2026-07-30"),
    "yu2014concurrency": ("crossref", "2026-07-30"),
    "laigner2021microservices": ("crossref", "2026-07-30"),
    # Not in Crossref, OpenAlex, or Semantic Scholar: the 10.14456 prefix is
    # registered with the Thai NRCT, not Crossref. The DOI resolves, and the
    # publisher page (TCI ThaiJo) confirms authors, journal, volume, issue,
    # pages, and year. The recorded title was wrong and has been corrected.
    "orm_compare_jcct_2025": ("publisher", "2026-07-30"),
    # USENIX registers no DOIs, so Crossref absence is structural rather than
    # evidence of a bad reference. Confirmed in DBLP: RiggerS20 (OSDI 2020,
    # 667-682) and SchroederWH06 (NSDI 2006), authors and titles matching.
    "rigger2020sqlancer": ("dblp", "2026-07-30"),
    "schroeder2006open": ("dblp", "2026-07-30"),
    # The eight entries below carry no DOI or arXiv id, so Crossref and OpenAlex
    # cannot adjudicate them by construction. Each was retrieved by hand on
    # 2026-07-31 and matched field by field against the source named here. Two
    # errors were found and corrected in references.bib as a result: autocannon
    # was recorded at 7.15.0 while the study ran 8.0.0, and the Tene note claimed
    # the talk originated the term "coordinated omission", which the page does
    # not support.
    # Open Library ISBN record: title, subtitle, publisher, year, both authors.
    "cook1979quasi": ("openlibrary", "2026-07-31"),
    # InformIT (Pearson) product pages, matched on ISBN-13: title, subtitle,
    # authors, publisher, edition. Fowler's year stays 2002 (publication) by the
    # author's decision although the publisher lists copyright 2003.
    "sadalage2012nosql": ("publisher", "2026-07-31"),
    "fowler2002patterns": ("publisher", "2026-07-31"),
    # InfoQ page: title, speaker, and QCon San Francisco 2015 all matched.
    "tene2015latency": ("publisher", "2026-07-31"),
    # Vendor and project pages, matched on title, owner, and the method the note
    # describes. prisma_benchmarks has since changed content; the entry is
    # defended by its stated access date, not by the current page.
    "drizzle_benchmarks": ("vendor-page", "2026-07-31"),
    "prisma_benchmarks": ("vendor-page", "2026-07-31"),
    "imdbench": ("project-page", "2026-07-31"),
    # Repository page for owner, name, description and maintainer; the version
    # was taken from the harness lockfile rather than the page.
    "autocannon": ("project-page", "2026-07-31"),
    # The papers MCP server was returning empty for every query when this was checked,
    # including DOIs recorded here as Crossref-confirmed, so its silence was not
    # evidence; the Crossref REST API over WebFetch worked and is the fallback.
    # Crossref, DBLP and Open Library all confirm title, the six authors in order,
    # Springer Berlin Heidelberg, 2012, and the DOI. None records an edition number,
    # and DBLP labels the 2024 printing "Second Edition", so the entry's former
    # `edition = {2}` was unsupported and has been removed rather than replaced.
    "wohlin2012experimentation": ("crossref+dblp", "2026-07-31"),
}


def verdicts(report: Path) -> dict[str, str]:
    """Map key -> 'crossref' | 'openalex' | 'unconfirmed', from a verifier run."""
    out: dict[str, str] = {}
    current = None
    for line in report.read_text().splitlines():
        head = re.match(r"^\[([^\]]+)\]\s*$", line)
        if head:
            current = head.group(1)
            out.setdefault(current, "unconfirmed")
            continue
        if current and re.search(r"^\s+ok\s", line):
            out[current] = "openalex" if "openalex" in line.lower() else "crossref"
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("report", type=Path, help="stdout of scripts/verify_refs.py")
    ap.add_argument("--date", default=subprocess.run(["date", "+%Y-%m-%d"], capture_output=True, text=True).stdout.strip())
    args = ap.parse_args()

    ents, cited, verd = entries(), cited_keys(), verdicts(args.report)
    rows, unconfirmed_cited, uncited = [], [], []
    for key in sorted(ents):
        e = ents[key]
        ident = e["doi"] or (f"arXiv:{e['arxiv']}" if e["arxiv"] else "")
        status = verd.get(key, "unconfirmed")
        manual_date = ""
        if key in MANUAL:
            status, manual_date = MANUAL[key]
        if status == "unconfirmed" and not ident:
            status = "no-api-id"
        is_cited = key in cited
        if not is_cited:
            uncited.append(key)
        if is_cited and status in ("unconfirmed", "no-api-id"):
            unconfirmed_cited.append(key)
        note = []
        if not is_cited:
            note.append("**not cited**")
        if status == "no-api-id":
            note.append("no DOI/arXiv id; check against the publisher page")
        elif status == "unconfirmed":
            note.append("API could not confirm; check by hand")
        rows.append(
            f"| `{key}` | {ident or '—'} | {status} "
            f"| {manual_date or (args.date if status in ('crossref', 'openalex') else '—')} "
            f"| | {'' if e['type'] != 'misc' else 'n/a'} | {'; '.join(note)} |"
        )

    # Cut at the first generated marker so repeated runs cannot stack summaries;
    # fall back to the table marker on a pristine template.
    existing = LEDGER.read_text()
    for marker in ("**Generated**", "| BibTeX key |"):
        if marker in existing:
            header = existing.split(marker)[0].rstrip()
            break
    else:
        header = existing.rstrip()
    body = "\n".join([
        header,
        "",
        f"**Generated** by `scripts/gen_source_ledger.py` from `paper/references.bib` and a",
        f"`scripts/verify_refs.py` run on {args.date}. Do not hand-edit the table; rerun the generator.",
        "The `Read?` and `Trust` columns are the author's and are intentionally blank.",
        "",
        f"**Status:** {len(ents)} entries, {len(cited & set(ents))} cited, "
        f"{sum(1 for k in ents if verd.get(k) in ('crossref','openalex') or k in MANUAL)} API-confirmed.",
        "",
        f"**{len(unconfirmed_cited)} cited entries are not API-confirmed** and must be settled before",
        "submission, per CLAUDE.md section 6: " + ", ".join(f"`{k}`" for k in unconfirmed_cited) + ".",
        "",
        f"**{len(uncited)} entries are in the .bib but never cited**, which CLAUDE.md section 10 forbids at",
        "submission: " + ", ".join(f"`{k}`" for k in uncited) + ".",
        "",
        "| BibTeX key | DOI / arXiv ID | Verified against | Date | Read? | Preprint≠published? | Notes |",
        "|---|---|---|---|---|---|---|",
        *rows,
        "",
    ])
    LEDGER.write_text(body)
    print(f"{len(ents)} rows; {len(unconfirmed_cited)} cited-but-unconfirmed; {len(uncited)} uncited")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
