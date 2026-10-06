# Code Review Plugin

Multi-agent PR review with confidence-based filtering.

## Command

| Command | Description |
|---------|-------------|
| `/code-review` | Review PR with 4 parallel agents |

## How It Works

1. Check if PR needs review (skip closed, draft, trivial)
2. Gather project guidelines (CLAUDE.md, etc.)
3. Launch 4 agents in parallel:
   - Compliance checker
   - Bug hunter
   - History analyzer
   - Comment verifier
4. Score each issue 0-100 for confidence
5. Filter out issues below 80
6. Post review with direct code links

## Quick Start

```
/code-review           # Review current branch's PR
/code-review 123       # Review PR #123
/code-review <url>     # Review PR by URL
```

## What It Catches

- Logic bugs
- Security issues
- Performance regressions
- Missing error handling
- Guideline violations

## What It Ignores

- Pre-existing issues
- Linter catches
- Nitpicks
- Build errors (CI handles these)

## Installation

```bash
/plugin install code-review@max-techera-plugins
```
