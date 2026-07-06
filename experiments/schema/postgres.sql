-- PostgreSQL schema for the access-layer benchmark.
-- Domain: a minimal blog (authors 1—* posts 1—* comments *—1 authors).
-- Kept identical in shape to schema/mysql.sql so every adapter runs the same
-- logical workload against both engines.

DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS authors CASCADE;

CREATE TABLE authors (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    email       VARCHAR(200) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE posts (
    id          BIGSERIAL PRIMARY KEY,
    author_id   BIGINT       NOT NULL REFERENCES authors(id),
    title       VARCHAR(200) NOT NULL,
    body        TEXT         NOT NULL,
    published   BOOLEAN      NOT NULL DEFAULT true,
    views       INTEGER      NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE comments (
    id          BIGSERIAL PRIMARY KEY,
    post_id     BIGINT       NOT NULL REFERENCES posts(id),
    author_id   BIGINT       NOT NULL REFERENCES authors(id),
    body        TEXT         NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_posts_author_id   ON posts(author_id);
CREATE INDEX idx_posts_created_at  ON posts(created_at DESC);
CREATE INDEX idx_comments_post_id  ON comments(post_id);
CREATE INDEX idx_comments_author   ON comments(author_id);
