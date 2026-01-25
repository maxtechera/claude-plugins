# Skills Guide

Complete reference for creating and structuring Claude Code skills.

---

## What Are Skills?

Skills are reusable instruction sets that Claude loads automatically or on-demand. They're Markdown files with YAML frontmatter that define specialized behaviors, workflows, and knowledge.

---

## File Structure

Every skill is a directory with a required `SKILL.md` file:

```
.claude/skills/my-skill/
├── SKILL.md                # Required - main instructions
├── reference.md            # Optional - detailed docs
├── examples/
│   └── sample.md          # Optional - example output
├── templates/
│   └── template.md        # Optional - Claude fills in
└── scripts/
    └── helper.sh          # Optional - executable scripts
```

---

## Storage Locations & Priority

| Scope | Path | Priority |
|-------|------|----------|
| **Enterprise** | Managed by admin | 1 (highest) |
| **Project** | `.claude/skills/<skill-name>/` | 2 |
| **Personal** | `~/.claude/skills/<skill-name>/` | 3 |
| **Plugin** | `<plugin>/skills/<skill-name>/` | 4 (lowest) |

### Monorepo Support

Claude Code discovers skills from nested `.claude/skills/` directories:

```
my-monorepo/
├── .claude/skills/              # Root skills (all packages)
├── packages/
│   ├── frontend/
│   │   └── .claude/skills/      # Frontend-specific skills
│   └── backend/
│       └── .claude/skills/      # Backend-specific skills
```

Working in `packages/frontend/` → Claude finds skills from both that directory AND parent directories.

---

## Frontmatter Reference

```yaml
---
name: my-skill
description: What this skill does and when to use it
disable-model-invocation: false
user-invocable: true
argument-hint: [filename] [format]
allowed-tools: Read, Grep, Bash(git:*)
model: sonnet
context: fork
agent: Explore
hooks:
  PreToolUse:
    - matcher: Bash
      hooks:
        - type: command
          command: "echo 'Skill started'"
---

# Markdown content here
```

### Field Reference

| Field | Type | Purpose |
|-------|------|---------|
| **name** | string | Slash command name (lowercase, hyphens, max 64 chars) |
| **description** | string | Claude uses this to decide when to auto-invoke |
| **disable-model-invocation** | boolean | Prevent Claude from auto-triggering |
| **user-invocable** | boolean | Hide from `/` menu |
| **argument-hint** | string | Hint shown in autocomplete |
| **allowed-tools** | array | Restrict tool access |
| **model** | string | Override model (sonnet, opus, haiku) |
| **context** | string | `fork` for isolated subagent |
| **agent** | string | Subagent type when `context: fork` |
| **hooks** | object | Lifecycle hooks scoped to this skill |

---

## String Substitutions

| Variable | Value | Use Case |
|----------|-------|----------|
| `$ARGUMENTS` | Text after skill name | Pass user input |
| `${CLAUDE_SESSION_ID}` | Current session ID | Session-specific logging |

### Dynamic Context (Preprocessing)

The `` !`command` `` syntax runs shell commands BEFORE Claude sees anything:

```yaml
---
name: pr-review
---

## Pull Request Context
- PR diff: !`gh pr diff`
- Changed files: !`gh pr diff --name-only`

Review the changes above...
```

---

## Complete Examples

### Example 1: Reference Skill (Brand Voice)

```yaml
---
name: brand-voice
description: Brand voice and identity guidelines. Use when creating ANY content, writing copy, or communicating.
---

# Brand Voice

## Core Identity
- Direct and practical
- Show receipts, not theories
- 80% Spanish, 20% English for technical terms

## Signature Phrases
- "Ship broken > ship perfect"
- "Mostra receipts o callate"

## Avoid
- Fluff and filler
- AI-sounding words
- Generic advice
```

### Example 2: Task Skill (Deploy)

```yaml
---
name: deploy
description: Deploy to production with pre-flight checks
disable-model-invocation: true
allowed-tools: Bash(git:*), Bash(vercel:*)
---

Pre-deployment checklist:

1. Run tests: `pnpm test`
2. Check types: `pnpm typecheck`
3. Build: `pnpm build`
4. Deploy: `vercel deploy`

Do NOT proceed if any step fails.
```

### Example 3: Subagent Skill (Deep Research)

```yaml
---
name: deep-research
description: Research a topic thoroughly in isolation
context: fork
agent: Explore
---

Research $ARGUMENTS:

1. Find all relevant files
2. Read and analyze
3. Summarize findings with file references
```

---

## Best Practices

### 1. Clear Descriptions Drive Auto-Invocation

```yaml
# GOOD: Specific, keyword-rich
description: Explains code with visual diagrams. Use when explaining how code works or when asked "how does this work?"

# BAD: Too vague
description: Code explanation tool
```

### 2. Keep SKILL.md Focused (Under 500 Lines)

- Core instructions in SKILL.md
- Detailed docs in reference.md
- Long examples in examples.md

### 3. Restrict Tools for Safety

```yaml
---
name: safe-reader
allowed-tools: Read, Grep, Glob
---
# Read-only operations only
```

### 4. Use `disable-model-invocation: true` for Side Effects

```yaml
---
name: send-slack
disable-model-invocation: true
---
# Only user can trigger this
```

---

## Skills vs Commands vs Agents

| Feature | Skills | Commands | Agents |
|---------|--------|----------|--------|
| **Purpose** | Reusable workflows | Quick prompts | Specialized AI |
| **Location** | `.claude/skills/` | `.claude/commands/` | `.claude/agents/` |
| **Auto-invoke** | Yes | No | Yes |
| **Supporting files** | Yes | No | No |
| **Frontmatter** | Full support | Limited | Full support |

**Note**: Commands have been merged into skills. Old `.claude/commands/` files still work but skills are recommended.

---

## Quick Start

```bash
# Create skill directory
mkdir -p .claude/skills/my-skill

# Create SKILL.md
cat > .claude/skills/my-skill/SKILL.md << 'EOF'
---
name: my-skill
description: What this skill does
---

Your instructions here.
EOF

# Invoke
/my-skill
```

---

## Context Management & Costs

### How Skills Load

**Skill descriptions** always load into context:
- ~50-150 characters per skill
- 26 skills ≈ 5-10KB context cost
- Worth it for discoverability

**Full skill content** loads ONLY when:
- Invoked by user (`/skill-name`)
- Auto-invoked by Claude (matching description)
- Preloaded in subagent config

### Optimization Strategies

1. **Move large docs to supporting files**
   - SKILL.md = 100 lines (overview)
   - reference.md = 500 lines (detailed patterns)

2. **Use `disable-model-invocation: true`** for action skills
   - Reduces context overhead
   - Claude doesn't consider for auto-invocation

3. **Set explicit `model`** for heavy skills
   - `haiku` for exploration
   - `sonnet` for copywriting

4. **Adjust context budget** (environment variable):
   ```bash
   export SLASH_COMMAND_TOOL_CHAR_BUDGET=50000
   ```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Skill not triggering | Check description matches keywords user said |
| Skill triggers too often | Make description more specific |
| Claude doesn't see skills | Run `/context` to check token budget |
| Too many skills | Increase `SLASH_COMMAND_TOOL_CHAR_BUDGET` |
| Skill loads slowly | Move large content to reference.md |
