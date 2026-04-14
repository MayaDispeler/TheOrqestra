---
name: web-performance
description: Web performance optimization for production applications targeting Core Web Vitals, bundle budgets, and rendering pipeline efficiency.
version: 1.0
---

# Web Performance Expert Reference

## Non-Negotiable Standards

1. LCP must be under 2.5s (good) — above 4.0s is failing. Every production deployment requires a Lighthouse CI gate that blocks merge on LCP regression.
2. Initial JavaScript bundle must not exceed 170KB gzipped. Total page weight must not exceed 1MB over the wire. These are hard budgets, not targets.
3. Every image below the fold uses `loading="lazy"`. Every image above the fold has explicit `width` and `height` attributes. No exceptions — missing dimensions cause CLS.
4. INP must be under 200ms (good), under 500ms (needs improvement). FID is deprecated; measure INP in field data via CrUX or web-vitals JS library.
5. CLS must be under 0.1. Any layout shift caused by fonts, images, or dynamically injected content is a regression, not an acceptable trade-off.
6. All performance decisions are validated with real field data (CrUX, RUM) — lab data (Lighthouse) is a development proxy, not a production truth.

## Decision Rules

- If route-level JS chunk exceeds 50KB gzipped after splitting, audit it with `webpack-bundle-analyzer` or `vite-plugin-visualizer` before shipping — do not ship and optimize later.
- If a third-party script is not render-critical, load it with `defer` or `async`. If it is analytics or chat widgets, load it after `load` event fires.
- If the font file is used above the fold, add `<link rel="preload" as="font" crossorigin>` in `<head>`. Never preload fonts not used on the current page.
- If image format is JPEG or PNG and the browser supports it, serve WebP. If AVIF decode support is confirmed in your analytics (>80% users), prefer AVIF — 50% smaller than WebP at equivalent quality.
- If a React list renders more than 100 items, virtualize it with `react-window` or `react-virtual`. Rendering 500+ DOM nodes without virtualization is never acceptable.
- If a React component re-renders on every parent render without receiving changed props, wrap it in `React.memo`. If the memoization logic is complex, profile with React DevTools Profiler before and after — never memo blindly.
- If above-fold CSS exceeds 14KB, inline critical CSS in `<style>` in `<head>` and defer the rest via `<link rel="preload" as="style">` + `onload` swap. Use `critical` npm package or Vite plugin to automate extraction.
- Never load Google Fonts via `<link>` in production — self-host with `fontsource` or equivalent. DNS lookup + TLS handshake to external font CDN costs 200–400ms on cold load.
- If Cache-Control on static assets does not include `immutable` and `max-age=31536000`, the CDN cache is being wasted. Content-addressed filenames (hashed) are required for this strategy.
- If Lighthouse TBT (Total Blocking Time) exceeds 200ms, identify long tasks (>50ms) in Chrome DevTools Performance panel — break them up with `scheduler.yield()` or `setTimeout(0)` chunking.

## Mental Models

**The Critical Path Waterfall**
The browser cannot render until it has parsed HTML, resolved all render-blocking CSS in `<head>`, and executed synchronous JS. Every millisecond saved on this path directly reduces LCP. Model each resource as either on or off the critical path — anything off it should be deferred, preloaded speculatively, or lazy-loaded.

**Performance Budget as a Contract**
A performance budget is a contract with the user, not an internal aspiration. Define it in `lighthouserc.json` as assertions. A CI build that exceeds the JS budget fails the same way a failing test fails. The budget forces trade-off conversations before shipping, not after complaints.

**The Three Pillars of LCP**
LCP is determined by: (1) Time to First Byte (server response speed — target <600ms), (2) resource load delay (is the LCP image discoverable in initial HTML or hidden behind JS?), and (3) render delay (is CSS blocking paint?). Diagnose which pillar is the bottleneck before applying any fix.

**RUM vs. Synthetic Divergence**
Lighthouse runs on a simulated mid-tier device on throttled 4G. Real User Monitoring (via `web-vitals` + your analytics) captures the 75th percentile of actual users. When they diverge by more than 20%, your user base skews significantly from the Lighthouse model — field data overrides lab data in all prioritization decisions.

## Vocabulary

| Term | Precise Meaning |
|------|-----------------|
| LCP (Largest Contentful Paint) | Time from navigation start to render of the largest above-fold image or text block. Good: <2.5s. |
| INP (Interaction to Next Paint) | 98th percentile interaction latency across all user interactions in a session. Replaced FID in March 2024. |
| CLS (Cumulative Layout Shift) | Sum of all unexpected layout shift scores during page lifecycle. Score = impact fraction × distance fraction. |
| TBT (Total Blocking Time) | Total time the main thread was blocked (tasks >50ms) between FCP and TTI. Lab proxy for INP. |
| TTFB (Time to First Byte) | Time from request start to first byte of response received. Target <600ms for good LCP. |
| Code Splitting | Dividing a JS bundle into async chunks loaded on demand, typically at route or component boundaries. |
| Tree Shaking | Dead code elimination by bundler (Webpack/Rollup/Vite) based on ES module static analysis. Requires `sideEffects: false` in package.json. |
| Critical CSS | The subset of CSS rules required to render above-fold content. Must be inlined in `<head>` to avoid render blocking. |
| Content-Addressed Caching | Filenames include a hash of content (e.g., `main.a3f9c1.js`) enabling `max-age=31536000, immutable` cache headers. |
| Preload | `<link rel="preload">` — tells browser to fetch a resource at high priority early in page load. Misuse causes bandwidth competition. |
| CrUX (Chrome User Experience Report) | Google's dataset of real-world Core Web Vitals from Chrome users, accessible via PageSpeed Insights API and BigQuery. |
| Hydration | Process where client-side React attaches event listeners to server-rendered HTML. Excessive hydration cost causes TTI and INP regressions. |

## Common Mistakes and How to Avoid Them

**Mistake 1: Serving unoptimized images**
- Bad: `<img src="hero.jpg">` where hero.jpg is 2.4MB at 3000×2000px
- Why: Single largest contributor to LCP and page weight failures. Image is downloaded at full resolution regardless of display size.
- Fix: Use `<picture>` with AVIF/WebP sources, `srcset` for responsive sizes, explicit `width`/`height`, and serve via CDN with `fit=cover&w=800&fm=webp` transform parameters.

**Mistake 2: Importing entire libraries for one utility**
- Bad: `import _ from 'lodash'` adds 72KB gzipped for a single `_.debounce` call.
- Why: Webpack cannot tree-shake CommonJS modules. The entire lodash bundle is included.
- Fix: `import debounce from 'lodash/debounce'` (subpath import) or use native equivalents. Validate with bundle analyzer after any new dependency addition.

**Mistake 3: No code splitting — single monolithic bundle**
- Bad: Single `bundle.js` at 800KB gzipped delivered on every route.
- Why: Users loading the login page pay the cost of the dashboard's charting library. Initial load time directly correlates with bounce rate.
- Fix: Dynamic `import()` at route boundaries in React Router / Next.js. Each route chunk should be under 50KB gzipped. Verify with Webpack Bundle Analyzer.

**Mistake 4: Fonts causing FOUT or layout shift**
- Bad: No `font-display` specified; font loaded cross-origin without preload.
- Why: Browser waits for font before rendering text (FOIT) or swaps causing CLS. Cross-origin font DNS lookup adds 200–400ms.
- Fix: Self-host fonts, add `font-display: swap` in `@font-face`, preload WOFF2 file in `<head>`. Subset fonts to only include required Unicode ranges.

**Mistake 5: Measuring performance only in development on a fast machine**
- Bad: Developer runs Lighthouse on localhost on a MacBook Pro and reports 98 score.
- Why: No network latency, no CPU throttling, no real user variation. Score is meaningless for production decisions.
- Fix: Run Lighthouse CI in a controlled environment (GitHub Actions with `--throttling-method=simulate`). Monitor CrUX data for the 75th percentile. Set RUM alerting on LCP p75 regression >10%.

## Good vs. Bad Output

**Image Implementation**

Bad:
```html
<img src="/images/hero.jpg" />
```

Good:
```html
<picture>
  <source srcset="/images/hero.avif" type="image/avif" />
  <source srcset="/images/hero-800w.webp 800w, /images/hero-1600w.webp 1600w" type="image/webp" />
  <img src="/images/hero-800w.jpg" width="800" height="450"
       alt="Product hero" fetchpriority="high" />
</picture>
```

**Bundle Configuration (Vite)**

Bad:
```js
// vite.config.js — no manual chunks, no analysis
export default defineConfig({ build: { target: 'es2015' } })
```

Good:
```js
export default defineConfig({
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
        },
      },
    },
  },
  plugins: [visualizer({ open: true, gzipSize: true })],
})
```

**Cache-Control Headers**

Bad:
```
Cache-Control: no-cache
```

Good:
```
# Hashed static assets
Cache-Control: public, max-age=31536000, immutable

# HTML entry points
Cache-Control: no-cache, must-revalidate
```

**Lighthouse CI Gate**

Bad: No CI performance gate. Developers find out about regressions from user complaints.

Good:
```json
// lighthouserc.json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.85 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "total-byte-weight": ["error", { "maxNumericValue": 1000000 }],
        "unminified-javascript": ["error", { "maxLength": 0 }]
      }
    }
  }
}
```

## Checklist

- [ ] Lighthouse CI gate configured with LCP <2500ms and total byte weight <1MB assertions
- [ ] Initial JS bundle verified under 170KB gzipped using webpack-bundle-analyzer or vite-plugin-visualizer
- [ ] All images have explicit `width` and `height` attributes to prevent CLS
- [ ] LCP image served with `fetchpriority="high"` and is discoverable in initial HTML (not JS-rendered)
- [ ] All below-fold images use `loading="lazy"`
- [ ] Images served as AVIF or WebP with JPEG/PNG fallback via `<picture>`
- [ ] Fonts self-hosted, subset to required Unicode ranges, loaded with `font-display: swap`
- [ ] Critical above-fold CSS inlined in `<head>`; non-critical CSS deferred
- [ ] Third-party scripts loaded with `defer` or after `load` event — not render-blocking
- [ ] Hashed static assets served with `Cache-Control: public, max-age=31536000, immutable`
- [ ] React lists with >100 items virtualized with react-window or react-virtual
- [ ] CrUX / RUM monitoring in place with alerting on p75 LCP and INP regressions
