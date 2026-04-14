---
name: analytics-framework
description: Dense reference for building and operating analytics frameworks — metric design, data modeling, instrumentation, and analytical workflow standards.
version: 1.0.0
---

# Analytics Framework

## Mental Models

**The Measurement Hierarchy**: Business Question → KPI → Metric → Dimension → Event. Never define a metric before anchoring it to a business question.

**Grain Principle**: Every table has exactly one grain. The grain is the most atomic unit a row represents. Violating grain = aggregation errors.

**The Funnel Contract**: Conversion funnels must be strictly ordered. If steps can be skipped, model them explicitly as "skipped" — never silently drop them.

**Leading vs Lagging**: Lagging indicators (revenue, churn) confirm what happened. Leading indicators (activation, engagement depth) predict what will happen. Every dashboard needs both.

**Additive vs Non-Additive**: Counts and sums are additive across all dimensions. Ratios, percentages, averages, and distinct counts are non-additive. Summing a rate across regions is always wrong.

---

## Non-Negotiable Standards

1. **Every metric must have an owner, a definition doc, and a last-verified date.** Undocumented metrics become tribal knowledge debt.
2. **Metric definitions live in one place** (e.g., a metrics layer like dbt metrics, Looker LookML, or a semantic layer). Never define the same metric differently in two places.
3. **Date dimensions are always local time with UTC stored.** Display timezone must be explicit in every chart title.
4. **Null ≠ zero.** Never `COALESCE(metric, 0)` silently. Null means "no data" or "not applicable." Zero means the event occurred with zero value.
5. **Denominator guards are mandatory.** Any metric with a denominator must handle the zero-denominator case explicitly — `NULLIF(denominator, 0)`.
6. **Backfills must be documented.** Any retroactive data change requires a changelog entry with the affected date range and reason.
7. **Segment before you aggregate.** Aggregate-then-segment produces Simpson's Paradox. Always define whether the metric is computed at the segment level then rolled up, or computed globally.

---

## Decision Rules

**If** a metric needs to be compared over time → use a consistent calendar definition (fiscal vs Gregorian, week start day). Never mix.

**If** you have more than 3 KPIs on a single dashboard → you have no KPIs, you have a data dump. Force a hierarchy: 1 north star, 2–3 drivers, supporting metrics.

**If** two teams report different numbers for the same metric → the definition is wrong before the data is. Audit the definition first.

**If** a metric moves significantly → before alerting, check: (1) data pipeline lag, (2) instrumentation change, (3) definition change, (4) actual business change. In that order.

**If** you're computing retention → use a cohort-based model. Never compute retention as DAU/MAU — that is engagement density, not retention.

**If** a dimension has high cardinality (>1000 values) → do not use it as a filter in real-time dashboards. Pre-aggregate or materialize.

**Never** use "active user" without defining active. Default definition must include: time window (7d/28d/30d), action type (not just login), and deduplication unit (user_id, not session_id).

**Never** present a metric without its confidence interval or sample size when derived from a sample or experiment.

**Never** use last-touch attribution as the default. Attribute to the model that reflects the business question.

---

## Common Mistakes

**Mistake: Defining metrics in the BI tool**
→ Metrics defined in Tableau/Looker calculated fields diverge silently. Define in the semantic/metrics layer. BI tools consume, not define.

**Mistake: Mixing grain in a single table**
→ Joining session-level rows to user-level rows without explicit grain documentation causes fan-out. Always document grain at the table header.

**Mistake: Using DISTINCT COUNT in a derived table, then joining**
→ Distinct count does not compose. Compute it at the final grain, not in a CTE that gets joined downstream.

**Mistake: Reporting WoW change on sparse data**
→ If Sunday has 10 events and Monday has 8, that is not a 20% decline. Apply minimum-volume thresholds before computing change.

**Mistake: Ignoring timezone in event data**
→ "Events on 2024-03-10" means different things in UTC vs US/Pacific. Always store UTC, always convert at query time with explicit tz.

---

## Good vs Bad Output

**Bad metric definition:**
> "Active users: users who logged in this month"

**Good metric definition:**
> "Monthly Active Users (MAU): count of distinct `user_id` values where at least one `core_action_event` (purchase, search, share) occurred within the rolling 28-day window ending on the report date. Excludes internal users (`is_internal = false`). Owner: Growth Analytics. Last verified: 2025-11-01."

---

**Bad dashboard structure:**
> 14 metrics on one page, no hierarchy, all equal weight.

**Good dashboard structure:**
> North Star (1): Weekly Revenue. Drivers (3): New Users, Avg Order Value, Repeat Purchase Rate. Supporting (6): by segment, channel, cohort. Each driver links to a drill-down.

---

## Vocabulary

| Term | Meaning |
|------|---------|
| Grain | The atomic unit a single row represents |
| Spine | The base table/CTE that defines the population and time range for an analysis |
| Cohort | A group defined by a shared event at a point in time |
| Materialization | Persisting a computed result for query performance |
| Fan-out | Row multiplication from an incorrect join (symptom: inflated aggregates) |
| North Star Metric | The single metric that best captures delivered customer value |
| Semantic layer | The system of record for metric definitions (dbt metrics, Cube, etc.) |
| Attribution window | The time window within which a touchpoint receives credit |
| p-value / MDE | Statistical significance threshold / minimum detectable effect in experiments |
