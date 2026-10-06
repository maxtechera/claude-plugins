---
description: Implement a feature or fix with proper planning
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# Implement

Implement a feature or fix following best practices.

## Process

1. **Understand** - Clarify requirements, ask questions if unclear
2. **Explore** - Find relevant code and understand the patterns
3. **Plan** - Outline the changes needed
4. **Implement** - Make the changes
5. **Verify** - Run tests or verify the change works

## Before Coding

- Read existing code in the area you're changing
- Understand the patterns and conventions used
- Identify all files that need changes
- Consider edge cases

## Implementation Rules

**Keep it simple:**
- Only make changes directly requested
- Don't add features beyond scope
- Don't refactor unrelated code
- Don't add unnecessary abstractions

**Match the codebase:**
- Follow existing naming conventions
- Match the code style
- Use existing utilities and helpers
- Keep similar structure to nearby code

**Stay secure:**
- Validate user input
- Don't expose sensitive data
- Use parameterized queries
- Escape output appropriately

## Output Format

After implementing, provide:

```markdown
## Implementation Summary

### Changes Made
- [file]: [what changed]

### How to Test
[Steps to verify the change]

### Notes
[Any important callouts]
```

## Flags

- `--dry-run` - Show plan without making changes
- `--minimal` - Make smallest possible change

$ARGUMENTS
