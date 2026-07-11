# Plan rewizji po recenzji zewnętrznej #2 (major revision) — 2026-07-12

Zasada: **najpierw weryfikacje i przebudowa harnessu, potem JEDNA skonsolidowana
kampania pomiarowa, potem jedna propagacja liczb i przeframowanie języka.**
Nie naprawiamy punkt-po-punkcie osobnymi re-runami.

Triage wstępny:
- Recenzent oceniał build GENERIC (`express_db_access-2.pdf`, 40 s., abstrakt
  niestrukturalny, zdanie „prepared for submission", brak deklaracji) — build IST
  spełnia §14; działanie: wyrównać/wycofać generic, dystrybuować tylko `ist_main`.
- 5.2 (CPU Prismy): Prisma 5.22 domyślnie engineType=library (Node-API, in-process)
  → do UDOWODNIENIA drzewem procesów, nie do zakładania.
- Q42 (idiomatic pg 3529 > same-plan 3182): kontrola same-SQL była pojedynczym runem
  z innego dnia niż mediana n=25 → w E3 kontrola dostaje własne repliki i CI.

---

## Etap 0 — Weryfikacje rozstrzygające (bez zmian w tekście; ~0.5 dnia)
Cel: rozstrzygnąć „potencjalnie fatalne" 5.1–5.3 zanim cokolwiek przepisujemy.
- [ ] 0.1 Drzewo procesów Prismy (pinned 5.22, oba silniki): engineType, liczba
      procesów, PID-y; czy /proc(server PID) obejmuje silnik (5.2, Q11–Q13).
- [ ] 0.2 Sonda równoważności odpowiedzi: dla 9 adapterów × 4 endpointy GET —
      pełne body, bajty, pola/typy/kolejność, nagłówki, status (5.1, Q7–Q9).
- [ ] 0.3 Przyczyna padniętego bootu mikroorm/mysql z runu n=25 (log) (Q3).
- [ ] 0.4 Potwierdzić: statement logging wyłączony w runach mierzonych (minor 34).
- [ ] 0.5 Autocannon: mechanika percentyli/histogramu; keep-alive; co raportuje
      errors/timeouts/non2xx (6.15, 6.22, minor 35).
- [ ] 0.6 Stan hosta: governor/turbo, NUMA (minor 37–38) — zanotować.
Deliverable: `notes/verification-memo.md` → decyduje o zakresie E3.

## Etap 1 — Harness 2.0 (wszystkie zmiany instrumentacyjne naraz; 1–2 dni)
- [ ] 1.1 Seedowane, wspólne trace'y żądań: pre-generowane identyczne sekwencje id
      dla każdej komórki; deep-fetch stratyfikowany liczbą komentarzy (6.9, E6).
- [ ] 1.2 Pełny cross-check odpowiedzi: kanonizacja + długość bajtowa per endpoint
      (rozszerzenie verify.mjs) (5.1, E1).
- [ ] 1.3 Rozliczanie CPU per TREATMENT: drzewo procesów (parent+dzieci) przez
      /proc, osobno: node, silnik/child, DB, generator; suma treatmentu (5.2, E2).
- [ ] 1.4 Rejestracja błędów per run: attempted/success req/s, errors, timeouts,
      non-2xx (6.22, E8) + walidacja odpowiedzi w locie.
- [ ] 1.5 Write-state rebuild: PG — DROP+CREATE z TEMPLATE seed_db; MySQL — reload
      z dumpu; per replikacja; tryb „order-reversal" do dowodu braku efektu
      historii (5.3, E3).
- [ ] 1.6 Open-loop CO-corrected własny (Node/undici): żądania planowane w stałych
      chwilach, latencja liczona od CZASU PLANOWEGO (definicja korekcji CO);
      raport offered/achieved/dropped/timeout (6.16, E7). (wrk2 = zewn. binarka —
      unikamy; nasza implementacja jest z definicji CO-corrected.)
- [ ] 1.7 Same-SQL evidence: EXPLAIN (ANALYZE, BUFFERS) PG + EXPLAIN ANALYZE MySQL
      dla KAŻDEJ warstwy w kontroli; typy parametrów, prepared vs unnamed,
      autocommit; wiersze/bajty (6.2). Zmiana nazwy kontroli na "same-SQL".
- [ ] 1.8 Natywny baseline „tuned": pg named prepared statements + mysql2
      execute() jako dodatkowe komórki (6.20).
- [ ] 1.9 Krzywa warm-up/steady-state: rejestrator per-sekundowego throughputu;
      kryterium stabilności wybiera długość warm-upu (6.6); dłuższe okna dla
      headline'ów (6.7).
- [ ] 1.10 Pool: latencja akwizycji + zajętość (gdzie API pozwala: pg-pool, tarn,
      sequelize-pool) — best effort (6.21).
- [ ] 1.11 GC/RSS: --trace-gc lub perf_hooks GC observer; median steady RSS
      (minor 13–14).
- [ ] 1.12 Fan-out seeding: posty o 0/1/10/50/100/500 komentarzy (6.10).
Deliverable: harness 2.0 + smoke test na 2 adapterach.

## Etap 2 — Nowe analizy statystyczne (na istniejących danych; równolegle z E1; ~0.5 dnia)
- [ ] 2.1 TOST (±5% prespecyfikowane) dla pg–Prisma; „tie" → wynik equivalence
      testu (6.13–6.14, E12).
- [ ] 2.2 Bootstrap CI dla WSZYSTKICH spreadów i p99 (run-level, seeded, opisana
      metoda/liczba resampli) (6.12, 6.15, E13; minor 22, 39).
- [ ] 2.3 RQ2 formalnie: Spearman+Kendall per wzorzec z bootstrap CI; model
      log-throughput z interakcjami layer×engine(×pattern) permutacyjnie;
      czułość na wykluczenie MikroORM (6.11, E11).
- [ ] 2.4 Efektywność zasobowa: req/CPU-s i CPU-ms/req z istniejących cpu_pct (6.4).
- [ ] 2.5 MAD/IQR obok CV; dokładne p; α po Bonferronim; źródło progów δ
      (minor 21–25; §8).
- [ ] 2.6 Etykiety: prespecified/secondary/exploratory (§8).
Deliverable: `bench/stats2.mjs` + moduł analiz; liczby odświeżone po E3.

## Etap 3 — Skonsolidowana kampania pomiarowa (2 noce + nadzór)
Wszystko na Harness 2.0, jedna spójna wersja kodu (tag przed startem):
- [ ] 3.1 PRIMARY: pełna macierz n=25 z trace'ami, błędami, CPU-tree,
      bajtami odpowiedzi (nocny ~8h).
- [ ] 3.2 WRITES pod DEFAULT durability jako PRIMARY (pełna macierz warstw,
      n=25, rebuild stanu, order-reversal); relaxed → sekundarne/mechanizm
      (6.18–6.19, E4; ~2–3h).
- [ ] 3.3 Same-SQL control z replikami (n≥10) + EXPLAIN wszędzie (Q42–43; ~1h).
- [ ] 3.4 Open-loop CO-corrected (zastępuje starą tabelę openloop) (~1h).
- [ ] 3.5 Fan-out sweep 0/1/10/50/100/500 (deep fetch, PG+MySQL top/middle/slow)
      (~1–2h).
- [ ] 3.6 Equal-CPU: taskset 1/2/4 rdzenie dla pg vs prisma (+mikroorm) (6.4–6.5;
      ~1h).
- [ ] 3.7 Steady-state: krzywe warm-up + sustained kilkuminutowe dla headline'ów
      (~2h).
- [ ] 3.8 Concurrency sweep z replikami (żeby Fig. 1 była inferencyjna) (minor 16;
      ~2h).
- [ ] 3.9 Prepared-statement baseline cells (~0.5h).
Wynik: nowy `raw.json` + komplet suplementów.

## Etap 4 — Propagacja + przeframowanie twierdzeń (1 dzień)
- [ ] 4.1 Adopcja liczb (10. propagacja) ze skryptowym cross-checkiem.
- [ ] 4.2 Dwa jawne estymandy (6.1, E9): (a) default-implementation effect,
      (b) controlled same-SQL effect; „access-layer overhead" tylko dla (b).
- [ ] 4.3 Język: „neutral"→„vendor-independent"; usunąć „full taxonomy";
      „first/none"→„we did not identify … through [data]"; „engine-bound"→
      „consistent with an engine-side bottleneck" (chyba że E3 doda wait-eventy);
      guidance jako hipotezy do lokalnego benchmarkingu (6.23–6.27, P4).
- [ ] 4.4 Rozdział Results/Discussion; deduplikacja powtórzeń (§11).
- [ ] 4.5 Kryteria taksonomii zdefiniowane a priori; architektury jako wymiary
      (6.27); tytuł: decyzja „across→for" (minor 1).
- [ ] 4.6 Minor 1–40: przejść listę jeden po drugim (schemat/indeksy w tekście,
      page size, dystrybucja komentarzy, insert payload/generated keys, TypeORM
      2 statements — wyjaśnić, spójne CPU%, itd.).
- [ ] 4.7 Generic build: usunąć zdanie submission-specific; wyrównać abstrakt lub
      wycofać build z dystrybucji (minor 30).

## Etap 5 — Related work / novelty refresh (~0.5 dnia)
- [ ] 5.1 Aktualizacja wyszukiwania do daty submisji (2026); protokół (bazy,
      stringi, liczby rekordów, screening log) jako suplement (6.24, §10).
- [ ] 5.2 Naprawa niespójności: metryki vendorów (Drizzle raportuje więcej niż
      „one family") — przeformułować lukę na „joint p99 przy pełnym pokryciu"
      (§10.5–10.6).
- [ ] 5.3 Procedura nieudanej reprodukcji Procedia — protokół do artefaktu (§10.7).

## Etap 6 — Restrukturyzacja objętości (0.5–1 dzień)
Budżet: ~14.9k/15k PRZED dodaniami z E2–E5 → konieczny suplement online.
- [ ] 6.1 Suplement (osobny PDF, nie liczy się do 15k): durability, pinned,
      openloop szczegóły, cv_mysql, EXPLAIN-y, tabela kształtów/bajtów
      odpowiedzi, konfiguracje ORM, pseudokod pętli runnera (6.8), diagram
      architektury, timeline.
- [ ] 6.2 W body: box/violin run-level, CI w głównych figurach, wykres
      efektywności CPU (6.4), figura fan-out.
- [ ] 6.3 Twarde cięcie powtórzeń; kontrola limitu słów po wszystkim.

## Etap 7 — Artefakt 2.0 + zgodność IST (~0.5 dnia)
- [ ] 7.1 Zenodo v1.1 (nowa wersja pod concept DOI): trace'y, EXPLAIN-y, sumy
      kontrolne, metadane failed-runs, clean-room guide, CI smoke test na małym
      seedzie, licencje jawnie (kod MIT + dane CC-BY?), oczekiwany runtime (§9).
- [ ] 7.2 Dokument QA: odpowiedzi na 50 pytań recenzenta (gotowiec pod przyszły
      response-to-reviewers).
- [ ] 7.3 Audyt zgodności IST NA BUILDZIE SUBMITOWANYM (strukturalny abstrakt,
      limit słów wg reguły 200/tab-fig, deklaracje w PDF, cytowanie datasetu
      [dataset]/[software] w bibliografii) (§14).

## Etap 8 — Finalna weryfikacja (0.5 dnia)
- [ ] 8.1 Wewnętrzna wroga re-recenzja (agent) na zrewidowanej wersji.
- [ ] 8.2 Skryptowy cross-check proza↔tabele↔raw.
- [ ] 8.3 `make package` + standalone build + checklista submisji.

---

Decyzje wymagane od autora przed E3:
1. Drugi host fizyczny dostępny? (6.5: jeśli nie — pozostajemy przy cgroup/taskset
   i uczciwym opisie ograniczenia.)
2. Zakres opcjonalnych: Kysely? update/delete/transakcje? energia? (rekomendacja:
   NIE w tej rewizji; do future work.)
3. Tytuł: „across" → „for"?
4. Akceptacja: default durability jako PRIMARY dla zapisów (zmieni liczby write'ów
   w całym artykule).

Szacunek łączny: ~5–7 dni roboczych + 2 nocne kampanie obliczeniowe.
