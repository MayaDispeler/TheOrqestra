---
name: sql-standards
description: Dense reference for writing production-grade SQL — style, correctness, performance, and anti-pattern avoidance.
version: 1.0.0
---

# SQL Standards

## Mental Models

**Push Filters Early**: Filters on large tables should be applied as early in the query plan as possible — in the innermost CTE or subquery, not after a join.

**Join Amplification**: Every join is a potential row multiplier. Before any join, ask: "What is the cardinality relationship?" (1:1, 1:many, many:many). Document it.

**Set Operations Over Loops**: SQL operates on sets. If you're thinking in loops or cursors, you're writing procedural code in a set-based engine. Reframe.

**The CTE is a Contract**: Each CTE should have one job, one grain, and a name that makes it self-documenting. A reader should understand what it contains without reading it.

**Window Functions are Computed Last**: Window functions run after WHERE, GROUP BY, and HAVING. You cannot filter on a window function result in the same SELECT — wrap it in a subquery or CTE.

---

## Non-Negotiable Standards

1. **Explicit column lists always.** `SELECT *` is forbidden in production queries. It breaks silently when upstream schemas change.
2. **Qualify all column references in multi-table queries.** `table_alias.column_name` — no ambiguity ever.
3. **All CTEs are named for their content, not their order.** `cte1`, `step2`, `final` are not names.
4. **JOIN type must be explicit and intentional.** Default to `INNER JOIN`. Use `LEFT JOIN` only when NULLs in the right table are semantically meaningful. Never use implicit cross joins (comma syntax).
5. **Every GROUP BY must be justified.** If you're aggregating, you must be able to state the grain of the result.
6. **No logic in WHERE that belongs in JOIN ON.** Filter on joined table attributes in `ON`, not `WHERE` — especially for LEFT JOINs (moving it to WHERE converts it to an INNER JOIN).
7. **Date arithmetic is explicit.** Never rely on implicit casting. Use `DATE_TRUNC`, `DATEADD`, `DATEDIFF` with explicit unit arguments.
8. **NULL handling is always deliberate.** Every column that could be NULL should have an explicit `IS NULL`, `COALESCE`, or `NULLIF` — never rely on implicit NULL propagation behavior.

---

## Style Standards

```sql
-- Good: CTE structure, explicit aliases, qualified columns, readable grain
WITH daily_orders AS (
    SELECT
        o.user_id,
        DATE_TRUNC('day', o.created_at) AS order_date,
        COUNT(o.order_id)               AS order_count,
        SUM(o.order_amount_usd)         AS total_revenue_usd
    FROM orders AS o
    WHERE o.status = 'completed'
      AND o.created_at >= '2024-01-01'
    GROUP BY 1, 2
),

user_attributes AS (
    SELECT
        u.user_id,
        u.signup_date,
        u.country_code
    FROM users AS u
    WHERE u.is_internal = FALSE
)

SELECT
    da.order_date,
    ua.country_code,
    SUM(da.order_count)       AS total_orders,
    SUM(da.total_revenue_usd) AS total_revenue_usd
FROM daily_orders AS da
INNER JOIN user_attributes AS ua
    ON da.user_id = ua.user_id
GROUP BY 1, 2
ORDER BY 1, 2
;
```

---

## Decision Rules

**If** a query has more than 4 CTEs → consider materializing intermediate results as a table or view. Long CTE chains are hard to debug and some engines re-evaluate them.

**If** you need to deduplicate → use `ROW_NUMBER() OVER (PARTITION BY key ORDER BY tiebreaker DESC)` and filter `WHERE rn = 1`. Never use `GROUP BY` as a dedup mechanism.

**If** you need the most recent record per entity → use a window function, not a self-join. Self-joins for this pattern are O(n²) and semantically fragile.

**If** you're joining on a non-indexed column on a large table → flag it. In a code review this is a performance blocker.

**If** a CASE WHEN has no ELSE → add `ELSE NULL` explicitly. Implicit NULLs hide logic gaps.

**If** you see `HAVING COUNT(*) > 0` → it's redundant. Remove it.

**If** you need to compare across periods (WoW, MoM) → use `LAG()` or a self-join with explicit aliasing. Never compute the comparison in application code.

**Never** use `NOT IN (subquery)` when the subquery can return NULLs — it evaluates to NULL and silently drops all rows. Use `NOT EXISTS` or `LEFT JOIN ... WHERE right_key IS NULL`.

**Never** use `ORDER BY` in a subquery or CTE (except with `TOP`/`LIMIT`). It is not guaranteed to propagate and confuses readers.

**Never** use `UNION` when you mean `UNION ALL`. `UNION` deduplicates and is slower. Use it only when deduplication is the intent.

---

## Common Mistakes

**Mistake: Fan-out from many:many join**
```sql
-- BAD: orders joined to order_tags without knowing cardinality
SELECT o.order_id, SUM(o.amount) FROM orders o JOIN order_tags t ON o.order_id = t.order_id GROUP BY 1
-- If an order has 3 tags, amount is summed 3x
```
```sql
-- GOOD: deduplicate or aggregate tags separately
WITH tag_counts AS (
    SELECT order_id, COUNT(*) AS tag_count FROM order_tags GROUP BY 1
)
SELECT o.order_id, o.amount, tc.tag_count FROM orders o LEFT JOIN tag_counts tc ON o.order_id = tc.order_id
```

**Mistake: LEFT JOIN filter moved to WHERE**
```sql
-- BAD: converts LEFT to INNER silently
SELECT u.user_id FROM users u LEFT JOIN orders o ON u.user_id = o.user_id WHERE o.status = 'completed'
-- GOOD:
SELECT u.user_id FROM users u LEFT JOIN orders o ON u.user_id = o.user_id AND o.status = 'completed'
```

**Mistake: Implicit type coercion in JOIN**
```sql
-- BAD: user_id is INT in users, VARCHAR in events — engine does implicit cast, may skip index
JOIN events e ON u.user_id = e.user_id
-- GOOD:
JOIN events e ON CAST(u.user_id AS VARCHAR) = e.user_id
```

---

## Vocabulary

| Term | Meaning |
|------|---------|
| Predicate pushdown | Optimizer moving WHERE filters closer to the scan |
| Fan-out | Row multiplication due to 1:many or many:many join |
| Grain | The unique key that identifies a row in a result set |
| Cardinality | The number of distinct values in a column or the row ratio in a join |
| Window frame | The rows included in a window function calculation (ROWS vs RANGE) |
| Lateral join | A join where the right side references columns from the left (CROSS APPLY / LATERAL) |
| Materialized CTE | A CTE forced to execute once and cache results (engine-dependent) |
| Index selectivity | The proportion of rows an index eliminates — high selectivity = fewer rows scanned |
