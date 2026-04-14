---
name: motion-design
description: Expert reference for motion design in UI/web contexts — animation principles, timing, choreography, and implementation standards
tags: [animation, ui, css, motion, ux]
---

# Motion Design — Expert Reference

## Core Mental Model

Motion communicates **state**, **hierarchy**, and **causality**. Every animation must answer: *why is this moving?* If you cannot answer that, cut it.

Animation is not decoration. It is the fourth dimension of layout.

---

## Non-Negotiable Standards

1. **Duration discipline**: UI micro-interactions = 100–300ms. Page transitions = 300–500ms. Never exceed 700ms for UI feedback. Long animations signal confusion or showboating.
2. **Easing always**: Never use `linear` for UI elements (except loaders, progress bars, continuous rotation). Linear motion reads as mechanical/robotic.
3. **Transform + opacity only** for performant animation. Never animate `width`, `height`, `top`, `left`, `margin`, `padding` directly — they trigger layout recalculation.
4. **Respect `prefers-reduced-motion`**: Wrap all non-essential animations in `@media (prefers-reduced-motion: no-preference)` or JavaScript equivalent. Essential feedback (focus rings, state changes) may retain subtle motion.
5. **Choreography over chaos**: Related elements animate together or in deliberate sequence. Random independent animations destroy hierarchy.
6. **Exit animations are mandatory** if enter animations exist. An element that appears with a fade but disappears instantly is broken motion design.

---

## Easing Reference

| Use case | Curve | CSS |
|---|---|---|
| Element entering screen | Decelerate (ease-out) | `cubic-bezier(0, 0, 0.2, 1)` |
| Element leaving screen | Accelerate (ease-in) | `cubic-bezier(0.4, 0, 1, 1)` |
| Element changing state in-place | Standard | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Springy/physical feedback | Spring (JS only) | framer-motion `spring`, react-spring |
| Attention/emphasis | Sharp | `cubic-bezier(0.4, 0, 0.6, 1)` |

**Never use**: `ease`, `ease-in-out` (CSS keywords) for precision work — they are approximations. Always use explicit `cubic-bezier`.

---

## Decision Rules

- If an element **enters** the viewport → ease-out (already has momentum)
- If an element **exits** the viewport → ease-in (needs to build momentum to leave)
- If an element **changes state in place** → standard curve, 150–250ms
- If more than 5 elements animate simultaneously → they must share a parent stagger or unified choreography, never fire independently
- If animation duration > 400ms → add ease-out tail or it will feel sluggish
- If animating list items → stagger 30–50ms per item, never more than 20 items total stagger (cap at 600ms total)
- If motion is purely decorative → wrap in `prefers-reduced-motion` and strip at reduced
- If content shifts during animation → the animation is wrong (avoid layout-triggering props)
- Never animate `z-index` — it is not interpolatable, causes flash
- Never chain more than 3 sequential animations on a single element — redesign the interaction

---

## Stagger Patterns

**Good stagger** (list appears):
```css
.item:nth-child(1) { animation-delay: 0ms; }
.item:nth-child(2) { animation-delay: 40ms; }
.item:nth-child(3) { animation-delay: 80ms; }
/* Cap total stagger at ~300ms regardless of item count */
```

**Bad stagger**:
```css
.item:nth-child(n) { animation-delay: calc(n * 150ms); }
/* 10 items = 1500ms of stagger — user waits for content */
```

---

## Vocabulary

- **Choreography**: the planned sequence and timing relationship between multiple animated elements
- **Easing / Timing function**: the acceleration curve of an animation
- **Stagger**: offsetting start times of related elements to create flow
- **Spring physics**: simulation-based animation with mass, stiffness, damping — more natural than cubic-bezier for interactive elements
- **Layout animation**: animating changes to an element's position/size in the document flow (expensive — use sparingly, use FLIP technique)
- **FLIP** (First, Last, Invert, Play): technique for performant layout animations
- **Orchestration**: coordinating animations across components/routes
- **Reduced motion**: accessibility setting where users prefer minimal animation
- **Keyframe**: discrete point in an animation sequence defining a state
- **Composited layer**: GPU-promoted element (via `transform`/`opacity`) that animates without repaints

---

## Common Mistakes

### Mistake 1: Animating layout properties
```css
/* BAD — triggers layout, causes jank */
.drawer { transition: height 300ms; }

/* GOOD — GPU composited */
.drawer { transition: transform 300ms cubic-bezier(0,0,0.2,1); transform: scaleY(0); transform-origin: top; }
```

### Mistake 2: No exit animation
```jsx
// BAD
{isOpen && <Modal />}  // modal enters with animation, disappears instantly

// GOOD — use AnimatePresence (framer) or CSS animation-fill-mode + class toggling
<AnimatePresence>
  {isOpen && <Modal />}
</AnimatePresence>
```

### Mistake 3: Ignoring reduced-motion
```css
/* BAD */
.card { transition: transform 400ms; }
.card:hover { transform: translateY(-8px); }

/* GOOD */
@media (prefers-reduced-motion: no-preference) {
  .card { transition: transform 400ms cubic-bezier(0,0,0.2,1); }
  .card:hover { transform: translateY(-8px); }
}
```

### Mistake 4: Using `all` in transitions
```css
/* BAD — will animate color, background, border, everything */
.button { transition: all 200ms; }

/* GOOD */
.button { transition: background-color 150ms cubic-bezier(0.4,0,0.2,1), box-shadow 150ms cubic-bezier(0.4,0,0.2,1); }
```

### Mistake 5: Animating opacity to 0 without `visibility`
```css
/* BAD — element is invisible but still interactive */
.tooltip { opacity: 0; transition: opacity 200ms; }

/* GOOD */
.tooltip { opacity: 0; visibility: hidden; transition: opacity 200ms, visibility 200ms; }
.tooltip.visible { opacity: 1; visibility: visible; }
```

---

## Good vs Bad Output

**BAD**: "Add a fade animation to the modal"
```css
.modal { animation: fadeIn 0.5s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
```
Problems: no exit, `ease` keyword, no reduced-motion, no transform for depth.

**GOOD**:
```css
@media (prefers-reduced-motion: no-preference) {
  .modal-enter { animation: modalEnter 250ms cubic-bezier(0,0,0.2,1) forwards; }
  .modal-exit  { animation: modalExit  200ms cubic-bezier(0.4,0,1,1) forwards; }

  @keyframes modalEnter {
    from { opacity: 0; transform: translateY(12px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes modalExit {
    from { opacity: 1; transform: translateY(0) scale(1); }
    to   { opacity: 0; transform: translateY(8px) scale(0.98); }
  }
}
@media (prefers-reduced-motion: reduce) {
  .modal-enter, .modal-exit { animation: none; }
}
```

---

## Performance Checklist

- [ ] Only `transform` and `opacity` are being animated
- [ ] `will-change: transform` added only on elements that actively animate (not preemptively on everything)
- [ ] No `transition: all` usage
- [ ] Exit animations implemented
- [ ] `prefers-reduced-motion` handled
- [ ] Stagger total duration < 600ms
- [ ] No more than ~10 simultaneous animations on screen
