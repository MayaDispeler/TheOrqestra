---
name: networking-fundamentals
description: OSI model, TCP/UDP, DNS, load balancing, VPN, BGP, CIDR, firewall, MTU, and troubleshooting methodology for production network engineering
version: 1.0
---
# Networking Fundamentals Expert Reference

## Non-Negotiable Standards

1. **OSI layer fidelity.** Every troubleshooting session starts by pinning the failure to a layer. L1 (physical/cable/NIC), L2 (Ethernet/MAC/VLAN), L3 (IP routing/ICMP), L4 (TCP/UDP/ports), L5-L6 (session/TLS), L7 (HTTP/HTTPS/DNS/gRPC). A 502 Bad Gateway is an L7 problem; a dropped connection with no RST is an L4/L3 problem. Never jump to packet capture before confirming L3 reachability with ping.

2. **TCP for reliability, UDP for latency.** TCP (port-based, SYN/SYN-ACK/ACK) is mandatory when delivery must be guaranteed and ordering matters: HTTP/1.1 (80), HTTPS (443), SSH (22), SMTP (25/587), PostgreSQL (5432), MySQL (3306). UDP is mandatory when latency matters more than reliability: DNS queries (53), video streaming (RTP over UDP), online gaming, QUIC/HTTP/3 (443 UDP). Never send game state over TCP; never send financial transactions over UDP.

3. **DNS TTL discipline.** Set TTL to 300s (5 minutes) at least 48 hours before any record change (failover, migration, IP rotation). After the change stabilizes, return to 86400s (24 hours) for static records. Never set TTL to 0 — some resolvers treat it as 300. Never leave TTL at 86400 before a planned change.

4. **Default-deny firewall baseline.** All firewalls ship with implicit deny-all egress and explicit deny-all ingress. Every rule must have a documented business justification. Never create `0.0.0.0/0 ANY ANY ALLOW` egress rules — egress filtering catches compromised hosts phoning home. Stateful firewalls track connection state; stateless ACLs need both inbound and return-path rules.

5. **MTU consistency across path.** Standard Ethernet MTU is 1500 bytes. Jumbo frames are 9000 bytes in datacenter environments (requires end-to-end configuration — a single hop at 1500 silently drops or fragments). VPN tunnels consume header overhead: IPSec adds 50-60 bytes, GRE adds 24 bytes — set VPN interface MTU to 1436 or lower. Enable Path MTU Discovery (PMTUD) but test it; many enterprise firewalls block ICMP type 3 code 4 ("fragmentation needed"), breaking PMTUD silently.

6. **CIDR sizing discipline.** VPCs get /16 (65,534 hosts). Subnets get /24 (254 hosts) in most cases; use /28 (14 hosts) for gateway-only subnets. Host routes are /32. Private ranges only: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16. Never allocate overlapping CIDRs across VPCs you intend to peer — you cannot peer 10.0.0.0/16 with 10.0.1.0/16 in AWS without custom route manipulation.

---

## Decision Rules

1. **If the service is unreachable, ping the host first.** If ping fails → L3 routing or firewall problem. If ping succeeds but service is down → L4/L7 problem (process not listening, firewall blocking port).

2. **If ping succeeds but latency is high, run traceroute.** `traceroute -n <host>` (Linux) or `tracert <host>` (Windows) shows per-hop RTT. A single hop with 200ms latency where others are <5ms indicates a routing problem or congested link.

3. **If you need L4 visibility, use tcpdump.** `tcpdump -i eth0 -n host 10.0.0.1 and port 443 -w /tmp/capture.pcap` — always write to file, never rely on terminal output for analysis. Open in Wireshark. Look for retransmissions, RST floods, and SYN without SYN-ACK.

4. **If TCP connections establish but hang, suspect MTU.** Test with: `ping -M do -s 1472 <host>` (Linux) — sends 1472 bytes + 28-byte ICMP header = 1500 byte frame. If this fails but ping without `-s` succeeds, PMTUD is broken or MTU mismatch exists.

5. **If choosing L4 vs L7 load balancer:** Use L4 (Network LB) for TCP/UDP pass-through when you need max performance, non-HTTP protocols (gRPC, MQTT, database), or when TLS termination must happen at the application. Use L7 (Application LB) when you need HTTP routing (path `/api/*` to service A, `/web/*` to service B), header inspection, cookie-based stickiness, SSL termination with cert management, or WAF integration.

6. **If BGP peer is not establishing, check:** AS number configuration, TCP port 179 reachability between peers, MD5 password mismatch, and BGP hold timer mismatch (default 90s/180s). Use `show bgp summary` (Cisco) or `birdc show protocols` (BIRD).

7. **If deploying VPN, choose type by use case:** IPSec IKEv2 site-to-site for permanent network-to-network tunnels (AWS VPN, on-prem DC). SSL/TLS VPN (OpenVPN 1194 UDP, or SSTP 443 TCP) for client remote access where firewall traversal is needed. WireGuard (UDP 51820) for modern lightweight VPN — 4000 lines of code vs OpenVPN's 150,000; significantly better performance.

8. **Never use 192.168.1.0/24 for cloud VPCs.** Home routers default to this range. VPN split tunneling will route incorrectly when remote workers connect from home networks. Use 10.x.x.x ranges for cloud, reserve 192.168.x.x for lab/home.

9. **If a firewall rule must allow traffic, add it above the default-deny, not before it.** Rule evaluation is top-down and first-match-wins (except iptables which continues unless ACCEPT/DROP terminates). Port-specific rules must appear before broad protocol rules.

10. **Never expose management ports to the internet.** SSH (22), RDP (3389), database ports (5432, 3306, 1521, 27017), Kubernetes API (6443) must be behind VPN or accessed only from known CIDRs. Security group rules allowing 0.0.0.0/0 on these ports are a critical finding.

---

## Mental Models

**The Hourglass Model (TCP/IP waist)**
The internet is an hourglass: diverse L1/L2 technologies (fiber, 5G, WiFi) at the bottom, diverse L7 applications (HTTP, SMTP, FTP) at the top, and IP at the narrow waist. This explains why IP is the lowest common denominator — every troubleshooting path must traverse the IP layer. When two systems can't communicate, confirm IP reachability first before debugging anything above it.

**Connection State Machine (TCP)**
TCP is a state machine: CLOSED → SYN_SENT → SYN_RECEIVED → ESTABLISHED → FIN_WAIT_1 → FIN_WAIT_2 → TIME_WAIT → CLOSED. Understanding state transitions explains half-open connections (SYN flood), TIME_WAIT accumulation (high-throughput servers), and RST behavior (firewall rejecting mid-stream). `ss -tan` or `netstat -an` shows states. High TIME_WAIT count is normal; high SYN_RECEIVED with no ESTABLISHED indicates SYN flood or firewall blocking return path.

**The DNS Resolution Chain**
Client → Recursive Resolver (ISP or 8.8.8.8 / 1.1.1.1) → Root Nameserver (13 root clusters, anycast) → TLD Nameserver (.com, .org) → Authoritative Nameserver (your zone). Each step is cached at its TTL. Debugging: `dig +trace example.com` walks the full chain. `dig @8.8.8.8 example.com` tests public resolution. `dig @10.0.0.2 example.com` tests internal resolver. DNS over HTTPS (DoH) port 443 and DNS over TLS (DoT) port 853 encrypt DNS but bypass traditional DNS-based filtering.

**Routing Table Longest-Prefix Match**
Routers always forward to the most specific matching route. A packet to 10.0.1.5 with routes for 10.0.0.0/8, 10.0.1.0/24, and 0.0.0.0/0 (default) will take the 10.0.1.0/24 path — longest prefix wins. This is why host routes (/32) always override subnet routes, and why default routes (0.0.0.0/0) are last resort. Cloud routing tables follow the same rule: a more-specific VPC route overrides a peering route.

---

## Vocabulary

| Term | Definition |
|------|-----------|
| **BGP (Border Gateway Protocol)** | Exterior routing protocol using AS numbers; TCP port 179; exchanges NLRI (Network Layer Reachability Information) between autonomous systems |
| **CIDR (Classless Inter-Domain Routing)** | IP addressing notation `x.x.x.x/n` where n is prefix length; /24 = 256 addresses, /16 = 65,536 |
| **ECMP (Equal-Cost Multi-Path)** | Routing technique distributing traffic across multiple equal-cost paths; increases throughput without failover delay |
| **IKEv2 (Internet Key Exchange v2)** | Protocol negotiating IPSec SAs (Security Associations); UDP port 500 (or 4500 for NAT traversal); used for site-to-site VPN |
| **MTU (Maximum Transmission Unit)** | Largest L3 packet a link can carry without fragmentation; Ethernet: 1500B; jumbo frames: 9000B |
| **NAT (Network Address Translation)** | Mapping private IPs to public IPs; PAT (Port Address Translation) is many-to-one NAT using ports; conntrack table tracks state |
| **PMTUD (Path MTU Discovery)** | Mechanism to find smallest MTU along a path; relies on ICMP type 3 code 4; broken by firewalls blocking ICMP |
| **Route Reflector** | BGP topology optimization: instead of full-mesh iBGP, clients peer with reflector which redistributes routes |
| **SDN (Software-Defined Networking)** | Decouples control plane (routing decisions) from data plane (packet forwarding); OpenFlow protocol on port 6633/6653 |
| **SYN Flood** | DoS attack sending TCP SYN packets without completing handshake; exhausts server SYN backlog; mitigated by SYN cookies |
| **VLAN (Virtual LAN)** | L2 segmentation using 802.1Q tags (12-bit VLAN ID, 1-4094); trunk ports carry multiple VLANs; access ports carry one |
| **WireGuard** | Modern VPN protocol; UDP 51820; uses Curve25519 for key exchange, ChaCha20 for encryption; ~4000 LoC vs OpenVPN ~150,000 |

---

## Common Mistakes and How to Avoid Them

**1. Firewall blocking ICMP type 3 (Destination Unreachable)**
- Bad: Block all ICMP at perimeter firewall for "security"
- Fix: ICMP type 3 code 4 ("fragmentation needed, DF set") is required for PMTUD. Block ICMP type 8 (ping) if desired, but never block type 3. Without it, large packets silently fail — TCP sessions establish fine then hang when transferring data >1500 bytes.

**2. Overlapping CIDR across peered networks**
- Bad: VPC-A = 10.0.0.0/16, VPC-B = 10.0.1.0/24 — the /24 is a subset of the /16; VPC peering will fail or route incorrectly
- Fix: Design non-overlapping CIDR blocks at the organization level. Maintain a CIDR allocation registry. For example: prod VPC = 10.10.0.0/16, staging = 10.20.0.0/16, dev = 10.30.0.0/16.

**3. Forgetting DNS TTL before cutover**
- Bad: Change A record TTL from 86400 to 300 and immediately cut over to new IP — clients cached the old record will be unable to resolve for up to 24 hours
- Fix: Lower TTL to 300s at least 48 hours before cutover. Confirm propagation with `dig +short example.com @8.8.8.8`. After stable, raise TTL back to 86400.

**4. Stateless ACL missing return-path rules**
- Bad: Add inbound rule allowing TCP 443 but forget to add outbound rule for TCP ephemeral ports (1024-65535) — connection fails in stateless environments (AWS NACL, router ACLs)
- Fix: Stateless ACLs require explicit rules for both directions. Inbound: allow TCP dst-port 443. Outbound: allow TCP src-port 443, dst-port 1024-65535. Or switch to stateful security groups where possible.

**5. Using /32 host routes in routing tables when /24 subnets exist**
- Bad: Add 100 individual /32 routes for VMs instead of a single /24 subnet route — routing table bloat, harder to manage, higher BGP update frequency
- Fix: Aggregate at subnet level. Only use /32 routes for load balancer VIPs, floating IPs (HSRP/VRRP), or anycast addresses that are intentionally host-specific.

---

## Good vs. Bad Output

### Firewall Rule Ordering

**Bad — overly permissive rule placed before specific deny:**
```
# iptables rules (evaluated top to bottom, first match wins)
-A INPUT -s 0.0.0.0/0 -p tcp --dport 22 -j ACCEPT     # Rule 1: SSH open to world
-A INPUT -s 10.0.0.0/8 -p tcp --dport 5432 -j ACCEPT   # Rule 2: DB from internal
-A INPUT -s 0.0.0.0/0 -j DROP                           # Rule 3: default deny
# Problem: Rule 1 allows SSH from any IP — attackers can brute-force port 22
```

**Good — specific rules first, default deny last:**
```
# iptables rules
-A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT   # Rule 1: return traffic
-A INPUT -s 203.0.113.0/24 -p tcp --dport 22 -j ACCEPT   # Rule 2: SSH from known CIDR only
-A INPUT -s 10.0.0.0/8 -p tcp --dport 5432 -j ACCEPT     # Rule 3: DB from internal only
-A INPUT -p icmp --icmp-type 8 -j ACCEPT                  # Rule 4: allow ping (optional)
-A INPUT -p icmp --icmp-type 3 -j ACCEPT                  # Rule 5: NEVER block type 3
-A INPUT -j DROP                                           # Rule 6: default deny all
```

### DNS Resolution Debug Sequence

**Bad:**
```bash
# Ping the hostname and assume DNS works
ping myapp.internal.example.com
# If it resolves, assume DNS is fine — never validates the actual resolver chain
```

**Good:**
```bash
# Step 1: test with known-good public resolver
dig +short api.example.com @8.8.8.8

# Step 2: test internal resolver explicitly
dig +short api.example.com @10.0.0.2

# Step 3: walk full resolution chain
dig +trace api.example.com

# Step 4: check TTL and authoritative source
dig api.example.com +noall +answer
# Look for TTL value and authoritative NS in response
```

### CIDR Allocation — VPC Design

**Bad:**
```
VPC-Production:  192.168.0.0/16   # Conflicts with home routers
VPC-Staging:     10.0.0.0/16      # Overlaps with on-prem DC
VPC-Dev:         10.0.0.0/16      # Identical to staging — cannot peer
Subnet-Web:      10.0.0.0/24
Subnet-App:      10.0.0.0/24      # Same as Web — duplicate
```

**Good:**
```
VPC-Production:  10.10.0.0/16
  Subnet-Web-AZ1:    10.10.1.0/24
  Subnet-Web-AZ2:    10.10.2.0/24
  Subnet-App-AZ1:    10.10.11.0/24
  Subnet-App-AZ2:    10.10.12.0/24
  Subnet-DB-AZ1:     10.10.21.0/24
  Subnet-DB-AZ2:     10.10.22.0/24
  Subnet-GW-AZ1:     10.10.100.0/28   # /28 for gateway-only, minimal waste

VPC-Staging:     10.20.0.0/16
VPC-Dev:         10.30.0.0/16
On-Prem DC:      172.16.0.0/12        # Different private range, no overlap
```

---

## Checklist

- [ ] OSI layer identified for all reported symptoms before starting investigation
- [ ] L3 reachability confirmed with ICMP ping before checking L4/L7
- [ ] Traceroute run to identify per-hop latency and routing path
- [ ] DNS TTL lowered to 300s at least 48 hours before any record change
- [ ] All VPC/subnet CIDRs verified non-overlapping across all peered networks
- [ ] Firewall rules ordered most-specific to least-specific; default-deny is last rule
- [ ] ICMP type 3 code 4 explicitly permitted through all firewalls (PMTUD)
- [ ] MTU set to 1436 or below on VPN/tunnel interfaces to account for overhead
- [ ] Management ports (22, 3389, 5432, 3306, 6443) restricted to known CIDRs, not 0.0.0.0/0
- [ ] BGP hold timers and MD5 passwords verified symmetric on both peers
- [ ] VPN tunnel type chosen for use case: IPSec for site-to-site, WireGuard/SSL for client VPN
- [ ] tcpdump capture written to file with `-w` flag for Wireshark analysis
