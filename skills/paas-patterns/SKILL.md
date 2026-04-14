---
name: paas-patterns
description: Expert reference for Platform-as-a-Service selection, usage patterns, and migration decisions
version: 1.0
---

# PaaS Patterns Expert Reference

## Non-Negotiable Standards

1. **PaaS selection is made against specific criteria, not familiarity**: "We've used Heroku before" is not a selection criterion. Evaluate against: team size, scaling requirements, compliance needs, cost at target scale, and vendor lock-in tolerance.
2. **12-Factor App compliance is the exit strategy**: Any application deployed on PaaS must follow 12-Factor principles (env vars for config, stateless processes, logs to stdout). This is the escape hatch that makes migration to containers/IaaS possible without a full rewrite.
3. **PaaS limitations are documented before commitment**: Heroku's 30-second request timeout, no persistent filesystem, dyno sleep on free tier — these must be known and acceptable before choosing a platform, not discovered in production.
4. **Observability is always added on top of PaaS**: PaaS-native metrics and logs are insufficient for production systems. Datadog, Grafana Cloud, or equivalent must be configured from day one. Don't rely on the platform's built-in log tail.
5. **Managed components are preferred over self-managed within PaaS**: If you're using Heroku, use a managed Postgres addon (Heroku Postgres, Neon). Don't spin up a self-managed DB alongside a PaaS app — you've taken on the worst of both worlds.

---

## Decision Rules

**If** the team is ≤5 engineers and the product is early-stage → PaaS is the right default. Operational overhead of self-managed K8s at this scale is a major distraction from product development.

**If** monthly PaaS cost exceeds $5,000 → evaluate whether managed K8s (EKS/GKE) is cheaper at equivalent capability. This is not automatic — include the engineering labor cost of the migration and ongoing cluster management.

**If** compliance requirements include SOC2 Type II, HIPAA, or FedRAMP → verify the PaaS vendor's compliance attestation explicitly. Heroku has SOC2; Render has SOC2; Railway is less mature on compliance certifications.

**If** the application requires persistent filesystem storage → PaaS is the wrong choice (except App Service which supports persistent storage). Use object storage (S3/GCS) for persistent data. Stateless processes are non-negotiable on most PaaS platforms.

**If** choosing between Heroku and Render/Railway → Render/Railway for greenfield. Heroku's pricing is significantly higher for equivalent compute; its ecosystem advantage has diminished since Salesforce acquisition. Heroku is appropriate only for organizations with deep existing tooling investment.

**If** deploying GPU workloads on PaaS → Fly.io has limited GPU support; Render has GPU instances. Most PaaS platforms cannot serve GPU workloads — use cloud-native GPU instances or Modal for ML inference.

**If** the application needs background workers and scheduled jobs → verify the PaaS platform's worker/scheduler support before committing. Heroku: Procfile workers, Heroku Scheduler. Render: background workers, cron jobs. Railway: separate services.

**Never** rely on PaaS-native logging beyond 7 days. Most platforms have short log retention. Ship logs to Datadog, Papertrail, or a managed logging service from the start.

**Never** use PaaS for a workload with latency SLAs below 50ms p99. Cold starts, shared infrastructure, and routing overhead make consistent sub-50ms response times unreliable on most PaaS platforms.

---

## Mental Models

**PaaS Selection Matrix**
```
Platform    | Best For                        | Avoid When               | ~Cost Breakeven vs K8s
------------|----------------------------------|--------------------------|------------------------
Heroku      | Existing investment, Rails/Node  | Cost-sensitive, >$3K/mo  | ~$2,000-3,000/mo
Render      | Greenfield web apps, APIs        | GPU, very high traffic   | ~$3,000-4,000/mo
Railway     | Small teams, fast iteration      | Enterprise compliance    | ~$2,000/mo
Fly.io      | Global edge, Docker-native       | Stateful, complex routing| ~$3,000-4,000/mo
App Service | Azure/Microsoft shops            | Non-Microsoft stack      | ~$2,500/mo
Cloud Run   | GCP-native, serverless HTTP      | Always-on low-latency    | Varies (per-request billing)
```

**The 12-Factor Compliance Check (PaaS Exit Strategy)**
```
Factor 1: Codebase — one codebase in version control                      ✓/✗
Factor 2: Dependencies — explicitly declared and isolated                  ✓/✗
Factor 3: Config — stored in environment variables (not code)              ✓/✗
Factor 4: Backing services — attached resources, swappable                 ✓/✗
Factor 5: Build/release/run — strictly separate stages                    ✓/✗
Factor 6: Processes — stateless, share nothing                             ✓/✗
Factor 7: Port binding — export services via port                          ✓/✗
Factor 8: Concurrency — scale via process model                            ✓/✗
Factor 9: Disposability — fast startup (<10s), graceful shutdown           ✓/✗
Factor 10: Dev/prod parity — keep dev, staging, prod as similar as possible ✓/✗
Factor 11: Logs — treat as event streams to stdout                         ✓/✗
Factor 12: Admin processes — run as one-off processes                      ✓/✗

Any ✗ = migration risk. Fix before the migration, not during.
```

**PaaS Cost Modeling**
```
Component             | Heroku (example)  | Equivalent ECS Fargate
----------------------|-------------------|------------------------
2× Standard-2X dynos  | $100/mo           | 2 vCPU / 4GB → ~$35/mo
Heroku Postgres (9GB) | $50/mo            | RDS db.t4g.medium → ~$25/mo
Heroku Redis          | $30/mo            | ElastiCache cache.t4g.micro → $13/mo
Log routing           | $15/mo (Papertrail)| CloudWatch → ~$10/mo
Total                 | $195/mo           | ~$83/mo + ~$500/mo eng labor
                                          = viable to migrate at ~$300/mo infra
```

---

## Vocabulary

| Term | Precise Meaning |
|---|---|
| Dyno | Heroku's unit of compute — a lightweight container running a process |
| Slug | Heroku's compiled, runnable application artifact |
| Procfile | Heroku configuration declaring what process types the app runs |
| Release phase | Heroku feature for running one-off commands (migrations) before new version starts |
| Buildpack | Heroku mechanism for detecting language and compiling application |
| 12-Factor App | Methodology for building portable, scalable software-as-a-service apps |
| Cold start | Latency added when a PaaS platform spins up a new instance from zero |
| Fly Machine | Fly.io's unit of compute — a VM that starts in <300ms |
| Autosleep | Heroku feature where dynos sleep after 30min of inactivity (free/eco tier) |
| Add-on | PaaS-provisioned managed service (database, cache, monitoring) attached to an app |
| Managed service | A cloud service where infrastructure management is handled by the provider |
| Lock-in | Dependency on PaaS-specific features that makes migration to another platform costly |

---

## Common Mistakes and How to Avoid Them

**Mistake 1: Local filesystem for persistent data**
- Bad: Saving uploaded files to `/tmp/uploads` on a Heroku dyno — they disappear on dyno restart
- Fix: All persistent data goes to S3, GCS, or Cloudinary. The filesystem is ephemeral on all PaaS platforms except App Service with persistent storage configured.

**Mistake 2: Ignoring the 30-second Heroku request timeout**
- Bad: Long-running data export endpoint takes 45 seconds — users see H12 errors
- Fix: Move long-running operations to background workers. Respond immediately with a job ID; client polls for completion. Heroku's 30s limit is strict and non-negotiable.

**Mistake 3: Scaling up when you should scale out**
- Bad: Upgrading to Performance-2X dynos ($500/mo each) instead of adding more Standard-2X dynos
- Fix: Horizontal scaling (more dynos) is almost always better than vertical. Performance dynos are only justified for workloads that cannot parallelize or require dedicated CPU.

**Mistake 4: No external observability**
- Bad: Monitoring = `heroku logs --tail` — no dashboards, no alerting, no historical metrics
- Fix: Datadog, New Relic, or Sentry from day one. PaaS-native metrics have no retention and no alerting. You need to know before your users do.

**Mistake 5: Starting on PaaS, migrating in a panic**
- Bad: Build everything as Heroku-specific (Heroku Redis, Heroku Connect, Heroku Scheduler) then face $15,000/month bill at scale with no migration path
- Fix: Use PaaS for hosting but use standard services underneath. Postgres is Postgres — use Heroku's but connect via standard Postgres URL. When you migrate, swap the connection string.

---

## Good vs. Bad Output

**BAD PaaS architecture:**
```
App: Heroku Standard-2X × 4 dynos
Storage: Local /tmp for file uploads
Sessions: Stored in dyno memory (sticky sessions required)
Jobs: Inline in web request (causes H12 timeouts)
Monitoring: heroku logs only
Database: Heroku Postgres Basic ($9/mo, no backups, row limit)
```

**GOOD PaaS architecture:**
```
App: Heroku Standard-2X × 4 web dynos + 2 worker dynos
Storage: S3 for all file uploads (Carrierwave/Active Storage → S3)
Sessions: Redis-backed (Heroku Redis → session stored externally)
Jobs: Sidekiq on worker dynos, Redis queue
Monitoring: Datadog with APM + error tracking (Sentry)
Database: Heroku Postgres Standard-0 (10GB, automated backups, connection pooling via PgBouncer add-on)
12-Factor: ✓ all 12 factors — migration to ECS estimated at 2 weeks
```

---

## PaaS Checklist

- [ ] Platform selected against documented criteria (not familiarity)
- [ ] PaaS limitations documented and accepted (timeouts, storage, GPU, etc.)
- [ ] 12-Factor compliance verified — exit strategy exists
- [ ] All file storage uses object storage (S3/GCS) — no local filesystem reliance
- [ ] Session state externalized to Redis or DB — no in-process session
- [ ] Long-running tasks in background workers — not inline in web requests
- [ ] External observability configured (Datadog/Grafana) — not PaaS logs only
- [ ] Managed services used for DB and cache (no self-managed alongside PaaS)
- [ ] Cost projection at 3× and 10× current scale documented
- [ ] Cost breakeven vs K8s calculated and reviewed
- [ ] Compliance requirements verified against platform certifications
- [ ] Connection strings and config in environment variables (12-Factor #3)
