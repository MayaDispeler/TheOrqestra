---
name: error-handling-patterns
description: Error handling patterns across frontend, backend, and APIs — taxonomy, Result types, RFC 7807, retry logic, and structured logging.
version: 1.0
---

# Error Handling Patterns Expert Reference

## Non-Negotiable Standards

1. **Never swallow errors silently.** An empty `catch {}` block is a production debugging nightmare. Every caught error must be logged, surfaced, or explicitly converted into a typed failure.
2. **Expected failures are not exceptions.** A "user not found" or "validation failed" result is a normal program output. Return a `Result<T, E>` type — do not throw. Reserve `throw` for truly unexpected, unrecoverable situations.
3. **All API error responses conform to RFC 7807 Problem Details** (`application/problem+json`). Every error response includes: `type`, `title`, `status`, `detail`, and `instance`. No free-form JSON error shapes.
4. **Stack traces never reach the client.** User-facing error messages are actionable English. Stack traces, query parameters, database names, and internal paths are logged server-side only.
5. **Retry logic must implement exponential backoff with jitter.** Fixed-interval retries cause thundering herd. Max 3 retries. Network errors and 5xx responses are retryable; 4xx responses are not.
6. **Structured logs always include `correlationId`, `userId` (if authenticated), `timestamp` (ISO 8601), `errorCode`, and `severity`.** Free-text log messages without structure are unsearchable at scale.

---

## Decision Rules

1. **If the failure is expected in normal business logic (user not found, insufficient funds, conflict), return `Result<T, E>` — never throw.**
2. **If the failure is a programming error (null dereference, assertion violation), throw — it should crash loudly in development and be caught by a global error boundary in production.**
3. **Use HTTP 400** for malformed syntax (missing required field, wrong content-type). **Use HTTP 422** for syntactically valid but semantically invalid input (email is a valid string but already registered). **Use HTTP 409** for state conflicts (concurrent edit, duplicate resource). These are not interchangeable.
4. **Use HTTP 401 for unauthenticated requests (no valid token) and HTTP 403 for authorized users who lack permission.** Returning 404 to hide existence of a resource is acceptable for sensitive resources.
5. **Log at ERROR level** when: the system cannot recover without human intervention, a request fails unexpectedly, or data may be in an inconsistent state. **Log at WARN** when: a retry succeeded, a deprecated code path was used, or a non-critical service is unavailable. **Log at INFO** for normal significant events (user login, payment processed). **DEBUG** for internal state useful during development.
6. **If an operation is idempotent (GET, PUT, DELETE), it is retryable.** If non-idempotent (POST creating a resource), it is retryable only if the server returns an idempotency key in the response or accepts one in the request.
7. **If TanStack Query is in use, configure `retry: 3` with a `retryDelay` using exponential backoff.** Do not build retry logic inside `useEffect`.
8. **Error boundaries in React: mandatory at route level and feature level.** Never at the individual component level (too granular — degrades UX). The boundary should render a meaningful fallback for its scope, not a blank screen.
9. **If an error code is not in your defined `ErrorCode` enum/const, default to `UNKNOWN_ERROR` and log the raw error.** Never let undefined error codes reach the user.
10. **Graceful degradation over hard failure.** If a non-critical service (recommendations, analytics) fails, render without it. Only block rendering for errors in core data paths.

---

## Mental Models

### 1. The Error Taxonomy

Classify every error before deciding how to handle it:

```
Error Taxonomy
├── Validation Errors       → HTTP 400 / 422, return to user with field context
│   • "email is required"
│   • "amount must be positive"
│
├── User/Business Errors    → HTTP 409 / 404 / 403, return structured message
│   • "username already taken"
│   • "insufficient funds"
│   • "resource not found"
│
├── Network/Transient Errors → Retry with backoff (3xx, 5xx, ECONNRESET)
│   • Timeout, DNS failure, 503 Service Unavailable
│
└── System/Programming Errors → Crash loudly (dev), log + fallback UI (prod)
    • Null dereference, assertion failure, unhandled promise rejection
    • Corrupt data, unexpected enum values
```

The handling strategy is determined entirely by the category. Mixing categories (catching a programming error and returning a 422) produces confusing, untraceable systems.

### 2. The Result Type Pattern

Functions that can fail in expected ways return `Result<T, E>` instead of throwing. This makes failure explicit in the type system and forces callers to handle it.

```ts
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// Helper constructors
const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
```

The caller must destructure and check `ok` before accessing `value`. There is no way to accidentally use the value without handling the error path.

### 3. The RFC 7807 Error Envelope

Every API error response has this shape:

```json
{
  "type": "https://example.com/errors/insufficient-funds",
  "title": "Insufficient Funds",
  "status": 422,
  "detail": "Your account balance ($12.00) is below the required amount ($50.00).",
  "instance": "/transactions/a3f7c",
  "extensions": {
    "balance": 12.00,
    "required": 50.00,
    "correlationId": "req_01HXYZ..."
  }
}
```

`type` is a stable URI that acts as a machine-readable error code. `detail` is human-readable and context-specific. `instance` is the resource that triggered the error. Extensions carry structured, domain-specific data for programmatic handling.

### 4. The Retry Budget Model

Retries are a resource, not a free action. Unbounded retries under failure amplify load on a struggling service (thundering herd). The retry budget:
- Max 3 attempts (1 original + 2 retries)
- Backoff: `min(base * 2^attempt + jitter, maxDelay)` where `base = 100ms`, `maxDelay = 10_000ms`, `jitter = random(0, 100ms)`
- Circuit breaker: if >50% of requests fail within a 30-second window, stop retrying and fail fast for 60 seconds

---

## Vocabulary

| Term | Precise Meaning |
|---|---|
| Result Type | A discriminated union `{ ok: true; value: T } \| { ok: false; error: E }` used to make expected failures explicit in the type system. |
| RFC 7807 | IETF standard for HTTP API error responses — defines the `application/problem+json` media type with `type`, `title`, `status`, `detail`, `instance` fields. |
| Error Boundary | A React class component or `react-error-boundary` wrapper that catches render-phase errors and renders a fallback UI. |
| Correlation ID | A unique identifier attached to a request at its entry point and threaded through all logs and downstream calls — enables tracing a single request across services. |
| Exponential Backoff | A retry delay strategy where each subsequent attempt waits `base * 2^attempt` milliseconds before retrying. |
| Jitter | Random delay added to backoff intervals to prevent synchronized retry storms from multiple clients. |
| Circuit Breaker | A pattern that stops attempting a failing operation after a threshold is crossed, allowing the downstream service to recover. |
| Graceful Degradation | Rendering the core experience without a non-critical feature when that feature's service fails. |
| Thundering Herd | When many clients simultaneously retry a failed service with the same timing, overwhelming it as it recovers. |
| Idempotent Operation | An operation that produces the same result regardless of how many times it is executed — safe to retry. |
| Structured Logging | Log output in a machine-parseable format (JSON) with consistent fields rather than free-text strings. |
| Error Code | A stable, enumerated string identifier for a specific error type — used programmatically by clients and in monitoring dashboards. |

---

## Common Mistakes and How to Avoid Them

### Mistake 1: Swallowing Errors Silently

**Bad**
```ts
async function deleteUser(id: string) {
  try {
    await db.user.delete({ where: { id } });
  } catch (e) {
    // Silent — user is never deleted, caller has no idea why
  }
}
```

**Why:** The error disappears. The caller receives `undefined`, assumes success, and downstream state becomes inconsistent.

**Fix**
```ts
async function deleteUser(id: string): Promise<Result<void, AppError>> {
  try {
    await db.user.delete({ where: { id } });
    return ok(undefined);
  } catch (error) {
    logger.error('Failed to delete user', {
      userId: id,
      error: toAppError(error),
      correlationId: getCorrelationId(),
    });
    return err(toAppError(error));
  }
}

// Caller is forced to handle the failure
const result = await deleteUser(id);
if (!result.ok) {
  return res.status(500).json(problemDetails(result.error));
}
```

---

### Mistake 2: Wrong HTTP Status Codes

**Bad**
```ts
// Returns 400 for a conflict — misleads API consumers
app.post('/users', async (req, res) => {
  const existing = await db.user.findUnique({ where: { email: req.body.email } });
  if (existing) {
    return res.status(400).json({ message: 'Email already in use' }); // Wrong
  }
});
```

**Why:** 400 means "your request is malformed." A duplicate email is a valid request that conflicts with existing state — that is 409.

**Fix**
```ts
app.post('/users', async (req, res) => {
  const validation = createUserSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json(problemDetails({     // 400: malformed
      type: 'https://api.example.com/errors/invalid-input',
      title: 'Invalid Input',
      detail: validation.error.message,
    }));
  }

  const existing = await db.user.findUnique({ where: { email: validation.data.email } });
  if (existing) {
    return res.status(409).json(problemDetails({     // 409: conflict
      type: 'https://api.example.com/errors/email-conflict',
      title: 'Email Already Registered',
      detail: 'An account with this email address already exists.',
      instance: req.path,
    }));
  }
});
```

---

### Mistake 3: No Retry Logic, or Fixed-Interval Retries

**Bad**
```ts
// No retry — transient failures always fail the user
const response = await fetch('/api/data');

// Fixed interval — thundering herd if many clients fail simultaneously
for (let i = 0; i < 3; i++) {
  try {
    return await fetch('/api/data');
  } catch {
    await sleep(1000); // Every client retries at exactly the same time
  }
}
```

**Why:** Fixed intervals cause synchronized retries. When a server blips and recovers, all clients hit it simultaneously, potentially causing a second failure.

**Fix**
```ts
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  { maxAttempts = 3, baseDelayMs = 100, maxDelayMs = 10_000 } = {}
): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts - 1) throw error; // Final attempt — rethrow
      if (!isRetryable(error)) throw error;         // 4xx — do not retry

      const backoff = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      const jitter = Math.random() * 100;
      await sleep(backoff + jitter);
    }
  }
  throw new Error('unreachable');
}

function isRetryable(error: unknown): boolean {
  if (error instanceof HttpError) {
    return error.status >= 500 || error.status === 429;
  }
  // Network-level errors (ECONNRESET, ETIMEDOUT) are retryable
  return error instanceof TypeError; // fetch network failure
}
```

---

### Mistake 4: Stack Traces in API Responses

**Bad**
```ts
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    message: err.message,
    stack: err.stack,           // Exposes internal paths, library versions
    query: (err as any).query,  // Exposes SQL query — security vulnerability
  });
});
```

**Why:** Stack traces reveal implementation details — file paths, library versions, database schema. This data is valuable to attackers.

**Fix**
```ts
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const appError = toAppError(err);
  const correlationId = req.headers['x-correlation-id'] as string ?? generateId();

  logger.error('Unhandled request error', {
    correlationId,
    userId: req.user?.id,
    path: req.path,
    method: req.method,
    errorCode: appError.code,
    errorMessage: appError.message,
    stack: appError.stack, // Logged internally — never sent to client
  });

  res.status(appError.statusCode ?? 500).json({
    type: `https://api.example.com/errors/${appError.code}`,
    title: appError.title,
    status: appError.statusCode ?? 500,
    detail: appError.userMessage, // Sanitized, actionable, no internals
    instance: req.path,
    extensions: { correlationId },
  });
});
```

---

### Mistake 5: Error Boundary at the Wrong Granularity

**Bad**
```tsx
// Wrapping every leaf component — too granular, poor UX
function ProductCard({ product }) {
  return (
    <ErrorBoundary fallback={<span>Error</span>}>  {/* Too low */}
      <img src={product.imageUrl} />
      <h3>{product.name}</h3>
    </ErrorBoundary>
  );
}
```

**Why:** A broken image renders a broken UI fragment inline. The user sees "Error" in the middle of a product grid with no recovery action.

**Fix**
```tsx
// Route level — catches any crash in the page
// app/products/error.tsx (Next.js App Router)
'use client';
export default function ProductsError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert">
      <h2>Unable to load products</h2>
      <p>Something went wrong. Please try again.</p>
      <button onClick={reset}>Retry</button>
    </div>
  );
}

// Feature level — isolates the recommendations widget failure
function ProductPage({ product }) {
  return (
    <main>
      <ProductDetails product={product} />       {/* Core — no boundary needed here */}
      <ErrorBoundary fallback={<RecommendationsFallback />}>
        <Recommendations productId={product.id} />  {/* Non-critical — isolated */}
      </ErrorBoundary>
    </main>
  );
}
```

---

## Good vs. Bad Output

### Full Error Handling Stack — API Route

**Bad**
```ts
app.post('/transfer', async (req, res) => {
  try {
    const { fromId, toId, amount } = req.body; // No validation
    const result = await transferFunds(fromId, toId, amount);
    res.json({ success: true, result });
  } catch (e: any) {
    console.log(e); // Unstructured, not searchable
    res.status(500).json({
      error: e.message, // May expose internals
      stack: e.stack,   // Security vulnerability
    });
  }
});
```

**Good**
```ts
app.post('/transfer', authenticate, async (req: AuthedRequest, res) => {
  const correlationId = req.headers['x-correlation-id'] as string ?? generateId();

  // 1. Validate input — return 400/422 before touching business logic
  const parsed = transferSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      type: 'https://api.example.com/errors/invalid-transfer',
      title: 'Invalid Transfer Request',
      status: 422,
      detail: parsed.error.errors.map(e => e.message).join('; '),
      instance: req.path,
      extensions: { correlationId, fields: parsed.error.flatten().fieldErrors },
    });
  }

  // 2. Execute business logic — returns Result, never throws for expected failures
  const result = await transferFunds(parsed.data);

  if (!result.ok) {
    const { error } = result;

    logger.warn('Transfer rejected', {
      correlationId,
      userId: req.user.id,
      errorCode: error.code,
      fromId: parsed.data.fromId,
      amount: parsed.data.amount,
    });

    const status = error.code === 'INSUFFICIENT_FUNDS' ? 422
                 : error.code === 'ACCOUNT_FROZEN' ? 409
                 : 500;

    return res.status(status).json({
      type: `https://api.example.com/errors/${error.code.toLowerCase()}`,
      title: error.title,
      status,
      detail: error.userMessage,
      instance: req.path,
      extensions: { correlationId },
    });
  }

  logger.info('Transfer completed', {
    correlationId,
    userId: req.user.id,
    transactionId: result.value.id,
    amount: parsed.data.amount,
  });

  res.status(200).json({ transactionId: result.value.id });
});
```

---

## Checklist

- [ ] No empty `catch {}` blocks anywhere in the codebase
- [ ] Expected business failures return `Result<T, E>` — not thrown exceptions
- [ ] All API error responses conform to RFC 7807 (`type`, `title`, `status`, `detail`, `instance`)
- [ ] HTTP status codes are semantically correct: 400/422/409/401/403 used per taxonomy
- [ ] Stack traces and internal paths are never included in client-facing responses
- [ ] All API responses include a `correlationId` in the error extensions
- [ ] Structured logging includes: `correlationId`, `userId`, `timestamp`, `errorCode`, `severity`
- [ ] Retry logic uses exponential backoff with jitter — not fixed intervals
- [ ] Only retryable errors are retried: network errors, 429, 5xx — never 4xx
- [ ] React error boundaries are at route and feature level — not individual component level
- [ ] Non-critical features (recommendations, analytics) degrade gracefully and never block core rendering
- [ ] User-facing error messages are actionable English — no technical jargon, no internal identifiers
