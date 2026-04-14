---
name: ux-writing
description: Expert reference for UX writing — microcopy, interface language, and content design standards
version: 1.0.0
---

# UX Writing

## Non-Negotiable Standards

- Every string is a design decision. Treat copy as a functional component, not decoration.
- Write for scanning, not reading. Users do not read UI — they pattern-match.
- Use the user's vocabulary, not the product team's. If users call it "billing," never call it "invoicing."
- One idea per sentence. One task per screen. One call-to-action per view.
- State what happens, not what the user must do. "Your file is being uploaded" > "Please wait while we upload your file."
- Error messages must explain the problem AND the fix. Never blame the user.
- Buttons must be verbs. Labels must be nouns. Headlines must orient, not brand.
- Tense: present for status, future for outcomes, past for completion.

## Decision Rules

- If it's a button → verb phrase describing the outcome ("Save changes", not "OK")
- If it's a label → noun or noun phrase, no punctuation ("Full name", not "Enter your full name:")
- If it's an empty state → explain why it's empty + what to do ("No projects yet. Create your first one.")
- If it's an error → passive voice is forbidden. Use active, second-person, fix-first ("Enter a valid email address")
- If it's a confirmation dialog → repeat the destructive action word in the confirm button ("Delete project", not "Yes")
- If it's a tooltip → don't restate what the label already says. Add context or consequence.
- If copy exceeds 20 words → cut it in half first, then evaluate
- If you're writing a loading state → acknowledge the wait only if > 3 seconds; otherwise omit
- Never use "please" in error states — it adds length without empathy
- Never use "successfully" — if the action completed, the UI shows it; the word is redundant
- Never use "click here" — describe the destination ("View your invoice")
- Never use exclamation marks in functional UI — reserve for genuine user milestones only
- Never use jargon inside validation messages — users don't know what a "string" is

## Common Mistakes and Fixes

**Mistake: Vague error messages**
Bad: `Something went wrong. Please try again.`
Good: `We couldn't save your changes. Check your connection and try again.`

**Mistake: Button labels that mirror each other**
Bad: `Cancel | Submit`
Good: `Cancel | Save changes` — the primary always describes the action

**Mistake: Over-explaining in tooltips**
Bad: `Click this button to toggle dark mode on or off`
Good: `Switch between light and dark themes`

**Mistake: Placeholder text used as label**
Bad: Input with placeholder "Enter your email" and no visible label
Good: Label "Email address" above input, placeholder "you@example.com" as hint only

**Mistake: Passive confirmation dialogs**
Bad: `Are you sure you want to delete this?` + `Yes / No`
Good: `Delete "Q4 Report"? This can't be undone.` + `Cancel / Delete report`

**Mistake: Progress copy that doesn't progress**
Bad: "Loading..." for 8 seconds
Good: "Loading your dashboard..." → "Almost ready..." → "Done"

**Mistake: Inconsistent terminology**
Bad: "workspace" in settings, "project" in nav, "environment" in docs — all meaning the same thing
Good: Pick one term, define it in a content model, enforce it globally

## Good vs Bad Output

| Context | Bad | Good |
|---|---|---|
| Form submit button | Submit | Create account |
| Delete confirm | Are you sure? | Delete "Project Alpha"? |
| Empty inbox | No messages | Your inbox is empty. Messages from your team will appear here. |
| Upload success | Successfully uploaded! | File uploaded — 3.2 MB |
| 404 page | Page not found | We can't find that page. It may have moved or been deleted. |
| Permission error | Access denied | You don't have permission to view this. Contact your admin. |
| Password rule | Password must meet requirements | Use 8+ characters with at least one number |

## Expert Vocabulary and Mental Models

**Content hierarchy**: Information architecture applied to text — primary message, secondary context, tertiary detail. Only surface what's needed at this moment.

**Progressive disclosure**: Reveal complexity only when needed. Start with the outcome; let users ask for details.

**Cognitive load**: Every word the user reads costs attention. Minimize words, maximize meaning.

**Microcopy**: The small strings — labels, placeholders, error messages, tooltips, button text. High leverage, often neglected.

**Voice vs Tone**: Voice is constant (who the brand is), tone shifts (playful in empty states, neutral in errors, direct in warnings).

**Content model**: The taxonomy of string types in the product. Establishes which type gets which treatment — never improvise per-screen.

**First-time vs returning user**: The same screen needs different copy emphasis. Onboarding copy can be warmer; power-user views should strip ceremony.

**Scannability patterns**: F-pattern and Z-pattern eye tracking. Front-load the key word. "Delete account" not "Account deletion".

**Affordance through copy**: Words shape perceived action. "Remove" feels lighter than "Delete." "Archive" feels reversible. Use them deliberately.
