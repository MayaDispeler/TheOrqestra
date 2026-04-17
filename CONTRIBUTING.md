# Contributing to Orqestra

Adding a new agent takes 10 minutes. You do not need to be a developer.

## Add an agent

1. Fork this repo on GitHub
2. Create a new file: agents/your-agent-name.md
3. Start the file with this exact block at the top:

---
name: your-agent-name
description: One sentence about what this agent does.
NOT for X tasks (use other-agent instead).
---

4. Write the agent content below the frontmatter
5. Open a Pull Request with the title: feat: add your-agent-name agent

## Request an agent

Not a developer? Open a GitHub Issue.
Title it: [Agent Request] role-name
Example: [Agent Request] growth-hacker

The community will build it.

## What makes a good agent

- Opinionated. Has a strong point of view.
- Has a section: What I will push back on
- Asks for context before starting any task
- Written in first person, present tense
- Thinks like a 15-year veteran in that role

## Update the orchestrator

After adding a new agent, add the agent name to the correct cluster
inside agents/orchestrator.md so the orchestrator can select it.