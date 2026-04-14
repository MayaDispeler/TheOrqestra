---
name: state-management
description: Frontend state management selection and patterns — right tool per state type, from useState to TanStack Query to Zustand to Redux Toolkit.
version: 1.0
---

# State Management Expert Reference

## Non-Negotiable Standards

1. **Server state is not application state.** Data that originates from an API belongs in TanStack Query (or SWR), never in Redux or a global Zustand store. Copying API responses into Redux is an anti-pattern.
2. **URL state is the source of truth for anything a user should be able to bookmark or share.** Filters, sort order, pagination, and selected tab IDs belong in `useSearchParams`, not `useState`.
3. **Form state belongs to React Hook Form.** Controlled `useState` per-field re-renders on every keystroke and does not handle validation, dirty-checking, or submission atomically.
4. **Global stores are for global UI state only** — theme, auth session, notification queue, drawer open/close. Not for data fetched from a server.
5. **Never put derived data in a store.** If a value can be computed from existing store values, compute it in a selector — do not store it redundantly.
6. **Store slices must be independently testable** — no circular dependencies between slices; each slice owns a single domain.

---

## Decision Rules

1. **If state is used by exactly one component, use `useState`.** Introducing a store for local toggle state is over-engineering.
2. **If state is shared between 2–4 sibling or cousin components within a single feature, lift to a common ancestor or use React Context with `useMemo` to prevent re-render cascade.**
3. **If Context re-renders are causing perf issues (>3 consumers that update at different frequencies), migrate to Zustand or Jotai.** Context is not a state manager; it is a dependency injection mechanism.
4. **If you need server data anywhere in the component tree, use TanStack Query v5** (`@tanstack/react-query`). Never fetch in `useEffect` and cache manually.
5. **If client state is global, shared across many features, and has complex update logic (multi-step flows, optimistic updates, offline sync), use Zustand.** Under 5 KB gzipped.
6. **If you are in an existing Redux codebase or need time-travel debugging, Redux Toolkit is the only acceptable Redux pattern.** Plain `createReducer` / hand-rolled action creators are banned.
7. **If filter/search/pagination state must survive a page refresh or be shareable via URL, use `useSearchParams` (Next.js) or the URL search params API directly.** Never shadow URL state with `useState`.
8. **Optimistic updates belong in TanStack Query's `onMutate` callback**, not in a hand-rolled global store flag.
9. **If cache invalidation strategy is unclear, default to `queryClient.invalidateQueries`** after a mutation. Only use `setQueryData` for deterministic updates where you have the full new object.
10. **Jotai is preferred over Zustand when state is highly granular and atomic** (think: per-row editing state in a large table). Zustand is preferred when state has relational structure and complex actions.

---

## Mental Models

### 1. The State Taxonomy

Every piece of state falls into exactly one category. The category determines the tool.

```
State Taxonomy
├── Server State       → TanStack Query / SWR
│   • User profiles, API lists, search results
│   • Characteristics: async, stale-able, cacheable, shared
│
├── Client/UI State    → useState → Context → Zustand/Jotai → RTK
│   • Modal open, selected tab, theme, auth session
│   • Characteristics: synchronous, owned by the frontend
│
├── URL State          → useSearchParams / route params
│   • Filters, pagination, sort, selected item ID
│   • Characteristics: survives refresh, shareable, bookmarkable
│
└── Form State         → React Hook Form
    • Input values, validation errors, dirty fields, submission state
    • Characteristics: ephemeral, submit-oriented, per-field granularity
```

### 2. The Upgrade Ladder

Apply the simplest tool first; upgrade only when a concrete pain point appears.

```
useState
  ↓ (pain: prop drilling > 2 levels OR shared across siblings)
React Context + useMemo
  ↓ (pain: Context re-render storms OR > 6 consumers at different update rates)
Zustand (global) / Jotai (atomic)
  ↓ (pain: complex state machines, time-travel debugging, large team coordination)
Redux Toolkit
```

Never skip rungs. Reaching for Redux Toolkit in a new app is premature by default.

### 3. The Cache Ownership Model

TanStack Query is a cache, not just a fetching hook. Its cache is the source of truth for server data. When a mutation succeeds:
- **Invalidate** if you do not have the updated shape locally → `queryClient.invalidateQueries({ queryKey: ['users'] })`
- **Update** if you have the full updated object → `queryClient.setQueryData(['users', id], updatedUser)`
- **Optimistically update** in `onMutate`, roll back in `onError`.

Never copy query cache data into Zustand "so it's easy to access." Use `useQuery` at the point of consumption.

### 4. The Selector Discipline Rule

In Zustand, always select the minimum slice of state needed. Wide selectors cause components to re-render on unrelated state changes.

```ts
// Over-subscribes — re-renders when anything in store changes
const store = useAppStore();
const username = store.user.name;

// Correct — re-renders only when user.name changes
const username = useAppStore((s) => s.user.name);
```

---

## Vocabulary

| Term | Precise Meaning |
|---|---|
| Server State | Data that lives on a server and is fetched asynchronously; inherently stale and cacheable. |
| Client State | Synchronous UI state that exists only in the browser and does not need to be persisted to a server. |
| URL State | State encoded in the URL (search params, path segments); survives refresh and can be bookmarked. |
| Form State | Ephemeral state for input values, validation errors, and submit status; managed by a form library. |
| Query Key | TanStack Query's cache identifier — an array that uniquely describes a data dependency. |
| Stale Time | Duration (ms) after which TanStack Query considers cached data stale and eligible for background refetch. |
| Optimistic Update | Pre-emptively updating the UI before a server response, then rolling back on error. |
| Cache Invalidation | Marking cached query data as stale so it will be refetched on next use. |
| Zustand Slice | An isolated sub-section of a Zustand store with its own state shape and actions, composed at creation time. |
| Selector | A function passed to `useStore` that extracts a subset of state; controls what changes trigger re-renders. |
| RTK | Redux Toolkit — the only sanctioned way to use Redux; includes `createSlice`, `createAsyncThunk`, RTK Query. |
| Derived State | A value computed from existing state; must live in a selector or computed variable, never stored redundantly. |

---

## Common Mistakes and How to Avoid Them

### Mistake 1: Using Redux (or Zustand) for Server State

**Bad**
```ts
// Redux slice acting as a server-data cache — anti-pattern
const usersSlice = createSlice({
  name: 'users',
  initialState: { list: [], loading: false, error: null },
  reducers: {
    setUsers(state, action) { state.list = action.payload; },
    setLoading(state, action) { state.loading = action.payload; },
  },
});

// In component:
useEffect(() => {
  dispatch(setLoading(true));
  fetchUsers().then(users => dispatch(setUsers(users)));
}, []);
```

**Why:** Reinvents caching, deduplication, background refetch, error retry, devtools — all features TanStack Query provides out of the box.

**Fix**
```ts
// TanStack Query v5 — replaces the entire slice above
const { data: users, isLoading, error } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  staleTime: 30_000,
});
```

---

### Mistake 2: Using `useState` for URL-Bound State

**Bad**
```tsx
// User loses filter state on refresh or when sharing the URL
const [search, setSearch] = useState('');
const [page, setPage] = useState(1);
const [sortBy, setSortBy] = useState('name');
```

**Why:** State is invisible to the browser history, cannot be bookmarked, and is lost on hard refresh.

**Fix**
```tsx
// Next.js App Router
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

const searchParams = useSearchParams();
const router = useRouter();
const pathname = usePathname();

const search = searchParams.get('q') ?? '';
const page = Number(searchParams.get('page') ?? '1');

function setSearch(value: string) {
  const params = new URLSearchParams(searchParams.toString());
  params.set('q', value);
  params.set('page', '1'); // reset pagination on new search
  router.push(`${pathname}?${params.toString()}`);
}
```

---

### Mistake 3: Context Without Memoization Causing Re-render Storms

**Bad**
```tsx
// Every consumer re-renders when ANY value in context changes
const AppContext = createContext({});

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  // Changing theme re-renders all user-consuming components
  return (
    <AppContext.Provider value={{ user, setUser, theme, setTheme }}>
      {children}
    </AppContext.Provider>
  );
}
```

**Why:** A single context object means all consumers re-render on any state change, regardless of what they consume.

**Fix**
```tsx
// Split contexts by update frequency + memoize values
const UserContext = createContext<UserContextType>(null!);
const ThemeContext = createContext<ThemeContextType>(null!);

export function AppProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const userValue = useMemo(() => ({ user, setUser }), [user]);
  const themeValue = useMemo(() => ({ theme, setTheme }), [theme]);

  return (
    <UserContext.Provider value={userValue}>
      <ThemeContext.Provider value={themeValue}>
        {children}
      </ThemeContext.Provider>
    </UserContext.Provider>
  );
}
```

---

### Mistake 4: Wide Zustand Subscriptions

**Bad**
```ts
// Component re-renders when any part of the store changes
function UserAvatar() {
  const { user, notifications, settings } = useAppStore(); // subscribes to everything
  return <img src={user.avatarUrl} />;
}
```

**Why:** `notifications` updates (e.g., every 5 seconds) will re-render `UserAvatar` even though it only needs `user.avatarUrl`.

**Fix**
```ts
function UserAvatar() {
  const avatarUrl = useAppStore((s) => s.user.avatarUrl); // re-renders only on avatarUrl change
  return <img src={avatarUrl} />;
}
```

---

### Mistake 5: No Optimistic Update on Mutation

**Bad**
```tsx
// User clicks "Like" — waits 300–800 ms for server, button feels broken
const likeMutation = useMutation({
  mutationFn: likePost,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
});
```

**Why:** Network round-trip delay is perceptible. No rollback on error.

**Fix**
```tsx
const likeMutation = useMutation({
  mutationFn: likePost,
  onMutate: async (postId) => {
    await queryClient.cancelQueries({ queryKey: ['posts'] });
    const previous = queryClient.getQueryData(['posts']);
    queryClient.setQueryData(['posts'], (old: Post[]) =>
      old.map(p => p.id === postId ? { ...p, liked: true, likeCount: p.likeCount + 1 } : p)
    );
    return { previous }; // snapshot for rollback
  },
  onError: (_err, _postId, context) => {
    queryClient.setQueryData(['posts'], context?.previous); // rollback
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['posts'] }); // always sync
  },
});
```

---

## Good vs. Bad Output

### State Tool Selection — Full Feature Example

**Bad — Redux for everything**
```ts
// authSlice.ts — fine
// postsSlice.ts — anti-pattern, this is server state
// filtersSlice.ts — anti-pattern, this belongs in URL
// formSlice.ts — anti-pattern, use React Hook Form

const store = configureStore({
  reducer: {
    auth: authReducer,
    posts: postsReducer,      // should be TanStack Query
    filters: filtersReducer,  // should be useSearchParams
    postForm: formReducer,    // should be React Hook Form
  },
});
```

**Good — right tool per state type**
```ts
// Redux/Zustand store: only true client state
const useAppStore = create<AppStore>()((set) => ({
  // Auth session (client state — valid global store candidate)
  session: null,
  setSession: (session) => set({ session }),

  // Notification queue (client state — valid global store candidate)
  notifications: [],
  addNotification: (n) => set((s) => ({ notifications: [...s.notifications, n] })),
  dismissNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter(n => n.id !== id) })),
}));

// Server state: TanStack Query
const { data: posts } = useQuery({ queryKey: ['posts', filters], queryFn: fetchPosts });

// URL state: useSearchParams
const search = searchParams.get('q') ?? '';
const page = Number(searchParams.get('page') ?? '1');

// Form state: React Hook Form
const { register, handleSubmit, formState } = useForm<PostFormValues>({
  resolver: zodResolver(postSchema),
});
```

---

## Checklist

- [ ] Server state (API data) is managed by TanStack Query, not Redux or Zustand
- [ ] URL-bound state (filters, pagination, sort) uses `useSearchParams`, not `useState`
- [ ] Complex forms use React Hook Form with Zod schema validation
- [ ] Global Zustand/Redux store contains only true client UI state
- [ ] No derived data is stored redundantly in any store
- [ ] Zustand selectors are narrow — each component subscribes only to what it reads
- [ ] Context values are memoized with `useMemo`; unrelated state domains are in separate contexts
- [ ] Optimistic updates use TanStack Query `onMutate` / `onError` rollback pattern
- [ ] Cache invalidation strategy is explicit: `invalidateQueries` vs `setQueryData` decision made consciously
- [ ] No `useEffect` + `setState` pattern used for data fetching anywhere
- [ ] `staleTime` is configured on all TanStack Query hooks (not defaulted to `0`)
- [ ] Redux Toolkit used exclusively if Redux is in the stack — no hand-rolled reducers or action creators
