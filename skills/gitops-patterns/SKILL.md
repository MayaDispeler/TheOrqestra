---
name: gitops-patterns
description: Expert reference for GitOps workflows, ArgoCD/Flux patterns, and environment promotion strategies
version: 1.0
---

# GitOps Patterns Expert Reference

## Non-Negotiable Standards

1. **Git is the single source of truth for all cluster state**: If it's not in Git, it doesn't exist. Any resource manually applied to a cluster is drift and will be reconciled away. No exceptions for "quick fixes" — they go through Git.
2. **Pull-based model is required for production clusters**: Push-based (CI pipeline applies to cluster) means storing cluster credentials in CI. Pull-based (ArgoCD/Flux agent in cluster pulls from Git) limits the blast radius — compromised CI cannot directly modify production.
3. **Secrets never enter Git**: Not even encrypted with symmetric keys that live in the repo. Use External Secrets Operator pulling from Vault/AWS SM/GCP SM, or Sealed Secrets with asymmetric encryption where the private key never touches Git.
4. **Production sync policy is manual, not automatic**: Auto-sync with prune and selfHeal is appropriate for dev/staging. Production requires a PR approval + manual sync or an explicit promotion workflow. Automated prune in production has deleted running workloads.
5. **Rollback means reverting the Git commit**: `kubectl rollout undo` is not a rollback in GitOps — it creates drift between Git and the cluster. Rollback = revert the commit, push, wait for reconciliation.

---

## Decision Rules

**If** choosing between ArgoCD and Flux → ArgoCD: richer UI, App-of-Apps pattern, ApplicationSets, better for teams new to GitOps; Flux: lighter weight, more Kubernetes-native, better for GitOps purists and multi-tenancy at scale. Both are CNCF projects; either is a valid choice.

**If** managing multiple applications → use ArgoCD App-of-Apps pattern: a root Application manages child Applications, each pointing to a different directory/repo. Avoids managing N separate ArgoCD Applications manually.

**If** managing multiple environments or clusters with the same app → use ArgoCD ApplicationSet with a cluster generator or list generator. One ApplicationSet definition creates one Application per cluster/environment automatically.

**If** structuring the GitOps repository → prefer mono-repo with environment folders over branch-per-environment. Branches diverge silently; folders are always visible and comparable.

```
apps/
├── base/              # shared manifests (Kustomize base)
├── overlays/
│   ├── dev/           # dev-specific patches
│   ├── staging/       # staging-specific patches
│   └── prod/          # prod-specific patches
```

**If** promoting from staging to prod → promotion = a PR that copies/updates the image tag or config value in the `overlays/prod/` directory. Reviewed, approved, merged. ArgoCD detects the change and syncs.

**If** drift is detected (cluster state ≠ Git state) in production → alert immediately. In dev/staging: auto-remediate. In production: alert and require human decision — the drift might be intentional (incident mitigation).

**If** a sync wave is needed (database migration before app deployment) → use ArgoCD sync waves: `argocd.argoproj.io/sync-wave: "-1"` on the migration job, `"0"` on the application. Lower numbers sync first.

**Never** use `kubectl apply` directly on a production cluster managed by GitOps. It creates drift and will be overwritten by the next reconciliation — causing confusion about why the "fix" disappeared.

**Never** store Helm values files with secrets in Git, even as placeholders — automated scanning will flag them and security audits will fail.

---

## Mental Models

**Push vs Pull GitOps**
```
PUSH (CI-based):
Developer → Git commit → CI pipeline detects change → CI runs kubectl apply
Problem: Cluster credentials stored in CI. CI compromise = cluster compromise.

PULL (ArgoCD/Flux):
Developer → Git commit → ArgoCD agent polls Git → ArgoCD applies to cluster
Benefit: No cluster credentials outside cluster. CI only writes to Git.
```

**ArgoCD Application Health States**
```
Healthy    → All resources running, no issues
Progressing → Resources are being updated (rolling deployment in progress)
Degraded   → Resources exist but not healthy (pod crash-looping, etc.)
Suspended  → Auto-sync paused (prod sync policy = manual)
Missing    → Expected resources not found in cluster
Unknown    → Cannot determine health

Alert on: Degraded, Missing
Auto-remediate (dev only): OutOfSync
Manual action required: OutOfSync in prod
```

**Environment Promotion Flow**
```
Code change
    ↓
PR merged to main branch
    ↓
CI builds image → pushes to registry → tags with commit SHA
    ↓
CI opens PR to GitOps repo: update image tag in overlays/dev/
    ↓
PR auto-merged (dev) OR reviewed + merged (staging/prod)
    ↓
ArgoCD detects change in Git → syncs cluster
    ↓
Health checks pass → promotion to next env PR opened
```

---

## Vocabulary

| Term | Precise Meaning |
|---|---|
| GitOps | Operations model where Git is the authoritative source of desired system state |
| Reconciliation | The automated process of making cluster state match Git state |
| Drift | Difference between the desired state in Git and actual state in the cluster |
| App-of-Apps | ArgoCD pattern where one Application manages N child Applications |
| ApplicationSet | ArgoCD resource that templates Applications across multiple clusters/environments |
| Sync wave | ArgoCD ordering mechanism — resources with lower wave numbers sync before higher ones |
| Sealed Secrets | Kubernetes controller that decrypts secrets encrypted with a cluster-specific public key |
| External Secrets Operator | Kubernetes operator that pulls secrets from external stores (Vault, AWS SM) into K8s secrets |
| Overlay | Kustomize customization layer applied on top of a base configuration |
| Self-heal | ArgoCD policy that automatically reverts manual changes to match Git state |
| Prune | ArgoCD policy that deletes resources in the cluster that are removed from Git |
| Image updater | ArgoCD/Flux component that automatically updates image tags in Git when new images are pushed |

---

## Common Mistakes and How to Avoid Them

**Mistake 1: Auto-sync with prune in production**
- Bad: `syncPolicy: automated: prune: true` on a production ArgoCD Application
- Fix: Production uses `syncPolicy: automated: selfHeal: true` only (reverts manual changes) but no prune. Prune is a separate manual action after reviewing what will be deleted.

**Mistake 2: Branch-per-environment strategy**
- Bad: `main` → dev, `staging` branch → staging, `prod` branch → prod. Branches diverge over time; merging becomes painful; what's in prod vs staging is unclear.
- Fix: Single branch, separate overlay directories. `overlays/prod/kustomization.yaml` is always visible and diffable.

**Mistake 3: Kubectl apply for "emergency" changes**
- Bad: Incident at 2am → engineer runs `kubectl set image` to hotfix → ArgoCD reverts it 5 minutes later → confusion
- Fix: For genuine emergencies, pause ArgoCD sync on the application, apply the fix, then commit the fix to Git and re-enable sync. Or: accept the revert, commit to Git, re-sync.

**Mistake 4: Secrets in Git (even "encrypted")**
- Bad: `secret.yaml` with base64-encoded values in Git — base64 is encoding, not encryption
- Fix: External Secrets Operator with AWS Secrets Manager or HashiCorp Vault. The Git repo contains the ExternalSecret resource (which vault path to read), not the secret value.

**Mistake 5: No drift alerting**
- Bad: ArgoCD deployed and trusted, but nobody looks at it. A manual change was made 3 weeks ago and nobody knows.
- Fix: ArgoCD Notifications configured to alert on OutOfSync status in production. Daily sync status report to the team's Slack channel.

---

## Good vs. Bad Output

**BAD ArgoCD Application (auto-sync prune in prod):**
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-prod
spec:
  source:
    repoURL: https://github.com/org/gitops-repo
    path: apps/my-app
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true       # DANGEROUS in prod — will delete resources
      selfHeal: true
```

**GOOD ArgoCD Application (prod — manual sync, no auto-prune):**
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-prod
  namespace: argocd
  annotations:
    notifications.argoproj.io/subscribe.on-sync-failed.slack: deployments
    notifications.argoproj.io/subscribe.on-health-degraded.slack: deployments
spec:
  project: production
  source:
    repoURL: https://github.com/org/gitops-repo
    path: apps/overlays/prod
    targetRevision: HEAD
  destination:
    server: https://prod-cluster.example.com
    namespace: my-app
  syncPolicy:
    automated:
      selfHeal: true    # Revert manual changes — yes
      prune: false      # Never auto-delete in prod
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=foreground
      - RespectIgnoreDifferences=true
  revisionHistoryLimit: 10
```

---

## GitOps Checklist

- [ ] Pull-based deployment (ArgoCD/Flux) for all production clusters
- [ ] No cluster credentials stored in CI systems
- [ ] Production sync policy: selfHeal=true, prune=false, automated sync=false
- [ ] Dev/staging sync policy: automated with selfHeal — no auto-prune without review
- [ ] Mono-repo with overlay directories (not branch-per-environment)
- [ ] No secrets in Git — External Secrets Operator or Sealed Secrets in use
- [ ] App-of-Apps or ApplicationSet for multi-application/multi-cluster management
- [ ] Sync waves configured for ordered deployment (DB migration before app)
- [ ] Drift alerting configured for production (OutOfSync → Slack/PagerDuty)
- [ ] Rollback procedure: revert Git commit, not kubectl rollout undo
- [ ] Image updater configured for automated PR on new image push
- [ ] Promotion workflow: PR with image tag update, reviewed before merge to prod overlay
