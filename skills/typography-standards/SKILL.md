---
name: typography-standards
description: Typography for digital products, documents, and marketing — scale, pairing, spacing, performance, and accessibility.
version: 1.0
---

# Typography Standards Expert Reference

## Non-Negotiable Standards

1. **Body text line-height is 1.4–1.6. Never below 1.4 for any running text above 3 consecutive lines.** Headings use 1.1–1.3. Display text (64px+) uses 1.0–1.1. Setting body to `line-height: 1` is a guaranteed readability failure.
2. **Optimal line length for body text is 60–80 characters including spaces.** Below 45 characters causes excessive hyphenation and cognitive fragmentation. Above 90 characters causes the eye to lose its place on line return. Measure by counting characters at the average line, not by pixel width.
3. **A typographic system uses a maximum of 2 typeface families.** Display/heading + body/UI. A monospace face for code is the only sanctioned third family. Every additional family dilutes identity and increases load cost.
4. **Never use font-weight below 400 (Regular) for any body text.** Thin (100), Extra-Light (200), and Light (300) weights fail readability at normal body sizes on screen, doubly so on dark backgrounds or low-contrast contexts. Decorative use of thin weights is limited to display sizes 48px+.
5. **Letter-spacing on body text is always 0 or a positive micro-value (up to 0.01em).** Negative tracking on body text is prohibited — it reduces the inter-character spacing below the typeface designer's intent. Headings may use negative tracking (–0.02em to –0.04em). All-caps labels may use positive tracking (0.05em–0.12em).
6. **Web fonts must use `font-display: swap` or `font-display: optional`.** Never use `font-display: block` (invisible text for up to 3 seconds) unless there is a confirmed and documented UX reason. System font fallbacks must be defined in every `font-family` stack, even when custom fonts load reliably.

## Decision Rules

1. **If the type scale is for a product UI, use Major Third (1.25×) or a custom step scale.** Major Third produces compact, functional hierarchy: 12, 14 (base-ish), 16 (body), 20, 24, 30, 38, 48. Perfect Fourth (1.333×) is for editorial/marketing where differentiation between heading levels needs to be dramatic. Never use Perfect Fifth (1.5×) for body-to-heading steps — the jumps are too large for UI density.
2. **If pairing two typefaces, never pair two fonts from the same broad classification at the same visual weight.** Bad: Garamond + Caslon (both oldstyle serifs). Bad: Helvetica + Neue Haas Grotesk (visually indistinguishable). Good: Tiempos (serif) + Inter (sans-serif). Good: Söhne (humanist sans, display) + Source Serif 4 (body). Contrast of classification or contrast of weight is required.
3. **If font loading causes FOUT (Flash of Unstyled Text), the fallback font must be metric-compatible.** Use `size-adjust`, `ascent-override`, and `descent-override` CSS descriptors to match the fallback's metrics to the custom font. Tools: Font Style Matcher (bramstein.com), Fontaine (nuxt/fontaine). An uncompensated FOUT causes layout shift (CLS > 0.1).
4. **If the font is loaded from Google Fonts or a CDN, add `preconnect` and `preload` for the woff2 of the most critical weight.** A font that arrives after the first contentful paint and has no fallback compensation fails Core Web Vitals on CLS.
5. **If choosing between a custom web font and a system font stack, use system fonts when: the product is data-dense/utility-first, performance is critical (< 200KB total page weight target), or brand differentiation through type is not a priority.** System stack: `font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif`. This stack is zero-load-cost and renders at native quality on every platform.
6. **If the same typeface is used at 3 or more weights, never skip non-contiguous weights in visual hierarchy.** If you use Regular (400), Semibold (600), and Bold (700), you have two steps above the base. If you also use Medium (500), you now have three weights above base — fine. If you add Thin (100) below base for a subtitle, you've broken the hierarchy weight contract. Audit: each weight step should correspond to exactly one semantic role.
7. **For fluid/responsive typography, use CSS `clamp()` with viewport units.** Never set type sizes in raw `vw` without a minimum and maximum. Formula: `clamp(minSize, preferredSize, maxSize)` where preferred is a viewport-relative expression. Example: `clamp(1rem, 2.5vw, 1.5rem)`. This eliminates 90% of responsive type breakpoints.
8. **On dark backgrounds, increase font-weight by one step and optionally reduce font-size by 1–2px for body text.** Pixel-rendered text at the same weight appears lighter on dark backgrounds due to reduced luminance contrast at stroke edges. A 400-weight body that reads cleanly on white should be tested at 400 and 450 (or 500 if variable font) on dark.
9. **Type for dyslexia-accessibility: prefer humanist or slightly rounded sans-serifs (Atkinson Hyperlegible, Lexie Readable, or Inter) over geometric sans or condensed faces.** Avoid font families where mirroring confusion exists: b/d, p/q, n/u. This matters for any product with a significant general-consumer audience.
10. **Never set letter-spacing on an all-caps word or label below 0.05em.** All-caps text without positive tracking compresses into an unreadable block at sizes below 16px. Standard label tracking: 0.06em–0.10em uppercase; 0 for mixed case.

## Mental Models

**The Type Scale as a Musical Instrument**
A type scale is a set of fixed intervals, not a free set of pixel values. Choosing Major Third (×1.25) and then adding an arbitrary 18px "because it looks right" breaks the harmonic system — the 18px now has no semantic relationship to adjacent sizes. Every size in the scale must be derivable from the base by applying the ratio: base × ratio^n. If a size falls outside the scale, the correct response is to question whether the design needs that level of hierarchy, not to add a new arbitrary size.

**The Semantic Weight Ladder**
Font weight in a typographic system is a ladder: each rung is assigned to exactly one semantic role. Example: 400=body, 500=label/caption, 600=subheading, 700=heading. Two different elements must never share a weight if they occupy different positions in the information hierarchy. Conversely, two elements at the same semantic level must use the same weight even if they differ in size. The ladder prevents "make it bold" from being a solution to unclear hierarchy.

**The Font Loading Performance Budget**
Every custom font family has a loading cost. A font with 4 weights × 2 styles = 8 font files. At an average woff2 size of 20–40KB each, that is 160–320KB of font data — a significant fraction of a performance-budgeted page. The mental model: treat each font file as a first-class network request. Subset aggressively (Latin only saves ~60% vs full Unicode), limit weights to 3 maximum, use variable fonts when the font family offers one (one file covers all weights), and preload only the above-fold critical weight.

**The Dark Background Typography Compensation Model**
The rendering pipeline for text on dark backgrounds: light text on dark backgrounds makes stroke edges appear thinner due to anti-aliasing behavior (light bleeds into surrounding dark pixels less than dark into light). This means the same CSS font-weight renders as lighter on dark backgrounds. Compensation options in order of preference: (1) Increase weight one step (400→500). (2) Use `-webkit-font-smoothing: antialiased` on macOS/iOS to prevent subpixel rendering. (3) Increase font-size by 1px for body. (4) Use a slightly higher-contrast text color (L 90% instead of L 80%). Apply all four only to critical body text on dark surfaces.

## Vocabulary

| Term | Precise Meaning |
|------|----------------|
| Type Scale | A set of font sizes derived from a base size by repeated multiplication of a fixed ratio (e.g., Major Third = 1.25×). |
| Major Third | A scale ratio of 1.25×. Produces sizes: 12.8, 16, 20, 25, 31, 39, 48... from a 16px base. |
| Perfect Fourth | A scale ratio of 1.333×. Produces sizes: 12, 16, 21, 28, 37, 49... from a 16px base. More dramatic heading differentiation than Major Third. |
| Line-Height | The vertical distance between baselines of adjacent lines. Expressed as a unitless multiplier (1.5) or pixel/rem value. Unitless is preferred as it scales with font-size. |
| Measure | The width of a column of text, ideally 60–80 characters for body. "Measure" is the typographer's term; "line length" is the common equivalent. |
| Tracking | Letter-spacing applied uniformly across all characters in a text run. Positive = open, negative = tight. Never negative on body text. |
| Kerning | Spacing adjustment between specific letter pairs (e.g., "AV") baked into the font's kern table. Applied automatically by browsers; `font-kerning: normal` enables it. |
| FOUT | Flash of Unstyled Text — the moment a custom font loads and replaces the fallback, causing a visible text style change. Mitigated with metric-compatible fallbacks. |
| FOIT | Flash of Invisible Text — browser hides text until the custom font loads. Caused by `font-display: block`. Avoided by using `swap` or `optional`. |
| Variable Font | A single font file containing a continuous axis of variation (weight, width, slant). Replaces multiple static files. Identified by the `@font-face` `src` descriptor using a woff2 variable file. |
| Fluid Typography | Type sizes that scale continuously with viewport width using `clamp()` rather than stepping at breakpoints. |
| Optical Size | A font variation axis (`font-optical-sizing: auto`) that adjusts stroke contrast and spacing for the rendered size. Display sizes get higher contrast; small sizes get more open spacing. Supported by variable fonts with the `opsz` axis. |

## Common Mistakes and How to Avoid Them

**Mistake 1: Setting line-height in pixels on body text**
- Bad: `line-height: 24px` on a 16px body font.
- Why: When font-size changes (responsive scaling, user override, accessibility settings), the pixel line-height does not scale. At 20px font-size, `line-height: 24px` produces 1.2 — too tight. At 12px, it produces 2.0 — too loose.
- Fix: `line-height: 1.6` — unitless multiplier always scales correctly.

**Mistake 2: Using Inter (or any geometric/neutral sans) for a product that needs warmth**
- Bad: A mental health journaling app that uses Inter at 400 weight throughout. Clinical, cold, corporate.
- Why: Geometric sans-serifs with low stroke contrast (Inter, DM Sans) convey efficiency and neutrality — correct for dashboards, wrong for empathetic consumer products.
- Fix: Pair a humanist serif for headings (Newsreader, Lora, Source Serif 4) with a readable sans for body. Or switch to a humanist sans with warmth (Nunito, Plus Jakarta Sans).

**Mistake 3: Loading all 9 weights of a variable font**
- Bad: `@font-face { font-weight: 100 900; src: url('Inter-Variable.woff2'); }` — whole variable font loaded as one resource.
- Why: While one file replaces many, the full variable font can be 150–400KB. If the product only uses weights 400, 500, 600, a subsetting step reduces file size by 40–60%.
- Fix: Use a build tool (fonttools, glyphhanger) to subset to `font-weight: 400 700` and Latin character range. Or use Google Fonts with explicit `?display=swap&weight=400;500;600` parameters.

**Mistake 4: All-caps headings with zero letter-spacing**
- Bad:
  ```css
  h4 { text-transform: uppercase; letter-spacing: 0; font-size: 12px; }
  ```
  Result: "OVERVIEW" reads as a compressed, unbreathable block at small sizes.
- Why: Capital letters have wider horizontal strokes. Without added spacing, the visual density becomes illegible, especially for wide letters (M, W) followed by narrow ones (I, L).
- Fix: `letter-spacing: 0.08em` minimum for all-caps labels. `0.06em` for uppercase headings above 20px.

**Mistake 5: Not defining a system-font fallback when using a custom web font**
- Bad: `font-family: "Söhne", sans-serif;` — generic `sans-serif` maps to Times New Roman on some systems, Arial on others. No metric compensation.
- Why: During font load (FOUT window) or on systems where the custom font fails, the fallback causes layout shift and visual jarring.
- Fix:
  ```css
  font-family: "Söhne", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  ```
  Add metric compensation `@font-face` for the most visually similar system fallback.

## Good vs. Bad Output

**Type Scale — UI Product**

Bad (arbitrary values):
```css
--text-xs:  11px;
--text-sm:  13px;
--text-base: 16px;
--text-lg:  18px;  /* Not on the scale */
--text-xl:  22px;  /* Not on the scale */
--text-2xl: 28px;
--text-3xl: 36px;
```
Problem: 18px and 22px are not derivable from any ratio. Three engineers will pick different arbitrary sizes next time.

Good (Major Third 1.25× from 16px base):
```css
--text-xs:   10px;   /* 16 ÷ 1.25² */
--text-sm:   13px;   /* 16 ÷ 1.25  */
--text-base: 16px;   /* Base        */
--text-lg:   20px;   /* 16 × 1.25  */
--text-xl:   25px;   /* 16 × 1.25² */
--text-2xl:  31px;   /* 16 × 1.25³ */
--text-3xl:  39px;   /* 16 × 1.25⁴ */
--text-4xl:  49px;   /* 16 × 1.25⁵ */
```

**Fluid Typography**

Bad:
```css
h1 { font-size: 48px; }
@media (max-width: 768px) { h1 { font-size: 32px; } }
@media (max-width: 480px) { h1 { font-size: 24px; } }
```
Three discrete jumps. At 769px it's 48px; at 768px it's 32px — a 16px snap.

Good:
```css
h1 {
  font-size: clamp(1.75rem, 4vw + 0.5rem, 3rem);
  /* min: 28px, preferred: scales with viewport, max: 48px */
}
```
Continuous scaling from 28px to 48px across the viewport range. Zero layout-shift breakpoints.

**Font Loading with Fallback Compensation**

Bad:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter&display=block');
body { font-family: 'Inter', sans-serif; }
/* FOIT: text invisible for up to 3 seconds. No fallback metrics. */
```

Good:
```css
/* In <head>: */
/* <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin> */
/* <link rel="preload" as="font" href="/fonts/inter-400.woff2" crossorigin> */

@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-400.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
  /* Fallback metric compensation: */
  ascent-override: 90%;
  descent-override: 22%;
  line-gap-override: 0%;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
```

## Checklist

- [ ] Type scale uses a named ratio (Major Third 1.25× or Perfect Fourth 1.333×) — no arbitrary sizes
- [ ] Body text line-height is unitless and falls between 1.4 and 1.6
- [ ] Heading line-height falls between 1.1 and 1.3; display (64px+) is 1.0–1.1
- [ ] Measure (column width) targets 60–80 characters for body copy
- [ ] Maximum of 2 typeface families in use (3 if monospace for code is required)
- [ ] No font-weight below 400 is used for any body or label text
- [ ] All-caps text has letter-spacing of at least 0.06em
- [ ] Web fonts use `font-display: swap` or `font-display: optional` — never `block`
- [ ] System-font fallback stack is defined for every custom `font-family` declaration
- [ ] Fluid typography uses `clamp()` for at least H1 and H2 — no px-snapping at breakpoints
- [ ] Dark mode body text is tested at font-weight 400 and 500 — heavier weight selected if strokes appear thin
- [ ] Total custom font payload (all weights, all families) is under 150KB (woff2, subsetted to Latin)
