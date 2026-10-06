---
description: Review code for performance and best practices
allowed-tools: Read, Grep
---

# Review Command

Review React/Next.js code for issues.

## Usage

```
/review [file path]
```

## Process

1. Read the file
2. Check against react-performance rules
3. Report issues by priority

## Output Format

```markdown
## Code Review: [filename]

### CRITICAL
[Issues that significantly impact performance]

### HIGH
[Issues that affect user experience]

### MEDIUM
[Optimization opportunities]

### GOOD
[What's done well]

### Fixes
[Specific code changes]
```

## What to Check

- Sequential awaits → Promise.all
- Barrel imports → Direct imports
- Heavy components → Dynamic imports
- Large props to client → Minimize data
- Missing error handling → Add try/catch
- Missing loading states → Add Suspense/skeleton
