<div align="center">

```
██████╗ ██╗   ██╗ ██████╗ ██████╗ ██╗   ██╗███╗   ███╗
██╔═══██╗██║   ██║██╔═══██╗██╔══██╗██║   ██║████╗ ████║
██║   ██║██║   ██║██║   ██║██████╔╝██║   ██║██╔████╔██║
██║▄▄ ██║██║   ██║██║   ██║██╔══██╗██║   ██║██║╚██╔╝██║
╚██████╔╝╚██████╔╝╚██████╔╝██║  ██║╚██████╔╝██║ ╚═╝ ██║
 ╚══▀▀═╝  ╚═════╝  ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝
```

*Claude is brilliant. It just doesn't know who to call.*

[![npm](https://img.shields.io/npm/v/quorum-ai?color=%23000\&labelColor=%23000\&style=flat-square)](https://npmjs.com/package/quorum-ai)
[![license](https://img.shields.io/badge/license-MIT-%23000?labelColor=%23000\&style=flat-square)](#)
[![built for](https://img.shields.io/badge/built%20for-Claude%20Code-%23000?labelColor=%23000\&style=flat-square)](https://claude.ai/code)
[![Stars](https://img.shields.io/github/stars/sriharivvenkatesan/Quorum?style=flat-square\&color=000\&labelColor=000)](https://github.com/sriharivvenkatesan/Quorum/stargazers)

![Quorum in action](quorum-demo.gif)

</div>

---

## Overview

**97 specialist agents. 101 skills. One orchestrator.**

It assembles the right team *before* anyone writes a line of code.

```bash
npx quorum-ai
```

⭐ Star the repo to get notified when new agents drop.

---

## The Problem Nobody Talks About

You have Claude Code. You have agents. You use them.

But every session starts the same:

* You describe what you want
* Claude responds
* Something gets built

What’s missing?

* The *right agent*
* The *right order*
* The *right context flow*

That’s not a Claude problem.
That’s a **coordination problem**.

**Quorum solves coordination.**

---

## What Happens When You Type a Task

```
you: "build a SaaS for managing freelance invoices"

ORCHESTRATOR

Pass 1 — domains:
  engineering ✓
  design      ✓
  data        ✓
  revops      ✗
  people      ✗
  docs        ✗

Pass 2 — execution plan:

  STAGE 1   system-architect
  STAGE 2   api-designer      (parallel)
            ux-designer
  STAGE 3   backend-engineer  (parallel)
            frontend-engineer
  STAGE 4   data-analyst
  STAGE 5   qa-engineer
```

* Each agent receives prior outputs
* Each agent knows what to hand off

If your prompt is vague → it asks **3 questions and stops**

**No guessing. No wasted work. No chaos.**

---

## The Roster

### Engineering

`software-engineer` `frontend-engineer` `backend-engineer` `full-stack-engineer`
`mobile-developer` `system-architect` `cloud-architect` `saas-architect`
`solution-architect` `staff-engineer` `ai-engineer` `ml-engineer`
`mlops-engineer` `data-engineer` `devops-engineer` `devsecops-engineer`
`platform-engineer` `sre` `security-engineer` `penetration-tester`
`kubernetes-engineer` `aws-engineer` `azure-engineer` `gcp-engineer`
`database-administrator` `api-designer` `rag-engineer` `prompt-engineer`
`qa-engineer` `debugger` `code-reviewer` `+more`

### Design

`ux-designer` `ui-expert` `design-engineer` `ux-researcher` `ux-writer`

### Data

`data-analyst` `business-analyst` `bi-specialist` `ml-analyst` `analytics-engineer`

### Business & RevOps

`product-manager` `revops-strategist` `gtm-expert` `strategy-expert`
`sales-ops-analyst` `marketing-ops-analyst` `crm-specialist`
`customer-success-manager` `account-executive`
`competitive-intelligence` `content-strategist` `ai-product-manager`

### Executive

`ceo` `cfo` `cmo` `coo` `cpo` `cro` `cto` `ciso` `vp-engineering` `vp-sales`

### People, Legal, Ops

`hr` `talent-acquisition` `talent-retention`
`legal` `compliance-officer` `procurement` `it-admin`

### Core

`orchestrator`

---

## 101 Skills (Auto-Loaded Intelligence)

Skills are not tools. They are **expert reference systems**.

You don’t call them — they activate automatically.

Example:

* backend work → `api-design-patterns`, `database-design`, `security-best-practices`

Sample skills:
`saas-architecture` `zero-trust-architecture` `rag-advanced-patterns`
`llm-integration-patterns` `agent-design-patterns`
`vector-database-patterns` `event-driven-architecture`
`kubernetes-patterns` `gitops-patterns` `observability-patterns`
`incident-management` `sre-practices` `devsecops`
`finance-modeling` `okr-framework` `gtm-playbook`

(+ 78 more)

---

## What the Orchestrator Learned

During testing, it found its own bugs:

* Missing agents in registry
* Broken execution path
* Invalid stage references

And fixed them.

**This is not a prompt.
It’s an opinion about how software should be built.**

---

## Install

```bash
npx quorum-ai
```

* Installs globally → `~/.claude/`
* Works instantly in all projects
* No config, no API keys

**Requirements:** Claude Code · Node.js 18+

---

## Contributing

Adding an agent takes ~10 minutes.

* Read `CONTRIBUTING.md`
* Open issue: `[Agent Request] role-name`

---

## Extend It

* Agents → `~/.claude/agents/`
* Skills → `~/.claude/skills/`

After adding an agent:
→ register it in `orchestrator.md`

---

## Update

```bash
npx quorum-ai
```

---

<div align="center">

**Built by Srihari Venkatesan**

[LinkedIn](https://linkedin.com/in/sriharivvenkatesan) · [Website](https://www.iamsrihari.com)

---

*There are things in this swarm we have not documented yet.*

*Install it and find out.*

```bash
npx quorum-ai
```

</div>
