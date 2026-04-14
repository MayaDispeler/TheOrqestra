---
name: aws-architecture
description: AWS Well-Architected design decisions, account structures, IAM patterns, compute selection, and cost traps for production workloads
version: 1.0
---
# AWS Architecture Expert Reference

## Non-Negotiable Standards

1. **Roles, never long-lived credentials.** No IAM users with access keys for applications. All compute (Lambda, EC2, ECS tasks, EKS pods) uses instance roles or task roles. Cross-account access via `sts:AssumeRole` only.
2. **VPC per environment minimum.** `/16` CIDR per VPC. `/24` per subnet. Three AZs for every production workload. Never share a VPC between production and non-production.
3. **SCPs enforce guardrails at the OU level.** Deny `s3:DeleteBucket`, `iam:CreateUser`, `ec2:DisableEbsEncryptionByDefault`, and `cloudtrail:StopLogging` org-wide via SCP. Permission boundaries constrain developer-created roles in Workload OUs.
4. **Encrypt at rest and in transit by default.** KMS CMKs (not AWS-managed keys) for RDS, S3, EBS, Secrets Manager. `aws:SecureTransport` condition on every S3 bucket policy. TLS 1.2 minimum on all ALBs.
5. **Tag or it gets terminated.** Four mandatory tags enforced via SCP `aws:RequestTag` condition key: `Environment`, `Team`, `CostCenter`, `Project`. Resources missing tags fail creation.
6. **VPC endpoints before NAT Gateway for AWS services.** S3 and DynamoDB gateway endpoints are free. PrivateLink interface endpoints ($0.01/hr + $0.01/GB) still cheaper than NAT Gateway at scale ($0.045/GB processed).

---

## Decision Rules

**IF** workload runtime < 15 minutes AND memory < 10 GB AND invocation is event-driven → **USE Lambda**. Anything longer requires ECS Fargate or EKS.

**IF** you need containers without managing a control plane AND no K8s-specific APIs required → **USE ECS Fargate**. EKS adds ~$0.10/hr cluster fee plus node management overhead.

**IF** workload requires K8s-native APIs (HPA, custom controllers, service mesh, Helm ecosystem) OR team already runs K8s → **USE EKS**. Use managed node groups or Karpenter for node provisioning.

**IF** workload needs specific OS configuration, GPU instances, or >192 GB memory → **USE EC2**. Otherwise avoid self-managed instances.

**IF** you have more than 3 VPCs that need transitive connectivity → **USE Transit Gateway** ($0.05/GB + $0.07/hr/attachment). VPC peering is non-transitive; it breaks at 3+ VPCs.

**IF** on-premises bandwidth requirement is >1 Gbps steady-state → **USE Direct Connect**. Site-to-site VPN caps at 1.25 Gbps aggregate and adds jitter.

**IF** database is relational and not on a special engine → **USE RDS** (Multi-AZ for production). Self-managed on EC2 loses automated backups, patch management, and failover.

**NEVER** put NAT Gateway egress on a hot path for S3 or DynamoDB traffic. At $0.045/GB, a workload pushing 10 TB/month pays $450 in NAT Gateway fees that a free gateway endpoint eliminates.

**NEVER** create IAM users for CI/CD pipelines. Use OIDC federation: GitHub Actions → `sts:AssumeRoleWithWebIdentity`. AWS CodeBuild uses the service role automatically.

**IF** cross-AZ data transfer cost is a concern (bill line item >$500/month) → co-locate cache and compute in the same AZ. ElastiCache cluster mode distributes data across AZs; pin application and cache nodes to the same AZ for read replicas.

---

## Mental Models

**The Landing Zone Pyramid**
Organization Root sits above Security OU (Log Archive account, Audit account) and Infrastructure OU (shared services, networking). Workload OUs hold prod/non-prod accounts per team. Sandbox OU has relaxed SCPs and auto-termination. SCPs applied at each level are additive restrictions — child OUs cannot exceed parent permissions. Control Tower automates this with Account Factory.

**The Blast Radius Principle**
Every IAM role, VPC, and account boundary is a blast radius limiter. A compromised Lambda execution role with `*` permissions is account-wide. A role scoped to a single S3 bucket prefix is contained. Design IAM by answering: "If this credential is compromised, what is the maximum damage?" then tighten until that answer is acceptable.

**The Cost Cliff Model**
AWS costs have three cliffs: (1) Data egress to internet at $0.09/GB first 10 TB — minimize by using CloudFront as the egress layer; (2) NAT Gateway at $0.045/GB — eliminate with VPC endpoints; (3) Cross-AZ transfer at $0.01/GB — invisible in dashboards but compounds at scale. Model all three before architecture is finalized.

**The Managed Service Ratchet**
Every self-managed component (Redis on EC2, RabbitMQ on EC2, PostgreSQL on EC2) requires patching, failover automation, backup scripting, and monitoring instrumentation. The break-even where self-managed is cheaper than ElastiCache/SQS/RDS is almost never reached before operational burden exceeds cost savings. Default to managed; deviate with written justification.

---

## Vocabulary

| Term | Precise Definition |
|------|-------------------|
| SCP (Service Control Policy) | IAM policy attached to AWS Organizations OU or account; sets maximum permissions — does not grant access, only restricts. Evaluated before identity-based policies. |
| Permission Boundary | IAM managed policy attached to a role or user that defines the maximum permissions that identity-based policies can grant. Used to delegate role creation without privilege escalation. |
| AWS Control Tower | Managed service that provisions a well-architected multi-account environment using Account Factory, guardrails (SCPs + Config rules), and a Log Archive/Audit account baseline. |
| Transit Gateway | Regional hub-and-spoke router for VPCs and VPN connections. Supports transitive routing. $0.05/GB + $0.07/hr per attachment. Replaces VPC peering mesh at >3 VPCs. |
| PrivateLink (Interface Endpoint) | Elastic network interface in your VPC that privately routes traffic to AWS services or third-party SaaS without traversing the internet. $0.01/hr + $0.01/GB. |
| Gateway Endpoint | Free VPC endpoint for S3 and DynamoDB only. Routes traffic via prefix list in the route table, not via ENI. No hourly charge, no per-GB charge. |
| IRSA (IAM Roles for Service Accounts) | EKS feature using OIDC to map a Kubernetes service account to an IAM role. Pod-level IAM without node instance role over-provisioning. |
| Karpenter | Open-source Kubernetes node provisioner that launches right-sized EC2 instances in response to unschedulable pods. Replaces Cluster Autoscaler with faster provisioning. |
| Reserved Instance (RI) | 1- or 3-year commitment to an instance family/region for up to 72% discount. Convertible RIs allow instance family changes. Savings Plans are the flexible alternative. |
| NAT Gateway | Managed network address translation for private subnet outbound internet. $0.045/GB processed + $0.045/hr. Single AZ — deploy one per AZ for HA. |
| AWS Config | Continuous resource configuration recording and compliance evaluation. Feeds Security Hub. Mandatory in all accounts; enable organization-wide aggregation. |
| Cross-AZ Data Transfer | Traffic between EC2, RDS, ElastiCache, etc. in different AZs within the same region billed at $0.01/GB each direction. Frequently the invisible cost component. |

---

## Common Mistakes and How to Avoid Them

**1. Wildcard IAM policies on production roles**
Bad: `Action: "*", Resource: "*"` on a Lambda execution role.
Fix: Enumerate exact actions and ARNs. Use IAM Access Analyzer to generate a least-privilege policy from CloudTrail evidence after a test run. Policy simulator to verify before deploy.

**2. Single NAT Gateway for all AZs**
Bad: One NAT Gateway in us-east-1a serving subnets in 1b and 1c. Adds cross-AZ transfer cost and creates an AZ-level single point of failure.
Fix: One NAT Gateway per AZ. Route table for each AZ's private subnet points to the NAT Gateway in that same AZ.

**3. VPC CIDR too small to scale**
Bad: `/24` VPC CIDR — only 256 addresses, subnets become `/27` or smaller, EKS node ENIs exhaust IPs.
Fix: `/16` per VPC minimum. EKS with VPC-CNI uses one IP per pod; a `/16` gives 65,536 addresses. Allocate non-overlapping RFC 1918 ranges per account at the Organization level.

**4. Hardcoded credentials in Lambda environment variables**
Bad: `DB_PASSWORD=plaintext` in Lambda configuration. Visible to anyone with `lambda:GetFunctionConfiguration`.
Fix: Store in AWS Secrets Manager or SSM Parameter Store (SecureString). Lambda role has `secretsmanager:GetSecretValue` for the specific secret ARN only. Rotate automatically via Secrets Manager rotation Lambda.

**5. Missing resource-based policies on S3 buckets**
Bad: S3 bucket with only `BlockPublicAccess` and no bucket policy — relies on account-level settings that can be changed.
Fix: Explicit bucket policy denying `s3:*` unless `aws:SecureTransport` is true AND `aws:PrincipalOrgID` matches. Add `s3:PutBucketPublicAccessBlock` to the deny SCP so no individual can override.

---

## Good vs. Bad Output

**Bad IAM Policy (Lambda role):**
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "*",
    "Resource": "*"
  }]
}
```

**Good IAM Policy (Lambda role scoped to specific operations):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadOrdersTable",
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:Query"],
      "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/Orders"
    },
    {
      "Sid": "PublishToOrdersTopic",
      "Effect": "Allow",
      "Action": "sns:Publish",
      "Resource": "arn:aws:sns:us-east-1:123456789012:OrderEvents"
    },
    {
      "Sid": "WriteToOrdersSecret",
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789012:secret:orders/db-??????"
    }
  ]
}
```

**Bad VPC design:** Single NAT Gateway, /24 VPC CIDR, 2 AZs, no VPC endpoints, public subnets hosting RDS.

**Good VPC design:**
```
VPC: 10.10.0.0/16
  AZ-1a: Public 10.10.0.0/24 | Private-App 10.10.10.0/24 | Private-Data 10.10.20.0/24
  AZ-1b: Public 10.10.1.0/24 | Private-App 10.10.11.0/24 | Private-Data 10.10.21.0/24
  AZ-1c: Public 10.10.2.0/24 | Private-App 10.10.12.0/24 | Private-Data 10.10.22.0/24
  Gateway Endpoints: S3, DynamoDB (free, in route tables for all private subnets)
  NAT Gateway: One per AZ in public subnets
  ALB: Public subnets only
  ECS Tasks / Lambda (VPC mode): Private-App subnets
  RDS Multi-AZ: Private-Data subnets, no route to internet
```

---

## Checklist

- [ ] Every AWS account enrolled in AWS Organizations with Control Tower; SCP guardrails applied at OU level
- [ ] Mandatory tags (`Environment`, `Team`, `CostCenter`, `Project`) enforced via SCP `aws:RequestTag` condition; tag policy enabled
- [ ] No IAM users with programmatic access keys; all application access via roles; OIDC federation for GitHub Actions and external CI
- [ ] VPC CIDR `/16` minimum; three AZs for production; NAT Gateway one-per-AZ; S3 and DynamoDB gateway endpoints in all private route tables
- [ ] Permission boundaries applied to all IAM roles created by developers in Workload OUs
- [ ] Compute selection justified: Lambda (<15 min/<10 GB), Fargate (containers, no K8s), EKS (K8s APIs required), EC2 (OS/GPU specific)
- [ ] RDS Multi-AZ for all production relational databases; automated backups enabled with 35-day retention; encryption at rest with CMK
- [ ] Secrets in Secrets Manager (not SSM for credentials), rotation enabled; no plaintext in environment variables or source code
- [ ] CloudTrail organization trail enabled; logs to Log Archive account S3 bucket with MFA delete and Object Lock
- [ ] AWS Config organization-wide aggregation; Security Hub enabled with CIS AWS Foundations Benchmark standard
- [ ] Cost allocation tags activated in Billing console; monthly budget alerts at 80% and 100% per account
- [ ] Cross-AZ traffic cost estimated in architecture review; ElastiCache read replicas pinned to same AZ as application where latency allows
