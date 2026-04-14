---
name: api-security
description: Secure API design covering OAuth 2.0 flows, JWT standards, API key lifecycle, zero-trust, rate limiting, and OWASP API Top 10
version: 1.0
---
# API Security Expert Reference

## Non-Negotiable Standards

1. **Never use the OAuth 2.0 Implicit flow.** It was deprecated in RFC 9700. SPAs and mobile apps use Authorization Code + PKCE exclusively. The access token is never returned in the URL fragment.

2. **JWTs use RS256 or ES256 — never HS256 in distributed systems.** A shared HMAC secret means any service that can verify a token can also forge one. Asymmetric keys give each service a public key for verification with no ability to mint new tokens.

3. **API keys are hashed before storage using bcrypt or Argon2id.** The raw key is shown exactly once to the user at creation time. If you can query the database and retrieve a usable key, your storage is broken. Log lines must never contain the raw key — use the first 8 characters as a hint identifier only.

4. **Every request is authenticated and authorized regardless of network origin.** Internal services behind a load balancer are not exempt. mTLS is required for service-to-service communication in sensitive environments. "This request came from our VPC" is not an authorization decision.

5. **JWT payloads contain only the minimum claims required for authorization.** `sub`, `iss`, `aud`, `exp`, `iat`, and role/permission claims. No email, no full name, no address, no PII of any kind — the payload is base64url encoded, not encrypted, and is readable by anyone with the token.

6. **Rate limiting is enforced at the user/token level, not just at the IP level.** IP-based rate limiting is trivially bypassed with rotating proxies. Per-authenticated-user limits are the effective control against credential stuffing and account abuse.

---

## Decision Rules

**If** the client is a user-facing SPA or mobile app, **then** use Authorization Code + PKCE. Set `code_challenge_method=S256`. Never use `response_type=token` (Implicit).

**If** the client is a backend service calling another service (M2M), **then** use Client Credentials flow. The client secret is stored as an environment secret, never in source code or config files.

**If** the client is a CLI tool that runs on devices where a browser may not be available, **then** use Device Code flow (RFC 8628). Do not try to embed an authorization server redirect in a terminal.

**If** you are using HS256 and the same secret is shared with more than one service, **then** rotate to RS256 immediately. Every service that holds the HS256 secret is an implicit token issuer.

**If** a JWT's `exp` claim has passed, **then** reject it with `401`. Do not accept expired tokens because "it was just one minute ago." Clock skew tolerance max is 60 seconds, configured explicitly — not implicit.

**If** an access token is used for a high-security operation (payment, privilege escalation, account deletion), **then** require step-up authentication or token binding — do not rely solely on the bearer token.

**If** refresh token rotation is enabled and a refresh token is used more than once, **then** treat it as a token theft signal: invalidate the entire token family and force re-authentication.

**If** an API key has been idle for more than 90 days (sensitive) or 365 days (low-risk), **then** expire it and notify the owner before revocation. Staleness = forgotten key = forgotten attack surface.

**Never** return a `403` that reveals which specific resource exists but the user cannot access. For BOLA/IDOR, return `404` for resources the caller has no business knowing exist.

**Never** pass security tokens in URL query parameters.** URLs are logged by proxies, CDNs, and browsers. Tokens go in the `Authorization` header only.

---

## Mental Models

**Bearer Token as a Physical Key**
A bearer token grants access to whoever holds it, like a physical key. It does not verify the holder's identity — it only asserts a prior authentication event. This means the transport layer (TLS) is not optional: interception of a bearer token = full impersonation. Token binding (draft RFC) ties the token to the TLS channel so a stolen token cannot be replayed from a different connection. For most APIs, short `exp` windows (15 minutes for access tokens) are the practical mitigation.

**The Authorization Code as a One-Time Check**
The authorization code returned after user consent is a short-lived (typically 60–300 second), single-use credential that can only be exchanged for tokens by a client that proves possession of the PKCE verifier. This is why PKCE matters even for confidential clients: the code is transmitted through the browser redirect, which is a less controlled channel than a backend call. The code is useless without the verifier, and the verifier never leaves the client.

**Defense in Depth for API Keys**
API key security has four independent layers: (1) generation — cryptographically random, 32+ bytes, unpredictable; (2) storage — hashed with bcrypt/Argon2id, never plaintext; (3) transmission — TLS only, `Authorization` header, never URL params; (4) lifecycle — scoped to environment/service, rotated on schedule, immediately revocable. Compromising one layer still leaves three others. Most breaches exploit a single missing layer (usually storage or transmission).

**OWASP API Top 10 as Attack Taxonomy**
The OWASP API Security Top 10 maps to specific control gaps: BOLA (missing object-level authz), BFLA (missing function-level authz), Mass Assignment (missing allowlist on input binding), Excessive Data Exposure (missing field-level filtering on output). Treating the list as an architectural checklist — not just a pen-test finding list — prevents classes of vulnerabilities at design time rather than patching them post-incident.

---

## Vocabulary

| Term | Definition |
|---|---|
| PKCE | Proof Key for Code Exchange (RFC 7636); `code_verifier` + `code_challenge` pair prevents authorization code interception attacks; required for all public clients |
| Client Credentials | OAuth 2.0 grant type for M2M; no user context; client authenticates with its own credentials |
| RS256 | RSA Signature with SHA-256; asymmetric JWT algorithm; private key signs, public key verifies; standard for distributed systems |
| ES256 | ECDSA with P-256 and SHA-256; asymmetric, smaller key size than RS256; preferred for constrained environments |
| BOLA | Broken Object Level Authorization (OWASP API #1); attacker accesses another user's resource by manipulating an ID in the request |
| BFLA | Broken Function Level Authorization (OWASP API #5); attacker calls admin-only endpoints without admin role because endpoint-level authz is missing |
| Mass Assignment | Binding untrusted input fields directly to domain objects; prevented with explicit allowlists, never `**kwargs` or model auto-bind on untrusted input |
| mTLS | Mutual TLS; both client and server present certificates; used for service-to-service authentication in zero-trust environments |
| Token Rotation | Invalidating a refresh token on use and issuing a new one; double-use detection signals theft and triggers session termination |
| Scope | A named permission attached to an OAuth token (e.g., `read:orders`, `write:payments`); enforced at resource server; never infer scope from role alone |
| HSTS | HTTP Strict Transport Security; `max-age=31536000; includeSubDomains; preload` forces TLS for one year; prevents SSL stripping attacks |
| JWK Set (JWKS) | JSON Web Key Set endpoint (`/.well-known/jwks.json`); public keys for verifying JWTs; consumers fetch and cache with TTL, rotate by adding new key before removing old |

---

## Common Mistakes and How to Avoid Them

### 1. HS256 with a Shared Secret

**Bad:** Sign JWTs with a symmetric HMAC secret shared across all services. Any service holding the secret can forge tokens.

```python
# BAD: HS256 shared secret — every service is an implicit token issuer
import jwt

SECRET = "my-super-secret-key"  # stored in config, shared with 8 services

token = jwt.encode({"sub": "user_123", "role": "admin"}, SECRET, algorithm="HS256")

# In payment-service, notification-service, reporting-service...
decoded = jwt.decode(token, SECRET, algorithms=["HS256"])
# Any of these services can now MINT tokens, not just verify them
```

**Fix:** Use RS256. Auth service holds the private key. All other services hold only the public key from the JWKS endpoint.

```python
# GOOD: RS256 asymmetric — only auth-service can mint tokens
from cryptography.hazmat.primitives import serialization
import jwt

# auth-service only: sign with private key
with open("private_key.pem", "rb") as f:
    private_key = serialization.load_pem_private_key(f.read(), password=None)

token = jwt.encode(
    {"sub": "user_123", "iss": "https://auth.example.com",
     "aud": "https://api.example.com", "exp": int(time.time()) + 900,
     "scope": "read:orders"},
    private_key,
    algorithm="RS256"
)

# payment-service: verify with public key only — cannot forge tokens
import httpx
jwks_client = jwt.PyJWKClient("https://auth.example.com/.well-known/jwks.json")
signing_key = jwks_client.get_signing_key_from_jwt(token)
decoded = jwt.decode(token, signing_key.key, algorithms=["RS256"],
                     audience="https://api.example.com")
```

### 2. PII and Sensitive Data in JWT Payload

**Bad:** Store email, full name, or other PII in the JWT payload assuming it is encrypted.

```python
# BAD: PII in JWT — base64url decoded by anyone who intercepts the token
payload = {
    "sub": "user_123",
    "email": "alice@example.com",
    "full_name": "Alice Johnson",
    "ssn_last4": "4242",         # catastrophic
    "role": "admin",
    "exp": int(time.time()) + 3600
}
token = jwt.encode(payload, private_key, algorithm="RS256")
# base64url decode the payload section — all PII is plaintext
```

**Fix:** JWT payload contains only authorization claims. Look up user details in the service if needed.

```python
# GOOD: minimal claims — only what authorization decisions require
payload = {
    "sub": "usr_A8M1QZ",            # opaque identifier, not email
    "iss": "https://auth.example.com",
    "aud": "https://api.example.com",
    "exp": int(time.time()) + 900,  # 15 minutes
    "iat": int(time.time()),
    "scope": "read:orders write:cart",
    "tid": "tenant_X9P2"            # tenant ID for multi-tenant authz
}
# To get email/name: call /users/{sub} in the user service with the token
```

### 3. API Key Stored in Plaintext

**Bad:** Store the raw API key in the database. A database read gives an attacker usable keys.

```python
# BAD: raw key stored — DB breach = immediate full access
def create_api_key(service_id):
    raw_key = secrets.token_hex(32)
    db.execute("INSERT INTO api_keys (service_id, key) VALUES (?, ?)",
               (service_id, raw_key))  # raw key in DB
    return raw_key
```

**Fix:** Hash before storage. Return raw key once. Use the prefix for identification in logs.

```python
# GOOD: hash stored, raw key shown once, prefix for log identification
import secrets
import bcrypt

def create_api_key(service_id: str) -> dict:
    raw_key = "sk_" + secrets.token_urlsafe(32)   # 43 random chars + prefix
    key_prefix = raw_key[:12]                      # "sk_XXXXXXXXX" for identification
    hashed = bcrypt.hashpw(raw_key.encode(), bcrypt.gensalt(rounds=12))

    db.execute(
        "INSERT INTO api_keys (service_id, key_prefix, key_hash, created_at, expires_at) "
        "VALUES (?, ?, ?, ?, ?)",
        (service_id, key_prefix, hashed.decode(),
         datetime.utcnow(), datetime.utcnow() + timedelta(days=90))
    )
    return {"key": raw_key, "prefix": key_prefix}  # raw_key shown ONCE, never stored

def verify_api_key(raw_key: str) -> Optional[dict]:
    prefix = raw_key[:12]
    row = db.fetchone("SELECT * FROM api_keys WHERE key_prefix = ? AND revoked = 0", (prefix,))
    if not row:
        return None
    if not bcrypt.checkpw(raw_key.encode(), row["key_hash"].encode()):
        return None
    if row["expires_at"] < datetime.utcnow():
        return None
    return row
```

### 4. BOLA / IDOR — Missing Object-Level Authorization

**Bad:** Authorize the endpoint but not the specific object. Any authenticated user can access any order.

```python
# BAD: endpoint-level auth only — any authenticated user gets any order
@app.get("/orders/{order_id}")
@require_auth
def get_order(order_id: str, current_user: User):
    order = db.get_order(order_id)   # no ownership check
    return order                     # user_A can fetch user_B's order
```

**Fix:** Enforce ownership or role at the object level on every read and write.

```python
# GOOD: object-level authorization check
@app.get("/orders/{order_id}")
@require_auth
def get_order(order_id: str, current_user: User):
    order = db.get_order(order_id)
    if order is None:
        raise HTTPException(status_code=404)   # don't leak existence
    if order.customer_id != current_user.id and "admin" not in current_user.scopes:
        raise HTTPException(status_code=404)   # 404, not 403 — don't confirm existence
    return order
```

### 5. Rate Limiting Only at the IP Level

**Bad:** Apply rate limits by IP only. Attackers using residential proxy pools bypass IP limits trivially.

```python
# BAD: IP-only rate limit — bypassed with rotating IPs
@app.post("/auth/login")
@rate_limit(limit=100, window=60, key=lambda req: req.client.host)  # per IP
def login(credentials: LoginRequest):
    ...
```

**Fix:** Apply tighter per-user limits after authentication; apply IP limits as a first-pass only.

```python
# GOOD: layered rate limiting — IP pre-auth, user post-auth, lockout on failures
from redis import Redis

redis = Redis()

@app.post("/auth/login")
def login(credentials: LoginRequest, request: Request):
    ip_key = f"ratelimit:ip:{request.client.host}"
    if redis.incr(ip_key) > 20:           # 20 attempts/min per IP
        redis.expire(ip_key, 60)
        raise HTTPException(429, "Too many requests")
    redis.expire(ip_key, 60)

    user = db.get_user_by_email(credentials.email)
    lockout_key = f"lockout:{credentials.email}"
    failures = int(redis.get(lockout_key) or 0)
    if failures >= 10:
        raise HTTPException(429, "Account temporarily locked")  # exponential backoff

    if not user or not verify_password(credentials.password, user.password_hash):
        redis.incr(lockout_key)
        redis.expire(lockout_key, min(30 * (2 ** failures), 3600))  # exp backoff, max 1h
        raise HTTPException(401, "Invalid credentials")

    redis.delete(lockout_key)
    return issue_tokens(user)
```

---

## Good vs. Bad Output

### Security Headers

**Bad:** Default framework headers — leaks server info, no HSTS, no content type protection.
```http
HTTP/1.1 200 OK
X-Powered-By: Express
Server: nginx/1.24.0
Content-Type: application/json
```

**Good:** Full security header set, server info stripped.
```http
HTTP/1.1 200 OK
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'none'
Cache-Control: no-store
Referrer-Policy: no-referrer
Content-Type: application/json; charset=utf-8
# X-Powered-By: ABSENT
# Server: ABSENT
```

### OAuth 2.0 Flow Selection

**Bad:** SPA uses Implicit flow — token in URL fragment, no PKCE.
```
GET /authorize?response_type=token&client_id=spa&redirect_uri=...
→ https://app.example.com/callback#access_token=eyJ...&token_type=bearer
# Token in URL = logged by browser history, proxy logs, referrer headers
```

**Good:** SPA uses Authorization Code + PKCE — code exchanged server-side, no token in URL.
```python
import secrets, hashlib, base64

code_verifier = secrets.token_urlsafe(64)
code_challenge = base64.urlsafe_b64encode(
    hashlib.sha256(code_verifier.encode()).digest()
).rstrip(b"=").decode()

auth_url = (
    "https://auth.example.com/authorize"
    f"?response_type=code"
    f"&client_id={CLIENT_ID}"
    f"&redirect_uri={REDIRECT_URI}"
    f"&code_challenge={code_challenge}"
    f"&code_challenge_method=S256"
    f"&scope=openid+read:orders"
    f"&state={secrets.token_urlsafe(16)}"
)
# Token exchange happens via POST /token with code + code_verifier — never in URL
```

---

## Checklist

- [ ] All user-facing clients use Authorization Code + PKCE — no Implicit flow anywhere in the codebase
- [ ] JWTs use RS256 or ES256; JWKS endpoint is published and consumers cache with TTL
- [ ] JWT payload contains no PII — `sub` is an opaque ID, no email/name/address
- [ ] JWT `exp` is ≤15 minutes for access tokens; refresh tokens rotate on every use
- [ ] API keys are generated with `secrets.token_urlsafe(32)` or equivalent, hashed with bcrypt/Argon2id before storage
- [ ] API keys are never logged; only the first 8–12 character prefix appears in logs for identification
- [ ] All tokens are passed in the `Authorization` header — never in URL query parameters
- [ ] Every object-level read and write checks ownership, not just endpoint-level authentication
- [ ] Rate limiting is applied per authenticated user (tighter) and per IP (first-pass); account lockout triggers after 10 failed attempts
- [ ] HSTS header set: `max-age=31536000; includeSubDomains; preload`; `X-Powered-By` and `Server` headers removed
- [ ] mTLS configured for all service-to-service calls in sensitive environments
- [ ] Security events logged: failed auth attempts, token issuance, API key creation/revocation, privilege escalation attempts — with timestamp, IP, user ID, and request ID
