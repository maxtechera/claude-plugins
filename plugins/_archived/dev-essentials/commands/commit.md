---
description: Create a well-formatted git commit
allowed-tools: Bash
---

# Commit

Create a git commit with a well-formatted message.

## Process

1. Run `git status` to see changes
2. Run `git diff --staged` to see what's staged
3. If nothing staged, ask user what to stage
4. Analyze changes and write commit message
5. Commit with proper format

## Commit Format

```
<type>: <description>

[optional body]

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code restructure
- `chore`: Maintenance

## Rules

- Keep subject line under 50 chars
- Use imperative mood ("add" not "added")
- Don't end with period
- Body explains WHY, not WHAT

## Example

```bash
git commit -m "feat: add newsletter signup form

Adds email validation and MailerLite integration.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

$ARGUMENTS
