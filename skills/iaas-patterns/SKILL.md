---
name: iaas-patterns
description: Expert reference for Infrastructure-as-a-Service patterns, VM sizing, auto-scaling, and HA design
version: 1.0
---

# IaaS Patterns Expert Reference

## Non-Negotiable Standards

1. **Total Cost of Ownership includes operational overhead**: Raw VM cost is not the IaaS cost. Add 30-40% for patching, monitoring, HA engineering, and operational labor. This must be in the IaaS vs PaaS comparison or the comparison is dishonest.
2. **Production workloads are multi-AZ by default**: A single-AZ deployment is not production-ready. Minimum two AZs with automated failover. The cost delta between single-AZ and multi-AZ is 2×; the availability delta is the difference between 99.9% and 99.99%.
3. **Sizing decisions are data-driven**: Run workloads for 60-90 days before committing to reserved capacity. Size to 70% average utilization — not peak, not estimate. Use cloud provider right-sizing recommendations (Compute Optimizer, GCP Recommender) as input.
4. **Immutable infrastructure over patching in place**: Replace instances rather than patching running VMs. Patching in place leads to configuration drift, undocumented changes, and snowflake servers that can't be reproduced. Use AMIs/images baked in CI.
5. **Auto-scaling groups manage stateless tier; stateful tier is explicitly managed**: Application servers are in ASGs. Databases, caches, and file stores are never in ASGs. Stateful components have their own HA strategy (RDS Multi-AZ, ElastiCache with replica, EFS multi-AZ).

---

## Decision Rules

**If** the workload requires a specific OS version, kernel module, or hardware feature → IaaS is appropriate. PaaS abstracts the OS; use IaaS when the OS is load-bearing.

**If** the workload is CPU-bound (ML inference, video transcoding, scientific computing) → compute-optimized instances (c-series AWS, c2 GCP). Never general-purpose for CPU-bound work.

**If** the workload is memory-bound (in-memory databases, large JVM heaps, Elasticsearch) → memory-optimized instances (r-series AWS, m2 GCP). Rule of thumb: if your process needs >50% of instance RAM, go memory-optimized.

**If** the workload is batch/ML training and fault-tolerant → Spot Instances (AWS) or Preemptible VMs (GCP). 70-90% discount vs on-demand. Design for interruption: checkpoint every 10 minutes, handle SIGTERM with a 2-minute grace period.

**If** a workload has been running at consistent utilization for 60+ days → purchase Reserved Instances or CUDs. 1-year no-upfront saves ~40%; 3-year all-upfront saves ~60%. Never buy reserved without usage data.

**If** ASG health checks keep replacing instances that aren't actually broken → the health check threshold is too sensitive. Increase the unhealthy threshold count (default 2, consider 3-5) and add a grace period equal to application startup time + buffer.

**If** deploying a new instance type that hasn't been tested → use Canary deployment via weighted ASG: 10% new instance type, 90% existing. Validate performance metrics before full migration.

**Never** put stateful workloads (databases, caches) in an auto-scaling group. Horizontal scale for stateful systems requires explicit orchestration, not automated add/remove.

**Never** use default security groups. Every application gets its own security group with the minimum required inbound and outbound rules documented and justified.

---

## Mental Models

**IaaS vs PaaS Decision Framework**
```
Question                                          | IaaS | PaaS
--------------------------------------------------|------|------
Specific OS or kernel version required?           |  ✓   |
Existing software license to port (Windows/SQL)?  |  ✓   |
Compliance requires dedicated hardware?           |  ✓   |
Custom networking (BGP, MPLS, specific MTU)?      |  ✓   |
Team <5 engineers managing infrastructure?        |      |  ✓
Time-to-market is primary constraint?             |      |  ✓
Managed service covers 80%+ of needs?             |      |  ✓
No specialized OS/runtime requirements?           |      |  ✓

When in doubt: add 35% to IaaS base cost for hidden operational overhead
and compare to PaaS total cost.
```

**Instance Type Selection Guide**
```
Workload Type         | AWS Family | GCP Family | When
----------------------|------------|------------|---------------------------
General web/API       | m-series   | n2-standard | Default starting point
CPU-intensive         | c-series   | c2/c3       | Video, ML inference, builds
Memory-intensive      | r-series   | m2/m3       | DBs, JVM, Elasticsearch
GPU compute           | p/g-series | a2/g2       | ML training, rendering
Storage-intensive     | i-series   | z3          | High IOPS local storage
Burstable (dev/test)  | t-series   | e2-micro    | Variable/low sustained CPU
```

**Multi-AZ HA Architecture**
```
Region
├── AZ-1
│   ├── App Tier: ASG instances
│   ├── Data Tier: RDS Primary
│   └── Cache: ElastiCache Primary
└── AZ-2
    ├── App Tier: ASG instances (traffic split via ALB)
    ├── Data Tier: RDS Standby (auto-failover in <60s)
    └── Cache: ElastiCache Replica

ALB routes to both AZs. If AZ-1 fails:
- ALB stops routing to AZ-1 targets (health check fails)
- RDS auto-fails over to AZ-2 standby
- ElastiCache promotes replica to primary
- Application continues serving from AZ-2
```

---

## Vocabulary

| Term | Precise Meaning |
|---|---|
| ASG | Auto Scaling Group — manages a fleet of EC2 instances with automatic add/remove |
| AMI | Amazon Machine Image — pre-built OS + software image used to launch EC2 instances |
| Reserved Instance | Commitment to use specific instance type for 1 or 3 years for 40-60% discount |
| Spot Instance | Spare EC2 capacity at 70-90% discount; can be reclaimed with 2-minute notice |
| Target tracking | ASG scaling policy that maintains a metric at a target value (e.g., 70% CPU) |
| Warm pool | Pre-initialized instances kept in standby to reduce scale-out latency |
| Health check grace period | Time after instance launch before ASG starts health check evaluation |
| Placement group | Logical grouping of instances affecting placement within AWS infrastructure |
| User data | Bootstrap script run at instance launch (install software, configure app) |
| IOPS | Input/Output Operations Per Second — primary storage performance metric |
| EBS | Elastic Block Store — persistent block storage for EC2 instances |
| Throughput | MB/s of data transfer; relevant for large sequential I/O (vs IOPS for random I/O) |

---

## Common Mistakes and How to Avoid Them

**Mistake 1: Single-AZ production**
- Bad: All instances in `us-east-1a` because it was the default
- Fix: Specify all three AZs in the ASG configuration. ALB distributes across AZs automatically. RDS Multi-AZ enabled. Cost increase ~2×; availability increase from 99.9% to 99.99%.

**Mistake 2: Over-provisioned instances with no right-sizing**
- Bad: 20× m5.4xlarge instances running at 12% average CPU for 2 years
- Fix: Monthly Compute Optimizer review. Instances consistently below 30% average → downsize. At 12% average, likely 2× oversized. Right-sizing saves 40-50% on compute.

**Mistake 3: Patching in place creating snowflakes**
- Bad: `ssh ec2-user@prod-app-01 && sudo yum update -y` — now prod-app-01 is different from prod-app-02
- Fix: Golden AMI pipeline: base image → install dependencies → bake AMI → test → roll out via ASG instance refresh. All instances identical; rollback = swap AMI.

**Mistake 4: Security groups with 0.0.0.0/0 egress**
- Bad: Default `allow all outbound` security group applied to app instances
- Fix: Restrict egress to: database port to DB security group, cache port to cache security group, HTTPS (443) to specific CIDR or prefix list for external APIs. Default-deny egress catches data exfiltration.

**Mistake 5: Using Spot for stateful workloads**
- Bad: Running the primary database on a Spot instance to save money
- Fix: Spot is only for fault-tolerant, stateless, checkpoint-able workloads. Databases, primary caches, and coordination services must run on on-demand or reserved instances.

---

## Good vs. Bad Output

**BAD infrastructure design (single-AZ, no ASG):**
```
Region: us-east-1
  AZ: us-east-1a only
    EC2: prod-web-01 (manual, no ASG)
    EC2: prod-web-02 (manual, no ASG)
    RDS: Single-AZ MySQL (no standby)

Issues: AZ failure = full outage. No auto-recovery. No auto-scaling.
```

**GOOD infrastructure design (multi-AZ, ASG, HA):**
```
Region: us-east-1
  ALB: routes to all AZs, health checks every 30s

  AZ: us-east-1a          AZ: us-east-1b          AZ: us-east-1c
    ASG: 2-6 instances      ASG: 2-6 instances      ASG: 2-6 instances
    (target 70% CPU)        (target 70% CPU)        (target 70% CPU)

  RDS: Multi-AZ (primary us-east-1a, standby us-east-1b, auto-failover <60s)
  ElastiCache: primary + replica across 2 AZs

ASG Config:
  - LaunchTemplate: AMI baked in CI, updated weekly
  - HealthCheck: ELB type, 300s grace period
  - TargetTrackingPolicy: CPU 70%
  - WarmPool: 2 pre-initialized instances
  - Lifecycle hooks: drain connections before termination
```

---

## IaaS Checklist

- [ ] Production deployment spans minimum 2 AZs (3 recommended)
- [ ] Application tier in Auto Scaling Group with target tracking policy
- [ ] AMI/image baked in CI pipeline — no manual OS patching
- [ ] Instance type selected for workload profile (general/compute/memory/GPU)
- [ ] Sizing based on 60+ days of measured utilization data
- [ ] Reserved Instances/CUDs purchased for baseline steady-state capacity
- [ ] Spot Instances used for fault-tolerant batch workloads only
- [ ] RDS Multi-AZ enabled for production databases
- [ ] Custom security groups per application (no default group, no 0.0.0.0/0 egress)
- [ ] Health check grace period set to application startup time + 60s buffer
- [ ] Warm pool configured for latency-sensitive scale-out
- [ ] Monthly Compute Optimizer review scheduled
