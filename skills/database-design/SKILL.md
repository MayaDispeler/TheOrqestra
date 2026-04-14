---
name: database-design
description: >
  Use this skill whenever the task involves schema design, data modeling, normalization, indexing,
  query optimization, migrations, or choosing between relational/NoSQL storage. Trigger on: ERD
  design, table creation, foreign keys, indexes, stored procedures, ORM models, partitioning,
  replication, or any mention of PostgreSQL, MySQL, SQLite, MongoDB, Redis, Cassandra.
---

# Database Design — Expert Reference

## Core Mental Models

**Data integrity is the first contract.** A database that returns fast but wrong answers is worse than a slow correct one.

**Normalization vs. denormalization is a tension, not a binary.** OLTP → normalize to 3NF by default. OLAP / read-heavy → denormalize deliberately with documented reasons.

**Every index is a write tax.** Indexes speed reads, slow writes, consume storage. Each one needs justification.

**Schema changes are deployments.** Treat migrations with the same rigor as code releases.

---

## Non-Negotiable Standards

1. **Primary keys**: Use surrogate keys (`BIGINT AUTO_INCREMENT` or `UUID`) unless the natural key is guaranteed immutable and short. Never use email, phone, or SSN as PK.
2. **Foreign keys must be declared**, not just implied in application code.
3. **NOT NULL by default.** Nullable columns require explicit justification. NULL means "unknown", not "empty" or "zero".
4. **Timestamps on every table**: `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`. Use UTC always.
5. **Never store comma-separated values in a column.** That's a missing join table.
6. **No EAV (Entity-Attribute-Value) without exhausting alternatives.** EAV destroys query performance and type safety.
7. **Migrations are irreversible in production.** Write `up` and `down` scripts; test `down` before merging.

---

## Decision Rules

```
IF table > 10M rows AND query filters on a date range THEN partition by date range
IF column cardinality < 10 distinct values THEN skip B-tree index, consider partial index
IF read:write ratio > 10:1 THEN consider denormalization or materialized views
IF entity has many optional attributes THEN use JSONB column (PostgreSQL) over EAV or nullable columns
IF two systems share a database THEN extract to separate schema with explicit API surface (views/stored procs)
IF query uses LIKE '%term%' THEN use full-text search (pg_trgm or FTS), not LIKE
IF joining > 4 tables THEN redesign schema or use materialized view
IF boolean column THEN reconsider: is it an enum in disguise? (status, type, role columns)
NEVER use SELECT * in application code — enumerate columns explicitly
NEVER rely on implicit transaction commits — always explicit BEGIN/COMMIT/ROLLBACK
NEVER store passwords in plaintext — hash with bcrypt/argon2 at application layer
NEVER use FLOAT for money — use DECIMAL(19,4) or integer cents
```

---

## Normalization Reference

| Form | Rule | Violation Example | Fix |
|------|------|-------------------|-----|
| 1NF | Atomic values, no repeating groups | `tags: "a,b,c"` | Separate `tags` table |
| 2NF | No partial dependency on composite PK | `order_items(order_id, product_id, product_name)` | `product_name` belongs in `products` |
| 3NF | No transitive dependency | `employees(id, dept_id, dept_name)` | `dept_name` belongs in `departments` |
| BCNF | Every determinant is a candidate key | Rare; handle on case basis |

---

## Indexing Strategy

**Always index:**
- Foreign key columns (most ORMs don't do this automatically)
- Columns in WHERE, JOIN ON, ORDER BY clauses for high-frequency queries
- Unique constraints (implicit index)

**Composite index column order:** Most selective column first. Index on `(status, created_at)` serves `WHERE status = 'active' ORDER BY created_at` — reversed order wastes the index.

**Partial indexes** for sparse conditions:
```sql
-- Good: only index active users
CREATE INDEX idx_users_email_active ON users(email) WHERE deleted_at IS NULL;
```

**Covering indexes** to avoid table lookups:
```sql
-- Query: SELECT name, email FROM users WHERE status = 'active'
CREATE INDEX idx_users_covering ON users(status) INCLUDE (name, email);
```

---

## Common Mistakes & Exact Fixes

### Mistake 1: N+1 via missing index on FK
```sql
-- BAD: orders.user_id has no index; full scan per join
SELECT * FROM users u JOIN orders o ON o.user_id = u.id;

-- FIX: Always index FK columns
CREATE INDEX idx_orders_user_id ON orders(user_id);
```

### Mistake 2: Soft deletes without partial indexes
```sql
-- BAD: every query scans deleted rows
SELECT * FROM products WHERE category_id = 5;

-- FIX: partial index + always filter
CREATE INDEX idx_products_category ON products(category_id) WHERE deleted_at IS NULL;
SELECT * FROM products WHERE category_id = 5 AND deleted_at IS NULL;
```

### Mistake 3: VARCHAR(255) cargo-culting
```sql
-- BAD: one-size-fits-all
name VARCHAR(255), country_code VARCHAR(255)

-- GOOD: right-sized, self-documenting
name VARCHAR(100), country_code CHAR(2)
```

### Mistake 4: Schema changes without migration locks
```sql
-- BAD on large tables (full lock)
ALTER TABLE events ADD COLUMN processed BOOLEAN DEFAULT FALSE;

-- GOOD: add nullable, backfill, then add NOT NULL + default
ALTER TABLE events ADD COLUMN processed BOOLEAN;
UPDATE events SET processed = FALSE WHERE processed IS NULL; -- batched
ALTER TABLE events ALTER COLUMN processed SET NOT NULL, ALTER COLUMN processed SET DEFAULT FALSE;
```

---

## Good vs. Bad Output

### BAD schema (users + orders):
```sql
CREATE TABLE users (
  id INT,
  name VARCHAR(255),
  email VARCHAR(255),
  address VARCHAR(255),
  orders TEXT  -- "order1_id,order2_id,..."
);
```

### GOOD schema:
```sql
CREATE TABLE users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE addresses (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  street VARCHAR(200) NOT NULL,
  city VARCHAR(100) NOT NULL,
  country_code CHAR(2) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_addresses_user_id ON addresses(user_id);

CREATE TABLE orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending','paid','shipped','cancelled')),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);
```

---

## Expert Vocabulary

- **Cardinality**: number of distinct values in a column — drives index selectivity
- **Predicate pushdown**: query planner applies filters before joins — enable by indexing filter columns
- **MVCC**: Multi-Version Concurrency Control — PostgreSQL's mechanism for non-blocking reads
- **WAL (Write-Ahead Log)**: durability mechanism; also used for replication
- **Bloat**: dead tuples/pages accumulating after updates/deletes — remedy with `VACUUM ANALYZE`
- **Connection pooling**: databases have connection limits; use PgBouncer/RDS Proxy, never raw connections from serverless
- **Optimistic locking**: version column incremented on update; conflict detection without DB locks
- **Covering index**: index includes all columns a query needs — eliminates heap fetch
- **Hotspot**: single row/page receiving disproportionate writes — causes lock contention
