# Same-SQL control: emitted statements, protocols, and engine plans


## postgres

SQL identical across layers: **true**

### pg — protocol: extended/prepared


```sql
-- [extended/prepared]
SELECT p.*, a.name AS author_name, a.email AS author_email
	     FROM posts p JOIN authors a ON a.id = p.author_id
	    WHERE p.id = $1
```

```sql
-- [extended/prepared]
SELECT c.id, c.body, c.created_at,
	          a.id AS author_id, a.name AS author_name, a.email AS author_email
	     FROM comments c JOIN authors a ON a.id = c.author_id
	    WHERE c.post_id = $1
	    ORDER BY c.id
```
### pg-tuned — protocol: extended/prepared


```sql
-- [extended/prepared]
SELECT p.*, a.name AS author_name, a.email AS author_email
	     FROM posts p JOIN authors a ON a.id = p.author_id
	    WHERE p.id = $1
```

```sql
-- [extended/prepared]
SELECT c.id, c.body, c.created_at,
	          a.id AS author_id, a.name AS author_name, a.email AS author_email
	     FROM comments c JOIN authors a ON a.id = c.author_id
	    WHERE c.post_id = $1
	    ORDER BY c.id
```
### knex — protocol: extended/prepared


```sql
-- [extended/prepared]
SELECT p.*, a.name AS author_name, a.email AS author_email
	     FROM posts p JOIN authors a ON a.id = p.author_id
	    WHERE p.id = $1
```

```sql
-- [extended/prepared]
SELECT c.id, c.body, c.created_at,
	          a.id AS author_id, a.name AS author_name, a.email AS author_email
	     FROM comments c JOIN authors a ON a.id = c.author_id
	    WHERE c.post_id = $1
	    ORDER BY c.id
```
### drizzle — protocol: extended/prepared


```sql
-- [extended/prepared]
SELECT p.*, a.name AS author_name, a.email AS author_email
	     FROM posts p JOIN authors a ON a.id = p.author_id
	    WHERE p.id = $1
```

```sql
-- [extended/prepared]
SELECT c.id, c.body, c.created_at,
	          a.id AS author_id, a.name AS author_name, a.email AS author_email
	     FROM comments c JOIN authors a ON a.id = c.author_id
	    WHERE c.post_id = $1
	    ORDER BY c.id
```
### prisma — protocol: extended/prepared


```sql
-- [extended/prepared]
SELECT p.*, a.name AS author_name, a.email AS author_email
	     FROM posts p JOIN authors a ON a.id = p.author_id
	    WHERE p.id = $1
```

```sql
-- [extended/prepared]
SELECT c.id, c.body, c.created_at,
	          a.id AS author_id, a.name AS author_name, a.email AS author_email
	     FROM comments c JOIN authors a ON a.id = c.author_id
	    WHERE c.post_id = $1
	    ORDER BY c.id
```
### sequelize — protocol: extended/prepared


```sql
-- [extended/prepared]
SELECT p.*, a.name AS author_name, a.email AS author_email
	     FROM posts p JOIN authors a ON a.id = p.author_id
	    WHERE p.id = $1
```

```sql
-- [extended/prepared]
SELECT c.id, c.body, c.created_at,
	          a.id AS author_id, a.name AS author_name, a.email AS author_email
	     FROM comments c JOIN authors a ON a.id = c.author_id
	    WHERE c.post_id = $1
	    ORDER BY c.id
```
### typeorm — protocol: extended/prepared


```sql
-- [extended/prepared]
SELECT p.*, a.name AS author_name, a.email AS author_email
	     FROM posts p JOIN authors a ON a.id = p.author_id
	    WHERE p.id = $1
```

```sql
-- [extended/prepared]
SELECT c.id, c.body, c.created_at,
	          a.id AS author_id, a.name AS author_name, a.email AS author_email
	     FROM comments c JOIN authors a ON a.id = c.author_id
	    WHERE c.post_id = $1
	    ORDER BY c.id
```
### objection — protocol: extended/prepared


```sql
-- [extended/prepared]
SELECT p.*, a.name AS author_name, a.email AS author_email
	     FROM posts p JOIN authors a ON a.id = p.author_id
	    WHERE p.id = $1
```

```sql
-- [extended/prepared]
SELECT c.id, c.body, c.created_at,
	          a.id AS author_id, a.name AS author_name, a.email AS author_email
	     FROM comments c JOIN authors a ON a.id = c.author_id
	    WHERE c.post_id = $1
	    ORDER BY c.id
```
### mikroorm — protocol: simple


```sql
-- [simple]
SELECT p.*, a.name AS author_name, a.email AS author_email
	     FROM posts p JOIN authors a ON a.id = p.author_id
	    WHERE p.id = 50000
```

```sql
-- [simple]
SELECT c.id, c.body, c.created_at,
	          a.id AS author_id, a.name AS author_name, a.email AS author_email
	     FROM comments c JOIN authors a ON a.id = c.author_id
	    WHERE c.post_id = 50000
	    ORDER BY c.id
```

### EXPLAIN ANALYZE (q1)
```
Nested Loop (actual time=0.090..0.091 rows=1.00 loops=1)
  Buffers: shared hit=10
  ->  Index Scan using posts_pkey on posts p (actual time=0.077..0.078 rows=1.00 loops=1)
        Index Cond: (id = 50000)
        Index Searches: 1
        Buffers: shared hit=7
  ->  Index Scan using authors_pkey on authors a (actual time=0.008..0.008 rows=1.00 loops=1)
        Index Cond: (id = p.author_id)
        Index Searches: 1
        Buffers: shared hit=3
Planning:
  Buffers: shared hit=294
Planning Time: 0.922 ms
Execution Time: 0.136 ms
```

### EXPLAIN ANALYZE (q2)
```
Sort (actual time=0.891..0.893 rows=17.00 loops=1)
  Sort Key: c.id
  Sort Method: quicksort  Memory: 26kB
  Buffers: shared hit=44
  ->  Hash Join (actual time=0.736..0.865 rows=17.00 loops=1)
        Hash Cond: (c.author_id = a.id)
        Buffers: shared hit=41
        ->  Bitmap Heap Scan on comments c (actual time=0.062..0.185 rows=17.00 loops=1)
              Recheck Cond: (post_id = 50000)
              Heap Blocks: exact=17
              Buffers: shared hit=20
              ->  Bitmap Index Scan on idx_comments_post_id (actual time=0.036..0.036 rows=17.00 loops=1)
                    Index Cond: (post_id = 50000)
                    Index Searches: 1
                    Buffers: shared hit=3
        ->  Hash (actual time=0.645..0.646 rows=2000.00 loops=1)
              Buckets: 2048  Batches: 1  Memory Usage: 161kB
              Buffers: shared hit=21
              ->  Seq Scan on authors a (actual time=0.013..0.221 rows=2000.00 loops=1)
                    Buffers: shared hit=21
Planning:
  Buffers: shared hit=73
Planning Time: 0.371 ms
Execution Time: 0.924 ms
```


## mysql

SQL identical across layers: **true**

### mysql2 — protocol: simple/text


```sql
-- [simple/text]
SELECT p.*, a.name AS author_name, a.email AS author_email
     FROM posts p JOIN authors a ON a.id = p.author_id
    WHERE p.id = 50000
```

```sql
-- [simple/text]
SELECT c.id, c.body, c.created_at,
          a.id AS author_id, a.name AS author_name, a.email AS author_email
     FROM comments c JOIN authors a ON a.id = c.author_id
    WHERE c.post_id = 50000
    ORDER BY c.id
```
### mysql2-tuned — protocol: binary/execute


```sql
-- [binary/execute]
SELECT p.*, a.name AS author_name, a.email AS author_email
     FROM posts p JOIN authors a ON a.id = p.author_id
    WHERE p.id = 50000
```

```sql
-- [binary/execute]
SELECT c.id, c.body, c.created_at,
          a.id AS author_id, a.name AS author_name, a.email AS author_email
     FROM comments c JOIN authors a ON a.id = c.author_id
    WHERE c.post_id = 50000
    ORDER BY c.id
```
### knex — protocol: simple/text


```sql
-- [simple/text]
SELECT p.*, a.name AS author_name, a.email AS author_email
     FROM posts p JOIN authors a ON a.id = p.author_id
    WHERE p.id = 50000
```

```sql
-- [simple/text]
SELECT c.id, c.body, c.created_at,
          a.id AS author_id, a.name AS author_name, a.email AS author_email
     FROM comments c JOIN authors a ON a.id = c.author_id
    WHERE c.post_id = 50000
    ORDER BY c.id
```
### drizzle — protocol: simple/text


```sql
-- [simple/text]
SELECT p.*, a.name AS author_name, a.email AS author_email
     FROM posts p JOIN authors a ON a.id = p.author_id
    WHERE p.id = 50000
```

```sql
-- [simple/text]
SELECT c.id, c.body, c.created_at,
          a.id AS author_id, a.name AS author_name, a.email AS author_email
     FROM comments c JOIN authors a ON a.id = c.author_id
    WHERE c.post_id = 50000
    ORDER BY c.id
```
### prisma — protocol: binary/execute


```sql
-- [binary/execute]
SELECT p.*, a.name AS author_name, a.email AS author_email
     FROM posts p JOIN authors a ON a.id = p.author_id
    WHERE p.id = 50000
```

```sql
-- [binary/execute]
SELECT c.id, c.body, c.created_at,
          a.id AS author_id, a.name AS author_name, a.email AS author_email
     FROM comments c JOIN authors a ON a.id = c.author_id
    WHERE c.post_id = 50000
    ORDER BY c.id
```
### sequelize — protocol: simple/text


```sql
-- [simple/text]
SELECT p.*, a.name AS author_name, a.email AS author_email
     FROM posts p JOIN authors a ON a.id = p.author_id
    WHERE p.id = 50000
```

```sql
-- [simple/text]
SELECT c.id, c.body, c.created_at,
          a.id AS author_id, a.name AS author_name, a.email AS author_email
     FROM comments c JOIN authors a ON a.id = c.author_id
    WHERE c.post_id = 50000
    ORDER BY c.id
```
### typeorm — protocol: simple/text


```sql
-- [simple/text]
SELECT p.*, a.name AS author_name, a.email AS author_email
     FROM posts p JOIN authors a ON a.id = p.author_id
    WHERE p.id = 50000
```

```sql
-- [simple/text]
SELECT c.id, c.body, c.created_at,
          a.id AS author_id, a.name AS author_name, a.email AS author_email
     FROM comments c JOIN authors a ON a.id = c.author_id
    WHERE c.post_id = 50000
    ORDER BY c.id
```
### objection — protocol: simple/text


```sql
-- [simple/text]
SELECT p.*, a.name AS author_name, a.email AS author_email
     FROM posts p JOIN authors a ON a.id = p.author_id
    WHERE p.id = 50000
```

```sql
-- [simple/text]
SELECT c.id, c.body, c.created_at,
          a.id AS author_id, a.name AS author_name, a.email AS author_email
     FROM comments c JOIN authors a ON a.id = c.author_id
    WHERE c.post_id = 50000
    ORDER BY c.id
```
### mikroorm — protocol: simple/text


```sql
-- [simple/text]
SELECT p.*, a.name AS author_name, a.email AS author_email
     FROM posts p JOIN authors a ON a.id = p.author_id
    WHERE p.id = 50000
```

```sql
-- [simple/text]
SELECT c.id, c.body, c.created_at,
          a.id AS author_id, a.name AS author_name, a.email AS author_email
     FROM comments c JOIN authors a ON a.id = c.author_id
    WHERE c.post_id = 50000
    ORDER BY c.id
```

### EXPLAIN ANALYZE (q1)
```
-> Rows fetched before execution  (cost=0..0 rows=1) (actual time=89e-6..127e-6 rows=1 loops=1)

```

### EXPLAIN ANALYZE (q2)
```
-> Nested loop inner join  (cost=11.9 rows=17) (actual time=0.0233..0.138 rows=17 loops=1)
    -> Index lookup on c using idx_comments_post_id (post_id = 50000)  (cost=5.95 rows=17) (actual time=0.0159..0.0903 rows=17 loops=1)
    -> Single-row index lookup on a using PRIMARY (id = c.author_id)  (cost=0.256 rows=1) (actual time=0.00256..0.00258 rows=1 loops=17)

```
