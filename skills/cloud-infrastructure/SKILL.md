---
name: cloud-infrastructure
description: Cloud infrastructure design and operations across AWS, GCP, and Azure — architecture decisions, IaC, networking, storage, IAM, cost, DR, and observability.
version: 1.0
---

# Cloud Infrastructure Expert Reference

## Non-Negotiable Standards

1. **Infrastructure is code, always.** No resource is created, modified, or destroyed through a cloud console in production. All changes flow through Terraform (or Pulumi/CDK) via a reviewed pull request and automated pipeline. Console access is read-only except for break-glass incidents, which are logged and post-mortemed.
2. **Least privilege is a hard constraint, not a goal.** No IAM role carries `*` actions or `*` resources in production. Service accounts are single-purpose. Wildcard policies are permitted only in sandbox accounts with mandatory expiry (≤7 days).
3. **Egress costs are a first-class concern.** Architect data flows to keep traffic within a region. Document cross-region and internet egress volumes at design time, not after the first billing surprise.
4. **Every resource has an owner tag.** Minimum required tags: `env`, `team`, `service`, `cost-center`. Resources without these tags are flagged daily and deleted after 14 days in non-production accounts.
5. **RTO and RPO are defined in writing before the architecture is finalized.** "We'll figure out DR later" is not acceptable. DR tier determines architecture choices — active-active vs. warm standby vs. backup-restore are not interchangeable after the fact.
6. **Security groups and network ACLs follow default-deny.** No inbound rule allows `0.0.0.0/0` except on load balancers serving public traffic. SSH/RDP to instances is prohibited in production; use AWS Systems Manager Session Manager, GCP IAP, or Azure Bastion exclusively.

---

## Decision Rules

1. **If request rate < 1 req/sec and execution time < 15 min → serverless (AWS Lambda, GCP Cloud Functions, Azure Functions). If sustained load > 100 req/sec or execution > 15 min → containers or VMs.**
2. **If workload is stateless and containerized → Kubernetes (EKS/GKE/AKS) for teams with >3 engineers and operational maturity; AWS ECS Fargate or Cloud Run for smaller teams. Never manage your own Kubernetes control plane on EC2.**
3. **If data is unstructured, accessed via HTTP, and > 1 TB → object storage (S3, GCS, Azure Blob). If data requires POSIX semantics and shared mounts across instances → managed file storage (EFS, Filestore, Azure Files). If data requires low-latency block I/O (databases, OS disks) → block storage (EBS gp3, Persistent Disk SSD).**
4. **If S3/GCS data is accessed < once per quarter → move to Glacier/Nearline/Archive tier. Access frequency drives storage class: Standard (<30 days), Infrequent Access (30–90 days), Archive (>90 days). Lifecycle policies are mandatory.**
5. **If availability requirement is 99.9% → Multi-AZ is sufficient. If requirement is 99.99% → Multi-Region active-active or active-passive with automated failover. Multi-AZ does not protect against regional outages.**
6. **If a workload runs > 60% of the time on a predictable schedule → Reserved Instances or Committed Use Discounts. If workload is batch, fault-tolerant, and interruptible → Spot/Preemptible instances (up to 90% savings). Never use On-Demand for baseline steady-state workloads.**
7. **If Terraform module is used by > 1 team → publish it to a private registry with semantic versioning. Never copy-paste Terraform modules between repos; pin the source to a version tag, never to `main`.**
8. **If Terraform state is shared across a team → use remote state in S3+DynamoDB (AWS), GCS (GCP), or Azure Blob with state locking. Never store state files in Git.**
9. **If a security group change touches production inbound rules → require a second approver in the PR and a Jira/ticket reference. Automated checks must verify no `0.0.0.0/0` ingress is introduced.**
10. **If an alert fires → it must be actionable within 5 minutes. Alerts that cannot be acted on immediately are noise; move them to a dashboard, not PagerDuty. Alert fatigue is a safety failure.**

---

## Mental Models

### 1. Compute Selection Decision Tree

```
New workload — what compute?
├── Stateless, event-driven, < 15 min, < 1 req/s steady state
│   └── Serverless: Lambda / Cloud Functions / Azure Functions
├── Containerized, stateless, sustained traffic
│   ├── Team size ≥ 3 engineers, complex networking needs
│   │   └── Managed Kubernetes: EKS / GKE / AKS
│   └── Smaller team, simple routing
│       └── ECS Fargate / Cloud Run / Azure Container Apps
├── Stateful, requires persistent disk, OS-level control
│   ├── Need consistent baseline performance
│   │   └── VM: EC2 / Compute Engine / Azure VM
│   └── Predictable, interruptible batch
│       └── Spot / Preemptible VMs
└── ML training / HPC
    └── GPU instances: p3/p4 (AWS), A2 (GCP), NCv3 (Azure)
```

### 2. VPC Network Segmentation Model

```
VPC / Virtual Network
├── Public Subnets (one per AZ)
│   └── Only: Load Balancers, NAT Gateways, Bastion-free jump (use SSM)
│   └── Route: 0.0.0.0/0 → Internet Gateway
├── Private Application Subnets (one per AZ)
│   └── App servers, ECS tasks, Lambda (VPC-attached)
│   └── Route: 0.0.0.0/0 → NAT Gateway in same AZ (avoid cross-AZ NAT charges)
├── Private Data Subnets (one per AZ)
│   └── RDS, ElastiCache, MSK — no route to internet
│   └── Security group: accept only from app subnet CIDR
└── Transit Gateway / VPC Peering
    └── For cross-VPC traffic — document all peering routes
    └── Never create full-mesh peering > 5 VPCs; use Transit Gateway
```

### 3. DR Tier Mapping

```
Tier | RTO      | RPO      | Architecture Pattern              | Cost Multiplier
-----|----------|----------|-----------------------------------|----------------
0    | < 1 min  | 0        | Active-Active multi-region        | 3–4x
1    | < 15 min | < 5 min  | Warm standby, automated failover  | 2–2.5x
2    | < 4 hrs  | < 1 hr   | Pilot light (infra ready, no load)| 1.3–1.5x
3    | < 24 hrs | < 24 hrs | Backup & restore from snapshots   | 1.0–1.1x

Rule: Match the tier to the business SLA. Never build Tier 0 for a Tier 3 SLA.
Never quote an RTO/RPO without testing it in a game day or chaos exercise.
```

### 4. Observability Signal Selection

```
Question to answer                              → Signal to use
------------------------------------------------------------
Is the service up and handling requests?        → Metrics (RED: Rate, Errors, Duration)
Why did this request fail?                      → Traces (distributed tracing: X-Ray, Cloud Trace, Jaeger)
What was the exact error message at 14:32?      → Logs (structured JSON, log level ≥ WARN in prod)
Is the system in a known-bad state pattern?     → Metrics + Alerts
How long has this been happening?               → Metrics with long retention (13 months minimum)

Golden Signals (SRE): Latency | Traffic | Errors | Saturation
Alert on user-facing golden signals. Dashboard everything else.
```

---

## Vocabulary

| Term | Precise Meaning |
|---|---|
| **RTO (Recovery Time Objective)** | Maximum tolerable duration from failure to service restoration. A business SLA, not a technical metric. Must be tested. |
| **RPO (Recovery Point Objective)** | Maximum tolerable data loss measured in time. An RPO of 1 hour means you accept losing up to 1 hour of data. Drives backup frequency. |
| **Multi-AZ** | Replication across physically separate data centers within a single cloud region. Protects against AZ failure; does NOT protect against regional outage. |
| **NAT Gateway** | Managed service allowing private subnet resources to initiate outbound internet connections without being reachable inbound. Billed per GB transferred — a common cost surprise. |
| **Security Group** | Stateful virtual firewall operating at the instance/ENI level (AWS/GCP). Rules are evaluated as a set; all outbound is allowed by default unless explicitly restricted. |
| **Terraform State Lock** | A distributed lock (DynamoDB in AWS, GCS object lock in GCP) preventing concurrent Terraform applies from corrupting shared state. Required for all team environments. |
| **Spot / Preemptible Instance** | Spare capacity offered at steep discount (60–90%) but can be reclaimed with 2-minute warning. Suitable for stateless, fault-tolerant, or checkpointing workloads only. |
| **IAM Role (assume-role pattern)** | An AWS identity with no long-lived credentials; assumed temporarily via STS. Prefer over IAM users with access keys for all programmatic access. |
| **Committed Use Discount (CUD)** | GCP contract for 1 or 3 years of specific compute resource usage in exchange for 37–55% discount. Applied automatically to eligible workloads; no upfront payment required for flexible CUDs. |
| **Egress Cost** | Fee charged for data leaving a cloud provider's network to the internet or to another region/provider. Typically $0.08–0.09/GB for internet egress; the most consistently underestimated cloud cost. |
| **PrivateLink / Private Service Connect** | Service for routing traffic to AWS/GCP managed services (S3, RDS, BigQuery) through private IP addresses within a VPC, eliminating internet exposure and NAT Gateway charges. |
| **Blast Radius** | The scope of impact if a given resource, credential, or failure propagates. IaC module structure, IAM boundaries, and account segmentation are all tools for limiting blast radius. |

---

## Common Mistakes and How to Avoid Them

### Mistake 1: Over-Broad IAM Policies

**Bad example:**
```json
{
  "Effect": "Allow",
  "Action": "*",
  "Resource": "*"
}
```

**Why wrong:** Any compromise of this role compromises the entire account. Violates the principle of least privilege. Will fail most compliance audits (SOC 2, PCI-DSS, ISO 27001).

**Fix:** Scope to exact actions and specific resource ARNs. Use IAM Access Analyzer to generate least-privilege policies from CloudTrail data after a burn-in period:
```json
{
  "Effect": "Allow",
  "Action": ["s3:GetObject", "s3:PutObject"],
  "Resource": "arn:aws:s3:::my-service-bucket/*"
}
```

---

### Mistake 2: Storing Terraform State in Git

**Bad example:**
```
repo/
  infra/
    terraform.tfstate      # committed to git
    terraform.tfstate.backup
```

**Why wrong:** State files contain plaintext secrets (database passwords, private keys). Concurrent applies corrupt state. Git history permanently stores sensitive data.

**Fix:**
```hcl
terraform {
  backend "s3" {
    bucket         = "company-tf-state"
    key            = "services/payments/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
```

---

### Mistake 3: Single-AZ Database with Multi-AZ Application

**Bad example:**
```
Architecture:
  ALB (Multi-AZ) → ECS Fargate (3 AZs) → RDS MySQL (Single-AZ, us-east-1a)
```

**Why wrong:** The database is a single point of failure. AZ failure of us-east-1a takes down the entire stack despite the application layer being redundant. RTO for an AZ failure with manual failover is 20–40 minutes.

**Fix:** Enable RDS Multi-AZ (synchronous replication, automatic failover in <60 seconds). Cost increase is ~2x for the DB instance — always justified when the application is Multi-AZ.

---

### Mistake 4: Ignoring Cross-AZ Data Transfer Costs

**Bad example:**
```
NAT Gateway in us-east-1a
ECS tasks running in us-east-1b and us-east-1c routing through it
Monthly bill: $340 unexpected data transfer charge
```

**Why wrong:** Cross-AZ data transfer costs $0.01/GB in each direction. A NAT Gateway in a single AZ charges cross-AZ traffic from tasks in other AZs. At scale this adds up to hundreds of dollars monthly.

**Fix:** Deploy one NAT Gateway per AZ. Route each private subnet through the NAT Gateway in the same AZ. Accept the slightly higher cost for redundancy while eliminating cross-AZ charges.

---

### Mistake 5: No Alerting Baseline at Launch

**Bad example:** Application deployed to production. CloudWatch metrics exist but no alarms configured. Service degrades over a weekend; discovered Monday morning via customer complaints.

**Why wrong:** Monitoring without alerting is a dashboard, not observability. Human review of dashboards is unreliable during off-hours.

**Fix:** Before any service goes to production, configure alarms on the four golden signals at minimum:
- Error rate > 1% for 5 consecutive minutes → PagerDuty P1
- p99 latency > 2x baseline for 10 minutes → PagerDuty P2
- Saturation (CPU > 85% or memory > 90%) for 10 minutes → PagerDuty P2
- Zero healthy targets in any target group → PagerDuty P1

---

## Good vs. Bad Output

### Comparison 1: Terraform Module Structure

**Bad:**
```
infra/
  main.tf          # 800 lines, everything in one file
  variables.tf
  outputs.tf
```

**Good:**
```
infra/
  modules/
    vpc/           # published, versioned, reusable
      main.tf
      variables.tf
      outputs.tf
      README.md
    rds-postgres/
      main.tf
      variables.tf
      outputs.tf
  environments/
    prod/
      main.tf      # calls modules with version pins: source = "git::...?ref=v2.3.1"
      terraform.tfvars
    staging/
      main.tf
      terraform.tfvars
  .terraform-version  # pin Terraform CLI version
```

---

### Comparison 2: Security Group for a Web Application

**Bad:**
```hcl
resource "aws_security_group_rule" "allow_all_inbound" {
  type        = "ingress"
  from_port   = 0
  to_port     = 65535
  protocol    = "-1"
  cidr_blocks = ["0.0.0.0/0"]
}
```

**Good:**
```hcl
# ALB Security Group: only 443 from internet
resource "aws_security_group_rule" "alb_https_inbound" {
  type        = "ingress"
  from_port   = 443
  to_port     = 443
  protocol    = "tcp"
  cidr_blocks = ["0.0.0.0/0"]
}

# App Security Group: only from ALB security group
resource "aws_security_group_rule" "app_from_alb" {
  type                     = "ingress"
  from_port                = 8080
  to_port                  = 8080
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.alb.id
}
```

---

### Comparison 3: Cost Optimization Approach

**Bad:** "We should right-size our instances" — vague, unmeasurable, not actionable.

**Good:**
1. Pull 30-day CloudWatch CPU and memory utilization for all EC2 instances using AWS Compute Optimizer.
2. Instances with p99 CPU < 20% and p99 memory < 40% → downsize one instance family size (e.g., m5.2xlarge → m5.xlarge).
3. Instances with consistent > 60% baseline load running On-Demand → purchase 1-year Reserved Instances (no upfront) for 40% savings.
4. Batch jobs (nightly ETL, ML training) → migrate to Spot with a Spot interruption handler; target 70% cost reduction.
5. S3 buckets with no lifecycle policy and objects > 90 days old → add transition to S3-IA at 30 days, Glacier Instant Retrieval at 90 days.
Expected outcome: 35–50% reduction in compute costs, documented per service.

---

## Checklist

- [ ] All infrastructure changes are applied via IaC (Terraform/Pulumi/CDK) through a reviewed PR; no console-driven changes in production.
- [ ] Terraform state is stored in a remote backend with encryption and state locking enabled.
- [ ] All Terraform module sources are pinned to specific version tags, not `main` or `latest`.
- [ ] All IAM roles and policies follow least privilege; no wildcard actions on wildcard resources in production.
- [ ] All resources have the required tags: `env`, `team`, `service`, `cost-center`.
- [ ] No security group allows inbound `0.0.0.0/0` except the public-facing load balancer on port 443/80.
- [ ] SSH/RDP to instances is disabled; session access uses SSM Session Manager, IAP, or Azure Bastion.
- [ ] RTO and RPO are defined, documented, and the architecture is verified to meet them by tier.
- [ ] Multi-AZ is enabled for all stateful services (RDS, ElastiCache, MSK) in production.
- [ ] Alerts are configured for all four golden signals before the service goes to production.
- [ ] Storage lifecycle policies exist for all S3/GCS buckets; objects transition to cheaper tiers after 30 days.
- [ ] Egress costs were estimated at design time; PrivateLink/Private Service Connect used where applicable to reduce internet egress.
