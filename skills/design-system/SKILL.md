---
name: design-system
description: Expert reference for building, scaling, and governing design systems — tokens, component APIs, documentation, adoption, and contribution governance
version: 2.0
---

# Design System — Expert Reference

## Non-Negotiable Standards

- Design tokens are the single source of truth for all visual decisions. No hardcoded values in components.
- Every component exposes a documented, versioned API. Undocumented props are unsupported.
- Components are composable, not configurable. Prefer composition over a sprawling `variant` prop.
- Accessibility is built in, not bolted on. WCAG 2.1 AA is the floor, not the goal.
- The system has one canonical implementation. Forks are a governance failure, not a feature.
- Breaking changes require migration guides. Consumer teams should never be surprised.
- A component is not "done" until it satisfies all five completion criteria: design spec + coded implementation + Storybook stories + unit/visual tests + accessibility audit.

---

## Build vs Adopt Decision Rule

**If all of the following are true → adopt an existing system (MUI, Radix, Paste, etc.) rather than build:**
- Team has fewer than 3 full-time design system contributors
- Product has fewer than 5 distinct surfaces
- Brand differentiation does not require a custom visual language
- Timeline to first production release is under 6 months

**If any of the following are true → build (or heavily customize an existing system):**
- Multi-brand or white-label product that requires token-level theming across 3+ themes
- Design language is a core product differentiator (e.g., Figma, Linear, Notion)
- Existing systems cannot meet accessibility requirements or localization needs
- Team has 5+ product teams who will consume the system

**Never** build a custom system to avoid learning an existing one. Adoption friction is a docs problem, not an architecture problem.

---

## Decision Rules

**Token Architecture**
- If a value is used in more than one component → it is a token.
- If a token is semantic (e.g., `color.text.primary`) → it maps to a primitive (e.g., `color.gray.900`). Never skip the semantic layer.
- If you have both light and dark themes → token values change, token names do not.
- Never name a token after its value. Name it after its role.
- If a token represents a decision specific to one component → it is a component token, not a global token.
- Token names follow a consistent 3-level hierarchy: `category-role-variant`. Examples: `--color-action-default`, `--color-action-hover`, `--space-inset-md`, `--text-body-size`.
- Never use `--brand-blue` or `--primary-color`. Always use `--color-interactive-default` or `--color-feedback-error`.

**Token Naming Conventions (specific)**

| Category | Primitive format | Semantic format | Bad name |
|---|---|---|---|
| Color | `--color-blue-500` | `--color-action-default` | `--brand-blue`, `--primary` |
| Spacing | `--space-4` (= 16px) | `--space-inset-md` | `--padding-medium` |
| Typography | `--font-size-14` | `--text-body-size` | `--normal-text` |
| Radius | `--radius-4` | `--radius-md` | `--rounded` |
| Shadow | `--shadow-2` | `--shadow-overlay` | `--card-shadow` |

Use Style Dictionary to define primitives in JSON and generate CSS custom properties, JS constants, iOS/Android outputs from one source. Figma Tokens plugin (or Tokens Studio) keeps Figma variables in sync with the same source.

**Component API Design**
- If a prop controls visual appearance only → use token-mapped variants, not arbitrary style overrides.
- If a consumer needs to pass arbitrary HTML attributes → spread them onto the root element via `...rest`.
- If a component has more than 5 boolean props → you have multiple components. Split them.
- If state logic can be separated from rendering → use a headless/renderless pattern (hooks + render props).
- Never expose internal class names as the extension point. Use `className` prop or CSS custom properties on the token layer.
- Never build a component that cannot be used without its sibling (e.g., `<Tab>` that only works inside `<TabGroup>` is fine; `<TabGroup>` that crashes without a `<Tab>` child is not).
- Every component prop has: a TypeScript type, a JSDoc description, and a default value documented in Storybook.

**Versioning and Breaking Changes**
- If you rename a prop → keep the old prop as deprecated for one major version with a `console.warn` in development mode.
- If you change default behavior → that is a breaking change. Bump major.
- If you add a new optional prop with a default → that is a minor change.
- If you fix a visual bug that consumers have built around → treat it as breaking. Announce it.
- Never break a public API in a patch release.
- Every major release ships with a written migration guide and a codemod where possible.
- If teams fork a component because it doesn't meet their needs → that is a product signal. Log it, prioritize it.

**Adoption**
- If a team is copy-pasting components instead of importing → your API is too rigid or your docs are failing.
- If a new pattern appears in 3+ products → it belongs in the system.
- If a component has zero adoption after 6 months → deprecate it.
- Track adoption metrics: (1) % of product UI surface area using system components, (2) number of forks in the wild, (3) time-to-first-use for new consumers, (4) support ticket volume per component.
- Target: >80% UI coverage across consuming products within 18 months of system launch.

---

## Component Completion Definition

A component is not shippable until all five criteria are met. No exceptions.

| Criterion | Minimum bar |
|---|---|
| Design | Figma spec covers all states: default, hover, focus, active, disabled, loading, error |
| Code | TypeScript types exported, all props documented, `...rest` forwarded, no `any` |
| Storybook | Stories for every prop combination that changes visual output; interactive controls; accessibility add-on enabled |
| Tests | Unit tests for logic/state; visual regression snapshot (Chromatic or Percy) for each story |
| Accessibility | Keyboard navigation tested; screen reader tested (VoiceOver + NVDA); color contrast verified; focus management correct |

---

## Storybook Requirements

Every component story must:
1. Show the default state with zero configuration
2. Show all `intent`/`variant`/`size` permutations as named stories
3. Show interactive states (hover, focus, disabled, loading) via Storybook controls
4. Include a `Playground` story with all props exposed via controls
5. Pass `@storybook/addon-a11y` with zero violations at the AA level
6. Auto-generate prop tables from TypeScript types via `autodocs`

Never hand-write prop tables in MDX. They drift. TypeScript is the source of truth.

---

## Contribution Guidelines Structure

**Who can contribute:**
- Core team: owns architecture, token schema, primitives, breaking change policy
- Product teams (federated): can propose and build new components; core team reviews before merge
- Never merge a new component without: design review, API review, accessibility review (three separate sign-offs)

**Contribution process:**
1. Open a proposal issue using the component RFC template (problem, prior art, proposed API)
2. Get API approval from core team before writing production code
3. Build to the five-criteria completion definition above
4. Open PR with design link, Storybook link, test coverage, and migration notes if applicable
5. Core team reviews within 5 business days; SLA is a commitment

**What does not belong in the system:**
- One-off patterns used by a single team
- Components that embed business logic (a `<LeadScoreCard>` is a product component, not a system component)
- Anything that requires a domain-specific API call to render

---

## Common Mistakes and How to Avoid Them

**Mistake: Primitive token names used in components**
`--color-blue-600` used directly in 40 components. Changing the brand color requires a global search-replace across 40 files.
Fix: Semantic layer. `--color-interactive-default: var(--color-blue-600)`. Update one token, retheming is instant.

**Mistake: Monolithic variant prop**
```tsx
// Bad — one prop encoding three orthogonal decisions
<Button variant="primary-large-destructive-loading" />

// Good — each prop controls one axis independently
<Button intent="destructive" size="lg" loading />
```

**Mistake: Accessibility as afterthought**
Building a custom dropdown, shipping it, then receiving a11y bug reports in production.
Fix: Write accessibility acceptance criteria before writing any code. Test with keyboard-only and VoiceOver in the PR checklist. The PR does not merge if `addon-a11y` reports violations.

**Mistake: No component contract**
Undocumented `className` overrides used by consumers to patch visual bugs. Internal markup changes; their overrides break silently with no warning.
Fix: Document the extension surface explicitly. If `className` is supported, document it. If it is not, enforce it via an ESLint rule that warns on direct class overrides.

**Mistake: Documentation drift**
Storybook shows old API. README has a different API. Source has a third.
Fix: Auto-generate prop tables from TypeScript types. Storybook is the source of truth. A documentation divergence is a failing CI check, not a manual review concern.

**Mistake: Design-dev token divergence**
Figma has `Button/Primary/Default`. Code has `button-bg-primary`. The mapping is tribal knowledge that leaves with the person who built it.
Fix: Tokens are defined once in a shared source (Style Dictionary JSON or Tokens Studio) and transformed into platform outputs (CSS vars, JS objects, Figma variables). One source, all platforms.

---

## Good vs Bad Output

**Bad: Hardcoded component**
```css
.button-primary {
  background: #2563eb;
  border-radius: 6px;
  font-size: 14px;
  padding: 8px 16px;
}
```

**Good: Token-driven component**
```css
.button-primary {
  background: var(--color-action-default);
  border-radius: var(--radius-md);
  font-size: var(--text-sm-size);
  padding: var(--space-2) var(--space-4);
}
```

---

**Bad: Prop explosion**
```tsx
<Modal
  isLarge
  hasCloseButton
  closeButtonLabel="Close"
  hasHeader
  headerText="Title"
  hasFooter
  footerPrimaryText="Save"
  footerSecondaryText="Cancel"
/>
```

**Good: Composition**
```tsx
<Modal size="lg">
  <Modal.Header onClose={handleClose}>Title</Modal.Header>
  <Modal.Body>{children}</Modal.Body>
  <Modal.Footer>
    <Button intent="secondary" onClick={handleCancel}>Cancel</Button>
    <Button onClick={handleSave}>Save</Button>
  </Modal.Footer>
</Modal>
```

---

**Bad: No migration path**
Rename `type` prop to `intent` in a patch release. 400 consumer instances silently render wrong.

**Good: Graceful deprecation**
```tsx
// v2.3.0 — deprecated prop preserved with runtime warning
interface ButtonProps {
  intent?: 'primary' | 'secondary' | 'destructive'
  /** @deprecated Use `intent` instead. Will be removed in v3.0. */
  type?: string
}
// Runtime: if `type` is passed, map it to `intent` + console.warn in development
// Codemod: npx @design-system/codemod button-type-to-intent ./src
```

---

## Vocabulary and Mental Models

**Design Token** — A named design decision (color, spacing, typography, shadow) stored as a variable. Three tiers:
1. Primitive: `--color-blue-600: #2563eb` (raw value, no semantic meaning)
2. Semantic: `--color-action-default: var(--color-blue-600)` (role in the UI)
3. Component: `--button-background-default: var(--color-action-default)` (scoped to one component)

**Headless Component** — Logic and state without opinions about rendering. The consumer provides the markup. Enables full style control while sharing behavior. Reference implementations: Radix UI, Headless UI, React Aria.

**Compound Component Pattern** — A parent component manages shared state; children are named slots. `<Select>`, `<Select.Option>`, `<Select.Trigger>`. The pattern prevents prop-drilling and makes the consumer's code readable.

**Escape Hatch** — A deliberate, documented way to override the system for one-off needs (`style`, `className`, `asChild`). Without escape hatches, teams fork. With undocumented escape hatches, upgrades silently break consumers.

**Style Dictionary** — The industry-standard tool (by Amazon) for defining tokens in JSON/YAML and transforming them into CSS custom properties, JS constants, iOS/Android asset files. Single source of truth across platforms.

**Breaking Change** — Any change that requires consumer code to change to maintain previous behavior. Includes: renamed props, changed defaults, removed elements, altered DOM structure, changed CSS custom property names.

**Adoption Funnel** — Awareness → Discoverability → First Use → Habitual Use. Measure each stage. Documentation fixes awareness and discoverability. API quality fixes first use. Governance and migration tooling fix habitual use.

**Contribution Model** — Centralized (core team only) gives consistency but bottlenecks at scale. Federated (any team can build, core team reviews) scales but requires strong governance. Hybrid (federated build, centralized API approval) is the industry standard for systems with 5+ consuming teams.
