---
name: devsecops
description: Expert reference for embedding security into CI/CD pipelines, container supply chains, and developer workflows
version: 1.0
---

# DevSecOps Expert Reference

## Non-Negotiable Standards

1. **Security gates run at every stage of the pipeline, not just pre-deploy**: Pre-commit catches secrets. PR gates catch code vulnerabilities. Build gates catch dependency issues. Deploy gates catch config misconfigurations. Runtime gates catch post-deploy threats. Skipping any stage creates blind spots.
2. **Critical and High severity findings block the pipeline**: CVSS score ≥7.0 is a build failure, not a warning. Teams that treat security findings as optional to-dos accumulate exploitable debt. Medium findings are tracked and resolved within 30 days.
3. **Secrets are never in Git, ever**: Not in `.env.example`. Not in comments. Not in commit history. Pre-commit hooks AND CI scanning run in parallel — one layer is not enough.
4. **Container images are signed and verified at deployment**: Images without a valid cosign signature are rejected by the admission controller in production. The signing key is in a KMS, never on a developer machine.
5. **Every component has a software bill of materials (SBOM)**: You cannot secure what you cannot inventory. SBOM generation with Syft runs at build time and is stored alongside the artifact. SBOM enables fast response when a new CVE is published.

---

## Decision Rules

**If** adding security scanning to CI → implement in this order: (1) secrets detection, (2) SAST, (3) dependency scanning, (4) container scanning, (5) IaC scanning, (6) DAST. Each layer addresses a different threat class.

**If** a SAST tool produces >50 findings on first run → triage into: fix now (critical/high), fix within 30 days (medium), suppress with justification (false positive). Never suppress without a written reason. Never close a finding as "won't fix" without security team approval.

**If** secrets are found in Git history → rotate immediately, then remove from history with `git filter-repo`. Assume the secret is compromised — treat as an active incident.

**If** a container image has a critical CVE → block deployment. If the base image is the source, update to a patched version. If no patch exists, evaluate mitigating controls and document the accepted risk with a time-bound remediation plan.

**If** choosing a secrets manager → AWS Secrets Manager or HashiCorp Vault for application secrets. Never environment variables for sensitive credentials in production (they leak into logs, process lists, and crash dumps).

**If** dynamic database credentials are possible → use them. Vault database secrets engine issues credentials with a 1-hour TTL. Compromise of app credentials = 1-hour exposure window, not permanent.

**Never** use `--no-verify` to bypass pre-commit hooks. If a hook is blocking legitimate work, fix the hook — don't bypass security gates.

**Never** grant `*:*` IAM permissions to application roles or CI service accounts. Least privilege is not optional for CI systems that have write access to production infrastructure.

---

## Mental Models

**The Shift-Left Security Model**
```
STAGE           TOOLS                               FAILURE MODE
IDE/Pre-commit  GitLeaks, TruffleHog, tflint        Secrets, obvious misconfigs
PR/Code Review  Semgrep, CodeQL, Snyk Code          SAST vulnerabilities
Build           Trivy, Grype, Syft, Dependabot      CVEs, license issues, SBOM
Deploy          Checkov, tfsec, OPA/Gatekeeper       IaC misconfigs, K8s policy
Runtime         Falco, AWS GuardDuty, Sysdig         Active threats, anomalies
```
Each stage catches different threats. Shift-left reduces fix cost — a finding in IDE costs $1 to fix; the same finding in production costs $1,000.

**The Container Security Layers**
```
Layer 1: Base image — use distroless or minimal (Alpine); pin with digest
Layer 2: Dependencies — scan with Trivy; update on CVE
Layer 3: Application code — SAST; no credentials baked in
Layer 4: Runtime config — non-root UID; read-only FS; drop ALL capabilities
Layer 5: Registry — private; access controlled; signed with cosign
Layer 6: Admission — OPA Gatekeeper or Kyverno reject policy violations at deploy
```

**SLSA Supply Chain Security Levels**
```
SLSA Level 1: Provenance exists (build script documented)
SLSA Level 2: Provenance is signed and hosted (verifiable)
SLSA Level 3: Build runs in isolated environment (tamper-resistant)
SLSA Level 4: Two-party review + hermetic builds (highest assurance)
Target: SLSA Level 2 minimum for production; Level 3 for critical services
```

---

## Vocabulary

| Term | Precise Meaning |
|---|---|
| SAST | Static Application Security Testing — analyzes source code for vulnerabilities without execution |
| DAST | Dynamic Application Security Testing — tests running application by sending attack payloads |
| SCA | Software Composition Analysis — scans dependencies for known CVEs and license issues |
| SBOM | Software Bill of Materials — inventory of all components in a software artifact |
| CVE | Common Vulnerabilities and Exposures — standardized identifier for known vulnerabilities |
| CVSS | Common Vulnerability Scoring System — 0-10 severity score; ≥7.0 = High, ≥9.0 = Critical |
| cosign | Sigstore tool for signing and verifying container images |
| Admission controller | Kubernetes webhook that intercepts API requests and can reject non-compliant resources |
| Shift-left | Moving security testing earlier in the development lifecycle |
| SLSA | Supply chain Levels for Software Artifacts — framework for build provenance and integrity |
| Secrets rotation | Automatically replacing credentials before they expire or after compromise |
| Zero-standing privilege | No persistent access grants; access is JIT (just-in-time) and expires automatically |

---

## Common Mistakes and How to Avoid Them

**Mistake 1: Only scanning in CI, not pre-commit**
- Bad: Secrets detection only runs in CI — developer pushes secrets, CI fails, secrets are now in Git history
- Fix: GitLeaks/TruffleHog as a pre-commit hook AND in CI. Pre-commit prevents the push; CI is the safety net.

**Mistake 2: Treating security findings as warnings**
- Bad: Semgrep runs, outputs 40 findings, pipeline continues with "informational" status
- Fix: Critical/High = build failure. Medium = PR comment + 30-day ticket. Low = tracked in backlog. No security gate that can be ignored is a security gate.

**Mistake 3: Scanning only application code, not IaC**
- Bad: SAST on Python code but no scanning of Terraform or Kubernetes manifests
- Fix: Checkov or tfsec on all Terraform. OPA/Kyverno policies on all Kubernetes manifests. Public S3 buckets, open 0.0.0.0/0 security groups, privileged containers = automatic CI failure.

**Mistake 4: Storing secrets in environment variables**
- Bad: `DATABASE_PASSWORD=supersecret` in `.env` file or ECS task definition environment block
- Fix: AWS Secrets Manager with application fetching at startup. Or Vault with dynamic credentials. Logs and crash dumps will never contain the secret value.

**Mistake 5: No runtime security monitoring**
- Bad: Security only in CI/CD — nothing monitoring what happens in the running cluster
- Fix: Falco for K8s runtime threat detection (unexpected process execution, file access, network connections). AWS GuardDuty for cloud-level threat detection. Alert on anomalies, not just known signatures.

---

## Good vs. Bad Output

**BAD CI pipeline (no security gates):**
```yaml
jobs:
  build:
    steps:
      - uses: actions/checkout@v4
      - run: npm install
      - run: npm test
      - run: docker build -t myapp .
      - run: docker push myapp:latest
```

**GOOD CI pipeline (security gates at each stage):**
```yaml
jobs:
  security-scan:
    steps:
      - uses: actions/checkout@v4
        with: fetch-depth: 0

      # Stage 1: Secrets detection
      - name: Scan for secrets
        uses: gitleaks/gitleaks-action@v2
        env: GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      # Stage 2: SAST
      - name: Run Semgrep
        run: semgrep --config=auto --error --severity=ERROR .

      # Stage 3: Dependency scanning
      - name: Snyk dependency scan
        run: snyk test --severity-threshold=high

      # Stage 4: IaC scanning
      - name: Checkov IaC scan
        uses: bridgecrewio/checkov-action@master
        with: soft_fail: false

  build-and-sign:
    needs: security-scan
    steps:
      - name: Build image
        run: docker build -t myapp:${{ github.sha }} .

      # Stage 5: Container scanning
      - name: Trivy container scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: myapp:${{ github.sha }}
          exit-code: 1
          severity: CRITICAL,HIGH

      # Stage 6: Generate SBOM
      - name: Generate SBOM
        run: syft myapp:${{ github.sha }} -o spdx-json > sbom.json

      # Stage 7: Sign image
      - name: Sign image with cosign
        run: cosign sign --key awskms:///alias/cosign-key myapp:${{ github.sha }}
```

---

## DevSecOps Checklist

- [ ] Pre-commit hooks: GitLeaks/TruffleHog running locally before push
- [ ] CI: SAST (Semgrep/CodeQL) blocking on High/Critical findings
- [ ] CI: Dependency scan (Snyk/Dependabot) blocking on CVSS ≥7.0
- [ ] CI: IaC scan (Checkov/tfsec) blocking on public exposure, unencrypted storage
- [ ] CI: Container scan (Trivy/Grype) blocking on Critical CVEs
- [ ] CI: SBOM generated and stored with every build artifact
- [ ] Images signed with cosign; admission controller rejects unsigned images
- [ ] Secrets managed in Vault or cloud SM — no ENV var secrets in production
- [ ] Dynamic database credentials via Vault (1-hour TTL)
- [ ] Runtime monitoring: Falco in K8s, GuardDuty in AWS
- [ ] IAM: least privilege for all application roles and CI service accounts
- [ ] Security findings triaged within 48 hours of detection
