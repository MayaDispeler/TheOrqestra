---
name: serverless-patterns
description: Expert reference for serverless architecture patterns, Lambda optimization, and event-driven design
version: 1.0
---

# Serverless Patterns Expert Reference

## Non-Negotiable Standards

1. **Every event-triggered function must be idempotent**: Event queues deliver at-least-once. If your function runs twice on the same event, the result must be identical to running it once. Non-idempotent functions will eventually corrupt data.
2. **Dead letter queues are configured on all async invocations**: A Lambda invoked asynchronously that fails after 3 retries silently drops the event without a DLQ. Every async trigger (SQS, SNS, EventBridge, S3) has a DLQ configured.
3. **Function bundle size is actively managed**: Cold start duration is directly proportional to bundle size. Lambda bundle target: <10MB unzipped. Include only production dependencies. No `devDependencies` in the deployment package.
4. **Structured logging with correlation IDs is required**: `console.log("processing request")` is not observability. Every log entry includes: timestamp, level, function name, request ID, and correlation/trace ID. JSON format only.
5. **State is never stored in the function's execution environment between invocations**: Lambda execution environments may be reused or replaced at any time. In-memory state between invocations is unreliable. External state stores (DynamoDB, ElastiCache, SQS) are the only reliable state mechanism.

---

## Decision Rules

**If** the workload is event-driven with variable traffic (10× or more variance) → serverless is the right model. Consistent high-throughput workloads are cheaper on always-on containers.

**If** execution time exceeds 15 minutes → Lambda is not the right tool. Use ECS Fargate tasks, Step Functions with longer timeouts, or AWS Batch.

**If** latency SLA is below 50ms p99 → avoid serverless without provisioned concurrency. Cold starts add 100ms-3s depending on runtime and bundle size. Provisioned concurrency eliminates cold starts at a cost premium.

**If** the function is in a VPC → cold start penalty is 100-500ms additional latency. Evaluate whether VPC access is truly required. Most functions don't need VPC — use VPC only for RDS, ElastiCache, or other VPC-bound resources.

**If** optimizing Lambda cost → run Lambda Power Tuning tool. Optimal memory is rarely 128MB. More memory = more CPU allocation. 512-1024MB often has lower cost×duration than 128MB due to faster execution.

**If** SQS triggers Lambda → set visibility timeout = 6× function timeout. If function takes 30s, visibility timeout must be 180s minimum. Otherwise SQS makes the message visible again while the function is still processing, causing duplicate invocations.

**If** the workflow has multiple steps with branching or long waits → use Step Functions. Lambda chaining via direct invocation creates tight coupling and error handling nightmares.

**If** using Lambda for API endpoints → Lambda Function URLs or API Gateway. API Gateway adds features (auth, rate limiting, caching, request transformation) and latency (~3ms). Use Function URLs when you need none of those features.

**Never** use Lambda for stateful orchestration without Step Functions. Polling loops, sleep calls, and retry logic inside Lambda waste execution time and money.

**Never** import an entire SDK package when you need one service. `import AWS from 'aws-sdk'` loads the entire SDK. `import { DynamoDBClient } from '@aws-sdk/client-dynamodb'` loads only what you need.

---

## Mental Models

**The Serverless Use Case Spectrum**
```
IDEAL FOR SERVERLESS:
├── Event processing (S3 upload, SQS message, DynamoDB stream)
├── Scheduled batch jobs (nightly reports, cleanups)
├── API handlers with variable traffic
├── Webhooks and integrations
└── Glue code between AWS services

NOT IDEAL FOR SERVERLESS:
├── <10ms latency APIs (cold start risk)
├── >15min execution (Lambda limit)
├── Steady high-throughput APIs (containers cheaper)
├── Real-time stateful workflows (use Step Functions + ECS)
└── WebSocket servers (use API Gateway WebSocket + connection table)
```

**The Cold Start Mitigation Ladder**
```
Problem: Cold starts add latency
Solution options (cost vs effectiveness):

1. Optimize bundle size (<10MB) → reduces cold start duration
2. Choose faster runtime (Node.js/Python > Java/C#) → 100ms vs 1-3s
3. Avoid VPC unless required → saves 100-500ms
4. Provisioned concurrency (most expensive) → eliminates cold starts entirely

For Java: Lambda SnapStart (GraalVM native compilation) reduces from ~3s to ~200ms
```

**The Serverless Cost Model**
```
Lambda cost = (execution time × memory) + (number of invocations)

Price: $0.0000166667 per GB-second + $0.20 per 1M requests
                                      (first 1M free/month)

Example: 1M invocations/month, 512MB, 500ms avg execution
= 1,000,000 × 0.5GB × 0.5s = 250,000 GB-seconds
= 250,000 × $0.0000166667 = $4.17 compute
+ $0.20 request charge
= $4.37/month total

Compare to always-on container:
  1 vCPU / 1GB ECS Fargate = ~$30/month
Serverless wins for variable traffic; containers win for steady high-volume.
```

---

## Vocabulary

| Term | Precise Meaning |
|---|---|
| Cold start | Latency incurred when a new Lambda execution environment is initialized |
| Warm start | Request handled by an already-initialized execution environment (no cold start penalty) |
| Execution environment | The isolated runtime container Lambda uses; may be reused for subsequent invocations |
| Provisioned concurrency | Pre-initialized execution environments that eliminate cold starts |
| Concurrency | Number of function instances running simultaneously |
| Reserved concurrency | Hard limit on maximum concurrent instances for a function |
| DLQ | Dead Letter Queue — receives events that fail after all retries |
| Idempotency | Property where running the same operation multiple times produces the same result |
| SQS visibility timeout | Time an SQS message is hidden after being received; must exceed function timeout |
| Step Functions | AWS serverless workflow orchestration service for multi-step stateful processes |
| Lambda Power Tuning | Open-source tool for finding optimal memory configuration by testing multiple settings |
| EMF | Embedded Metrics Format — structured log format that creates CloudWatch metrics without extra API calls |

---

## Common Mistakes and How to Avoid Them

**Mistake 1: Non-idempotent event handlers**
- Bad:
```javascript
exports.handler = async (event) => {
  const order = event.detail;
  await db.insert('orders', order); // Fails if called twice — duplicate key error
  await sendConfirmationEmail(order.email); // Sends duplicate email
};
```
- Fix:
```javascript
exports.handler = async (event) => {
  const order = event.detail;
  // Upsert — safe to call multiple times
  await db.upsert('orders', order, { onConflict: 'id', update: false });
  // Check before sending
  const already_sent = await db.exists('email_log', { order_id: order.id, type: 'confirmation' });
  if (!already_sent) {
    await sendConfirmationEmail(order.email);
    await db.insert('email_log', { order_id: order.id, type: 'confirmation' });
  }
};
```

**Mistake 2: No DLQ on async triggers**
- Bad: S3 trigger → Lambda fails → event silently dropped, nobody knows
- Fix: Every event source mapping has a DLQ. Configure an SQS DLQ on the Lambda event source mapping. Alert on DLQ message count > 0.

**Mistake 3: Wrong SQS visibility timeout**
- Bad: Function timeout = 30s, SQS visibility timeout = 30s → SQS makes message visible again while function is still running → duplicate processing
- Fix: Visibility timeout = max(6 × function timeout, 60s). If function timeout is 30s, visibility timeout = 180s.

**Mistake 4: Importing entire SDKs**
- Bad: `const AWS = require('aws-sdk');` — adds ~10MB to bundle, increases cold start by 300-500ms
- Fix: `const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');` — modular v3 SDK imports only what's needed.

**Mistake 5: Synchronous invocation chains**
- Bad: Lambda A → sync invokes Lambda B → sync invokes Lambda C → if C fails, A gets error, error handling is complex, timeout is cumulative
- Fix: Lambda A → SQS → Lambda B → SQS → Lambda C. Async with queues. Each function handles its own retries and DLQ. Failures are isolated.

---

## Good vs. Bad Output

**BAD Lambda handler:**
```javascript
const AWS = require('aws-sdk'); // Full SDK — huge bundle
const s3 = new AWS.S3();

exports.handler = async (event) => {
  console.log('Processing'); // Unstructured log

  const result = await processItem(event.item); // Not idempotent

  // Global state — unreliable between invocations
  processedCount++;

  return result;
};
```

**GOOD Lambda handler:**
```javascript
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3'); // Modular
const s3Client = new S3Client({}); // Reuse outside handler for warm starts

exports.handler = async (event) => {
  const { awsRequestId } = context;

  // Structured logging with correlation
  const log = (level, msg, data = {}) => console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level, message: msg,
    requestId: awsRequestId,
    ...data
  }));

  log('INFO', 'Processing started', { itemId: event.item.id });

  try {
    // Idempotency check
    const existing = await getProcessedItem(event.item.id);
    if (existing) {
      log('INFO', 'Item already processed, skipping', { itemId: event.item.id });
      return { status: 'skipped' };
    }

    const result = await processItem(event.item);
    log('INFO', 'Processing complete', { itemId: event.item.id, duration: result.ms });
    return { status: 'success', result };

  } catch (err) {
    log('ERROR', 'Processing failed', { itemId: event.item.id, error: err.message });
    throw err; // Re-throw for retry/DLQ
  }
};
```

---

## Serverless Checklist

- [ ] All event-triggered functions are idempotent (upsert, deduplication check)
- [ ] DLQ configured on all async event sources
- [ ] Bundle size <10MB unzipped — devDependencies excluded
- [ ] Runtime selected for cold start performance (Node.js/Python for latency-sensitive)
- [ ] VPC attachment reviewed — removed if not required
- [ ] Lambda Power Tuning run — memory setting data-driven
- [ ] SQS visibility timeout = 6× function timeout
- [ ] Structured JSON logging with requestId and correlation ID
- [ ] No in-function global mutable state
- [ ] Step Functions used for multi-step workflows (not sync Lambda chains)
- [ ] Provisioned concurrency configured for latency-sensitive functions
- [ ] X-Ray tracing enabled
