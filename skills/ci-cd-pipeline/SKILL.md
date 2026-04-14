---
name: ci-cd-pipeline
description: >
  Use this skill whenever the task involves CI/CD configuration, deployment pipelines, build
  automation, GitHub Actions, GitLab CI, Jenkins, CircleCI, ArgoCD, Kubernetes deployments,
  Docker builds, release management, environment promotion, secrets management in pipelines,
  or any .github/workflows/, .gitlab-ci.yml, Jenkinsfile, or Dockerfile. Trigger on: "set up
  CI", "automate deployment", "build pipeline", "deploy to prod", "release process".
---

# CI/CD Pipeline — Expert Reference

## Core Mental Models

**A pipeline is code.** Pipeline configs live in version control, are reviewed like code, and are tested before merge.

**Fast feedback above all.** If a developer has to wait 30 minutes to know their build failed, they've moved on. Pipelines must fail fast: lint/typecheck before tests, unit tests before integration tests.

**Environments are promotion gates.** Code flows dev → staging → production. Each gate has automated quality checks. Nothing skips a gate.

**Secrets never touch logs or source control.** Ever. No exceptions.

**Deployments should be boring.** If a deployment requires heroics, the pipeline is broken.

---

## Non-Negotiable Standards

1. **No secrets in pipeline configs.** Use secret managers (GitHub Secrets, Vault, AWS SSM). Never `echo $SECRET` — it appears in logs.
2. **Every pipeline run is reproducible.** Pin tool versions (`node@20.11.0`, not `node@latest`). Use lockfiles.
3. **Build artifacts once, promote them.** Never rebuild the same code for staging/prod — you might get a different result.
4. **Rollback must be a one-command operation.** If you can't roll back in 2 minutes, your deployment strategy is wrong.
5. **Branch protection on main/master.** No direct pushes. Require CI green + review before merge.
6. **Canary or blue/green for production.** Never deploy to 100% of traffic simultaneously.
7. **Pipeline changes must be tested in a branch before merging.** Broken pipelines block everyone.

---

## Decision Rules

```
IF build time > 10 minutes THEN parallelize jobs and cache aggressively
IF two jobs have no dependency THEN run them in parallel
IF artifact is a Docker image THEN tag with git SHA, never with "latest" alone
IF deploying to production THEN require manual approval step after staging validation
IF a step can be cached THEN cache it (node_modules, pip packages, gradle cache, Docker layers)
IF pipeline uses external service credentials THEN rotate them quarterly and audit access
IF deployment fails THEN trigger automatic rollback, never leave partial state
IF infrastructure changes alongside code THEN use IaC (Terraform/Pulumi) in the same pipeline
IF running database migrations THEN run before app deployment, not after; make backward-compatible
IF secrets are needed at runtime THEN inject via env vars from secret manager, not baked into image
NEVER use :latest Docker tag in production — you cannot reproduce the deployment
NEVER commit .env files — use .env.example with dummy values
NEVER run migrations and app deployment in the same atomic step — decouple them
NEVER skip tests to fix a broken pipeline — find the root cause
```

---

## Pipeline Stage Order (canonical)

```
1. Validate        → lint, format check, type check (fail fast, < 2 min)
2. Build           → compile, bundle, build Docker image
3. Test Unit       → fast isolated tests (< 5 min)
4. Test Integration → DB/service tests with real dependencies
5. Security Scan   → SAST, dependency CVE scan, secrets scan
6. Publish         → push artifact/image with SHA tag
7. Deploy Staging  → automated, run smoke tests
8. Test E2E        → against staging environment
9. Approve         → manual gate for production
10. Deploy Prod    → canary → full rollout
11. Verify         → health checks, synthetic monitoring
```

---

## Docker Best Practices

```dockerfile
# BAD: builds as root, single layer, leaks build deps into runtime
FROM node:latest
COPY . .
RUN npm install && npm run build
CMD ["node", "dist/app.js"]

# GOOD: multi-stage, pinned version, non-root user, minimal attack surface
FROM node:20.11.0-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:20.11.0-alpine AS runtime
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
USER appuser
EXPOSE 3000
CMD ["node", "dist/app.js"]
```

---

## GitHub Actions — Patterns

### Caching dependencies correctly
```yaml
- name: Cache node modules
  uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-

- name: Install dependencies
  run: npm ci  # NOT npm install — ci is deterministic
```

### Secret injection (safe pattern)
```yaml
- name: Deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    API_KEY: ${{ secrets.API_KEY }}
  run: ./scripts/deploy.sh
  # NEVER: run: DATABASE_URL=${{ secrets.DATABASE_URL }} ./deploy.sh
  # The env block masks values in logs; inline substitution does not
```

### Artifact promotion (build once)
```yaml
build:
  runs-on: ubuntu-latest
  outputs:
    image-tag: ${{ steps.meta.outputs.tags }}
  steps:
    - uses: docker/metadata-action@v5
      id: meta
      with:
        images: myrepo/myapp
        tags: type=sha,prefix=sha-

deploy-staging:
  needs: build
  # Uses same image-tag from build job — no rebuild

deploy-prod:
  needs: [build, deploy-staging]
  environment:
    name: production
    url: https://app.example.com
  # Same image-tag — identical artifact to staging
```

---

## Common Mistakes & Exact Fixes

### Mistake 1: Rebuilding image for each environment
```yaml
# BAD: staging and prod can produce different builds
deploy-staging: { steps: [build-image, push-to-staging] }
deploy-prod:    { steps: [build-image, push-to-prod] }

# GOOD: build once, retag for promotion
build: { outputs: { sha-tag: sha-abc123 } }
deploy-staging: { needs: build, steps: [pull sha-tag, run smoke tests] }
deploy-prod:    { needs: deploy-staging, steps: [retag sha-tag as prod] }
```

### Mistake 2: Long-lived feature branch divergence
```
# BAD: feature branch lives for 3 weeks, massive merge conflict
# GOOD: merge to main daily via feature flags, short-lived branches
```

### Mistake 3: No rollback plan
```yaml
# BAD: deploy and pray
- run: kubectl set image deployment/app app=myrepo/app:$SHA

# GOOD: rolling update with automatic rollback
- run: |
    kubectl set image deployment/app app=myrepo/app:$SHA
    kubectl rollout status deployment/app --timeout=5m || \
      kubectl rollout undo deployment/app
```

### Mistake 4: Secrets in environment variables logged at startup
```javascript
// BAD: logs all env vars on startup
console.log('Config:', process.env);

// GOOD: log only non-sensitive config keys
console.log('Config:', { PORT: process.env.PORT, NODE_ENV: process.env.NODE_ENV });
```

---

## Deployment Strategies Comparison

| Strategy | Downtime | Rollback speed | Resource cost | Use when |
|----------|----------|----------------|---------------|----------|
| Recreate | Yes | N/A (redeploy) | Low | Dev/test only |
| Rolling | No | Medium (rollback deploy) | Low | Standard production |
| Blue/Green | No | Instant (switch LB) | 2x | High-traffic, zero-risk |
| Canary | No | Fast (reduce %) | Low-medium | Validating risky changes |
| Feature flags | No | Instant (toggle) | Lowest | Logic-level control |

---

## Expert Vocabulary

- **Artifact**: immutable build output (Docker image, binary, JAR) tagged with git SHA
- **Idempotency**: running a deployment step N times produces same result as running it once
- **Drift**: production state diverging from what the pipeline last deployed — remedied by IaC
- **SAST**: Static Application Security Testing — catches vulnerabilities in source code
- **DAST**: Dynamic Application Security Testing — attacks running application
- **Blast radius**: scope of impact if this deployment fails — minimize with canary/feature flags
- **Trunk-based development**: all engineers commit to main frequently (< 1 day branches); CI works on trunk
- **Environment parity**: dev/staging/prod use same base images, same configs modulo secrets
- **Smoke test**: minimal post-deploy check that the service is alive and critical paths function
- **Deployment window**: agreed low-traffic time for high-risk changes — but goal is to not need one
