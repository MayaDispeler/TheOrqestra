---
name: component-library
description: Expert reference for building, maintaining, and governing design system component libraries
version: 1.0.0
---

# Component Library

## Non-Negotiable Standards

- Every component has a single, clearly defined responsibility. Composition over configuration.
- Props API is the public contract. Treat it like a versioned API — breaking changes require a major bump and migration path.
- Components never own layout. They own their internal spacing; the parent owns positioning and external gaps.
- Tokens before hardcoded values — never hardcode `#3b82f6` when `--color-primary-500` exists.
- Every component ships: the component, its types, its tests, its stories, its documentation.
- Accessibility is baked in at authoring time, not retrofitted. Every interactive component ships keyboard-operable and screen-reader-tested.
- Components do not make network requests, manage global state, or have side effects. They are pure render functions with optional local UI state.
- Controlled vs uncontrolled must be explicit and consistent. Default to uncontrolled; support controlled via `value`/`onChange`.

## Decision Rules

- If a prop toggles appearance only → it's a variant enum, not a boolean. (`variant="destructive"` not `isDestructive`)
- If behavior changes → it's a different component, not a prop. Don't build a god-component.
- If you're passing more than 5 props to a child → refactor the composition boundary.
- If a consumer needs to style internals → expose `className` on the root and document sub-element classes, or use CSS custom properties as escape hatches. Never expose style props for individual sub-elements.
- If a component needs to be used in 3+ different contexts without modification → it's in the library. Fewer than 3 → keep it in the product.
- If a compound component pattern is needed (e.g., `<Select>` with `<Select.Option>`) → use React Context internally. Don't rely on prop drilling.
- If you're building a primitive (Button, Input, Badge) → maximize flexibility, minimize opinion.
- If you're building a pattern (DataTable, DateRangePicker) → maximize opinion, minimize flexibility.
- If a prop is required → type it required. Never use `|| defaultValue` to paper over missing required data.
- If a consumer overrides z-index → document the stacking context. Don't guess.
- Never use component-scoped global CSS. Scope all styles.
- Never export internal helper components. Consumers only import what they're supposed to use.

## Common Mistakes and Fixes

**Mistake: Conflating variants with states**
Bad: `<Button loading primary disabled />` — boolean soup
Good: `<Button variant="primary" state="loading" disabled />` — clear separation of variant, state, and HTML attribute

**Mistake: Leaking implementation details**
Bad: `<Dropdown menuClass="dropdown__menu-inner" />`
Good: Expose a `--dropdown-menu-bg` CSS custom property or a documented `menuClassName`

**Mistake: Component does too much**
Bad: `<UserCard showAvatar showBadge showActions onFollow onMessage onBlock compact />` — 20 props later it's a page
Good: `<UserCard>`, `<UserCard.Avatar>`, `<UserCard.Actions>` — compound component pattern

**Mistake: Hardcoded breakpoints inside components**
Bad: `@media (max-width: 768px)` inside Button styles
Good: Components are layout-agnostic. Responsive behavior belongs to layout components or the consuming context.

**Mistake: Uncontrolled-only components**
Bad: Modal that manages its own open/close state only
Good: `open` + `onOpenChange` props for controlled usage; default uncontrolled behavior preserved

**Mistake: Story doesn't cover states**
Bad: One story showing the default button
Good: Stories for every variant × every state (default, hover, focus, disabled, loading) + edge cases (long text, icon-only)

**Mistake: Missing forwardRef**
Bad: Component wraps a DOM element but doesn't forward ref — breaks any consumer using refs
Good: `React.forwardRef` on every component that renders a focusable/measurable element

## Good vs Bad Output

**Bad prop API:**
```tsx
<Button
  onClick={handleClick}
  isBlue
  isBig
  roundedFull
  hasIcon
  iconLeft={<PlusIcon />}
/>
```

**Good prop API:**
```tsx
<Button
  variant="primary"
  size="lg"
  leadingIcon={<PlusIcon />}
  onClick={handleClick}
>
  Create project
</Button>
```

**Bad component (layout-coupled):**
```tsx
export function Badge({ label }) {
  return (
    <span style={{ marginLeft: '8px', display: 'inline-block' }}>
      {label}
    </span>
  )
}
```

**Good component (layout-agnostic):**
```tsx
export function Badge({ label, variant = 'default', className, ...props }) {
  return (
    <span
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {label}
    </span>
  )
}
```

## Expert Vocabulary and Mental Models

**Atomic design**: Atoms → Molecules → Organisms → Templates → Pages. Components at lower levels have fewer assumptions about context.

**Primitive vs composite**: Primitives (Button, Text, Box) are unstyled or minimally styled. Composites (Card, Modal, DataTable) layer primitives with opinion.

**Headless components**: Logic and accessibility only — no styles. Consumers bring their own CSS. (Radix UI, Headless UI model.)

**Design tokens**: The design system's single source of truth for color, spacing, typography, shadows. Tokens decouple design decisions from implementation.

**Variant-first API design**: Model variants as an exhaustive enum at design time. If you can't enumerate all variants, the design is underdefined.

**Component contract**: The documented guarantee between the library and its consumers — what props are stable, what is internal, what triggers a semver bump.

**Escape hatches**: Mechanisms consumers use when the component can't do what they need — `className`, CSS variables, `asChild`/`as` polymorphism. Must be documented and intentional.

**Storybook as spec**: Stories are the living specification of component behavior, not just demos. Every edge case that broke in production should become a story.

**Prop spreading (`...props`)**: Pass HTML attributes through to the underlying element for maximum composability. Always spread onto the root DOM element, not a wrapper.
