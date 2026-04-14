---
name: cost-engineering
description: Expert reference for cloud cost optimization, FinOps practices, and infrastructure unit economics
version: 1.0
---

# Cost Engineering Expert Reference

## Non-Negotiable Standards

1. **Unit cost metrics, not just total spend**: Total cloud bill is a vanity metric. The meaningful numbers are cost per active user, cost per API call, cost per GB processed, cost per transaction. If you can't state your unit economics, you can't optimize them.
2. **Tagging is enforced via policy, not documentation**: A tagging standard in a wiki that teams ignore is not a tagging standard. Tags are enforced by SCPs (AWS), Azure Policy, or GCP org policies that deny resource creation without mandatory tags.
3. **Reserved capacity decisions are made from usage data, not estimates**: Commit only after measuring 60-90 days of actual usage patterns. Committing to reserved instances on estimated usage is how teams overpay for unused capacity.
4. **Cost anomaly detection runs continuously**: Waiting for the monthly invoice to discover a $40K spike is unacceptable. Real-time or daily cost anomaly alerts per service are non-negotiable in production.
5. **Engineering teams own their cost**: FinOps is not a finance function that sends reports to engineering. Engineers who write the code make the spend decisions — they need cost visibility in their workflow (daily/weekly cost attribution per team/service).

---

## Decision Rules

**If** a workload runs >60% of the time at consistent utilization → purchase Reserved Instances or Committed Use Discounts. 1-year no-upfront saves ~40% vs on-demand; 3-year all-upfront saves ~60%. Never commit without usage data.

**If** a workload is fault-tolerant and interruptible (batch jobs, ML training, data processing) → use Spot Instances (AWS) or Preemptible VMs (GCP) or Spot VMs (Azure). Discount: 70-90% vs on-demand. Design for interruption: checkpointing, retry logic.

**If** S3 access pattern is unknown or mixed → enable S3 Intelligent-Tiering for objects >128KB. Automatically moves objects between frequent/infrequent/archive tiers. Monitoring fee: $0.0025/1000 objects — cost-effective above 128KB.

**If** data needs to be retained but rarely accessed for >90 days → move to Glacier or Archive tier. Glacier: ~$0.004/GB/month vs Standard $0.023/GB/month.

**If** Lambda functions are behind a NAT Gateway → evaluate moving to VPC endpoints for S3, DynamoDB, SQS. NAT Gateway costs $0.045/GB of data processed — VPC endpoints eliminate this for AWS services.

**If** cross-AZ traffic is significant → restructure to keep traffic within the same AZ where possible. Cross-AZ data transfer: $0.01/GB each way. Egress to internet: $0.09/GB first 10TB. These are often the #1 hidden cost.

**If** RDS or ElastiCache instances are running at <20% utilization → right-size down one instance class. AWS Compute Optimizer and GCP Recommender provide specific right-sizing recommendations.

**If** tagging compliance is below 95% → block with automated policy. Untagged resources cannot be attributed to teams, creating invisible cost centers.

**Never** delete or stop resources to reduce cost without checking for dependencies — use tagging and cost allocation first to understand what each resource serves.

**Never** report cost as absolute dollars alone — always show trend (MoM change), unit cost (per customer/call/GB), and budget variance (actual vs plan).

---

## Mental Models

**The FinOps Maturity Loop**
```
INFORM → OPTIMIZE → OPERATE → back to INFORM
  ↓           ↓          ↓
Visibility  Action    Culture
Tag everything  Right-size  Engineers own cost
Allocate cost   Reserve     Forecasting
Anomaly detect  Spot/Preempt Cost in CI/CD
Unit economics  Waste cleanup  Accountability
```

**Cloud Cost Lever Priority (ROI-ranked)**
```
1. Waste elimination   → Unattached EBS, idle instances, orphaned snapshots (pure savings)
2. Right-sizing        → Oversized instances (immediate, low risk)
3. Reserved/CUD        → Steady workloads >60% utilization (40-60% discount)
4. Spot/Preemptible    → Fault-tolerant batch/ML (70-90% discount)
5. Architecture change → NAT Gateway → VPC endpoints, cross-AZ reduction
6. Storage tiering     → Intelligent-Tiering, Glacier transition
```
Work top-to-bottom. Waste first. Never commit reserved capacity on oversized instances.

**Unit Cost Decomposition**
```
Total Cloud Bill
    ├── Compute ($X) → cost per active user: $X / MAU
    ├── Storage ($X) → cost per GB stored: $X / TB
    ├── Data Transfer ($X) → cost per API call: $X / M calls
    ├── Database ($X) → cost per transaction: $X / M txn
    └── AI/ML ($X) → cost per inference: $X / K tokens
```

---

## Vocabulary

| Term | Precise Meaning |
|---|---|
| FinOps | Financial Operations — practice of bringing financial accountability to cloud spend |
| Unit economics | Cost measured per unit of business value (per user, per call, per transaction) |
| Reserved Instance (RI) | Commitment to use specific compute for 1 or 3 years in exchange for 40-60% discount |
| Committed Use Discount (CUD) | GCP equivalent of Reserved Instances — commit to spend or resource level |
| Savings Plans | AWS flexible discount commitment — covers any EC2/Fargate/Lambda usage, not specific instance type |
| Spot Instance | Spare cloud capacity at 70-90% discount — can be interrupted with 2-min notice |
| Right-sizing | Matching instance type and size to actual workload requirements |
| Showback | Reporting cost attribution to teams without charging back — awareness without consequence |
| Chargeback | Billing business units for their cloud consumption — requires mature tagging and buy-in |
| Egress cost | Data transfer out of cloud to internet — often $0.09/GB, frequently the #1 surprise cost |
| Intelligent-Tiering | AWS S3 feature that auto-moves objects between access tiers based on usage patterns |
| CUDOS | AWS Cost and Usage Dashboard — the reference architecture for cost visibility in AWS |

---

## Common Mistakes and How to Avoid Them

**Mistake 1: Buying Reserved Instances on estimated usage**
- Bad: "We're planning to run 10 c5.2xlarge instances for the next year — buy 1yr RI upfront"
- Fix: Run on-demand for 60-90 days. Analyze actual utilization with Compute Optimizer. Buy RIs only for the baseline steady-state capacity confirmed by data.

**Mistake 2: Ignoring data transfer costs**
- Bad: Architecture designed for functionality with no thought to data paths — inter-AZ calls, NAT Gateway egress, CloudFront origin fetch costs appear at month end as surprise
- Fix: In every architecture review, explicitly map data flows and estimate transfer costs. Use VPC endpoints for AWS-to-AWS traffic. Keep high-volume traffic within the same AZ.

**Mistake 3: Tagging as documentation not enforcement**
- Bad: "We have a tagging policy in Confluence" — actual tag compliance is 30%
- Fix: SCP in AWS denying `ec2:RunInstances`, `rds:CreateDBInstance`, etc. without `Team` and `Environment` tags. Non-compliant resources cannot be created.

**Mistake 4: Cost visibility only for leadership**
- Bad: Engineering teams see no cost data; only FinOps team and VP Engineering get monthly reports
- Fix: Weekly cost-per-service Slack report to each team's channel. Cost tag in CI/CD showing estimated monthly delta of each infrastructure change. Engineers who see their cost reduce it.

**Mistake 5: Right-sizing without load testing**
- Bad: Downsizing an instance class based on average CPU utilization (30%) without checking peak
- Fix: Check p99 utilization and peak traffic patterns before downsizing. Average 30% with p99 85% → downsize cautiously or use auto-scaling. Average 30% with p99 45% → downsize freely.

---

## Good vs. Bad Output

**BAD cost report:**
> "Cloud spend this month: $142,000. Up from $128,000 last month."

**GOOD cost report:**
```
Cloud Cost Summary — April 2025

Total: $142,000 (+$14K MoM, +11%)
Budget: $135,000 — OVER by $7K ⚠

Unit Economics:
  Cost per active user:  $0.83 (prev: $0.79, +5%) ⚠
  Cost per API call:     $0.0021 (prev: $0.0019, +10%) ⚠
  Gross margin impact:   68.2% (prev: 69.1%, -0.9pp)

Top Cost Drivers (vs last month):
  +$9K — Data transfer (investigate: new EMEA PoP cross-AZ traffic)
  +$3K — RDS (new analytics replica added, review necessity)
  +$4K — EC2 (legitimate growth, in line with user growth)
  -$2K — S3 (Intelligent-Tiering saving as expected)

Optimization Opportunities:
  1. 3× m5.2xlarge at <15% utilization → downsize saves ~$800/mo
  2. NAT Gateway: $4,200 → VPC endpoints for S3/DynamoDB saves ~$2,500/mo
  3. 8× unattached EBS volumes → delete saves $340/mo
```

---

## Cost Engineering Checklist

- [ ] Unit cost metrics defined and tracked (per user, per call, per GB)
- [ ] Mandatory tags enforced via policy (not just documented)
- [ ] Cost anomaly detection configured with daily alerts per service
- [ ] Reserved Instance / CUD coverage reviewed quarterly (target >70% for baseline)
- [ ] Spot/Preemptible used for all fault-tolerant batch and ML training workloads
- [ ] Unattached EBS volumes, idle instances, orphaned snapshots cleaned weekly
- [ ] Data transfer paths mapped — cross-AZ and egress costs minimized
- [ ] VPC endpoints used for AWS service traffic (S3, DynamoDB, SQS) to eliminate NAT Gateway charges
- [ ] Right-sizing recommendations reviewed monthly (Compute Optimizer / GCP Recommender)
- [ ] S3 Intelligent-Tiering enabled for buckets with mixed/unknown access patterns
- [ ] Cost allocated to teams — weekly per-team cost report distributed
- [ ] Architecture reviews include data transfer cost estimation
