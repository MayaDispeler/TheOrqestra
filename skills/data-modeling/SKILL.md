---
name: data-modeling
description: Expert reference for relational and document data modeling — schema design, normalization, indexing strategy, and common pitfalls
tags: [database, sql, schema, modeling, postgres, mongodb]
---

# Data Modeling — Expert Reference

## Core Mental Model

A data model is a set of **promises** your system makes about data integrity, access patterns, and consistency. Design for the **queries you will run**, not the objects you think you have.

Three questions before any schema decision:
1. What are the read patterns? (frequency, shape, joins required)
2. What are the write patterns? (insert/update ratio, bulk vs single row)
3. What is the consistency requirement? (eventual vs strong, cascade rules)

---

## Non-Negotiable Standards

1. **Every table has a surrogate primary key** — `id BIGSERIAL` or `id UUID`. Natural keys as primary keys create coupling and migration pain.
2. **Foreign keys are declared**, not implied. An integer column named `user_id` without a FK constraint is a lie.
3. **Timestamps on every table**: `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` and `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`. Without them, debugging and auditing become archaeology.
4. **NULL means unknown**, not false, empty, or zero. Use `NOT NULL DEFAULT ''` instead of nullable strings when absence is representable as empty.
5. **Normalize to 3NF first**, denormalize only for proven performance requirements with measurement.
6. **Indexes are not free** — every index slows writes. Add indexes for known query patterns, not preemptively.
7. **Store money as integers** (cents/pence) or `NUMERIC(19,4)`. Never `FLOAT` or `DOUBLE` for currency.
8. **Enums are dangerous in SQL** — prefer a reference/lookup table or a `CHECK` constraint on a `VARCHAR`. Enums are hard to extend without migrations.

---

## Normalization Reference

| Form | Rule | Violation Example |
|---|---|---|
| 1NF | No repeating groups, atomic values | `tags VARCHAR` storing "a,b,c" |
| 2NF | No partial dependencies (on composite key) | `order_items` storing `product_name` (depends only on product_id) |
| 3NF | No transitive dependencies | `employees` storing `department_name` when `department_id` is present |
| BCNF | Every determinant is a candidate key | Rare — only relevant with overlapping composite keys |

**Denormalize when**:
- A join is measured to be a bottleneck (not assumed)
- Read:write ratio is > 100:1
- The denormalized column is derived and clearly labeled as such (e.g., `cached_total_amount`)

---

## Decision Rules

- If two entities have a M:N relationship → create a junction table; never comma-separated IDs
- If a column stores a list → it needs its own table (violation of 1NF)
- If an entity has optional subtypes with unique fields → use table-per-type (separate tables) not nullable columns
- If a query joins more than 5 tables → the schema may need denormalization or the query is wrong
- If you store JSON in a relational DB → define exactly what queries will hit it; if you filter/sort on JSON keys, extract them to columns
- If an ID column references another table → add a FK constraint, always
- If a table has > 50 columns → it is almost certainly modeling multiple entities; split it
- If you need soft deletes → add `deleted_at TIMESTAMPTZ`, never use a boolean `is_deleted`
- If ordering matters for a list → store `position INTEGER` in the junction/child table, never derive order from `created_at`
- Never store passwords in plaintext; store `password_hash TEXT` with bcrypt/argon2
- Never store computed values without a comment or naming convention indicating they are cached
- If a price/monetary field is needed → use `INTEGER` (cents) or `NUMERIC(19,4)`, never `FLOAT`
- If a column is used in a JOIN → add an index on the FK column (most databases do not auto-index FKs)

---

## Index Strategy

**Create an index when**:
- Column appears in `WHERE` clause with equality or range
- Column appears in `ORDER BY` on large tables
- Column is a FK (most databases do not auto-index FKs)
- Composite index: column order = most selective first (equality before range)

**Index types** (PostgreSQL):
```sql
-- Default — btree, good for equality and range
CREATE INDEX idx_users_email ON users(email);

-- Partial index — subset of rows, smaller and faster
CREATE INDEX idx_orders_pending ON orders(created_at) WHERE status = 'pending';

-- Composite index — covers multi-column WHERE
CREATE INDEX idx_events_user_time ON events(user_id, occurred_at DESC);

-- Unique constraint (also creates index)
CREATE UNIQUE INDEX idx_users_email_unique ON users(email);
```

**Never**:
- Index every column by default
- Index low-cardinality columns (boolean, status with 3 values) without a partial index
- Forget indexes on FK columns that will be used in JOINs

---

## Common Patterns

### Audit / History Table
```sql
CREATE TABLE document_history (
  id           BIGSERIAL PRIMARY KEY,
  document_id  BIGINT NOT NULL REFERENCES documents(id),
  changed_by   BIGINT NOT NULL REFERENCES users(id),
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  field_name   VARCHAR(100) NOT NULL,
  old_value    TEXT,
  new_value    TEXT
);
```

### Polymorphic Association (avoid if possible; use when necessary)
```sql
-- BAD: polymorphic with nullable FKs
CREATE TABLE comments (
  id         BIGSERIAL PRIMARY KEY,
  post_id    BIGINT REFERENCES posts(id),    -- nullable
  video_id   BIGINT REFERENCES videos(id),   -- nullable
  body       TEXT NOT NULL
);

-- GOOD: separate association tables
CREATE TABLE post_comments  (comment_id BIGINT REFERENCES comments(id), post_id  BIGINT REFERENCES posts(id),  PRIMARY KEY (comment_id));
CREATE TABLE video_comments (comment_id BIGINT REFERENCES comments(id), video_id BIGINT REFERENCES videos(id), PRIMARY KEY (comment_id));
```

### Status State Machine
```sql
-- Use CHECK constraint, not ENUM
CREATE TABLE orders (
  id      BIGSERIAL PRIMARY KEY,
  status  VARCHAR(20) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending','confirmed','shipped','delivered','cancelled'))
);
-- Document valid transitions in application layer, not DB
```

---

## Common Mistakes

### Mistake 1: EAV (Entity-Attribute-Value) schema
```sql
-- BAD — EAV makes every query a nightmare
CREATE TABLE attributes (entity_id INT, key VARCHAR, value TEXT);

-- GOOD — use JSONB for flexible attributes with known query patterns
ALTER TABLE products ADD COLUMN metadata JSONB;
-- Or use proper subtype tables if structure is known
```

### Mistake 2: Storing arrays as strings
```sql
-- BAD
INSERT INTO posts (tags) VALUES ('sql,database,tutorial');

-- GOOD (PostgreSQL)
CREATE TABLE post_tags (post_id BIGINT REFERENCES posts(id), tag VARCHAR(50) NOT NULL, PRIMARY KEY (post_id, tag));
-- Or for unstructured tags:
ALTER TABLE posts ADD COLUMN tag_ids BIGINT[];
```

### Mistake 3: Missing NOT NULL where semantically required
```sql
-- BAD — email can be NULL, but a user without email is undefined
CREATE TABLE users (id BIGSERIAL PRIMARY KEY, email VARCHAR(255));

-- GOOD
CREATE TABLE users (id BIGSERIAL PRIMARY KEY, email VARCHAR(255) NOT NULL);
CREATE UNIQUE INDEX ON users(email);
```

### Mistake 4: Using FLOAT for money
```sql
-- BAD
price FLOAT  -- 0.1 + 0.2 = 0.30000000000000004

-- GOOD
price_cents INTEGER NOT NULL  -- store 1999 for $19.99
-- Or:
price NUMERIC(19,4) NOT NULL
```

### Mistake 5: No cascade rules defined
```sql
-- BAD — orphaned rows accumulate silently
CREATE TABLE order_items (order_id BIGINT REFERENCES orders(id));

-- GOOD — explicit cascade decision
CREATE TABLE order_items (order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE);
-- or ON DELETE RESTRICT if orphans should be prevented
```

---

## Good vs Bad Schema

**BAD**: User profile with everything in one table
```sql
CREATE TABLE users (
  id INT PRIMARY KEY,
  name VARCHAR,
  email VARCHAR,
  billing_street VARCHAR,
  billing_city VARCHAR,
  billing_country VARCHAR,
  shipping_street VARCHAR,
  shipping_city VARCHAR,
  subscription_plan VARCHAR,
  subscription_expires DATE,
  stripe_customer_id VARCHAR
);
```

**GOOD**: Normalized
```sql
CREATE TABLE users (
  id          BIGSERIAL PRIMARY KEY,
  email       VARCHAR(255) NOT NULL,
  name        VARCHAR(255) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX ON users(email);

CREATE TABLE addresses (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(20) NOT NULL CHECK (type IN ('billing','shipping')),
  street      VARCHAR(255) NOT NULL,
  city        VARCHAR(100) NOT NULL,
  country     CHAR(2) NOT NULL,  -- ISO 3166
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             BIGINT NOT NULL REFERENCES users(id),
  plan                VARCHAR(50) NOT NULL,
  expires_at          TIMESTAMPTZ,
  stripe_customer_id  VARCHAR(100),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Vocabulary

- **Cardinality**: ratio of rows in a relationship (1:1, 1:N, M:N)
- **Surrogate key**: system-generated PK with no business meaning (UUID, BIGSERIAL)
- **Natural key**: PK derived from business data (email, SSN) — avoid as PK
- **Junction table**: resolves M:N relationship; often called association or pivot table
- **Normalization**: eliminating redundancy and dependency anomalies
- **Denormalization**: intentional redundancy for performance
- **Index selectivity**: proportion of unique values in a column; higher = better index candidate
- **Covering index**: index that contains all columns a query needs (avoids table lookup)
- **Partial index**: index on a subset of rows matching a condition
- **JSONB**: PostgreSQL binary JSON column — queryable, indexable
- **Soft delete**: marking records as deleted without removing them (`deleted_at`)
- **EAV**: Entity-Attribute-Value — anti-pattern for flexible schemas
- **FK constraint**: database-enforced referential integrity
