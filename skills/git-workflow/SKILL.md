---
name: git-workflow
domain: git-workflow
purpose: Maintain a clean, bisectable, deployable git history
applies_to: All commits, branches, and PRs in this repository
---

### Non-Negotiable Standards

**Commits**
- Every commit must be deployable in isolation. If it isn't, it shouldn't be a commit.
- Commit message format: `<type>(<scope>): <imperative-verb> <what>`
  - Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`
  - Scope: affected module/domain in parens: `feat(auth): add OAuth2 login`
  - Subject: imperative mood ("add" not "added", "fix" not "fixes")
  - Max 72 chars on subject line
- Body (when needed): explain WHY not WHAT. Reference issue/ticket numbers.
- Never commit directly to `main` or `develop`

**Branches**
- Format: `<type>/<ticket-id>-<slug>`
  - `feat/GTM-123-add-apollo-sync`
  - `fix/GTM-456-contact-dedup`
  - `chore/GTM-789-update-deps`
- Delete branches after merge — no graveyard branches
- Branch lifetime: features < 3 days, hotfixes < 4 hours

**PRs**
- One concern per PR. If the PR title needs "and", split it.
- PR description must answer: what changed, why, how to test
- All CI checks green before requesting review
- No "WIP" PRs in main branch queue — use Draft
- Squash merge for features, rebase merge for hotfixes

---

### Decision Rules

IF commit touches >5 files with no clear single concern → split commits
IF branch is >3 days old → rebase on main before continuing
IF fixing a bug → first commit adds a failing test, second commit fixes it
IF refactoring → zero behavior changes in refactor commits (reviewers verify by diffing tests only)
IF cherry-picking → document why in commit body
NEVER force-push to shared branches
NEVER rebase a branch that others have checked out
NEVER merge without reading your own diff first
NEVER include unrelated formatting changes in feature commits
NEVER use `git commit -m` for anything longer than 50 chars

---

### Common Mistakes and Fixes

**Mistake**: Mixing refactor and feature in one commit
```
# BAD
feat(contacts): refactor ContactService and add bulk import

# GOOD (two commits)
refactor(contacts): extract ContactService from UserController
feat(contacts): add bulk CSV import endpoint
```

**Mistake**: Vague commit messages
```
# BAD
fix: bug fix
chore: updates
feat: stuff

# GOOD
fix(auth): handle expired JWT tokens on /api/v2 routes
chore(deps): upgrade lodash 4.17.20 → 4.17.21 (security patch)
feat(contacts): add Apollo.io enrichment on contact create
```

**Mistake**: Committing debug artifacts
```
# Signs of this: console.log, debugger, TODO, hardcoded credentials
# Prevention: git diff --staged before every commit
```

**Mistake**: Giant PRs
```
# BAD: 47 files changed, 2,300 insertions, 1 PR
# GOOD: break by layer or feature slice
#   PR 1: data model + migrations
#   PR 2: service layer + tests
#   PR 3: API endpoints
#   PR 4: frontend integration
```

---

### Branch Strategy (Trunk-Based)

```
main ←── always deployable
  ↑
  └── feat/GTM-123-* (max 3 days)
  └── fix/GTM-456-*  (max 4 hours)
  └── chore/*        (same day)
```

Hotfix path: branch from main tag → fix → test → PR → merge → tag

---

### Mental Models Experts Use

- **Atomic commits**: Each commit is a logical unit that could be code-reviewed standalone
- **Bisectability**: `git bisect` must work. Each commit must compile and pass tests.
- **History as documentation**: `git log --oneline` should read like a changelog
- **Ownership**: The author is responsible until merge, reviewer is responsible after
- **No broken windows**: One messy commit invites more. Enforce standards from commit 1.

---

### Vocabulary

| Term | Meaning |
|------|---------|
| Atomic commit | Smallest meaningful change that compiles and passes tests |
| Trunk-based dev | Short-lived branches merging to main frequently |
| Fast-forward merge | No merge commit, linear history |
| Squash merge | All commits in branch → single commit on main |
| Rebase | Replay commits on top of updated base |
| Bisect | Binary search through commits to find regression |
