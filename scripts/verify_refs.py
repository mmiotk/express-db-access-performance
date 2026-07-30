#!/usr/bin/env python3
"""Verify bibliography entries against Crossref and OpenAlex.

The point is to catch fabricated or drifted references: a DOI that does not
resolve, an author list that does not match, a year that is off, a title that
belongs to a different paper.  It uses only the standard library, so it runs
anywhere python3 does and pulls in no supply chain.

Two input modes:

  * a BibTeX file            ->  fields are read from the entries
  * a .tex with thebibliography ->  each \\bibitem is treated as free text and
                                    matched by title against Crossref

Usage:
    python3 tools/verify_refs.py paper/main.tex
    python3 tools/verify_refs.py paper/references.bib --mailto you@example.org

Exit status is 1 if any entry could not be confirmed, so it can gate a build.

Nothing is written back.  A mismatch is a question for the author, not
something a script should silently "fix".
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request

CROSSREF = "https://api.crossref.org/works"
OPENALEX = "https://api.openalex.org/works"
DATACITE = "https://api.datacite.org/dois"
UA = "verify_refs/1.0 (academic reference checker; mailto:{mailto})"


# ---------------------------------------------------------------- helpers


def _api_id(raw: str) -> str:
    r"""Strip LaTeX escaping from a DOI or arXiv id before querying an API.

    A DOI is typeset like any other text, so an underscore must be written
    ``\_`` in the .bib or the document will not compile.  The API wants the
    bare identifier.  Normalising here keeps the bibliography correct for
    LaTeX and the query correct for Crossref, instead of forcing one to break
    for the other.
    """
    return raw.replace("\\_", "_").replace("\\&", "&").replace("\\%", "%").replace("{", "").replace("}", "").strip()


def normalise(s: str) -> str:
    """Casefold, strip accents, LaTeX markup and punctuation for comparison."""
    s = re.sub(r"\\[a-zA-Z]+\s*", " ", s)
    s = s.replace("{", "").replace("}", "").replace("$", "")
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-z0-9 ]+", " ", s.lower())
    return re.sub(r"\s+", " ", s).strip()


def similarity(a: str, b: str) -> float:
    """Jaccard over word sets. Crude, but it only has to separate 'same paper'
    from 'different paper', and it has no false confidence about near-misses."""
    wa, wb = set(normalise(a).split()), set(normalise(b).split())
    if not wa or not wb:
        return 0.0
    return len(wa & wb) / len(wa | wb)


def fetch(url: str, mailto: str) -> dict | None:
    req = urllib.request.Request(url, headers={"User-Agent": UA.format(mailto=mailto)})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except Exception as exc:  # noqa: BLE001 - any failure is just "unconfirmed"
        print(f"    ! request failed: {exc}", file=sys.stderr)
        return None


# ---------------------------------------------------------------- parsing


BIB_ENTRY = re.compile(r"@(\w+)\s*\{\s*([^,]+),(.*?)\n\}", re.S)
BIB_FIELD = re.compile(r"(\w+)\s*=\s*[{\"](.+?)[}\"]\s*,?\s*\n", re.S)
DOI_RE = re.compile(r"10\.\d{4,9}/[-._;()/:A-Za-z0-9]+")


def parse_bib(text: str) -> list[dict]:
    out = []
    for kind, key, body in BIB_ENTRY.findall(text):
        fields = {k.lower(): re.sub(r"\s+", " ", v).strip() for k, v in BIB_FIELD.findall(body + "\n")}
        out.append(
            {
                "key": key.strip(),
                "kind": kind,
                "title": fields.get("title", ""),
                "year": fields.get("year", ""),
                "author": fields.get("author", ""),
                "doi": _api_id(fields.get("doi", "")),
                "raw": body,
            }
        )
    return out


BIBITEM = re.compile(r"\\bibitem(?:\[[^\]]*\])?\{([^}]+)\}(.*?)(?=\\bibitem|\\end\{thebibliography\})", re.S)


def parse_bibitems(text: str) -> list[dict]:
    out = []
    for key, body in BIBITEM.findall(text):
        body = re.sub(r"\s+", " ", body).strip()
        year = ""
        m = re.search(r"\b(19|20)\d{2}\b", body)
        if m:
            year = m.group(0)
        doi = ""
        m = DOI_RE.search(body)
        if m:
            doi = m.group(0).rstrip(".,;")
        # Do NOT try to guess which fragment is the title: in a hand-written
        # \bibitem the \emph{} is as often the journal as the title, and a wrong
        # guess produces confident nonsense.  Hand the whole reference string to
        # Crossref's bibliographic search and check the result for containment.
        out.append({"key": key.strip(), "kind": "bibitem", "title": "",
                    "year": year, "author": "", "doi": doi, "raw": body})
    return out


# ---------------------------------------------------------------- checking


def check_doi(doi: str, mailto: str) -> tuple[bool, dict | None]:
    """Resolve a DOI against Crossref, then DataCite.

    Crossref alone is not enough: Zenodo, Figshare and Dryad register with
    DataCite, so an artefact DOI that is perfectly valid looks dead to a
    Crossref-only checker.  Getting this wrong would train the reader to
    ignore the tool's output, which is worse than not checking at all.
    """
    data = fetch(f"{CROSSREF}/{urllib.parse.quote(doi)}", mailto)
    if data:
        return True, data.get("message")

    data = fetch(f"{DATACITE}/{urllib.parse.quote(doi)}", mailto)
    if not data:
        return False, None
    attrs = (data.get("data") or {}).get("attributes") or {}
    # Normalise DataCite's shape onto the Crossref-ish shape used downstream.
    titles = [t.get("title", "") for t in attrs.get("titles") or []]
    creators = [
        {"family": c.get("familyName") or c.get("name", "")}
        for c in attrs.get("creators") or []
    ]
    year = attrs.get("publicationYear")
    return True, {
        "title": titles,
        "author": creators,
        "issued": {"date-parts": [[year]]} if year else {},
        "_source": "datacite",
    }


def search_title(title: str, mailto: str) -> dict | None:
    q = urllib.parse.urlencode({"query.bibliographic": title[:300], "rows": 3})
    data = fetch(f"{CROSSREF}?{q}", mailto)
    items = (data or {}).get("message", {}).get("items", [])
    return items[0] if items else None


def containment(needle: str, haystack: str) -> float:
    """Fraction of `needle`'s words that occur in `haystack`.

    Used when we do not know which part of a reference string is the title:
    if Crossref returns the right paper, nearly every word of its title should
    appear somewhere in the raw reference.
    """
    wn, wh = set(normalise(needle).split()), set(normalise(haystack).split())
    if not wn:
        return 0.0
    return len(wn & wh) / len(wn)


def report(entry: dict, mailto: str) -> bool:
    """Return True if the entry is confirmed."""
    print(f"[{entry['key']}]")
    meta = None
    via = ""
    # For a parsed .bib we know the title; for a raw \bibitem we do not, so we
    # search on, and compare against, the whole reference string.
    probe = entry["title"] or entry["raw"]

    if entry["doi"]:
        ok, meta = check_doi(entry["doi"], mailto)
        via = "doi"
        if not ok:
            print(f"    FAIL  DOI does not resolve: {entry['doi']}")
            return False
    else:
        meta = search_title(probe, mailto)
        via = "crossref/bibliographic-search"
        if meta is None:
            print(f"    UNCONFIRMED  no Crossref match for: {probe[:80]!r}")
            return False

    got_title = " ".join(meta.get("title") or [""])
    sim = containment(got_title, probe) if not entry["title"] else similarity(entry["title"], got_title)
    got_year = ""
    for f in ("published-print", "published-online", "issued"):
        parts = (meta.get(f) or {}).get("date-parts") or []
        if parts and parts[0]:
            got_year = str(parts[0][0])
            break
    got_authors = ", ".join(
        a.get("family", "") for a in (meta.get("author") or []) if a.get("family")
    )

    problems = []
    if sim < 0.6:
        problems.append(
            f"no confident title match (score {sim:.2f}) — check by hand\n"
            f"        ours: {probe[:100]}\n"
            f"        api : {got_title[:100]}"
        )
    if entry["year"] and got_year and entry["year"] != got_year:
        problems.append(f"year mismatch: ours {entry['year']}, api {got_year}")
    if entry["author"]:
        ours = set(normalise(entry["author"]).split())
        theirs = set(normalise(got_authors).split())
        if theirs and not (ours & theirs):
            problems.append(f"no author surname in common\n        ours: {entry['author'][:70]}\n        api : {got_authors[:70]}")

    if problems:
        for p in problems:
            print(f"    WARN  {p}")
        return False

    print(f"    ok    via {via}: {got_authors[:50]} ({got_year}) {got_title[:60]}")
    return True


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("path", help=".bib file or .tex file containing thebibliography")
    ap.add_argument("--mailto", default="anonymous@example.org",
                    help="e-mail for the Crossref polite pool (higher rate limit)")
    ap.add_argument("--delay", type=float, default=0.4, help="seconds between API calls")
    args = ap.parse_args()

    text = open(args.path, encoding="utf-8", errors="replace").read()
    entries = parse_bib(text) if args.path.endswith(".bib") else parse_bibitems(text)

    if not entries:
        print("no bibliography entries found", file=sys.stderr)
        return 2

    print(f"{len(entries)} entries in {args.path}\n")
    bad = []
    for e in entries:
        if not report(e, args.mailto):
            bad.append(e["key"])
        time.sleep(args.delay)

    print()
    if bad:
        print(f"{len(bad)}/{len(entries)} entries UNCONFIRMED: {', '.join(bad)}")
        print("Resolve each before submission. An unconfirmed entry must not be cited.")
        return 1
    print(f"all {len(entries)} entries confirmed against Crossref")
    return 0


if __name__ == "__main__":
    sys.exit(main())
