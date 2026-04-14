---
name: saas-architecture
description: Multi-tenant SaaS design — isolation models, billing, entitlements, and per-tenant resource governance
version: 1.0
---
# SaaS Architecture Expert Reference

## Non-Negotiable Standards

1. **Every table carries tenant_id — no exceptions.** Any table without a tenant_id column that stores customer-affecting data is a data-leak waiting for a bad JOIN. Add it at schema creation; retrofitting costs 10x more.
2. **Row-level security lives at the database, not the application.** Application-layer filtering (`WHERE tenant_id = :current`) is defense-in-depth only — it is not isolation. RLS policies in Postgres enforce the boundary even when application code is buggy.
3. **Tenant onboarding must be fully automated before you reach 100 tenants.** Manual provisioning beyond that threshold causes SLA violations, security gaps from copy-paste errors, and ops burnout. Automate infra provisioning, schema migration, default data seeding, user creation, and billing setup as a single idempotent workflow.
4. **Feature entitlement checks never live directly in feature code.** No `if plan == "enterprise":` scattered across handlers. All entitlement checks route through a single `EntitlementService.can(tenant_id, feature_key)` that reads from a plan-features table. Changing a plan's capabilities is a data change, not a deployment.
5. **Per-tenant rate limiting is mandatory, not optional.** Without it, one over-active tenant degrades the shared pool for all others. Enforce at the API gateway tier with per-tenant token bucket limits configured per plan tier (e.g., Free: 60 req/min, Growth: 600 req/min, Enterprise: custom).
6. **Billing is event-sourced — usage events are immutable records.** Never update a usage counter in place. Append an event, aggregate on read or on a scheduled job. Idempotency keys on every event prevent double-counting across retries.

---

## Decision Rules

**IF** tenant count is below 100 and customers are enterprise/regulated (HIPAA, FedRAMP, financial), **THEN** silo model (dedicated infrastructure per tenant) is viable and often contractually required — cost is justified by compliance posture and deal size.

**IF** tenant count is projected above 1,000 within 18 months, **THEN** pool model (shared infra, tenant_id isolation) is required — silo at that scale becomes operationally untenable and cost-prohibitive.

**IF** your customer mix is SMB + enterprise, **THEN** adopt Bridge/Tiered: pool infrastructure for SMB, silo for enterprise customers above a revenue threshold (typically >$50K ARR). This is the dominant production pattern.

**IF** choosing between database-per-tenant vs schema-per-tenant vs row-level in a single schema, **THEN** use this decision tree:
- Strict compliance + audit isolation required → database-per-tenant (highest cost, clearest boundary)
- Moderate isolation + schema-level migration control needed → schema-per-tenant (Postgres supports ~10K schemas; beyond that, use RLS)
- High tenant count + cost efficiency prioritized → row-level with enforced RLS (most operationally complex to get right, cheapest to run)

**IF** implementing RLS in Postgres, **THEN** always set `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` AND `ALTER TABLE ... FORCE ROW LEVEL SECURITY` — `FORCE` ensures even table owners are subject to policies. Without `FORCE`, a superuser or table owner bypasses all policies silently.

**IF** a tenant moves from a pool plan to an enterprise silo plan, **THEN** the migration path must be documented before the first customer signs an enterprise contract. Retroactive data migration with zero downtime is a 3-month project; plan for it at architecture time.

**IF** using S3 for tenant data storage with fewer than 200 tenants, **THEN** use prefix-per-tenant isolation (`s3://bucket/tenant-{id}/...`) with IAM policies scoped to the prefix. Above 200 enterprise tenants with BYOK requirements, provision dedicated buckets per tenant with tenant-managed KMS keys.

**IF** a new feature is being built, **THEN** check the entitlement service first — does a plan-feature mapping entry exist? If not, create it before writing feature code. Never let a feature go live without an explicit entitlement entry, even if it is available to all plans.

**NEVER** use application-layer filtering as your only tenant isolation mechanism. A single missing `WHERE tenant_id = ?` clause in one query exposes all tenant data. RLS is the enforcement layer; application filtering is convenience.

**NEVER** share encryption keys across tenants. Tenant-managed keys (BYOK) are an enterprise table-stakes feature; even for pool-model tenants at lower tiers, use per-tenant derived keys via envelope encryption.

**IF** NRR drops below 100% for a cohort, **THEN** investigate feature adoption by plan before blaming pricing. Low activation rate (< 40% of users completing the "aha moment" action within 14 days) is the leading indicator of churn, not price sensitivity.

---

## Mental Models

**The Blast Radius Model**
Every architectural decision has a blast radius — the maximum number of tenants affected if this component fails or is breached. Silo = blast radius of 1. Pool = blast radius of all tenants. Design your monitoring, deployment, and incident response around blast radius. A noisy-neighbor CPU spike in a pool has a blast radius > 1; a bad migration in a schema-per-tenant model has a blast radius of 1. Always know your blast radius before merging infra changes.

**The Isolation Ladder**
Isolation exists on a continuum: process → schema → database → VM → account/subscription. Moving up one rung increases isolation AND cost AND operational complexity. Do not jump rungs to satisfy a theoretical threat; match the rung to the actual regulatory or contractual requirement. Most SMB SaaS lives comfortably at the schema rung; most regulated enterprise SaaS needs the database or VM rung.

**The Entitlement Service as Product Catalog**
Think of the entitlement service not as a permission check but as the machine-readable product catalog. Every feature that can be sold, upsold, or bundled is a row in the feature_flags + plan_entitlements tables. This mental model forces product, engineering, and sales to agree on capability definitions before a feature is built and makes plan migration, trial activation, and A/B pricing trivial config changes rather than code changes.

**The Usage Event Ledger**
Model billing like a financial ledger: events are appended, never mutated. The current balance (usage count, resource consumption) is always derived from the immutable event log. This means any billing dispute is resolvable by replaying events, any aggregation error is correctable without data loss, and usage reporting to Stripe is always a projection over a trusted source — not the source itself.

---

## Vocabulary

| Term | Definition |
|---|---|
| **Silo model** | Dedicated infrastructure stack (DB, compute, storage) per tenant. Maximum isolation, highest cost. Required for FedRAMP/HIPAA enterprise. |
| **Pool model** | Single shared infrastructure with tenant_id partitioning. Most cost-efficient; requires RLS and strict query discipline. Required at >1K tenants. |
| **Bridge/Tiered model** | Pool for SMB, silo for enterprise above a revenue or compliance threshold. Dominant pattern in production multi-tenant SaaS. |
| **RLS (Row-Level Security)** | Postgres mechanism that attaches security policies directly to tables, filtering rows based on session variables — enforced even for application users. |
| **Entitlement service** | Centralized service/module that answers `can(tenant_id, feature_key)` by reading plan-feature mappings. All feature gating routes through here. |
| **BYOK (Bring Your Own Key)** | Enterprise feature where the tenant provides their own KMS key; the vendor never has access to plaintext tenant data. |
| **Noisy neighbor** | A tenant whose resource consumption degrades shared-infrastructure performance for co-located tenants. Detected via per-tenant CPU/memory/query metrics. |
| **Tenant activation rate** | % of new tenants completing the defined "aha moment" action within N days (typically 14). Leading indicator of long-term retention. |
| **NRR (Net Revenue Retention)** | Revenue retained + expansion from a cohort over 12 months, net of churn and contraction. Healthy SaaS: >110%. Warning: <100%. |
| **Dunning** | Automated retry + communication workflow triggered by failed subscription payments. Stripe Billing handles this; must be configured before launch. |
| **Usage event** | Immutable, idempotent record of a billable action (API call, document processed, seat used). Foundation of metered billing. |
| **Plan-feature mapping** | Database relationship between a subscription plan and the set of feature keys it enables. Changing this row changes product behavior without a deploy. |

---

## Common Mistakes and How to Avoid Them

**Mistake 1: Application-layer-only tenant filtering**
- **Bad:** `SELECT * FROM orders WHERE tenant_id = $current_tenant` in every repository method, relying on developers to remember it everywhere.
- **Fix:** Enable Postgres RLS with `SET app.current_tenant_id = ?` in the connection setup. Write a policy: `CREATE POLICY tenant_isolation ON orders USING (tenant_id = current_setting('app.current_tenant_id')::uuid)`. Application filtering then becomes defense-in-depth, not the primary control.

**Mistake 2: Hardcoded plan checks in feature code**
- **Bad:** `if user.plan == "enterprise" and feature_flag("advanced_reporting"): ...` scattered across 40 files.
- **Fix:** Single call `entitlement_service.require(tenant_id, "advanced_reporting")` that raises `EntitlementError` if not permitted. Plan logic lives in `plan_entitlements` table. Adding a feature to a plan is an INSERT, not a grep-and-replace.

**Mistake 3: Manual tenant onboarding past 30 tenants**
- **Bad:** DevOps engineer runs a Confluence runbook with 23 manual steps to provision a new tenant, taking 2–4 hours and introducing 1–2 configuration errors per month.
- **Fix:** Idempotent Terraform module + Helm chart parameterized by `tenant_id`. Triggered by a webhook from the billing system on subscription activation. Target: new tenant fully operational within 5 minutes of payment confirmation.

**Mistake 4: Flat usage counter updates instead of event ledger**
- **Bad:** `UPDATE tenant_usage SET api_calls = api_calls + 1 WHERE tenant_id = ?` — loses history, cannot replay, cannot audit disputes, race conditions at scale.
- **Fix:** `INSERT INTO usage_events (tenant_id, event_type, quantity, idempotency_key, occurred_at)`. Aggregate with a scheduled job or materialized view. Replay events to reconstruct any point-in-time balance. Report to Stripe Metered Billing via the aggregation, not the counter.

**Mistake 5: Ignoring noisy neighbor until customers complain**
- **Bad:** No per-tenant resource metrics, alerts only on aggregate p99 latency — by the time the alert fires, 3 tenants have already opened support tickets.
- **Fix:** Tag all metrics (database query time, API response time, queue depth) with `tenant_id`. Build a dashboard with per-tenant p95 latency. Set an alert when any single tenant consumes >20% of pool resources for >5 minutes. Implement per-tenant rate limiting at the API gateway as the first enforcement layer.

---

## Good vs. Bad Output

**BAD: Tenant isolation via application filtering only**
```sql
-- No RLS policy. Developer must remember WHERE clause everywhere.
SELECT * FROM documents WHERE tenant_id = '{{current_tenant}}';
-- One forgotten WHERE clause in a reporting query exposes all tenant documents.
```

```python
# Feature check hardcoded in handler
def get_advanced_report(user):
    if user.organization.plan == "enterprise":
        return generate_advanced_report()
    raise PermissionError("Upgrade required")
```

**GOOD: RLS-enforced isolation + entitlement service**
```sql
-- Migration: enable RLS on every tenant-scoped table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON documents
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Connection setup (run once per DB session, e.g., in a middleware):
-- SET LOCAL app.current_tenant_id = '<uuid-from-jwt>';
-- Now every SELECT/INSERT/UPDATE/DELETE on documents is automatically scoped.
```

```python
# Entitlement check routes through single service
class EntitlementService:
    def require(self, tenant_id: UUID, feature: str) -> None:
        if not self._plan_allows(tenant_id, feature):
            raise EntitlementError(feature)  # caught by middleware, returns 402

def get_advanced_report(tenant_id: UUID):
    entitlement_service.require(tenant_id, "advanced_reporting")
    return generate_advanced_report()

# plan_entitlements table:
# INSERT INTO plan_entitlements (plan_id, feature_key) VALUES ('enterprise', 'advanced_reporting');
# -- Adding feature to a plan = one SQL INSERT, no deploy needed.
```

---

## Checklist

- [ ] Every tenant-scoped table has a `tenant_id UUID NOT NULL` column with a foreign key to the tenants table
- [ ] Postgres RLS enabled with `FORCE ROW LEVEL SECURITY` on all tenant-scoped tables
- [ ] Session variable `app.current_tenant_id` set in DB connection middleware before first query
- [ ] Entitlement service exists; zero direct plan-string comparisons in feature code
- [ ] `plan_entitlements` table drives all feature availability — adding a feature to a plan requires no code deploy
- [ ] Tenant onboarding is fully automated end-to-end; provisioning time < 10 minutes; tested for idempotency
- [ ] Stripe metered billing uses an event ledger (append-only usage_events table) with idempotency keys
- [ ] Per-tenant API rate limits enforced at gateway; limits differ by plan tier
- [ ] Noisy neighbor detection: per-tenant resource metrics tagged and alerted on > 20% pool share for > 5 minutes
- [ ] S3 tenant data uses prefix-per-tenant or bucket-per-tenant; no cross-tenant IAM access possible
- [ ] Enterprise tenant BYOK encryption documented in the contract and implemented before first enterprise deal closes
- [ ] SaaS metrics dashboard (activation rate, NRR by cohort, feature adoption by plan) in place before Series A
