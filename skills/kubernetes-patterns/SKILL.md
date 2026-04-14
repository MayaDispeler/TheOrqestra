---
name: kubernetes-patterns
description: Production Kubernetes patterns covering deployments, resources, scaling, RBAC, probes, Helm, PDBs, affinity, and secrets
version: 1.0
---
# Kubernetes Patterns Expert Reference

## Non-Negotiable Standards

1. **Every workload defines CPU and memory requests AND limits.** CPU requests feed the scheduler; CPU limits cap throttling. Memory request=limit eliminates OOM surprise evictions. No resource-unconstrained pods in any namespace.
2. **All Deployments have all three probe types configured correctly.** `startupProbe` gates liveness/readiness until the app is up; `livenessProbe` kills deadlocked processes; `readinessProbe` gates traffic. A missing or over-aggressive livenessProbe causes cascading restart loops under load.
3. **No workload runs as the default ServiceAccount.** Create a dedicated ServiceAccount per workload. Bind only the Role/ClusterRole the workload actually needs. Default SA accumulates ambient permissions in many clusters.
4. **Remote state and RBAC are enforced by namespace ResourceQuota and LimitRange.** LimitRange sets per-pod defaults so new workloads without explicit limits still get bounded. ResourceQuota caps cumulative namespace consumption.
5. **Every HA workload has a PodDisruptionBudget.** `minAvailable: 1` is the minimum for any multi-replica workload. Without a PDB, node drain evicts all pods simultaneously.
6. **Secrets never live in ConfigMaps.** Use External Secrets Operator backed by Vault, AWS Secrets Manager, or GCP Secret Manager. Sealed Secrets (Bitnami) is the acceptable GitOps alternative — encrypted at rest, committed as SealedSecret CRD.

## Decision Rules

1. **IF the app can tolerate a few seconds of downtime during deploy THEN use `RollingUpdate` with `maxSurge: 25%, maxUnavailable: 0`.** Zero-downtime deploys require `maxUnavailable: 0` so old pods stay serving until new pods pass readinessProbe.
2. **IF the app uses a ReadWriteOnce PVC that cannot be shared THEN use `Recreate` strategy**, not RollingUpdate. RollingUpdate with RWO PVCs causes the new pod to be stuck `Pending` waiting for the volume to detach.
3. **IF you need instant traffic switch with zero-downtime rollback THEN implement Blue-Green via Service selector swap** (`kubectl patch service my-svc -p '{"spec":{"selector":{"version":"green"}}}'`). Costs double compute while both environments are live.
4. **IF you need gradual traffic shift with real-user testing THEN use Canary via weight-based Ingress annotation** (NGINX: `nginx.ingress.kubernetes.io/canary-weight: "20"`) or service mesh VirtualService weights (Istio: `weight: 20`).
5. **IF scaling on CPU/memory THEN use HPA with `minReplicas: 2` minimum.** Single-replica services have no HA. Target CPU utilization at 60–70%, not 80%+, to allow headroom before new pods finish starting.
6. **IF scaling on external events (queue depth, Kafka consumer lag, cron) THEN use KEDA.** HPA custom metrics require adapter plumbing; KEDA ScaledObject is declarative and supports 60+ event sources natively.
7. **IF you need right-sizing recommendations for requests THEN deploy VPA in `Off` or `Initial` mode first.** Never run VPA `Auto` mode alongside HPA on the same workload — they fight over replica count and CPU requests simultaneously.
8. **IF a node pool is dedicated (GPU, high-memory, spot) THEN use taints + tolerations, not just nodeSelector.** NodeSelector alone places pods preferentially but does not prevent other pods from landing. Taints `NoSchedule` enforce exclusivity.
9. **NEVER use wildcard verbs (`"*"`) or wildcard resources in a Role or ClusterRole in production.** Grant only the specific verbs (get, list, watch, create, update, patch, delete) needed. Audit with `kubectl auth can-i --list --as=system:serviceaccount:ns:sa`.
10. **IF a Helm chart value changes a Deployment's ConfigMap or Secret THEN add a checksum annotation** to force pod rollout: `checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}`.

## Mental Models

**Requests vs. Limits: The Scheduler vs. The Kubelet**
Requests are a scheduling contract — the scheduler uses them to find a node with enough allocatable capacity. Limits are a runtime enforcement — the kubelet/kernel enforces them via cgroups. A pod can be scheduled on a node where it fits by requests and then throttled or OOM-killed at runtime if it exceeds limits. CPU throttling is silent and devastating; memory OOM-kill is noisy and obvious. Set CPU limit = 2–4× request to allow burst without starvation. Set memory limit = memory request to make behavior predictable.

**Probe Layering: Startup → Liveness → Readiness**
Think of probes as a three-stage gate. `startupProbe` runs first and blocks the other two — use it for slow-starting JVM/Python apps (`failureThreshold: 30, periodSeconds: 10` = 5 min budget). Once startup succeeds, `livenessProbe` runs on a slow cadence to detect deadlocks (`periodSeconds: 30, failureThreshold: 3` = 90s to kill). `readinessProbe` runs fast to control load balancer membership (`periodSeconds: 5, failureThreshold: 2` = 10s to remove from service). Never make livenessProbe call an external dependency — a downstream outage will cause your pod to restart in a loop.

**RBAC Least-Privilege Ladder**
Work up from nothing: start with no permissions, add read-only (get, list, watch) for needed resources, then add write verbs (create, update, patch, delete) only where the workload actively manages resources. Use `Role` for namespace-scoped resources (99% of cases); escalate to `ClusterRole` only for cluster-scoped resources (nodes, PVs, namespaces) or when the same permissions are needed across all namespaces. Bind ClusterRoles with `RoleBinding` (not `ClusterRoleBinding`) to keep scope namespace-local.

**PDB + RollingUpdate + HPA Triangle**
These three interact: PDB prevents simultaneous eviction; RollingUpdate controls deploy velocity; HPA sets replica bounds. A PDB with `minAvailable: 1` on a 2-replica Deployment means node drains and deploys can only proceed one pod at a time — good for safety, slow for large clusters. For large Deployments (`replicas >= 10`), prefer `maxUnavailable: 25%` PDB to allow parallel disruption while maintaining quorum.

## Vocabulary

| Term | Precise Definition |
|------|-------------------|
| **Requests** | Minimum CPU/memory the scheduler guarantees on the node; used for bin-packing decisions |
| **Limits** | Maximum CPU/memory the container may use; CPU is throttled, memory triggers OOM-kill |
| **LimitRange** | Namespace-scoped policy setting default/min/max requests and limits per container or pod |
| **ResourceQuota** | Namespace-scoped cap on total CPU, memory, and object counts across all pods |
| **HPA** | HorizontalPodAutoscaler; scales replica count based on CPU, memory, or custom/external metrics |
| **VPA** | VerticalPodAutoscaler; recommends or sets requests/limits based on historical usage |
| **KEDA** | Kubernetes Event-Driven Autoscaler; extends HPA with 60+ event sources via ScaledObject CRD |
| **PDB** | PodDisruptionBudget; limits voluntary disruptions (drains, deploys) to maintain availability |
| **startupProbe** | Probe that delays liveness/readiness evaluation; use for apps with variable startup time |
| **livenessProbe** | Probe that restarts the container on failure; detects deadlocks and unrecoverable states |
| **readinessProbe** | Probe that removes pod from Service endpoints on failure; controls traffic eligibility |
| **External Secrets Operator** | Controller that syncs secrets from external vaults (Vault, AWS SM, GCP SM) into K8s Secrets |

## Common Mistakes and How to Avoid Them

**1. Missing resource limits causes noisy-neighbor OOM evictions**

Bad:
```yaml
containers:
- name: app
  image: myapp:1.0
  # No resources block — pod can consume entire node
```

Fix:
```yaml
containers:
- name: app
  image: myapp:1.0
  resources:
    requests:
      cpu: "250m"
      memory: "256Mi"
    limits:
      cpu: "1000m"
      memory: "256Mi"   # memory request = limit; prevents Burstable class OOM surprises
```
Also add a LimitRange to the namespace as a backstop:
```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: production
spec:
  limits:
  - type: Container
    default:
      cpu: "500m"
      memory: "256Mi"
    defaultRequest:
      cpu: "100m"
      memory: "128Mi"
```

**2. Liveness probe hitting external dependency causes cascading restarts**

Bad:
```yaml
livenessProbe:
  httpGet:
    path: /health/deep    # calls DB + Redis + downstream APIs
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 10
```

Fix:
```yaml
livenessProbe:
  httpGet:
    path: /health/live    # only checks: is the process alive and not deadlocked?
    port: 8080
  initialDelaySeconds: 0
  periodSeconds: 30
  failureThreshold: 3    # 90s before kill — avoids flapping on transient load
readinessProbe:
  httpGet:
    path: /health/ready   # checks DB connection, cache — gates traffic, not restarts
    port: 8080
  periodSeconds: 5
  failureThreshold: 2
```

**3. Using default ServiceAccount exposes cluster-admin token in many managed clusters**

Bad:
```yaml
spec:
  # No serviceAccountName — uses 'default' SA which may have RBAC bindings added by other tools
  containers:
  - name: app
    image: myapp:1.0
```

Fix:
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp
  namespace: production
  annotations:
    eks.amazonaws.com/role-arn: "arn:aws:iam::123456789:role/myapp-role"  # IRSA if on EKS
automountServiceAccountToken: false   # disable if app doesn't call K8s API
---
spec:
  serviceAccountName: myapp
  automountServiceAccountToken: false
```

**4. No PodDisruptionBudget causes full outage during node drain**

Bad: No PDB defined. `kubectl drain node-1` evicts all 3 replicas simultaneously.

Fix:
```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: myapp-pdb
  namespace: production
spec:
  minAvailable: 1        # At least 1 pod stays up during voluntary disruption
  selector:
    matchLabels:
      app: myapp
# For larger deployments (>=10 replicas), prefer:
# maxUnavailable: 25%   # Allows parallel disruption while maintaining quorum
```

**5. Storing secrets in ConfigMap exposes them in etcd plaintext and RBAC list access**

Bad:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  DATABASE_URL: "postgres://user:supersecretpassword@db:5432/mydb"
  API_KEY: "sk-prod-abc123"
```

Fix (External Secrets Operator with AWS Secrets Manager):
```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: myapp-secrets
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secretsmanager
    kind: ClusterSecretStore
  target:
    name: myapp-secrets
    creationPolicy: Owner
  data:
  - secretKey: DATABASE_URL
    remoteRef:
      key: prod/myapp/db
      property: url
  - secretKey: API_KEY
    remoteRef:
      key: prod/myapp/api-key
      property: value
```

## Good vs. Bad Output

**Bad Deployment (no limits, no probes, default SA, no PDB):**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 1                          # Single point of failure
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 1                # Allows zero pods during deploy
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      # No serviceAccountName — uses default SA
      containers:
      - name: app
        image: myapp:latest            # Mutable tag — unpredictable deploys
        # No resources — can starve other pods
        # No probes — traffic sent to broken pods, no deadlock detection
        env:
        - name: DB_PASSWORD
          value: "mysecretpassword"    # Secret in pod spec — visible in etcd, API
```

**Good Deployment (production-ready):**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: production
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: "25%"
      maxUnavailable: 0               # Zero-downtime: old pods serve until new pods are ready
  selector:
    matchLabels:
      app: myapp
      version: v1.2.3
  template:
    metadata:
      labels:
        app: myapp
        version: v1.2.3
      annotations:
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
    spec:
      serviceAccountName: myapp       # Dedicated SA, not default
      automountServiceAccountToken: false
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 2000
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: myapp
      containers:
      - name: app
        image: myapp:1.2.3@sha256:abc123...  # Pinned digest
        resources:
          requests:
            cpu: "250m"
            memory: "256Mi"
          limits:
            cpu: "1000m"
            memory: "256Mi"
        startupProbe:
          httpGet:
            path: /health/live
            port: 8080
          failureThreshold: 30         # 5 min budget for slow start
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8080
          periodSeconds: 30
          failureThreshold: 3          # 90s tolerance before restart
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          periodSeconds: 5
          failureThreshold: 2
        env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: myapp-secrets      # From ExternalSecret CRD
              key: DATABASE_PASSWORD
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop: ["ALL"]
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: myapp-pdb
  namespace: production
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: myapp
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 65        # 65% target leaves 35% headroom for new pods
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # 5-min cooldown before scale-down
```

## Checklist

- [ ] All containers have `resources.requests` and `resources.limits` for both CPU and memory
- [ ] Memory request equals memory limit (prevents Burstable QoS OOM evictions)
- [ ] `startupProbe` configured for apps with >10s startup time (`failureThreshold * periodSeconds` >= expected max startup)
- [ ] `livenessProbe` checks only local process health — no external dependency calls
- [ ] `readinessProbe` checks full health including dependencies — gates traffic, not restarts
- [ ] Dedicated `ServiceAccount` per workload with `automountServiceAccountToken: false` if no K8s API access needed
- [ ] No wildcard verbs or resources in Role/ClusterRole; run `kubectl auth can-i --list` to audit
- [ ] `PodDisruptionBudget` exists for every Deployment/StatefulSet with `replicas >= 2`
- [ ] Deployment strategy is `RollingUpdate` with `maxUnavailable: 0` for zero-downtime; `Recreate` only for RWO PVC conflicts
- [ ] Secrets sourced from External Secrets Operator or Sealed Secrets — never stored in ConfigMap or pod env literals
- [ ] `LimitRange` and `ResourceQuota` applied to every production namespace
- [ ] Image tags pinned to digest (`image:tag@sha256:...`) or use image digest in CI pipeline output
