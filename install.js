#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const globalTarget = path.join(process.env.HOME, '.claude');
const localTarget = path.join(process.cwd(), '.claude');
const src = path.dirname(require.main.filename);

function copyDir(from, to) {
  if (!fs.existsSync(from)) return;
  if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach(file => {
    const srcPath = path.join(from, file);
    const destPath = path.join(to, file);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

copyDir(path.join(src, 'agents'), path.join(globalTarget, 'agents'));
copyDir(path.join(src, 'skills'), path.join(globalTarget, 'skills'));

if (fs.existsSync(localTarget)) {
  copyDir(path.join(src, 'agents'), path.join(localTarget, 'agents'));
  copyDir(path.join(src, 'skills'), path.join(localTarget, 'skills'));
}

const claudeMdPath = path.join(process.cwd(), 'CLAUDE.md');
const swarmNotice = `
## Quorum Agent Swarm

This project has 97 specialist Claude Code agents and 101 skill files installed.

Describe what you want to build.
The orchestrator activates automatically and assembles the right team.

Or type @orchestrator followed by your task.
`;

if (fs.existsSync(claudeMdPath)) {
  const existing = fs.readFileSync(claudeMdPath, 'utf8');
  if (!existing.includes('Quorum Agent Swarm')) {
    fs.appendFileSync(claudeMdPath, swarmNotice);
  }
} else {
  fs.writeFileSync(claudeMdPath, swarmNotice.trim());
}

const agentCount = fs.existsSync(path.join(src, 'agents'))
  ? fs.readdirSync(path.join(src, 'agents')).length : 0;
const skillCount = fs.existsSync(path.join(src, 'skills'))
  ? fs.readdirSync(path.join(src, 'skills')).length : 0;

console.log('');
console.log('Quorum installed successfully');
console.log(agentCount + ' agents  ->  ~/.claude/agents/');
console.log(skillCount + ' skills  ->  ~/.claude/skills/');
console.log('');
console.log('Open Claude Code. Describe what you want to build.');
console.log('The orchestrator activates automatically.');
console.log('');
