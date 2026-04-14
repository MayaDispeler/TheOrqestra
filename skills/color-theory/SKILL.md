---
name: color-theory
description: Color theory for digital product and UI design — color models, harmony, contrast, scales, and visualization.
version: 1.0
---

# Color Theory Expert Reference

## Non-Negotiable Standards

1. **WCAG AA compliance is the floor, not the goal.** Normal text (under 18px regular or 14px bold) requires 4.5:1 contrast ratio minimum. Large text requires 3:1. UI components and graphical objects require 3:1. AAA (7:1 for normal text) is required for body copy in accessibility-critical products.
2. **Never define colors in HEX inside component logic.** HEX is a serialization format for storage and export. All runtime color decisions must use design tokens that resolve to HSL or RGB — HEX has no manipulable channels.
3. **A complete color scale has at minimum 9 stops: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900.** 500 is the brand anchor. Steps below 500 are light-mode backgrounds and borders; steps above 500 are dark-mode surfaces and text. Gaps between stops must be perceptually uniform, not mathematically uniform.
4. **Dark mode is not `filter: invert(1)`.** Dark surfaces must desaturate by 15–30% and shift lightness independently per hue. Blues shift less; yellows and oranges shift more. Saturated colors on dark backgrounds cause chromatic vibration — reduce chroma by at least 20%.
5. **Data visualization categorical palettes cap at 7 colors.** Beyond 7, human perception cannot reliably distinguish categories. Use texture, pattern, or faceting instead of adding an 8th color.
6. **Red is a physiological alarm signal.** Using red for non-error states (promotions, highlights, brand accents) in the same product that uses red for errors destroys semantic clarity permanently.

## Decision Rules

1. **If manipulating color programmatically (lighten, darken, mix), use HSL — never HEX or RGB.** HSL separates hue (0–360°), saturation (0–100%), and lightness (0–100%) into independently adjustable channels. HEX and RGB do not.
2. **If exporting to design tools or CSS variables, use HEX or `hsl()` CSS notation.** HEX for static values; `hsl()` when the token must be overridable at runtime via CSS custom properties.
3. **If the palette has more than 3 hues, audit for harmony type.** Analogous: hues within 30° of each other — use for calm, cohesive UIs. Complementary: hues 180° apart — use only for single high-contrast CTAs, never for two equal-weight elements. Triadic: three hues 120° apart — use only in data visualization, not product UI. Split-complementary: base hue + two hues 150° and 210° away — the safe alternative to complementary for UI with more than one accent.
4. **If building a neutral/gray scale, never use pure HSL saturation 0%.** Warm neutrals (hue 20–40°, saturation 5–10%) read as intentional; pure grays read as unfinished or placeholder. Tailwind's `slate` (hue ~215°, saturation ~15%) is the correct model.
5. **If the background lightness is below L 20%, never place text with lightness above L 90% without reducing font weight.** High-contrast white-on-black causes halation at thin weights — stay at font-weight 400 minimum on dark surfaces.
6. **If choosing between sequential, diverging, and categorical palettes for data viz: sequential for ordered single-variable data (population density); diverging when zero or a midpoint is meaningful (temperature delta, sentiment score); categorical for unordered nominal data (country, product type).**
7. **Never use pure red `#FF0000` (HSL 0°, 100%, 50%) in UI.** It is maximally saturated and fails 4.5:1 against white. Use `hsl(4, 86%, 46%)` — Tailwind `red-600` equivalent — for error states on white backgrounds.
8. **If a brand's primary color fails 4.5:1 on white, do not use it as text color.** Create a separate "accessible text" token that is the primary hue at a darkened lightness (L 35–42% typically), and reserve the brand color for large-format decorative use only.
9. **Never exceed 5 distinct colors in a single UI view.** Primary action, text, background, border, and one semantic (error/success/warning) exhaust human pre-attentive processing. Additional colors must earn their place.
10. **If building a green for success states, use hue 142–160° at saturation 50–65%.** Hues below 130° read as yellow-green (untrustworthy). Hues above 170° read as teal (neutral, not success). `hsl(152, 57%, 37%)` — similar to Tailwind `green-700` — is the correct success color on white.

## Mental Models

**The HSL Cylinder Model**
Visualize color as a cylinder: hue is the rotation around the circumference (0°=red, 120°=green, 240°=blue, 360°=red), saturation is the distance from the center axis (0%=gray, 100%=pure), lightness is the vertical position (0%=black, 50%=pure hue, 100%=white). Any color decision is a coordinate in this cylinder. Moving "along the axis" desaturates without shifting hue — the correct operation for dark mode adaptation. Moving "around the circumference" changes hue without changing vibrancy — the correct operation for harmony generation.

**The Semantic Layer Contract**
Raw color values (primitives) must never appear in component code. The contract has three tiers: (1) Primitive tokens: `--color-blue-500: hsl(217, 91%, 60%)` — these are never referenced by components directly. (2) Semantic tokens: `--color-action-primary: var(--color-blue-500)` — these map intent to primitive. (3) Component tokens: `--button-background: var(--color-action-primary)` — optional for complex systems. Switching themes means only the semantic layer changes; primitives and components stay untouched.

**The Perceptual Uniformity Principle**
Mathematically equal steps in HSL lightness (e.g., every 10%) do not produce perceptually equal steps. Human vision is more sensitive to changes in mid-range lightness than at extremes. When building a scale from 50–900, use the CIELAB or OKLCH color space for step generation, then convert to HSL for output. Tools that generate Tailwind-style scales (Radix Colors, Palette by Tints) apply this correction automatically. A scale where each adjacent pair "feels the same distance apart" is perceptually uniform; one generated by incrementing HSL lightness by 10% is not.

**The Chromatic Vibration Warning**
Placing two highly saturated complementary colors (180° apart) at equal lightness (~50%) side-by-side causes optical vibration — the eye cannot resolve the edge between them. The fix is always to desaturate one of them or change one lightness by at least 20 points. This is why red text on green background (or vice versa) is unusable regardless of contrast ratio — WCAG contrast ratio does not capture this effect.

## Vocabulary

| Term | Precise Meaning |
|------|----------------|
| Hue | The chromatic identity of a color, expressed as a degree on the color wheel (0–360°). Independent of lightness or saturation. |
| Chroma | The colorfulness relative to the brightness of a similarly illuminated white. Higher in OKLCH/CIELAB than in HSL's "saturation." |
| Saturation (HSL) | Distance from the neutral gray axis in HSL space (0–100%). At L=50, S=100% is the purest hue. At L=0 or L=100, saturation is irrelevant. |
| Lightness (HSL) | Luminance on a 0–100% scale where 50% is the pure hue, 0% is black, 100% is white. Not perceptually linear. |
| Contrast Ratio | The ratio of relative luminance between two colors, per WCAG. Range: 1:1 (identical) to 21:1 (black on white). |
| Relative Luminance | A linearized measure of perceived brightness per WCAG 2.x formula. Not the same as HSL lightness. `#777777` has ~20% relative luminance despite 47% HSL lightness. |
| Color Harmony | A principled relationship between hues based on their angular distance on the color wheel. |
| Semantic Color | A color token whose name encodes purpose (`--color-error`) rather than appearance (`--color-red`). |
| Primitive Token | The lowest-level named color in a token system — a raw value like `--color-red-500: hsl(4, 86%, 58%)`. Not referenced in UI directly. |
| Diverging Palette | A visualization palette with two sequential ramps meeting at a neutral midpoint, used when both directions from zero carry meaning. |
| Sequential Palette | A visualization palette that varies lightness (or chroma) monotonically from low to high for a single variable. |
| Categorical Palette | A visualization palette of perceptually distinct, unordered hues for nominal data. Max 7 entries. |

## Common Mistakes and How to Avoid Them

**Mistake 1: Using brand primary color for body text**
- Bad: `color: #6366F1` (Indigo 500, HSL 239°, 84%, 67%) on white background — contrast ratio 3.1:1, fails WCAG AA for normal text.
- Why: Marketing teams anchor on the brand color without checking contrast. The color looks "on brand" but is unreadable at small sizes.
- Fix: Create a separate `--color-text-brand` token set to `hsl(239, 84%, 45%)` (darker variant, ~5.2:1 on white). Use brand color only for decorative elements and large headings.

**Mistake 2: Inverting light mode colors 1:1 for dark mode**
- Bad: Light mode `background: hsl(0, 0%, 100%)` inverted to `background: hsl(0, 0%, 0%)` and `text: hsl(220, 9%, 16%)` inverted to `text: hsl(220, 9%, 84%)`.
- Why: Pure black backgrounds with white text at full brightness cause eye strain (halation). Highly saturated accents on pure black vibrate chromatically.
- Fix: Dark mode surface = `hsl(222, 14%, 12%)`, dark mode text = `hsl(210, 20%, 88%)`. Reduce saturation of accents by 20%. Shift lightness of accents up by 10–15 points to maintain contrast.

**Mistake 3: Building a gray scale with zero hue**
- Bad: `gray-100: hsl(0, 0%, 96%)`, `gray-200: hsl(0, 0%, 92%)` — lifeless, clinical.
- Why: Pure achromatic grays have no temperature and clash with any tinted brand color placed alongside them.
- Fix: Tint grays toward the brand hue at 4–8% saturation. If primary is blue (`hsl(217, 91%, 60%)`), use `gray-100: hsl(217, 8%, 96%)`. This is how Tailwind `slate` and Radix `mauve`/`slate` work.

**Mistake 4: Using 8+ colors in a data visualization categorical palette**
- Bad: A bar chart with 10 distinct categories, each a different color, including two visually similar greens.
- Why: Past 7 hues, human pre-attentive vision cannot reliably segment. Two similar colors will be confused even with a legend.
- Fix: Cap at 7. Combine lowest-frequency categories into "Other." If 8+ are truly needed, use direct data labels and drop the color-based legend entirely.

**Mistake 5: Red as a promotional or urgency color alongside red error states**
- Bad: Flash sale banner in `hsl(4, 86%, 52%)` and form validation error in `hsl(0, 84%, 50%)` — both red, different purposes.
- Why: Users learn red = danger/error. Using it for "Sale ends tonight!" trains the eye to ignore the semantic signal, degrading error detectability.
- Fix: Use orange (`hsl(25, 95%, 53%)`) or amber (`hsl(38, 92%, 50%)`) for urgency/promotional states. Reserve the red-0°–15° range exclusively for destructive actions and error states.

## Good vs. Bad Output

**Color Scale Construction**

Bad — mathematically uniform HSL steps:
```
blue-100: hsl(217, 91%, 90%)
blue-300: hsl(217, 91%, 70%)
blue-500: hsl(217, 91%, 50%)
blue-700: hsl(217, 91%, 30%)
blue-900: hsl(217, 91%, 10%)
```
Problem: 90% and 70% lightness look almost identical (perceptual crowding at top); 10% lightness is nearly black with no visual distinction from 30%.

Good — perceptually uniform (OKLCH-derived, converted to HSL):
```
blue-50:  hsl(214, 100%, 97%)
blue-100: hsl(214,  95%, 93%)
blue-200: hsl(213,  97%, 87%)
blue-300: hsl(212,  96%, 78%)
blue-400: hsl(213,  94%, 68%)
blue-500: hsl(217,  91%, 60%)
blue-600: hsl(221,  83%, 53%)
blue-700: hsl(224,  76%, 48%)
blue-800: hsl(226,  71%, 40%)
blue-900: hsl(224,  64%, 33%)
```
Note saturation varies slightly and hue shifts subtly — this is correct OKLCH-to-HSL conversion behavior.

**Dark Mode Adaptation**

Bad:
```css
/* Light */
--color-surface: hsl(0, 0%, 100%);
--color-accent:  hsl(258, 90%, 66%);  /* Purple */

/* Dark — naive inversion */
--color-surface: hsl(0, 0%, 0%);
--color-accent:  hsl(258, 90%, 34%);  /* Too dark, unreadable */
```

Good:
```css
/* Light */
--color-surface: hsl(0,   0%,  100%);
--color-accent:  hsl(258, 90%,  66%);

/* Dark — desaturate + shift lightness up, lift surface off pure black */
--color-surface: hsl(258, 10%,  12%);  /* Warm-tinted dark surface */
--color-accent:  hsl(258, 70%,  72%);  /* Lighter, less saturated — still passes 4.5:1 on dark surface */
```

**Contrast Ratio Check**

Bad: `color: hsl(39, 100%, 50%)` (amber/yellow) on white — contrast ratio ~1.9:1. Fails all WCAG levels.

Good: `color: hsl(39, 100%, 28%)` (dark amber) on white — contrast ratio ~7.1:1. Passes AAA.

## Checklist

- [ ] Every text color passes 4.5:1 against its background (normal text) or 3:1 (large text, >18px or 14px bold)
- [ ] Color scale has 9 stops (50–900) with perceptually uniform spacing, not mathematically uniform HSL steps
- [ ] Dark mode surfaces are NOT pure black — minimum `hsl(*, *, 8–14%)` with a slight brand hue tint
- [ ] Dark mode accents are desaturated by at least 15% relative to light mode values
- [ ] No raw HEX or RGB values appear in component files — only semantic design tokens
- [ ] Red (hue 0–15°) is reserved exclusively for error and destructive action states
- [ ] Data visualization categorical palette contains 7 or fewer distinct colors
- [ ] Gray/neutral scale has 4–8% saturation toward the brand hue — not pure `hsl(0, 0%, *)`
- [ ] Brand primary color is tested against white and dark surfaces before assigning to any text token
- [ ] Complementary color pairings at equal lightness (~50%) have been checked for chromatic vibration
- [ ] Semantic tokens (`--color-error`, `--color-success`) exist as an abstraction layer over primitive tokens
- [ ] All color decisions are documented as HSL values in the token file, not as HEX strings
