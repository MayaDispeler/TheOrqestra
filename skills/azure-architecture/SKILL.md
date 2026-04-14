---
name: azure-architecture
description: Azure landing zone design, Entra ID patterns, compute selection, networking with Private Endpoints, and cost optimization for enterprise workloads
version: 1.0
---
# Azure Architecture Expert Reference

## Non-Negotiable Standards

1. **Managed Identities over Service Principals everywhere possible.** For Azure-to-Azure authentication, system-assigned or user-assigned Managed Identity is mandatory. Service Principals are permitted only for non-Azure external systems, and only with certificate credentials — never password/client secret.
2. **Private Endpoints for all PaaS services in production.** Azure SQL, Storage Accounts, Key Vault, Azure OpenAI, Service Bus, Event Hubs, Azure Container Registry — all accessed via Private Endpoint. `publicNetworkAccess: Disabled` enforced via Azure Policy.
3. **Azure Policy at Management Group scope.** Policies enforcing encryption, allowed regions, SKU restrictions, and tag requirements assigned at the Platform or Workloads management group — not at subscription level. Deny effects for security policies; DeployIfNotExists for remediation.
4. **NSG on every subnet, no exceptions.** Default-deny inbound from internet. NSG flow logs enabled and sent to Log Analytics. Application Security Groups for east-west rules instead of IP-based rules inside a VNet.
5. **PIM for all privileged roles.** No standing Global Administrator, Subscription Owner, or Key Vault Administrator assignments. All privileged access via Entra ID Privileged Identity Management with approval workflow and 8-hour maximum activation.
6. **Log Analytics workspace is the single-pane backbone.** All Azure Monitor diagnostic settings point to the centralized workspace. Workspace-based Application Insights only (classic is deprecated). Retention: 90 days hot, 2 years archive tier via workspace data export.

---

## Decision Rules

**IF** workload is Azure-only IaC → **USE Bicep**. It has first-class Azure resource coverage, no state file management, and direct ARM API access. Terraform for Azure adds a provider lag of 3-6 months on new services and requires remote state management.

**IF** IaC spans multiple clouds (Azure + AWS or GCP) → **USE Terraform**. AzureRM provider is production-grade; use `azurerm_resource_group_template_deployment` as escape hatch for unsupported resources.

**IF** workload is HTTP-triggered, runs < 5 minutes, stateless, low sustained traffic → **USE Azure Functions** (Consumption Plan). Flex Consumption for predictable cold start with per-instance concurrency control.

**IF** workload is containerized, stateless, needs scale-to-zero, no K8s API required → **USE Azure Container Apps**. Built on KEDA and Envoy; handles HTTP and event-driven scaling natively. Cheaper than AKS for teams that don't need K8s primitives.

**IF** workload needs K8s-native APIs, Helm ecosystem, service mesh, or multi-tenancy via namespaces → **USE AKS**. Use System node pools (taint: `CriticalAddonsOnly`) separate from User node pools. Enable Workload Identity (replaces Pod Identity v1).

**IF** workload is a traditional web app (.NET, Java, Node) without containerization AND team is not investing in containers → **USE App Service** (P2v3 or higher for production). Enable Zone Redundancy on Premium v3 only.

**IF** CI/CD system is Azure DevOps with existing pipelines, RBAC, and audit trail requirements → **KEEP Azure DevOps**. ADO has tighter Entra ID integration, work item linking, and Boards integration. Migrating to GitHub Actions for ADO shops costs 6-12 weeks of pipeline rewrite.

**IF** greenfield project with no existing ADO investment → **USE GitHub Actions**. OIDC federation to Azure (`azure/login@v2` with `client-id`, `tenant-id`, `subscription-id` — no secrets stored).

**NEVER** assign `Contributor` at subscription scope to a Service Principal for CI/CD. Scope to the specific resource group. Use custom roles with only `Microsoft.Resources/deployments/write` and the target resource provider actions.

**IF** Azure OpenAI is required → deploy with Private Endpoint, content filters at severity Medium minimum for all four categories, PTU (Provisioned Throughput Units) only when monthly token consumption exceeds 500M tokens/month and pattern is predictable. Below that threshold, token-based (Pay-As-You-Go) is cheaper.

---

## Mental Models

**The Management Group Inheritance Chain**
Policy and RBAC assignments flow down: Tenant Root Group → Platform MG (connectivity, identity, management subscriptions) → Landing Zones MG → Corp MG (connected workloads) → Online MG (internet-facing). Each child inherits parent policies. Assign Deny policies at the highest applicable scope so they cannot be bypassed by subscription-level overrides. Never assign policy at the individual subscription level if the same policy applies to a whole OU equivalent.

**The Hub-Spoke Chokepoint Model**
All internet ingress/egress flows through Azure Firewall in the Hub VNet. Spoke VNets peer to the Hub (not to each other). User-Defined Routes force `0.0.0.0/0` to the Firewall private IP. The Firewall is the single inspection, logging, and FQDN filtering point. East-west spoke-to-spoke traffic also traverses the hub firewall — this creates a chokepoint but gives full visibility. For high-throughput spoke-to-spoke (>1 Gbps), evaluate Azure Virtual WAN with routing intent instead.

**The Identity Boundary Model**
Entra ID is the identity plane; Azure RBAC is the authorization plane; Azure Policy is the compliance plane. These are orthogonal. A user can have RBAC Contributor but a Deny policy blocks the action — policy wins. A Managed Identity has no Entra ID sign-in risk surface; it cannot be phished. Every architecture decision should ask: "Does this require a human credential that can be stolen?" If yes, replace with Managed Identity or reduce to time-limited PIM activation.

**The Cost Lever Hierarchy**
Reservations (1yr/3yr) save 40-72% on compute and SQL. Azure Hybrid Benefit saves 40% on Windows Server and 55% on SQL Server when you have SA-covered licenses. Spot VMs save 60-90% for fault-tolerant batch. Dev/Test subscription pricing saves 40-50% for non-production. Apply in that order — Spot on top of AHUB on top of Reservation is not combinable; Reserved Instances and AHUB stack.

---

## Vocabulary

| Term | Precise Definition |
|------|-------------------|
| Managed Identity | Azure AD identity assigned to an Azure resource (VM, Function, ACA). No credential to manage; token obtained from Instance Metadata Service. System-assigned: lifecycle tied to resource. User-assigned: independent lifecycle, shareable. |
| Private Endpoint | Network interface in your VNet that maps to a specific PaaS resource instance. Traffic stays on Microsoft backbone. DNS override required via Private DNS Zone linked to the VNet. |
| Azure Policy | Governance control plane. Effects: Deny (blocks non-compliant creates/updates), Audit (logs), DeployIfNotExists (auto-remediation), Modify (add/change tags/properties). Evaluated at request time and during compliance scan. |
| PIM (Privileged Identity Management) | Entra ID feature for just-in-time privileged role activation. Eligible assignments require approval, MFA, and justification. Activation window 1-8 hours. Audit log of every activation. |
| Conditional Access | Entra ID policy engine evaluating signals (user, location, device compliance, app, risk) to grant/deny/require MFA for authentication. Requires Entra ID P1 minimum. |
| Application Security Group | Logical grouping of NICs by role (e.g., WebTier, AppTier, DBTier) for use in NSG rules. Eliminates IP address management for east-west rules; membership is dynamic as VMs join the group. |
| AKS Workload Identity | OIDC-based federation between a Kubernetes service account and an Entra ID Managed Identity. Pod-level credential isolation without node MSI over-provisioning. Replaces AAD Pod Identity. |
| Log Analytics Workspace | Central store for Azure Monitor logs. Kusto Query Language (KQL) interface. Data tiers: Analytics (interactive query, 90-day default), Basic (cheap ingestion, 8-day query, long retention), Archive (2yr+, async query only). |
| Azure Firewall | Stateful, managed L4/L7 firewall. Premium SKU adds IDPS, TLS inspection, URL filtering. Priced at $1.25/hr + $0.016/GB. Required in hub for forced-tunnel spoke architectures. |
| PTU (Provisioned Throughput Units) | Azure OpenAI capacity reservation for guaranteed TPM (tokens per minute). One PTU = ~1,000 TPM for GPT-4o. Break-even vs token-based at ~500M tokens/month for sustained workloads. |
| Azure Hybrid Benefit | License portability for Windows Server (with SA) and SQL Server (with SA or subscription) to Azure VMs and SQL PaaS. Eliminates OS/SQL license cost, saving 40-55%. Must be declared and tracked. |
| Bicep | Domain-specific language that transpiles to ARM JSON. No state file, idempotent, native Azure resource API coverage same day as ARM. Modules for reuse; `targetScope` for subscription/MG deployments. |

---

## Common Mistakes and How to Avoid Them

**1. Service Principal with client secret in CI/CD pipeline**
Bad: App Registration with client secret stored as a pipeline variable, rotated manually every 90 days (or never).
Fix: Use GitHub Actions OIDC with `azure/login@v2` — no secret stored anywhere. For Azure DevOps, use Workload Identity Federation on the service connection (GA since 2024). Zero secrets to rotate, zero secrets to leak.

**2. PaaS resources with public network access enabled**
Bad: Azure SQL with firewall rules allowing `0.0.0.0` to `255.255.255.255` "for convenience." Storage Account with Blob public access enabled.
Fix: Azure Policy with Deny effect on `Microsoft.Sql/servers` where `publicNetworkAccess != Disabled`. Private Endpoint per resource. Private DNS Zone `privatelink.database.windows.net` linked to all VNets that need access.

**3. All Azure Monitor logs to the same workspace with default retention**
Bad: Single workspace, all diagnostic logs dumped in, 30-day retention default, no tiering. At high ingestion volume this costs $2.76/GB/month for Analytics tier on logs that are never queried.
Fix: Security logs (AAD sign-ins, Azure Firewall, NSG flow) → centralized workspace, 90-day Analytics + 1yr Archive. Application logs → per-workload workspace or Basic tier. Use DCR (Data Collection Rules) to filter noisy tables before ingestion.

**4. Over-permissive NSG rules using port ranges and Any source**
Bad: Inbound rule `Allow Any → Any → Port 0-65535` to "get it working."
Fix: See Good vs Bad NSG section below. Use Application Security Groups, not IP ranges. Default-deny all inbound; allowlist per port per source ASG.

**5. No zone redundancy on production App Service or AKS**
Bad: Single-zone App Service Plan P1v3 — one AZ failure takes down the app.
Fix: App Service Zone Redundancy requires Premium v3 and minimum 3 instances (automatically distributed across AZs). AKS: `--zones 1 2 3` on node pool creation. Availability Zones are free; the instances themselves cost the same.

---

## Good vs. Bad Output

**Bad NSG Rule Design:**
```
Priority 100: Allow | Source: Any | Source Port: * | Dest: Any | Dest Port: 0-65535 | TCP
Priority 200: Allow | Source: Any | Source Port: * | Dest: Any | Dest Port: 3389 | TCP  # RDP open to internet
Priority 65000: Allow VnetInbound
Priority 65500: Deny AllInbound
```

**Good NSG Rule Design (using Application Security Groups):**
```
# Subnet-level NSG on AppTier subnet
Priority 100: Allow | Source: ASG:LoadBalancer | Dest: ASG:WebTier  | Port: 443 | TCP | Inbound
Priority 110: Allow | Source: ASG:WebTier      | Dest: ASG:AppTier  | Port: 8080| TCP | Inbound
Priority 120: Allow | Source: ASG:AppTier      | Dest: ASG:DataTier | Port: 5432| TCP | Inbound
Priority 200: Allow | Source: AzureMonitor     | Dest: Any          | Port: *   | TCP | Outbound
Priority 4000: Deny | Source: Any              | Dest: Any          | Port: *   |     | Inbound
Priority 4001: Deny | Source: Any              | Dest: Any          | Port: *   |     | Outbound

# No IP addresses — only ASG names. RDP/SSH only via Azure Bastion, never direct NSG rule.
```

**Bad Bicep (hardcoded, no params, public access):**
```bicep
resource sqlServer 'Microsoft.Sql/servers@2023-05-01-preview' = {
  name: 'mysqlserver'
  location: 'eastus'
  properties: {
    administratorLogin: 'sqladmin'
    administratorLoginPassword: 'P@ssw0rd123!'  // hardcoded secret
    publicNetworkAccess: 'Enabled'
  }
}
```

**Good Bicep (parameterized, Key Vault reference, private only):**
```bicep
@description('SQL admin password from Key Vault')
@secure()
param administratorLoginPassword string

resource sqlServer 'Microsoft.Sql/servers@2023-05-01-preview' = {
  name: 'sql-${workloadName}-${environment}'
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    administratorLogin: 'sqladmin'
    administratorLoginPassword: administratorLoginPassword
    publicNetworkAccess: 'Disabled'
    minimalTlsVersion: '1.2'
  }
}
```

---

## Checklist

- [ ] Management Group hierarchy deployed: Tenant Root > Platform (connectivity/identity/mgmt) > Landing Zones (Corp/Online) > Sandbox; Azure Policy assigned at MG scope
- [ ] All PaaS services have `publicNetworkAccess: Disabled`; Private Endpoints provisioned; Private DNS Zones linked to all consumer VNets
- [ ] NSG on every subnet; NSG flow logs enabled; no inbound rules from `0.0.0.0/0`; RDP/SSH only via Azure Bastion
- [ ] Hub-Spoke topology with Azure Firewall in hub; UDRs forcing `0.0.0.0/0` to Firewall private IP on all spoke subnets
- [ ] No Service Principals with client secret credentials; Managed Identity or Workload Identity Federation for all Azure-to-Azure auth
- [ ] PIM enabled for all privileged roles; zero standing Owner/Contributor/Global Admin assignments; max activation 8 hours with approval
- [ ] Conditional Access policies: require MFA for all users; block legacy authentication protocols; require compliant device for admin roles
- [ ] Compute choice justified: Functions (event/<5min), Container Apps (serverless containers), AKS (K8s APIs needed), App Service (traditional web)
- [ ] AKS clusters: Workload Identity enabled; system/user node pool separation; `--zones 1 2 3`; Azure CNI or Azure CNI Overlay for production
- [ ] IaC choice documented: Bicep for Azure-only, Terraform for multi-cloud; no ARM JSON templates for new deployments
- [ ] Cost levers applied: Reservations for >1yr steady VMs/SQL; AHUB declared for Windows/SQL licensed workloads; Spot for batch
- [ ] Log Analytics workspace tiering configured: security logs Analytics 90d + Archive 1yr; application logs Basic tier; DCRs filtering noise before ingestion
