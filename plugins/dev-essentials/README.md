# Dev Essentials Plugin

Code review and debugging tools for React/Next.js.

## Skills

| Skill | Use For |
|-------|---------|
| `react-performance` | Performance rules when writing/reviewing code |
| `debugging` | Structured approach to fixing errors |

## Commands

| Command | Description |
|---------|-------------|
| `/review` | Review code for performance issues |
| `/commit` | Create well-formatted git commits |
| `/push` | Push commits and create PRs |

## Quick Start

```
"Review this component for performance issues"
"Help me debug this error: [paste error]"
"Apply react-performance rules to this code"
```

## Key Rules

1. **Parallelize** - Use Promise.all for independent async ops
2. **Direct imports** - Avoid barrel files from large libraries
3. **Dynamic imports** - Lazy load heavy components
4. **Minimal props** - Pass only needed data to client components

## Installation

```bash
/plugin install dev-essentials
```
