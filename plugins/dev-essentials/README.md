# Dev Essentials Plugin

Essential development commands for everyday coding workflows.

## Commands

| Command | Description |
|---------|-------------|
| `/commit` | Create well-formatted git commits |
| `/push` | Push commits to remote |
| `/pr` | Create a pull request with proper description |
| `/review` | Review code for performance issues |
| `/test` | Run and analyze test results |
| `/implement` | Implement a feature or fix with planning |
| `/explore` | Explore and understand the codebase |

## Skills

| Skill | Use For |
|-------|---------|
| `react-performance` | Performance rules when writing/reviewing code |
| `debugging` | Structured approach to fixing errors |

## Quick Start

```
/commit              # Commit staged changes
/pr                  # Create a pull request
/test                # Run tests
/implement <task>    # Implement a feature
/explore <question>  # Understand the codebase
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
