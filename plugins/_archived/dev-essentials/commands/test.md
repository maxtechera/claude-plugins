---
description: Run and analyze test results
allowed-tools: Bash, Read, Grep
---

# Test

Run tests and analyze results.

## Process

1. Detect test framework from package.json or config files
2. Run appropriate test command
3. Analyze results
4. Report failures with context

## Detection

Check for these frameworks:
- `jest` / `vitest` → `npm test` or `npx vitest`
- `pytest` → `pytest`
- `go test` → `go test ./...`
- `cargo test` → `cargo test`

## Commands

**Run all tests:**
```bash
npm test
```

**Run specific file:**
```bash
npm test -- <file>
```

**Run with coverage:**
```bash
npm test -- --coverage
```

**Watch mode:**
```bash
npm test -- --watch
```

## Output Format

```markdown
## Test Results

**Status:** ✅ PASS / ❌ FAIL
**Total:** X tests
**Passed:** X | **Failed:** X | **Skipped:** X

### Failures
[If any failures, list them with file:line and error message]

### Coverage
[If coverage ran, show summary]
```

## On Failure

1. Show the failing test name and location
2. Show the error message
3. Show relevant code context
4. Suggest potential fix if obvious

$ARGUMENTS
