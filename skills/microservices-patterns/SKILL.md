---
name: microservices-patterns
description: Expert reference for microservices architecture, inter-service communication, data patterns, and operational concerns
version: 1.0.0
---

# Microservices Patterns — Expert Reference

## Non-Negotiable Standards

- Every service owns its data. No shared databases. No cross-service ORM joins. Period.
- Services communicate via contracts (OpenAPI, AsyncAPI, Protobuf). Never assume internal shape.
- Each service must be independently deployable without coordinating with other teams.
- Idempotency is mandatory on all mutating endpoints. Retries happen; design for them.
- Every service emits structured logs, metrics, and traces. Observability is not optional.
- Failure is the default assumption. All inter-service calls must have timeouts, retries, and circuit breakers.

---

## Decision Rules

**Service Boundaries**
- If two services always deploy together → they are one service. Merge them.
- If a change in service A requires a change in service B → your boundary is wrong. Fix the contract.
- If a team owns both services and they share a database → that is a monolith with HTTP overhead. Acknowledge it.
- If domain logic spans 3+ services in a single transaction → use Saga, not distributed transactions.
- Never create a service just to be "micro." Size to team cognitive load and deployment cadence.

**Communication**
- If the caller needs an immediate response and the operation is read-dominant → use synchronous REST/gRPC.
- If the operation can tolerate latency or must fan out to N consumers → use async messaging (Kafka, RabbitMQ, SNS/SQS).
- If you need request-response over async → use correlation IDs with reply queues, not synchronous polling.
- Never use synchronous HTTP for fire-and-forget operations. Use a message bus.
- Never call a downstream service inside a database transaction. You cannot roll back a remote call.

**Data Patterns**
- If data is needed by multiple services → each service maintains its own read model via events (CQRS).
- If you need cross-service queries → materialize a read model in a reporting store, not a join.
- If you need distributed consistency → use Saga (choreography for simple flows, orchestration for complex ones).
- Never expose another service's primary keys in your API contract. Use domain identifiers.
- Never let services share a cache layer. Cache invalidation across services is a distributed transaction in disguise.

**Resilience**
- If a downstream service is unreachable → fail fast with circuit breaker, return cached/default, or degrade gracefully.
- If a call fails → retry with exponential backoff and jitter. Never retry immediately.
- If retry budget is exhausted → emit a dead letter, alert, and surface partial state to the caller.
- Never block a thread waiting on a downstream call without a timeout.
- Never let one slow service take down your thread pool (bulkhead pattern).

---

## Common Mistakes and How to Avoid Them

**Mistake: Chatty services**
N+1 HTTP calls in a single user request. One call per item in a list.
Fix: Batch APIs (`GET /users?ids=1,2,3`), GraphQL DataLoader pattern, or BFF aggregation layer.

**Mistake: Synchronous saga**
Calling service A, then B, then C sequentially and rolling back on failure with compensating HTTP calls.
Fix: Use a message broker. Each step publishes an event. Compensating transactions are subscribers.

**Mistake: Tight versioning**
All services pin to `v1` of a shared library. One update blocks every team.
Fix: Tolerant reader pattern. Consumers ignore unknown fields. Schema evolution via additive changes only.

**Mistake: Distributed monolith**
Services are deployed separately but share a database schema or call each other in a mandatory chain.
Fix: Identify the real bounded context. Re-draw the service boundary or accept a monolith.

**Mistake: Missing idempotency keys**
A payment service processes a charge twice because the network timed out and the client retried.
Fix: Every POST/PUT that mutates state accepts an `Idempotency-Key` header. Store key + result for TTL.

**Mistake: Synchronous service discovery**
Hardcoded service URLs in config. Moving a service breaks callers.
Fix: Use DNS-based discovery (Kubernetes Services), a service mesh (Istio, Linkerd), or a sidecar proxy.

---

## Good vs Bad Output

**Bad: Shared database**
```
OrderService.getTotal() {
  SELECT SUM(price) FROM inventory.products p JOIN orders.items i ON p.id = i.product_id
}
```

**Good: Service-owned data with event-driven sync**
```
// ProductService publishes ProductPriceUpdated event
// OrderService subscribes and maintains its own price snapshot table
OrderService.getTotal() {
  SELECT SUM(snapshot_price) FROM order_items WHERE order_id = ?
}
```

---

**Bad: Synchronous chain**
```
POST /checkout → calls InventoryService → calls PaymentService → calls ShippingService
// One failure kills the whole transaction
```

**Good: Choreography saga**
```
POST /checkout → publishes OrderCreated
InventoryService subscribes → reserves stock → publishes StockReserved
PaymentService subscribes → charges card → publishes PaymentProcessed
ShippingService subscribes → creates shipment
// Each step compensates on its own failure event
```

---

**Bad: No circuit breaker**
```python
def get_user_profile(user_id):
    return requests.get(f"http://profile-service/users/{user_id}").json()
```

**Good: Resilient call**
```python
@circuit_breaker(failure_threshold=5, recovery_timeout=30)
@retry(max_attempts=3, backoff=exponential_jitter)
def get_user_profile(user_id: str) -> UserProfile | None:
    resp = requests.get(
        f"http://profile-service/users/{user_id}",
        timeout=2.0  # Always set. Always.
    )
    resp.raise_for_status()
    return UserProfile(**resp.json())
```

---

## Vocabulary and Mental Models

**Bounded Context** — The explicit boundary within which a domain model is consistent. Cross-context communication is via published language (events/contracts), not shared objects.

**Strangler Fig** — Incrementally replace a monolith by routing new traffic to microservices while the monolith handles legacy paths. Never do a big-bang rewrite.

**Anti-Corruption Layer (ACL)** — A translation layer between two bounded contexts so that an upstream model's shape doesn't pollute your domain model.

**Saga** — A sequence of local transactions coordinated by events or an orchestrator. Choreography = event-driven, no central coordinator. Orchestration = central saga orchestrator commands each step.

**CQRS** — Command Query Responsibility Segregation. Writes go to a command model. Reads come from a separately optimized query model, often updated via events.

**Event Sourcing** — State is a sequence of events, not a mutable row. Current state = fold(events). Enables audit log, time travel, and replay.

**Tolerant Reader** — A consumer that ignores unknown fields in messages. Essential for independent deployability and zero-downtime schema evolution.

**Sidecar** — A co-deployed container that handles cross-cutting concerns (mTLS, tracing, retries) so the application service doesn't have to.

**Bulkhead** — Isolate resource pools per consumer so one slow downstream doesn't exhaust all threads/connections.

**Dead Letter Queue (DLQ)** — Messages that failed all retries go here for inspection and reprocessing. Never silently drop failed messages.

**Idempotency Key** — A client-generated UUID sent with every mutating request. The server uses it to deduplicate retries.

**Two Generals Problem** — You cannot guarantee both sides of a network call agree on outcome. Design for this: acknowledge receipt separately from processing completion.
