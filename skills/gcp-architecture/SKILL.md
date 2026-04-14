---
name: gcp-architecture
description: GCP resource hierarchy, IAM with Workload Identity Federation, compute selection, BigQuery optimization, Vertex AI, and cost control for production workloads
version: 1.0
---
# GCP Architecture Expert Reference

## Non-Negotiable Standards

1. **Workload Identity Federation instead of service account keys.** Service account keys are a credential leak waiting to happen. For GitHub Actions: `google-github-actions/auth@v2` with `workload_identity_provider` and `service_account`. For AWS/Azure workloads: WIF trust configuration with the external OIDC issuer. Zero downloaded JSON keys in production.
2. **Project-per-environment, not folder-per-environment.** Each application tier (prod, staging, dev) gets its own GCP project. Billing separation, IAM isolation, and quota independence are not achievable within a single project. Shared VPC Host Project is a separate project — never the same as a workload project.
3. **Organization Policies enforce non-negotiable constraints.** `constraints/compute.requireShieldedVm`, `constraints/iam.disableServiceAccountKeyCreation`, `constraints/compute.restrictCloudNATUsage` (allowlist specific projects), `constraints/storage.uniformBucketLevelAccess` — all enforced at Organization or top-level Folder, not per project.
4. **Custom roles over primitive roles.** Never grant `roles/owner` or `roles/editor` to service accounts or external identities. Use predefined roles as the starting point; create custom roles when predefined over-grants. IAM recommender runs weekly — act on recommendations that show 90+ day inactivity.
5. **BigQuery tables must be partitioned if >10 GB.** Unpartitioned queries on multi-TB tables consume slots and incur on-demand cost proportional to bytes scanned. Partition pruning is the primary cost control lever in BigQuery. Clustering is secondary — add it when cardinality on the partition column is insufficient for query predicates.
6. **Cloud Armor on every external HTTP(S) Load Balancer.** Managed protection plus minimum OWASP ModSecurity Core Rule Set (preconfigured ruleset `xss-v33-stable`, `sqli-v33-stable`). Adaptive protection enabled. No external load balancer without at least the default rules.

---

## Decision Rules

**IF** workload is HTTP/gRPC, containerized, stateless, and needs scale-to-zero → **USE Cloud Run**. Max request timeout 60 minutes (increased from 15 min in 2023). Set `--min-instances` > 0 for latency-sensitive services (eliminates cold start). `--cpu-boost` for cold start CPU burst. `--cpu` always-on for CPU-intensive workloads.

**IF** workload is containerized, needs K8s APIs (HPA, custom controllers, Helm), or multi-tenant namespace isolation → **USE GKE Autopilot**. Autopilot handles node provisioning, security hardening (no privileged containers, no host access), and bin packing. GKE Standard only when you need DaemonSets, GPU node pools, or custom node images.

**IF** workload is a short-lived function (<9 min, 2nd gen up to 60 min), event-triggered (Pub/Sub, Eventarc, HTTP), and team doesn't want to manage containers → **USE Cloud Functions 2nd gen** (built on Cloud Run; same underlying platform). Cloud Functions 1st gen is legacy — do not use for new deployments.

**IF** workload requires specific OS, attached persistent disk, GPU (A100/H100/L4), or >480 GB RAM → **USE Compute Engine**. Use Managed Instance Groups for auto-scaling. Spot VMs for fault-tolerant batch (60-91% discount, preemptible within 24hr or on demand during capacity crunch).

**IF** data is transactional relational and globally consistent → **USE Cloud Spanner** (not Cloud SQL). Cloud SQL is regional, single-master. Spanner is multi-region, 99.999% SLA, and horizontally scalable. Cost threshold: Spanner starts at ~$0.90/node-hour; justified at >10,000 QPS or global multi-region requirement.

**IF** ETL is streaming (sub-minute latency) OR batch with complex graph transformations → **USE Dataflow** (Apache Beam managed). If batch-only, large-scale, and team knows Spark → **USE Dataproc** (managed Spark/Hadoop). If transformation is SQL and source/sink is BigQuery → **USE BigQuery itself** (scheduled queries or dbt). Do not introduce Dataflow/Dataproc when BigQuery SQL suffices.

**NEVER** use Shared VPC peering between projects when Shared VPC (host/service project model) is available. VPC peering is non-transitive and doesn't allow centralized firewall management. Shared VPC puts networking control in the host project while workloads run in service projects.

**IF** inter-cloud bandwidth requirement is >500 Mbps steady-state → **USE Dedicated Interconnect** (10/100 Gbps) or **Partner Interconnect**. Cloud VPN caps at 3 Gbps per tunnel (use ECMP for more) and adds variable latency. Dedicated Interconnect has 99.99% SLA with redundant circuits across 2 metros.

---

## Mental Models

**The Resource Hierarchy as a Policy Propagation Tree**
Organization → Folders → Projects → Resources. IAM bindings and Organization Policies set at a higher node apply to all descendants. `roles/bigquery.dataViewer` at the Folder level grants that role on every dataset in every project under that folder — often too broad. Prefer project-level or resource-level bindings for application identities. Organization-level bindings only for platform/security team identities.

**The BigQuery Cost Stack**
On-demand: $6.25/TB scanned — every byte read from unpartitioned, unclustered tables is money. Slot reservations ($0.04/slot-hr for flex, $0.02/slot-hr for annual) become cheaper when query concurrency is predictable. The cost lever order: (1) Partition pruning eliminates most of the scan; (2) Clustering further reduces scanned bytes within partitions; (3) Column selection (avoid `SELECT *`); (4) BI Engine for dashboard queries ($0.04/GB reserved RAM). A 1 TB table queried 100x/day with full scans: $625/day on-demand vs near-zero with partition pruning.

**The Vertex AI Production Stack**
Feature Store (online serving <5ms p99) → Training Pipeline (Vertex AI Pipelines, Kubeflow-compatible) → Model Registry (versioned, linked to training metadata) → Endpoint (auto-scaling prediction serving) → Model Monitoring (skew/drift detection). This is not optional scaffolding — it is the minimum for reproducible ML in production. Anything outside this stack (ad-hoc notebooks → production) is technical debt.

**The Egress Tax Model**
GCP egress pricing: Free to internet up to no minimum (charged from byte 1 at $0.08-$0.12/GB depending on destination). Free between GCP services in the same region. Cross-region: $0.01-$0.08/GB. Egress to CloudFront/Fastly/Akamai CDN: $0.04/GB (reduced). Cloud Storage to internet: $0.08/GB to NA, $0.19/GB to Asia. Design data flows to minimize cross-region and internet egress. BigQuery results to Cloud Storage in the same region: free. BigQuery to client: charged at query result bytes.

---

## Vocabulary

| Term | Precise Definition |
|------|-------------------|
| Workload Identity Federation | GCP IAM mechanism allowing external identities (GitHub Actions, AWS roles, Azure MIs) to impersonate a GCP service account without downloading a key. Trust established via OIDC attribute mapping. |
| Shared VPC | Host project owns VPC networks; service projects attach to subnets. Centralized firewall, DNS, and IP management. Required for enterprise multi-project deployments. Alternative to VPC peering mesh. |
| Organization Policy | Resource constraint at Org/Folder/Project scope. Unlike IAM, cannot be overridden by lower-level admins (unless `inheritFromParent: false` and the parent allows customization). Enforced by the Policy API at resource creation. |
| GKE Autopilot | GKE mode where Google manages nodes, node pools, and OS. Billing per pod resource request (not node). No DaemonSets, no SSH to nodes, no host network. Hardened by default. |
| Committed Use Discount (CUD) | 1- or 3-year resource commitment for Compute Engine and Cloud SQL. 37% (1yr) and 55% (3yr) discount for compute-optimized. Applied automatically to matching usage in the region. |
| Sustained Use Discount (SUD) | Automatic discount (up to 30%) for VMs running >25% of the month. No action required. Stacks with CUD only partially — CUD applies first. |
| Spot VM | Preemptible Compute Engine instance at 60-91% discount. Can be reclaimed within 30-second notice. Max runtime 24 hours (standard preemptible) or demand-based (Spot). Use for batch, Dataproc, and CI. |
| BigQuery Slot | Unit of BigQuery query processing capacity. 1 slot = 1 virtual CPU. On-demand queries use up to 2,000 slots shared. Slot reservations guarantee capacity; flex slots are available hourly. |
| BI Engine | In-memory analysis service for BigQuery. Reserve RAM ($0.04/GB reserved/hr) to accelerate Looker/Data Studio queries to sub-second. Operates as a transparent acceleration layer. |
| Private Google Access | VPC subnet setting enabling VMs without external IPs to reach Google APIs (googleapis.com) via Google's internal network. Required for private subnets using Cloud Storage, BigQuery, Vertex AI. |
| Eventarc | GCP event routing service that triggers Cloud Run, GKE, or Cloud Functions from Audit Log events, Pub/Sub messages, or direct HTTP. Replaces Cloud Functions triggers for 2nd gen. |
| Authorized View | BigQuery view granted access to source tables without granting the view's users access to underlying tables. Used for column/row-level security. Defined in dataset access controls, not IAM. |

---

## Common Mistakes and How to Avoid Them

**1. Service account keys downloaded and stored in code repositories**
Bad: `gcloud iam service-accounts keys create key.json` → key committed to repo or stored in CI secret.
Fix: Configure Workload Identity Federation. For GitHub Actions: create a Workload Identity Pool, add a GitHub OIDC provider, bind the service account with `roles/iam.workloadIdentityUser` on the pool with attribute condition `assertion.repository == "org/repo"`. No JSON key file anywhere.

**2. Full-scan BigQuery queries on multi-TB tables**
Bad:
```sql
SELECT * FROM `project.dataset.events`
WHERE DATE(event_timestamp) = '2024-01-15'
-- Table is partitioned by _PARTITIONTIME but query uses DATE() function on a TIMESTAMP column
-- This doesn't prune the partition — scans entire table
```
Fix:
```sql
SELECT user_id, event_type, event_timestamp
FROM `project.dataset.events`
WHERE _PARTITIONTIME = TIMESTAMP('2024-01-15')  -- partition pruning active
  AND event_type = 'purchase'                    -- clustering column filter
-- Scans one day's partition only, filtered by cluster
```

**3. Single-project architecture for all environments**
Bad: `dev`, `staging`, `prod` workloads all in one project using naming conventions for isolation. A misconfigured IAM binding or org policy change affects all environments simultaneously.
Fix: Separate GCP projects per environment. Use a Folder per application family: `Folder: payments-app` → `payments-prod`, `payments-staging`, `payments-dev`. Billing accounts can aggregate for reporting while maintaining project isolation.

**4. Cloud Run without minimum instances for user-facing traffic**
Bad: `--min-instances=0` on a Cloud Run service handling user requests. Cold starts for Go: ~200ms, Node.js: ~500ms, JVM: ~2-4 seconds — all unacceptable for interactive latency.
Fix: `--min-instances=1` (or higher based on concurrency) for user-facing services. `--cpu-boost` for faster cold start when warming up. `--concurrency=80` (default) appropriate for most stateless services; reduce for CPU-bound workloads.

**5. Overly broad IAM bindings at project level for service accounts**
Bad: `roles/editor` granted to a Cloud Run service account at the project level. Editor includes write access to every resource in the project.
Fix: Grant the minimum predefined role at the resource level. Cloud Run reading from a specific GCS bucket: `roles/storage.objectViewer` on the bucket only, not the project. Use `gcloud storage buckets add-iam-policy-binding gs://my-bucket --member=serviceAccount:... --role=roles/storage.objectViewer`.

---

## Good vs. Bad Output

**Bad BigQuery query (full table scan, SELECT *):**
```sql
SELECT *
FROM `myproject.analytics.page_views`
WHERE EXTRACT(DATE FROM timestamp) = '2024-01-15'
-- Scans 500 GB table entirely; EXTRACT() prevents partition pruning
-- Cost on-demand: ~$3.12 per query execution
```

**Good BigQuery query (partition-pruned, column-selective, clustered):**
```sql
-- Table DDL: PARTITION BY DATE(timestamp), CLUSTER BY country, page_type
SELECT
  page_path,
  country,
  COUNT(*) AS views,
  AVG(load_time_ms) AS avg_load_ms
FROM `myproject.analytics.page_views`
WHERE DATE(timestamp) = '2024-01-15'          -- partition pruning: scans 1/730 of table (2yr range)
  AND country = 'US'                           -- cluster pruning: skips non-US blocks
  AND page_type = 'product'                    -- second cluster column filter
GROUP BY 1, 2
-- Scans ~2 GB instead of 500 GB; cost: ~$0.012 per query execution
```

**Bad Cloud Run service configuration:**
```yaml
# No min instances, shared default SA, public unauthenticated, no concurrency tuning
gcloud run deploy my-service --image gcr.io/project/app:latest \
  --allow-unauthenticated \
  --min-instances=0
  # Uses default compute SA with broad permissions
```

**Good Cloud Run service configuration:**
```yaml
gcloud run deploy my-service \
  --image us-central1-docker.pkg.dev/project/repo/app:sha256-abc123 \
  --region=us-central1 \
  --min-instances=2 \
  --max-instances=100 \
  --concurrency=50 \
  --cpu=2 \
  --memory=2Gi \
  --cpu-boost \
  --service-account=my-service-sa@project.iam.gserviceaccount.com \
  --no-allow-unauthenticated \
  --ingress=internal-and-cloud-load-balancing \
  --set-env-vars="ENV=production" \
  --tag=stable
```

---

## Checklist

- [ ] Resource hierarchy: Organization → Folders (per business unit or app family) → Projects (per environment); no workloads in the root or shared host project
- [ ] Workload Identity Federation configured for all external CI/CD systems; `constraints/iam.disableServiceAccountKeyCreation` org policy enforced; zero service account JSON keys in use
- [ ] Shared VPC host project provisioned; all production workload projects attached as service projects; centralized Cloud Firewall rules in host project
- [ ] Organization Policies enforced at Org level: `requireShieldedVm`, `disableServiceAccountKeyCreation`, `uniformBucketLevelAccess`, `restrictCloudNATUsage`
- [ ] BigQuery tables >10 GB have partition column and at least one clustering column; queries validated to use partition pruning before production deployment
- [ ] Cloud Run services: dedicated service account (not default compute SA); `--no-allow-unauthenticated` for internal services; `--min-instances` set for latency-sensitive endpoints
- [ ] Vertex AI production stack: Feature Store for online features, Pipelines for training, Model Registry for versioning, Endpoint for serving, Model Monitoring enabled
- [ ] Private Google Access enabled on all private subnets; Cloud NAT configured for outbound internet where required; no external IPs on VMs unless explicitly required
- [ ] Cloud Armor security policy attached to all external HTTP(S) Load Balancers; OWASP preconfigured rules enabled; Adaptive Protection enabled
- [ ] Committed Use Discounts purchased for steady-state Compute Engine and Cloud SQL workloads running >3 months; Spot VMs for batch and CI runners
- [ ] IAM Recommender findings reviewed monthly; roles with 90+ day inactivity revoked; no primitive roles (Owner/Editor) on service accounts
- [ ] BigQuery slot strategy documented: on-demand for variable/unpredictable workloads; Flex slots for burst; Annual reservations for baseline throughput >2,000 slot-hours/day
