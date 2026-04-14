---
name: accessibility-standards
description: Expert reference for digital accessibility — WCAG conformance, ARIA, and inclusive design patterns
version: 1.0.0
---

# Accessibility Standards

## Non-Negotiable Standards

- Target WCAG 2.1 AA as the floor. WCAG 2.2 AA for new builds.
- Every interactive element must be keyboard-operable. Tab, Enter, Space, arrow keys — define the full interaction model.
- Every image must have an `alt` attribute. Decorative images get `alt=""`. Informative images describe their meaning, not appearance.
- Color must never be the only means of conveying information. Use shape, text, or pattern as redundancy.
- Minimum contrast ratio: 4.5:1 for body text (< 18pt), 3:1 for large text (≥ 18pt or 14pt bold), 3:1 for UI components.
- Focus indicators must be visible and have 3:1 contrast against adjacent colors.
- Every form input needs a persistent visible label. Placeholder is not a label.
- Touch targets: minimum 44×44 CSS pixels (WCAG 2.5.5), with 8px spacing between targets.
- Animations and motion: respect `prefers-reduced-motion`. Provide a mechanism to pause anything that moves.
- Live regions must be used for dynamic content updates (errors, status, toasts).

## Decision Rules

- If it's a `<div>` that users click → it's a `<button>`. Use semantic HTML first; ARIA as last resort.
- If it's a nav landmark → `<nav>` with `aria-label` if more than one nav exists on the page.
- If it's a modal/dialog → trap focus inside, return focus to trigger on close, use `role="dialog"` + `aria-modal="true"` + `aria-labelledby`.
- If it's an icon-only button → `aria-label` on the button, `aria-hidden="true"` on the icon.
- If it's a form error → inject error text, link it with `aria-describedby`, set `aria-invalid="true"` on the input.
- If it's a loading state → use `aria-live="polite"` for non-critical, `aria-live="assertive"` only for errors or critical alerts.
- If an element is hidden visually → use `visibility: hidden` or `display: none` (also hides from AT), not `opacity: 0` or `position: absolute` off-screen (still read by AT).
- If content is visually hidden but needed by AT → use `.sr-only` utility (clip pattern), not `visibility: hidden`.
- If it's a data table → use `<th scope="col/row">`, `<caption>`, and `<thead>`/`<tbody>`. Never use a `<table>` for layout.
- If it's a custom select/combobox → implement full ARIA combobox pattern with keyboard navigation. Never style `<select>` away from native behavior without full ARIA replacement.
- If it's a carousel/slider → auto-play off by default. Pause on hover/focus. Provide previous/next buttons with descriptive labels.
- Never use `tabindex > 0` — it breaks natural tab order and is almost never the right fix.
- Never use `outline: none` without a replacement focus style.
- Never rely solely on hover to reveal interactive content.

## Common Mistakes and Fixes

**Mistake: ARIA overuse on semantic HTML**
Bad: `<button role="button" aria-pressed="false">Save</button>`
Good: `<button>Save</button>` — `<button>` already has implicit role; `aria-pressed` only if it's a toggle.

**Mistake: Missing landmark structure**
Bad: Entire page content in `<div>` soup
Good: `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>` — one `<main>` per page

**Mistake: Focus trap not implemented in modals**
Bad: Modal opens, Tab key navigates behind modal
Good: On open, move focus to first focusable element inside dialog; intercept Tab/Shift+Tab to cycle within; close on Escape and return focus to trigger.

**Mistake: Color-only status indicators**
Bad: Red dot = error, green dot = ok (no text)
Good: Colored dot + icon + text label ("Error", "Active")

**Mistake: Inaccessible toast/notification**
Bad: Toast appears visually, AT never announced it
Good: `<div role="status" aria-live="polite">` wraps toast container; inject message text dynamically

**Mistake: Ambiguous link text**
Bad: `<a href="/report.pdf">Click here</a>`
Good: `<a href="/report.pdf">Download Q4 Report (PDF, 2.4 MB)</a>`

**Mistake: Images in CSS for meaningful content**
Bad: Hero image with text baked in, applied via `background-image`
Good: `<img>` with full alt text, or SVG with `<title>` and `aria-labelledby`

## Good vs Bad Output

**Form validation — Bad:**
```html
<input type="email" placeholder="Email address" style="border: 2px solid red">
<span style="color: red">Invalid email</span>
```

**Form validation — Good:**
```html
<label for="email">Email address</label>
<input
  type="email"
  id="email"
  aria-describedby="email-error"
  aria-invalid="true"
  autocomplete="email"
>
<span id="email-error" role="alert">Enter a valid email address (e.g. you@example.com)</span>
```

**Icon button — Bad:**
```html
<button><svg>...</svg></button>
```

**Icon button — Good:**
```html
<button aria-label="Close dialog">
  <svg aria-hidden="true" focusable="false">...</svg>
</button>
```

## Expert Vocabulary and Mental Models

**Assistive Technology (AT)**: Screen readers (NVDA, JAWS, VoiceOver, TalkBack), switch access, voice control (Dragon). Test with real AT — automated tools catch ~30-40% of issues.

**Accessibility tree**: The browser's parallel DOM representation consumed by AT. Only what's in the accessibility tree is perceived by screen readers. `display: none` removes nodes; `aria-hidden="true"` hides them without removal.

**ARIA roles, states, properties**: Roles define what an element is (widget, landmark, live region). States are dynamic (aria-expanded, aria-checked). Properties are quasi-static (aria-label, aria-describedby). Never override a semantic element's implicit role unless rebuilding the full interaction.

**Focus management**: The discipline of explicitly moving focus programmatically (modals, SPAs, errors). Failure here makes complex interactions impossible for keyboard/AT users.

**Keyboard interaction model**: Each widget type has a spec'd pattern (ARIA Authoring Practices Guide). Comboboxes, trees, grids — each has arrow key expectations users have internalized.

**Conformance vs usability**: WCAG conformance is a legal/technical floor. Accessibility usability is the actual experience. Pass automated checks AND test with real users.

**Cognitive accessibility**: Plain language, consistent navigation, no time limits, error prevention. Often neglected but affects the largest population.

**Contrast ratio calculation**: Relative luminance formula. Use a tool (Contrast Checker, Figma plugin). Don't eyeball it.
