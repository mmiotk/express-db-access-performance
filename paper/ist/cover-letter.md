Gdańsk, Poland, [DATE]

Dear Editors,

Please consider my manuscript, "A Comparative Analysis of Relational Database Access-Layer Performance in Express.js across PostgreSQL and MySQL," for publication in *Information and Software Technology* as a Research Paper.

Node.js/Express services reach relational databases through a spectrum of access layers: native drivers, query builders, and object-relational mappers (ORMs). This choice is made on nearly every non-trivial back-end project, yet in practice it is guided by vendor benchmarks that are fragmented: each is published by the maintainers of one of the compared products, almost all target PostgreSQL exclusively, and each reports a single metric family (throughput or latency, rarely the p99 tail that dominates perceived performance under load). The peer-reviewed literature is sparser still: the closest prior study compared ORM overhead across eight frameworks but explicitly excluded JavaScript, and two 2025 studies of Node.js/TypeScript access layers are each limited to PostgreSQL and to at most three ORMs. No existing study combines broad taxonomy coverage, both major open-source engines, author neutrality, and joint throughput/tail reporting.

I address that gap with a benchmark that is, to my knowledge, the first to combine all four properties. An identical Express application is served through nine access layers (the native drivers pg and mysql2, the query builder Knex, and six ORMs: Drizzle, Prisma, Sequelize, TypeORM, Objection, and MikroORM), over five representative CRUD access patterns, against both PostgreSQL and MySQL, reporting throughput and p99 tail latency jointly across all 80 measured configurations. Each configuration is measured over 25 independent replicates (a freshly booted server process per replicate, cell order randomized), giving the significance tests conventional statistical power. A same-plan control isolates the source of the largest effect observed, a spread of up to 6.3x between the native driver and the heaviest ORM on a deep, nested fetch: the layers' raw execution paths differ by at most 1.4x, so the spread is dominated by each library's default eager-loading strategy and result hydration rather than by its underlying machinery. Four robustness supplements corroborate the main results: an open-loop, constant-arrival-rate validation of the tail-latency findings; insert throughput re-measured under three durability regimes; a pinned-core run approximating multi-host resource separation; and a ten-minute sustained-load check for temporal drift. The complete replication package (harness, deterministic seed, all nine adapters, raw measurements, and the scripts that generate every table in the paper) is public on GitHub at submission and will be archived with a Zenodo DOI on acceptance.

The manuscript fits *Information and Software Technology* directly: it is a controlled empirical study of a decision that essentially every Node.js/Express project makes—which access layer to adopt—aimed at improving that practice with evidence rather than vendor marketing. It is reported to the standard the journal expects of empirical software engineering work: controlled factors, independent replicates, nonparametric significance testing with effect sizes, an explicit threats-to-validity analysis, and an open, reusable replication package.

The work is original, has not been published previously, and is not under consideration elsewhere. I declare no competing interests and received no funding for this research. A declaration of generative-AI use in the manuscript-preparation process is included in the manuscript in accordance with Elsevier policy.

I look forward to your editorial decision.

Sincerely,

Mateusz Miotk
Faculty of Mathematics, Physics and Informatics, University of Gdańsk, Poland
mateusz.miotk@ug.edu.pl (corresponding author)
