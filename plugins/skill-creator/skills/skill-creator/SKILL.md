---
name: skill-creator
description: Create new Claude Code skills. Use when building skills or plugins.
---

# Skill Creator

Guide for building skills that extend Claude's capabilities.

## What is a Skill?

A skill is a folder with a `SKILL.md` file that teaches Claude specialized knowledge or workflows. Skills auto-activate based on context.

## Skill Anatomy

```
my-skill/
  SKILL.md          # Required: instructions + frontmatter
  scripts/          # Optional: executable code
  references/       # Optional: docs loaded on demand
  assets/           # Optional: templates, examples
```

## SKILL.md Structure

```markdown
---
name: my-skill-name
description: One line explaining what this does and when to use it.
---

# Skill Title

[Core instructions - what Claude should do]

## Key Concepts
[Essential knowledge]

## Process
[Step-by-step workflow]

## Examples
[Concrete examples]

## Guidelines
[Rules and constraints]
```

## Design Principles

### 1. Be Concise
Claude is already smart. Only add what Claude doesn't know:
- Domain-specific knowledge
- Your organization's conventions
- Specific workflows or processes

**Bad**: Explaining what React is
**Good**: Explaining YOUR component patterns

### 2. Progressive Disclosure
Load information in layers:
1. **Frontmatter description** (~20 words) - Always visible
2. **SKILL.md body** (<2000 words) - Loads when triggered
3. **References** (unlimited) - Loaded on demand

### 3. Freedom Levels

| Level | Use For | Example |
|-------|---------|---------|
| High | Creative tasks | "Write engaging copy" |
| Medium | Structured tasks | "Follow this template" |
| Low | Critical operations | "Run this exact script" |

### 4. Clear Triggers
The description determines when the skill activates:

**Good**: "Format API responses as JSON. Use when handling REST endpoints."
**Bad**: "Useful skill for various purposes."

## Creation Process

1. **Identify the need** - What does Claude struggle with?
2. **Write the SKILL.md** - Start minimal, add as needed
3. **Test it** - Use the skill, find gaps
4. **Iterate** - Refine based on real usage

## Best Practices

- Keep SKILL.md under 500 lines
- Put "when to use" in the frontmatter description only
- Use imperative language ("Do X" not "You should do X")
- Include concrete examples
- Test scripts before including them
- Reference external docs instead of duplicating them

## Example: Simple Skill

```markdown
---
name: api-response
description: Format API responses consistently. Use when writing REST endpoints.
---

# API Response Format

All API responses must follow this structure:

## Success Response
\`\`\`json
{
  "success": true,
  "data": { ... }
}
\`\`\`

## Error Response
\`\`\`json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
\`\`\`

## Status Codes
- 200: Success
- 400: Bad request
- 401: Unauthorized
- 404: Not found
- 500: Server error
```

## Example: Skill with Script

```markdown
---
name: db-migration
description: Create database migrations. Use when changing schema.
---

# Database Migrations

Run the migration script to create a new migration file:

\`\`\`bash
./scripts/create-migration.sh "migration_name"
\`\`\`

Then edit the generated file to add your changes.
```
