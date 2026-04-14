---
name: brand-guidelines
description: Brand identity standards for digital and marketing applications — hierarchy, logo, typography, tone, and governance.
version: 1.0
---

# Brand Guidelines Expert Reference

## Non-Negotiable Standards

1. **The master brand's logo lockup is never altered by anyone outside the brand team.** Not rotated, recolored, stretched, shadowed, or reconstructed from memory. Every use pulls from the approved asset library. "I'll re-export it from Figma" is not an exception.
2. **Clear space is calculated from the X-height of the wordmark's capital letter, not from the bounding box.** Minimum clear space = 1× that X-height on all four sides. For icon-only marks, clear space = 50% of the icon's width on all sides. This is non-negotiable even in constrained placements.
3. **A brand uses a maximum of 2 typefaces across all touchpoints.** Primary (headlines, display) + secondary (body, UI). A third "monospace" face is permitted only for code-forward technical products. Every additional typeface dilutes typographic equity.
4. **The primary action color and the primary brand color are separate tokens that may or may not share the same value.** Conflating them collapses the system when either needs to change — brand refreshes should not break button states.
5. **Co-branded materials always subordinate the partner's logo to the host brand.** Host logo appears first (left or top), is equal to or larger than partner logo, and the two are separated by a neutral divider or whitespace. Neither logo uses its full-color version on the other brand's color background without an approved lockup.
6. **Brand governance documents who may modify, resize, or recolor assets and under what conditions.** Default answer is: no one modifies; they request a new asset variant from the brand team. Developers with SVG access do not have implicit permission to change fill colors.

## Decision Rules

1. **If the product has a distinct audience, pricing, or value proposition from the master brand, it warrants a sub-brand — not just a product name.** Criteria for sub-brand: different primary buyer persona, different pricing tier ($50/mo product vs $50K/yr enterprise), different visual language (consumer vs developer). Apply the endorsed model: sub-brand name + master brand endorsement ("by Acme") in reduced scale.
2. **If the logo must be reproduced below 24px in height (favicon, app icon, wearable), use the icon-only mark, never the full lockup.** Wordmarks become illegible below 24px on screen; below 10mm in print. Define minimum sizes per medium: 120px height for web headers, 32px for product UI, 16px for favicon, 10mm for print body, 25mm for print display.
3. **If placing the logo on a background, use the approved version for that background type — never fake it.** Dark background: use white or reversed logo. Light background: use full-color or dark logo. Patterned/photographic background: use solid-fill logo on a brand-color shield or white field. Never use the standard color logo on a mid-tone background that degrades legibility.
4. **If the brand color fails 4.5:1 on white, never use it as the primary text color anywhere.** Create an "accessible brand" token at a darker lightness of the same hue. The brand color can still be used for decorative, large-format, and graphic contexts.
5. **Tone of voice shifts by channel but the brand voice does not.** Voice is fixed (e.g., "direct, curious, warm"). Tone is the application of that voice to context — more formal in legal disclaimers, more conversational in social. Documented voice attributes are 3–5 adjectives with "we are / we are not" pairs, not abstract nouns like "authentic."
6. **If a piece of copy uses passive voice more than once per 100 words, it violates brand tone for any brand positioned as confident or direct.** Audit threshold: passive voice above 10% of sentences triggers rewrite.
7. **Never use the logo on a background color that is not white, black, a brand-approved color, or a tested photographic background.** "I like this gradient" is not approval. The logo on a gradient is a prohibited use unless a gradient lockup exists in the asset library.
8. **Typography in brand materials uses only weights from the approved weight set — typically Regular (400), Medium (500), Semibold (600), and Bold (700).** Thin (100–200) weights are prohibited for body text in all cases. Black (900) is permitted only for display use at 48px+.
9. **If a co-brand requires legal trademark notice, it appears adjacent to the logo at 60% opacity in the brand's neutral text color — never altered in size below 8pt / 11px.** Trademark symbols are set in the same typeface as the logo wordmark, not in body text typeface.
10. **Asset requests that violate guidelines are rejected, not adapted.** The brand manager's job is not to find a compromise version of a prohibited use — it is to explain the rule and provide a compliant alternative.

## Mental Models

**The Brand Hierarchy Triangle**
A brand architecture has three levels. At the apex: the master brand (company name, core visual identity, brand promise). In the middle: sub-brands (distinct product lines or market segments with endorsed identity). At the base: product brands (named features or editions that share the sub-brand or master brand visual system). Decisions flow downward: master brand constraints cannot be overridden by sub-brands, sub-brand constraints cannot be overridden by products. When unsure which level an asset belongs to, ask: "Would this change if the master brand underwent a refresh?" If yes, it lives at the master brand level.

**The Voice/Tone Distinction**
Voice is the brand's consistent personality — it does not change. Tone is how that personality expresses itself given the audience's emotional state and the message's context. A brand that is "direct and empathetic" uses that voice in an error message ("Something went wrong. Here's what to do next.") and in a product announcement — the tone differs (urgent vs celebratory) but the directness and empathy are present in both. Documenting tone means creating a matrix: Situation × Appropriate Tone Dial (e.g., formal↔conversational, serious↔playful).

**The Sacred vs. Flexible Asset Model**
Every brand element is either Sacred (never altered by anyone) or Flexible (can be adapted within defined parameters). Sacred: logo geometry, brand color values, primary typeface. Flexible: color combinations, layout grids, photography style, illustration style. This model prevents "brand police" paralysis on flexible elements while protecting genuinely non-negotiable ones. When the brand team is consulted about every gradient choice, governance breaks down. When it is consulted about logo modifications, it functions correctly.

**The Channel Translation Framework**
A brand visual identity is defined in a medium-agnostic format (Figma + design tokens) and then translated per channel. Web: CSS custom properties, SVG assets, web fonts. Print: CMYK Pantone anchors (brand blue might be Pantone 2728 C, not just `#2563EB`), TIFF/PDF exports, 300 DPI. Social: cropped icon marks, specific aspect ratios (1:1, 4:5, 16:9), platform-native typography if custom font is not embeddable. Email: inline CSS, system font fallbacks, PNG logo (SVG not universally supported). Each channel translation is documented separately and tested.

## Vocabulary

| Term | Precise Meaning |
|------|----------------|
| Master Brand | The top-level brand identity that governs all sub-brands and products. Contains the canonical logo, color system, and brand promise. |
| Sub-Brand | A brand with a distinct identity that is visibly related to the master brand (endorsed model) or deliberately separated (house of brands model). |
| Endorsed Brand | A sub-brand that carries a visible endorsement from the master brand (e.g., "Courtyard by Marriott"). |
| Monolithic Brand | An architecture where one brand identity covers all products (e.g., Apple). No sub-brand visual identity exists. |
| House of Brands | An architecture where each product is an independent brand with no visible master brand relationship (e.g., P&G's consumer portfolio). |
| Clear Space | The minimum exclusion zone around a logo where no other visual element may appear. Calculated from the logo's X-height or a fixed percentage of logo width. |
| X-Height | The height of the lowercase "x" in the brand's wordmark typeface. Used as the base unit for clear space calculation. |
| Lockup | An approved, fixed spatial arrangement of two or more brand elements (e.g., logo + tagline, co-brand logo pair). Cannot be recreated ad hoc. |
| Brand Voice | The fixed personality characteristics of a brand expressed in language. Defined as 3–5 adjective pairs (what we are / what we are not). |
| Brand Tone | The contextual modulation of brand voice to fit audience emotional state and message type. Varies; voice does not. |
| Primary Action Color | The color assigned to the highest-priority interactive element (primary button, primary link). May share a value with brand primary color but is a separate token. |
| Brand Governance | The documented rules specifying who has authority to create, modify, approve, and distribute brand assets, and under what conditions. |

## Common Mistakes and How to Avoid Them

**Mistake 1: Recoloring the logo to match a background**
- Bad: Developer pulls the SVG logo, changes `fill` from `#1D4ED8` to `#FFFFFF` directly in code because "the dark header needs a white logo."
- Why: The SVG's internal structure may include multiple paths with different intended treatments. Ad hoc recoloring may drop shadows, alter proportions of internal counters, or miss secondary elements.
- Fix: The brand asset library must contain explicit approved variants: `logo-primary.svg`, `logo-white.svg`, `logo-dark.svg`. Developers pull from the library; they never modify source files.

**Mistake 2: Condensing the logo to fit a small space**
- Bad: The header is 48px tall. Developer sets the logo's container to `width: 100%; height: 48px; object-fit: fill` — logo is horizontally squashed.
- Why: Non-uniform scaling breaks the proportions that make the wordmark legible. At small sizes, condensed letter spacing becomes illegible.
- Fix: Always scale logo with preserved aspect ratio (`object-fit: contain`). If the full lockup does not fit, switch to the approved icon-only mark at that breakpoint.

**Mistake 3: Using three or more typefaces in brand materials**
- Bad: Headline in Canela, body in Inter, captions in Helvetica Neue, UI labels in SF Pro — four typefaces in one product.
- Why: Each additional typeface carries its own personality. Three or more create typographic noise that undermines brand coherence. Users perceive it as inconsistency, not richness.
- Fix: Define exactly two brand typefaces. If UI requires a system-native option for performance, define it as a sanctioned exception — not a third brand typeface.

**Mistake 4: Writing brand guidelines that describe instead of prescribe**
- Bad: "Our brand voice is friendly, modern, and approachable." No examples, no word list, no do/don't.
- Why: Descriptors like "friendly" mean nothing without contrast. Every brand claims to be friendly. Without prohibited words, sample copy, and failure examples, guidelines are decoration.
- Fix: Every voice attribute includes: (a) a one-sentence definition, (b) 3 words we use, (c) 3 words we never use, (d) a good sentence example, (e) a bad sentence example with correction.

**Mistake 5: Treating co-branding as a purely aesthetic decision**
- Bad: A partnership launch where both logos are placed side by side in whichever colors and sizes "look balanced to the designer today."
- Why: Without documented co-brand rules, every partnership produces a different spatial relationship, size ratio, and color combination. The host brand equity is diluted inconsistently.
- Fix: Define a co-brand template: host logo is always left/top, minimum size ratio is 1:1 (partner logo never larger), both use single-color variants on a neutral field, separated by a 1px `#E5E7EB` divider with 24px padding on each side.

## Good vs. Bad Output

**Logo Clear Space**

Bad:
```
[LOGO] — Navigation item flush to the right edge of the logo bounding box
```
Icon sits at 4px from the wordmark edge — clear space rule violated, reads as cluttered.

Good:
```
[LOGO]     [Nav Item]
```
Clear space = 1× capital-letter X-height of the wordmark (~16px for a 40px-tall logo). Navigation begins after that exclusion zone.

**Tone of Voice — Error Message**

Bad:
"An error occurred while processing your request. Please try again or contact support if the issue persists."
- Passive constructions, vague ("an error occurred"), no ownership, no next step specificity.

Good (for a direct, empathetic brand voice):
"We couldn't save your changes — the session timed out. Refresh the page and try again. Your draft is still here."
- Active, owns the failure, names the cause, gives a concrete action, reassures.

**Sub-Brand Endorsed Lockup**

Bad: Sub-brand logo stands entirely alone with no master brand reference in any brand touchpoint. Users cannot connect the product to the company.

Good: Sub-brand logo at full scale with "by [MasterBrand]" in brand secondary typeface at 40% of the sub-brand logo height, positioned below the sub-brand wordmark, separated by 0.5× X-height of whitespace.

**Color Application — Action Color vs Brand Color**

Bad:
```css
:root {
  --color-brand: #2563EB;
  --button-primary-bg: #2563EB; /* hardcoded, not tokenized */
}
/* A brand refresh to #0EA5E9 now requires finding every hardcoded instance */
```

Good:
```css
:root {
  --color-brand-500: hsl(217, 91%, 52%);         /* Primitive */
  --color-action-primary: var(--color-brand-500); /* Semantic */
  --button-primary-bg: var(--color-action-primary); /* Component */
}
/* Brand refresh: change --color-brand-500 only. Everything updates. */
```

## Checklist

- [ ] All logo variants (full color, white, dark, icon-only) are exported and versioned in the asset library
- [ ] Clear space rule is documented with a measurement unit tied to the wordmark's X-height, not a pixel absolute
- [ ] Minimum logo size is specified per medium: web header, product UI, favicon, print body, print display
- [ ] Prohibited logo uses are explicitly listed with visual examples (not just described)
- [ ] Brand voice is documented with do/don't word lists and corrected example sentences, not just adjectives
- [ ] Tone matrix exists mapping at least 5 communication scenarios to appropriate tone settings
- [ ] Brand color is validated for WCAG contrast at its intended use contexts (text, button, background)
- [ ] Accessible color variant exists for any brand color that fails 4.5:1 on white
- [ ] Co-brand template defines size ratio, spatial relationship, and approved color combinations
- [ ] Sub-brand architecture is documented (monolithic / endorsed / house-of-brands) with visual examples
- [ ] Asset governance document names role-based permissions: who requests, who approves, who exports
- [ ] All brand typefaces are licensed for web, print, and app use — not just desktop use
