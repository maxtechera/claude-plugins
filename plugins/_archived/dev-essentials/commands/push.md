---
description: Push commits and optionally create a PR
allowed-tools: Bash
---

# Push

Push commits to remote and optionally create a pull request.

## Process

1. Check current branch with `git branch --show-current`
2. Check if there are commits to push with `git status`
3. Push to remote
4. Ask if user wants to create a PR

## Commands

**Push to existing remote:**
```bash
git push
```

**Push new branch:**
```bash
git push -u origin <branch-name>
```

**Create PR after push:**
```bash
gh pr create --title "<title>" --body "<description>"
```

## PR Format

```markdown
## Summary
[1-3 bullet points of what changed]

## Changes
- [List of changes]

## Testing
- [ ] Tested locally
- [ ] Tests pass
```

$ARGUMENTS
