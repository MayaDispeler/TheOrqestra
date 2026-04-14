---
name: content-strategy
description: Expert reference for content decisions in products and interfaces — UX copy, information hierarchy, structure selection, and writing rules for specific content contexts
tags: [ux-writing, content, copywriting, information-architecture, seo]
---

# Content Strategy — Expert Reference

## Core Mental Model

Every content decision is an information architecture decision. The questions are always:
1. **What does the user need to know right now?** (not what do we want to say)
2. **What is the minimum information required to complete this task?**
3. **What happens if this content is wrong, missing, or misread?**

Content hierarchy = urgency × relevance × consequence. What carries the most consequence for the user goes first, always.

---

## Non-Negotiable Standards

1. **Lead with the outcome, not the input**. Users care what happens, not what exists. "See which campaigns are working" beats "Campaign analytics dashboard".
2. **One sentence = one idea**. No compound sentences in UI copy. Split them.
3. **Active voice in all UI copy**. "Your file was deleted" → "File deleted". Passive adds words and reduces accountability clarity.
4. **Labels are not instructions and instructions are not labels**. A button label is an outcome ("Save changes"), not an instruction ("Click to save your changes").
5. **Error messages must give a next action**. An error with no path forward is a dead end. Always answer: what should the user do now?
6. **Numbers and specifics beat adjectives**. "Syncs every 5 minutes" beats "Syncs frequently". "28 items" beats "some items".
7. **"Please" weakens commands**. Never use "please" in error messages, confirmations, or required actions. It implies optionality.

---

## Content Structure Selection Rules

Use the right container for the content:

| Content type | Use | Not |
|---|---|---|
| Sequential steps | Numbered list | Prose with "then... then... then..." |
| Options to compare | Table | Bulleted list |
| A warning the user must see | Callout block (warning) | Inline parenthetical |
| A single key fact | Bold inline / callout | A paragraph |
| 3+ related items | Bulleted list | Comma-separated inline |
| Step with a decision branch | Decision tree / table | Nested bullets |
| Reference data (flags, values, parameters) | Table | Paragraphs |
| Concept explanation | Prose | Bullets (fragments lose context) |

**Decision rule**: If a user will scan it, structure it. If a user will read it, prose is fine.

---

## UX Copy Formulas by Context

### Error Messages
```
[What failed] + [Why it failed, if known] + [What to do next]

BAD:  "An error has occurred. Please try again."
GOOD: "Couldn't connect to Stripe. Check that your API key is active, then retry."
GOOD: "File too large. Maximum size is 10 MB. Compress or split the file."
```

Never:
- Blame the user ("You entered an invalid email")
- Use "oops", "uh oh", or cute language for data loss errors
- Give an error code without a human explanation
- Omit the next action

### Empty States
```
[What's empty] + [Why it's empty / what it's for] + [Primary action to fill it]

BAD:  "No data."
BAD:  "Nothing here yet!"
GOOD: "No campaigns. Create one to start tracking performance. [Create campaign →]"
GOOD: "No results for 'zapier integration'. [Clear filters] or [Browse all integrations]"
```

### Confirmation Dialogs (Destructive Actions)
```
[Specific consequence] + [Scope] + [Irreversibility if true]

BAD:  "Are you sure?"
BAD:  "Delete item?"
GOOD: "Delete 'Q4 Campaign'? This removes all associated reports and cannot be undone."
GOOD: "Remove Sarah Chen from this workspace? She'll lose access to all 14 shared projects."
```

The action button must match the consequence:
- `Delete campaign`, not `Confirm`
- `Remove Sarah`, not `Yes`
- `Cancel subscription`, not `OK`

### Tooltips and Helper Text
```
[What this thing does] + [When to use it] — never restate the label

BAD label: "Privacy mode"  BAD tooltip: "This is privacy mode."
GOOD tooltip: "Hides sensitive data from your screen. Useful when presenting."

BAD label: "Notify team"  BAD tooltip: "Notify your team."
GOOD tooltip: "Sends an email to all workspace members when this item is published."
```

### Success Messages
```
[What succeeded] + [What changed / what to do next if non-obvious]

BAD:  "Success!"
BAD:  "Saved."
GOOD: "Changes saved."
GOOD: "Invite sent to sarah@company.com."
GOOD: "Campaign paused. Resume it any time from the Campaigns page."
```
Success messages do not need explanation unless a non-obvious state change occurred.

### Onboarding / First-Use Copy
```
[What the user can do now] — never [what the product is]

BAD:  "Welcome to Acme! We're a powerful platform for managing..."
GOOD: "Connect your first data source to start seeing insights."
GOOD: "You're in. Here's what most teams do first: [→ Import contacts]"
```

---

## Decision Rules

- If copy is longer than 2 sentences on a mobile screen → cut it by 50%, then cut again
- If a CTA says "Learn more", "Click here", or "Get started" → rewrite with the specific outcome: "Read the migration guide", "See your usage breakdown", "Start your free 14-day trial"
- If a page has two equally prominent CTAs → one of them is wrong; establish hierarchy
- If a label requires a tooltip to understand → the label is wrong; rename it
- If body copy contains parenthetical asides → they are either important (promote to main copy) or unimportant (delete)
- If a heading is a noun phrase → test whether adding a verb makes it clearer: "Security" → "Manage security settings"
- If a form field label is a question → flatten to a noun: "What's your company name?" → "Company name"
- If error copy says "invalid [field]" → specify what valid looks like: "Invalid email" → "Enter a full email address (user@example.com)"
- If the word "just" appears ("just click here", "just add a tag") → delete it; it minimizes user effort and adds no meaning
- If copy says "easily", "simply", "quickly" → delete it; if something is easy, show it; don't claim it
- Never write "Please note that..." → cut "please note that" and keep the rest
- Never use double negatives: "not uncommon" → "common"; "can't be undone" is fine (single negation with consequence)

---

## Information Hierarchy for Page/Screen Content

Reading order = F-pattern (top-left heavy). Information placement:

```
ABOVE FOLD:
  1. What this page/screen is for (headline — 1 line)
  2. What the user should do (primary CTA or key data)
  3. Why they should do it or the key status

BELOW FOLD:
  4. Supporting details
  5. Secondary actions
  6. Edge cases, footnotes, legal
```

**Rules**:
- If the primary action requires scrolling on a 1080p monitor → redesign the layout
- If a page answers more than one user question → split it into two pages or use tabbed content
- Progressive disclosure: show default, hide advanced. Never show all options to all users at all times.

---

## SEO-Level Content Decisions

These are content structure decisions, not keyword optimization:

- **Page title** must contain the user's search intent phrase exactly — not a brand tagline
- **H1** = one per page, matches or closely echoes the title tag
- **H2s** = scannable answers to sub-questions; must make sense read in isolation
- **Meta description** = `[who this is for] + [what they get] + [differentiator]`, max 155 chars. Not a marketing sentence.
- **Image alt text** = what the image shows, in context of the surrounding content. Never "image of..." or empty.
- If the page is a list article ("5 ways to...") → use `<ol>` not `<ul>` — Google parses ordered lists as numbered results
- If a page answers a specific question → add an FAQ section with the exact question phrasing as `<h3>`

---

## Common Mistakes

### Mistake 1: Feature-led copy
```
BAD:  "Our AI-powered dashboard gives you real-time analytics with customizable widgets."
GOOD: "See which campaigns are driving revenue — updated live."
```

### Mistake 2: Restating the label in the description
```
BAD:  Label: "Export" / Helper: "Use this to export your data."
GOOD: Label: "Export" / Helper: "Download as CSV or JSON. Exports include all columns."
```

### Mistake 3: Vague empty states with no action
```
BAD:  "No items found." / "Nothing to show here yet!"
GOOD: "No integrations connected. [Browse integrations →]"
```

### Mistake 4: Symmetric CTA pairs
```
BAD:  [Cancel]  [Submit]   — both equally weighted
BAD:  [No]  [Yes]          — ambiguous for what?
GOOD: [Keep subscription]  [Cancel subscription]   — asymmetric weight + specific
GOOD: [Go back]  [Delete 3 files]                  — action specificity prevents accidents
```

### Mistake 5: Hiding the lede in a paragraph
```
BAD:
  "Our team has been working hard to improve your experience and we're excited to
   share that we've added support for CSV imports, which many of you have requested."

GOOD:
  "CSV import is now available. [Import a file →]"
  You can now import contacts directly from a CSV file. [Full guide]
```

---

## Good vs Bad Output Comparison

### Error state
```
BAD:  "Something went wrong. Please try again later."
GOOD: "Payment declined. Your card's spending limit may have been reached.
       Try a different card or contact your bank. [Use a different card →]"
```

### Navigation labels
```
BAD (org-chart IA): Solutions → Enterprise → Platform → Infrastructure → Docs
GOOD (task IA):     Get started / Integrate your tools / Manage billing / API reference
```

### Tooltip
```
BAD:  "Advanced mode"  → tooltip: "Enable advanced mode for more options."
GOOD: "Advanced mode"  → tooltip: "Shows developer tools: raw API responses,
       webhook logs, and manual sync controls."
```

### Destructive confirmation
```
BAD:  "Are you sure you want to delete this? This action cannot be undone. [Cancel] [OK]"
GOOD: "Delete 'November Cohort'? All 847 contacts and their history will be removed.
       This cannot be undone. [Keep list] [Delete list]"
```

---

## Vocabulary

- **Lede**: the first sentence/phrase that carries the most important information — never buried
- **Progressive disclosure**: showing default information, hiding complexity until requested
- **Parallel construction**: list items, headings, and CTAs follow the same grammatical form
- **Affordance**: how obviously a UI element communicates what it does — copy is part of affordance
- **Microcopy**: short-form UI text (labels, tooltips, error messages, placeholder text)
- **Voice**: the consistent personality of content (fixed)
- **Tone**: how voice is calibrated to context (varies by emotional state and risk level)
- **Information scent**: how well a link/label predicts what the user will find by following it
- **Cognitive load**: the mental effort required to process content — reduce it always
- **Above the fold**: content visible without scrolling — highest-value real estate
- **CTA (Call to Action)**: a prompt for a specific user action — must be specific and outcome-oriented
- **Deflection**: when content successfully answers a user's question without them needing to contact support
