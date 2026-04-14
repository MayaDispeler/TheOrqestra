---
name: zero-trust-architecture
description: Expert reference for Zero Trust Architecture design, identity perimeter, and microsegmentation
version: 1.0
---

# Zero Trust Architecture Expert Reference

## Non-Negotiable Standards

1. **Every access request is authenticated and authorized, regardless of network location**: Being on the corporate VPN does not grant implicit trust. Every API call, every resource access, every service-to-service call is verified. "On the network" is not an identity.
2. **MFA is required for all users — phishing-resistant MFA for privileged access**: TOTP (Google Authenticator) is acceptable for standard users. Hardware keys (FIDO2/WebAuthn/Passkeys) are required for administrators, executives, and anyone with production access. SMS OTP is not acceptable — it is phishable.
3. **No standing privileged access**: Administrators do not have permanent admin rights. Access is granted just-in-time, for a defined purpose, with a defined expiry. Standing admin access that goes unused for 95% of the time is a permanent attack surface.
4. **Devices must meet a health baseline to access corporate resources**: Unmanaged personal devices do not access corporate applications regardless of credential validity. MDM enrollment, OS version currency, disk encryption, and screen lock are minimum requirements.
5. **All network traffic between services is encrypted in transit**: Service-to-service communication uses mTLS. There is no "trusted internal network" where traffic travels unencrypted. Mutual authentication means both parties verify each other's identity.

---

## Decision Rules

**If** replacing a VPN → implement ZTNA (Zero Trust Network Access). VPN grants broad network access; ZTNA grants per-application access after identity + device verification. Use Cloudflare Access, Zscaler Private Access, or Palo Alto Prisma Access.

**If** an employee needs admin access to production → JIT access via Vault, CyberArk, or BeyondTrust. Request → approval → time-limited credential → automatic expiry. Session is recorded. No permanent admin SSH keys.

**If** deploying new SaaS applications → integrate with the corporate IdP (Okta/Entra ID/Google Workspace) via SAML or OIDC. No separate passwords. No shared team credentials. Every user has a named account.

**If** a user accesses from an unrecognized device or unusual location → Conditional Access policy triggers step-up authentication or blocks access. "Unusual" is defined: new country, new device, outside business hours for privileged roles.

**If** microsegmenting a network → default-deny between all segments. Start with: internet-facing tier, application tier, data tier, management tier. No direct internet-to-data-tier paths. No direct user-to-database access.

**If** implementing service-to-service authentication in K8s → service mesh mTLS (Istio/Linkerd in STRICT mode) or SPIFFE/SPIRE for workload identity. Service accounts with Kubernetes RBAC for K8s API calls.

**If** evaluating SASE → for branch offices and remote users: Cloudflare One, Zscaler, or Palo Alto Prisma. Traffic goes user→edge PoP→inspection→destination. Eliminates backhauling through HQ datacenter.

**Never** use shared service accounts. Every application, every CI/CD pipeline, every automated process has its own named identity with scoped permissions. "Service account rotation" is a workaround for a design failure.

**Never** treat VPN as zero trust. VPN authenticates once at tunnel establishment and grants broad network access. That is the opposite of zero trust.

---

## Mental Models

**Zero Trust vs Perimeter Security**
```
PERIMETER MODEL (Castle and Moat):
[Internet] → [Firewall] → [Trusted Internal Network]
                              ↓
                    Everything inside is trusted
                    Breach → lateral movement is easy

ZERO TRUST MODEL:
[Internet] → [Identity + Device Verification] → [Per-resource access decision]
                                                        ↓
                                              No implicit trust anywhere
                                              Breach → blast radius is contained
```

**The Zero Trust Verification Stack**
```
Every access request is evaluated against:

1. IDENTITY    → Is this a valid user/service? (IdP, MFA, certificate)
2. DEVICE      → Is this device managed and healthy? (MDM, posture check)
3. CONTEXT     → Is this request from expected location/time? (Conditional Access)
4. ENTITLEMENT → Does this identity have permission for this resource? (Authorization)
5. BEHAVIOR    → Does this pattern match expected usage? (UEBA, anomaly detection)

ALL 5 must pass. Failure at any level = block or step-up challenge.
```

**JIT Access Workflow**
```
Engineer needs production DB access:
1. Submit request: system, reason, duration (max 4h)
2. Auto-approval for standard roles / manual approval for elevated
3. Vault issues temporary credential (expires automatically)
4. Session recorded in PAM platform
5. Access expires; credential invalidated
6. Audit log shows: who, what, when, why, what was done

Contrast to standing access:
- Permanent SSH key on production server
- Key shared with "the team"
- No audit trail of what was done
- Key never rotated
```

---

## Vocabulary

| Term | Precise Meaning |
|---|---|
| ZTNA | Zero Trust Network Access — per-application access control replacing network-level VPN |
| SASE | Secure Access Service Edge — cloud-delivered security stack (ZTNA + SWG + CASB + FWaaS) |
| FIDO2/WebAuthn | Phishing-resistant authentication standard using hardware keys or passkeys |
| Conditional Access | Policy engine that grants/blocks access based on identity + device + context signals |
| JIT Access | Just-in-time access — temporary credentials granted on request with automatic expiry |
| PAM | Privileged Access Management — tools for managing and auditing privileged account usage |
| mTLS | Mutual TLS — both client and server authenticate each other via certificates |
| SPIFFE | Secure Production Identity Framework for Everyone — workload identity standard |
| MDM | Mobile Device Management — platform enforcing device health policies |
| UEBA | User and Entity Behavior Analytics — detects anomalous access patterns |
| Microsegmentation | Dividing a network into isolated zones with per-zone access control |
| Lateral movement | Attacker spreading from an initial compromised system to other systems |

---

## Common Mistakes and How to Avoid Them

**Mistake 1: Treating VPN as Zero Trust**
- Bad: "We have VPN so we have network security" — VPN authenticates once, grants broad access, and creates a flat trusted internal network
- Fix: Evaluate ZTNA. Replace VPN with per-application access policies. Each application requires its own authentication, regardless of network position.

**Mistake 2: TOTP as MFA for privileged access**
- Bad: Admin uses Google Authenticator for production console access — TOTP codes are phishable via real-time proxy attacks
- Fix: Hardware FIDO2 key (YubiKey) or passkey for all privileged access. TOTP is acceptable for standard user access to low-risk applications.

**Mistake 3: Standing admin accounts**
- Bad: `admin@company.com` with permanent admin access across all systems — when breached, the attacker has permanent admin access
- Fix: Zero standing privileges. All admin access via JIT workflow. Break-glass accounts exist for emergency access but are monitored and alerting on any use.

**Mistake 4: No device trust enforcement**
- Bad: Identity verified (user knows their password + MFA) but access allowed from a personal unmanaged device that may be malware-infected
- Fix: Conditional Access policy: managed device = required for access to corporate applications. MDM enrollment is a prerequisite for corporate app access.

**Mistake 5: Microsegmentation without east-west monitoring**
- Bad: Network segments created, firewall rules in place, but no visibility into traffic between segments — violations are invisible
- Fix: Flow logs enabled on all segment boundaries. SIEM ingests flow logs and alerts on unexpected segment-to-segment traffic. Microsegmentation without monitoring provides a false sense of security.

---

## Good vs. Bad Output

**BAD access architecture:**
```
Remote employee → VPN (username + TOTP) → Flat internal network
                                                 ↓
                              Has access to: wiki, code, production DB,
                              HR system, finance system, all servers
VPN compromised → attacker has access to everything
```

**GOOD Zero Trust architecture:**
```
Remote employee → Identity verification (Okta + FIDO2 hardware key)
                → Device posture check (MDM enrolled, OS patched, disk encrypted)
                → Conditional access evaluation (known device, expected location)
                → Per-application access grant:

   App             | Access Level         | Additional Auth Required
   ----------------|----------------------|---------------------------
   Wiki/Intranet   | Standard user        | None (already verified)
   Code repository | Developer role       | None
   Staging env     | Developer role       | None
   Production DB   | JIT request required | Approval + session recording
   Finance system  | Finance role only    | Step-up re-authentication
   HR system       | HR role only         | Step-up re-authentication

Compromise of one application → access to that application only
No lateral movement path to other applications
```

---

## Zero Trust Checklist

- [ ] Identity provider (IdP) deployed: Okta / Azure Entra ID / Google Workspace
- [ ] SSO enforced for all corporate applications
- [ ] MFA required for all users; FIDO2/passkeys for privileged users
- [ ] TOTP (SMS OTP) disabled for admin/production access
- [ ] MDM enrollment required for access to corporate applications
- [ ] Conditional Access policies: block unmanaged devices, flag unusual locations
- [ ] VPN replaced or supplemented with ZTNA for application-level access
- [ ] No standing admin access — JIT access workflow deployed
- [ ] PAM platform in use with session recording for privileged sessions
- [ ] Service-to-service: mTLS or SPIFFE workload identity
- [ ] Network microsegmentation: default-deny between tiers
- [ ] Flow logs enabled on segment boundaries — SIEM alerting on anomalies
