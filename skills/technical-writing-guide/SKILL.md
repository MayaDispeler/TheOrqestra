---
name: technical-writing-guide
description: Expert reference for producing clear, accurate, and usable technical documentation
version: 1.0
---

# Technical Writing Expert Reference

## Non-Negotiable Standards

1. **One task, one topic**: Every document has a single declared purpose. Tutorials teach. How-tos solve specific problems. References describe. Explanations build understanding. Never conflate these types in a single document without explicit section demarcation.
2. **Every instruction is imperative and complete**: "Click Save" not "You can click Save" or "Save can be clicked." Subject is always the user. Verb is always action. Object is always explicit.
3. **Code blocks for all code, commands, and paths**: No inline code presented as prose. Every command a user must type lives in a fenced code block with language tag.
4. **Version everything**: Software version, API version, OS version — state the version context at the top of every doc. A doc without version context is a doc waiting to mislead.
5. **Active voice, present tense**: "The function returns a string" not "A string will be returned by the function."

---

## Decision Rules

**If** writing a tutorial → structure as: goal → prerequisites → numbered sequential steps → expected outcome per step → final result. Never skip the expected outcome.

**If** writing a reference page → use a consistent schema for every entry: signature, parameters (type + description + required/optional), return value, exceptions, example. Never mix narrative with reference.

**If** a procedure has a prerequisite → state it before step 1, not buried in step 4.

**If** a step can fail → include a troubleshooting note or link immediately after that step, not at the end of the document.

**If** using a screenshot → it must show exactly the state described in the surrounding text. No placeholder "sample" screenshots.

**If** content applies only to a subset of users (OS, role, plan tier) → use a clearly labeled callout (Note / Warning / Tip) or conditional section. Never let platform-specific instructions bleed into universal steps.

**Never** use "simply," "just," "easily," or "obviously" — these are writer comfort words that alienate readers who are stuck.

**Never** write a warning after the step it warns about. Warnings precede the action.

**Never** use "etc." in technical documentation — either enumerate completely or scope explicitly ("and other string types").

---

## Mental Models

**The Curse of Knowledge**
The writer knows the system; the reader does not. Every omitted step is invisible to the writer and catastrophic to the reader. Write for the state of knowledge the reader has *before* reading this document, not the state they'll have after.

**Minimalism Principle (Carroll)**
Users want to act, not read. Every sentence that doesn't help the user take the next action is friction. Default to action; add explanation only when a user who skips the explanation will fail or cause harm.

**The Docs-as-Tests Framework**
If you can't write a procedure that produces a deterministic outcome, the system is underspecified or the writer doesn't understand it. Good docs expose gaps in the product.

**DITA Content Types (simplified)**
- Task: How to do something (numbered steps)
- Concept: Why it works / mental model
- Reference: Specifications and parameters
- Troubleshooting: Symptom → cause → resolution

Mixing types in a single page is the most common structural error.

---

## Vocabulary

| Term | Precise Meaning |
|---|---|
| Procedure | Numbered steps to complete a single task |
| Task topic | DITA term for a procedure-type document |
| Callout | Visually distinct note (Note, Warning, Caution, Tip, Important) |
| Admonition | Synonym for callout in many style guides |
| Chunking | Breaking content into scannable logical units |
| Progressive disclosure | Showing only what the user needs at each decision point |
| Single-sourcing | One source document published to multiple outputs |
| Snippet | Reusable content fragment inserted by reference |
| API contract | The specification a developer must implement against |
| Schema | The defined structure for a data format or document type |

---

## Common Mistakes and How to Avoid Them

**Mistake 1: Assumed context**
- Bad: "Navigate to the settings page and enable the feature."
- Fix: "In the top navigation bar, click **Settings**. Under the **Integrations** tab, toggle **Feature Name** to **On**."
- Rule: Name every UI element explicitly. Use bold for UI labels.

**Mistake 2: Passive-voice procedures**
- Bad: "The configuration file should be updated with your API key."
- Fix: "Open `config.yaml` and replace `YOUR_API_KEY` with your actual API key."
- Rule: The user is always the grammatical subject of a step.

**Mistake 3: Conflated warning placement**
- Bad: Step 3 says "Delete the folder." Step 5 says "Note: deleting the folder in step 3 is irreversible."
- Fix: Add a Warning callout *before* Step 3.

**Mistake 4: No expected outcome**
- Bad: "3. Run the install script."
- Fix: "3. Run the install script: `bash install.sh` — When complete, you should see: `Installation successful. Version 2.1.0 installed.`"

**Mistake 5: Screenshot without annotation**
- Bad: A screenshot of a complex UI with no callouts
- Fix: Annotate screenshots with numbered callouts matching step numbers; include alt text describing what the screenshot shows

---

## Good vs. Bad Output

**BAD procedure step:**
> You will want to make sure that the environment variables have been configured properly before attempting to run the application, as this can lead to errors.

**GOOD procedure step:**
> **Before you begin**: Set the following environment variables. Missing variables cause a `ConfigError` at startup.
> ```bash
> export DATABASE_URL="postgresql://user:pass@localhost:5432/mydb"
> export SECRET_KEY="your-secret-key"
> ```

---

**BAD API reference entry:**
> `createUser()` — This function is used to create a new user in the system. It takes some parameters.

**GOOD API reference entry:**
> ### `createUser(options)`
> Creates a new user record and returns the created user object.
>
> **Parameters**
> | Name | Type | Required | Description |
> |---|---|---|---|
> | `options.email` | `string` | Yes | Valid email address. Must be unique. |
> | `options.role` | `"admin" \| "viewer"` | No | Default: `"viewer"` |
>
> **Returns**: `Promise<User>` — the created user object
>
> **Throws**: `DuplicateEmailError` if email already exists
>
> ```javascript
> const user = await createUser({ email: "a@b.com", role: "admin" });
> ```

---

## Deliverable Checklist

- [ ] Document type declared (tutorial / how-to / reference / explanation)
- [ ] Version context stated at top
- [ ] Prerequisites listed before step 1
- [ ] All steps imperative, present tense, active voice
- [ ] All code/commands in fenced code blocks with language tag
- [ ] All UI labels bolded
- [ ] Warnings appear before the step they warn about
- [ ] Expected outcomes included after key steps
- [ ] No "simply," "just," "easily," "obviously"
- [ ] Reviewed against the actual product/code, not memory
