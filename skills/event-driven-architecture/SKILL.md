---
name: event-driven-architecture
description: Design and implement event-driven systems using Kafka, event sourcing, sagas, and the outbox pattern with schema discipline
version: 1.0
---
# Event-Driven Architecture Expert Reference

## Non-Negotiable Standards

1. **Use the outbox pattern for every domain write that requires an event.** Never write to a database and publish to a broker in separate transactions. The dual-write problem causes silent data loss and phantom events.

2. **Every event schema follows the CloudEvents 1.0 envelope.** Fields `id`, `source`, `type`, `specversion`, `time`, and `datacontenttype` are always present. Application data lives in `data` only.

3. **Schema changes are additive or they go through a two-version transition period.** Adding an optional field is safe. Renaming, removing, or changing the type of any field is a breaking change and requires running both schema versions in parallel until all consumers are migrated.

4. **Topic naming follows `{domain}.{entity}.{event-type}`.** Examples: `orders.order.placed`, `payments.invoice.settled`, `inventory.product.reserved`. No abbreviations, no generic names like `events` or `messages`.

5. **Consumer groups are explicitly named and owned by one service.** A consumer group named `payment-service-order-placed-v1` is unambiguous. A group named `consumer1` is not. Group names encode the consumer identity and the topic contract version.

6. **Saga compensation logic is defined before the happy path is merged.** Every saga step that can fail must have a named, tested compensating transaction. Undocumented compensation is an incident waiting to happen.

---

## Decision Rules

**If** an event is consumed only within the same bounded context, **then** it is a domain event and stays internal — do not publish it to a shared broker topic.

**If** an event crosses bounded context boundaries, **then** it is an integration event and must be versioned, documented, and treated as a public API contract.

**If** you need to trigger a specific action in another service, **then** use a command (point-to-point, named recipient), not a domain event (broadcast, no recipient assumption).

**If** a query needs data from multiple aggregates, **then** use a projection or read model built from events — never query the write-side aggregate store from the read path.

**If** a saga has fewer than 4 steps and all services are owned by the same team, **then** prefer choreography (services react to each other's events). **If** the saga is long-running, crosses team boundaries, or requires complex compensation, **then** use orchestration with an explicit saga orchestrator.

**If** the partition key for a Kafka topic is not the entity ID, **then** document the reason explicitly. Ordering guarantees within a partition are critical for entities like orders or accounts — violating this silently breaks downstream projections.

**If** a topic is used for state (last value matters), **then** enable log compaction. **If** a topic is used for a time-bounded event stream, **then** set explicit retention: 7 days for operational topics, 1 year for audit/replay topics.

**If** a consumer is idempotent, **then** prefer at-least-once delivery (default Kafka semantics). **Never** use the Kafka transactional API (exactly-once) unless you have measured that duplicate delivery causes real business harm — it adds ~10-20% throughput overhead.

**If** a message has failed 3 retries with exponential backoff and still cannot be processed, **then** route it to the Dead Letter Topic (DLT) for that topic. **Never** silently drop failed messages.

**Never** share a consumer group ID across two different services. Group state is per-group; sharing IDs causes unpredictable offset commits and message loss.

---

## Mental Models

**The Event as Immutable Fact**
An event records something that already happened: `OrderPlaced`, not `PlaceOrder`. It cannot be updated, only succeeded by a new event (`OrderCancelled`). Treating events as immutable facts prevents the temptation to patch event history and makes replay deterministic. If you find yourself wanting to "edit" an event, you have a command masquerading as an event.

**The Outbox as Transaction Boundary**
The outbox table lives in the same database as the domain model. Writing the domain change and the outbox row is one ACID transaction. Publishing from the outbox to the broker is a separate, retryable process. This means the system can crash between write and publish without losing data — the unpublished outbox row survives the crash and gets picked up on recovery. The broker and database are never coordinated in a distributed transaction (no XA, no two-phase commit).

**Projections as Disposable Read Models**
In event sourcing, a projection is derived state rebuilt from the event log. Because the event log is the source of truth, any projection can be dropped and rebuilt. This means you can fix a bug in projection logic by replaying the full event stream into a corrected read model — no data migration required. Snapshotting after N events bounds the replay time so rebuilds don't take hours for high-volume aggregates.

**Choreography vs Orchestration Tradeoff**
Choreography distributes saga logic across services — each service reacts to an event and emits the next one. This is simple to start but hard to debug because the saga flow is implicit in the topology of subscriptions. Orchestration centralizes saga logic in one coordinator process — the flow is explicit, compensation is in one place, and the saga state is observable. The crossover point is roughly 4 steps: below that, the overhead of an orchestrator is not worth it.

---

## Vocabulary

| Term | Definition |
|---|---|
| Domain Event | A fact about something that happened within a bounded context; internal, not versioned as a public API |
| Integration Event | A domain event published across bounded context boundaries; versioned, treated as a public contract |
| Command | A message that requests an action be performed by a specific named recipient; not broadcast |
| Event Envelope | The outer structure of a CloudEvents message: `id`, `source`, `type`, `specversion`, `time`, `datacontenttype`, `data` |
| Outbox Pattern | Write domain change + event record to the same DB transaction; separate process publishes the record to the broker |
| Consumer Group | A named set of consumer instances that share offset tracking for a topic; each message is delivered to exactly one member |
| Partition Key | The value used to assign a Kafka message to a partition; determines ordering — same key = same partition = ordered delivery |
| Log Compaction | Kafka topic setting that retains only the latest message per key; used for state topics (changelogs, snapshots) |
| Choreography | Saga pattern where each service reacts to events from others; flow is implicit in subscription topology |
| Orchestration | Saga pattern where a central coordinator drives steps and manages compensation; flow is explicit |
| Dead Letter Topic | A dedicated Kafka topic for messages that failed all retry attempts; requires alerting and manual review process |
| Snapshot | A periodic checkpoint of an aggregate's state in event sourcing; bounds replay time to events since last snapshot |
| CQRS | Command Query Responsibility Segregation; write path (commands) and read path (queries) use separate models |
| Idempotent Consumer | A consumer that produces the same result regardless of how many times the same message is processed; prerequisite for at-least-once delivery |

---

## Common Mistakes and How to Avoid Them

### 1. Dual Write Without Outbox

**Bad:** Write to the database, then publish to Kafka in separate operations. If the service crashes between the two, the DB has the change but no event was published — or the event was published but the DB write rolled back.

```python
# BAD: dual write — data loss or phantom event on crash
def place_order(order: Order):
    db.save(order)                          # Step 1: DB write succeeds
    kafka.produce("orders.order.placed", order.to_event())  # Step 2: crashes here
    # Event never published — downstream never knows order was placed
```

**Fix:** Write the event to an outbox table in the same transaction. A relay process (CDC via Debezium or polling) publishes from the outbox to Kafka.

```python
# GOOD: outbox pattern — atomic write + event record
def place_order(order: Order, db_session):
    with db_session.begin():
        db_session.add(order)
        db_session.add(OutboxEvent(
            id=str(uuid4()),
            aggregate_type="Order",
            aggregate_id=str(order.id),
            event_type="orders.order.placed",
            payload=order.to_event_payload(),
            created_at=datetime.utcnow(),
            published=False
        ))
    # Debezium CDC reads the outbox table change and publishes to Kafka
    # If crash here, relay picks up unpublished row on recovery
```

### 2. Non-Additive Schema Change Without Transition Period

**Bad:** Remove or rename a field in an event schema and deploy producers first. All consumers that read the removed field start failing immediately.

```json
// BAD: v1 event published by producers
{ "order_id": "123", "customer_id": "456", "total_amount": 99.99 }

// BAD: v2 deployed without transition — "customer_id" renamed to "buyer_id"
{ "order_id": "123", "buyer_id": "456", "total_amount": 99.99 }
// All consumers reading "customer_id" silently get null or throw
```

**Fix:** Run both field names in parallel for one full release cycle. Deprecate, then remove.

```json
// GOOD: transition version — both fields present
{
  "order_id": "123",
  "customer_id": "456",
  "buyer_id": "456",
  "_schema_version": "1.1",
  "total_amount": 99.99
}
// Consumers migrate to buyer_id during this window
// v1.2 removes customer_id after all consumers updated
```

### 3. Missing Partition Key Strategy

**Bad:** Use a random UUID or no key (round-robin partition assignment). Events for the same order end up in different partitions, destroying ordering guarantees.

```python
# BAD: no partition key — events for order "123" can land in any partition
kafka.produce(
    topic="orders.order.status_changed",
    value=event_payload
    # key=None — Kafka distributes round-robin
)
```

**Fix:** Use the entity ID as the partition key so all events for one entity are co-located and ordered.

```python
# GOOD: entity ID as partition key — all order-123 events in same partition
kafka.produce(
    topic="orders.order.status_changed",
    key=str(order.id).encode("utf-8"),  # partition key = entity ID
    value=event_payload
)
```

### 4. Unnamed or Shared Consumer Groups

**Bad:** Use a generic or hardcoded group name. Two services accidentally share a group ID — each gets only half the messages.

```python
# BAD: generic name — easy to collide, impossible to trace in monitoring
consumer = KafkaConsumer(
    "orders.order.placed",
    group_id="consumer-group-1"
)
```

**Fix:** Name groups after the consuming service, the topic contract, and the schema version.

```python
# GOOD: unambiguous group identity
consumer = KafkaConsumer(
    "orders.order.placed",
    group_id="fulfillment-service.orders.order.placed.v2",
    auto_offset_reset="earliest",
    enable_auto_commit=False  # manual commit after processing
)
```

### 5. Saga Without Defined Compensation

**Bad:** Implement the happy path of a multi-step saga (reserve inventory → charge payment → confirm order) without defining what happens if payment fails after inventory was reserved.

```python
# BAD: no compensation — inventory stays reserved if payment fails
def saga_place_order(order_id):
    inventory_service.reserve(order_id)   # succeeds
    payment_service.charge(order_id)      # fails — exception raised
    order_service.confirm(order_id)       # never reached
    # inventory reservation is now orphaned — leaks resources
```

**Fix:** Define and test the compensating transaction before the happy path ships.

```python
# GOOD: orchestrated saga with explicit compensation
class PlaceOrderSaga:
    def execute(self, order_id):
        steps_completed = []
        try:
            inventory_service.reserve(order_id)
            steps_completed.append("inventory_reserved")

            payment_service.charge(order_id)
            steps_completed.append("payment_charged")

            order_service.confirm(order_id)
        except Exception as e:
            self._compensate(order_id, steps_completed)
            raise SagaFailedError(order_id, steps_completed, e)

    def _compensate(self, order_id, steps_completed):
        if "payment_charged" in steps_completed:
            payment_service.refund(order_id)
        if "inventory_reserved" in steps_completed:
            inventory_service.release(order_id)
```

---

## Good vs. Bad Output

### Event Schema Design

**Bad:** Flat, unstructured, no envelope, no versioning, PII embedded.
```json
{
  "event": "order_placed",
  "orderId": "abc123",
  "userEmail": "alice@example.com",
  "total": 49.99
}
```
Problems: no standard envelope, PII in event (email), no `id` for deduplication, no `time`, no `source`, no schema version, camelCase inconsistency.

**Good:** CloudEvents envelope, semantic versioning, no PII in payload.
```json
{
  "specversion": "1.0",
  "id": "evt_01HX2MFGQ3WKBNVZ4PCRJT8Y9",
  "source": "orders-service/v2",
  "type": "com.example.orders.order.placed",
  "time": "2026-04-14T10:23:45Z",
  "datacontenttype": "application/json",
  "dataschema": "https://schemas.example.com/orders/order-placed/v1.2.json",
  "data": {
    "order_id": "ord_7K3P9XN2",
    "customer_id": "cust_A8M1QZ",
    "line_items": [
      { "sku": "WIDGET-42", "quantity": 2, "unit_price_cents": 2499 }
    ],
    "total_amount_cents": 4998,
    "currency": "USD"
  }
}
```

### Kafka Consumer Implementation

**Bad:** Auto-commit enabled, no DLQ, generic group ID, silent message drop on error.
```python
consumer = KafkaConsumer("orders.order.placed", group_id="worker",
                          enable_auto_commit=True)
for msg in consumer:
    try:
        process(msg)
    except:
        pass  # silently drop failed messages
```

**Good:** Manual commit, exponential backoff retry, DLQ routing, explicit group ID.
```python
consumer = KafkaConsumer(
    "orders.order.placed",
    group_id="fulfillment-service.orders.order.placed.v1",
    enable_auto_commit=False,
    auto_offset_reset="earliest"
)
producer = KafkaProducer(bootstrap_servers=BROKERS)

for msg in consumer:
    for attempt in range(1, 4):
        try:
            process(msg.value)
            consumer.commit()
            break
        except RetryableError as e:
            time.sleep(2 ** attempt)
        except Exception as e:
            producer.send("orders.order.placed.DLT", value=msg.value,
                          headers=[("error", str(e).encode()),
                                   ("original_offset", str(msg.offset).encode())])
            consumer.commit()
            break
```

---

## Checklist

- [ ] Every event follows the CloudEvents 1.0 envelope (`id`, `source`, `type`, `specversion`, `time`, `datacontenttype`, `data`)
- [ ] Topic names follow the pattern `{domain}.{entity}.{event-type}` with no abbreviations
- [ ] Partition key is the entity ID for all topics where ordering matters
- [ ] Topic retention is explicitly set: 7 days for operational, 1 year for audit/replay, compaction enabled for state topics
- [ ] All domain writes that emit events use the outbox pattern — no direct dual writes to DB + broker
- [ ] Consumer group IDs encode service name, topic, and schema version
- [ ] `enable_auto_commit=False` on all consumers; commits happen after successful processing only
- [ ] Every topic has a corresponding Dead Letter Topic (DLT) and alerts on DLT message count > 0
- [ ] Schema changes are additive or have a documented two-version transition plan before any field removal
- [ ] Sagas have compensation logic defined, implemented, and tested for every step before the happy path ships
- [ ] Choreography is used only for sagas with <4 steps within a single team's ownership boundary
- [ ] Event sourcing aggregates have snapshotting configured to bound replay time to <30 seconds for any aggregate
