---
name: solution-architecture
description: Expert reference for solution architecture — specific trade-off rules, technology selection criteria, and non-obvious production failure modes
version: 2.0.0
---

# Solution Architecture

## Non-Negotiable Standards

- Every architectural decision has a documented rationale (ADR). "We chose X" without "because Y, and we considered Z" is not a decision.
- Quantify non-functional requirements before choosing an approach. "Fast" is not a requirement. "p99 < 150ms at 5k RPS with a 50ms DB budget" is.
- Failure modes are first-class design inputs. For each component, define: what happens when it is slow, when it is down, and when it returns corrupt data.
- Operational cost is not optional. Every service needs a runbook, defined SLIs, and alerts on SLO burn rate before it goes to production.
- Security threat model per service boundary: who can call this, what can they do, what is the blast radius of a compromised credential.
- Version every external API contract from day one. Unversioned APIs become impossible to change.

## Technology Selection Decision Rules

**Databases — pick based on the primary access pattern, not familiarity:**
- If primary access is by primary key or foreign key with known schema → PostgreSQL. Default choice.
- If data is write-heavy append-only (metrics, events, IoT) → TimescaleDB or ClickHouse, not Postgres. Postgres autovacuum collapses under sustained append-only write load.
- If the schema is genuinely sparse and variable across records (not just "we might add columns later") → document store (MongoDB, Firestore). "We might change the schema" is not a reason.
- If it's a leaderboard, session store, rate limit counter, or cache with TTL → Redis. Not Postgres with a `WHERE expires_at > NOW()` query.
- If relationships between entities are the primary query driver (recommendation graphs, org hierarchies) → graph DB (Neo4j). SQL JOINs on recursive self-referential data are a performance cliff.
- Never use a NoSQL store to avoid defining a schema. The schema still exists — it's just implicit in every read path and impossible to enforce.

**Async communication — pick based on consumer SLA and delivery guarantee requirements:**
- Consumers need replay / multiple independent consumers / ordered delivery at scale → Kafka. Accept: operational complexity, consumer offset management, schema registry.
- Fire-and-forget with at-least-once delivery, simple fan-out, no replay needed → SQS + SNS. Accept: no ordering guarantee (use FIFO queue if ordering required, at 3x cost and lower throughput).
- Delayed/scheduled work (send email in 30 min, retry after backoff) → database-backed job queue (Sidekiq, BullMQ, Celery). Not a general message broker. The DB is the queue.
- If the team asks for Kafka for a system processing < 500 messages/sec with a single consumer → it is the wrong tool. Recommend SQS or a job queue.

**Service communication:**
- Caller needs the result to continue → synchronous (HTTP/gRPC).
- Caller does not need the result → async. Not synchronous with a thread pool to hide it.
- Internal service-to-service at high frequency (> 10k RPS, binary protocol acceptable) → gRPC. Not REST.
- Public API, CRUD resources, external consumers → REST.
- Multiple clients with very different data shape needs (mobile vs web vs analytics) → GraphQL. Not REST with 40 query parameters.

**When to split a monolith into services:**
Split only when you have a concrete, present reason — not a future concern:
1. **Independent scaling**: one component needs 10x the resources of everything else.
2. **Independent deployment**: the component changes at a different cadence and rollbacks are coupled.
3. **Failure isolation**: the component's failure should not cascade to the rest.
4. **Team autonomy**: two teams cannot ship without coordinating deployments.
If none of these apply → modular monolith. A monolith with clear internal module boundaries is easier to split later than a poorly designed distributed system is to merge.

## Non-Obvious Failure Modes (things that don't show up in design review)

**Thundering herd on cache expiry**: All keys for a popular resource expire at the same time (e.g., set with the same TTL at startup). Every cache miss hits the DB simultaneously.
Fix: Jitter TTLs (`base_ttl + rand(0, 0.1 * base_ttl)`). Use probabilistic early recomputation (PER/XFetch algorithm) for hot keys.

**Fan-out explosion in event systems**: One event triggers N downstream handlers, each of which emits M events. At 3 levels deep with fan-out of 5, you have 125 events from 1 trigger.
Fix: Model event flows as a DAG before implementation. Any cycle is a bug. Any fan-out > 10 requires explicit approval.

**N+1 queries through a GraphQL resolver**: Each list item triggers a separate DB query. 100 items = 101 queries.
Fix: DataLoader (batching + caching) on every resolver that fetches by foreign key. No exceptions. Instrument with query count logging in dev.

**Distributed transaction phantom**: Two services must update atomically (debit account, credit account). You implement it as two HTTP calls. Network fails between them.
Fix: Saga pattern with compensating transactions, or outbox pattern (write event to DB in same transaction as state change, deliver asynchronously). Two-phase commit across services is almost never the right answer.

**Read-your-own-writes inconsistency**: User creates a resource, immediately GETs it, hits a read replica that hasn't replicated yet, gets a 404.
Fix: For writes the user immediately reads back — route to primary for the subsequent read within a session window, OR use sticky sessions to a replica, OR use synchronous replication for critical writes.

**Connection pool exhaustion under load**: Service has 10 DB connections pooled. Under load, 50 concurrent requests queue for connections. P99 latency spikes to seconds before failures begin.
Fix: Size connection pool to `(core_count * 2) + effective_spindle_count` (PgBouncer formula). Add a timeout on pool acquisition — fail fast rather than queue indefinitely. Monitor `pool_size`, `pool_checked_out`, `pool_overflow` as SLIs.

**Celery/worker silent task failure**: A task raises an exception. No one is notified. The queue drains. The work simply never happened.
Fix: Dead letter queue (DLQ) for all failed tasks. Alert on DLQ depth. Never configure `acks_late=False` without understanding task idempotency.

## Decision Rules

- If latency SLO is missed → profile the data access layer first (queries, indexes, N+1). Application code is rarely the bottleneck.
- If you're adding a cache → define the invalidation strategy before writing the first cached line. "We'll figure it out" means you'll serve stale data in production.
- If a third-party service is synchronously in the critical path → add a circuit breaker (half-open state, failure threshold, recovery timeout) and a degraded-mode response. What does the UI show when Stripe is down?
- If a service needs to process the same event exactly once → idempotency key on the write operation + at-least-once delivery. "Exactly once" delivery is a lie in distributed systems; idempotent consumers are the real solution.
- If you're designing a retry policy → use exponential backoff with jitter. Fixed-interval retries synchronize under load and make the upstream worse. Maximum retry cap required.
- If a schema migration is required → it must be backward compatible with the currently deployed code. Two-phase deploy: deploy code that handles both old and new schema → migrate → deploy code that drops old schema support.
- Never store secrets in environment variables in a shared environment. Use a secrets manager (Vault, AWS Secrets Manager, GCP Secret Manager). Env vars appear in process listings, crash dumps, and logs.
- Never build a polling loop with a fixed interval when you control both sides. Push (webhook/event) is always preferable to poll when you own the producer.

## Common Mistakes and Exact Fixes

**Mistake: Using a distributed architecture to solve a code organization problem**
Bad: "Our monolith is hard to work in, let's split it into microservices."
Good: "Our monolith is hard to work in — enforce module boundaries first (no cross-module direct imports, explicit internal APIs). Microservices are a deployment and scaling tool, not a code quality tool."

**Mistake: Synchronous chain of service calls**
Bad: `API → ServiceA → ServiceB → ServiceC → DB` — p99 latency = sum of all p99s; any failure cascades.
Good: Identify which downstream calls can be async. ServiceA returns immediately and publishes an event. ServiceB/C consume it independently. Latency of the synchronous path collapses to ServiceA + DB.

**Mistake: Schema migration without backward compatibility**
Bad: Rename column `user_name` → `full_name` in a single deploy.
Good:
1. Deploy: Add `full_name` column, write to both, read from `user_name`
2. Backfill: `UPDATE users SET full_name = user_name WHERE full_name IS NULL`
3. Deploy: Read from `full_name`, continue writing to both
4. Deploy: Stop writing to `user_name`, drop column

**Mistake: Hardcoding timeouts or retry counts**
Bad: `timeout=30, retries=3` embedded in service code.
Good: Timeouts and retry budgets are configuration, tuned per environment and caller. A batch job can wait 30s. An API serving a user cannot.

**Mistake: Treating the message queue as the system of record**
Bad: Kafka topic is the only place an order exists. Topic retention expires. Orders are lost.
Good: Database is the system of record. Queue is a delivery mechanism. Consumer can always rebuild state from the DB if the queue is unavailable.

## ADR Template (use this format, not prose)

```
Title: [Short imperative phrase]
Status: Proposed | Accepted | Deprecated | Superseded by ADR-XXX
Date: YYYY-MM-DD

Context:
[The specific technical constraint, load characteristic, team size, or business requirement
that created a decision point. Include numbers.]

Decision:
[Exactly what was decided.]

Alternatives considered:
- [Option A]: [why rejected — be specific]
- [Option B]: [why rejected — be specific]

Consequences:
- Positive: [concrete, specific]
- Negative / trade-offs accepted: [concrete, specific]
- Required follow-up: [what this decision obligates you to do next]
```

## Expert Vocabulary and Mental Models

**Blast radius**: The scope of data loss, corruption, or downtime if a component fails or is compromised. Minimize via isolation, least privilege, and circuit breakers.

**Saga pattern**: A sequence of local transactions where each step publishes an event to trigger the next. Failed steps trigger compensating transactions. The alternative to distributed 2PC.

**Outbox pattern**: Write an event to an `outbox` table in the same DB transaction as the state change. A separate process reads the outbox and publishes to the message broker. Guarantees at-least-once delivery without distributed transactions.

**SLI/SLO/SLA**: Indicator (what you measure), Objective (the target, internal), Agreement (contractual). Design alerts to fire on SLO burn rate, not on individual threshold breaches.

**Thundering herd**: The pattern where many clients simultaneously retry or request after a shared failure or expiry. Jitter is the standard countermeasure.

**Idempotency key**: A client-generated unique token sent with a write operation. The server stores the result keyed by it. Retries return the stored result rather than re-executing. Required for any operation that can be retried (payments, email sends, external API calls).

**Connection pool sizing**: Not "as many as possible." Database connections are expensive. Size to the formula, monitor pool exhaustion as a leading indicator before latency degrades.

**Two-phase schema migration**: Never migrate a schema in a single deploy if the change is breaking. The four-step expand/contract pattern is the standard.
