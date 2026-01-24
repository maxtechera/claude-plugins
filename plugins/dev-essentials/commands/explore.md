---
description: Explore and understand the codebase
allowed-tools: Read, Grep, Glob, Bash
---

# Explore

Explore and understand the codebase structure.

## Process

1. Identify what the user wants to understand
2. Search for relevant files and code
3. Read and analyze the code
4. Explain clearly with file references

## Common Explorations

**Project structure:**
```bash
ls -la
find . -type f -name "*.json" | head -20
```

**Find entry points:**
- Look for `main`, `index`, `app` files
- Check `package.json` scripts
- Find route definitions

**Understand a feature:**
1. Search for related keywords
2. Trace the code flow
3. Identify key files and functions

## Search Strategies

**Find files by name:**
```
Glob: **/user*.ts
```

**Find code by content:**
```
Grep: "function authenticate"
```

**Find usages:**
```
Grep: "importedFunction"
```

## Output Format

```markdown
## Codebase Overview

### Structure
[Key directories and their purpose]

### Entry Points
[Main files and how the app starts]

### Key Files
- `path/to/file.ts`: [purpose]

### Patterns
[Notable patterns and conventions used]
```

## When Answering Questions

- Always include file paths with line numbers: `src/auth.ts:42`
- Show relevant code snippets
- Explain the flow between files
- Note any important patterns or conventions

$ARGUMENTS
