---
name: service-mesh-patterns
description: Service mesh responsibilities, Istio/Linkerd/Cilium selection, mTLS, traffic management, circuit breaking, observability, and sidecar injection for Kubernetes environments
version: 1.0
---
# Service Mesh Patterns Expert Reference

## Non-Negotiable Standards

1. **Service mesh is infrastructure, not application code.** mTLS, retry policies, circuit breaking, and traffic shifting are declared in mesh CRDs (VirtualService, DestinationRule, PeerAuthentication) — not implemented in application libraries. If your applications contain Hystrix/Resilience4J circuit breakers and you also run Istio, you have double circuit breaking. Audit and remove redundancy.

2. **STRICT mTLS in production, PERMISSIVE only during migration.** `PeerAuthentication` mode STRICT means all traffic to the namespace must be mTLS — no plaintext accepted. PERMISSIVE accepts both mTLS and plaintext, useful during sidecar rollout when some pods are not yet injected. Set STRICT before go-live. Never leave a production namespace in PERMISSIVE mode post-migration.

3. **The three observability signals are automatic; header propagation is not.** Envoy/Linkerd proxies automatically generate access logs (L7 request/response), Prometheus metrics (request count, latency histograms, error rates), and trace spans. However, distributed traces only connect across services if the application forwards trace headers (`traceparent`, or `X-B3-TraceId`/`X-B3-SpanId`/`X-B3-Sampled`) on outbound requests. This is an application responsibility the mesh cannot automate.

4. **Canary routing uses VirtualService weight, not replica count.** Wrong approach: run 95 old pods + 5 new pods and let kube-proxy round-robin. Correct approach: 2 Deployments (stable + canary), both behind the same Service, with a VirtualService splitting traffic 95/5 by weight. Replica-count-based canaries tie traffic percentage to pod count, which collapses during autoscaling.

5. **OutlierDetection is the circuit breaker; configure it explicitly.** Istio does not enable circuit breaking by default. Add `OutlierDetection` to every `DestinationRule` in production. Minimum config: `consecutiveGatewayErrors: 5`, `interval: 30s`, `baseEjectionTime: 30s`. Without it, a single unhealthy pod in a pool receives traffic proportional to its endpoint weight until kube-proxy's passive health check eventually removes it — far slower than 30 seconds.

6. **Sidecar injection at namespace level, opt-out at pod level.** Label namespaces with `istio-injection: enabled` to inject automatically. Use pod annotation `sidecar.istio.io/inject: "false"` for specific workloads that must not have a sidecar (e.g., DaemonSets, bare metal agents, init containers with network constraints). Never manage injection at the pod level by default — namespace-level is the auditable baseline.

---

## Decision Rules

1. **If you have fewer than 10 services, do not deploy a service mesh.** The operational overhead (Istio control plane: istiod + ingress gateway + ~3 operator pods, ~500MB memory overhead per cluster baseline) exceeds the benefit. Use Kubernetes NetworkPolicy for L3/L4 segmentation, TLS in application code, and structured logging for observability. Revisit at 10+ services.

2. **If compliance requires encryption-in-transit between all services, a service mesh is justified regardless of service count.** mTLS via Istio/Linkerd satisfies HIPAA, PCI DSS, and SOC 2 encryption-in-transit requirements without application code changes. Document the mesh as a compliance control.

3. **If choosing between Istio, Linkerd, and Cilium:**
   - **Istio**: choose when you need the full feature set — JWT/OIDC integration, WASM plugin extensibility, external auth service integration (`ext_authz`), fine-grained L7 policy, multi-cluster federation. Operational complexity is high; budget 2+ engineers for ongoing management.
   - **Linkerd**: choose when you want observability and mTLS with minimal complexity. No CRDs for traffic management beyond retry/timeout policies via `ServiceProfile`. Uses Rust-based `linkerd2-proxy` (not Envoy) — lower memory footprint per pod. Ideal for teams getting started with service mesh.
   - **Cilium**: choose for eBPF-based networking — best raw throughput, L3/L4 network policy as a Kubernetes CNI replacement, Hubble for network observability. Service mesh capabilities (Cilium Service Mesh) are newer and less mature than Istio. Best when you want to consolidate CNI + mesh into one component.

4. **If a service communicates with an external system (database, third-party API), use ServiceEntry.** Without a `ServiceEntry` for `external.example.com`, Istio's outbound traffic policy (if set to `REGISTRY_ONLY`) will block the connection. Add `ServiceEntry` for all external hosts accessed from the mesh. Never set `outboundTrafficPolicy: ALLOW_ANY` in production — it defeats egress control.

5. **If health check probes fail after enabling mTLS STRICT, use probe rewrite.** Kubelet health check probes are plaintext HTTP — they fail under STRICT mTLS because kubelet has no mesh certificate. Solution: enable Istio's probe rewrite (`sidecar.istio.io/rewriteAppHTTPProbers: "true"` annotation or global `holdApplicationUntilProxyStarts: true`). Probe rewrite redirects kubelet probes through the Envoy sidecar which handles mTLS.

6. **If fault injection is needed for chaos testing, use Istio VirtualService, not application code.** `HTTPFaultInjection.Abort` returns a configured HTTP status code; `HTTPFaultInjection.Delay` injects latency before forwarding. This tests how consumers handle upstream failures without modifying the upstream service itself.

7. **If traffic shifting for canary, always define both a VirtualService and a DestinationRule.** VirtualService defines routing weights. DestinationRule defines subsets (which pods are stable vs canary, typically matched by a label like `version: v2`). Without both, the VirtualService cannot route to named subsets.

8. **If Istio control plane memory usage is high (istiod >2GB), reduce sidecar scope.** By default, Envoy sidecars receive the full Envoy xDS configuration for every service in the mesh — even services they never call. Use `Sidecar` resource with `egress.hosts` scoped to only the services each workload needs. This reduces istiod push size and Envoy memory from O(services) to O(dependencies).

9. **Never deploy the Istio ingress gateway without specifying resource requests/limits.** Default Istio install omits resource limits. Under traffic spike, the ingress gateway can OOM-kill and restart, dropping all in-flight connections. Set at minimum: `requests: {cpu: 100m, memory: 128Mi}`, `limits: {cpu: 2000m, memory: 1Gi}`.

10. **If you need header-based routing for A/B testing, use VirtualService HTTP match, not Nginx.** Header-based routing belongs in the mesh routing layer. This keeps routing rules declarative, auditable, and observable (Kiali visualizes VirtualService routing). Nginx config in ConfigMaps is opaque and not integrated with mesh telemetry.

---

## Mental Models

**The Sidecar Interception Model**
Every pod in the mesh has an Envoy (or linkerd2-proxy) sidecar injected via mutating webhook at pod creation. iptables rules (or eBPF in Cilium) intercept all inbound and outbound network traffic and redirect it through the proxy (ports 15001 outbound, 15006 inbound for Istio). The application code never changes — it still connects to `http://other-service:8080` — but the proxy intercepts, upgrades to mTLS, applies policies, records telemetry, and forwards. The application is mesh-unaware for all data-plane operations except trace header propagation.

**Control Plane vs Data Plane**
- **Control plane** (istiod / Linkerd control plane): reads Kubernetes resources (Services, Endpoints, VirtualServices, DestinationRules, PeerAuthentication), computes xDS configuration (LDS/RDS/CDS/EDS), and pushes to all proxies via gRPC. Runs once per cluster.
- **Data plane** (Envoy sidecars): executes the configuration pushed by control plane. Handles every packet. A control plane outage does not disrupt in-flight traffic — existing proxy config continues to work. Only new config changes are blocked.

**The Four Traffic Management Resources (Istio)**
```
VirtualService   → WHERE does traffic go? (routing rules, weights, retries, timeouts, fault injection)
DestinationRule  → HOW is the destination treated? (load balancing, circuit breaking, subsets, TLS mode)
Gateway          → What external traffic enters the mesh? (ingress/egress, TLS termination, host binding)
ServiceEntry     → What external services can the mesh reach? (registers non-Kubernetes hosts)
```
These four resources together define the complete traffic policy for the mesh. Every production deployment should have all four where applicable.

**The Golden Signals via Mesh**
Istio Envoy proxies automatically expose the four golden signals for every service pair:
- **Latency**: `istio_request_duration_milliseconds` histogram (P50/P95/P99)
- **Traffic**: `istio_requests_total` counter (requests/second)
- **Errors**: `istio_requests_total{response_code=~"5.."}` (error rate)
- **Saturation**: `istio_tcp_connections_opened_total` (connection pressure)
No instrumentation required in application code. Kiali, Grafana + Prometheus, and Jaeger consume these automatically.

---

## Vocabulary

| Term | Definition |
|------|-----------|
| **xDS** | Envoy's discovery service protocol family: LDS (listener), RDS (route), CDS (cluster), EDS (endpoint); istiod pushes config via xDS over gRPC |
| **PeerAuthentication** | Istio CRD configuring mTLS mode per namespace or workload; modes: STRICT (mTLS only), PERMISSIVE (both), DISABLE (plaintext only) |
| **VirtualService** | Istio CRD defining L7 routing rules: path/header matching, traffic weights, retries, timeouts, fault injection |
| **DestinationRule** | Istio CRD defining upstream policy: load balancing algorithm, circuit breaking (OutlierDetection), TLS origination, connection pool settings |
| **ServiceEntry** | Istio CRD registering external hosts in the mesh service registry so they can be managed by mesh policies and traffic rules |
| **SPIFFE/SPIRE** | Secure Production Identity Framework for Everyone; Istio uses SPIFFE X.509 SVIDs (certificates with `spiffe://cluster.local/ns/default/sa/myservice` URI SANs) for workload identity |
| **Envoy** | Open-source L7 proxy (C++) used as the sidecar in Istio; also used standalone in API gateways (Ambassador, Contour) |
| **linkerd2-proxy** | Linkerd's sidecar written in Rust; smaller memory footprint than Envoy; does not support all Envoy features but sufficient for Linkerd's scope |
| **OutlierDetection** | Istio DestinationRule field implementing circuit breaking via passive health checking; ejects unhealthy endpoints from load balancing pool |
| **Sidecar (Istio CRD)** | Resource scoping which services an Envoy sidecar receives configuration for; reduces memory/CPU by limiting full-mesh visibility |
| **eBPF** | Extended Berkeley Packet Filter; Linux kernel technology used by Cilium to intercept network traffic without iptables; lower overhead |
| **Kiali** | Istio's service graph visualization tool; shows VirtualService/DestinationRule topology, traffic flow, error rates, and mTLS status |

---

## Common Mistakes and How to Avoid Them

**1. Leaving PERMISSIVE mTLS mode in production**
- Bad: Migrate to Istio with PERMISSIVE everywhere for "easy rollout," forget to flip to STRICT — plaintext connections accepted indefinitely, compliance control is ineffective
- Fix: After confirming all pods in a namespace have sidecars injected (verify with `kubectl get pods -n <ns> -o jsonpath='{.items[*].spec.containers[*].name}'`), apply STRICT PeerAuthentication. Monitor for `connection reset` errors in non-injected clients (jobs, external services) — those need ServiceEntry or a dedicated non-injected namespace.

**2. Dropping B3/W3C trace headers in application code**
- Bad: Service A receives `traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`, calls Service B without forwarding it — Jaeger shows two disconnected traces instead of one end-to-end trace
- Fix: Every service must forward the following headers on all outbound calls: `traceparent`, `tracestate` (W3C) OR `X-B3-TraceId`, `X-B3-SpanId`, `X-B3-ParentSpanId`, `X-B3-Sampled`, `X-B3-Flags` (B3). Use OpenTelemetry SDK instrumentation — it handles propagation automatically. Add a test: send request with known trace ID, verify downstream logs contain same trace ID.

**3. Canary via replica count instead of VirtualService weights**
- Bad: Run 19 stable pods + 1 canary pod, relying on Kubernetes round-robin for "5% canary" — during autoscaling, 5 stable + 5 canary pods = 50% canary accidentally
- Fix: Use Deployment labels (`version: stable`, `version: canary`), a single Service selecting both, and a VirtualService with explicit weights: `stable: 95, canary: 5`. The percentage is independent of pod count.

**4. No resource limits on Istio ingress gateway**
- Bad: Install Istio with default profile, ingress gateway has no CPU/memory limits — a traffic spike causes gateway to consume all node CPU, evicting other workloads; or OOM-kill drops all active connections
- Fix: Always set resource requests and limits in `IstioOperator` or Helm values. Production baseline: `requests: {cpu: 500m, memory: 256Mi}`, `limits: {cpu: 2, memory: 1Gi}`. HPA on the gateway: min 2 replicas, max 10, CPU target 70%.

**5. Applying mesh-wide retry policy that amplifies failure**
- Bad: Global VirtualService retry: `attempts: 3, perTryTimeout: 30s` — a 10-second upstream timeout becomes 90 seconds of held connection; 3× traffic amplification during upstream degradation causes cascading overload
- Fix: Configure retries per-route, not globally. Only retry on specific conditions: `retriableStatusCodes: [503, 504]`, NOT on 500 (application errors not worth retrying). Set `perTryTimeout` to half the total timeout budget. Use `retryOn: connect-failure,refused-stream,unavailable,cancelled` for gRPC.

---

## Good vs. Bad Output

### Istio VirtualService Canary vs Bad K8s Deployment Approach

**Bad — replica-count canary (fragile):**
```yaml
# stable-deployment.yaml — 19 replicas
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout-stable
spec:
  replicas: 19
  template:
    metadata:
      labels:
        app: checkout
        version: stable

---
# canary-deployment.yaml — 1 replica = "5% canary"
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout-canary
spec:
  replicas: 1
  # HPA scales this to match load — percentage no longer controlled
  template:
    metadata:
      labels:
        app: checkout
        version: canary

---
# One service selects both — kube-proxy round-robins uniformly
# Problem: percentage tied to replica ratio, breaks with HPA
apiVersion: v1
kind: Service
metadata:
  name: checkout
spec:
  selector:
    app: checkout    # Selects BOTH stable and canary pods
```

**Good — VirtualService weight-based canary (stable):**
```yaml
# stable-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout-stable
spec:
  replicas: 3           # Replica count independent of traffic percentage
  template:
    metadata:
      labels:
        app: checkout
        version: stable

---
# canary-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout-canary
spec:
  replicas: 1           # Can be 1 pod — traffic percentage is set in VirtualService
  template:
    metadata:
      labels:
        app: checkout
        version: canary

---
# DestinationRule defines subsets by label
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: checkout
spec:
  host: checkout
  trafficPolicy:
    outlierDetection:
      consecutiveGatewayErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
  subsets:
    - name: stable
      labels:
        version: stable
    - name: canary
      labels:
        version: canary

---
# VirtualService controls traffic split — independent of pod count
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: checkout
spec:
  hosts:
    - checkout
  http:
    - match:
        - headers:
            x-canary:
              exact: "true"     # Manual canary override for testing
      route:
        - destination:
            host: checkout
            subset: canary
    - route:
        - destination:
            host: checkout
            subset: stable
          weight: 95
        - destination:
            host: checkout
            subset: canary
          weight: 5
      retries:
        attempts: 2
        perTryTimeout: 10s
        retryOn: connect-failure,refused-stream,unavailable,503
      timeout: 30s
```

### mTLS PeerAuthentication — Staged Migration

**Bad — skip straight to STRICT without verifying injection:**
```yaml
# Applied before confirming all pods have sidecars
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT
# Result: legacy pods without sidecars, batch jobs, and external
# probes lose connectivity immediately — production outage
```

**Good — PERMISSIVE during rollout, STRICT after verification:**
```yaml
# Phase 1: enable PERMISSIVE while rolling out sidecar injection
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: PERMISSIVE

---
# Phase 2: after verifying all pods injected:
# kubectl get pods -n production -o json | jq '[.items[] | select(.spec.containers[].name == "istio-proxy")] | length'
# Must equal total pod count

# Phase 3: flip to STRICT
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT

# Phase 4: exempt specific workloads if needed
---
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: allow-legacy-probe
  namespace: production
spec:
  selector:
    matchLabels:
      app: legacy-health-checker
  mtls:
    mode: PERMISSIVE    # Scoped exception, not namespace-wide
```

---

## Checklist

- [ ] Service count justifies mesh overhead (>10 services, or compliance requirement)
- [ ] Mesh product selected based on complexity/feature requirements: Istio / Linkerd / Cilium
- [ ] Namespace-level sidecar injection enabled; pod-level opt-out for DaemonSets/jobs
- [ ] mTLS mode is PERMISSIVE only during migration; STRICT before production go-live
- [ ] All PeerAuthentication resources audited — no production namespaces in PERMISSIVE
- [ ] DestinationRule OutlierDetection configured for every production service
- [ ] VirtualService + DestinationRule subsets used for canary; not replica-count ratio
- [ ] Canary traffic at 5%; header override `X-Canary: true` available for manual testing
- [ ] Istio ingress gateway has CPU/memory requests and limits; HPA configured (min 2 replicas)
- [ ] All services verified to forward W3C `traceparent` or B3 headers on outbound calls
- [ ] ServiceEntry resources created for all external hosts accessed from within mesh
- [ ] Sidecar CRD scoped per workload to reduce istiod push size and Envoy memory
