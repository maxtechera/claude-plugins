---
description: Verify alignment between requests and stated goals
allowed-tools: Read, Grep
---

# Fact Check Command

Analyze if current work aligns with stated plans and goals.

## Process

### 1. Load Current State

Read:
- Project state / goals
- Current sprint / week plan
- Priority list
- Quarter/month objectives

### 2. Identify Current Request

What is the user asking to do?
- New feature/project
- Change to existing work
- Addition to scope

### 3. Alignment Check

Compare request against:

**Strategic Alignment**
- Does this support the primary goal?
- Is this in the current sprint/week plan?
- Is this a priority (P0/P1)?

**Sabotage Pattern Check**
- Is this a new shiny object? (Dopamina de Inicio)
- Is this optimization before shipping? (Optimizacion Prematura)
- Is this avoiding the hard thing? (Perfeccionismo)

**Resource Alignment**
- Do we have capacity for this?
- What gets deprioritized if we do this?

### 4. Output Analysis

```
## Fact Check Analysis

### Request
[What user is asking to do]

### Current Priorities
1. [P0 item]
2. [P1 items]
3. [This week's Big 3]

### Alignment Score

| Check | Status | Notes |
|-------|--------|-------|
| Supports primary goal | ✅/⚠️/❌ | |
| In current plan | ✅/⚠️/❌ | |
| Appropriate priority | ✅/⚠️/❌ | |
| Has capacity | ✅/⚠️/❌ | |

### Sabotage Pattern Check

| Pattern | Risk |
|---------|------|
| Shiny object syndrome | Low/Medium/High |
| Premature optimization | Low/Medium/High |
| Avoidance behavior | Low/Medium/High |

### Verdict: [ALIGNED / MISALIGNED / UNCLEAR]

### If Aligned
"This request supports [goal] because [reason]. Proceed."

### If Misaligned
"This request may be [sabotage pattern] because:
- [Reason 1]
- [Reason 2]

Consider instead:
- [Alternative 1]
- [Alternative 2]

If you still want to proceed, acknowledge the trade-off."

### If Unclear
"Need more information:
- [Question 1]
- [Question 2]"
```

### 5. Trade-off Acknowledgment

If request is misaligned but user wants to proceed:

```
### Trade-off Acknowledgment

You're choosing to do [request] instead of [planned priority].

This means:
- [Consequence 1]
- [Consequence 2]

If you're okay with this, say "proceed anyway" and we'll continue.
```

## Usage Examples

**Example 1: Aligned Request**
```
User: "Let's work on the newsletter signup form"
Fact Check: Newsletter is P0, in this week's Big 3 → ALIGNED ✅
```

**Example 2: Misaligned Request**
```
User: "Let's redesign the dashboard"
Fact Check: Dashboard not in plan, no ship date → MISALIGNED ⚠️
Recommendation: Add to backlog, stay focused on Big 3
```

**Example 3: Sabotage Pattern**
```
User: "Let's switch to a new email provider"
Fact Check: Tool change, no publications this week → SABOTAGE PATTERN 🚨
Pattern: Optimizacion Prematura
Recommendation: Ship something first, then evaluate tools
```
