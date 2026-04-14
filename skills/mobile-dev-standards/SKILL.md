---
name: mobile-dev-standards
description: Expert reference for mobile engineering — framework selection, React Native and native iOS/Android standards, performance budgets, offline-first design, deep linking, push notifications, app store release, and OTA update strategy
version: 2.0
---

# Mobile Development Standards — Expert Reference

## Non-Negotiable Standards

- **Respect platform conventions**: iOS uses bottom navigation, back swipes, and SF Symbols; Android uses Material You, predictive back, and the back stack — don't fight the platform; users notice immediately when an app feels "ported"
- **Design for interruption**: apps are paused, killed, and restored constantly; every screen must handle backgrounding, foreground return, low memory kills, and network loss gracefully — not just the happy path
- **Never block the main/UI thread**: all I/O, parsing, and heavy computation runs off the main thread; jank (dropped frames) destroys perceived quality faster than bugs do
- **Offline-first by default**: mobile networks are unreliable; read from local cache first, sync in background, handle conflicts explicitly — blank loading screens are an offline-first failure
- **Battery and data are scarce**: batch network requests, use push not polling, minimize wake locks, compress payloads — background work that drains battery gets the app uninstalled
- **Secure storage for sensitive data**: tokens, PII, and credentials live in Keychain (iOS) or EncryptedSharedPreferences/Keystore (Android) — never in AsyncStorage, NSUserDefaults unencrypted, or SharedPreferences
- **Accessibility is not optional**: every interactive element needs an accessible label; minimum touch target 44×44pt on iOS, 48×48dp on Android; support Dynamic Type / font scaling; test with VoiceOver (iOS) and TalkBack (Android) before every release

---

## Framework Selection Decision Rules

Choose the right framework before writing a line of code. Switching later costs 3–6 months.

**Use React Native when:**
- Team is primarily JavaScript/TypeScript and cannot hire native engineers
- App shares 70%+ of logic/UI across iOS and Android
- Time-to-market is the primary constraint (single codebase, faster iteration)
- App is business-logic-heavy (forms, data display, CRUD) rather than graphics-heavy
- OTA update capability is a product requirement (JS-only changes can ship without store review)

**Use Flutter when:**
- Pixel-perfect custom UI is required across both platforms (Flutter owns the render pipeline, no native widgets)
- Team already knows Dart or is willing to learn it
- App targets multiple platforms beyond iOS/Android (web, desktop) with a single codebase
- Performance-sensitive custom animations and graphics are core to the product

**Use native Swift (iOS) and/or Kotlin (Android) when:**
- App requires deep OS integration: WidgetKit, App Clips, Live Activities, CarPlay, WatchOS, ARKit, intensive CoreML, or similarly platform-specific APIs
- Performance budget is extreme (games, real-time audio/video, camera-intensive apps)
- Team has native engineering expertise and platform-specific UX quality is a hard product requirement
- App needs full access to every new platform API at iOS/Android launch — cross-platform frameworks lag by 3–12 months

**Never choose a framework because the team "already knows" it if the app's requirements clearly favor another.** A React Native team building a video editor or an AR app is making a 2-year mistake.

---

## Performance Budgets

These are hard limits, not aspirations. Measure on a midrange device (Pixel 4a class for Android, iPhone SE 2nd gen for iOS), not a developer's flagship.

| Metric | Budget | Measurement tool |
|---|---|---|
| Cold start TTI (Time to Interactive) | < 2s | Perfetto (Android), Instruments/MetricKit (iOS) |
| Warm start TTI | < 1s | Same |
| JS bundle size (React Native) | < 3MB uncompressed | `react-native bundle --stats` |
| Individual screen render time | < 16ms (60fps) | React DevTools Profiler, Flipper |
| FlatList scroll frame drop | 0 dropped frames at steady-state | Flipper Performance plugin |
| API response → UI update | < 300ms perceived | Manual + automated testing |
| App binary size increase per release | < 2MB | App Store Connect, Play Console |
| Memory usage (foreground) | < 150MB on 3GB RAM device | Instruments Memory, Android Profiler |

If cold start exceeds 2s, investigate in this order: (1) deferred non-critical initialization, (2) lazy-loaded heavy modules, (3) Hermes bytecode bundle size, (4) native module startup overhead.

---

## Touch Target and Accessibility Standards

**Minimum touch target sizes:**
- iOS: 44×44pt. This is Apple's HIG requirement. A 24pt icon inside a 44pt tappable area is correct.
- Android: 48×48dp. This is Material Design's requirement.
- Never set a smaller interactive target regardless of visual design. Pad with invisible touchable area if needed.

```jsx
// BAD — 24x24 icon is the touch target; misses 44pt minimum
<TouchableOpacity>
  <Icon name="close" size={24} />
</TouchableOpacity>

// GOOD — icon is 24pt visually; touch target is 44pt via padding
<TouchableOpacity style={{ padding: 10 }}>  {/* 10+24+10 = 44pt */}
  <Icon name="close" size={24} />
</TouchableOpacity>
```

**Accessibility requirements:**
- Every interactive element: `accessibilityLabel` (what it is), `accessibilityRole` (button, link, checkbox), `accessibilityHint` (what it does, if not obvious from label)
- Images that convey meaning: `accessibilityLabel` with description. Decorative images: `accessible={false}`
- Dynamic content changes (async loading, modals opening): `accessibilityLiveRegion="polite"` or `assertive` for urgent updates
- Dynamic Type: all text uses relative font sizes; never hardcode pixel sizes; test with the largest accessibility text size on both platforms

---

## Offline-First Architecture Patterns

**The core rule**: never make the UI's first render contingent on a network response.

**Pattern: Cache-first, background sync**
1. On mount: read from local store (SQLite, MMKV, WatermelonDB) and render immediately
2. In background: fetch from network; diff against local state
3. On success: update local store; UI reflects change silently (or shows a subtle "updated" indicator)
4. On network failure: UI remains fully functional with cached data; show last-updated timestamp

**Choosing a local data store:**
- Simple key-value (settings, tokens, small blobs): MMKV (React Native) or NSUserDefaults/SharedPreferences for non-sensitive data
- Structured relational data (lists, records, relationships): WatermelonDB (React Native) or Room (Android) or Core Data (iOS)
- JSON document store: Realm
- Never use AsyncStorage for anything beyond temporary, non-sensitive, small data — it is synchronous on the main thread in older versions and unencrypted

**Conflict resolution — decide before writing sync code:**
- **Last-write-wins**: simplest; correct when only one device writes at a time; wrong when concurrent edits are possible
- **Server-authoritative**: server version always wins; correct for content that users don't edit (feed items, catalog); frustrating for user-owned data
- **CRDT (Conflict-free Replicated Data Type)**: mathematically correct for concurrent collaborative edits; complex to implement; use when concurrent multi-device editing is a product requirement (Notion, Figma, collaborative docs)

---

## Deep Linking Standards

**Every screen must be addressable.** If a screen cannot be opened via a URL, it cannot be linked from email, push notification, or another app.

**Use Universal Links (iOS) / App Links (Android) over custom URL schemes.**
- Universal/App Links are HTTPS URLs. They cannot be hijacked by another app (custom schemes can be).
- Require server-side association files: `apple-app-site-association` (iOS) at `/.well-known/` and `assetlinks.json` (Android).
- Custom URL schemes (`myapp://path`) are a fallback only — use them when universal links are not feasible.

**Deep link testing checklist:**
- [ ] Cold-start deep link: app is not running; link opens app to correct screen
- [ ] Warm-start deep link: app is in background; link brings correct screen to foreground
- [ ] Authenticated link: link requires auth; app redirects to login then returns to deep-linked screen after login
- [ ] Invalid/malformed link: app handles gracefully and navigates to home, not a blank screen or crash

**React Navigation deep linking setup:**
```js
// Every screen must have a path in the linking config
const linking = {
  prefixes: ['https://myapp.com', 'myapp://'],
  config: {
    screens: {
      Home: '',
      Orders: 'orders',
      OrderDetail: 'orders/:orderId',
      Profile: 'profile/:userId',
    },
  },
}
```

---

## Push Notification Best Practices

**Three distinct notification states — handle all three:**
1. **Foreground receipt**: app is open and active. Show an in-app banner (do not rely on the OS notification tray). Use `react-native-notifications` or `expo-notifications` foreground handler.
2. **Background receipt**: app is running in background. OS delivers the notification to the tray. No in-app action needed.
3. **Kill-state tap**: user taps a notification when app is not running. App cold-starts and must navigate to the correct screen. This is the state most commonly untested and broken.

**Request permission at the right moment:**
- Never request notification permission at app launch with no context.
- Request at the moment the user takes an action that implies they want notifications (subscribing to updates, completing a first order, enabling alerts).
- On iOS, you get one prompt — if denied, the only recovery is deep-linking to Settings. Make the first prompt count.

**Notification content rules:**
- Title: what happened. "Your order shipped."
- Body: the single most useful detail. "Estimated delivery: Thursday, Apr 16."
- Never send a notification that requires the user to open the app to understand what it is about.
- Batch low-priority notifications. A user who receives 12 notifications per day uninstalls the app.

**Payload design:**
- Every notification payload includes a `screen` and `entityId` field so the kill-state tap handler can navigate correctly without an additional API call.
```json
{
  "title": "Your order shipped",
  "body": "Estimated delivery: Thursday, Apr 16",
  "data": {
    "screen": "OrderDetail",
    "orderId": "ord_abc123"
  }
}
```

---

## Platform-Specific UI Conventions

**iOS:**
- Primary navigation: bottom tab bar (UITabBarController). Do not put primary navigation in a hamburger menu.
- Back navigation: left-edge swipe gesture is a system affordance. Never override or disable it without a strong reason (e.g., unsaved changes dialog).
- Modals: full-screen modals are for flows that interrupt primary tasks. Sheet modals (bottom card) are for contextual actions.
- Icons: use SF Symbols for system-standard iconography. They respect Dynamic Type and accessibility sizes.
- Keyboard: always dismiss the keyboard on scroll (keyboardShouldPersistTaps="handled" at minimum).

**Android:**
- Primary navigation: bottom navigation bar (Material 3) for apps with 3–5 top-level destinations.
- Back button: Android's system back button (and gesture) must always work. Never trap users in a screen with no back path. Predictive Back (Android 13+) requires `android:enableOnBackInvokedCallback="true"`.
- App bar: use Material 3 TopAppBar. Place primary actions in the top-right. Place destructive actions behind a menu, not as primary buttons.
- Shared Element Transitions: use for navigating to detail views (item in a list → detail screen). Provides spatial continuity.

**React Native platform branching:**
```js
// BAD — scattered platform checks in business components
if (Platform.OS === 'ios') {
  doIosThing()
} else {
  doAndroidThing()
}

// GOOD — encapsulate in a platform hook or platform-specific file
// navigation.ios.ts and navigation.android.ts
// import { useNavigation } from './navigation' — RN resolves the correct file
```

---

## Over-the-Air (OTA) Update Strategy

**The fundamental constraint: OTA updates can only change the JavaScript bundle.** Any change to native modules, native dependencies, permissions, binary assets, or the iOS/Android runtime requires a full app store submission.

**Expo EAS Update** (recommended for Expo-managed workflow):
- Use `eas update` for JS-only bug fixes and content changes
- Assign update channels to environments: `production`, `staging`, `preview`
- Rollout percentage: start at 10% → 50% → 100% with a 2-hour monitoring window between stages
- Always include a `message` in the update for auditing: `eas update --message "Fix login crash on iOS 17"`

**CodePush** (recommended for bare React Native):
- Same channel-based rollout strategy applies
- Mandatory update flag: use `InstallMode.IMMEDIATE` only for security patches. For all other updates, use `InstallMode.ON_NEXT_RESTART` to avoid disrupting active users.
- Rollback: CodePush automatically rolls back if crash rate exceeds a configurable threshold (set this — default is off)

**OTA update governance rules:**
- Never use OTA to bypass app store review for a feature that would require review if submitted normally.
- Never use OTA to change the app's core functionality in a way that misleads users or violates store policies (this can result in app removal).
- All OTA updates go through a staging channel test before production release.
- Document every OTA release in the same changelog as store releases.

---

## App Store Review Checklist

Complete this checklist before every submission to App Store Connect and Google Play Console.

**Build:**
- [ ] Build number incremented (never reuse a build number)
- [ ] Version string updated if this is a user-visible release
- [ ] Built against latest stable Xcode / Android Gradle plugin within the last 6 months
- [ ] No debug flags, test credentials, or development server URLs in the binary

**Testing:**
- [ ] Tested on physical device (not emulator only)
- [ ] Tested on the oldest supported OS version (define this per project, typically iOS 16+ / Android 12+)
- [ ] Tested with network throttled to 3G (Charles Proxy or iOS Network Link Conditioner)
- [ ] Tested kill-state deep link for all primary link entry points
- [ ] Tested all three push notification states (foreground, background, kill-state tap)
- [ ] Accessibility: VoiceOver (iOS) and TalkBack (Android) run-through of primary user flows

**App Store / Play Console:**
- [ ] Screenshot assets updated for any new screens (both platforms, all required device sizes)
- [ ] Release notes written in plain language, user-facing, under 500 characters
- [ ] Privacy manifest updated (iOS 17+: `PrivacyInfo.xcprivacy`) if new data types collected
- [ ] Permissions strings updated in `Info.plist` / `AndroidManifest.xml` for any new permission requests

**Security:**
- [ ] No hardcoded API keys, tokens, or credentials in the bundle
- [ ] Certificate pinning verified (if used)
- [ ] Auth token storage uses Keychain / EncryptedSharedPreferences — not AsyncStorage

---

## Decision Rules

**State and data:**
- If data needs to persist across app restarts → use local DB (SQLite/Room/Core Data) or encrypted secure storage; in-memory Redux/Zustand alone is not persistence
- If showing a list of remote data → load from local cache immediately, fetch update in background, reconcile diff; never show a blank screen while fetching
- If form data is partially entered → auto-save draft to local storage; don't lose user work on backgrounding or kill
- If two devices can modify the same data → define conflict resolution strategy before writing any sync code; the answer is never "we'll figure it out"
- If using React Query or SWR → set `staleTime` explicitly; default of 0 means every focus triggers a refetch

**Navigation:**
- If building deep link support → every screen must be addressable; test cold-start deep link separately from warm-start
- If using React Navigation → keep navigators shallow; prefer flat tab + modal architecture over deeply nested stacks
- If back navigation has side effects (unsaved form, payment in progress) → intercept back with confirmation dialog; never silently discard state
- Never put business logic in navigation event handlers

**Performance:**
- If JS bundle exceeds 3MB → audit with `react-native-bundle-visualizer`; lazy-load heavy screens; split vendor bundles
- If cold start exceeds 2s → profile with Flipper; defer non-critical initialization; check native module startup time
- If a FlatList renders slowly → add `keyExtractor`, `getItemLayout`, `windowSize={5}`, `initialNumToRender`
- If a component re-renders excessively → profile with React DevTools before adding memoization blindly
- If animation is jittery → use `useNativeDriver: true` or Reanimated 3 worklets; never JS-driven setState at 60fps

**Networking:**
- If making API calls → implement retry with exponential backoff + jitter; handle 429 with `Retry-After` header
- If an API call might be retried → endpoints must be idempotent; attach idempotency keys for mutations
- If downloading large files → use background download API (URLSession background task, WorkManager)

**Platform specifics:**
- If requesting permissions → request at point of use with context; handle permanent denial with Settings deep-link
- If supporting iOS and Android in React Native → wrap platform behavior in `Platform.select()` or `.ios.ts`/`.android.ts` files; never scatter `Platform.OS === 'ios'` in business logic
- If touch target is under 44pt (iOS) / 48dp (Android) → add invisible padding; do not ship it smaller

**Release:**
- If shipping a native change → full store release required; OTA cannot cover it
- If using OTA → test on staging channel before production; roll out at 10% first
- If testing a release build → physical device, oldest supported OS, 3G throttling

---

## Common Mistakes and How to Avoid Them

| Mistake | Symptom / Risk | Fix |
|---|---|---|
| Storing auth tokens in AsyncStorage | Token readable from device backup; accessible without OS-level protection | `expo-secure-store` / iOS Keychain / Android EncryptedSharedPreferences |
| Inline function props defeating React.memo | Child re-renders on every parent render | `useCallback` for handlers, `useMemo` for objects passed as props |
| JS-driven animations | Jank on bridge-heavy operations; 60fps impossible | `useNativeDriver: true` or Reanimated 3 worklets |
| Touch targets under minimum size | Missed taps; accessibility failures; App Store rejection risk | 44×44pt iOS minimum, 48×48dp Android minimum — add padding |
| No accessible labels on icon buttons | Screen reader announces "button" with no context | `accessibilityLabel="Save changes"` + `accessibilityRole="button"` |
| Requesting permissions at app launch | Users deny immediately; no recovery flow | Request at point of use with rationale; handle denied with Settings deep-link |
| Blank screen while fetching | Users see empty state; perceived as broken | Load cached data first; show skeleton; fetch update in background |
| FlatList without `keyExtractor` | React warnings; poor reconciliation performance | Always provide stable, unique key per item |
| Ignoring low-end device performance | App feels fast on dev device; unusable on mid-range | Test on a 2019 Android device (3GB RAM) with 3G throttling |
| Polling instead of push | Battery drain; unnecessary network requests | Use WebSockets, SSE, or FCM/APNs for real-time; polling is a fallback |
| Not testing kill-state deep links | Deep link from email/notification opens app to wrong screen or crashes | Cold-start deep link test is a required release checklist item |
| OTA update for a native change | App crashes after update; cannot be rolled back via OTA | OTA covers JS only; any native change requires store submission |

---

## Good vs Bad Output

**BAD — insecure token storage:**
```js
await AsyncStorage.setItem('auth_token', token)
// Unencrypted. Readable from device backup. No OS-level protection.
```

**GOOD — secure token storage:**
```js
import * as SecureStore from 'expo-secure-store'
await SecureStore.setItemAsync('auth_token', token)
// iOS: Keychain (hardware-backed on modern devices)
// Android: EncryptedSharedPreferences backed by Keystore
```

---

**BAD — JS-driven animation:**
```js
const [top, setTop] = useState(0)
// Crosses JS→Native bridge on every frame — jank inevitable at 60fps
requestAnimationFrame(() => setTop(t => t + 1))
```

**GOOD — native-thread animation:**
```js
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated'
const offset = useSharedValue(0)
// Runs entirely on the UI thread — no bridge crossing, no jank
offset.value = withSpring(100)
```

---

**BAD — list screen (blank on load, no cache, not virtualized):**
```jsx
function OrderList() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch('/orders').then(r => r.json()).then(data => {
      setOrders(data)
      setLoading(false)
    })
  }, [])
  if (loading) return <ActivityIndicator />
  return <ScrollView>{orders.map(o => <OrderRow key={o.id} order={o} />)}</ScrollView>
}
```

**GOOD — list screen (cached, virtualized, error-handled):**
```jsx
function OrderList() {
  const { data: orders = [], isLoading, isError } = useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders,
    staleTime: 60_000,    // show cached data for 60s before revalidating
    gcTime: 5 * 60_000,
  })

  return (
    <FlatList
      data={orders}
      keyExtractor={o => o.id}
      renderItem={({ item }) => <OrderRow order={item} />}
      getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
      ListEmptyComponent={isLoading ? <ListSkeleton /> : <EmptyState />}
      ListFooterComponent={isError ? <RetryBanner /> : null}
      windowSize={5}
      initialNumToRender={12}
    />
  )
}
```

---

**BAD — permission at launch:**
```js
useEffect(() => {
  Camera.requestPermission()  // No context; users deny; app broken forever
}, [])
```

**GOOD — permission at point of use:**
```js
const handleScanPress = async () => {
  const { status } = await Camera.requestPermission()
  if (status === 'denied') {
    Alert.alert(
      'Camera access needed',
      'Enable camera access in Settings to scan barcodes.',
      [{ text: 'Open Settings', onPress: Linking.openSettings }]
    )
    return
  }
  navigate('Scanner')
}
```

---

## Vocabulary and Mental Models

**App Lifecycle (iOS: active → inactive → background → suspended → terminated)**: Code must handle every transition. `inactive` = brief interruption (call, notification). `background` tasks have ~30s before suspension. `suspended` = frozen, no CPU. Restored on next launch unless killed under memory pressure.

**JS Thread / UI Thread / Native Thread (React Native)**: Three threads. JS thread runs application logic. UI thread handles layout and rendering. Bridge (or JSI in New Architecture) passes messages between them. Heavy JS work blocks the bridge and causes dropped frames on the UI thread.

**Hermes**: Meta's JS engine optimized for React Native. Pre-compiles JS to bytecode at build time; reduces TTI and memory usage. Always enabled in new projects. Use Hermes debugger, not Chrome DevTools, when Hermes is active.

**TTI (Time to Interactive)**: Time from app launch to first usable screen. Budget: <2s on a midrange device (Pixel 4a class). Exceeded TTI = user thinks the app is crashing on first launch.

**Jank**: Dropped frames causing visible stuttering. 60fps = 16.67ms per frame budget on the main/UI thread. Any work blocking the main thread for >16ms causes jank.

**Optimistic Update**: Update UI immediately as if the server call succeeded, then reconcile on response. Makes apps feel instant. Must implement rollback on failure and idempotency on retry.

**Stale-While-Revalidate**: Show cached (stale) data immediately; fetch fresh data in background; update silently. Core pattern for perceived performance. React Query, SWR, and Apollo Client all implement this.

**Universal Links (iOS) / App Links (Android)**: HTTPS URLs that open the app instead of the browser. Require server-side association files. More reliable than custom URL schemes (cannot be hijacked by another app).

**OTA Update (EAS Update / CodePush)**: Over-the-air JS bundle replacement. Bypasses app store review for JS-only changes. Any change to native modules, permissions, or binary dependencies requires a full store submission.

**Background Fetch vs Background Processing**: Background Fetch (iOS) = system calls your app for ~30s to refresh content. Background Processing = longer tasks (minutes) scheduled when device is charging. Neither is guaranteed. Design for the case where background work doesn't run.

**New Architecture (JSI + Fabric + TurboModules)**: React Native's re-architecture replacing the asynchronous bridge with synchronous JSI calls. Eliminates serialization overhead. Enabled by default in RN 0.76+. Changes how native modules are written.

**Touch Target vs Visual Size**: The tappable area and the visible element are independent. A 24pt icon can have a 44pt touch target via padding. Always optimize for the touch target minimum, not the visual size.
