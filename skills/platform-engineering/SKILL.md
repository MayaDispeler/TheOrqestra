---
name: platform-engineering
description: Expert reference for building and operating internal developer platforms — IDP, golden paths, self-service, and paved roads
version: 1.0.0
---

# Platform Engineering — Expert Reference

## Non-Negotiable Standards

- The platform is a product. It has customers (developers), a roadmap, SLOs, and a feedback loop.
- Golden paths must be easier than alternatives. If the "right way" requires 10 steps, developers will find a 3-step workaround.
- Platform teams do not block delivery teams. Self-service is the goal; tickets are the failure mode.
- Every platform capability ships with documentation that enables a developer to succeed without asking anyone.
- Platform abstractions must not leak. A developer should not need to understand Kubernetes to deploy an app.
- Opinions are a feature. Fewer choices at the application level mean faster delivery and more consistent operations.

---

## Decision Rules

**Build vs Buy**
- If the capability is not core to your business differentiation → buy/adopt OSS before building.
- If you are evaluating two tools → prefer the one with the larger operator community (Kubernetes > custom scheduler).
- If you build an internal tool → you own it forever. Budget for maintenance before committing.
- Never fork an open-source tool for non-trivial reasons. Upstream contributions over private forks.

**Golden Path Design**
- If a delivery team needs to solve the same problem twice → codify it into the platform.
- If a golden path requires understanding the underlying infrastructure → the abstraction is leaking. Fix it.
- If your golden path has 10+ steps → it is a workflow, not a path. Automate the steps.
- Never build a golden path for an audience of one team. Solve the general case or don't abstract.
- If a team bypasses the golden path → treat it as a product gap, not a compliance failure.

**Infrastructure as Code**
- All infrastructure is code. No ClickOps for anything that will exist longer than a day.
- If something was created manually → import it into IaC before touching it again.
- If two environments diverge → the IaC is the truth. Environments must be reconciled.
- Never commit secrets to IaC repos. Use secret references (SSM Parameter Store, Vault) in code; values live in the secret store.
- Every IaC module has a `README`, inputs/outputs documented, and an example in `examples/`.

**Self-Service Portals (IDP)**
- If a developer action requires a Slack message or Jira ticket to a platform team → it must be self-service.
- If a scaffolding template is used more than 5 times → it belongs in the platform, not a team wiki.
- If an internal tool requires training to use → the UX is failing. Simplify before documenting.
- Never expose raw Kubernetes YAML or Terraform HCL to application developers as the primary interface.

**Multi-Tenancy and Isolation**
- If workloads share infrastructure → resource limits (CPU, memory, network) are mandatory. No noisy neighbors.
- If a team's deployment can affect another team's availability → they should be isolated (separate namespaces, accounts, or clusters).
- If cost visibility matters → tag everything. Account/namespace per team is the gold standard.

---

## Common Mistakes and How to Avoid Them

**Mistake: Platform as gatekeeper**
Every deployment requires a platform team approval or manual step. Delivery teams queue up and wait.
Fix: Asynchronous guardrails. Policy as code (OPA, Kyverno, Sentinel) enforces standards automatically. No human in the path.

**Mistake: Abstraction that leaks Kubernetes**
Developer docs say: "Create a Deployment, Service, HPA, PodDisruptionBudget, and NetworkPolicy."
Fix: A single app manifest (`app.yaml`) with `name`, `image`, `replicas`, `cpu`, `memory`. Platform controller generates the rest.

**Mistake: Snowflake environments**
Production differs from staging. Staging differs from dev. Bugs only reproduce in prod.
Fix: Parity via IaC modules. All environments instantiate the same module with different variable files. Drift detection in CI.

**Mistake: Secret sprawl**
Secrets in environment variables, hardcoded in config files, stored in team wikis, checked into repos.
Fix: One secret store (Vault, AWS Secrets Manager). Secrets injected at runtime by the platform, not stored in app config.

**Mistake: No internal developer portal (IDP)**
Developers have no single place to create services, view deployments, check logs, or understand ownership.
Fix: Adopt or build a portal (Backstage is the standard). Catalog all services, templates, documentation, and runbooks. Ownership is tracked here.

**Mistake: Versioning platform interfaces**
Platform team changes a Helm chart schema and breaks 30 teams.
Fix: Treat platform APIs like public APIs. Version them. Deprecation notices before removal. Migration tools provided.

---

## Good vs Bad Output

**Bad: Ticket-driven deployment**
```
Developer → Jira ticket → Platform team → Creates namespace → Configures RBAC →
Updates Ingress → Notifies developer (3 days later)
```

**Good: Self-service onboarding**
```
Developer → IDP form (name, team, resource profile) → Platform controller creates:
  - Namespace with labels
  - RBAC bindings
  - Network policies
  - Cost allocation tags
  - Backstage catalog entry
→ Developer gets a git repo with CI/CD pre-configured (10 minutes, zero tickets)
```

---

**Bad: Leaky abstraction — developer must author raw Kubernetes YAML**
```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:latest
        resources:
          requests:
            cpu: "250m"
            memory: "256Mi"
        livenessProbe: ...
        readinessProbe: ...
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
...
```

**Good: Application abstraction (Platform CR)**
```yaml
apiVersion: platform.company.io/v1
kind: Application
metadata:
  name: my-service
spec:
  image: myapp:1.2.3
  profile: standard  # maps to resource/scaling defaults
  port: 8080
  healthCheck: /health
```

---

**Bad: Environment drift**
```
Production: manually added Redis cache 3 months ago
Staging: no Redis
Dev: Redis configured differently
```

**Good: IaC parity**
```hcl
module "app_stack" {
  source      = "//modules/app-stack"
  environment = var.environment
  redis       = { enabled = true, size = var.redis_size[var.environment] }
}
# All envs use the same module. Drift alerts if console state diverges.
```

---

## Vocabulary and Mental Models

**Internal Developer Platform (IDP)** — The sum of all tools, services, workflows, and documentation that developers use to build, deploy, and operate software. Not a single product; a product area.

**Golden Path** — The recommended, well-supported way to do something. Optimized for simplicity. Teams can diverge but lose platform support when they do.

**Paved Road** — Synonym for golden path. The road is paved (easy to travel, maintained). Off-road is possible but slower and unsupported.

**Platform as a Product** — Platform capabilities have users (delivery teams), metrics (adoption, DORA, satisfaction), and a roadmap. Platform team is accountable to NPS from delivery teams.

**Cognitive Load** — The mental effort required for developers to use the platform. The platform's job is to minimize cognitive load at the application layer, accepting complexity at the platform layer.

**DORA Metrics** — Deployment Frequency, Lead Time for Changes, Mean Time to Restore (MTTR), Change Failure Rate. The canonical metrics for measuring platform effectiveness.

**Policy as Code** — Infrastructure and security policies expressed as machine-readable rules (OPA/Rego, Kyverno YAML, Sentinel HCL). Enforced automatically; no human approval needed.

**Backstage** — CNCF project for building internal developer portals. Provides Software Catalog, TechDocs, Software Templates (scaffolding), and a plugin ecosystem.

**GitOps** — Infrastructure and application state is declared in git. A controller (ArgoCD, Flux) continuously reconciles the cluster to match the git state. Git is the source of truth; the cluster is derived state.

**Soft Multi-tenancy** — Multiple teams share infrastructure with namespace/RBAC isolation. Good for cost efficiency. Noisy neighbor risk.

**Hard Multi-tenancy** — Separate clusters or cloud accounts per team. Strong isolation. Higher operational overhead.

**Idempotent Infrastructure** — Running `apply` multiple times produces the same result. Essential for IaC. Any resource creation that isn't idempotent is a bug.
