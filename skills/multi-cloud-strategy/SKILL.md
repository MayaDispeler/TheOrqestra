---
name: multi-cloud-strategy
description: Expert reference for multi-cloud architecture decisions, vendor lock-in management, and cross-cloud operations
version: 1.0
---

# Multi-Cloud Strategy Expert Reference

## Non-Negotiable Standards

1. **Multi-cloud requires a documented business justification**: "Avoid vendor lock-in" is not a sufficient justification. The operational overhead of multi-cloud is 40-60% higher than single-cloud. The business case must name specific workloads, specific reasons, and quantify the benefit against the cost.
2. **Abstraction layers are chosen at the right level**: Abstracting compute (Kubernetes) and IaC (Terraform) is justified. Abstracting every managed service behind a custom interface layer destroys the value of cloud-native services without meaningfully reducing lock-in.
3. **Cloud-native services are tiered by lock-in risk**: Some services (compute, storage, networking) are safe to use deeply. Others (proprietary AI services, analytics engines) require abstraction or careful evaluation. This taxonomy is decided upfront, not service-by-service ad hoc.
4. **FinOps in multi-cloud requires a unified cost visibility layer**: Two separate cloud consoles is not cost visibility. A single pane showing cost per team per cloud per service is required before optimizing multi-cloud spend.
5. **Incidents are isolated by cloud boundary**: A cloud-specific outage must not cascade across clouds. Multi-cloud architecture that shares a critical dependency across clouds (same DNS, same identity provider, same monitoring system that itself runs on Cloud A) provides false resilience.

---

## Decision Rules

**If** the justification for multi-cloud is "avoid vendor lock-in" only → reject it. Quantify the actual switching probability and cost. For most companies, the cost of abstraction exceeds the expected value of switching.

**If** different workloads genuinely perform better on different clouds → multi-cloud is justified. Common valid pattern: GCP Vertex AI / BigQuery for ML and analytics + AWS for everything else. GCP's data/ML tooling is demonstrably superior; AWS's breadth and ecosystem are unmatched.

**If** regulatory requirements mandate data residency in a region only one cloud serves → multi-cloud is justified. Document the specific regulation, the specific region, and the specific cloud.

**If** M&A results in inherited multi-cloud → consolidate where possible over 12-24 months. Run workloads in both clouds during migration, not as permanent multi-cloud strategy.

**If** selecting which cloud for a new workload in a multi-cloud org → use the cloud with the strongest managed service for the primary workload type. Don't default to the "primary" cloud for every workload.

**If** a service is in Lock-in Tier 3 (proprietary AI, proprietary analytics) → require an abstraction layer or documented migration path before adoption. Assess: if this service disappears or doubles in price, what is the exit cost?

**If** deploying cross-cloud networking → use a dedicated interconnect fabric (Equinix Fabric, Megaport) for workloads requiring >500Mbps or <50ms latency between clouds. Internet VPN is acceptable only for low-volume control-plane traffic.

**Never** build a custom abstraction layer that wraps every managed service in each cloud — this eliminates cloud-native advantages and creates a permanent maintenance burden with no exit.

**Never** treat multi-cloud as a disaster recovery strategy unless both clouds are actively running the workload. "We can switch to Cloud B if Cloud A goes down" is not DR — it's a fantasy unless Cloud B is tested regularly.

---

## Mental Models

**The Lock-in Tier Framework**
```
Tier 1 — Use Deeply (low lock-in risk)
  Compute: EC2/GCE/Azure VMs, containers, Kubernetes
  Storage: S3/GCS/Azure Blob (all implement similar APIs)
  Networking: VPCs, load balancers, CDN
  → Switching cost: medium (IaC rewrite, minor config changes)

Tier 2 — Use with Abstraction Layer (medium lock-in)
  Databases: RDS/Cloud SQL/Azure SQL (Postgres-compatible = low risk; proprietary = medium)
  Queues: SQS/Pub-Sub/Service Bus (abstract behind thin interface)
  Functions: Lambda/Cloud Functions/Azure Functions (similar model, different config)
  → Switching cost: high without abstraction, medium with abstraction

Tier 3 — Use Sparingly or Abstract (high lock-in)
  Proprietary AI: AWS Bedrock, Azure OpenAI, Vertex AI
  Proprietary Analytics: BigQuery, Redshift, Synapse (SQL-compatible but not portable)
  ML Platforms: SageMaker, Vertex AI, Azure ML
  Proprietary Data Services: DynamoDB, Cosmos DB, Firestore
  → Switching cost: very high; requires explicit justification and exit plan
```

**Cloud Selection Matrix**
```
Workload Type          | Best Cloud | Reason
-----------------------|------------|------------------------------------------
General web/API        | AWS        | Broadest services, largest ecosystem
Data warehousing       | GCP (BQ)   | BigQuery performance/cost/serverless
ML/AI platform         | GCP/Azure  | Vertex AI, Azure OpenAI integration
Microsoft-shop orgs    | Azure      | AD integration, licensing, hybrid
Kubernetes             | Any        | GKE Autopilot most opinionated; EKS most popular
Serverless functions   | AWS        | Lambda maturity, trigger ecosystem
Real-time analytics    | GCP        | Pub/Sub + Dataflow + BigQuery
```

**Multi-Cloud Operational Overhead Model**
```
Single cloud:    1× baseline operations overhead
Multi-cloud:     1.4-1.6× overhead (duplicate: training, tooling, runbooks, on-call)
3+ clouds:       2× overhead minimum — almost never justified

Overhead items: identity federation, unified monitoring, separate billing systems,
                duplicate skill sets, separate security postures, duplicate IaC modules
```

---

## Vocabulary

| Term | Precise Meaning |
|---|---|
| Vendor lock-in | Dependency on a cloud provider's proprietary services that makes migration costly |
| Cloud-agnostic | Architecture that works across clouds without significant modification |
| Abstraction layer | A common interface that hides cloud-specific API differences |
| Interconnect fabric | Dedicated private connectivity between cloud providers (Equinix, Megaport) |
| Cloud parity | Running the same workload identically on multiple clouds — operationally expensive |
| Active-active multi-cloud | Workload runs simultaneously on multiple clouds with traffic split |
| Active-passive multi-cloud | Primary cloud active; secondary on standby — only "active" if tested regularly |
| FinOps | Financial Operations — managing cloud cost with engineering ownership |
| CUP | Cloud Unit Price — normalized cost per unit of compute/storage for comparison |
| Control plane | Services managing configuration and orchestration (IAM, networking, DNS) |
| Data plane | Services handling actual workload traffic and data processing |
| CSPM | Cloud Security Posture Management — continuous compliance across cloud accounts |

---

## Common Mistakes and How to Avoid Them

**Mistake 1: Multi-cloud for lock-in avoidance theater**
- Bad: "We should be multi-cloud so we're not locked into AWS"
- Fix: Quantify: What is the probability you switch clouds in 5 years? What is the switching cost estimate? What is the ongoing abstraction cost? For most companies this math is negative.

**Mistake 2: Custom abstraction for every service**
- Bad: Building `CloudQueue` interface abstracting SQS, Pub/Sub, and Service Bus — now you can't use any provider-specific features, and you maintain 3 implementations forever
- Fix: Abstract at the right level. Kubernetes for compute, Terraform for IaC. For managed services: accept the lock-in on Tier 1-2 and manage Tier 3 with documented exit plans.

**Mistake 3: Passive-passive "multi-cloud DR"**
- Bad: "We have Cloud B as our DR target" — Cloud B has never served production traffic and hasn't been tested in 18 months
- Fix: If Cloud B is in the DR plan, it must run at minimum 10% of production traffic continuously. Untested failover targets are not DR.

**Mistake 4: No unified cost visibility**
- Bad: AWS costs in Cost Explorer, GCP costs in Billing console, Azure costs in Cost Management — no unified view, no cross-cloud unit economics
- Fix: CloudHealth, Apptio Cloudability, or custom data export to a unified data warehouse. Single cost attribution model with consistent tagging taxonomy across all clouds.

**Mistake 5: Duplicating the control plane**
- Bad: Separate identity providers per cloud, separate monitoring stacks, separate SIEM — incident response requires 3 parallel investigations
- Fix: Federate identity (Okta or Entra ID as IdP, federated to each cloud). Unified observability (Datadog, Grafana, or OpenTelemetry collector → single backend). Single SIEM aggregating all cloud logs.

---

## Good vs. Bad Output

**BAD multi-cloud justification:**
> "We should go multi-cloud to avoid vendor lock-in and have redundancy."

**GOOD multi-cloud architecture decision:**
```
Multi-Cloud Decision Record — Project Atlas

Justification: Two specific workloads require different clouds:
1. ML Training & Vertex AI: GCP — Vertex AI cost/performance 40% better than SageMaker
   for our transformer workloads (benchmarked Q1 2025). BigQuery serves our analytics team.
2. Everything else: AWS — existing expertise, tooling investment, 3yr Savings Plan.

Lock-in Assessment:
  Tier 1 (safe): EC2/GCE, S3/GCS, Kubernetes (EKS/GKE) → No abstraction needed
  Tier 2 (managed): PostgreSQL on RDS/Cloud SQL → Postgres-compatible, switchable
  Tier 3 (risky): Vertex AI → documented alternative: SageMaker. Exit cost: ~4 months eng.

Operational overhead: +35% vs single-cloud. Justified by $180K/yr ML cost savings.

Governance:
  - Terraform modules maintained for both clouds (separate, not abstracted)
  - Datadog for unified observability
  - Okta federated to both AWS and GCP
  - Unified tagging taxonomy enforced by SCP (AWS) and org policy (GCP)
```

---

## Multi-Cloud Checklist

- [ ] Business justification documented — specific workloads, specific clouds, quantified benefit
- [ ] Lock-in tier classification completed for all services in use
- [ ] Tier 3 services have documented exit plans and estimated switching costs
- [ ] Cloud selection matrix guides new workload placement decisions
- [ ] Terraform modules exist for both clouds (not a shared abstraction)
- [ ] Unified identity: single IdP federated to all clouds (Okta/Entra/Google Workspace)
- [ ] Unified observability: single monitoring/alerting platform across all clouds
- [ ] Unified cost visibility: single dashboard showing cross-cloud spend with consistent tagging
- [ ] Cross-cloud networking uses dedicated fabric (Equinix/Megaport) for high-volume traffic
- [ ] DR failover to secondary cloud is tested quarterly, not just documented
- [ ] Operational overhead (training, runbooks, on-call) accounted for in TCO model
- [ ] Annual multi-cloud review: is the overhead still justified by the benefit?
