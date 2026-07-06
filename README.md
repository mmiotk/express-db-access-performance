# Express database access-layer performance

> **In English.** Replication package for the paper *A Comparative Analysis of
> Relational Database Access-Layer Performance in Express.js across PostgreSQL and
> MySQL*. It contains a reproducible benchmark harness (`experiments/`, JS/Node +
> autocannon) comparing the full access-layer taxonomy — native driver
> (`pg`/`mysql2`), query builder (`knex`), and ORMs (`drizzle`, `prisma`,
> `sequelize`, `typeorm`, `objection`, `mikroorm`) — on **both** engines, reporting
> throughput **and** tail latency (p50/p90/p99); the LaTeX sources (`paper/`); and
> working notes (`notes/`). To reproduce: `cd experiments && npm ci && npm run setup
> && npm run bench && npm run sync:tables`, then build the PDF with `make`.

Repozytorium artykułu — źródła LaTeX, harness benchmarkowy (JS/Node) i notatki
robocze (Obsidian). Odpowiednik gatunkowy [`react-rendering-performance`], ale dla
warstwy dostępu do relacyjnej bazy danych w Express.js.

## Dlaczego to (luka badawcza)

Deep-research nad prior artem (podsumowanie: [`notes/prior-art.md`](notes/prior-art.md))
pokazał, że istniejące porównania warstw dostępu w Node.js są **rozproszone i
zdominowane przez benchmarki wendorów**, i mają cztery powtarzalne braki:

1. **Brak MySQL** — praktycznie wszystkie benchmarki są PostgreSQL-only.
2. **Brak neutralnej, pełnej taksonomii** w jednym recenzowanym badaniu
   (sterownik natywny + query builder + wszystkie główne ORM).
3. **Rozdzielone metryki** — prace raportują *albo* throughput *albo* latencję,
   rzadko ogon rozkładu (p95/p99) razem z przepustowością.
4. **Brak fokusu na warstwie HTTP/Express** (realistyczny request roundtrip).

Ten projekt celuje we wszystkie cztery naraz.

## Struktura

```
experiments/   # harness: Express + 9 adapterów + runner autocannon (throughput + p50/p90/p99)
paper/         # źródła LaTeX (express_db_access.tex), references.bib, Makefile, latexmkrc
notes/         # vault Obsidiana: prior-art (deep research), projekt benchmarku, literatura
.github/       # CI: build PDF + smoke-test harnessu
```

## Szybki start

```bash
cd experiments
npm ci
npm run setup      # docker compose up + migrate + seed (postgres + mysql)
npm run bench      # pełna matryca → results/ + tabele LaTeX
npm run sync:tables
cd ../paper && make
```

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
