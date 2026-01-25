# Commands Guide

Complete reference for creating Claude Code slash commands.

---

## What Are Commands?

Slash commands are Markdown files that expand into prompts when invoked with `/command-name`. They've been merged into the Skills system but old `.claude/commands/` files still work.

---

## Storage Locations

| Location | Scope | Invocation |
|----------|-------|------------|
| `.claude/skills/name/SKILL.md` | Project (recommended) | `/name` |
| `.claude/commands/name.md` | Project (legacy) | `/project:name` |
| `~/.claude/skills/name/SKILL.md` | Personal | `/name` |
| `~/.claude/commands/name.md` | Personal (legacy) | `/user:name` |

**Recommendation**: Use `.claude/skills/` for new commands.

---

## Command Format

### Simple Command

```yaml
---
name: review
description: Review code for quality and security
---

Review the code for:
- Security vulnerabilities
- Performance issues
- Code style violations
- Potential bugs

Provide specific line numbers and actionable fixes.
```

**Invoke**: `/review`

### Command with Arguments

```yaml
---
name: fix-issue
description: Fix a GitHub issue by number
disable-model-invocation: true
argument-hint: "[issue-number]"
---

Fix GitHub issue #$ARGUMENTS:

1. Read the issue details
2. Understand the problem
3. Implement a fix
4. Write tests
5. Create a PR
```

**Invoke**: `/fix-issue 123`

---

## The $ARGUMENTS Placeholder

`$ARGUMENTS` captures everything after the command name:

```yaml
---
name: search
description: Search the codebase
---

Search for: $ARGUMENTS

Find all references and show context.
```

**Usage**: `/search authentication handler`
- `$ARGUMENTS` becomes `"authentication handler"`

**If omitted**: Claude Code appends `ARGUMENTS: <value>` automatically.

---

## Dynamic Context (Preprocessing)

The `` !`command` `` syntax runs shell commands **BEFORE** Claude sees anything:

```yaml
---
name: git-status
description: Show git status with context
---

## Current State
- Branch: !`git branch --show-current`
- Status: !`git status --short`
- Recent commits: !`git log --oneline -5`

Analyze the current git state and suggest next steps.
```

**How it works**:
1. Each `` !`command` `` runs immediately when skill loads
2. Output replaces the placeholder
3. Claude receives final rendered prompt with actual data

**Use for**: Live data (GitHub, databases, APIs) without Claude executing commands.

---

## Controlling Invocation

### Manual-Only Commands

Prevent Claude from auto-triggering:

```yaml
---
name: deploy
description: Deploy to production
disable-model-invocation: true
---
```

Use for: Side-effect operations (deploy, commit, send-message)

### Hidden Commands

Hide from `/` menu (only Claude can invoke):

```yaml
---
name: legacy-context
description: Knowledge about old system
user-invocable: false
---
```

### Permission Matrix

| Setting | You invoke | Claude invokes |
|---------|-----------|----------------|
| (default) | Yes | Yes |
| `disable-model-invocation: true` | Yes | No |
| `user-invocable: false` | No | Yes |

---

## Complete Examples

### Example 1: Code Review

```yaml
---
name: review
description: Expert code review for quality and security
allowed-tools: Read, Grep, Glob, Bash
---

Review the code in context for:

1. **Security** - Exposed secrets, injection risks, CORS
2. **Performance** - N+1 queries, memory leaks
3. **Style** - Readability, naming, documentation
4. **Bugs** - Edge cases, error handling, types

Provide severity level (Critical, Warning, Suggestion).
Include specific line numbers and actionable fixes.
```

### Example 2: Git Commit

```yaml
---
name: commit
description: Create a git commit with conventional messages
disable-model-invocation: true
allowed-tools: Bash, Read
---

Create a git commit for staged changes:

1. Run `git diff --staged` to see changes
2. Determine type: feat, fix, refactor, docs, chore
3. Write message following conventions:

```
type: brief description under 50 characters

Detailed explanation (if needed):
- What changed and why
- Impact on the codebase
```

4. Commit: `git commit -m "type: description"`
```

### Example 3: Deploy with Checklist

```yaml
---
name: deploy
description: Deploy to production with pre-flight checks
disable-model-invocation: true
allowed-tools: Bash, Read, Grep
---

Pre-deployment checklist for $ARGUMENTS:

**Phase 1: Verification**
- [ ] Run tests: `pnpm test`
- [ ] Check types: `pnpm typecheck`
- [ ] Lint: `pnpm lint`
- [ ] Build: `pnpm build`

**Phase 2: Safety**
- [ ] Review git diff
- [ ] Check environment variables
- [ ] Verify migrations

**Phase 3: Deploy**
- [ ] Push: `git push origin`
- [ ] Monitor logs
- [ ] Smoke test production

Do NOT proceed if any phase fails.
```

### Example 4: PR Review with Live Data

```yaml
---
name: pr-review
description: Review a pull request with live GitHub data
context: fork
agent: Explore
allowed-tools: Bash(gh:*)
---

Review PR #$ARGUMENTS:

**Pull request diff**:
!`gh pr diff $ARGUMENTS`

**Changed files**:
!`gh pr diff $ARGUMENTS --name-only`

**Your task**:
1. Analyze changes
2. Identify issues
3. Suggest improvements
4. Check test coverage
5. Provide assessment
```

### Example 5: Test Generator

```yaml
---
name: generate-tests
description: Generate comprehensive tests for functions
allowed-tools: Read, Write, Edit, Bash
---

Generate tests for $ARGUMENTS:

**Standards**:
- Framework: Jest (JS/TS) or Pytest (Python)
- Location: Adjacent with `.test.ts` or `_test.py`
- Coverage: 80%+ for critical paths

**Categories**:
1. Unit tests - Individual function behavior
2. Integration tests - Component interactions
3. Edge cases - Boundary conditions
4. Error cases - Exception handling

**Format**:
```typescript
describe('FunctionName', () => {
  it('should handle happy path', () => {
    // Arrange, Act, Assert
  })

  it('should handle error case', () => {
    // Test error handling
  })
})
```
```

---

## Built-in Commands

These are not customizable:

| Command | Purpose |
|---------|---------|
| `/help` | Show all commands |
| `/context` | Check token usage |
| `/clear` | Clear conversation |
| `/compact` | Compress history |
| `/memory` | Edit memory files |
| `/mcp` | Manage MCP servers |
| `/agents` | Manage agents |
| `/plugins` | Manage plugins |

---

## Directory Organization

```
.claude/skills/
├── git/
│   ├── commit/
│   │   └── SKILL.md
│   ├── pr/
│   │   └── SKILL.md
│   └── review/
│       └── SKILL.md
├── test/
│   ├── unit/
│   │   └── SKILL.md
│   └── integration/
│       └── SKILL.md
└── docs/
    └── generate/
        └── SKILL.md
```

---

## Best Practices

### 1. Keep Commands Focused

```yaml
# BAD - Too broad
name: do-everything
description: Do review, testing, and deployment

# GOOD - Single responsibility
name: review-code
description: Review code for quality and security
```

### 2. Clear Descriptions

```yaml
# BAD - Vague
description: Help with things

# GOOD - Specific
description: Expert code review for quality, security, and best practices. Use proactively after writing code.
```

### 3. Disable Auto for Side Effects

```yaml
name: deploy
disable-model-invocation: true  # Only user triggers
```

### 4. Provide Argument Hints

```yaml
argument-hint: "[issue-number]"  # Shows in autocomplete
```

### 5. Version Control

```bash
git add .claude/skills/
git commit -m "feat: add code review and testing commands"
```

---

## Quick Start

```bash
# Create command
mkdir -p .claude/skills/my-command
cat > .claude/skills/my-command/SKILL.md << 'EOF'
---
name: my-command
description: What this command does
---

Your instructions here.
Reference $ARGUMENTS if needed.
EOF

# Invoke
/my-command [optional arguments]
```

---

## Migration: Commands to Skills

**Old format** (still works):
```
.claude/commands/review.md
```

**New format** (recommended):
```
.claude/skills/review/SKILL.md
```

**Benefits of skills**:
- Supporting files (templates, examples)
- Full frontmatter support
- Auto-invocation by Claude
- Better organization
