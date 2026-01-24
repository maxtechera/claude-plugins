---
description: Create a pull request with proper description
allowed-tools: Bash, Read
---

# PR

Create a well-documented pull request.

## Process

1. Get current branch with `git branch --show-current`
2. Get base branch (usually `main` or `master`)
3. Review all commits with `git log <base>..<branch>`
4. Review all changes with `git diff <base>...<branch>`
5. Generate PR title and description
6. Create PR with `gh pr create`

## PR Format

```markdown
## Summary
[1-3 sentences explaining the change]

## Changes
- [Bullet list of what changed]

## Testing
- [ ] Tested locally
- [ ] Tests pass

🤖 Generated with Claude Code
```

## Commands

**Create PR:**
```bash
gh pr create --title "<type>: <description>" --body "<body>"
```

**Create draft PR:**
```bash
gh pr create --draft --title "<title>" --body "<body>"
```

**Create PR with reviewer:**
```bash
gh pr create --title "<title>" --body "<body>" --reviewer <username>
```

## Title Format

Use conventional commit style:
- `feat: add user authentication`
- `fix: resolve login timeout issue`
- `refactor: simplify payment flow`

## Rules

- Title under 72 characters
- Summary explains WHY, not just WHAT
- List all significant changes
- Link related issues if any

$ARGUMENTS
