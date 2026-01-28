---
description: Guided 7-phase feature development workflow
allowed-tools: Read, Grep, Glob, Task, Bash
---

# Feature Development Command

Structured workflow for building features the right way: understand first, then build.

## Usage

```
/feature-dev [optional: feature description]
```

## The 7 Phases

### Phase 1: Discovery
Clarify what needs to be built:
- What is the user trying to accomplish?
- What are the inputs and outputs?
- Who are the users of this feature?

Ask clarifying questions before proceeding.

### Phase 2: Codebase Exploration
Launch 2-3 explorer agents in parallel to understand:
- Existing patterns and conventions
- Related code and dependencies
- Integration points

Read the files identified by agents thoroughly.

### Phase 3: Clarifying Questions
Before designing, identify gaps:
- Edge cases not discussed
- Error handling requirements
- Performance considerations
- Security implications

Ask specific, concrete questions.

### Phase 4: Architecture Design
Present 2-3 implementation approaches:

```markdown
## Approach A: [Name]
**How it works:** [Description]
**Pros:** [Benefits]
**Cons:** [Drawbacks]
**Files to change:** [List]

## Approach B: [Name]
...
```

Get explicit user approval before implementing.

### Phase 5: Implementation
Build the feature:
- Follow existing code conventions
- Write tests alongside code
- Commit in logical chunks
- Keep changes focused

### Phase 6: Quality Review
Launch 3 reviewer agents in parallel:
1. **Simplicity** - Is it DRY? Elegant? Easy to understand?
2. **Correctness** - Any bugs? Edge cases handled?
3. **Conventions** - Follows project patterns?

Fix any issues found.

### Phase 7: Summary
Document what was built:

```markdown
## Completed
- [What was implemented]

## Files Changed
- [List of files]

## Next Steps
- [Suggested follow-ups]
```

## Key Principles

1. **Ask first** - Clarify requirements before designing
2. **Explore first** - Understand the codebase before changing it
3. **Get approval** - Confirm approach before implementing
4. **Review after** - Check quality before finishing

## When to Skip Phases

- **Trivial changes**: Skip to Phase 5
- **Bug fixes**: Start at Phase 2, skip Phase 4
- **User gave detailed spec**: Summarize in Phase 1, proceed
