---
name: observability-patterns
description: Instrument, collect, and act on metrics, logs, traces, and profiles using OpenTelemetry and SLO-driven alerting.
version: 1.0
---
# Observability Patterns Expert Reference

## Non-Negotiable Standards

1. **OpenTelemetry is the instrumentation standard.** Use the OTel SDK to instrument code and the OTel Collector as the pipeline. Never instrument directly against a vendor SDK (Datadog agent, Jaeger client). Instrument once, route to any backend via Collector exporters. Auto-instrumentation covers framework calls; add manual spans only for critical business paths.

2. **Structured JSON logs in production, always.** Every log line must carry: `timestamp` (ISO8601), `level`, `service`, `trace_id`, `span_id`, `message`. No printf-style strings in production. Human-readable formatting is acceptable only in local dev (`LOG_FORMAT=text`). Never log PII (emails, tokens, card numbers) — redact at the logger layer, not at the caller.

3. **Cardinality discipline on metrics labels.** Never use `user_id`, `request_id`, `session_id`, `IP address`, or any unbounded value as a Prometheus label. Each unique label combination creates a new time series. A single high-cardinality label on a busy service can generate millions of series and OOM Prometheus within hours. Acceptable labels: `method`, `status_code`, `route` (parametrized, e.g., `/users/:id`), `region`, `env`.

4. **Histogram bucket configuration must match the workload SLO.** Default Prometheus histogram buckets are wrong for most services. For an API with a 200ms SLO, use: `[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]` (seconds). Buckets must straddle the SLO threshold — if your SLO is 500ms, there must be bucket boundaries at or near 0.5s. Missing a boundary means you cannot accurately compute percentiles near the SLO.

5. **W3C TraceContext (`traceparent`) is the mandatory propagation header.** Never use Zipkin B3 or custom `X-Request-ID` headers as the primary trace carrier for new services. `traceparent` format: `00-{trace-id-32hex}-{parent-id-16hex}-{flags-2hex}`. Correlate logs to traces by injecting `trace_id` and `span_id` into every log record from the active span context.

6. **Error budgets drive alert routing, not raw error rates.** Define SLIs, set SLOs, derive error budgets. Alert on burn rate, not on threshold breaches. Fast-burn alert: >2% of monthly error budget consumed in 1 hour → page immediately. Slow-burn alert: >5% of monthly budget consumed in 6 hours → ticket/notification. A 99.9% SLO = 43.8 minutes of allowed downtime per month (8.76 hours/year). A 99.99% SLO = 4.38 minutes/month.

---

## Decision Rules

1. **If a service handles >1,000 req/s, use head-based sampling at 1–5%.** Head-based sampling decisions are made at the first span and propagated downstream — cheap and consistent. Tail-based sampling (collect everything, drop non-interesting traces after completion) is required only when you need to guarantee capture of all errors and slow traces; deploy it via the OTel Collector `tail_sampling` processor, not in the application.

2. **If you are adding a new metric, apply USE or RED before naming it.** For infrastructure resources (CPU, disk, queue depth): USE — Utilization (`node_cpu_utilization`), Saturation (`node_disk_io_wait_seconds`), Errors (`node_disk_errors_total`). For services: RED — Rate (`http_requests_total`), Errors (`http_request_errors_total`), Duration (`http_request_duration_seconds`). If the metric does not map to one of these, justify it explicitly.

3. **If the team asks "why is it slow?", reach for traces first, then profiles.** Traces show which service and span is slow. Profiles (continuous CPU/memory via Pyroscope, Parca, or vendor equivalent) show which function inside that span is expensive. Never jump to profiling without traces — you will optimize the wrong service.

4. **If log volume exceeds 50GB/day, implement log sampling at the Collector level.** Use the OTel Collector `probabilistic_sampler` processor for DEBUG/INFO logs at 10–20% sampling. Always retain 100% of ERROR and WARN logs. Never sample at the application — decisions must be consistent per trace ID, which the Collector can enforce using `trace_id_ratio_based` sampling.

5. **If a span name contains a full URL or user identifier, it is wrong.** Span names must be low-cardinality: `GET /users/:id` not `GET /users/8842`. Set `http.route` attribute to the parametrized route. Set `http.url` or `http.target` as a span attribute (not the name) for full URLs when debugging requires it.

6. **Never use log level ERROR for non-actionable events.** ERROR means "a human or automated system must act now." If an upstream call fails and the service retried successfully, log WARN. If a request is rate-limited by design, log INFO. Noisy ERROR logs erode alert fatigue tolerance within weeks.

7. **If deploying the OTel Collector, run it as a sidecar or DaemonSet — never as a single centralized instance for an entire cluster without a gateway tier.** Single Collector instances are a single point of failure. Pattern: app → sidecar Collector (OTLP) → gateway Collector cluster (load-balanced) → backend. The gateway tier handles batching, retry, and fan-out to multiple backends.

8. **If adding a counter metric, use `_total` suffix and a monotonically increasing counter — never a gauge that resets.** Use `rate()` and `increase()` in PromQL against counters. Gauges are for values that go up and down (queue depth, memory usage). Mixing types causes incorrect rate calculations and misleading dashboards.

9. **Never hardcode metric names, log field names, or span attribute keys in application code.** Define constants in a shared `telemetry` package or module. This enforces consistency across services and makes refactoring auditable through grep/search.

10. **If an SLO burn rate page fires, check the error budget remaining before escalating.** If >50% of the monthly budget remains, the fast-burn might be a brief spike — correlate with deployment events. If <20% remains mid-month, treat as P1 regardless of current burn rate.

---

## Mental Models

**The Four Pillars as Debugging Layers**
Think of observability as four concentric debugging rings. Metrics are the outermost ring: they tell you something is wrong (latency up, error rate up) but not why or where. Traces are the middle ring: they tell you which service and operation is the problem. Logs are the inner ring: they give event-level context for what happened inside a single operation. Profiles are the innermost ring: they tell you which line of code inside an operation is consuming resources. Work inward. Starting with logs when you have no idea which service is affected wastes hours.

**Cardinality Budget**
Every Prometheus instance has a practical series limit (typically 1–10 million time series before memory and query performance degrade). Treat your label space as a fixed budget. A metric with 3 labels each having 10 values costs 10^3 = 1,000 series. One label with unbounded values (user_id) can consume the entire budget from a single metric. The budget is shared across all metrics, all services, all teams. A single team's cardinality explosion degrades dashboards for everyone.

**Error Budget as a Negotiation Tool**
SLOs reframe reliability conversations from "the service was down" to "we have X minutes of allowed downtime left this month." When a team wants to deploy a risky change, the question is not "is it safe?" but "do we have enough error budget to absorb the risk?" If the budget is healthy (>50% remaining with 15 days left in the month), accept the risk. If the budget is depleted, freeze non-critical deployments until it recovers. This turns reliability into a resource, not a judgment.

**Tail Latency as a Signal of Systemic Issues**
p50 latency measures the median user experience. p99 measures the worst 1 in 100 requests. p999 measures the worst 1 in 1,000. When p99 diverges sharply from p50, it signals resource contention (GC pauses, lock contention, noisy neighbors) rather than a uniform slowdown. Alert on p99 against SLO thresholds, not on p50. Always configure histogram buckets to resolve the SLO percentile accurately.

---

## Vocabulary

| Term | Definition |
|---|---|
| **SLI** (Service Level Indicator) | The specific metric used to measure service behavior, e.g., "proportion of requests completed in <200ms." |
| **SLO** (Service Level Objective) | The target value for an SLI, e.g., "99.5% of requests must complete in <200ms over a 30-day window." |
| **Error Budget** | `1 - SLO`, expressed as allowed failure volume. A 99.9% SLO has a 0.1% error budget = 43.8 min/month downtime allowed. |
| **Burn Rate** | The rate at which error budget is consumed relative to the budget's depletion rate at SLO boundary. A burn rate of 1 = consuming budget exactly at the SLO rate. Burn rate >14.4 means 100% of monthly budget gone in 2 hours. |
| **Cardinality** | The number of unique time series a metric generates, determined by the unique combinations of all label values. |
| **HEAD-based Sampling** | Trace sampling decision made at the first span (trace root). Cheap, consistent across services, cannot target specific trace characteristics. |
| **TAIL-based Sampling** | Trace sampling decision made after the trace completes. Can retain all errors/slow traces. Requires buffering complete traces — expensive, implemented in Collector. |
| **OTLP** | OpenTelemetry Protocol. The wire format for transmitting telemetry data (gRPC or HTTP/protobuf) between SDK, Collector, and backend. |
| **OTel Collector** | Vendor-agnostic telemetry pipeline agent. Receives signals via OTLP, processes (batch, filter, transform), exports to one or more backends. |
| **Exemplar** | A specific trace ID linked to a metric data point. Allows jumping from a histogram bucket spike directly to the trace that caused it. Supported in Prometheus + Grafana. |
| **span** | A single named, timed operation within a trace representing one unit of work (e.g., a DB query, an HTTP call). Carries attributes and events. |
| **traceparent** | The W3C TraceContext propagation header. Format: `00-{traceId}-{parentSpanId}-{traceFlags}`. The standard cross-service trace propagation mechanism. |

---

## Common Mistakes and How to Avoid Them

**Mistake 1: Using `request_id` or `user_id` as a Prometheus label**

Bad:
```yaml
# metric definition
http_requests_total{method="GET", user_id="u_8842", route="/api/orders"}
```
This creates a new time series per user. At 100K users, one metric = 100K series. Prometheus OOMs.

Fix:
```yaml
http_requests_total{method="GET", status="200", route="/api/orders"}
```
Put `user_id` and `request_id` in log fields and trace attributes, never in metric labels.

---

**Mistake 2: Log levels used inconsistently — ERROR for everything unusual**

Bad:
```python
logger.error("User not found: %s", user_id)      # 404 is not an error
logger.error("Rate limit hit for user %s", uid)  # expected behavior
logger.error("Retrying DB connection, attempt 2") # recoverable
```

Fix:
```python
logger.info("user_not_found", extra={"user_id": user_id, "trace_id": tid})
logger.warn("rate_limit_hit", extra={"user_id": uid, "limit": 100})
logger.warn("db_retry", extra={"attempt": 2, "max": 3})
logger.error("db_connection_failed", extra={"attempts": 3, "error": str(e)})
# ERROR only when action is required and retry has failed
```

---

**Mistake 3: Histogram buckets misaligned with SLO threshold**

Bad:
```go
// Default Prometheus buckets: .005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10
// SLO is p99 < 300ms — no bucket at 0.3s, so quantile estimate is inaccurate
httpDuration := prometheus.NewHistogram(prometheus.HistogramOpts{
    Name: "http_request_duration_seconds",
    // no Buckets specified — uses defaults
})
```

Fix:
```go
httpDuration := prometheus.NewHistogram(prometheus.HistogramOpts{
    Name:    "http_request_duration_seconds",
    Buckets: []float64{0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.3, 0.5, 1, 2.5, 5},
    //                                                    ^^ bucket at SLO boundary
})
```

---

**Mistake 4: Span names containing full dynamic URLs**

Bad:
```python
with tracer.start_as_current_span(f"GET /users/{user_id}/orders/{order_id}"):
    ...
# Creates thousands of unique span names in the trace backend index — kills search performance
```

Fix:
```python
with tracer.start_as_current_span("GET /users/:id/orders/:orderId") as span:
    span.set_attribute("user.id", user_id)
    span.set_attribute("order.id", order_id)
```

---

**Mistake 5: Relying solely on PaaS or vendor-provided metrics without application-level instrumentation**

Bad: Monitoring only AWS CloudWatch ALB metrics (4XX rate, latency). This shows you the symptom at the load balancer but gives no visibility into which downstream service, database query, or code path is responsible.

Fix: Instrument application code with OTel SDK. Export to OTel Collector. Send to a metrics backend (Prometheus/Thanos) and trace backend (Tempo/Jaeger/Zipkin). CloudWatch/ALB metrics become a secondary validation layer, not the primary observability source.

---

## Good vs. Bad Output

**Bad: Unstructured log with no trace correlation**
```
[2024-03-15 14:23:11] ERROR failed to process order 8842 for user john@example.com retry=2
```
Problems: Not JSON, PII in log (email), no trace_id, no span_id, no service name. Cannot correlate to a trace. Cannot be parsed by log aggregators. PII creates compliance risk.

**Good: Structured log with trace correlation**
```json
{
  "timestamp": "2024-03-15T14:23:11.432Z",
  "level": "error",
  "service": "order-service",
  "version": "2.4.1",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "message": "order_processing_failed",
  "order_id": "ord_8842",
  "retry_attempt": 2,
  "error": "upstream_timeout",
  "upstream": "inventory-service"
}
```

---

**Bad: Alerting on raw error rate threshold**
```yaml
# Prometheus alert
- alert: HighErrorRate
  expr: rate(http_request_errors_total[5m]) > 10
  for: 2m
```
Problems: Absolute rate (10/s) is meaningless without traffic context. During low traffic at 3am, 11 errors/s is catastrophic. During peak at noon, it might be 0.01% of traffic.

**Good: SLO burn rate alert**
```yaml
# Fast burn: 2% of monthly budget consumed in 1h window
- alert: SLOFastBurn
  expr: |
    (
      sum(rate(http_request_errors_total[1h])) /
      sum(rate(http_requests_total[1h]))
    ) > (14.4 * 0.001)
  # 14.4x burn rate on a 99.9% SLO = 100% budget gone in 2h
  for: 2m
  labels:
    severity: page
  annotations:
    summary: "Fast error budget burn on {{ $labels.service }}"

# Slow burn: 5% of monthly budget consumed in 6h window
- alert: SLOSlowBurn
  expr: |
    (
      sum(rate(http_request_errors_total[6h])) /
      sum(rate(http_requests_total[6h]))
    ) > (6 * 0.001)
  for: 15m
  labels:
    severity: ticket
```

---

**Bad: OTel Collector config with no batching or retry**
```yaml
exporters:
  otlp:
    endpoint: "tempo:4317"
service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [otlp]
```

**Good: OTel Collector config with batching, retry, and tail sampling**
```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 5s
    send_batch_size: 1024
    send_batch_max_size: 2048
  memory_limiter:
    limit_mib: 512
    spike_limit_mib: 128
    check_interval: 5s
  tail_sampling:
    decision_wait: 10s
    policies:
      - name: errors-policy
        type: status_code
        status_code: { status_codes: [ERROR] }
      - name: slow-traces-policy
        type: latency
        latency: { threshold_ms: 500 }
      - name: probabilistic-policy
        type: probabilistic
        probabilistic: { sampling_percentage: 5 }

exporters:
  otlp:
    endpoint: "tempo-gateway:4317"
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, tail_sampling, batch]
      exporters: [otlp]
```

---

## Checklist

- [ ] All services emit metrics, logs, and traces via OTel SDK — no vendor-specific SDK instrumentation
- [ ] OTel Collector deployed as sidecar or DaemonSet with a gateway tier; not a single shared instance
- [ ] Every log line in production is JSON with `timestamp`, `level`, `service`, `trace_id`, `span_id`, `message`
- [ ] No PII in logs — redaction tested explicitly in CI with a log scanner (e.g., `detect-secrets`, custom regex)
- [ ] Log levels follow the contract: ERROR = page-worthy, WARN = degraded, INFO = lifecycle, DEBUG disabled in prod
- [ ] All metric labels reviewed for cardinality; no unbounded-value labels (`user_id`, `request_id`, `url`)
- [ ] Histogram buckets defined explicitly per service SLO, with a bucket boundary at or near the SLO threshold
- [ ] Span names are low-cardinality (parametrized routes); dynamic values are span attributes only
- [ ] W3C `traceparent` header used for trace propagation; correlation between logs and traces verified end-to-end
- [ ] SLIs defined, SLOs set, error budgets calculated; burn rate alerts configured (fast-burn 1h, slow-burn 6h)
- [ ] Sampling strategy documented: head-based percentage for normal volume, tail-based policy for errors/slow traces
- [ ] Runbooks linked from alert annotations; every page-worthy alert has a documented first-response procedure
