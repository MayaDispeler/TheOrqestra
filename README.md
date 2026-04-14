<div align="center">

<br/>

```
  ██████╗ ██╗   ██╗ ██████╗ ██████╗ ██╗   ██╗███╗   ███╗
 ██╔═══██╗██║   ██║██╔═══██╗██╔══██╗██║   ██║████╗ ████║
 ██║   ██║██║   ██║██║   ██║██████╔╝██║   ██║██╔████╔██║
 ██║▄▄ ██║██║   ██║██║   ██║██╔══██╗██║   ██║██║╚██╔╝██║
 ╚██████╔╝╚██████╔╝╚██████╔╝██║  ██║╚██████╔╝██║ ╚═╝ ██║
  ╚══▀▀═╝  ╚═════╝  ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝
```

<br/>

*Claude is brilliant. It just doesn't know who to call.*

<br/>

[![npm](https://img.shields.io/npm/v/quorum-ai?color=%23000&labelColor=%23000&style=flat-square)](https://npmjs.com/package/quorum-ai)&nbsp;&nbsp;[![license](https://img.shields.io/badge/license-MIT-%23000?labelColor=%23000&style=flat-square)](#)&nbsp;&nbsp;[![built for](https://img.shields.io/badge/built%20for-Claude%20Code-%23000?labelColor=%23000&style=flat-square)](https://claude.ai/code)&nbsp;&nbsp;[![Stars](https://img.shields.io/github/stars/sriharivvenkatesan/Quorum?style=flat-square&color=000&labelColor=000)](https://github.com/sriharivvenkatesan/Quorum/stargazers)

<br/>

![Quorum in action](quorum-demo.gif)

<br/>

</div>

---

<br/>

97 specialist agents. 101 skills. One orchestrator that assembles the right team before anyone writes a line of code.

```bash
npx quorum-ai
```

⭐ Star this repo to get notified when new agents drop.

<br/>

---

<br/>

## The problem nobody talks about

You have Claude Code. You have agents. You use them.

But every session starts the same way. You describe what you want. Claude responds helpfully. Something gets built. Whether it gets built by the right agent, in the right order, with the right context passed between steps — that part is left entirely to you.

That is not a Claude problem. That is a coordination problem.

Quorum solves coordination.

<br/>

---

<br/>

## What happens when you type a task

```
─────────────────────────────────────────────────────────
  you:  "build a SaaS for managing freelance invoices"
─────────────────────────────────────────────────────────

  ORCHESTRATOR

  Pass 1 — which domains does this touch?

    engineering   ✓   API, database, auth, billing logic
    design        ✓   invoice UI, dashboard, empty states
    data          ✓   revenue metrics, invoice analytics
    revops        ✗   no GTM work stated
    people        ✗   no hiring or legal work stated
    docs          ✗   no documentation deliverable

  Pass 2 — which agents, in what order?

    STAGE 1   system-architect      ← nothing starts without this
    STAGE 2   api-designer          ← parallel
              ux-designer           ← parallel, both wait for stage 1
    STAGE 3   backend-engineer      ← parallel
              frontend-engineer     ← parallel, both wait for stage 2
    STAGE 4   data-analyst          ← waits for stage 3
    STAGE 5   qa-engineer           ← final gate

  every agent receives the output of the previous stage
  every agent knows exactly what to hand off to the next

─────────────────────────────────────────────────────────
  start with @system-architect
─────────────────────────────────────────────────────────
```

The orchestrator does not guess. It filters by domain cluster first. Then selects from a hardcoded registry. Every pick has a written justification. If it cannot justify an agent it cannot include it.

And if your prompt is too vague to plan against, it asks three questions and stops.

No assumptions. No phantom agents. No work done in the wrong order.

<br/>

---

<br/>

## The roster

Every agent was built by making Claude inhabit the role first — answer as a 15-year veteran, push back on bad decisions, name the mistakes juniors always make — and then crystallising that into an agent file. Not a prompt. A perspective.

**Engineering**

`software-engineer` `frontend-engineer` `backend-engineer` `full-stack-engineer` `mobile-developer` `system-architect` `cloud-architect` `saas-architect` `solution-architect` `staff-engineer` `ai-engineer` `ml-engineer` `mlops-engineer` `data-engineer` `devops-engineer` `devsecops-engineer` `platform-engineer` `sre` `security-engineer` `penetration-tester` `kubernetes-engineer` `aws-engineer` `azure-engineer` `gcp-engineer` `embedded-systems-engineer` `database-administrator` `api-designer` `rag-engineer` `prompt-engineer` `ai-safety-engineer` `code-reviewer` `debugger` `qa-engineer` `+more`

**Design**

`ux-designer` `ui-expert` `design-engineer` `ux-researcher` `ux-writer`

**Data**

`data-analyst` `business-analyst` `bi-specialist` `ml-analyst` `analytics-engineer`

**Business and RevOps**

`product-manager` `revops-strategist` `gtm-expert` `strategy-expert` `sales-ops-analyst` `marketing-ops-analyst` `crm-specialist` `customer-success-manager` `account-executive` `competitive-intelligence` `content-strategist` `ai-product-manager` `+more`

**Executive**

`ceo` `cfo` `cmo` `coo` `cpo` `cro` `cto` `ciso` `vp-engineering` `vp-sales` `founder`

**People, Legal, Ops**

`hr` `talent-acquisition` `talent-retention` `legal` `compliance-officer` `procurement` `it-admin`

**The one that runs first**

`orchestrator`

<br/>

---

<br/>

## 101 skills that know when to show up

Skills are not tools. They are reference files — dense, opinionated, written the way a senior expert would write a reference for themselves. They load automatically when an agent needs them.

You do not configure them. You do not call them. When `backend-engineer` is working on your API, `api-design-patterns`, `database-design`, `error-handling-patterns`, and `security-best-practices` are already there.

A partial list:

`saas-architecture` `zero-trust-architecture` `rag-advanced-patterns` `llm-integration-patterns` `agent-design-patterns` `ai-safety-guardrails` `vector-database-patterns` `multimodal-ai-patterns` `event-driven-architecture` `service-mesh-patterns` `kubernetes-patterns` `terraform-patterns` `gitops-patterns` `observability-patterns` `incident-management` `sre-practices` `devsecops` `feature-flags-patterns` `cost-engineering` `finance-modeling` `executive-frameworks` `okr-framework` `gtm-playbook`

There are 78 more.

<br/>

---

<br/>

## What the orchestrator learned from testing

Before this shipped, the orchestrator was tested against real tasks and told to find its own bugs.

It found three.

Two agents existed in the agents folder but were missing from the registry — meaning Pass 2 could never select them. It found them, named them, and fixed its own registry. A broken critical path reference in one of its example plans pointed to a stage that did not exist. It found that too.

An agent planning system that audits itself is not a prompt.

It is an opinion about how software should be built.

<br/>

---

<br/>

## Install

```bash
npx quorum-ai
```

Installs to `~/.claude/` globally. Every project you open in Claude Code has access immediately. Nothing to configure. No API keys. No settings files.

**Requirements:** Claude Code · Node.js 18+

<br/>

---

<br/>

## Contributing

Adding an agent takes 10 minutes. You do not need to be a developer.

Read [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

Want an agent that does not exist yet? Open an issue titled `[Agent Request] role-name`.
The community builds it.

<br/>

---

<br/>

## Extend it

Every agent is a markdown file at `~/.claude/agents/`.
Every skill is a markdown file at `~/.claude/skills/`.

Open any file. Read it. Edit it. The format is obvious.

After adding a new agent, add the name to the cluster registry inside
`~/.claude/agents/orchestrator.md` so the orchestrator can select it.

<br/>

---

<br/>

## Update

```bash
npx quorum-ai
```

Same command. Run it again when new agents are released.

<br/>

---

<br/>

<div align="center">

Built by **Srihari Venkatesan**

[linkedin.com/in/sriharivvenkatesan](https://linkedin.com/in/sriharivvenkatesan) &nbsp;·&nbsp; [iamsrihari.com](https://www.iamsrihari.com)

<br/>

---

<br/>

*There are things in this swarm we have not documented yet.*

*Install it and find out.*

<br/>

```bash
npx quorum-ai
```

<br/>

</div>