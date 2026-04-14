---
name: responsive-design
description: Expert reference for responsive UI design — breakpoints, fluid systems, component adaptation, and layout strategy
tags: [css, layout, responsive, mobile, grid, flexbox]
---

# Responsive Design — Expert Reference

## Core Mental Model

Responsive design is **content-driven**, not device-driven. Breakpoints exist where content breaks, not where device specs exist. Design mobile-first in CSS (min-width), desktop-first in your head.

A responsive system has three layers:
1. **Fluid** — scales continuously (font sizes, spacing, column widths)
2. **Adaptive** — changes at breakpoints (layout switches, component variants)
3. **Fixed** — never changes (min/max constraints, icon sizes at specific densities)

---

## Non-Negotiable Standards

1. **Mobile-first CSS**: use `min-width` media queries. Overriding desktop-down with `max-width` creates specificity wars and maintenance hell.
2. **Never hardcode pixel widths on containers** that need to be responsive. Use `max-width` + `width: 100%` + horizontal padding.
3. **Fluid type** for body text: `clamp(1rem, 2.5vw, 1.125rem)`. Never fixed px font sizes for text that appears across breakpoints.
4. **Logical properties over physical**: `margin-inline`, `padding-block`, `inset-inline-start` — future-proofs for RTL/vertical writing modes.
5. **Touch targets minimum 44×44px** on mobile. Interactive elements below this fail accessibility and usability.
6. **Test at content extremes**, not just "mobile/tablet/desktop": long strings, empty states, 1 item vs 100 items.
7. **Intrinsic sizing first**: `min-content`, `max-content`, `fit-content`, `auto-fill`, `auto-fit` solve more problems than manual breakpoints.

---

## Breakpoint Strategy

**Default system (content-based)**:
```css
/* Mobile: no query (base styles) */
/* Tablet: */
@media (min-width: 640px) { }
/* Desktop: */
@media (min-width: 1024px) { }
/* Wide: */
@media (min-width: 1280px) { }
/* Ultra: */
@media (min-width: 1536px) { }
```

**Never define breakpoints by device name** (iPhone, iPad, MacBook). Devices change. Content does not.

**Add breakpoints when** a layout looks broken, not on a schedule.

---

## Layout Patterns and When to Use Each

| Pattern | When | CSS |
|---|---|---|
| Single column → multi-column | Content cards, article feeds | `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))` |
| Sidebar + content | Dashboard, docs | `grid-template-columns: minmax(0,1fr)` → `240px 1fr` at breakpoint |
| Holy grail | App shell | CSS Grid areas |
| Stack → inline | Tag lists, breadcrumbs, nav | `flex-direction: column` → `row` |
| Full-width → contained | Hero, page sections | `width: 100%; max-width: 1200px; margin-inline: auto` |
| Hide/show | Secondary nav, filters | `display: none` → `display: flex` — never `visibility: hidden` in static layouts |

---

## Decision Rules

- If a component has unknown content length → use `minmax()`, never fixed widths
- If laying out a grid of cards → `auto-fill` + `minmax(min, 1fr)`, not hardcoded column counts
- If breakpoint count exceeds 5 → the design system is fragmented; consolidate
- If using Flexbox for a 2D layout → use Grid instead
- If using Grid for a single-axis layout → use Flexbox instead
- If an image can be different aspect ratios on different devices → use `aspect-ratio` + `object-fit: cover`
- If text overflows → `overflow-wrap: break-word` before any JS solution
- If a table must be responsive → consider `display: block` rows with `data-label` pseudo-columns, or horizontal scroll container with `overflow-x: auto`
- Never use `vw` units for font sizes without `clamp()` — causes unreadably small/large text at extremes
- Never rely on `device-pixel-ratio` media queries for layout — use them only for image density
- If a full-screen layout breaks on iOS → replace `100vh` with `100dvh` (dynamic viewport height accounts for browser chrome)
- If a component is reused in sidebar and main content → use container queries, not viewport queries

---

## Fluid Typography and Spacing

**Fluid type scale** (preferred):
```css
:root {
  --text-sm:   clamp(0.8rem,  0.17vw + 0.76rem, 0.89rem);
  --text-base: clamp(1rem,    0.34vw + 0.91rem, 1.19rem);
  --text-lg:   clamp(1.25rem, 0.61vw + 1.1rem,  1.58rem);
  --text-xl:   clamp(1.56rem, 1vw    + 1.31rem, 2.11rem);
  --text-2xl:  clamp(1.95rem, 1.56vw + 1.56rem, 2.81rem);
}
```

**Fluid spacing** (preferred):
```css
:root {
  --space-s: clamp(0.75rem, 2vw, 1rem);
  --space-m: clamp(1rem,    3vw, 1.5rem);
  --space-l: clamp(1.5rem,  5vw, 2.5rem);
}
```

---

## Container Queries (Modern Standard)

Use container queries for components that respond to their **parent**, not the viewport:

```css
.card-wrapper {
  container-type: inline-size;
  container-name: card;
}

@container card (min-width: 400px) {
  .card { flex-direction: row; }
}
```

**Rule**: Any component that is reused in different layout contexts (sidebar vs full-width) must use container queries, not viewport queries.

---

## Common Mistakes

### Mistake 1: Desktop-first media queries
```css
/* BAD — overrides cascade fights */
.grid { display: grid; grid-template-columns: repeat(3, 1fr); }
@media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }

/* GOOD */
.grid { display: grid; grid-template-columns: 1fr; }
@media (min-width: 768px) { .grid { grid-template-columns: repeat(3, 1fr); } }
```

### Mistake 2: Fixed sidebar widths
```css
/* BAD */
.sidebar { width: 250px; }
.content { width: calc(100% - 250px); }

/* GOOD */
.layout { display: grid; grid-template-columns: 1fr; }
@media (min-width: 1024px) { .layout { grid-template-columns: 240px 1fr; } }
```

### Mistake 3: Pixel font sizes
```css
/* BAD */
h1 { font-size: 48px; }
@media (max-width: 768px) { h1 { font-size: 28px; } }

/* GOOD */
h1 { font-size: clamp(1.75rem, 4vw + 1rem, 3rem); }
```

### Mistake 4: `100vh` for full-screen mobile layouts
```css
/* BAD — iOS Safari cuts off bottom content behind browser chrome */
.hero { height: 100vh; }

/* GOOD — dynamic viewport height respects mobile chrome */
.hero { height: 100dvh; }
```

### Mistake 5: Overflow hidden as a fix
```css
/* BAD — hides the symptom, not the cause */
.container { overflow: hidden; }

/* GOOD — find what overflows and constrain it */
.long-word { overflow-wrap: break-word; }
.image { max-width: 100%; }
```

---

## Good vs Bad Output

**BAD**: Responsive card grid
```css
.cards { display: flex; flex-wrap: wrap; }
.card { width: 33%; }
@media (max-width: 768px) { .card { width: 100%; } }
@media (max-width: 1024px) { .card { width: 50%; } }
```

**GOOD**:
```css
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  gap: clamp(1rem, 3vw, 1.5rem);
}
/* No media queries needed — intrinsically responsive */
```

---

## Vocabulary

- **Intrinsic sizing**: content-aware sizing using `min-content`, `max-content`, `fit-content`
- **Fluid**: continuously scaling values (clamp, vw, %)
- **Adaptive**: discrete layout changes at breakpoints
- **Container query**: breakpoints relative to an element's container, not the viewport
- **Logical properties**: writing-mode-agnostic CSS properties (`inline`, `block` axes)
- **Aspect ratio box**: element that maintains proportional dimensions
- **auto-fill vs auto-fit**: both fill available space; `auto-fit` collapses empty tracks
- **Breakpoint**: CSS media query threshold where layout changes
- **dvh**: dynamic viewport height — accounts for mobile browser chrome (use over `vh` for full-screen layouts)
- **Safe area insets**: `env(safe-area-inset-*)` for notch/home-bar aware layouts

---

## Testing Checklist

- [ ] Tested at 320px (minimum supported mobile)
- [ ] Tested at 1920px (wide desktop)
- [ ] Text reflows without truncation or overflow
- [ ] Touch targets ≥ 44×44px verified
- [ ] Images use `max-width: 100%` or `object-fit`
- [ ] No horizontal scroll on mobile
- [ ] Container queries used for reusable components
- [ ] `dvh` used instead of `vh` for full-screen mobile layouts
- [ ] Logical properties used throughout
