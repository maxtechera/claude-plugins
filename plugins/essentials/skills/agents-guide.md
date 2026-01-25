# Agents Guide

Complete reference for creating and using Claude Code agents (subagents).

---

## What Are Agents?

Agents are specialized AI assistants that run in isolated contexts with custom system prompts, specific tool access, and independent permissions. Claude automatically delegates to agents when tasks match their description.

---

## Agent Configuration Format

Agents are Markdown files with YAML frontmatter:

```yaml
---
name: agent-name
description: When Claude should use this agent (critical for delegation)
tools: Read, Grep, Glob, Bash, Write, Edit
model: sonnet
permissionMode: default
skills:
  - skill-name-1
  - skill-name-2
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "script or validation"
---

# Agent System Prompt

You are [clear role description].

Your core responsibilities:
1. [What you do]
2. [How you work]
3. [Constraints you follow]
```

---

## Configuration Fields

| Field | Type | Purpose |
|-------|------|---------|
| **name** | string | Unique identifier (lowercase, hyphens) |
| **description** | string | When Claude should delegate (BE DETAILED) |
| **tools** | array | Tools agent can access |
| **disallowedTools** | array | Tools to deny |
| **model** | string | sonnet, opus, haiku, or inherit |
| **permissionMode** | string | default, acceptEdits, dontAsk, bypassPermissions, plan |
| **skills** | array | Skills to preload |
| **hooks** | object | Lifecycle hooks for this agent |

---

## Storage Locations

| Priority | Location | Scope |
|----------|----------|-------|
| 1 (highest) | `--agents` CLI flag | Current session |
| 2 | `.claude/agents/` | Current project |
| 3 | `~/.claude/agents/` | All projects |
| 4 (lowest) | Plugin's `agents/` | Plugin-enabled |

---

## Available Models

```yaml
model: sonnet    # Balanced (Claude 3.5 Sonnet)
model: opus      # Most capable (Claude 3 Opus)
model: haiku     # Fast, low-cost (Claude 3 Haiku)
model: inherit   # Uses parent's model (default)
```

**Strategy**: Use `haiku` for fast exploration, `sonnet` for analysis, `opus` for complex reasoning.

---

## Built-in Agent Types

| Agent | Model | Tools | Purpose |
|-------|-------|-------|---------|
| **Explore** | Haiku | Read-only | Fast code search |
| **Plan** | Inherit | Read-only | Research during planning |
| **general-purpose** | Inherit | All | Complex multi-step tasks |

---

## Permission Modes

| Mode | Behavior |
|------|----------|
| `default` | Standard permission prompts |
| `acceptEdits` | Auto-accept file edits |
| `dontAsk` | Auto-deny prompts |
| `bypassPermissions` | Skip ALL checks |
| `plan` | Read-only mode |

---

## Complete Examples

### Example 1: Code Reviewer (Read-Only)

```yaml
---
name: code-reviewer
description: Expert code review for quality, security, and best practices. Use proactively after writing or modifying code.
tools: Read, Grep, Glob, Bash
model: sonnet
---

You are an expert code reviewer.

## Analysis Framework

When reviewing code, ALWAYS check:

### 1. Security
- Injection vulnerabilities
- Exposed secrets
- CORS issues

### 2. Performance
- N+1 queries
- Unnecessary re-renders
- Memory leaks

### 3. Quality
- Type safety
- Error handling
- Code duplication

Provide specific line numbers and actionable fixes.
```

### Example 2: Research Agent (Full Access)

```yaml
---
name: researcher
description: Deep research specialist for complex topics. Use when comprehensive analysis with multiple sources is needed.
tools: Read, Grep, Glob, WebFetch, WebSearch, Write
model: opus
skills:
  - research-methodology
---

You are a Research Architect.

## Core Competencies

1. **Multi-source Research** - Synthesize info from multiple sources
2. **Competitive Analysis** - Find what competitors are doing
3. **Trend Spotting** - Identify emerging patterns
4. **Documentation** - Create well-structured reports

## Output Format

### Executive Summary
[One paragraph recap]

### Key Findings
1. [Finding with evidence]
2. [Finding with evidence]

### Recommendations
[Actionable next steps]

### Sources
[All references with links]
```

### Example 3: Database Agent (Restricted)

```yaml
---
name: db-reader
description: Execute read-only database queries
tools: Bash
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-readonly.sh"
---

You are a database query specialist.

You have read-only access. You may only run SELECT queries.
Never attempt INSERT, UPDATE, DELETE, or DDL operations.
```

---

## Preloading Skills

Inject skill content at startup:

```yaml
---
name: api-developer
description: Implement API endpoints following team conventions
skills:
  - api-conventions
  - error-handling-patterns
---

Apply the conventions from preloaded skills.
```

---

## Agent Invocation

### Automatic Delegation

Claude delegates based on the `description` field:

```yaml
# GOOD - Specific and actionable
description: Expert code review for quality, security, and best practices. Use proactively after writing or modifying code.

# BAD - Too vague
description: Code reviewer
```

### Explicit Invocation

```
Use the code-reviewer agent to review my changes
Have the researcher agent analyze this topic
```

### CLI Flag (Temporary)

```bash
claude --agents '{
  "my-agent": {
    "description": "...",
    "prompt": "...",
    "tools": ["Read", "Grep"],
    "model": "sonnet"
  }
}'
```

---

## Best Practices

### Do's

- Design focused agents (one task per agent)
- Write detailed descriptions
- Limit tool access (security + focus)
- Check into git (`.claude/agents/`)
- Preload relevant skills
- Use hooks for validation

### Don'ts

- Don't create too many similar agents
- Don't grant excessive tool access
- Don't use vague descriptions
- Don't store sensitive config in prompts
- Don't chain agents endlessly

---

## Agent Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| General | `{role}` | `code-reviewer`, `debugger` |
| Specialized | `{domain}-{role}` | `react-performance-optimizer` |
| Human role | `{title}` | `community-manager` |
| Strategic | `{strategy}-{domain}` | `strategic-brand-architect` |

---

## Common Patterns

### Isolate High-Volume Operations

```
Use a subagent to run the test suite and report only failing tests
```

### Parallel Research

```
Research authentication, database, and API modules in parallel using separate subagents
```

### Chain Agents (Sequential)

```
Use code-reviewer to find issues, then use optimizer to fix them
```

---

## Quick Start

```bash
# Create agent file
mkdir -p .claude/agents
cat > .claude/agents/my-agent.md << 'EOF'
---
name: my-agent
description: What this agent does and when to use it
tools: Read, Grep, Glob
model: sonnet
---

You are [specific role].

Your responsibilities:
1. [Task 1]
2. [Task 2]
EOF

# Restart Claude Code to load
```

---

## Agents vs Skills vs Hooks

| Feature | Agents | Skills | Hooks |
|---------|--------|--------|-------|
| **Purpose** | Specialized AI | Reusable workflows | Automation |
| **Context** | Isolated | Inline or fork | Pre/post tool |
| **Invocation** | Auto by task | Manual or auto | Event-based |
| **Best for** | Complex tasks | Templates, knowledge | File validation |
