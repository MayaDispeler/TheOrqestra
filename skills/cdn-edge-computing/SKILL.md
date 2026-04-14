---
name: cdn-edge-computing
description: Expert reference for CDN strategy, cache configuration, and edge computing patterns
version: 1.0
---

# CDN & Edge Computing Expert Reference

## Non-Negotiable Standards

1. **Cache strategy is specified per content type, not globally**: A single `max-age=3600` for all responses is not a cache strategy. Static assets, HTML, API responses, and user-specific data each have different caching requirements that must be defined explicitly.
2. **Cache invalidation mechanism is designed before deployment**: Never ship a CDN configuration that relies on TTL expiry alone for content updates. Tag-based or path-based purge capability must exist and be tested.
3. **TLS 1.2 is the minimum; TLS 1.3 is the target**: TLS 1.0 and 1.1 must be disabled. HSTS with `max-age=31536000 includeSubDomains preload` is required for production domains.
4. **Origin is always protected behind CDN in production**: Direct origin access without CDN should be blocked by IP allowlist (only CDN IPs) or shared secret header. An unprotected origin defeats the entire CDN architecture.
5. **Cache hit ratio is measured and has a target**: For static asset workloads, target >95%. For dynamic content with caching, target >80%. Below 60% indicates a misconfigured cache key or excessive cache-busting.

---

## Decision Rules

**If** selecting a CDN provider → Cloudflare for general use, DDoS mitigation, WAF, and edge compute (Workers); AWS CloudFront for AWS-native workloads with tight S3/API Gateway integration; Fastly for real-time config propagation (<1s vs Cloudflare's ~30s) and high-traffic media; Akamai for enterprise contracts, SLA guarantees, and media streaming at extreme scale.

**If** caching static assets (JS, CSS, images with hashed filenames) → `Cache-Control: public, max-age=31536000, immutable`. The hash in the filename is the version — the TTL should be maximum.

**If** caching HTML pages → `Cache-Control: no-cache` (must revalidate with origin) or `max-age=60, stale-while-revalidate=300` for tolerable staleness. Never `no-store` for public pages — it defeats CDN entirely.

**If** caching API responses → `Cache-Control: private` for authenticated responses (CDN must not cache). For public API responses: `Cache-Control: public, max-age=60, stale-while-revalidate=300, stale-if-error=86400`.

**If** content must be invalidated immediately on update → implement tag-based purging: assign `Cache-Tag` or `Surrogate-Key` headers at origin, purge by tag on deployment. Single-URL purge is insufficient for pages that aggregate multiple content pieces.

**If** traffic to origin exceeds 5,000 req/s → enable origin shield (Cloudflare Tiered Cache, CloudFront Origin Shield). One CDN PoP acts as shared cache for all others — reduces origin load by 60-80%.

**If** using Cloudflare Workers → appropriate for: auth at edge (<2ms overhead), A/B testing without origin round-trip, geo-based routing, request/response transformation, bot detection. Not appropriate for: database queries, operations >10ms, stateful workflows.

**If** images are served without CDN optimization → configure automatic WebP/AVIF conversion at edge. WebP is ~30% smaller than JPEG; AVIF is ~50% smaller. Both are supported by >95% of browsers.

**Never** set `Vary: User-Agent` — it creates exponentially many cache variants and destroys hit ratio. Use separate URLs or edge logic for device-specific content.

**Never** use query strings as cache busters for static assets — use content-hashed filenames instead. Query strings complicate cache key design.

---

## Mental Models

**Cache-Control Decision Tree by Content Type**
```
Content type?
├── Static asset (hashed filename)
│   └── Cache-Control: public, max-age=31536000, immutable
├── HTML / page
│   ├── Changes frequently → Cache-Control: no-cache (validate every request)
│   └── Changes infrequently → Cache-Control: max-age=300, stale-while-revalidate=3600
├── API response
│   ├── Authenticated → Cache-Control: private, no-store
│   └── Public → Cache-Control: public, max-age=60, stale-while-revalidate=300
└── User-specific data → Cache-Control: private, no-store (always)
```

**The CDN Request Lifecycle**
```
User → CDN Edge PoP → [Cache HIT?]
                           ├── YES → Return cached response (0 origin cost)
                           └── NO  → CDN Edge → [Origin Shield?]
                                                    ├── HIT → Return (no origin request)
                                                    └── MISS → Origin Server
                                                                    ↓
                                                              Response + Cache headers
                                                                    ↓
                                                              Cache at shield + edge
```

**Edge Compute Use Case Map**
```
<2ms, stateless, high-volume → Cloudflare Workers / Lambda@Edge
  ✓ Auth token validation
  ✓ A/B test assignment
  ✓ Geo-routing
  ✓ Request header injection
  ✓ Bot score checking

>10ms, stateful, DB-dependent → Origin (not edge)
  ✗ Database writes
  ✗ Payment processing
  ✗ Session management with external store
```

---

## Vocabulary

| Term | Precise Meaning |
|---|---|
| PoP | Point of Presence — a CDN edge location geographically close to users |
| Cache hit ratio | % of requests served from CDN cache without hitting origin |
| Origin shield | A mid-tier cache layer that consolidates CDN-to-origin requests |
| Cache key | The unique identifier for a cached object; usually URL + selected headers |
| TTL | Time to Live — how long a cached response is considered fresh |
| Stale-while-revalidate | Serve stale content immediately while fetching a fresh copy in background |
| Surrogate key / Cache tag | A label attached to cached objects enabling bulk invalidation by tag |
| Purge | Explicitly remove one or more cached objects before TTL expiry |
| Anycast | Routing method where multiple servers share an IP; user reaches the nearest one |
| Edge function | Code running in CDN PoPs close to users (Cloudflare Workers, Lambda@Edge) |
| WAF | Web Application Firewall — filters malicious requests at the CDN layer |
| HSTS | HTTP Strict Transport Security — forces HTTPS for a specified duration |

---

## Common Mistakes and How to Avoid Them

**Mistake 1: One cache policy for everything**
- Bad: `Cache-Control: max-age=3600` on all responses including API and HTML
- Fix: Define explicit cache policy per route/content-type. HTML needs different TTL than JS bundles.

**Mistake 2: Caching authenticated responses**
- Bad: API returns user data with `Cache-Control: public, max-age=300` — CDN serves user A's data to user B
- Fix: All authenticated responses must have `Cache-Control: private, no-store`. Verify with CDN access logs.

**Mistake 3: No origin protection**
- Bad: CDN in front of origin, but origin is publicly accessible — attacker bypasses CDN entirely
- Fix: Restrict origin to CDN IP ranges only (Cloudflare publishes these) or validate a shared secret header (`CF-Access-Client-Secret`).

**Mistake 4: TTL-only invalidation**
- Bad: Deploy new JS bundle, wait for 24h TTL to expire — users get stale JavaScript
- Fix: Content-hash in filename (`app.a3f9b12.js`) makes old URL permanently stale and new URL immediately cached. For HTML: purge by path on deploy.

**Mistake 5: Not monitoring cache hit ratio**
- Bad: CDN configured but nobody checks whether it's actually caching
- Fix: Dashboard showing cache hit ratio per content type. Alert if ratio drops below 80% for static assets — indicates a misconfiguration or cache-busting regression.

---

## Good vs. Bad Output

**BAD Cache-Control headers:**
```
# Same header for everything — HTML, API, assets
Cache-Control: max-age=3600

# Authenticated user data — will be cached by CDN and shared across users
GET /api/user/profile
Cache-Control: public, max-age=300
```

**GOOD Cache-Control headers:**
```
# Hashed static assets — permanent cache
GET /static/app.a3f9b12.js
Cache-Control: public, max-age=31536000, immutable

# HTML pages — validate but serve stale while revalidating
GET /dashboard
Cache-Control: public, max-age=0, must-revalidate
# or with staleness tolerance:
Cache-Control: public, max-age=60, stale-while-revalidate=300, stale-if-error=86400

# Authenticated API — never CDN-cached
GET /api/user/profile
Authorization: Bearer ...
Cache-Control: private, no-store

# Public API endpoint
GET /api/products
Cache-Control: public, max-age=120, stale-while-revalidate=600
Surrogate-Key: products  # enables tag-based purge on product update
```

---

## CDN Configuration Checklist

- [ ] Cache policy defined per content type (assets, HTML, API, user-specific)
- [ ] Static assets use content-hashed filenames with `max-age=31536000, immutable`
- [ ] Authenticated responses have `Cache-Control: private, no-store`
- [ ] Origin access restricted to CDN IP ranges only
- [ ] Tag-based or path-based purge configured and tested
- [ ] Origin shield enabled for high-traffic origins
- [ ] TLS 1.3 enabled, TLS 1.0/1.1 disabled
- [ ] HSTS configured: `max-age=31536000 includeSubDomains`
- [ ] WAF rules enabled and tuned (not just default ruleset)
- [ ] Cache hit ratio monitored with alert threshold
- [ ] WebP/AVIF image conversion enabled at edge
- [ ] `Vary: User-Agent` not present on any cacheable response
