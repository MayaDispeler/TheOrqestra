---
name: api-gateway-patterns
description: API gateway responsibilities, product selection, rate limiting, auth delegation, routing, transformation, caching, observability, and circuit breaking for production systems
version: 1.0
---
# API Gateway Patterns Expert Reference

## Non-Negotiable Standards

1. **Gateway handles cross-cutting concerns; applications handle business logic.** Auth enforcement, rate limiting, SSL termination, request logging, distributed trace header injection, and CORS belong at the gateway. Business rules, data validation, domain-specific authorization (e.g., "user can only access their own records"), and response assembly belong in the application. Never implement business logic in gateway plugins.

2. **Every request must have a unique request ID.** The gateway generates `X-Request-ID` (UUID v4) if not present, logs it, and forwards it downstream. All upstream services propagate it. This is the minimum required for correlating logs across services without a full distributed tracing setup.

3. **Rate limit headers are mandatory on every response.** Return `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` (Unix timestamp) on every response — not just when limits are hit. Return HTTP 429 with `Retry-After` header (seconds until reset) when limit exceeded. Clients that don't see these headers cannot implement backoff correctly.

4. **JWT validation at gateway is signature + expiry + audience, not just decode.** Verify the RS256/ES256 signature against the JWKS endpoint (cache the keyset, refresh on 401 from upstream). Verify `exp` claim is in the future. Verify `aud` claim matches this API. Reject tokens with `alg: none`. Never forward a JWT downstream that has not been validated at the gateway.

5. **Canary routing default is 5% new version.** Weighted routing splits traffic: 95% to stable, 5% to canary. Monitor error rate and P99 latency in canary before promoting. Canary header override (`X-Canary: true`) allows manual testing without traffic splitting. Never deploy directly to 100% without a canary phase.

6. **Gateways are not ETL pipelines.** Request/response transformation at the gateway is acceptable for: adding/removing headers, renaming top-level JSON fields, injecting user context from JWT claims. It is not acceptable for: joining data from multiple upstreams, aggregating responses, complex JSON transformation with business rules. Those belong in a BFF (Backend for Frontend) service.

---

## Decision Rules

1. **If traffic is <1,000 req/s and you are on AWS, use AWS API Gateway (HTTP API tier).** HTTP API costs ~$1/million requests vs REST API ~$3.50/million. HTTP API supports JWT authorizers natively, proxy integrations to Lambda and HTTP endpoints, and CORS. Use REST API only when you need usage plans, API keys billed to customers, or request/response mapping templates.

2. **If you need self-hosted with declarative config, use Kong (OSS).** Kong runs on top of Nginx (OpenResty), is plugin-extensible, and supports both DB-backed and DB-less (declarative) modes. Use DB-less with `kong.yaml` for GitOps-friendly deployments. Plugins: `rate-limiting`, `jwt`, `key-auth`, `request-transformer`, `zipkin`, `prometheus`.

3. **If rate limiting, use token bucket, not fixed window.** Token bucket allows bursting up to the bucket size, then enforces average rate. Fixed window allows double the rate at window boundaries (last second of window N + first second of window N+1 = 2× limit). Leaky bucket smooths output but penalizes legitimate bursts. Default: token bucket with capacity = 2× per-second rate, refill = per-second rate.

4. **If rate limiting scope is ambiguous, apply in this order:** per-API-key (most specific, allows per-customer tuning), then per-user-ID from JWT claims, then per-IP (least specific, easy to spoof with proxies). Never rely on IP-only rate limiting for authenticated APIs — VPNs and NAT make IP a poor proxy for identity.

5. **If an upstream returns 5xx errors above 50% over 10 seconds, open the circuit.** Return 503 with `X-Circuit-Breaker: open` header immediately without forwarding to the broken upstream. After 30 seconds (half-open), allow one probe request. If it succeeds, close the circuit. If it fails, reset the 30-second timer. Never let a failing upstream consume all gateway worker threads.

6. **If caching at the gateway, only cache GET and HEAD requests.** Never cache POST, PUT, PATCH, DELETE. Respect `Cache-Control: no-store` and `private` directives from upstream — if upstream says private, do not cache at shared gateway level. Cache key must include: path, query string (sorted), `Accept` header (for content negotiation), and `Authorization`-derived user ID for user-specific responses (or mark as private).

7. **If adding path-based routing, document the routing table as code.** Routing rules must be in version-controlled declarative config (Kong `kong.yaml`, AWS API Gateway OpenAPI spec, Nginx `upstream` blocks). Never make routing changes through a UI without corresponding config-as-code change. UI-only changes cannot be reviewed, rolled back, or replicated across environments.

8. **If using mTLS for service-to-service, the gateway must validate the client certificate CN/SAN.** Accepting any valid cert signed by your internal CA is not enough — validate that the CN or Subject Alternative Name matches the expected service identifier. Use short-lived certs (SPIFFE/SPIRE, 24-hour rotation) rather than long-lived static certs.

9. **If the gateway needs to introspect OAuth tokens (opaque tokens), use token introspection endpoint.** POST to `https://auth-server/introspect` with `token=<token>` and `token_type_hint=access_token`. Cache the introspection response keyed on token hash for the token's remaining lifetime minus 5 seconds. Without caching, introspection adds 20-50ms per request.

10. **Never log request/response bodies at the gateway by default.** Headers and metadata (method, path, status, latency, upstream, request-id, user-id) are always safe to log. Bodies may contain PII, credentials, or PCI data. If body logging is required for debugging, implement it as a time-limited sampling configuration (e.g., 1% of requests, auto-disabled after 1 hour) with PII masking.

---

## Mental Models

**The Toll Booth Model**
Every request passes through the gateway as a car through a toll booth. The booth checks identity (auth), verifies payment authorization (rate limits), and routes to the correct destination (load balancing/path routing). The toll booth does not manufacture the goods being transported — it enforces access and routes. If your gateway is doing application work, you've turned the toll booth into a factory.

**The Three Planes of Gateway Operation**
- **Data plane**: handles actual request traffic — routing, transforming, forwarding (Nginx worker processes, Envoy proxy)
- **Control plane**: manages configuration — where to route, what plugins are active, what rate limits apply (Kong Admin API, AWS API Gateway management plane)
- **Management plane**: observability and operators — dashboards, alerting, audit logs

Changes to the control plane propagate to the data plane. In Kong DB-less mode, a config reload restarts the data plane; in DB mode, workers poll every 5 seconds. In AWS API Gateway, a deployment is required to push stage changes to the data plane.

**Circuit Breaker State Machine**
```
CLOSED (normal) → [error rate > threshold] → OPEN (fail fast)
OPEN → [after timeout] → HALF-OPEN (probe)
HALF-OPEN → [probe success] → CLOSED
HALF-OPEN → [probe failure] → OPEN
```
The gateway maintains this state per upstream. Without it, a slow upstream causes request queuing, goroutine/thread exhaustion, and cascading failure to unrelated upstreams sharing the same gateway process.

**Header Propagation Contract**
The gateway injects trace headers (`traceparent` W3C format, or `X-B3-TraceId`/`X-B3-SpanId` Zipkin format, or `X-Amzn-Trace-Id` AWS). Every service in the call chain must forward these headers unchanged on outbound requests — even if the service does not emit spans itself. If one service drops the headers, the trace is severed. This is an application-level contract, not something the mesh or gateway can enforce downstream.

---

## Vocabulary

| Term | Definition |
|------|-----------|
| **JWKS (JSON Web Key Set)** | JSON document at `/.well-known/jwks.json` containing public keys for JWT signature verification; cache with 1-hour TTL, refresh on 401 |
| **Token Bucket** | Rate limiting algorithm: bucket holds up to N tokens, refills at R tokens/sec; requests consume tokens; allows burst up to bucket size |
| **Canary Deployment** | Traffic splitting where small percentage (5%) goes to new version; promoted incrementally based on error/latency metrics |
| **mTLS (Mutual TLS)** | Both client and server present certificates for authentication; used for service-to-service auth; requires PKI infrastructure |
| **Upstream** | Gateway terminology for the backend service receiving forwarded requests; opposite of downstream (client) |
| **Plugin/Middleware** | Gateway extension that runs pre- or post-request: auth, rate limiting, logging, transformation; must be stateless for horizontal scaling |
| **Stage (AWS API GW)** | Deployment target (dev/staging/prod) with independent settings, throttling limits, and canary configuration |
| **Token Introspection** | RFC 7662; POST request to auth server to validate opaque OAuth token and retrieve associated claims |
| **BFF (Backend for Frontend)** | Aggregation layer between gateway and microservices tailored to a specific client type (mobile, web); not the gateway itself |
| **SLO Passthrough** | Gateway must not add more than X ms to upstream latency; typical target: P99 gateway overhead < 5ms |
| **Usage Plan (AWS)** | Quota + throttle settings applied to an API key; used for tiered API monetization (free: 1000 req/day, pro: unlimited) |
| **Declarative Config** | Gateway configuration expressed as version-controlled YAML/JSON files (Kong DB-less `kong.yaml`, Nginx config) vs imperative API calls |

---

## Common Mistakes and How to Avoid Them

**1. Validating JWT format without verifying signature**
- Bad: Gateway base64-decodes JWT payload, reads `sub` claim, and forwards to upstream — never checks RS256 signature against JWKS
- Fix: Fetch JWKS from `https://auth-server/.well-known/jwks.json`. Match JWT `kid` header to key in JWKS. Verify signature. Check `exp`, `iss`, and `aud` claims. Only then extract and forward `X-User-ID` header to upstream. Fail with 401 if any check fails.

**2. Rate limiting after authentication check**
- Bad: Auth runs first, consumes upstream auth service capacity, then rate limit rejects anyway — wastes auth service calls on over-limit clients
- Fix: Run rate limiting before authentication. A client over its limit should receive 429 without ever touching the auth service. Order: IP allowlist → rate limit → auth → routing.

**3. Not setting Retry-After header on 429 responses**
- Bad: Return `HTTP 429 Too Many Requests` with no body and no `Retry-After` header — clients retry immediately, making the problem worse
- Fix: Always include `Retry-After: <seconds>` (e.g., `Retry-After: 60`) and `X-RateLimit-Reset: <unix_timestamp>`. Include a JSON body: `{"error": "rate_limit_exceeded", "retry_after": 60}`. Well-behaved clients will back off.

**4. Caching responses without considering the cache key**
- Bad: Cache by path only (`/api/v1/user/profile`) — all users receive the first user's profile
- Fix: Cache key must include user context. For authenticated endpoints, either mark `Cache-Control: private` (do not cache at gateway) or include user ID hash in cache key. Test cache isolation by requesting with two different tokens and verifying different responses.

**5. Logging full request/response bodies permanently**
- Bad: Enable body logging at gateway for debugging, forget to disable — PCI/PII data in logs indefinitely, fails SOC 2 and PCI DSS audit
- Fix: Never log bodies by default. Use sampling (1%) with a maximum duration (TTL of 1 hour for debug mode). Implement a `X-Debug-Log: <admin-signed-token>` header that enables body logging for a single request trace. Mask fields matching patterns: `password`, `card_number`, `ssn`, `token`.

---

## Good vs. Bad Output

### Kong Declarative Config (DB-less) vs Imperative API Calls

**Bad — imperative, not repeatable:**
```bash
# Applied manually via Admin API — no version control, can't reproduce
curl -X POST http://kong:8001/services \
  -d name=user-service \
  -d url=http://user-svc:3000

curl -X POST http://kong:8001/services/user-service/routes \
  -d "paths[]=/api/v1/users"

# Rate limiting added manually, undocumented
curl -X POST http://kong:8001/services/user-service/plugins \
  -d name=rate-limiting \
  -d config.minute=100
```

**Good — declarative, version-controlled `kong.yaml`:**
```yaml
_format_version: "3.0"
_transform: true

services:
  - name: user-service
    url: http://user-svc.default.svc.cluster.local:3000
    connect_timeout: 5000     # 5 seconds
    read_timeout: 30000       # 30 seconds
    retries: 2
    routes:
      - name: user-service-route
        paths:
          - /api/v1/users
        methods:
          - GET
          - POST
        strip_path: false
    plugins:
      - name: rate-limiting
        config:
          minute: 100
          hour: 1000
          policy: redis             # Use Redis for distributed rate limiting across gateway replicas
          redis_host: redis.default.svc.cluster.local
          redis_port: 6379
          limit_by: consumer        # Rate limit per authenticated consumer, not IP
          header_name: X-Consumer-ID
      - name: jwt
        config:
          claims_to_verify:
            - exp
            - nbf
          key_claim_name: kid
      - name: request-transformer
        config:
          add:
            headers:
              - "X-Service-Name: user-service"
              - "X-Forwarded-By: kong-gateway"
      - name: prometheus
        config:
          per_consumer: true
      - name: zipkin
        config:
          http_endpoint: http://jaeger-collector:9411/api/v2/spans
          traceid_byte_count: 16
          header_type: w3c          # Use W3C traceparent, not B3
```

### Rate Limit Response Headers

**Bad — no headers, client cannot implement backoff:**
```
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{"error": "too many requests"}
```

**Good — complete rate limit context:**
```
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1713139200
Retry-After: 47
X-Request-ID: 550e8400-e29b-41d4-a716-446655440000

{
  "error": "rate_limit_exceeded",
  "message": "API rate limit of 100 requests/minute exceeded",
  "retry_after": 47,
  "limit": 100,
  "window": "minute",
  "docs": "https://api.example.com/docs/rate-limiting"
}
```

### Circuit Breaker Config (Kong)

**Bad — no circuit breaking, failing upstream starves gateway:**
```yaml
services:
  - name: payment-service
    url: http://payment-svc:8080
    # No timeout, no circuit breaker — one slow upstream blocks all workers
```

**Good — timeouts and passive health checks:**
```yaml
services:
  - name: payment-service
    url: http://payment-svc:8080
    connect_timeout: 2000       # 2 second connect timeout
    write_timeout: 5000         # 5 second write timeout
    read_timeout: 10000         # 10 second read timeout
    healthchecks:
      passive:
        healthy:
          successes: 2
        unhealthy:
          http_failures: 5      # 5 consecutive 5xx = mark upstream unhealthy
          tcp_failures: 2
          timeouts: 3
          http_statuses:
            - 500
            - 502
            - 503
            - 504
      active:
        http_path: /healthz
        healthy:
          interval: 10          # Check every 10 seconds
          successes: 2
        unhealthy:
          interval: 5           # Check every 5 seconds when unhealthy
          http_failures: 2
```

---

## Checklist

- [ ] Gateway enforces auth before forwarding — no unauthenticated requests reach upstreams
- [ ] JWT validation includes: signature verification against JWKS, `exp`, `iss`, `aud` claims
- [ ] Rate limiting uses token bucket with Redis backend for distributed enforcement across replicas
- [ ] Every response includes `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- [ ] 429 responses include `Retry-After` header and JSON body with retry guidance
- [ ] Request ID (`X-Request-ID`) generated at gateway and propagated to all upstreams
- [ ] Distributed trace headers (W3C `traceparent` or B3) injected and forwarded
- [ ] Canary routing configured at 5% before any new version goes to 100%
- [ ] Circuit breaker configured: 5xx threshold, open duration, half-open probe
- [ ] Gateway config stored in version-controlled declarative files — no UI-only changes
- [ ] Response body logging disabled by default; PII masking in place for sampled debug logging
- [ ] Cache keys include user context for authenticated endpoints; `Cache-Control: private` respected
