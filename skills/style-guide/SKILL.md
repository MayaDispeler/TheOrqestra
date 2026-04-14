---
name: style-guide
description: Expert reference for authoring and enforcing code style guides — linting, formatting, naming, and review standards
version: 1.0.0
---

# Style Guide — Expert Reference

## Non-Negotiable Standards

- Formatting is 100% automated. No PR comments about whitespace or bracket placement. Ever.
- The linter catches correctness errors; the formatter catches style. Do not conflate them.
- Style decisions are made once, documented with a rationale, and automated. They are not re-litigated in reviews.
- Naming is for the reader, not the writer. Optimize for the person reading 6 months from now.
- The guide is a living document. Rules without rationale are abandoned. Rationale without enforcement is ignored.
- Enforce at commit time (pre-commit hooks) and at CI time (pipeline gate). Never rely on developer memory.

---

## Decision Rules

**Formatting**
- If a formatting choice has no semantic impact → automate it with Prettier/gofmt/black/rustfmt. Do not write a manual rule.
- If your formatter and linter conflict → configure the linter to defer to the formatter. Linters should not enforce formatting.
- If a rule breaks 90%+ of existing code → it needs a migration script, not a PR mandate.
- Never allow "fix formatting" as the sole content of a PR. Run the formatter before the first commit.

**Naming**
- If something is a boolean → name it as a predicate: `isLoading`, `hasError`, `canSubmit`. Never `loading`, `error` (as bool), `submit`.
- If a function returns something → name it as a noun or noun phrase: `getUserById`, `parseConfig`. Never `doUserGet`.
- If a function has a side effect → make it a verb phrase: `sendNotification`, `flushCache`.
- If a variable holds a collection → name it plural: `users`, `orderItems`. Never `userList`, `arrayOfOrders`.
- If a name requires a comment to understand → rename it. The comment is a symptom, not the fix.
- Never abbreviate unless the abbreviation is universally understood in the domain (`url`, `id`, `api`, `db` are fine; `usrMgr` is not).

**Comments**
- If code is self-explanatory → no comment.
- If a comment restates what the code does → delete it.
- If a comment explains *why* a non-obvious decision was made → keep it. This is the only comment with permanent value.
- If a comment describes a workaround or known issue → add a ticket number.
- Never keep commented-out code in main. Use git history.

**File and Module Organization**
- If a file exceeds ~300 lines → it probably has more than one responsibility. Consider splitting.
- If two modules have a circular dependency → there is a missing abstraction. Extract it.
- If a function is only called from one place and its name adds no clarity → inline it.
- If a file has more than one export that is unrelated → split it.
- Never name a file `utils.ts`, `helpers.js`, or `misc.py`. Name it after what it contains.

**Error Handling**
- If you catch an error → handle it, rethrow it, or log it. Never silently swallow.
- If a function can fail → its return type must signal it (`Result<T, E>`, `T | null`, or throws a typed error).
- Never use exception handling for control flow.
- Never catch the base `Exception`/`Error` type unless you are at an application boundary.

---

## Common Mistakes and How to Avoid Them

**Mistake: Style rules enforced by humans**
PR comments: "We use single quotes here." "Two blank lines between functions."
Fix: Automate with Prettier + ESLint. If it can be caught by a tool, the tool catches it. Humans review logic.

**Mistake: Inconsistent naming in the same codebase**
`getUser`, `fetchAccount`, `loadProduct`, `retrieveOrder` — four synonyms for the same operation.
Fix: Pick one verb per operation type and codify it. `get` for synchronous lookup. `fetch` for async I/O. Document the convention. Lint for it if possible.

**Mistake: Magic numbers/strings without context**
```python
if status_code == 3:
    ...
if environment == "prod2":
    ...
```
Fix: Named constants at the module level with explanatory names. `STATUS_PENDING = 3`. Document where the value originates.

**Mistake: Over-commenting obvious code**
```js
// Increment counter by 1
counter += 1;
```
Fix: Delete it. Comments like this actively harm readability by adding noise. Reserve comments for non-obvious decisions.

**Mistake: Nested ternaries**
```ts
const label = isLoading ? 'Loading...' : hasError ? 'Error' : isEmpty ? 'No data' : data.name;
```
Fix: Use an early return function or explicit if/else. Readability over cleverness.

**Mistake: Divergent guide and enforcement**
Style guide says X in the docs. Linter config says Y. Developers follow Y without knowing X.
Fix: The linter config IS the style guide. Prose docs explain intent. The machine enforces reality.

---

## Good vs Bad Output

**Bad: Unhelpful naming**
```python
def process(d, f=False):
    tmp = []
    for i in d:
        if i.s == 1 or f:
            tmp.append(i)
    return tmp
```

**Good: Self-documenting naming**
```python
def filter_active_users(users: list[User], include_all: bool = False) -> list[User]:
    return [
        user for user in users
        if user.status == UserStatus.ACTIVE or include_all
    ]
```

---

**Bad: Comment restating the code**
```ts
// Loop through users and check if admin
for (const user of users) {
  if (user.role === 'admin') { ... }
}
```

**Good: Comment explaining the why**
```ts
// Only admins can trigger this path; regular users are redirected upstream by middleware.
// If you're adding a new role, also update auth.middleware.ts:L42.
for (const user of users) {
  if (user.role === 'admin') { ... }
}
```

---

**Bad: Catch and ignore**
```go
result, err := someOperation()
if err != nil {
    _ = err  // ignore
}
```

**Good: Explicit error handling**
```go
result, err := someOperation()
if err != nil {
    return fmt.Errorf("someOperation failed for input %v: %w", input, err)
}
```

---

## Vocabulary and Mental Models

**Formatter vs Linter** — Formatter (Prettier, Black, gofmt) rewrites code to a canonical style. Linter (ESLint, Pylint, golangci-lint) catches errors, anti-patterns, and enforces conventions. They are separate tools with separate jobs. Linters must not enforce what formatters own.

**Pre-commit Hook** — A git hook that runs checks before `git commit` completes. Use Husky (JS), pre-commit (Python), or lefthook (polyglot). Catches issues at the cheapest possible moment.

**Lint Staged** — Runs linters only on staged files. Prevents full-codebase lint runs from blocking commits in large repos.

**Naming Convention Axes**
- Casing: `camelCase`, `PascalCase`, `snake_case`, `SCREAMING_SNAKE_CASE`, `kebab-case`
- Prefix/suffix: `is*`, `*Service`, `*Controller`, `*Type`
- Verb vocabulary: `get` / `fetch` / `create` / `update` / `delete` / `remove` / `validate` / `parse`

**Principle of Least Surprise** — Code should behave the way a reader expects based on its name and structure. Violations require comments; preferably, they require a rename.

**Self-Documenting Code** — Code where names, structure, and types communicate intent without prose. The goal is not to eliminate comments; it is to eliminate the need for comments that describe *what*.

**Zero Tolerance Formatting Rule** — Any formatting violation fails CI. No warnings. This makes style enforcement binary and eliminates "I'll fix it later."

**Living Style Guide** — A style guide that is actively maintained, linked from onboarding docs, and updated when decisions change. A static style guide becomes a historical artifact within 18 months.
