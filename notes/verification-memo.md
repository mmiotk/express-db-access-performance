# Etap 0 — memo weryfikacyjne (2026-07-12)

## 0.1 CPU Prismy (recenzja 5.2) — ZARZUT OBALONY DOWODEM
Prisma 5.22, oba silniki: engine = **library (Node-API), in-process**.
Dowody: (a) w `.prisma/client` wyłącznie `libquery_engine-*.so.node` (brak binarki
query-engine); (b) uruchomiony serwer: **0 procesów potomnych**, **30 wątków** w
procesie node; (c) biblioteka silnika zmapowana w `/proc/<pid>/maps` procesu serwera.
Wniosek: próbkowanie `/proc/<serverPID>/stat` (utime+stime) obejmuje wszystkie wątki
silnika → 465% CPU jest policzone poprawnie, bez podwójnego liczenia i bez pominięć.
E1: dodać automatyczny zrzut drzewa procesów per treatment jako dowód w artefakcie.
E4: opisać architekturę i procedurę w tekście (Q11–Q13).

## 0.2 Równoważność odpowiedzi (recenzja 5.1) — CZĘŚCIOWO POTWIERDZONA
Sonda: `results/response-probe.json` (9 adapterów × 4 GET × 2 silniki).
- aggregation: identyczne (0B diff, brak różnic kształtu) u wszystkich.
- point/range: ±3–80B (typowanie id: pg zwraca int8 jako string; created_at);
  WYJĄTEK sequelize: **−40B/wiersz** (model nie zwraca created_at/published).
- deep fetch (HEADLINE): NIE jest bajtowo jednolity: sequelize **−720B (−25%)**,
  typeorm **+684/+756B**, objection **+720B**; pozostali ±72B (id typing).
Skutek: (kierunkowo) sequelize wysyła mniej i nadal jest wolny → ranking
prawdopodobnie przeżyje, ale wymaga POMIARU po naprawie, nie argumentacji.
E1: kanoniczny, bajtowo-identyczny kształt każdego endpointu we wszystkich
adapterach (jawna projekcja + Number(id) + jednolita kolejność pól) + byte-level
cross-check. E3: re-run.

## 0.3 Padnięty boot mikroorm/mysql (Q3) — WYJAŚNIONY
`EADDRINUSE :3306` — alokator portów (BASE 3100, port++ przez 400 komórek) trafił
w port MySQL-a. Deterministyczny defekt harnessu, nie losowa awaria.
E1: alokator omija 3306/5432 i porty zajęte. Tekst: ujawnić przyczynę.

## 0.4 Logging w runach mierzonych (minor 34) — POTWIERDZONE WYŁĄCZONE
PG log_statement=none, log_min_duration=-1; MySQL general_log=OFF, slow_query_log=OFF.
capture-plans.mjs włącza i przywraca logowanie wyłącznie we własnej sesji (finally).

## 0.5 Autocannon (6.15/6.22, minor 35)
Percentyle: hdr-histogram-js (HDR). Keep-alive: domyślnie włączony (HTTP/1.1 agent).
Wynik zawiera errors/timeouts/non2xx → E1 rejestruje je per run.

## 0.6 Host (minor 37–38) — DO UJAWNIENIA
Środowisko ZWIRTUALIZOWANE: 16 vCPU (lscpu: 16×socket, 1 rdzeń/socket),
**1 węzeł NUMA**, brak cpufreq (governor/turbo pod kontrolą hypervisora).
E4: jawnie w Methodology (virtualized host; frequency scaling niekontrolowalny).

## Q42 (idiomatic pg > same-plan pg)
Kontrola same-SQL = pojedynczy run z 2026-07-11 rano vs mediana n=25 z tego samego
dnia po południu; różnica 3529 vs 3182 mieści się w zmienności między-runowej.
E3.3: kontrola z replikami (n≥10) + CI; dekompozycja raportowana z niepewnością (Q43).
