---
name: graphql-standards
description: Expert reference for GraphQL schema design, resolver patterns, and production API standards.
version: 1.0
---

# GraphQL Standards Expert Reference

## Non-Negotiable Standards

1. **Schema is the contract. Breaking changes are never deployed without a deprecation cycle of minimum two release cycles.** Removing a field without deprecation is an API breakage regardless of whether clients "should" be using it.
2. **All mutations accept a single input object argument.** `createUser(input: CreateUserInput!)` — never `createUser(name: String!, email: String!, role: Role!)`. The second form breaks clients on every new required field.
3. **Mutations return a union type (Success | Error), never a Boolean.** A Boolean return type is information destruction. The mutation that returns `true` has made it impossible to return structured errors, partial success state, or the mutated entity.
4. **Authentication lives in context, not in resolvers.** Every resolver that checks `if (!context.user) throw new Error('Unauthorized')` inline is a security landmine — one missed check is a vulnerability. Auth middleware populates `context.user` or the request never reaches resolvers.
5. **N+1 queries are prohibited in production resolvers.** Every resolver that fetches a related entity inside a list resolver must use DataLoader. Unresolved N+1s are discovered in code review, not in production under load.
6. **Introspection is disabled in production.** Introspection exposes the full schema to attackers and is a reconnaissance tool. Enable it only in development and staging environments with authentication.

---

## Decision Rules

1. **If a field returns a list that could exceed 20 items, use Relay cursor-based pagination.** Never use offset pagination for GraphQL lists — offsets break when items are inserted or deleted between pages, producing duplicates and gaps. Connection pattern: `users(first: 20, after: "cursor"): UserConnection!`
2. **If an operation mutates state, it is a mutation regardless of how "simple" it feels.** `markNotificationRead` is a mutation. `incrementViewCount` is a mutation. Side effects do not belong in queries; queries must be safe to retry and cache.
3. **If acceptable latency for data freshness is >5 seconds, use polling, not subscriptions.** Subscriptions carry WebSocket overhead, connection state management, and scaling complexity. Polling a query every 5s is simpler, cheaper, and sufficient for most "real-time" requirements.
4. **If a resolver requires more than 3 arguments, wrap them in an input type.** `resolver(id: ID!, filter: String, sort: SortEnum, limit: Int, offset: Int)` is unmaintainable and client-unfriendly. `resolver(input: QueryInput!)` is extensible without breaking changes.
5. **Use code-first (Pothos, Nexus) when the team owns the schema and the codebase is TypeScript.** Use schema-first (SDL) when multiple teams contribute to the schema or a schema registry (Apollo Studio, GraphQL Inspector) governs the contract. Never mix both approaches in the same service.
6. **Set query depth limit to 10 and complexity limit to 1,000 for public-facing APIs.** Default: no limits = denial-of-service via deeply nested queries. Adjust complexity limits based on measured p99 production queries, not guesses.
7. **Field nullability policy: nullable by default for fields that can legitimately be absent; non-null (`!`) only when the field is always present and its absence represents a system error.** Never blanket-apply non-null to avoid null checks on the client — it turns runtime nulls into schema violations and crashes resolvers.
8. **If a field has been deprecated for two release cycles with zero usage (verified via schema usage analytics), it is safe to remove.** "Zero usage" requires instrumentation data — assumption is not evidence.
9. **Persisted queries are required for all mobile clients in production.** Persisted queries prevent arbitrary query execution, reduce payload size, and enable query allowlisting. Ad-hoc query execution from mobile is a security surface that must be closed.
10. **Rate limiting is applied by query cost, not by request count.** A request count limit allows a single expensive query to consume as much resource as 1,000 cheap queries. Assign cost units per field and enforce a per-client cost budget per minute.

---

## Mental Models

### 1. Schema Design: Noun-First Naming Hierarchy

```
TYPES (nouns, PascalCase)
  User, Order, Product, LineItem, PaymentMethod

QUERIES (describe what you get, camelCase)
  user(id: ID!): User
  orders(filter: OrderFilter): OrderConnection
  — NOT: getUser, fetchOrders, retrieveProduct

MUTATIONS (verb + noun, camelCase)
  createUser(input: CreateUserInput!): CreateUserResult
  updateOrderStatus(input: UpdateOrderStatusInput!): UpdateOrderStatusResult
  deletePaymentMethod(input: DeletePaymentMethodInput!): DeletePaymentMethodResult
  — NOT: userCreate, doCreateUser, saveUser

ENUMS (SCREAMING_SNAKE_CASE)
  enum OrderStatus { PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED }
  enum PaymentProvider { STRIPE, BRAINTREE, PAYPAL }

INPUT TYPES (suffix: Input)
  input CreateUserInput { name: String!, email: String!, role: UserRole! }

RESULT TYPES (suffix: Result or union: Success | Error)
  union CreateUserResult = CreateUserSuccess | CreateUserError
```

---

### 2. DataLoader Pattern: Batching and Caching Per Request

**The N+1 problem:**
```
# Query: 100 posts, each with an author
posts {           # 1 DB query
  title
  author {        # 100 DB queries (one per post) = 101 total
    name
  }
}
```

**DataLoader solution:**
```typescript
// 1. Create a DataLoader per request (inside context factory)
import DataLoader from 'dataloader';

function createContext(req) {
  return {
    user: req.user,
    loaders: {
      // batchFn receives an array of keys, returns array of values in same order
      userById: new DataLoader(async (userIds: readonly string[]) => {
        const users = await db.users.findMany({
          where: { id: { in: [...userIds] } }
        });
        // CRITICAL: Return in same order as input keys
        const userMap = new Map(users.map(u => [u.id, u]));
        return userIds.map(id => userMap.get(id) ?? new Error(`User ${id} not found`));
      }),
    },
  };
}

// 2. Resolver uses loader, not direct DB call
const resolvers = {
  Post: {
    author: (post, _args, context) =>
      context.loaders.userById.load(post.authorId),
    //                          ^^^^ batched + cached per request
  },
};

// Result: 100 posts → 2 DB queries total (posts + batched users)
```

**Rules:**
- Create DataLoader instances inside the request context factory — never as singletons (singleton = cross-request cache pollution).
- DataLoader caches within a request by default. This is almost always correct.
- `loadMany(ids)` for explicit batching; `load(id)` for single items that DataLoader will batch automatically.

---

### 3. Mutation Return Type: Union Pattern

```graphql
# Schema
type Mutation {
  createUser(input: CreateUserInput!): CreateUserResult!
}

union CreateUserResult = CreateUserSuccess | CreateUserError

type CreateUserSuccess {
  user: User!
}

type CreateUserError {
  code: CreateUserErrorCode!
  message: String!
  field: String          # which input field caused the error, if applicable
}

enum CreateUserErrorCode {
  EMAIL_ALREADY_EXISTS
  INVALID_EMAIL_FORMAT
  ROLE_NOT_PERMITTED
}
```

```graphql
# Client query
mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    ... on CreateUserSuccess {
      user { id name email }
    }
    ... on CreateUserError {
      code
      message
      field
    }
  }
}
```

**Why this pattern:**
- Typed errors are part of the schema contract — clients can exhaustively handle them.
- No reliance on HTTP status codes (which disappear over WebSockets and in batch requests).
- Adding a new error variant is an additive, non-breaking change.

---

### 4. Schema Evolution Rules (Additive-Only)

```
SAFE (additive, non-breaking):
  + Add a new field to a type
  + Add a new optional argument to a field
  + Add a new type
  + Add a new enum value (if clients use __typename or fragment exhaustiveness checking, this CAN break — communicate)
  + Add a new mutation
  + Mark a field @deprecated

BREAKING (never do without migration):
  - Remove a field
  - Rename a field
  - Change a field's type (String → Int)
  - Change nullable → non-null on an existing field
  - Remove an enum value
  - Change argument from optional to required

DEPRECATION TIMELINE:
  Cycle 1: Add @deprecated(reason: "Use newFieldName instead")
  Cycle 2: Verify zero usage via schema analytics (Apollo Studio field usage, GraphQL Hive)
  Cycle 3: Remove field
  Minimum wall-clock time between deprecation and removal: 60 days for internal APIs, 180 days for public APIs
```

---

## Vocabulary

| Term | Precise Meaning |
|------|-----------------|
| Resolver | A function that resolves a single field in the schema; maps to a type + field pair, e.g., `Query.user`, `User.posts` |
| DataLoader | A batching and per-request caching utility that collects individual load calls and executes them in a single batched fetch |
| N+1 Problem | An anti-pattern where resolving N parent objects triggers N additional queries for child objects instead of 1 batched query |
| Connection Pattern | Relay-spec pagination: `edges { node cursor } pageInfo { hasNextPage endCursor }` — supports forward and backward pagination |
| Input Type | A named group of arguments used exclusively as mutation/query inputs; defined with `input` keyword, not `type` |
| Union Type | A schema type that can be one of several object types; used for discriminated returns (e.g., `Success | Error`) |
| Persisted Query | A pre-registered query stored by hash on the server; clients send the hash, preventing arbitrary query execution |
| Introspection | A GraphQL feature allowing clients to query the schema itself; must be disabled in production |
| Query Depth | Maximum number of nested field levels in a single query; should be limited to prevent deeply recursive abuse |
| Query Complexity | A calculated cost score assigned to a query based on field weights; enforced as a per-request budget |
| @deprecated | A built-in schema directive marking a field or enum value as deprecated with an optional reason string |
| Schema Registry | A versioned store of schema definitions (e.g., Apollo Studio, GraphQL Hive) that tracks changes, usage, and breaking-change detection |

---

## Common Mistakes and How to Avoid Them

### Mistake 1: Mutation returns Boolean

**Bad:**
```graphql
type Mutation {
  deletePost(id: ID!): Boolean!
  updateUser(id: ID!, name: String, email: String): Boolean!
}
```

**Why wrong:** `true` tells the client nothing. `false` tells the client something went wrong but not what, which field, or how to recover. The client must rely on HTTP status codes or out-of-band error messages. Adding structured error info later is a breaking change.

**Fix:**
```graphql
type Mutation {
  deletePost(input: DeletePostInput!): DeletePostResult!
  updateUser(input: UpdateUserInput!): UpdateUserResult!
}

union DeletePostResult = DeletePostSuccess | DeletePostError

type DeletePostSuccess { deletedId: ID! }
type DeletePostError {
  code: DeletePostErrorCode!
  message: String!
}
enum DeletePostErrorCode { NOT_FOUND, PERMISSION_DENIED }
```

---

### Mistake 2: N+1 in list resolver

**Bad:**
```typescript
const resolvers = {
  Query: {
    posts: () => db.posts.findMany(),
  },
  Post: {
    // This fires once per post — 100 posts = 100 queries
    author: (post) => db.users.findUnique({ where: { id: post.authorId } }),
  },
};
```

**Why wrong:** 100 posts generate 101 database queries. Under load this produces latency spikes, database connection exhaustion, and timeouts.

**Fix:**
```typescript
const resolvers = {
  Query: {
    posts: () => db.posts.findMany(),
  },
  Post: {
    // DataLoader batches all authorId loads into one query
    author: (post, _args, ctx) => ctx.loaders.userById.load(post.authorId),
  },
};
// 100 posts = 2 DB queries: one for posts, one batched users query
```

---

### Mistake 3: Flat mutation arguments

**Bad:**
```graphql
type Mutation {
  createOrder(
    customerId: ID!
    productId: ID!
    quantity: Int!
    shippingAddress: String!
    billingAddress: String!
    couponCode: String
    notes: String
  ): Order
}
```

**Why wrong:** Adding a required field (`paymentMethodId: ID!`) in the future is a breaking change. Client code that spreads `...args` breaks silently. There is no reusable type for the order creation payload.

**Fix:**
```graphql
input CreateOrderInput {
  customerId: ID!
  productId: ID!
  quantity: Int!
  shippingAddress: String!
  billingAddress: String!
  couponCode: String
  notes: String
  idempotencyKey: String!   # added later — non-breaking because Input types are additive
}

type Mutation {
  createOrder(input: CreateOrderInput!): CreateOrderResult!
}
```

---

### Mistake 4: Auth checks scattered in resolvers

**Bad:**
```typescript
const resolvers = {
  Query: {
    adminStats: (_root, _args, context) => {
      if (!context.user) throw new Error('Not authenticated');
      if (context.user.role !== 'ADMIN') throw new Error('Forbidden');
      return getAdminStats();
    },
    userProfile: (_root, args, context) => {
      if (!context.user) throw new Error('Not authenticated'); // duplicated
      return getUserProfile(args.id);
    },
  },
};
```

**Why wrong:** Auth logic is duplicated, inconsistent, and easy to forget. One missed check is a security vulnerability. Adding a new auth rule (e.g., MFA required for admin actions) requires touching every resolver.

**Fix:**
```typescript
// Middleware populates context before resolvers run
function buildContext(req): Context {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = token ? verifyJwt(token) : null;
  return { user };
}

// Auth helper used consistently
function requireAuth(context: Context, role?: UserRole) {
  if (!context.user) throw new AuthenticationError('Not authenticated');
  if (role && context.user.role !== role) throw new ForbiddenError('Insufficient permissions');
}

const resolvers = {
  Query: {
    adminStats: (_root, _args, ctx) => { requireAuth(ctx, 'ADMIN'); return getAdminStats(); },
    userProfile: (_root, args, ctx) => { requireAuth(ctx); return getUserProfile(args.id); },
  },
};
```

---

### Mistake 5: Exposing introspection in production

**Bad:**
```typescript
const server = new ApolloServer({
  schema,
  // introspection not configured — defaults to true
});
```

**Why wrong:** Attackers query `{ __schema { types { name fields { name } } } }` to map the entire API surface, discover internal type names, and identify deprecated fields that may have security bugs.

**Fix:**
```typescript
const server = new ApolloServer({
  schema,
  introspection: process.env.NODE_ENV !== 'production',
  // In production, also add:
  plugins: [
    ApolloServerPluginInlineTrace({ rewriteError: () => null }), // no stack traces in responses
  ],
});
```

---

## Good vs. Bad Output

### Comparison 1: Pagination

**Bad (offset-based):**
```graphql
type Query {
  users(limit: Int, offset: Int): [User!]!
}
```
Problem: Insert a user between page 1 and page 2 load → page 2 skips a user. Delete a user → page 2 shows a duplicate. No way to know if more pages exist.

**Good (Relay cursor-based):**
```graphql
type Query {
  users(first: Int, after: String, last: Int, before: String): UserConnection!
}

type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int
}

type UserEdge {
  node: User!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
```

---

### Comparison 2: Error Handling

**Bad:**
```graphql
# Returns null on error, relies on HTTP 400 in extensions
type Mutation {
  login(email: String!, password: String!): AuthToken
}
# Client receives: { "data": { "login": null }, "errors": [{ "message": "Invalid credentials" }] }
# Unstructured, no error code, no remediation path
```

**Good:**
```graphql
type Mutation {
  login(input: LoginInput!): LoginResult!
}
union LoginResult = LoginSuccess | LoginError
type LoginSuccess { token: String!  user: User! }
type LoginError { code: LoginErrorCode!  message: String! }
enum LoginErrorCode { INVALID_CREDENTIALS, ACCOUNT_LOCKED, EMAIL_NOT_VERIFIED }

# Client receives:
# { "data": { "login": { "__typename": "LoginError", "code": "ACCOUNT_LOCKED", "message": "..." } } }
# Typed, actionable, testable — client can switch on code
```

---

### Comparison 3: Field Deprecation vs. Removal

**Bad:** Remove `user.legacyId` field directly in a deploy. Clients using that field receive `Cannot query field 'legacyId' on type 'User'` — a hard runtime error.

**Good:**
```graphql
type User {
  id: ID!
  legacyId: String @deprecated(reason: "Use `id` field instead. Will be removed after 2026-06-01.")
  name: String!
}
```
1. Deploy with `@deprecated`. Monitor usage in Apollo Studio / GraphQL Hive for 60–180 days.
2. When field usage drops to zero (verified via telemetry), schedule removal in next major release.
3. Remove field. Add to changelog.

---

## Checklist / Deliverable Structure

- [ ] All types are named as nouns (PascalCase); queries and mutations are camelCase verb phrases
- [ ] All mutations accept a single `input: XxxInput!` argument — no flat argument lists with 3+ params
- [ ] All mutations return a union type (`XxxSuccess | XxxError`) with typed error codes
- [ ] All paginated list fields use the Relay Connection pattern (no offset pagination)
- [ ] DataLoader is implemented for every resolver that fetches a related entity within a list
- [ ] DataLoader instances are created per-request in context factory (not as singletons)
- [ ] Authentication is enforced in context middleware; resolvers call a shared `requireAuth()` helper
- [ ] Query depth limit is configured (recommended: 10) and tested
- [ ] Query complexity scoring is configured with per-field costs and a per-request budget
- [ ] Introspection is disabled in production environment
- [ ] Persisted queries are enforced for mobile clients
- [ ] Deprecated fields carry a `@deprecated(reason: "...")` with a target removal date
- [ ] Schema changes are validated against a schema registry before deployment (no silent breaking changes)
