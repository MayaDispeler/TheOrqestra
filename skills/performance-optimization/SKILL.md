---
name: performance-optimization
description: Expert reference for system and application performance — profiling methodology, latency vs throughput, caching strategies, database query optimization, frontend Core Web Vitals, and capacity thinking
version: 2.0.0
---

# Performance Optimization — Expert Reference

## Non-Negotiable Standards

- **Measure before optimizing**: never optimize based on intuition; profile first, identify the bottleneck, change one variable, measure again — in that order
- **Optimize the right layer**: a 10ms DB query optimized to 5ms means nothing if there are 200 N+1 queries; fix the architecture before micro-optimizing
- **Set a performance budget**: every feature ships with defined targets: p50/p95/p99 latency, throughput, memory ceiling; treat regressions as bugs
- **The fastest code is code that doesn't run**: eliminate work before speeding it up — cache, batch, paginate, lazy-load, cut features
- **Amdahl's Law is real**: parallelizing 5% of a workload yields at most 5% speedup; optimize the dominant cost, not the convenient cost
- **Report p99, not p50**: mean and median latency hide tail disasters; users experiencing the p99 are the ones who churn

---

## Decision Rules

**Profiling — always start here:**
- If you don't know where the bottleneck is → profile in production (sampled) or staging under realistic load; never guess
- If CPU-bound → profile call graphs (py-spy, async-profiler, pprof); look for hot loops and redundant computation
- If I/O-bound → trace individual request spans; look for serial I/O that can be parallelized, or chattiness (N+1 queries)
- If memory-bound → heap dump + allocation profiler; look for large retained objects and frequent GC cycles
- If latency is high but CPU is low → suspect lock contention, thread starvation, connection pool exhaustion, or external dependency latency
- Never open a PR that says "performance improvement" without a before/after benchmark showing the delta

**Caching:**
- If data is expensive to compute and read-heavy → cache it; define TTL based on acceptable staleness, not convenience
- If cache invalidation is complex → prefer short TTLs over complex invalidation logic; complex invalidation has bugs that cause stale data
- If caching user-specific data → scope cache keys to user ID; never serve one user's data to another
- If cache hit rate < 80% → the cache is adding overhead without benefit; reconsider key design or TTL
- If popular cache key expires → protect against stampede with probabilistic early expiration, mutex lock on miss, or background refresh
- Never cache: error states, security-sensitive data without strict scope, or data that must be real-time

**Databases:**
- If a query is slow → `EXPLAIN ANALYZE` before adding any index; never add indexes blindly
- If seeing N+1 queries → use eager loading / JOINs / DataLoader (GraphQL); never query inside a loop
- If full-table scans appear → add index on filter/sort columns; composite index column order: equality predicates first, range predicates last
- If write throughput is the bottleneck → batch inserts, async writes, or write-ahead + background flush
- If read throughput is the bottleneck → read replicas, connection pooling (PgBouncer), or read-through cache
- Never `SELECT *` in production queries for large tables; always name columns explicitly
- Never run a database above 70% CPU under normal load; that's the cliff edge before cascading failure

**Frontend:**
- If bundle size is large → analyze with `source-map-explorer` or `webpack-bundle-analyzer`; code-split at route boundaries first
- If render is janky → profile with Chrome DevTools Performance tab; look for long tasks (>50ms) blocking the main thread
- If images are slow → use WebP/AVIF, responsive `srcset`, lazy loading, and CDN delivery
- If Core Web Vitals are red → LCP: optimize critical render path and largest image; CLS: reserve space for dynamic content with aspect-ratio; INP: defer non-critical JS, break up long tasks
- Never block the main thread with synchronous heavy computation; use Web Workers for CPU-intensive tasks
- If third-party scripts are hurting performance → load async, defer, or move to a facade pattern

**Concurrency:**
- If parallelizing I/O-bound work → async/await with `Promise.all` / `asyncio.gather`; never serialize independent requests
- If parallelizing CPU-bound work → true threads or process pool (not event loop); Python: `ProcessPoolExecutor`; Go: goroutines
- If using connection pools → set `max_pool_size` to `(CPU_cores × 2) + effective_spindle_count` as a starting point; monitor pool wait time directly
- If a queue is growing → the consumer is slower than the producer; add consumers or reduce consumer processing time before increasing queue capacity

---

## Common Mistakes and How to Avoid Them

| Mistake | Symptom | Fix |
|---|---|---|
| Optimizing without profiling | 3 days spent, no measurable improvement | Flame graph first; optimize the widest bar |
| N+1 queries | 200 DB queries per page load | `select_related` / `include` / DataLoader; measure query count in tests |
| Unindexed filter columns | Full table scan on 10M rows | `EXPLAIN ANALYZE`, add composite index on (equality_col, range_col) |
| Synchronous serial I/O | 3 independent API calls taking 900ms sequentially | `Promise.all` / `asyncio.gather`; 300ms instead |
| Cache key collision | User A sees User B's data | Always namespace keys: `user:{user_id}:orders` |
| Static alert thresholds | No alarm during traffic drop; false alarm during spike | Alert on rate (error %) not count (error total) |
| Mean latency in dashboards | Tail-latency disaster invisible | Always plot p95, p99; alert on p99 |
| Premature optimization | Over-engineered code in a function called 10×/day | Profile first; most code paths are not hot paths |
| Adding indexes without analysis | Write performance degrades 40%; reads barely improve | Index based on actual `EXPLAIN ANALYZE` output for real queries |
| Heavy computation on main thread (browser) | UI freezes during computation | Web Worker for anything >16ms |

---

## Good vs Bad Output

**BAD — N+1 queries:**
```python
orders = Order.objects.all()
for order in orders:
    print(order.user.name)  # hits DB each time — N+1
```

**GOOD — eager loading:**
```python
orders = Order.objects.select_related('user').all()  # 2 queries total
for order in orders:
    print(order.user.name)
```

---

**BAD — serial I/O:**
```js
// 300ms total (three sequential 100ms calls)
const user = await fetchUser(id)
const orders = await fetchOrders(id)
const preferences = await fetchPreferences(id)
```

**GOOD — parallel I/O:**
```js
// 100ms total (parallel)
const [user, orders, preferences] = await Promise.all([
  fetchUser(id),
  fetchOrders(id),
  fetchPreferences(id)
])
```

---

**BAD — indexing without analysis:**
```sql
CREATE INDEX ON users(first_name);
CREATE INDEX ON users(last_name);
CREATE INDEX ON users(email);
CREATE INDEX ON users(phone);
CREATE INDEX ON users(created_at);
-- Write performance now degraded 40%; reads barely improved
```

**GOOD — index based on actual query patterns:**
```sql
-- EXPLAIN ANALYZE revealed:
-- Query 1: WHERE email = ? (login lookup)
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- Query 2: WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50
CREATE INDEX idx_users_tenant_created ON users(tenant_id, created_at DESC);
-- Equality predicate (tenant_id) first, range/sort (created_at) last
```

---

**BAD — performance investigation:**
```
"The API is slow, let's add Redis caching everywhere."
```

**GOOD — performance investigation process:**
```
1. Define: what is slow? (endpoint, p95 latency = 2.1s, target = 200ms)
2. Instrument: add distributed tracing (OpenTelemetry) if not present
3. Profile: trace shows 1.8s in DB layer
4. Diagnose: EXPLAIN ANALYZE reveals full scan on 8M row table (no index on tenant_id)
5. Fix: add composite index (tenant_id, created_at)
6. Verify: p95 drops to 45ms under same load in load test
7. Monitor: alert if p95 > 300ms for 2 consecutive minutes
```

---

**BAD — main thread computation:**
```js
// Blocks UI for 800ms
const result = heavyCompute(largeDataset)
setResult(result)
```

**GOOD — Web Worker:**
```js
const worker = new Worker('compute.js')
worker.postMessage(largeDataset)
worker.onmessage = (e) => setResult(e.data)
```

---

## Vocabulary and Mental Models

**Latency vs Throughput**: Latency = time to complete one request. Throughput = requests completed per unit time. They trade off: batching improves throughput at the cost of per-request latency. Know which one the business cares about.

**p50/p95/p99**: Percentile latencies. p95 = 95% of requests complete within this time. p99 is the user-experience metric. Mean latency can look great while p99 is on fire.

**Working Set**: The data actively accessed. If the working set fits in RAM/cache, performance is cache-speed. When it doesn't, you fall off a cliff. Monitor working set size vs available memory.

**Cache Stampede (Thundering Herd)**: When a popular cache key expires, all concurrent requests simultaneously hit the DB. Mitigate with probabilistic early expiration, mutex locks on cache miss, or background refresh before TTL expires.

**Hot Partition**: In distributed systems, one shard receives disproportionate traffic. Classic causes: time-series keys, sequential IDs, celebrity accounts. Fix: shard by hash, add write jitter, or shard more granularly.

**Connection Pool Exhaustion**: More concurrent requests than DB connections available. Requests queue up; pool wait time is the leading indicator. Fix: tune pool size, reduce query duration, or cache results upstream.

**Flame Graph**: Visual profiling output where bar width = CPU time. The widest bars are the bottlenecks. Read bottom-up: wide bars near the base are the real culprits, not the callers.

**Little's Law**: `L = λW`. Average queue length = arrival rate × average wait time. If wait time grows (slow DB, slow upstream), queue grows proportionally. The system feels fine until the queue fills and latency explodes.

**TTFB (Time to First Byte)**: Server response time from browser's perspective. High TTFB = slow server processing or network. CDN + caching at the edge fix this for cacheable content.

**Critical Render Path**: Steps to render first pixel: HTML parse → DOM → CSSOM → Render Tree → Layout → Paint. Anything render-blocking in this path delays First Contentful Paint (FCP). Eliminate render-blocking CSS/JS from above-the-fold critical path.

**Amdahl's Law**: Maximum speedup from parallelizing a fraction `p` of a program is `1 / (1 - p)`. If 90% of work is parallelizable, max possible speedup is 10×. Optimize the serial bottleneck before adding parallelism.
