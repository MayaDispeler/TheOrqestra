---
name: security-best-practices
description: Expert reference for application security — OWASP Top 10 mitigations, auth/authz, secrets management, cryptography, input validation, dependency hygiene, and secure-by-default code patterns
version: 2.0.0
---

# Security Best Practices — Expert Reference

## Non-Negotiable Standards

- **Never trust input**: all data crossing a trust boundary (HTTP params, headers, env, files, IPC, DB results from external services) is untrusted until validated and sanitized — no exceptions
- **Secrets have one home**: credentials, tokens, and keys live in a secrets manager (Vault, AWS Secrets Manager, GCP Secret Manager); never in source code, `.env` files committed to git, logs, or error messages
- **Principle of least privilege**: every service account, IAM role, database user, and API key gets only the permissions needed for its specific function — never `admin` as a default
- **Defense in depth**: no single security control is sufficient; layer authentication + authorization + input validation + output encoding + logging + network segmentation
- **Fail closed**: when a security check fails or throws an error, deny access by default; never let an exception become an allow
- **Security debt is not acceptable debt**: a known injection vulnerability or exposed credential is not a backlog item — it is a P0 incident
- **Audit everything security-relevant**: auth events, privilege escalations, data access, and config changes must be logged with timestamp, actor, and resource — without PII in log lines

---

## Decision Rules

**Input validation and injection:**
- If writing SQL → use parameterized queries / prepared statements; never string concatenation, even for table/column names
- If rendering user content in HTML → HTML-encode output at the point of rendering; never trust that input was sanitized upstream
- If accepting file uploads → validate MIME type server-side from magic bytes (not extension); scan content; store outside webroot; never execute uploaded files
- If building shell commands → use execvp-style APIs with argument arrays, never `shell=True` / `exec()` with string concatenation
- If deserializing user data → never use `pickle`, `marshal`, Java native deserialization, or `eval()` on untrusted data; use JSON with schema validation
- Never use `innerHTML`, `document.write()`, or `dangerouslySetInnerHTML` with user-controlled data

**Authentication:**
- If building login → implement rate limiting (lockout after 5-10 failures), constant-time comparison for credentials, and account enumeration protection (identical response for bad user vs bad password)
- If storing passwords → use bcrypt (cost 12+), Argon2id, or scrypt; never MD5, SHA-1, SHA-256, or any unsalted hash
- If issuing JWTs → sign with RS256 (asymmetric) for distributed systems; HS256 only when signing and verification happen in the same service; always set `exp`; explicitly reject `alg: none`
- If implementing MFA → TOTP (RFC 6238) is minimum; avoid SMS as sole MFA factor (SIM-swap risk)
- Never roll your own authentication library — use battle-tested frameworks (Passport, Spring Security, Devise)

**Authorization:**
- If checking permissions → enforce at the server, not the client; UI hiding is not authorization
- If accessing a resource by ID → verify the requesting user owns or has rights to that specific ID (IDOR prevention); a valid session does not imply access to all records
- If implementing RBAC → check role AND ownership; `admin` role must not implicitly grant cross-tenant access in multi-tenant systems
- Never cache authorization decisions for longer than the session TTL without an invalidation mechanism

**Cryptography:**
- If encrypting data at rest → AES-256-GCM; never AES-ECB (leaks patterns), never DES/3DES
- If generating tokens, nonces, or session IDs → use cryptographically secure RNG (`secrets.token_urlsafe()`, `crypto.randomBytes()`); never `Math.random()` or `random.random()`
- If hashing for integrity → SHA-256 minimum; never MD5 or SHA-1 for security-sensitive contexts
- If doing TLS → enforce TLS 1.2 minimum (TLS 1.3 preferred); disable SSLv3, TLS 1.0, TLS 1.1; pin certificates in mobile apps
- If comparing secrets (tokens, HMAC values) → use constant-time comparison (`hmac.compare_digest`, `crypto.timingSafeEqual`); never `==`
- Never implement your own cipher, key derivation function, or signature scheme

**Secrets:**
- If code needs a secret at runtime → inject via secrets manager SDK or mounted secret volume; never via environment variable set in source-controlled files
- If a secret is committed to git → rotate it immediately; assume it is compromised; git history is not safe even after rewrite
- If rotating secrets → implement rotation without downtime (dual-read: accept both old and new key during rotation window)
- Never log secrets, tokens, passwords, or PII — add a scrubber to your logging pipeline

**Dependencies:**
- If adding a dependency → check CVE history, last commit date, and download count; a package with 3 stars and a CVE is a supply chain risk
- If running in CI → run `npm audit --audit-level=high`, `pip-audit`, `trivy`, or `grype` on every build; fail the build on high/critical CVEs
- If a critical CVE exists → patch within 24h for severity ≥9.0, within 7 days for ≥7.0
- Never pin to `latest` in production; pin to exact versions and use Dependabot/Renovate for automated updates with review

**HTTP security:**
- Every web app must set: `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `Referrer-Policy: strict-origin-when-cross-origin`
- If handling CORS → whitelist specific origins; never `Access-Control-Allow-Origin: *` for authenticated endpoints
- If setting cookies → always `HttpOnly`, `Secure`, `SameSite=Strict` (or `Lax` for cross-site flows); never store session tokens in `localStorage`

---

## Common Mistakes and How to Avoid Them

| Mistake | Symptom / Risk | Fix |
|---|---|---|
| SQL string concatenation | SQL injection; full DB compromise | Parameterized queries, always, no exceptions |
| Password hashed with SHA-256 | Cracked in minutes with rainbow tables | bcrypt cost 12 or Argon2id |
| JWT `alg: none` accepted | Authentication bypass | Explicitly validate `alg` header; reject anything not in your allowlist |
| IDOR — fetching record by ID without ownership check | Any user can read/modify any record | `WHERE id = ? AND user_id = ?` on every query |
| Verbose error messages in prod | Stack traces leak internals; aids attacker recon | Generic user-facing errors; full detail in server logs only |
| `DEBUG=True` in production | Exposes source code, env vars, stack traces | Enforce `DEBUG=False` via CI check; never rely on developer discipline |
| Storing JWTs in localStorage | XSS can steal tokens | Use `HttpOnly` cookies for session tokens |
| Trusting `Content-Type` from client for file uploads | Bypass MIME validation | Detect file type from magic bytes server-side (e.g., `python-magic`, `file-type`) |
| Not rate-limiting auth endpoints | Brute-force and credential stuffing | IP-based + account-based rate limiting with exponential backoff |
| Wildcard CORS on authenticated API | CSRF-equivalent from any origin | Explicit origin whitelist; validate `Origin` header server-side |
| Using `==` for token comparison | Timing attack leaks token character-by-character | Always `hmac.compare_digest()` or `secrets.compare_digest()` |

---

## Good vs Bad Output

**BAD — SQL injection:**
```python
query = f"SELECT * FROM users WHERE email = '{email}' AND password = '{password}'"
cursor.execute(query)
```

**GOOD — parameterized query:**
```python
cursor.execute(
    "SELECT id, email, role FROM users WHERE email = %s",
    (email,)
)
user = cursor.fetchone()
if user and bcrypt.checkpw(password.encode(), user["password_hash"]):
    ...
```

---

**BAD — password storage:**
```python
import hashlib
hashed = hashlib.sha256(password.encode()).hexdigest()
```

**GOOD — password storage:**
```python
import bcrypt
hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12))
# verify:
bcrypt.checkpw(password.encode("utf-8"), stored_hash)
```

---

**BAD — secret in source:**
```python
STRIPE_SECRET_KEY = "sk_live_XXXXXXXXX"
DATABASE_URL = "postgres://admin:prod-password@db.internal/app"
```

**GOOD — secret via secrets manager:**
```python
import boto3, json

def get_secret(name: str) -> dict:
    client = boto3.client("secretsmanager", region_name="us-east-1")
    response = client.get_secret_value(SecretId=name)
    return json.loads(response["SecretString"])

db_creds = get_secret("prod/app/database")
```

---

**BAD — IDOR (no ownership check):**
```python
@app.get("/api/documents/{doc_id}")
def get_document(doc_id: int, current_user: User = Depends(get_current_user)):
    return db.query(Document).filter(Document.id == doc_id).first()
    # Any authenticated user can read any document
```

**GOOD — IDOR protected:**
```python
@app.get("/api/documents/{doc_id}")
def get_document(doc_id: int, current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter(
        Document.id == doc_id,
        Document.owner_id == current_user.id   # ownership enforced at query level
    ).first()
    if not doc:
        raise HTTPException(status_code=404)   # identical response for not-found and not-authorized
    return doc
```

---

**BAD — JWT validation:**
```python
payload = jwt.decode(token, options={"verify_signature": False})
```

**GOOD — JWT validation:**
```python
payload = jwt.decode(
    token,
    key=PUBLIC_KEY,
    algorithms=["RS256"],   # explicit allowlist; rejects "none"
    options={"require": ["exp", "iat", "sub"]}
)
```

---

**BAD — password reset (predictable token, no expiry):**
```
1. User enters email
2. Send link: /reset?token={user_id}_{timestamp}
3. On click: verify token matches
```

**GOOD — password reset:**
```
1. User enters email — always respond "if account exists, email sent" (no enumeration)
2. Generate 32-byte CSPRNG token, hash with SHA-256, store hash + expiry (15min) + used=false
3. Email raw token in link
4. On click: hash received token, compare to stored hash (constant-time), check expiry, check used=false
5. Mark used=true before proceeding. Invalidate all active sessions after reset.
```

---

## Vocabulary and Mental Models

**OWASP Top 10**: The canonical list of most critical web application security risks. Memorize the top 5: Broken Access Control (#1), Cryptographic Failures (#2), Injection (#3), Insecure Design (#4), Security Misconfiguration (#5). These account for most real-world breaches.

**Trust boundary**: The line between code/data you control and code/data you don't. Every crossing requires validation: HTTP request body, URL params, headers, cookies, external APIs, file system reads, inter-process messages.

**Defense in depth**: Multiple independent security controls such that failure of any one control does not result in a breach. Input validation AND parameterized queries AND WAF — not input validation OR parameterized queries.

**Fail closed**: When a security check errors or control flow is unclear, the safe default is deny. `if error: raise PermissionDenied()`, not `if error: pass`.

**IDOR (Insecure Direct Object Reference)**: Accessing a resource by its identifier without verifying the requester owns it. One of the most common and highest-impact bugs in REST APIs. The fix is always: scope every query to the authenticated user's ID.

**Timing attack**: Comparing secrets with `==` leaks timing information; attackers can brute-force character-by-character. Always use `hmac.compare_digest()` or `secrets.compare_digest()`.

**SSRF (Server-Side Request Forgery)**: Attacker causes your server to make HTTP requests to internal services (cloud metadata endpoint, internal APIs). Validate and allowlist outbound URLs; block `169.254.169.254`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`.

**STRIDE (Threat Modeling)**:
- **S**poofing → mitigate with strong auth
- **T**ampering → mitigate with signatures/MACs
- **R**epudiation → mitigate with signed audit logs
- **I**nformation disclosure → mitigate with encryption + least privilege
- **D**enial of service → mitigate with rate limiting + resource quotas
- **E**levation of privilege → mitigate with authorization checks on every action

**Content Security Policy (CSP)**: HTTP header restricting which scripts and resources a browser can load. Primary mitigation for XSS. Start with `default-src 'self'` and expand only as needed.

**Supply chain attack**: Compromising a dependency to inject malicious code into all consumers. Mitigated by pinning exact versions, auditing CVEs, and reviewing critical dependencies.

**Secret sprawl**: Credentials duplicated across `.env` files, CI/CD secrets, Kubernetes secrets, developer laptops, and Slack messages. Solved only by centralizing in a secrets manager with audit logs and rotation policies.

**TOCTOU (Time of Check / Time of Use)**: Race condition between a permission check and the action it gates. Solve with atomic operations or re-checking at time of use, not time of request.
