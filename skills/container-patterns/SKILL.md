---
name: container-patterns
description: Production container patterns covering multi-stage Dockerfiles, image security, build optimization, runtime security, PID 1, and Docker Compose
version: 1.0
---
# Container Patterns Expert Reference

## Non-Negotiable Standards

1. **All production images use multi-stage builds.** The build stage installs compilers, build tools, and dev dependencies. The runtime stage copies only compiled artifacts. Typical reduction: Node.js 800MB → 80MB, Go 1.2GB → 15MB (scratch/distroless). Single-stage images expose build toolchains at runtime and balloon image size.
2. **Containers run as a non-root user.** Add `RUN addgroup --system app && adduser --system --ingroup app app` in the build stage. Use `USER app` before `CMD`. Root inside a container maps to root on the host if the container runtime is misconfigured or the container escapes. Non-root is a mandatory defense-in-depth layer.
3. **Base image tags are pinned to digest, not just version tag.** `FROM node:20-alpine` is mutable — the tag can point to a different image after a rebuild. Use `FROM node:20-alpine@sha256:abc123...` for reproducible, auditable builds. Update digests deliberately via Renovate or Dependabot.
4. **No secrets in Dockerfile layers, `ENV`, or `ARG` instructions.** Every layer is permanently stored in the image and visible via `docker history`. Build-time secrets use BuildKit's `--mount=type=secret`: `RUN --mount=type=secret,id=npmrc cat /run/secrets/npmrc > ~/.npmrc`. Runtime secrets are injected via environment variables from a secrets manager at container start.
5. **Every image is scanned for vulnerabilities in CI before push.** Use Trivy: `trivy image --exit-code 1 --severity HIGH,CRITICAL myapp:latest`. Critical CVEs block the pipeline. Images are signed with cosign and SBOM generated (`syft myapp:latest -o spdx-json > sbom.json`) for supply chain attestation.
6. **PID 1 is a proper init process (tini or dumb-init), not the application process.** Application processes do not handle SIGTERM propagation to children or zombie reaping correctly. Kubernetes sends SIGTERM to PID 1 and waits `terminationGracePeriodSeconds` (default 30s) before SIGKILL. An app that is PID 1 and does not forward SIGTERM causes forceful kills and request drops.

## Decision Rules

1. **IF the application language compiles to a static binary (Go, Rust) THEN use `FROM scratch` or `gcr.io/distroless/static` as the runtime base.** Result: <15MB image, zero OS attack surface. IF the app needs glibc (most C-linked binaries) THEN use `gcr.io/distroless/base`. IF the app needs a shell for debugging THEN use Alpine (5MB OS, but adds musl libc — Go binaries compiled with `CGO_ENABLED=0` work; CGO-enabled binaries do not without cross-compilation flags).
2. **IF building a Node.js application THEN use `node:20-alpine` as build base, copy only `node_modules` (production) and compiled assets to `node:20-alpine` runtime stage.** Never copy `node_modules` containing dev dependencies into the runtime image.
3. **IF a `RUN` command needs a secret (npm token, pip index URL with credentials) THEN use BuildKit secret mounts.** Set `DOCKER_BUILDKIT=1` (default in Docker 23+). Pass: `docker build --secret id=npmrc,src=$HOME/.npmrc .`
4. **IF the build has independent stages (frontend + backend, multiple services) THEN use BuildKit parallel stage execution.** Stages without dependencies on each other build concurrently. Add `# syntax=docker/dockerfile:1` at the top to enable the full BuildKit frontend.
5. **IF the runtime container requires capabilities THEN drop ALL then add only the specific capability needed.** `CAP_NET_BIND_SERVICE` is needed for ports <1024 (prefer running on port 8080+ and use Kubernetes Service to remap). `CAP_SYS_PTRACE` for debuggers. Never run with `--privileged` in production.
6. **IF the container filesystem does not need to be written to at runtime THEN set `readOnlyRootFilesystem: true`** in the Kubernetes securityContext. Mount writable `emptyDir` volumes only for specific paths (`/tmp`, `/var/cache`). Read-only root prevents most container escape and persistence techniques.
7. **IF using Docker Compose THEN it is for local development only.** Docker Compose lacks the scheduling, self-healing, rolling update, and resource management capabilities needed for production. Use `depends_on` with `condition: service_healthy` for startup ordering in development.
8. **IF the application serves HTTP and needs graceful shutdown THEN implement the following sequence on SIGTERM:** stop accepting new connections, finish in-flight requests, close DB connections, exit with code 0. Budget must complete within `terminationGracePeriodSeconds - 5` seconds (leave 5s buffer before Kubernetes sends SIGKILL). Typical budget: 25s for a 30s termination period.
9. **NEVER use `COPY . .` as an early layer.** Source code changes every commit; placing it early in the Dockerfile invalidates the cache for all subsequent layers including dependency installation. Order: `COPY package*.json ./` → `RUN npm ci` → `COPY . .`.
10. **IF the `.dockerignore` file is absent THEN the build context includes `.git`, `node_modules`, test fixtures, and local secrets**, making builds slow and potentially leaking sensitive files into the image. Always create `.dockerignore` before the first `docker build`.

## Mental Models

**Layer Cache as a Dependency Graph**
Each Dockerfile instruction creates a layer. Docker caches layers by instruction hash + parent layer hash. Any change to a layer invalidates all subsequent layers. Think of the Dockerfile as a dependency graph where the most stable content (OS packages, dependency manifests) goes at the top and the most volatile content (application source code) goes at the bottom. A single misplaced `COPY . .` before `RUN npm install` means every code change reinstalls all dependencies — a 2-minute cache miss instead of a 3-second one.

**Multi-Stage Build: Build Environment vs. Runtime Environment**
The build stage is a temporary factory. It needs compilers, linkers, test runners, linters, and build caches. The runtime stage is the shipping container. It needs only the artifact the factory produced — a binary, a set of JS files, a Python wheel. Nothing the factory needed belongs in the shipping container. Measure the difference: `docker build --target build -t debug . && docker images debug` vs. `docker build -t prod . && docker images prod`. A 10–50× size difference is normal and expected.

**Defense in Depth for Runtime Security**
Container security is a series of independent layers, each of which must fail for an attacker to succeed: (1) non-root user limits damage from app compromise, (2) read-only filesystem prevents persistence and toolchain download, (3) dropped capabilities limit what syscalls are available, (4) `seccompProfile: RuntimeDefault` blocks ~300 dangerous syscalls, (5) no privileged mode prevents escape to host, (6) network policies limit lateral movement. No single layer is sufficient; all five together make exploitation significantly harder.

## Vocabulary

| Term | Precise Definition |
|------|-------------------|
| **Multi-stage build** | Dockerfile pattern using multiple `FROM` statements; only artifacts from the final stage ship |
| **BuildKit** | Next-generation Docker build engine with parallel stages, cache mounts, and secret mounts |
| **Distroless** | Google-maintained base images with only the language runtime and no shell, package manager, or OS tools |
| **Layer** | Immutable, content-addressed filesystem diff created by each Dockerfile instruction; cached and shared |
| **.dockerignore** | File listing paths excluded from the build context sent to the Docker daemon |
| **PID 1** | First process in a container's PID namespace; receives signals from the container runtime |
| **tini** | Minimal init process (`docker run --init` or `ENTRYPOINT ["/sbin/tini", "--"]`) that reaps zombies and forwards signals |
| **dumb-init** | Simpler alternative to tini for signal forwarding; single static binary, no zombie reaping by default |
| **SIGTERM** | Signal sent by Kubernetes to PID 1 at the start of pod termination; app must handle it for graceful shutdown |
| **seccompProfile** | Syscall allowlist applied to a container; `RuntimeDefault` blocks ~300 Linux syscalls not needed by most apps |
| **cosign** | Sigstore tool for signing container images and verifying signatures in admission webhooks |
| **SBOM** | Software Bill of Materials; inventory of all packages and dependencies in an image for vulnerability tracking |

## Common Mistakes and How to Avoid Them

**1. Single-stage build ships compiler and dev tools — image is 10× larger than necessary**

Bad:
```dockerfile
FROM node:20
WORKDIR /app
COPY . .                          # Copies .git, test files, local secrets
RUN npm install                   # Installs devDependencies too
RUN npm run build
CMD ["node", "dist/server.js"]
# Final image: ~1.2GB with full Node.js + npm + devDependencies + source
```

Fix (reduces to ~85MB):
```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./             # Cache layer: only invalidated when deps change
RUN npm ci                        # Installs devDependencies for build
COPY . .                          # Source copied after deps for cache efficiency
RUN npm run build && npm prune --production

FROM node:20-alpine AS runtime
RUN addgroup --system app && adduser --system --ingroup app --no-create-home app
WORKDIR /app
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/dist ./dist
USER app
EXPOSE 8080
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]
```

**2. Root user in container — if app is compromised, attacker has host root via container escape**

Bad:
```dockerfile
FROM python:3.11
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "app.py"]
# Runs as root (UID 0) — default for all base images
```

Fix:
```dockerfile
FROM python:3.11-slim AS runtime
RUN groupadd --gid 1001 app && \
    useradd --uid 1001 --gid app --no-create-home --shell /bin/false app
WORKDIR /app
COPY --chown=app:app requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY --chown=app:app . .
USER app                          # All subsequent RUN, CMD, ENTRYPOINT run as UID 1001
EXPOSE 8080
CMD ["python", "app.py"]
```

**3. Secrets in ENV or ARG are baked into the image and visible in docker history**

Bad:
```dockerfile
ARG NPM_TOKEN
ENV NPM_TOKEN=${NPM_TOKEN}        # Visible in every layer and `docker inspect`
RUN npm install
```

Fix (BuildKit secret mount — never written to any layer):
```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm ci                        # .npmrc with token available during RUN, not stored in layer
```
Build command: `docker build --secret id=npmrc,src=$HOME/.npmrc .`

**4. Missing .dockerignore sends entire working directory as build context**

Bad: No `.dockerignore` — `docker build .` sends `.git/` (hundreds of MB), `node_modules/` (also hundreds of MB), `.env` (secrets), test data, and IDE files to the Docker daemon before building.

Fix — `.dockerignore`:
```
.git
.gitignore
.env
.env.*
node_modules
npm-debug.log
dist
coverage
.nyc_output
**/*.test.ts
**/*.spec.ts
**/__tests__
.pytest_cache
__pycache__
*.pyc
.DS_Store
Dockerfile*
docker-compose*
README.md
docs/
```

**5. Application is PID 1 without signal handling — Kubernetes SIGTERM causes forceful SIGKILL after 30s**

Bad:
```dockerfile
CMD ["node", "server.js"]
# Node.js as PID 1: SIGTERM not forwarded to child processes; zombie reaping broken
# Kubernetes waits 30s then sends SIGKILL — active requests are dropped
```

Fix:
```dockerfile
RUN apk add --no-cache tini       # Add tini to Alpine image
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
```

Also implement graceful shutdown in the application:
```javascript
process.on('SIGTERM', async () => {
  console.log('SIGTERM received — starting graceful shutdown');
  server.close(() => {            // Stop accepting new connections
    db.end();                     // Close DB connection pool
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 25000);  // Force exit after 25s if not drained
});
```

## Good vs. Bad Output

**Bad Dockerfile (root user, no multistage, secrets in ENV, COPY . . early, no tini):**
```dockerfile
FROM node:18
WORKDIR /app
COPY . .                              # Entire repo including .git, node_modules, secrets
ARG NPM_TOKEN
ENV NPM_TOKEN=${NPM_TOKEN}            # Secret baked into layer — visible in docker history
RUN npm install                       # Installs devDependencies, uses ENV token
RUN npm run build
EXPOSE 3000
CMD ["node", "src/server.js"]
# Problems: root user, 1.3GB image, secret in layer, app is PID 1, no signal handling
```

**Good Dockerfile (non-root, multistage, distroless runtime, BuildKit secrets, tini, layer-ordered for cache):**
```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    --mount=type=cache,target=/root/.npm \
    npm ci                            # Cache mount: npm cache persists across builds

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .                              # Source copied after deps — only this layer rebuilds on code change
RUN npm run build && \
    npm prune --production            # Remove devDependencies from node_modules

FROM gcr.io/distroless/nodejs20-debian12 AS runtime
# Distroless: no shell, no package manager, no OS tools — minimal attack surface
WORKDIR /app
COPY --from=builder --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY --from=builder --chown=nonroot:nonroot /app/dist ./dist
USER nonroot                          # distroless provides nonroot user (UID 65532)
EXPOSE 8080
# distroless Node image uses dumb-init by default; CMD is the node arguments
CMD ["dist/server.js"]
```

Corresponding Kubernetes securityContext:
```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 65532
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities:
    drop: ["ALL"]
  seccompProfile:
    type: RuntimeDefault
volumeMounts:
- name: tmp
  mountPath: /tmp                     # Writable tmp for apps that need it
volumes:
- name: tmp
  emptyDir: {}
```

## Checklist

- [ ] Multi-stage build separates build and runtime stages; runtime stage contains only artifacts, not build tools
- [ ] Final runtime image size measured and documented; alert if it grows >20% unexpectedly
- [ ] Non-root user created with specific UID (1001+) and set via `USER` instruction before `CMD`/`ENTRYPOINT`
- [ ] Base image pinned to digest (`FROM image:tag@sha256:...`); Renovate or Dependabot manages digest updates
- [ ] No secrets in `ENV`, `ARG`, or `COPY` — BuildKit `--mount=type=secret` used for build-time secrets
- [ ] `.dockerignore` present and excludes `.git`, `node_modules`/`__pycache__`, `.env*`, test files, docs
- [ ] Layer order: OS packages → dependency manifests → dependency install → source copy → build
- [ ] `tini` or `dumb-init` as `ENTRYPOINT` PID 1; application receives signals and implements SIGTERM handler
- [ ] Graceful shutdown exits cleanly within `terminationGracePeriodSeconds - 5` seconds (default budget: 25s)
- [ ] `trivy image --exit-code 1 --severity HIGH,CRITICAL` runs in CI; critical CVEs block pipeline
- [ ] Container runtime security: `readOnlyRootFilesystem: true`, `capabilities: drop: [ALL]`, `seccompProfile: RuntimeDefault`
- [ ] Docker Compose used only for local development; production deployments use Kubernetes or equivalent orchestrator
