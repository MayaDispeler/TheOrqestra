---
name: frontend-frameworks
description: React-first frontend architecture patterns covering component design, Next.js App Router, performance, and code splitting.
version: 1.0
---

# Frontend Frameworks Expert Reference

## Non-Negotiable Standards

1. **Single responsibility per component.** A component renders one concern. If the name requires "And" (e.g., `FetchAndDisplayUser`), split it immediately.
2. **Composition over inheritance — always.** Never extend React components via class inheritance. Use children props, render props, or custom hooks.
3. **No anonymous functions directly in JSX** unless the function body is a single expression unlikely to cause re-renders (e.g., a static onClick on a leaf node).
4. **Bundle size gate: initial JS payload must stay under 200 KB gzipped** for any user-facing route. Enforce via `bundlesize` or Next.js `@next/bundle-analyzer`.
5. **Error boundaries are mandatory** at every route boundary and every independently-fetching feature boundary. A crash in one feature must never take down the page.
6. **TypeScript strict mode is on.** No `any`, no `// @ts-ignore` without a dated comment explaining why and a linked issue.

---

## Decision Rules

1. **If a value can be derived from props or existing state, derive it — never store it in `useState`.** Derived state via `useState` + `useEffect` is the #1 source of stale-data bugs.
2. **If data originates from a server, use Server Components (Next.js 14+) by default.** Reach for `"use client"` only when you need interactivity, browser APIs, or React hooks.
3. **If prop drilling exceeds 2 levels, promote to Context or a state manager.** Passing `userId` through `Page → Section → Card → Avatar` is a code smell; lift it.
4. **If a list item's identity can change at runtime (reorder, delete, insert), never use array index as `key`.** Use a stable, unique id from your data source.
5. **Use `React.memo` only when profiler confirms a measurable re-render cost (>16 ms frame budget).** Premature memoization adds cognitive overhead and can mask real architecture problems.
6. **Use `useMemo` for referentially-stable objects passed as props to memoized children, or for CPU-heavy transforms (>1 ms).** Never use it to "just be safe."
7. **Use `useCallback` only when the function is a dependency of another hook or is passed to a memoized child.** Wrapping every handler in `useCallback` is cargo-cult optimization.
8. **Route-level code splitting is the default; component-level (`React.lazy`) is for components >30 KB that are conditionally rendered** (modals, drawers, below-fold charts).
9. **Choose Next.js (App Router) when:** you need SSR/SSG/ISR, file-based routing, or a full-stack BFF. **Choose Vite + React Router** for SPAs without SSR requirements. **Choose Remix** when form mutations and progressive enhancement are first-class concerns.
10. **For forms with more than 3 fields or any validation logic, use React Hook Form.** Controlled components with `useState` per field cause a re-render on every keystroke and do not scale.

---

## Mental Models

### 1. The Rendering Tier Model
Classify every component before writing it:
- **Static Server Component** — no interactivity, reads data at request time, zero client JS.
- **Dynamic Server Component** — reads request-scoped data (cookies, headers), still zero client JS.
- **Client Component** — owns browser state or event handlers; hydrated on the client.
- **Shared Component** — pure presentational, can render in either tier (e.g., `<Button>`).
Work from the top of this list downward. Reaching for `"use client"` on a data-display component is always wrong.

### 2. The State Residency Principle
Every piece of state lives in exactly one place. Ask: "Who owns this data?"
- **Server** → fetch in Server Component or React Query.
- **URL** → `useSearchParams` / route params (shareable, bookmarkable).
- **Local UI** → `useState` in the component that uses it.
- **Shared UI** → lifted state, Context, or global store.
State that lives in two places simultaneously (e.g., API response copied into `useState`) is a ticking clock for inconsistency.

### 3. The Suspense Waterfall Detector
Sequential `await` calls inside a single Server Component create a waterfall. Parallel data fetching requires `Promise.all`. Every `<Suspense>` boundary must have a meaningful fallback — a spinner that takes 400 ms of layout shift is worse than no spinner.

### 4. The Component Surface Area Rule
A component's re-render cost is proportional to its surface area (number of children, DOM nodes, hooks). Colocate state as deep as possible so that re-renders affect the smallest possible subtree. Moving `isOpen` from a page-level store into a `<Modal>` component cuts re-renders from 200+ nodes to ~10.

---

## Vocabulary

| Term | Precise Meaning |
|---|---|
| Server Component | React component that renders exclusively on the server; ships zero JS to the client (Next.js 13+). |
| Client Component | Component marked `"use client"`; hydrated in the browser; can use hooks and browser APIs. |
| Hydration | The process of attaching React's event system to server-rendered HTML on the client. Expensive if the component tree is large. |
| Suspense Boundary | A `<Suspense>` wrapper that renders a fallback while children are loading; enables streaming SSR. |
| Error Boundary | A class component (or `react-error-boundary` wrapper) that catches render-phase errors and renders a fallback UI. |
| Code Splitting | Deferring the load of a JS chunk until it is needed; implemented via dynamic `import()` and `React.lazy`. |
| Derived State | A value computed from existing state or props; must never be duplicated in `useState`. |
| Memoization | Caching the result of a render or computation (`React.memo`, `useMemo`, `useCallback`) to skip redundant work. |
| Prop Drilling | Passing props through intermediate components that do not use them; an architecture smell beyond 2 levels. |
| Render Prop | A pattern where a component accepts a function as a prop that returns JSX; largely superseded by hooks. |
| Colocation | Keeping state and logic as close as possible to where they are used to minimize re-render scope. |
| ISR | Incremental Static Regeneration — Next.js feature that revalidates static pages on a timer without a full rebuild. |

---

## Common Mistakes and How to Avoid Them

### Mistake 1: `useEffect` for Derived State

**Bad**
```tsx
// Recomputes on every render, lags by one cycle, causes double-render
const [fullName, setFullName] = useState('');
useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);
```

**Why:** `useEffect` runs after render. Setting state inside it triggers a second render. The value is stale for one frame.

**Fix**
```tsx
// Computed synchronously during render — always consistent
const fullName = `${firstName} ${lastName}`;
```

---

### Mistake 2: Missing or Incorrect `useEffect` Dependency Array

**Bad**
```tsx
useEffect(() => {
  fetchUser(userId); // userId used but not declared
}, []); // Stale closure — never re-fetches when userId changes
```

**Why:** ESLint rule `exhaustive-deps` catches this. Ignoring it leads to subtle stale-data bugs.

**Fix**
```tsx
useEffect(() => {
  fetchUser(userId);
}, [userId]); // Correct — re-runs whenever userId changes
```

---

### Mistake 3: Anonymous Functions in JSX Causing Unnecessary Re-renders

**Bad**
```tsx
// New function reference on every parent render → child always re-renders
<Button onClick={() => handleDelete(item.id)} />
```

**Why:** If `Button` is wrapped in `React.memo`, the anonymous function defeats it because it is a new reference each render.

**Fix**
```tsx
const handleDeleteItem = useCallback(() => {
  handleDelete(item.id);
}, [item.id, handleDelete]);

<Button onClick={handleDeleteItem} />
```

---

### Mistake 4: Index as Key in Dynamic Lists

**Bad**
```tsx
{items.map((item, index) => (
  <Card key={index} item={item} /> // Wrong — index shifts on insert/delete
))}
```

**Why:** When an item is removed from position 0, every subsequent item gets a new key. React unmounts and remounts them — losing local state and causing layout flicker.

**Fix**
```tsx
{items.map((item) => (
  <Card key={item.id} item={item} /> // Stable identity
))}
```

---

### Mistake 5: Fetching in `useEffect` Instead of React Query / Server Components

**Bad**
```tsx
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
useEffect(() => {
  fetch('/api/users').then(r => r.json()).then(setData).finally(() => setLoading(false));
}, []);
```

**Why:** No caching, no deduplication, no background refetch, no error recovery, no devtools. Reimplementing what TanStack Query does better.

**Fix (client-side)**
```tsx
// With TanStack Query v5
const { data, isLoading } = useQuery({
  queryKey: ['users'],
  queryFn: () => fetch('/api/users').then(r => r.json()),
  staleTime: 60_000, // 60s before background refetch
});
```

**Fix (Next.js App Router)**
```tsx
// Server Component — zero client JS, no loading state needed
async function UsersPage() {
  const users = await db.user.findMany(); // Direct DB call OK in Server Components
  return <UserList users={users} />;
}
```

---

## Good vs. Bad Output

### Component Structure

**Bad — monolithic, multiple concerns**
```tsx
// UserDashboard.tsx — 300 lines, fetches, formats, renders, handles errors
export function UserDashboard({ userId }: { userId: string }) {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/users/${userId}`).then(r => r.json()).then(setUser);
    fetch(`/api/users/${userId}/posts`).then(r => r.json()).then(setPosts);
  }, [userId]);

  // ... 250 more lines of mixed concerns
}
```

**Good — feature-based colocation, single responsibility**
```
features/
  user-dashboard/
    UserDashboard.tsx          ← layout only, composes sub-features
    UserProfile/
      UserProfile.tsx          ← display logic
      useUserProfile.ts        ← data fetching hook
    UserPosts/
      UserPosts.tsx
      useUserPosts.ts
    EditUserModal/
      EditUserModal.tsx
      useEditUserModal.ts      ← open/close state lives here
```

```tsx
// UserDashboard.tsx — clean composition
export function UserDashboard({ userId }: { userId: string }) {
  return (
    <ErrorBoundary fallback={<DashboardError />}>
      <Suspense fallback={<ProfileSkeleton />}>
        <UserProfile userId={userId} />
      </Suspense>
      <Suspense fallback={<PostsSkeleton />}>
        <UserPosts userId={userId} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### Server vs. Client Component Boundary

**Bad — entire page is a Client Component for one interactive element**
```tsx
'use client'; // Makes ALL this data-heavy markup hydrate on the client

export default function ProductPage({ params }) {
  const [liked, setLiked] = useState(false);
  const product = use(fetchProduct(params.id)); // Could be server-only
  // ... renders 2 KB of product data as client JS
}
```

**Good — push the interactive island down**
```tsx
// app/products/[id]/page.tsx — Server Component, no client JS
export default async function ProductPage({ params }) {
  const product = await fetchProduct(params.id); // Server-only fetch
  return (
    <article>
      <ProductDetails product={product} />
      <LikeButton productId={product.id} /> {/* 'use client' isolated here */}
    </article>
  );
}
```

---

## Checklist

- [ ] Every component has a single, nameable responsibility
- [ ] No derived values stored in `useState` — computed inline instead
- [ ] All `useEffect` dependency arrays verified by `eslint-plugin-react-hooks`
- [ ] No array index used as `key` in lists where items can be reordered or deleted
- [ ] No anonymous arrow functions passed as props to memoized components
- [ ] `React.memo` / `useMemo` / `useCallback` applied only after profiler evidence, not preemptively
- [ ] Every route has an Error Boundary wrapping its primary content
- [ ] Every async boundary has a `<Suspense>` with a layout-stable fallback
- [ ] Initial JS payload verified under 200 KB gzipped via bundle analyzer
- [ ] Server Components used by default; `"use client"` justified in a comment
- [ ] Forms with 3+ fields use React Hook Form, not per-field `useState`
- [ ] Feature folders used (`features/user-dashboard/`) not type folders (`components/`, `hooks/`) for domain logic
