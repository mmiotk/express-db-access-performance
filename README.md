# Express database access-layer performance

> **In English.** Replication package for the paper *A Comparability Protocol for Benchmarking Relational Database Access Layers in Express.js*. It contains a reproducible benchmark harness (`experiments/`, JS/Node +
> autocannon) comparing a broad product cross-section — native driver
> (`pg`/`mysql2`), query builder (`knex`), and ORMs (`drizzle`, `prisma`,
> `sequelize`, `typeorm`, `objection`, `mikroorm`) — on **both** engines, reporting
> throughput **and** tail latency (p50/p90/p99); the LaTeX sources (`paper/`); and
> working notes (`notes/`). Start with [`REPRODUCE.md`](REPRODUCE.md), which separates workflow reproduction, reconstruction from archived data, and numerical re-execution on the pinned reference engines.

Repozytorium artykułu — źródła LaTeX, harness benchmarkowy (JS/Node) i notatki
robocze (Obsidian). Odpowiednik gatunkowy [`react-rendering-performance`], ale dla
warstwy dostępu do relacyjnej bazy danych w Express.js.

## Dlaczego ten projekt

Istniejące porównania Node.js obejmują benchmarki wendorów oraz mniejsze badania
akademickie. Ich estymandy są jednak różne: część zmienia jednocześnie framework,
warstwę dostępu i środowisko; część mierzy tylko czas wewnątrz procesu; nieliczne
lokalizują nasycenie albo sprawdzają równoważność odpowiedzi przed rankingiem.
Szczegółowy, ostrożny przegląd zakresu znajduje się w
[`notes/related-work-search.md`](notes/related-work-search.md), a kodowany audyt
dziewięciu źródeł w
[`experiments/external-protocol-audit.json`](experiments/external-protocol-audit.json).

Projekt wnosi protokół ustalania porównywalności oraz kontrolowane studium przypadku:
dwie pełne warstwy backendowe, szeroki przekrój produktów, throughput i p99 na
poziomie HTTP, 25 powtórzeń, osobne warunki capacity/equal demand/matched
utilization i jawne ograniczenia interpretacji. Nie jest to twierdzenie, że żaden
wcześniejszy benchmark nie miał tych elementów ani że ranking jest uniwersalny.

## Struktura

```
experiments/   # harness: Express + 9 adapterów + runner autocannon (throughput + p50/p90/p99)
paper/         # źródła LaTeX (express_db_access.tex), references.bib, Makefile, latexmkrc
notes/         # vault Obsidiana: prior-art (deep research), projekt benchmarku, literatura
.github/       # CI: build PDF + smoke-test harnessu
```

## Szybki start — odtworzenie workflow

```bash
cd experiments
npm ci
npm run setup      # docker compose up + migrate + seed (postgres + mysql)
npm run bench:quick # krótki test workflow
# pełna numeryczna kampania: zob. REPRODUCE.md
npm run sync:tables
cd ../paper && make
```

Ta ścieżka przypina obrazy PostgreSQL 18.4 i MySQL 9.7.1, lecz uruchamia je z relaxed durability i w topologii kontenerowej. Odtwarza workflow, ale nie gwarantuje headline insertów z domyślną trwałością; numeryczna reegzekucja wymaga procedury z [`REPRODUCE.md`](REPRODUCE.md). Ten sam dokument rozróżnia author-run archive-isolated reconstruction od niezależnej reprodukcji, której repozytorium nie deklaruje.

Szczegóły harnessu: [`experiments/README.md`](experiments/README.md).
Metodologia i pułapki pomiarowe: [`METHODOLOGY.md`](METHODOLOGY.md).

## Budowanie PDF

Wymagane: TeX Live (`latexmk`, `biber`, `booktabs`, `biblatex`, `hyperref`, `csquotes`).

```bash
cd paper && make        # → paper/_build/express_db_access.pdf
```

## Cytowanie i licencje

- Metadane cytowania: [`CITATION.cff`](CITATION.cff).
- Tekst artykułu i notatki: **CC-BY 4.0** (`LICENSE-text`).
- Kod (harness, skrypty): **MIT** (`LICENSE-code`).

[`react-rendering-performance`]: https://github.com/mmiotk/react-rendering-performance
