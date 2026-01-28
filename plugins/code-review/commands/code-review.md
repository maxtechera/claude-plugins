---
description: Multi-agent PR review with confidence scoring
allowed-tools: Read, Grep, Glob, Task, Bash
---

# Code Review Command

Comprehensive PR review using parallel agents and confidence-based filtering.

## Usage

```
/code-review [PR number or URL]
```

Without arguments, reviews the current branch's PR.

## Process

### Step 1: Check Eligibility
Skip review if PR is:
- Closed or merged
- Draft
- Already reviewed by this tool
- Trivial (only docs, config, or whitespace)

### Step 2: Gather Context
Find relevant guidance files:
- Root `CLAUDE.md`
- Directory-specific `CLAUDE.md` files
- `.cursorrules`, `CONVENTIONS.md`, etc.

### Step 3: Summarize Changes
Get a quick overview:
- Files changed and why
- Scope of the changes
- Risk areas

### Step 4: Parallel Review
Launch 4 agents simultaneously:

| Agent | Focus |
|-------|-------|
| **Compliance** | Check against project guidelines (CLAUDE.md) |
| **Bug Hunter** | Scan for obvious bugs in changed code |
| **History** | Use git blame for context-aware issues |
| **Comments** | Verify code comments match implementation |

### Step 5: Confidence Scoring
For each issue found, score 0-100:
- **90-100**: Definitely a real issue
- **80-89**: Very likely a real issue
- **Below 80**: Might be false positive, filter out

Only report issues scoring 80+.

### Step 6: Post Review
Format and post the review:

```markdown
## Code Review

Found N issues:

1. **[Issue title]** (confidence: 92)
   [Description of the problem]

   https://github.com/owner/repo/blob/SHA/path/file.ts#L10-L15

2. **[Issue title]** (confidence: 85)
   ...
```

If no issues found:
```markdown
## Code Review

No significant issues found. LGTM!
```

## What to Ignore

- Pre-existing issues (not introduced by this PR)
- Style issues caught by linters
- Nitpicks and minor preferences
- Intentional changes acknowledged in PR description
- Build/type errors (CI handles these)

## What to Catch

- Logic bugs and incorrect behavior
- Security vulnerabilities
- Performance regressions
- Missing error handling
- Violations of project guidelines
- Breaking changes without migration

## Output

Post a GitHub comment using `gh pr comment` with:
- Concise issue descriptions
- Direct links to code (full SHA + line numbers)
- Actionable suggestions
