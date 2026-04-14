---
name: design-system-implementation
description: Selecting, implementing, and extending UI component libraries and design systems — tokens, composition, theming, and accessibility.
version: 1.0
---

# Design System Implementation Expert Reference

## Non-Negotiable Standards

1. **Design tokens are the single source of truth. No color, spacing, radius, shadow, or typography value appears as a raw literal in component code.** `backgroundColor: '#3B82F6'` in a component is a bug, not a style. `backgroundColor: 'var(--color-action-primary)'` is correct. Token names encode semantic intent, not appearance.
2. **Storybook is the canonical component documentation environment.** Every public component has a story. Accessibility checks (via `@storybook/addon-a11y`) run on every story. A component is not "done" until its Storybook story documents all variants, states, and usage constraints.
3. **Accessibility requirements are component-type-specific and non-negotiable.** Icon-only buttons must have `aria-label`. Modals must trap focus and restore focus on close. Form inputs must have associated `<label>` or `aria-labelledby`. Select/combobox components must follow the ARIA authoring practices for listbox or combobox patterns. These are not enhancements — they are part of the component contract.
4. **Bundle size is a first-class constraint.** Ant Design raw (no tree-shaking): ~1.5MB JS + ~500KB CSS. Importing `import { Button } from 'antd'` without proper tree-shaking imports the entire library. MUI (Material UI) core: ~300KB tree-shaken for a typical component set. Shadcn/ui adds ~0KB to bundle size (code is copied into the repo). Bundle impact is evaluated before any library is adopted.
5. **The decision between controlled and uncontrolled component APIs is made per component, documented, and never mixed within the same component.** A component that accepts both `value` (controlled) and `defaultValue` (uncontrolled) without explicit documentation of the contract will produce undefined behavior when consumers accidentally mix both.
6. **CSS variables (custom properties) are the required mechanism for theming.** Class-based theme switching (`class="dark"`) manipulates the variables; JavaScript objects or CSS-in-JS runtime style injection for theme values are secondary approaches that break SSR hydration consistency.

## Decision Rules

1. **If the project is a B2B SaaS product with >50 component types and a team of 3+ engineers, choose a full component library with an accessibility baseline (MUI, Ant Design, or Radix Primitives + custom styles), not Tailwind-only.** Building accessible modals, date pickers, and comboboxes from scratch costs 2–6 engineer-weeks per component. A library amortizes this across all components.
2. **If design customization is the primary constraint (the product must not look like "a Material UI app"), choose Radix Primitives or Shadcn/ui.** Radix provides fully unstyled, accessible primitives — you supply 100% of the visual layer. Shadcn/ui is Radix + Tailwind + opinionated but fully overridable styles, copied into the repo. Neither is a dependency you fight.
3. **If the project is a consumer product where bundle size critically affects LCP and the team is Tailwind-fluent, use Shadcn/ui or Headless UI.** Headless UI (~30KB) + Tailwind CSS adds negligible JS weight. Shadcn/ui components are locally owned code — no CDN dependency version risk.
4. **If the project is an internal tool or admin dashboard where visual differentiation from "stock" is not required, Ant Design is defensible.** Ant Design's data table, date picker, and form validation components are production-grade and save significant development time for data-dense interfaces. Must tree-shake via `babel-plugin-import` or `antd/es` imports.
5. **If you are extending an existing component library (adding a prop, overriding a style), always use the library's documented extension API first.** MUI: `sx` prop and `styled()` API. Ant Design: `className` + CSS Modules, or `theme.components` in ConfigProvider. Shadcn/ui: modify the copied source directly. Never use `!important` unless the library itself injects inline styles that cannot be overridden otherwise.
6. **If a component requires more than 3 levels of prop drilling to pass a callback or display state, refactor to compound component pattern or React Context.** Prop drilling at 3+ levels indicates the component has grown beyond a simple interface and needs explicit composition structure.
7. **If a custom component is needed that does not exist in the chosen library, build it as a Radix Primitive + design token layer, regardless of the primary library.** This isolates the custom component from library version changes and keeps its accessibility baseline consistent.
8. **If the design system must support both light and dark mode, use CSS custom property switching via a `[data-theme="dark"]` attribute on `<html>` or `:root.dark`, not separate style sheets.** Separate stylesheets require a flash-preventing server-side cookie read; a single stylesheet with attribute selectors is zero-FOUC by default if the attribute is set before paint.
9. **Token naming follows the pattern `--[category]-[concept]-[variant]-[state]`.** Examples: `--color-action-primary-hover`, `--spacing-component-gap-sm`, `--radius-card-default`. Never use appearance-based names like `--color-blue` or `--space-16` in semantic tokens. Primitives may use appearance names; semantic tokens never do.
10. **If evaluating whether to build a custom component or extend an existing one, the threshold is: if the visual delta from the library component exceeds 40% of its visual surface area, build custom on a headless primitive.** If it is less than 40%, extend via the library's theming API. Rebuilding a button because the border-radius needs to change is not justified. Rebuilding a modal because the entire visual, motion, and interaction model differs is justified.

## Mental Models

**The Three-Tier Token Architecture**
Design tokens exist in three tiers. Tier 1 — Primitive tokens: the complete set of all values the system is allowed to use. `--color-blue-500: hsl(217, 91%, 52%)`. These are referenced only by Tier 2 tokens, never by components. Tier 2 — Semantic tokens: map intent to primitives. `--color-action-primary: var(--color-blue-500)`. These are the tokens components reference. Tier 3 — Component tokens (optional, for large systems): `--button-primary-bg: var(--color-action-primary)`. Tier 3 enables per-component theming without breaking the semantic layer. Theme changes update Tier 2 mappings only. A "dark mode" is a new set of Tier 2 values; the Tier 1 palette and Tier 3 component references are unchanged.

**The Accessibility Contract Model**
Every component exposes an accessibility contract: a set of ARIA roles, properties, and keyboard interactions it guarantees to implement. This contract is separate from the visual contract. A button's visual contract: background color, border, label. Its accessibility contract: `role=button`, focusable, activatable with Enter and Space, communicates disabled state via `aria-disabled` not just `opacity: 0.4`. When extending or wrapping library components, the accessibility contract of the original must be preserved. Wrapping a `<button>` in a `<div onClick>` breaks the contract. The test: can a keyboard-only user and a screen reader user complete every action that a mouse user can?

**The Compound Component Pattern**
Complex components (Tabs, Accordion, Dropdown Menu, Dialog) expose their internal structure through composed sub-components rather than configuration props. This gives consumers precise control over layout and rendering without prop explosion. The alternative — `<Tabs items={[{label: 'A', content: <X />}]} />` — collapses extensibility into an opaque config object. The compound pattern: `<Tabs><Tabs.List><Tabs.Trigger value="a">A</Tabs.Trigger></Tabs.List><Tabs.Content value="a"><X /></Tabs.Content></Tabs>`. State is shared implicitly via Context. Radix UI uses this model throughout; it is the correct model for any component with 3+ internal interactive parts.

**The "Source of Truth" Cascade**
A healthy design system has a defined cascade: Figma design tokens (source) → Token JSON files (in repo) → CSS custom properties (consumed by components) → Storybook (living documentation) → Production application. A break at any point in this cascade means the system is lying to someone. Common breaks: (1) Figma tokens updated but JSON not regenerated (design and code diverge). (2) CSS variables defined correctly but Storybook stories use hardcoded color values (docs diverge from implementation). (3) Production app overrides CSS variables locally per page (application diverges from system). The cascade must be enforced: tokens are generated from Figma via a plugin (Tokens Studio, Style Dictionary), not hand-updated.

## Vocabulary

| Term | Precise Meaning |
|------|----------------|
| Design Token | A named variable storing a single design decision (color, spacing, radius) at the system level. Consumed by all components and platforms. |
| Primitive Token | A token representing a raw value from the design palette (`--color-blue-500`). Never referenced by components directly. |
| Semantic Token | A token expressing design intent (`--color-action-primary`). References a primitive. This is the layer components consume. |
| Compound Component | A component pattern where the parent and child sub-components share implicit state via React Context, exposing compositional control to consumers. |
| Headless Component | A component that provides behavior and accessibility with zero visual output. The consumer supplies all rendering via render props or slots. Examples: Radix UI, Headless UI. |
| Controlled Component | A component whose value is entirely managed by the parent via props (`value` + `onChange`). No internal state for the controlled value. |
| Uncontrolled Component | A component that manages its own internal state, optionally initialized by `defaultValue`. The parent queries the DOM ref for the current value if needed. |
| Tree-Shaking | Dead-code elimination during bundling — unused exports are removed from the bundle. Requires ES module syntax (`import/export`, not `require`). Ant Design requires `babel-plugin-import` for reliable tree-shaking. |
| Style Dictionary | An open-source tool (by Amazon) that transforms design token JSON into platform-specific outputs: CSS custom properties, iOS Swift constants, Android XML. The standard for multi-platform token pipelines. |
| Tokens Studio | A Figma plugin that manages design tokens inside Figma files and syncs them to a JSON file in a git repository. The standard for keeping Figma and code tokens in sync. |
| Focus Trap | A pattern that confines keyboard focus within a modal or overlay while it is open. Required for accessible dialogs. Implemented via `focus-trap` library or Radix's built-in behavior. |
| FOUC | Flash of Unstyled Content. In design systems: the moment before CSS variables are applied, showing default browser styles or wrong theme values. Prevented by setting the theme attribute server-side before HTML is painted. |

## Common Mistakes and How to Avoid Them

**Mistake 1: Importing entire component libraries without tree-shaking**
- Bad:
  ```js
  import { Button, Table, DatePicker, Form } from 'antd';
  ```
  Without `babel-plugin-import`, this imports all of Ant Design (~1.5MB JS).
- Why: CommonJS modules cannot be statically analyzed; the bundler includes the full library.
- Fix:
  ```js
  // With babel-plugin-import configured, OR:
  import Button from 'antd/es/button';
  import Table from 'antd/es/table';
  // Each import now resolves only the specific component chunk.
  ```

**Mistake 2: Using appearance-based names in semantic tokens**
- Bad:
  ```css
  :root {
    --blue: hsl(217, 91%, 52%);
    --red: hsl(4, 86%, 52%);
  }
  .button-primary { background: var(--blue); }
  .error-text { color: var(--red); }
  ```
  Dark mode: `--blue` needs to change to a lighter blue, but now every component using `--blue` needs auditing.
- Why: Appearance names couple visual decisions to semantic roles. A dark mode or brand refresh must touch every component.
- Fix:
  ```css
  :root {
    --color-blue-500: hsl(217, 91%, 52%);    /* Primitive */
    --color-action-primary: var(--color-blue-500);  /* Semantic */
    --color-feedback-error: var(--color-red-600);   /* Semantic */
  }
  [data-theme="dark"] {
    --color-action-primary: var(--color-blue-300);  /* Only this changes */
  }
  ```

**Mistake 3: Wrapping a library component in a div and losing accessibility**
- Bad:
  ```jsx
  const MyButton = ({ onClick, children }) => (
    <div className="btn" onClick={onClick}>{children}</div>
  );
  ```
  This is not a button. It is not keyboard-focusable, not activated by Enter/Space, not announced as a button by screen readers.
- Why: Developers reach for `<div>` to avoid fighting the browser's default button styles.
- Fix:
  ```jsx
  const MyButton = ({ onClick, children }) => (
    <button type="button" className="btn" onClick={onClick}>
      {children}
    </button>
  );
  ```
  Reset browser button styles with CSS (`all: unset; display: inline-flex; cursor: pointer`). Never replace interactive HTML elements with divs.

**Mistake 4: Hard-coding theme values in Storybook stories**
- Bad:
  ```jsx
  // story.tsx
  export const Primary = () => (
    <Button style={{ backgroundColor: '#3B82F6', color: '#fff' }}>Click me</Button>
  );
  ```
  The story documents the wrong thing — a hardcoded value that does not reflect the token system.
- Why: Story authors copy styles from Figma inspection rather than using the token API.
- Fix: Stories must use the token layer. Storybook's decorator wraps all stories with the theme provider:
  ```jsx
  export const Primary = () => <Button variant="primary">Click me</Button>;
  // The visual output is entirely controlled by CSS variables in the token file.
  ```

**Mistake 5: Applying component-level overrides with `!important`**
- Bad:
  ```css
  .my-modal .ant-modal-content {
    border-radius: 16px !important;
  }
  ```
  `!important` wins the cascade today; breaks silently on Ant Design version upgrades if the internal class name changes.
- Why: The developer could not find the theming API and used `!important` as a shortcut.
- Fix: Use the library's documented theming layer:
  ```jsx
  // Ant Design 5.x ConfigProvider
  <ConfigProvider theme={{ components: { Modal: { borderRadiusLG: 16 } } }}>
    <App />
  </ConfigProvider>
  ```

## Good vs. Bad Output

**Component API Design — Controlled vs Uncontrolled**

Bad (mixed, undocumented):
```tsx
interface InputProps {
  value?: string;       // controlled
  defaultValue?: string; // uncontrolled
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}
// No documentation of which mode is active or what happens if both are passed.
```

Good (explicit, documented):
```tsx
// Controlled variant — parent owns state
interface ControlledInputProps {
  value: string;
  onChange: (value: string) => void;
}

// Uncontrolled variant — component owns state
interface UncontrolledInputProps {
  defaultValue?: string;
  onBlur?: (value: string) => void;
}

type InputProps = ControlledInputProps | UncontrolledInputProps;
// TypeScript enforces the contract: you cannot pass both value and defaultValue.
```

**Theming Override — MUI**

Bad:
```css
/* globals.css */
.MuiButton-containedPrimary {
  background-color: #7C3AED !important;
  border-radius: 8px !important;
}
```
Overrides break on any MUI update that changes the class naming convention.

Good:
```tsx
// theme.ts
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: 'hsl(262, 83%, 58%)', // --color-brand-500
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
  },
});
```

**Compound Component Pattern**

Bad (opaque config prop):
```tsx
<Tabs
  items={[
    { key: '1', label: 'Profile', children: <Profile /> },
    { key: '2', label: 'Settings', children: <Settings /> },
  ]}
  activeKey={activeTab}
  onChange={setActiveTab}
/>
// Consumer cannot inject custom elements between tab triggers or reorder the list structure.
```

Good (compound pattern with Radix):
```tsx
<Tabs.Root value={activeTab} onValueChange={setActiveTab}>
  <Tabs.List>
    <Tabs.Trigger value="profile">Profile</Tabs.Trigger>
    <NotificationBadge count={3} />  {/* Consumer injects freely */}
    <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="profile"><Profile /></Tabs.Content>
  <Tabs.Content value="settings"><Settings /></Tabs.Content>
</Tabs.Root>
```

## Checklist

- [ ] Library selection documented with explicit criteria: project scale, customization need, bundle budget, a11y baseline, team familiarity
- [ ] Design tokens follow three-tier architecture: primitives, semantics, (optionally) component tokens
- [ ] All semantic token names encode intent (`--color-action-primary`), never appearance (`--color-blue`)
- [ ] CSS custom properties are used for theming; dark mode toggled via `[data-theme]` attribute on `<html>`
- [ ] Bundle size impact of chosen library measured before adoption; tree-shaking verified with a bundle analyzer
- [ ] Every public component has a Storybook story covering default, all named variants, and disabled/loading states
- [ ] `@storybook/addon-a11y` passes on all stories with zero violations at the "error" severity level
- [ ] Icon-only buttons have `aria-label`; modals implement focus trap and restore focus on close
- [ ] No `<div onClick>` or `<span onClick>` replaces a semantic interactive element anywhere in the codebase
- [ ] Library overrides use the documented theming API (ConfigProvider, createTheme, CSS variables); `!important` is absent
- [ ] Compound component pattern is used for any component with 3+ internal interactive sub-parts
- [ ] Token JSON is generated from Figma via Tokens Studio or equivalent — not hand-edited after initial setup
