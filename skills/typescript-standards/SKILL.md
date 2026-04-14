---
name: typescript-standards
description: TypeScript patterns and standards for production codebases — strict mode, type design, generics, Zod, and tsconfig settings.
version: 1.0
---

# TypeScript Standards Expert Reference

## Non-Negotiable Standards

1. **`strict: true` is non-negotiable.** It enables `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`, and `alwaysStrict`. Every one of these catches real bugs in production.
2. **`any` is banned.** Use `unknown` for values of uncertain type and narrow with type guards. Use `// eslint-disable-next-line @typescript-eslint/no-explicit-any` only for third-party interop, with a comment explaining why and a linked issue.
3. **Explicit return types on all public API functions.** Internal helpers may use inference, but exported functions, class methods, and route handlers must declare their return type. This is a contract, not a style preference.
4. **No enums in new code.** Use `const` objects with `as const` or string union types. TypeScript enums have surprising runtime behavior, generate unnecessary JS output, and do not work well with discriminated unions.
5. **Runtime validation at every trust boundary.** Any data entering the system from outside (API responses, form input, environment variables, `localStorage`) must be validated with Zod. TypeScript types alone provide zero runtime safety.
6. **Path aliases in `tsconfig.json`.** No `../../../` relative imports deeper than 2 levels. Configure `@/` or feature-scoped aliases (`@features/`, `@shared/`).

---

## Decision Rules

1. **Use `interface` for object shapes that represent entities or contracts that other interfaces may extend.** Use `type` for unions, intersections, tuples, mapped types, and primitives.
2. **If a value can be in multiple mutually exclusive states, model it as a discriminated union**, not as an object with optional fields. Every optional field is a hidden state machine waiting to produce a runtime error.
3. **If a function accepts or returns a collection of related types, add a generic constraint.** Falling back to `any` because generics feel complex is never acceptable.
4. **Prefer `unknown` over `any` for error handler parameters.** TypeScript 4.0+ defaults `catch` clause variables to `unknown`; always narrow before use.
5. **Use `satisfies` operator (TS 4.9+) to validate an object against a type without widening it.** Avoids the loss of literal types that `as Type` causes.
6. **Use `Partial<T>` for update payloads; `Required<T>` to assert all fields are present after validation; `Pick<T, K>` and `Omit<T, K>` to create focused subtypes.** Do not create parallel interfaces that duplicate fields.
7. **Use `Record<K, V>` for dictionaries with homogeneous values.** Do not use `{ [key: string]: V }` — it is less readable and does not enforce key type constraints.
8. **Use `Extract<T, U>` and `Exclude<T, U>` to derive subtypes from unions rather than redefining them.** Keeps types in sync automatically.
9. **Assertion functions (`asserts value is T`) are for invariant checks inside initialization code.** Type predicates (`value is T`) are for reusable narrowing guards in application logic.
10. **Infer types from Zod schemas using `z.infer<typeof schema>` — never define the TypeScript type separately.** A single source of truth for both runtime shape and compile-time type.

---

## Mental Models

### 1. The Trust Boundary Model
TypeScript types are compile-time guarantees. The runtime does not enforce them. Every time data crosses a trust boundary — HTTP response, `JSON.parse`, environment variable, user input — assume it is `unknown` and validate it. Zod schemas are the bridge between the untrusted `unknown` world and the typed world.

```
External World (unknown) → Zod.parse() → Typed World (TypeScript guarantees)
```

Skipping Zod means your types are a lie: they describe what you hope the data looks like, not what it actually is.

### 2. The Discriminated Union State Machine
Any entity that has multiple mutually exclusive states should be modeled as a discriminated union. The discriminant field (conventionally `status` or `type`) narrows the type in a `switch` statement, giving exhaustiveness checking for free.

```ts
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

// Exhaustiveness check — TypeScript errors if a case is missing
function render<T>(state: AsyncState<T>): string {
  switch (state.status) {
    case 'idle':    return 'Idle';
    case 'loading': return 'Loading...';
    case 'success': return String(state.data);
    case 'error':   return state.error.message;
    // No default needed — TS proves all cases are covered
  }
}
```

### 3. The Generic Constraint Ladder
Write generics from the most permissive to the most constrained. Start with `<T>`, add `extends BaseType` when you need to access properties, add `keyof` constraints when you need property access safety.

```ts
// Level 0: no constraint — T can be anything
function identity<T>(value: T): T { return value; }

// Level 1: constrained to objects
function keys<T extends object>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

// Level 2: keyof constraint — ensures K is a valid key of T
function pluck<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
```

### 4. The Utility Type Decision Tree

```
Need all fields optional?          → Partial<T>
Need all fields required?          → Required<T>
Need a subset of fields?           → Pick<T, 'a' | 'b'>
Need all fields except some?       → Omit<T, 'password' | 'salt'>
Need a string-keyed dictionary?    → Record<string, T>
Need to narrow a union?            → Extract<T, U> / Exclude<T, U>
Need to unwrap a Promise type?     → Awaited<T>
Need function parameter types?     → Parameters<typeof fn>
Need function return type?         → ReturnType<typeof fn>
```

---

## Vocabulary

| Term | Precise Meaning |
|---|---|
| Discriminated Union | A union type where each member has a literal type field (the discriminant) that TypeScript uses to narrow the type in control flow. |
| Type Predicate | A function return type of the form `value is T`; tells TypeScript the argument is type `T` in the truthy branch. |
| Assertion Function | A function that declares `asserts value is T` or `asserts condition`; throws if the assertion fails, narrows the type afterward. |
| Type Guard | Any expression (typeof, instanceof, in, type predicate) that narrows a type within a conditional block. |
| Generic Constraint | An `extends` clause on a type parameter limiting the acceptable types: `<T extends object>`. |
| `satisfies` Operator | TS 4.9+ operator that validates a value against a type without widening literal types — `const cfg = { mode: 'dark' } satisfies Config`. |
| `unknown` | The type-safe alternative to `any`; requires narrowing before use; does not propagate silently through the type system. |
| Zod Schema | A runtime validator object from `zod` that both validates data and infers a TypeScript type via `z.infer<>`. |
| `as const` | A type assertion that freezes a literal value's type — `['a', 'b'] as const` becomes `readonly ['a', 'b']` instead of `string[]`. |
| Mapped Type | A type generated by iterating over the keys of another type: `{ [K in keyof T]: ... }`. |
| Conditional Type | A type that uses `T extends U ? X : Y` to branch at the type level. |
| Declaration File | A `.d.ts` file that provides type information for a JavaScript module that has no TypeScript source. |

---

## Common Mistakes and How to Avoid Them

### Mistake 1: `any` Abuse — Silencing the Type Checker

**Bad**
```ts
async function fetchUser(id: string): Promise<any> {
  const res = await fetch(`/api/users/${id}`);
  return res.json(); // type is any — errors propagate silently
}

const user: any = await fetchUser('123');
console.log(user.nmae); // typo — no error, crashes at runtime
```

**Why:** `any` disables all type checking for that value and everything it touches.

**Fix**
```ts
import { z } from 'zod'; // zod@3.x

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

type User = z.infer<typeof UserSchema>; // derive type from schema

async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  const raw: unknown = await res.json();
  return UserSchema.parse(raw); // throws ZodError if shape is wrong
}
```

---

### Mistake 2: Optional Fields Modeling Multiple States

**Bad**
```ts
// 2^3 = 8 possible states, most of which are invalid
interface FetchState {
  data?: User;
  error?: Error;
  isLoading?: boolean;
}

// Caller must handle impossible combinations like { data, error, isLoading: true }
```

**Why:** Optional fields allow invalid combinations. The compiler cannot tell you when you've reached an impossible state.

**Fix**
```ts
type FetchState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

// Exactly 4 valid states. Switch is exhaustive.
```

---

### Mistake 3: Enums with Surprising Runtime Behavior

**Bad**
```ts
enum Direction {
  Up,
  Down,
  Left,
  Right,
}

// Generates this JS — reverse mapping and extra keys:
// { 0: 'Up', 1: 'Down', Up: 0, Down: 1, ... }

// String enums are better but still generate a runtime object
// and don't work with Object.values() in the way you expect
enum Status {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
}
```

**Why:** Numeric enums allow `Direction.Up === 0` and `Direction[0] === 'Up'` — the reverse mapping is rarely desired and always confusing. String enums generate runtime code that is rarely needed.

**Fix**
```ts
// Const object — zero runtime overhead, full type safety, works with Object.values()
const Direction = {
  Up: 'UP',
  Down: 'DOWN',
  Left: 'LEFT',
  Right: 'RIGHT',
} as const;

type Direction = typeof Direction[keyof typeof Direction];
// type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
```

---

### Mistake 4: Missing Generic Constraints — Silent `any` Creep

**Bad**
```ts
function getProperty(obj: any, key: string): any {
  return obj[key]; // No safety — key can be anything, return type unknown
}

const name = getProperty(user, 'nmae'); // typo — no error
```

**Why:** Using `any` destroys all guarantees. The return type is `any`, which propagates.

**Fix**
```ts
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const name = getProperty(user, 'nmae');
// Error: Argument of type '"nmae"' is not assignable to parameter of type 'keyof User'
```

---

### Mistake 5: Defining Types Separately from Zod Schemas

**Bad**
```ts
// Two sources of truth — they will diverge
interface CreateUserRequest {
  name: string;
  email: string;
  role: 'admin' | 'user';
}

const createUserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'user']),
  // Someone later adds `age` to the schema but forgets the interface
});
```

**Why:** Manual synchronization always fails eventually. The type and the schema will diverge silently.

**Fix**
```ts
// Single source of truth
const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(['admin', 'user']),
});

type CreateUserRequest = z.infer<typeof createUserSchema>;
// Adding a field to the schema automatically updates the type
```

---

## Good vs. Bad Output

### tsconfig.json — Recommended Production Settings

**Bad**
```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom"],
    "module": "commonjs",
    "strict": false,
    "esModuleInterop": true,
    "allowJs": true,
    "skipLibCheck": true
  }
}
```

**Good**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@features/*": ["./src/features/*"],
      "@shared/*": ["./src/shared/*"]
    }
  },
  "include": ["src", "next-env.d.ts"],
  "exclude": ["node_modules", "dist", ".next"]
}
```

Key additions beyond `strict: true`:
- `noUncheckedIndexedAccess` — array/object index access returns `T | undefined`, preventing silent OOB bugs.
- `exactOptionalPropertyTypes` — `{ a?: string }` means `a` is `string | undefined`, not also writable as `{ a: undefined }`.
- `noImplicitReturns` — every code path in a function must return a value.
- `moduleResolution: "bundler"` — matches Vite/Next.js resolution behavior.

---

## Checklist

- [ ] `tsconfig.json` has `strict: true` — no exceptions
- [ ] `noUncheckedIndexedAccess: true` is enabled
- [ ] No `any` in source files — ESLint rule `@typescript-eslint/no-explicit-any` is set to `error`
- [ ] All exported functions have explicit return type annotations
- [ ] No TypeScript enums — `const` objects with `as const` used instead
- [ ] All API response parsing uses Zod schemas; types are inferred via `z.infer<>`
- [ ] No manually duplicated type/interface that mirrors a Zod schema
- [ ] Multi-state data modeled as discriminated unions, not objects with optional fields
- [ ] Generic constraints added to any function that operates on typed object properties
- [ ] `unknown` used for catch clause errors and unvalidated external data — not `any`
- [ ] Path aliases configured in `tsconfig.json`; no `../../../` imports beyond 2 levels
- [ ] Declaration files (`.d.ts`) exist for any imported JS module without types
