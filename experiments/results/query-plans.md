# Generated SQL, round-trip counts, and query plans (PostgreSQL)

Captured by `scripts/capture-plans.mjs` via server-side `log_statement=all`. Sample parameters: post id 50000, author id 1000, cursor 60000.

## Round-trip counts per layer

| Layer | Point read | Range scan | Deep fetch | Aggregation | Insert |
|---|--|--|--|--|--|
| pg | 1 | 1 | 2 | 1 | 1 |
| knex | 1 | 1 | 2 | 1 | 1 |
| drizzle | 1 | 1 | 2 | 1 | 1 |
| prisma | 1 | 1 | 4 | 1 | 1 |
| sequelize | 1 | 1 | 1 | 1 | 1 |
| typeorm | 1 | 1 | 2 | 1 | 2 |
| objection | 1 | 1 | 4 | 1 | 1 |
| mikroorm | 1 | 1 | 1 | 1 | 1 |

## Generated SQL (native `pg`, and every layer's deep fetch)

### pg — Point read (1 round trip)

```sql
SELECT * FROM posts WHERE id = $1
```

### pg — Range scan (1 round trip)

```sql
SELECT * FROM posts WHERE id < $1 ORDER BY id DESC LIMIT $2
```

### pg — Deep fetch (2 round trips)

```sql
SELECT p.*, a.name AS author_name, a.email AS author_email
```
```sql
SELECT c.id, c.body, c.created_at,
```

### pg — Aggregation (1 round trip)

```sql
SELECT a.id AS author_id,
```

### pg — Insert (1 round trip)

```sql
INSERT INTO posts(author_id, title, body) VALUES ($1, $2, $3) RETURNING id
```

### knex — Deep fetch (2 round trips)

```sql
select "p".*, "a"."name" as "author_name", "a"."email" as "author_email" from "posts" as "p" inner join "authors" as "a" on "a"."id" = "p"."author_id" where "p"."id" = $1 limit $2
```
```sql
select "c"."id", "c"."body", "c"."created_at", "a"."id" as "author_id", "a"."name" as "author_name", "a"."email" as "author_email" from "comments" as "c" inner join "authors" as "a" on "a"."id" = "c"."author_id" where "c"."post_id" = $1 order by "c"."id" asc
```

### drizzle — Deep fetch (2 round trips)

```sql
select "posts"."id", "posts"."title", "posts"."body", "posts"."views", "posts"."created_at", "authors"."id", "authors"."name", "authors"."email" from "posts" inner join "authors" on "authors"."id" = "posts"."author_id" where "posts"."id" = $1 limit $2
```
```sql
select "comments"."id", "comments"."body", "comments"."created_at", "authors"."id", "authors"."name", "authors"."email" from "comments" inner join "authors" on "authors"."id" = "comments"."author_id" where "comments"."post_id" = $1 order by "comments"."id"
```

### prisma — Deep fetch (4 round trips)

```sql
SELECT "public"."posts"."id", "public"."posts"."author_id", "public"."posts"."title", "public"."posts"."body", "public"."posts"."published", "public"."posts"."views", "public"."posts"."created_at" FROM "public"."posts" WHERE ("public"."posts"."id" = $1 AND 1=1) LIMIT $2 OFFSET $3
```
```sql
SELECT "public"."authors"."id", "public"."authors"."name", "public"."authors"."email", "public"."authors"."created_at" FROM "public"."authors" WHERE "public"."authors"."id" IN ($1) OFFSET $2
```
```sql
SELECT "public"."comments"."id", "public"."comments"."post_id", "public"."comments"."author_id", "public"."comments"."body", "public"."comments"."created_at" FROM "public"."comments" WHERE "public"."comments"."post_id" IN ($1) ORDER BY "public"."comments"."id" ASC OFFSET $2
```
```sql
SELECT "public"."authors"."id", "public"."authors"."name", "public"."authors"."email", "public"."authors"."created_at" FROM "public"."authors" WHERE "public"."authors"."id" IN ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) OFFSET $18
```

### sequelize — Deep fetch (1 round trip)

```sql
SELECT "Post"."id", "Post"."author_id", "Post"."title", "Post"."body", "Post"."views", "Post"."published", "author"."id" AS "author.id", "author"."name" AS "author.name", "author"."email" AS "author.email", "comments"."id" AS "comments.id", "comments"."post_id" AS "comments.post_id", "comments"."author_id" AS "comments.author_id", "comments"."body" AS "comments.body", "comments->author"."id" AS "comments.author.id", "comments->author"."name" AS "comments.author.name", "comments->author"."email" AS "comments.author.email" FROM "posts" AS "Post" LEFT OUTER JOIN "authors" AS "author" ON "Post"."author_id" = "author"."id" LEFT OUTER JOIN "comments" AS "comments" ON "Post"."id" = "comments"."post_id" LEFT OUTER JOIN "authors" AS "comments->author" ON "comments"."author_id" = "comments->author"."id" WHERE "Post"."id" = 50000 ORDER BY "comments"."id" ASC;
```

### typeorm — Deep fetch (2 round trips)

```sql
SELECT DISTINCT "distinctAlias"."Post_id" AS "ids_Post_id", "distinctAlias"."Post__Post_comments_id" FROM (SELECT "Post"."id" AS "Post_id", "Post"."author_id" AS "Post_author_id", "Post"."title" AS "Post_title", "Post"."body" AS "Post_body", "Post"."views" AS "Post_views", "Post"."published" AS "Post_published", "Post"."created_at" AS "Post_created_at", "Post__Post_author"."id" AS "Post__Post_author_id", "Post__Post_author"."name" AS "Post__Post_author_name", "Post__Post_author"."email" AS "Post__Post_author_email", "Post__Post_author"."created_at" AS "Post__Post_author_created_at", "Post__Post_comments"."id" AS "Post__Post_comments_id", "Post__Post_comments"."post_id" AS "Post__Post_comments_post_id", "Post__Post_comments"."author_id" AS "Post__Post_comments_author_id", "Post__Post_comments"."body" AS "Post__Post_comments_body", "Post__Post_comments"."created_at" AS "Post__Post_comments_created_at", "Post__Post_comments__Post__Post_comments_author"."id" AS "Post__Post_comments__Post__Post_comments_author_id", "Post__Post_comments__Post__Post_comments_author"."name" AS "Post__Post_comments__Post__Post_comments_author_name", "Post__Post_comments__Post__Post_comments_author"."email" AS "Post__Post_comments__Post__Post_comments_author_email", "Post__Post_comments__Post__Post_comments_author"."created_at" AS "Post__Post_comments__Post__Post_comments_author_created_at" FROM "posts" "Post" LEFT JOIN "authors" "Post__Post_author" ON "Post__Post_author"."id"="Post"."author_id"  LEFT JOIN "comments" "Post__Post_comments" ON "Post__Post_comments"."post_id"="Post"."id"  LEFT JOIN "authors" "Post__Post_comments__Post__Post_comments_author" ON "Post__Post_comments__Post__Post_comments_author"."id"="Post__Post_comments"."author_id" WHERE (("Post"."id" = $1))) "distinctAlias" ORDER BY "distinctAlias"."Post__Post_comments_id" ASC, "Post_id" ASC LIMIT 1
```
```sql
SELECT "Post"."id" AS "Post_id", "Post"."author_id" AS "Post_author_id", "Post"."title" AS "Post_title", "Post"."body" AS "Post_body", "Post"."views" AS "Post_views", "Post"."published" AS "Post_published", "Post"."created_at" AS "Post_created_at", "Post__Post_author"."id" AS "Post__Post_author_id", "Post__Post_author"."name" AS "Post__Post_author_name", "Post__Post_author"."email" AS "Post__Post_author_email", "Post__Post_author"."created_at" AS "Post__Post_author_created_at", "Post__Post_comments"."id" AS "Post__Post_comments_id", "Post__Post_comments"."post_id" AS "Post__Post_comments_post_id", "Post__Post_comments"."author_id" AS "Post__Post_comments_author_id", "Post__Post_comments"."body" AS "Post__Post_comments_body", "Post__Post_comments"."created_at" AS "Post__Post_comments_created_at", "Post__Post_comments__Post__Post_comments_author"."id" AS "Post__Post_comments__Post__Post_comments_author_id", "Post__Post_comments__Post__Post_comments_author"."name" AS "Post__Post_comments__Post__Post_comments_author_name", "Post__Post_comments__Post__Post_comments_author"."email" AS "Post__Post_comments__Post__Post_comments_author_email", "Post__Post_comments__Post__Post_comments_author"."created_at" AS "Post__Post_comments__Post__Post_comments_author_created_at" FROM "posts" "Post" LEFT JOIN "authors" "Post__Post_author" ON "Post__Post_author"."id"="Post"."author_id"  LEFT JOIN "comments" "Post__Post_comments" ON "Post__Post_comments"."post_id"="Post"."id"  LEFT JOIN "authors" "Post__Post_comments__Post__Post_comments_author" ON "Post__Post_comments__Post__Post_comments_author"."id"="Post__Post_comments"."author_id" WHERE ( (("Post"."id" = $1)) ) AND ( "Post"."id" IN ($2) ) ORDER BY "Post__Post_comments"."id" ASC
```

### objection — Deep fetch (4 round trips)

```sql
select "posts".* from "posts" where "posts"."id" = $1
```
```sql
select "authors".* from "authors" where "authors"."id" in ($1)
```
```sql
select "comments".* from "comments" where "comments"."post_id" in ($1) order by "comments"."id" asc
```
```sql
select "authors".* from "authors" where "authors"."id" in ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
```

### mikroorm — Deep fetch (1 round trip)

```sql
select "p0".*, "a1"."id" as "a1__id", "a1"."name" as "a1__name", "a1"."email" as "a1__email", "a1"."created_at" as "a1__created_at", "c2"."id" as "c2__id", "c2"."body" as "c2__body", "c2"."created_at" as "c2__created_at", "c2"."post_id" as "c2__post_id", "c2"."author_id" as "c2__author_id", "a3"."id" as "a3__id", "a3"."name" as "a3__name", "a3"."email" as "a3__email", "a3"."created_at" as "a3__created_at" from "posts" as "p0" inner join "authors" as "a1" on "p0"."author_id" = "a1"."id" left join ("comments" as "c2" inner join "authors" as "a3" on "c2"."author_id" = "a3"."id") on "p0"."id" = "c2"."post_id" where "p0"."id" = '50000' order by "c2"."id" asc
```

## Query plans (native `pg` statements)

### EXPLAIN — Point read (native `pg` SQL)

```
Index Scan using posts_pkey on posts
  Index Cond: (id = 50000)
```

### EXPLAIN — Range scan (native `pg` SQL)

```
Limit
  ->  Index Scan Backward using posts_pkey on posts
        Index Cond: (id < 60000)
```

### EXPLAIN — Deep fetch (q1) (native `pg` SQL)

```
Nested Loop
  ->  Index Scan using posts_pkey on posts p
        Index Cond: (id = 50000)
  ->  Index Scan using authors_pkey on authors a
        Index Cond: (id = p.author_id)
```

### EXPLAIN — Deep fetch (q2) (native `pg` SQL)

```
Sort
  Sort Key: c.id
  ->  Hash Join
        Hash Cond: (c.author_id = a.id)
        ->  Bitmap Heap Scan on comments c
              Recheck Cond: (post_id = 50000)
              ->  Bitmap Index Scan on idx_comments_post_id
                    Index Cond: (post_id = 50000)
        ->  Hash
              ->  Seq Scan on authors a
```

### EXPLAIN — Aggregation (native `pg` SQL)

```
Index Only Scan using authors_pkey on authors a
  Index Cond: (id = 1000)
  SubPlan 1
    ->  Aggregate
          ->  Index Only Scan using idx_posts_author_id on posts p
                Index Cond: (author_id = a.id)
  SubPlan 2
    ->  Aggregate
          ->  Nested Loop
                ->  Bitmap Heap Scan on posts p_1
                      Recheck Cond: (author_id = a.id)
                      ->  Bitmap Index Scan on idx_posts_author_id
                            Index Cond: (author_id = a.id)
                ->  Index Only Scan using idx_comments_post_id on comments c
                      Index Cond: (post_id = p_1.id)
```
