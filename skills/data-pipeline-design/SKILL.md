---
name: data-pipeline-design
description: Data pipeline architecture and design patterns for production-grade ETL/ELT, streaming, and orchestration systems.
version: 1.0
---

# Data Pipeline Design Expert Reference

## Non-Negotiable Standards

1. Every pipeline step must be idempotent. Re-running any step with the same input must produce identical output without side effects. Non-idempotent pipelines make debugging, backfills, and recovery impossible.
2. Row counts must be emitted at every stage boundary. A pipeline that moves data without counting it has no observability. Counts at source, after extraction, after transformation, and at load are the minimum.
3. Data quality checks (nulls, cardinality, referential integrity) run before downstream consumers can access new data. Consumers must never read unvalidated data.
4. Every event-producing system must publish to a schema registry. Consumers validate against the registered schema on read. Unregistered schemas are not acceptable in production.
5. Dead letter queues are mandatory for all streaming pipelines. Records that fail processing must be routed to a DLQ with the failure reason attached — not silently dropped.
6. Breaking schema changes require a versioned migration path. A new column is non-breaking. Renaming or deleting a column is breaking and requires a deprecation window of at minimum one full pipeline cycle.

## Decision Rules

- If end-to-end latency requirement is under 1 minute, use streaming (Kafka + Flink, or Kafka + Spark Streaming). Batch cannot meet sub-minute SLAs regardless of cluster size.
- If latency requirement is over 5 minutes and data volume is under 100GB/day, batch is almost always cheaper and simpler — do not introduce streaming complexity without a latency justification.
- If the data warehouse has sufficient compute (Snowflake, BigQuery, Redshift), prefer ELT over ETL. Load raw data first, transform inside the warehouse using dbt. Transforming before load discards reprocessing flexibility.
- If a dbt model runs longer than 10 minutes in production, it requires incremental materialization with a date or timestamp partition key — full table rebuilds at scale are unsustainable.
- If the source system schema changes more than once per quarter, put a schema registry (Confluent Schema Registry or AWS Glue Schema Registry) in front of it immediately — do not wait for a breaking change incident.
- If a pipeline has no data freshness SLA defined and monitored, it has no reliability contract. Define freshness SLAs (e.g., "orders table updated within 15 minutes of transaction") before putting any consumer in production.
- If a dimension table changes over time and historical accuracy matters, use Type 2 SCD (effective_date, expiry_date, is_current flag). Type 1 (overwrite) destroys historical accuracy. Type 3 (previous column) is only appropriate when exactly one historical version is ever needed.
- Never partition a table by a high-cardinality key (user_id, UUID) — partition explosion breaks query performance. Partition time-series data by date or hour. Partition lookup/reference data by a natural categorical key.
- If orchestration involves more than 10 interdependent DAGs or pipelines, use Dagster over Airflow. Dagster's asset-based model and software-defined assets make lineage and dependency management tractable at scale. Airflow's DAG-centric model becomes a maintenance burden above that threshold.
- If anomaly detection on a key metric triggers, halt downstream pipeline execution and alert — do not propagate anomalous data to consumers. A bad row is infinitely cheaper than bad data in a dashboard used by executives.

## Mental Models

**The Idempotency Contract**
Every pipeline step is a pure function: same input always produces same output, with no observable side effects on re-execution. This means: writes are upserts or truncate-insert, never append-only appends. File ingestions use content hashing or watermark tracking to prevent double-processing. Achieving idempotency is not optional — it is the mechanism by which backfills, retries, and recovery are possible without engineering heroics.

**The Data Contract**
A data contract is an explicit agreement between a producer and consumer: the schema, semantics, SLA, and ownership of a dataset. Contracts are versioned. Changes to a contract follow a deprecation lifecycle. Without contracts, pipelines are tightly coupled to undocumented assumptions that break silently when the producer changes. Schema registries enforce the syntax of a contract. Ownership metadata and SLA documentation enforce the semantics.

**Push Down or Pull Up**
Every transformation has a home: the source system, the pipeline, or the warehouse. ELT's principle is to push transformation down into the warehouse where compute is elastic and transformations are replayable. Extract raw, load raw, transform in SQL. Only push transformation into the pipeline layer when the warehouse cannot perform it (e.g., NLP, ML feature extraction, binary decoding) — and even then, emit both the raw and transformed values.

**The Dead Letter Queue as a Reliability Buffer**
A pipeline without a DLQ has two failure modes: it crashes on bad data, or it silently drops bad data. Both are wrong. A DLQ decouples the failure-handling concern from the processing concern. It makes failure visible, measurable, and recoverable. Every streaming pipeline produces a DLQ topic/queue. DLQ depth is a monitored metric. DLQ records are reviewed on a schedule and replayed after fixes.

## Vocabulary

| Term | Precise Meaning |
|------|-----------------|
| Idempotency | Property of a pipeline step where re-execution with identical input produces identical output without additional side effects. Required for safe retries and backfills. |
| ELT | Extract, Load, Transform — raw data loaded to warehouse first, transformed in-place using tools like dbt. Preferred over ETL when warehouse compute is elastic. |
| ETL | Extract, Transform, Load — data transformed before loading. Appropriate when the warehouse cannot perform the transformation or data must be masked before landing. |
| Data Contract | Explicit schema, semantic, SLA, and ownership agreement between a data producer and consumer. Versioned and enforced via schema registry or documentation. |
| Schema Registry | Central catalog of event schemas (Avro, Protobuf, JSON Schema) with version history. Consumers validate messages against registered schema on read. |
| Dead Letter Queue (DLQ) | Queue/topic where records that fail processing are routed with attached failure metadata. Enables visibility and replay without data loss. |
| Type 2 SCD | Slowly Changing Dimension type 2 — history preserved by adding rows with effective_date, expiry_date, and is_current. Required when historical accuracy matters. |
| Watermark | A high-water mark tracking the latest successfully processed record (e.g., max event_timestamp). Used to implement incremental extraction and prevent reprocessing. |
| Data Freshness SLA | The maximum acceptable age of data in a table or dataset at any given time. Must be defined, measured, and alerted on. |
| Partitioning | Physically dividing table storage by a key (date, category) to reduce query scan cost and enable partition pruning. Never partition on high-cardinality keys. |
| DAG (Directed Acyclic Graph) | The dependency graph of pipeline tasks where edges represent execution dependencies. The core abstraction in Airflow, Prefect, and Dagster. |
| Backfill | Reprocessing historical data for a date range, typically to apply a new transformation or recover from data loss. Requires idempotent pipeline steps to be safe. |

## Common Mistakes and How to Avoid Them

**Mistake 1: Non-idempotent pipeline steps using append-only inserts**
- Bad: `INSERT INTO orders_cleaned SELECT * FROM orders_raw WHERE date = '{{ ds }}'` — re-running this DAG duplicates all rows.
- Why: Any retry, backfill, or manual re-run silently multiplies data. Downstream aggregates produce wrong numbers. This is the most common root cause of data correctness incidents.
- Fix: Use `MERGE`/upsert semantics on a natural key, or `DELETE WHERE date = '{{ ds }}' THEN INSERT`. In dbt, use `unique_key` with `incremental` materialization.

**Mistake 2: No data quality checks before downstream access**
- Bad: Pipeline loads transformed data to `orders_fact`. BI dashboards query `orders_fact` immediately. Nobody validates that 15% of rows have NULL `customer_id` due to a join bug.
- Why: Broken data propagates to dashboards, reports, and downstream ML models before anyone knows it is wrong.
- Fix: Run a dbt test suite (not_null, unique, relationships, accepted_values) as a pipeline step. Gate downstream table publication on test pass. Use Great Expectations or dbt tests.

**Mistake 3: Streaming pipeline with no dead letter queue**
- Bad: Kafka consumer processes events inline. Malformed event causes consumer to crash. Service restarts. Crashes again. Alert fires. Engineer manually deletes bad message.
- Why: One bad record blocks an entire partition. Silent drops corrupt downstream counts. Manual remediation is slow and error-prone.
- Fix: Wrap consumer processing in try/except. On failure, produce to a `<topic>-dlq` topic with the original payload plus error message and stack trace. Monitor DLQ depth as a production metric.

**Mistake 4: Airflow for complex asset-based dependency management**
- Bad: 40 Airflow DAGs with cross-DAG dependencies managed via `ExternalTaskSensor`. Lineage is undocumented. Adding a new consumer means editing 3 DAGs. On failure, tracing impact requires reading DAG code.
- Why: Airflow is task-centric. Cross-DAG dependencies via sensors are fragile and opaque. Asset lineage is not a first-class concept.
- Fix: Migrate to Dagster using Software-Defined Assets (SDAs). Assets declare their upstream dependencies explicitly. Lineage is automatically computed and visualized. Partial materialization and impact analysis are built in.

**Mistake 5: No schema registry, schema changes discovered in production**
- Bad: Mobile app team renames `user_id` to `userId` in event payload. Kafka consumer parsing `user_id` starts producing NULLs. 6 hours of data is corrupted before anyone notices.
- Why: Without schema enforcement, consumers have no protection against upstream schema drift. The contract is implicit and undocumented.
- Fix: Register all event schemas in Confluent Schema Registry. Enforce schema validation in producer before publish. Configure registry with `BACKWARD` or `FULL` compatibility mode to reject breaking changes automatically.

## Good vs. Bad Output

**Pipeline Architecture: No Observability vs. Instrumented**

Bad:
```python
def run_pipeline():
    raw = extract_from_postgres()
    transformed = transform(raw)
    load_to_warehouse(transformed)
    # No counts, no validation, no alerts
```

Good:
```python
def run_pipeline(execution_date):
    raw = extract_from_postgres(watermark=get_watermark(execution_date))
    log_metric("rows_extracted", len(raw))

    validated = run_quality_checks(raw)  # raises if null rate > 5%
    log_metric("rows_validated", len(validated))

    transformed = transform(validated)
    log_metric("rows_transformed", len(transformed))

    load_to_warehouse(transformed, mode="upsert", key="order_id")
    log_metric("rows_loaded", len(transformed))

    update_watermark(execution_date)
    assert_freshness_sla(table="orders_fact", max_age_minutes=15)
```

**dbt Model: Full Refresh vs. Incremental with Quality Gates**

Bad:
```sql
-- orders_fact.sql — full rebuild every run, no tests
SELECT order_id, customer_id, amount, created_at
FROM raw.orders
```

Good:
```sql
-- orders_fact.sql
{{ config(
    materialized='incremental',
    unique_key='order_id',
    incremental_strategy='merge',
    on_schema_change='fail'
) }}

SELECT order_id, customer_id, amount, created_at
FROM {{ source('raw', 'orders') }}
{% if is_incremental() %}
WHERE created_at > (SELECT MAX(created_at) FROM {{ this }})
{% endif %}
```
```yaml
# schema.yml — quality gates
models:
  - name: orders_fact
    columns:
      - name: order_id
        tests: [unique, not_null]
      - name: customer_id
        tests: [not_null, relationships: {to: ref('customers'), field: id}]
      - name: amount
        tests: [{dbt_utils.accepted_range: {min_value: 0}}]
```

**Schema Change: Breaking vs. Non-Breaking**

Bad (breaking, shipped without warning):
```json
// v1: {"user_id": 123, "event": "click"}
// v2: {"userId": 123, "eventType": "click"}  ← renamed fields, consumers silently produce NULLs
```

Good (backward-compatible evolution):
```json
// v1: {"user_id": 123, "event": "click"}
// v2: {"user_id": 123, "userId": 123, "event": "click", "eventType": "click"}
// Both old and new field names present during deprecation window (2 release cycles)
// v3: {"userId": 123, "eventType": "click"}  ← only after all consumers migrated
```

## Checklist

- [ ] Every pipeline step is idempotent — re-running with same input produces same output without duplication
- [ ] Row counts emitted as metrics at every stage boundary (extract, validate, transform, load)
- [ ] Data quality checks (nulls, uniqueness, referential integrity) run before downstream consumers can read new data
- [ ] All event schemas registered in a schema registry with compatibility enforcement (BACKWARD or FULL)
- [ ] Dead letter queue configured for all streaming pipelines with DLQ depth monitored
- [ ] Batch vs. streaming decision documented and justified by latency requirement, not preference
- [ ] ELT chosen over ETL for warehouse-computable transformations; dbt used for SQL transformations
- [ ] Incremental materialization with unique_key used for any dbt model on tables >10GB
- [ ] Data freshness SLAs defined, monitored, and alerted for all production datasets
- [ ] SCD Type 2 used for any dimension that requires historical accuracy
- [ ] Partitioning strategy uses date/time or natural categorical keys — never high-cardinality keys like UUID
- [ ] Orchestration tool choice documented with justification — Dagster for asset-centric, Airflow for task-centric at small scale
